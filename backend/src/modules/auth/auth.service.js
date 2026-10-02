import { AppError } from "../../utils/appError.js";
import {
   findUserConflicts,
   findUserForLogin,
   findUserById,
   findUserForPasswordChange,
   createUserTx,
   createRefreshTokenTx,
   findRefreshToken,
   rotateRefreshTokenTx,
   revokeRefreshTokenFamily,
   revokeRefreshToken,
   revokeAllUserRefreshTokens,
   revokeAllUserRefreshTokensTx,
   lockUserUntil,
   incrementFailedAttempts,
   recordSuccessfulLoginTx,
   findUserByEmail,
   invalidateUserPasswordResetsTx,
   createPasswordResetTx,
   findPasswordReset,
   markPasswordResetUsed,
   consumePasswordResetTx,
   updateUserPasswordTx,
} from "./auth.repository.js";
import {
   toLoginResponseDTO,
   toRefreshResponseDTO,
   toRegistrationResponseDTO,
} from "./auth.dto.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import {
   decodeToken,
   hashRefreshToken,
   signAccessToken,
   signRefreshToken,
   verifyRefreshToken,
} from "../../utils/tokens.js";
import { config } from "../../config/env.js";
import logger from "../../config/logger.js";
import {
   addToBlocklist,
   setUserInvalidateBefore,
} from "../../utils/tokenBlocklist.js";
import { getPrisma } from "../../config/database.js";
import { enqueuePasswordResetEmail } from "../../jobs/sendPasswordResetEmail.js";
import * as usersService from "../users/users.service.js";

const DUMMY_HASH =
   "$2b$12$IgJ8jdQ5K5KmOFb1JXfkXOo2qKFQxB1e5c.L9Kn8dGdRsWQyVhDOq";
const SALT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = config.maxLoginAttempts;
const LOCKOUT_DURATION_MS = config.lockoutDurationMs;

const INACTIVE_MESSAGE = "Your account has been suspended. Please contact support.";
const UNAPPROVED_MESSAGE =
   "Your account is awaiting administrator approval. You will be able to sign in once it has been approved.";

export const loginService = async ({ employeeNumber, password, deviceId, userAgent, ip }) => {
   const user = await findUserForLogin(employeeNumber);

   // TIMING ATTACK PREVENTION: always run one bcrypt comparison, even for unknown
   // accounts and accounts without a password (Google-only).
   const hashToCompare = user?.password ?? DUMMY_HASH;
   const passwordValid = await bcrypt.compare(password, hashToCompare);

   // check account status
   if (user?.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil(
         (user.lockedUntil - Date.now()) / 60_000,
      );
      throw new AppError(
         `Account temporarily locked. Try again in ${remainingMinutes} minute(s).`,
         429,
      );
   }

   if (!user || !user.password || !passwordValid) {
      // Only apply lockout if the account is local (password-based).
      if (user && user.password && user.authProvider === "local") {
         const { failedAttempts } = await incrementFailedAttempts(user.id);
         if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
            const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
            await lockUserUntil(user.id, lockedUntil);
            throw new AppError(
               `Account locked after ${MAX_FAILED_ATTEMPTS} failed attempts. ` +
                  `Try again in ${LOCKOUT_DURATION_MS / 60_000} minute(s).`,
               429,
            );
         }
      }
      throw new AppError("Invalid employee number or password.", 401);
   }

   // credentials are correct: now say why the account cannot be used
   if (!user.isActive) {
      throw new AppError(INACTIVE_MESSAGE, 403);
   }
   if (!user.isApproved) {
      throw new AppError(UNAPPROVED_MESSAGE, 403);
   }

   // issue tokens
   // A new family UUID groups all refresh token rotations from this login.
   // If a rotated-out token is reused, we revoke the entire family.
   const family = uuidv4();
   const accessToken = signAccessToken(user);
   const refreshToken = signRefreshToken(user, family);

   // Reset the lockout counters / stamp lastLoginAt and store the hashed refresh token together.
   const db = getPrisma();
   await db.$transaction(async (tx) => {
      await recordSuccessfulLoginTx(tx, user.id);
      await createRefreshTokenTx(tx, {
         userId: user.id,
         tokenHash: hashRefreshToken(refreshToken),
         family,
         expiresAt: new Date(Date.now() + config.refreshTokenExpiryInMs),
         deviceId,
         userAgent,
         ip,
      });
   });

   return toLoginResponseDTO(user, accessToken, refreshToken);
};

