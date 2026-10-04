import { ROLE_LABELS } from "@/constants/app.constants";

export const roleLabel = (role) => ROLE_LABELS[role] ?? role ?? "—";

// Free-text search over everything the table shows for a person.
export function matchesQuery(employee, query) {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;

    return [
        employee.fullName,
        employee.email,
        employee.phone,
        employee.employeeNumber,
        roleLabel(employee.role),
    ].some((field) => field?.toLowerCase().includes(needle));
}
