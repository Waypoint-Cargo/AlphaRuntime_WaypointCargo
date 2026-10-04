/**
 *  DTO - Data Transfer Object
 *  These transformers strip sensitive data and produce the exact shape
 *  that the API layer should send back to the client.
 *
 * RULE:
 *   Nothing from the service layer should reach the controller as a raw
 *   Prisma object. Always pass through a DTO transformer first.
 */
export const toProfileDTO = (user) => ({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    employeeNumber: user.employeeNumber,
    role: user.role,
    accountStatus: user.isActive ? "ACTIVE" : "SUSPENDED",
    isActive: user.isActive,
    approvalStatus: user.isApproved ? "APPROVED" : "PENDING",
    isApproved: user.isApproved,
    approvedAt: user.approvedAt,
    outlet: user.outlet
        ? {
              id: user.outlet.id,
              code: user.outlet.code,
              name: user.outlet.name,
              brand: user.outlet.brand,
              district: user.outlet.district,
          }
        : null,
    depots: user.depots.map(({ depot }) => ({
        id: depot.id,
        code: depot.code,
        name: depot.name,
    })),
    lastLoginAt: user.lastLoginAt,
    isLocked: Boolean(user.lockedUntil && user.lockedUntil > new Date()),
    lockedUntil: user.lockedUntil,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});