export const registerService = async ({ username, email, password, fullName, phone, role, employeeNumber }) => {
   const existing = await findUserConflicts({ username, email, employeeNumber });

   if (existing.length > 0) {
      const taken = [
         ["username", "Username", existing.some((u) => u.username === username)],
         ["email", "Email", existing.some((u) => u.email === email)],
         ["employeeNumber", "Employee number", existing.some((u) => u.employeeNumber === employeeNumber)],
      ].filter(([, , isTaken]) => isTaken);

      throw new AppError(
         `${taken.map(([, label], i) => (i === 0 ? label : label.toLowerCase())).join(", ")} already in use.`,
         409,
         taken.map(([field, label]) => ({ field, message: `${label} is already in use.`, code: "unique" })),
      );
   }

   const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

   // A concurrent duplicate that slips past the check above hits the unique index;
   // the error handler turns that P2002 into a 409.
   const db = getPrisma();
   const user = await db.$transaction(async (tx) => {
      return createUserTx(tx, {
         username,
         email,
         password: hashedPassword,
         fullName,
         phone,
         role,
         employeeNumber,
      });
   });

   return toRegistrationResponseDTO(user);
};

export const refreshTokenService = async ({ rawToken, userAgent, ip }) => {
   // Hash the incoming token - for db search
   const incomingHash = hashRefreshToken(rawToken);

   const storedToken = await findRefreshToken(incomingHash);

   // No DB record for this hash — token is unknown or was never issued.
   if (!storedToken) {
      throw new AppError("Invalid or unrecognized refresh token.", 401);
   }

   // REUSE ATTACK: if the token is already revoked, a previously-rotated token
   // is being replayed. Revoke the entire family to invalidate all derived tokens.
   if (storedToken.revoked) {
      await revokeRefreshTokenFamily(storedToken.family);
      throw new AppError(
         "Refresh token reuse detected. Please log in again.",
         401,
      );
   }

   // Check server-side expiry (independent of JWT claim — allows forced expiration).
   if (storedToken.expiresAt < new Date()) {
      await revokeRefreshToken(storedToken.id);
      throw new AppError(
         "Refresh token has expired. Please log in again.",
         401,
      );
   }

   // verify the refresh token signature
   try {
      verifyRefreshToken(rawToken);
   } catch (error) {
      await revokeRefreshToken(storedToken.id);
      throw new AppError("Invalid refresh token. Please log in again.", 401);
   }

   // Re-fetch the user from DB so the new access token always carries the current
   // role and a suspended account cannot keep refreshing.
   const user = await findUserById(storedToken.userId);
   if (!user) {
      throw new AppError("User account no longer exists.", 401);
   }
   if (!user.isActive || !user.isApproved) {
      await revokeRefreshTokenFamily(storedToken.family);
      throw new AppError(user.isActive ? UNAPPROVED_MESSAGE : INACTIVE_MESSAGE, 403);
   }

   // Issue a rotated token pair. The new refresh token inherits the same family
   const newAccessToken = signAccessToken(user);
   const newRefreshToken = signRefreshToken(user, storedToken.family);

   // Create the replacement and retire the old token in one transaction.
   // If the old token was already consumed in the meantime (two concurrent refreshes
   // with the same token) the transaction rolls back and it is treated as reuse.
   let reuseDetected = false;
   const db = getPrisma();
   try {
      await db.$transaction(async (tx) => {
         const created = await createRefreshTokenTx(tx, {
            userId: user.id,
            tokenHash: hashRefreshToken(newRefreshToken),
            family: storedToken.family,
            expiresAt: new Date(Date.now() + config.refreshTokenExpiryInMs),
            deviceId: storedToken.deviceId,
            userAgent,
            ip,
         });

         const { count } = await rotateRefreshTokenTx(tx, storedToken.id, created.id);
         if (count !== 1) {
            reuseDetected = true;
            throw new AppError("Refresh token reuse detected. Please log in again.", 401);
         }
      });
   } catch (error) {
      if (reuseDetected) await revokeRefreshTokenFamily(storedToken.family);
      throw error;
   }

   return toRefreshResponseDTO(newAccessToken, newRefreshToken);
};

export const logoutService = async ({ rawToken, accessToken }) => {
   if (rawToken) {
      const storedToken = await findRefreshToken(hashRefreshToken(rawToken));

      // Revoke the entire family — this invalidates all refresh tokens issued
      // from this login session (across rotations), not just the current one.
      // An unknown or already-revoked token needs no DB change.
      if (storedToken && !storedToken.revoked) {
         await revokeRefreshTokenFamily(storedToken.family);
      }
   }

   // blocklist the current access token
   await _blocklistAccessToken(accessToken);
};

export const logoutAllService = async ({ userId, accessToken }) => {
   // kill all refresh sessions ( revoke by user id, so all the refresh token's family will be revoked)
   await revokeAllUserRefreshTokens(userId);

   // immediately invalidate all outstanding access tokens
   await setUserInvalidateBefore(userId);

   // blocklist the caller's own access token
   await _blocklistAccessToken(accessToken);
};

