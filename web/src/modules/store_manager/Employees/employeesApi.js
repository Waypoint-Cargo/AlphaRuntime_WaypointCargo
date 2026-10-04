import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "@/services/baseQuery";

// Wraps the Store Manager only `/api/employees` endpoints (backend/src/modules/employees).
//
//   GET    /employees/pending        registered users awaiting approval
//   GET    /employees                approved employees
//   POST   /employees/:id/approve    approve a registration -> employee number assigned
//   DELETE /employees/:id            reject a registration / remove an employee

// The backend caps `limit` at 100 and has no text search, so the list endpoints are read
// page by page and the screen searches, filters and paginates the full list locally.
const PAGE_LIMIT = 100;
const MAX_PAGES = 20; // safety stop: 2,000 rows

async function fetchAllPages(url, fetchWithBQ) {
    const byId = new Map();

    for (let page = 1; page <= MAX_PAGES; page++) {
        const result = await fetchWithBQ({ url, params: { page, limit: PAGE_LIMIT } });
        if (result.error) return { error: result.error };

        // keyed by id so a row shifting between pages mid-read can't show up twice
        for (const item of result.data?.data ?? []) byId.set(item.id, item);

        if (page >= (result.data?.meta?.totalPages ?? 1)) break;
    }

    return { data: Array.from(byId.values()) };
}

export const employeesApi = createApi({
    reducerPath: "employeesApi",
    baseQuery: baseQueryWithReauth,
    tagTypes: ["PendingEmployees", "Employees"],
    endpoints: (builder) => ({
        getPendingEmployees: builder.query({
            queryFn: (_arg, _api, _extra, fetchWithBQ) => fetchAllPages("/employees/pending", fetchWithBQ),
            providesTags: [{ type: "PendingEmployees", id: "LIST" }],
        }),

        getEmployees: builder.query({
            queryFn: (_arg, _api, _extra, fetchWithBQ) => fetchAllPages("/employees", fetchWithBQ),
            providesTags: [{ type: "Employees", id: "LIST" }],
        }),

        approveEmployee: builder.mutation({
            query: ({ userId }) => ({
                url: `/employees/${encodeURIComponent(userId)}/approve`,
                method: "POST",
            }),
            // the backend wraps the employee as { success, message, data } — hand callers the employee itself
            transformResponse: (response) => response?.data ?? null,
            // the user leaves "pending" and joins "employees"
            invalidatesTags: [
                { type: "PendingEmployees", id: "LIST" },
                { type: "Employees", id: "LIST" },
            ],
        }),

        deleteEmployee: builder.mutation({
            query: ({ userId }) => ({
                url: `/employees/${encodeURIComponent(userId)}`,
                method: "DELETE",
            }),
            invalidatesTags: [
                { type: "PendingEmployees", id: "LIST" },
                { type: "Employees", id: "LIST" },
            ],
        }),
    }),
});

export const {
    useGetPendingEmployeesQuery,
    useGetEmployeesQuery,
    useApproveEmployeeMutation,
    useDeleteEmployeeMutation,
} = employeesApi;
