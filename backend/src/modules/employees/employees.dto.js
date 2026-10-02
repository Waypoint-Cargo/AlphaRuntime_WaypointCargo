export const toEmployeeDTO = (employee) => ({
    id: employee.id,
    fullName: employee.fullName,
    email: employee.email ?? null,
    phone: employee.phone ?? null,
    role: employee.role,
    isActive: employee.isActive,
    lastActiveAt: employee.lastActiveAt ?? null,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
});

export const toEmployeeListDTO = (rows, { page, pageSize, total }) => ({
    items: rows.map(toEmployeeDTO),
    pagination: { page, pageSize, total },
});
