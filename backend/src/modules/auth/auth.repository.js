import { getPrisma } from "../../config/database.js";

// fields needed to sign tokens and to build the user DTO (no credentials)
const userSessionSelect = {
    id: true,
    username: true,
    email: true,
    employeeNumber: true,
    fullName: true,
    phone: true,
    role: true,
    avatarUrl: true,
    authProvider: true,
    isActive: true,
    isApproved: true,
    createdAt: true,
    updatedAt: true,
};

// users already using this username, email or employee number (to report which one clashes)
export const findUserConflicts = async ({ username, email, employeeNumber }) => {
    const db = getPrisma();
    return db.user.findMany({
        where: {
            OR: [
                { username },
                { email },
                { employeeNumber },
            ],
        },
        select: { username: true, email: true, employeeNumber: true },
    })
}

// create user inside a transaction
export const createUserTx = (tx, { username, email, password, fullName, phone, role, employeeNumber }) => {
    return tx.user.create({
        data: {
            username,
            email,
            password,
            fullName,
            phone,
            role,
            employeeNumber,
            // isApproved (false) and authProvider (local) come from the schema defaults
        },
        select: userSessionSelect,
    })
}

// find user by employee number for login (includes the password hash)
export const findUserForLogin = async (employeeNumber) => {
    const db = getPrisma();
    return db.user.findUnique({
        where: { employeeNumber },
        select: {
            ...userSessionSelect,
            failedAttempts: true,
            lockedUntil: true,
            password: true,
        }
    })
}

// find user by id (refresh: always work from the current database state)
export const findUserById = async (id) => {
    const db = getPrisma();
    return db.user.findUnique({
        where: { id },
        select: userSessionSelect,
    })
}

// find user by id with the password hash (change password)
export const findUserForPasswordChange = async (id) => {
    const db = getPrisma();
    return db.user.findUnique({
        where: { id },
        select: { ...userSessionSelect, password: true },
    })
}

// store a new refresh token row (login, rotation, password change)
export const createRefreshTokenTx = (tx, { userId, tokenHash, family, expiresAt, deviceId, userAgent, ip }) => {
    return tx.refreshToken.create({
        data: {
            tokenHash,
            userId,
            family,
            expiresAt,
            deviceId: deviceId ?? null,
            userAgent: userAgent ?? null,
            ip: ip ?? null,
        },
        select: { id: true },
    })
}

// find the stored refresh token
export const findRefreshToken = async (tokenHash) => {
    const db = getPrisma();
    return db.refreshToken.findUnique({
        where: {
            tokenHash
        },
        select: {
            id: true,
            userId: true,
            family: true,
            expiresAt: true,
            revoked: true,
            deviceId: true,
        }
    })
}

// Rotation: retire the old token and link it to its replacement.
// Only succeeds while the old token is still unrevoked; { count: 0 } means it was already used.
export const rotateRefreshTokenTx = (tx, id, replacedById) => {
    return tx.refreshToken.updateMany({
        where: { id, revoked: false },
        data: { revoked: true, revokedAt: new Date(), replacedById },
    })
}

// revoke every token in a family
export const revokeRefreshTokenFamily = async (family) => {
    const db = getPrisma();
    return db.refreshToken.updateMany({
        where: { family, revoked: false },
        data: { revoked: true, revokedAt: new Date() }
    })
}

// revoke a single refresh token by its DB id (expired / unverifiable tokens)
export const revokeRefreshToken = async (id) => {
    const db = getPrisma();
    return db.refreshToken.update({
        where: { id },
        data: { revoked: true, revokedAt: new Date() },
    });
}

// Revoke ALL non-revoked refresh tokens for a user (logout-all / password reset)
export const revokeAllUserRefreshTokens = async (userId) => {
    const db = getPrisma();
    return db.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true, revokedAt: new Date() },
    });
};

// same, inside a transaction (password reset / change, deactivation, scope change)
export const revokeAllUserRefreshTokensTx = (tx, userId) => {
    return tx.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true, revokedAt: new Date() },
    });
};

// lock the user until some time (and restart the failed-attempt counter)
export const lockUserUntil = async (userId, lockedUntil) => {
    const db = getPrisma();
    return db.user.update({
        where: { id: userId },
        data: { lockedUntil, failedAttempts: 0 },
    });
};

// Increment failed attempts atomically and return the new count
export const incrementFailedAttempts = async (userId) => {
    const db = getPrisma();
    return db.user.update({
        where: { id: userId },
        data: { failedAttempts: { increment: 1 } },
        select: { failedAttempts: true },
    });
};

// successful login: reset the lockout counters and stamp lastLoginAt
export const recordSuccessfulLoginTx = (tx, userId) => {
    return tx.user.update({
        where: { id: userId },
        data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
        select: { id: true },
    });
};

// find user by email
export const findUserByEmail = async (email) => {
    const db = getPrisma();
    return db.user.findUnique({
        where: { email },
        select: { id: true, username: true, email: true, fullName: true, isActive: true, authProvider: true },
    });
};

// invalidate all the tokens of a user (for password reset) inside a transaction
export const invalidateUserPasswordResetsTx = (tx, userId) => {
    return tx.passwordReset.updateMany({
        where: { userId, used: false },
        data: { used: true },
    });
};

// create password reset token inside a transaction
export const createPasswordResetTx = (tx, userId, tokenHash, expiresAt) => {
    return tx.passwordReset.create({
        data: { userId, tokenHash, expiresAt },
    });
};

// find password reset token
export const findPasswordReset = async (tokenHash) => {
    const db = getPrisma();
    return db.passwordReset.findUnique({
        where: { tokenHash },
        select: {
            id: true,
            userId: true,
            expiresAt: true,
            used: true,
        },
    });
};

// mark password reset token used
export const markPasswordResetUsed = async (id) => {
    const db = getPrisma();
    return db.passwordReset.update({
        where: { id },
        data: { used: true },
    });
};

// Single-use consumption: succeeds ({ count: 1 }) only while the token is unused and unexpired,
// so two concurrent resets cannot both use it.
export const consumePasswordResetTx = (tx, id) => {
    return tx.passwordReset.updateMany({
        where: { id, used: false, expiresAt: { gt: new Date() } },
        data: { used: true },
    });
};

// update the user password (a new password also clears any lockout)
export const updateUserPasswordTx = (tx, userId, hashedPassword) => {
    return tx.user.update({
        where: { id: userId },
        data: { password: hashedPassword, failedAttempts: 0, lockedUntil: null },
        select: { id: true },
    });
};
