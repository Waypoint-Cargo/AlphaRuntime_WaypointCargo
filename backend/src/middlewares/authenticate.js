import { AppError } from "../utils/appError.js";
import { catchAsync } from "../utils/catchAsync.js";
import {
   getUserInvalidateBefore,
   isBlocklisted,
} from "../utils/tokenBlocklist.js";
import { verifyAccessToken } from "../utils/tokens.js";

// check if user is authenticated
export const authenticateUser = catchAsync(async (req, res, next) => {
   const authHeader = req.headers["authorization"];

   if (!authHeader?.startsWith("Bearer ")) {
      throw new AppError("Access token is required.", 401);
   }

   const token = authHeader.slice(7);

   // verify access token
   let payload;
   try {
      payload = verifyAccessToken(token);
   } catch {
      throw new AppError("Invalid or expired access token.", 401);
   }

   // check if the access token is blocklisted
   const isBlocklistedToken = await isBlocklisted(token);
   if (isBlocklistedToken) {
      throw new AppError(
         "Access token has been revoked. Please log in again.",
         401,
      );
   }

   // check if the token is invalidated before (iat invalidation)
   const invalidateBefore = await getUserInvalidateBefore(payload.sub);
   if (invalidateBefore !== null && payload.iat < invalidateBefore) {
      throw new AppError(
         "Session has been invalidated. Please log in again.",
         401,
      );
   }

   req.user = {
      id: payload.sub,
      username: payload.username,
      role: payload.role ?? "USER",
   };
   req.accessToken = token;

   next();
});

// check if user has the required role
export const requireRole =
   (...roles) =>
   (req, _res, next) => {
      if (!req.user) {
         return next(new AppError("Not authenticated.", 401));
      }
      if (!roles.includes(req.user.role)) {
         return next(
            new AppError(
               "You do not have permission to access this resource.",
               403,
            ),
         );
      }
      next();
   };