// Stores a fresh single-use reset token (superseding older ones) and e-mails the link.
const issuePasswordReset = async (user) => {
   const rawToken = crypto.randomBytes(32).toString("hex");
   const tokenHash = hashRefreshToken(rawToken);
   const expiresAt = new Date(Date.now() + config.passwordResetExpiryInMs);

   // create a reset url with the raw token
   const resetUrl = `${config.allowedOrigins[0]}/reset-password?token=${rawToken}`;

   const db = getPrisma();
   await db.$transaction(async (tx) => {
      // Invalidate any previous active reset tokens for this user
      await invalidateUserPasswordResetsTx(tx, user.id);
      // store the new reset token
      await createPasswordResetTx(tx, user.id, tokenHash, expiresAt);
   });

   // e-mail the link in the background, after the token is safely stored
   enqueuePasswordResetEmail({ to: user.email, fullName: user.fullName, resetUrl });
};

export const forgotPasswordService = async ({ email }) => {
   // The response must not reveal whether an account exists - not by its text and not by
   // its timing. So after the single lookup every path returns immediately, and the
   // database write + e-mail for a real account run in the background.
   const user = await findUserByEmail(email);
   if (!user || user.authProvider === "google" || !user.isActive) return;

   setImmediate(() => {
      issuePasswordReset(user).catch((err) =>
         logger.error("Password reset could not be issued.", { message: err.message }),
      );
   });
};

export const resetPasswordService = async ({ token, newPassword }) => {
   const tokenHash = hashRefreshToken(token);
   const storedReset = await findPasswordReset(tokenHash);

   if (!storedReset || storedReset.used) {
      throw new AppError("Invalid or already-used password reset token.", 400);
   }

   if (storedReset.expiresAt < new Date()) {
      await markPasswordResetUsed(storedReset.id); // cleanup expired token
      throw new AppError(
         "Password reset token has expired. Please request a new one.",
         400,
      );
   }

   const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

   const db = getPrisma();
   await db.$transaction(async (tx) => {
      // Consume the token FIRST, conditionally — of two concurrent requests only one gets count 1
      const { count } = await consumePasswordResetTx(tx, storedReset.id);
      if (count !== 1) {
         throw new AppError("Invalid or already-used password reset token.", 400);
      }

      // save the new password
      await updateUserPasswordTx(tx, storedReset.userId, hashedPassword);

      // kill all refresh sessions ( revoke by user id, so all the refresh token's family will be revoked)
      await revokeAllUserRefreshTokensTx(tx, storedReset.userId);
   });

   // immediately invalidate all outstanding access tokens
   await setUserInvalidateBefore(storedReset.userId);
};

export const changePasswordService = async ({ userId, currentPassword, newPassword, accessToken, userAgent, ip }) => {
   const user = await findUserForPasswordChange(userId);
   if (!user) {
      throw new AppError("User account no longer exists.", 401);
   }
   if (!user.password) {
      throw new AppError("This account has no password to change.", 400);
   }

   const currentPasswordValid = await bcrypt.compare(currentPassword, user.password);
   if (!currentPasswordValid) {
      // 400, not 401: a 401 would make clients think the access token expired
      throw new AppError("Current password is incorrect.", 400);
   }

   const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

   // the caller keeps a session: a fresh family replaces every old one
   const family = uuidv4();
   const refreshToken = signRefreshToken(user, family);

   const db = getPrisma();
   await db.$transaction(async (tx) => {
      await updateUserPasswordTx(tx, userId, hashedPassword);

      // sign every session out, like logout-all ...
      await revokeAllUserRefreshTokensTx(tx, userId);

      // ... then start the caller's new one
      await createRefreshTokenTx(tx, {
         userId,
         tokenHash: hashRefreshToken(refreshToken),
         family,
         expiresAt: new Date(Date.now() + config.refreshTokenExpiryInMs),
         userAgent,
         ip,
      });
   });

   // invalidate all outstanding access tokens (and the one used for this request) ...
   await setUserInvalidateBefore(userId);
   await _blocklistAccessToken(accessToken);

   // ... and only then sign the caller's new access token, so its iat is never older than the cut-off
   const newAccessToken = signAccessToken(user);

   return toRefreshResponseDTO(newAccessToken, refreshToken);
};

export const getMeService = async ({ userId }) => {
   return usersService.getUserProfile(userId);
};

// Add an access token to the Redis blocklist
async function _blocklistAccessToken(accessToken) {
   if (!accessToken) return;
   const payload = decodeToken(accessToken);
   if (!payload?.exp) return; // get expire time (sec)
   const remainingMs = payload.exp * 1000 - Date.now();
   await addToBlocklist(accessToken, remainingMs);
}
