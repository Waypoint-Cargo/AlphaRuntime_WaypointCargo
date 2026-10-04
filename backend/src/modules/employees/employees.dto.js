/**
 *  DTO - Data Transfer Object
 *  These transformers strip sensitive data and produce the exact shape
 *  that the API layer should send back to the client.
 *
 * RULE:
 *   Nothing from the service layer should reach the controller as a raw
 *   Prisma object. Always pass through a DTO transformer first.
 */
// Shapes a single employee/user record returned to the Store Manager.
export const toEmployeeDTO = (user) => ({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    employeeNumber: user.employeeNumber,
    isActive: user.isActive,
    isApproved: user.isApproved,
    approvedAt: user.approvedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});

// Shapes a page of employees/pending users plus pagination metadata.
export const toEmployeeListResponseDTO = ({ items, total, page, limit }) => ({
    items: items.map(toEmployeeDTO),
    meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
    },
});
