/**
 *  DTO - Data Transfer Object
 *  These transformers strip sensitive data and produce the exact shape 
 *  that the API layer should send back to the client.
 *
 * RULE:
 *   Nothing from the service layer should reach the controller as a raw
 *   Prisma object. Always pass through a DTO transformer first.
 */
export const toUserDTO = (user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl ?? null,
    authProvider: user.authProvider ?? 'local',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});

// Shapes the data payload returned to the client after a successful login.
export const toLoginResponseDTO = (user, accessToken, refreshToken) => ({
    accessToken,
    user: toUserDTO(user),
    refreshToken
});

// Shapes the data payload returned to the client after a successful registration.
export const toRegistrationResponseDTO = (user) => ({
    user: toUserDTO(user)
});

// Shapes the data payload returned to the client after a successful refresh.
export const toRefreshResponseDTO = (accessToken, refreshToken) => ({
    accessToken,
    refreshToken
});