import { getPrisma } from "../../config/database.js";

const userSessionSelect = {
    id: true,
    email: true,
    employeeNumber: true,
    fullName: true,
    phone: true,
    role: true,
    isActive: true,
    isApproved: true,
    createdAt: true,
    updatedAt: true,
};
// find user by username or email
export const findUser = async ({ email }) => {
    const db = getPrisma();
    return db.user.findFirst({
        where: {
            OR: [{ email: email }],
        },
        select: {
            id: true,
        },
    });
};

// create user
export const createUser = async ({ username, email, password }) => {
    const db = getPrisma();
    return db.user.create({
        data: {
            username,
            email,
            password,
        },
    });
};

// create user inside a transaction
export const createUserTx = (
    tx,
    { fullName, email, password, phone, role },
) => {
    return tx.user.create({
        data: {
            fullName,
            email,
            password,
            phone,
            role,
        },
    });
};

// find user by username for login
export const findUserForLogin = async (employeeNumber) => {
    const db = getPrisma();
    return db.user.findUnique({
        where: { employeeNumber },
        select: {
            ...userSessionSelect,
            failedAttempts: true,
            lockedUntil: true,
            password: true,
        },
    });
};

// store the refresh token
export const storeRefreshToken = async (
    userId,
    tokenHash,
    family,
    expiresAt,
    deviceId,
    userAgent,
    ip
) => {
    const db = getPrisma();
    return db.refreshToken.create({
        data: {
            tokenHash,
            userId,
            family,
            expiresAt,
            revoked: false,
            deviceId: deviceId ?? null,
            userAgent: userAgent ?? null,
            ip: ip ?? null,
        },
    });
};

// find the stored refresh token
export const findRefreshToken = async (tokenHash) => {
    const db = getPrisma();
    return db.refreshToken.findUnique({
        where: {
            tokenHash,
        },
        select: {
            id: true,
            userId: true,
            family: true,
            expiresAt: true,
            revoked: true,
        },
    });
};

// revoke every token in a family
export const revokeRefreshTokenFamily = async (family) => {
    const db = getPrisma();
    return db.refreshToken.updateMany({
        where: { family },
        data: { revoked: true },
    });
};

// revoke a single refresh token by its DB id (used during normal rotation)
export const revokeRefreshToken = async (id) => {
    const db = getPrisma();
    return db.refreshToken.update({
        where: { id },
        data: { revoked: true },
    });
};

// Revoke ALL non-revoked refresh tokens for a user (logout-all / password reset)
export const revokeAllUserRefreshTokens = async (userId) => {
    const db = getPrisma();
    return db.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true },
    });
};

// lock the user (increaments failed attempts and lock user until some time)
export const lockUserUntil = async (userId, lockedUntil) => {
    const db = getPrisma();
    return db.user.update({
        where: { id: userId },
        data: { lockedUntil, failedAttempts: 0 },
    });
};

// Increment failed attempts for a user
export const incrementFailedAttempts = async (userId) => {
    const db = getPrisma();
    return db.user.update({
        where: { id: userId },
        data: { failedAttempts: { increment: 1 } },
    });
};

// reset login tracking (failed attempts and locked until)
export const resetLoginTracking = async (userId) => {
    const db = getPrisma();
    return db.user.update({
        where: { id: userId },
        data: { failedAttempts: 0, lockedUntil: null },
    });
};

// find user by email
export const findUserByEmail = async (email) => {
    const db = getPrisma();
    return db.user.findUnique({
        where: { email },
        select: {
            id: true,
            email: true,
            isActive: true,
        },
    });
};

// invalidate all the tokens of a user (for password reset)
export const invalidateUserPasswordResets = async (userId) => {
    const db = getPrisma();
    return db.passwordReset.updateMany({
        where: { userId, used: false },
        data: { used: true },
    });
};

// invalidate all the tokens of a user (for password reset) inside a transaction
export const invalidateUserPasswordResetsTx = (tx, userId) => {
    return tx.passwordReset.updateMany({
        where: { userId, used: false },
        data: { used: true },
    });
};

// store the password reset token
export const createPasswordReset = async (userId, tokenHash, expiresAt) => {
    const db = getPrisma();
    return db.passwordReset.create({
        data: { userId, tokenHash, expiresAt },
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

// update the user password
export const updateUserPassword = async (userId, hashedPassword) => {
    const db = getPrisma();
    return db.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
    });
};
