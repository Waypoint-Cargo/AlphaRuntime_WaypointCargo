import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "@/services/baseQuery";
import { STATUS_FILTER } from "./fleetUtils";

// Wraps the `/api/vehicles` endpoints (backend/src/modules/fleet) used by the dispatcher Fleet screen.
//
//   GET    /vehicles                     paginated list (type, status, depotId, isActive, search)
//   GET    /vehicles/in-route            Assigned + On Route together (the "In Route" view)
//   GET    /vehicles/stats               summary tiles
//   GET    /vehicles/depots              home-depot picker
//   GET    /vehicles/:id                 one vehicle
//   POST   /vehicles                     register a vehicle
//   PATCH  /vehicles/:id                 edit details, (de)activate, unassign the default driver
//   PATCH  /vehicles/:id/status          change operational status
//   POST   /vehicles/:id/fuel-entries    log fuel used this week
//   DELETE /vehicles/:id                 delete a vehicle
//
// /vehicles/available, /maintenance and /compatible are flat pickers for Plan & Allocate, not this screen.
//
// Every response is an envelope { success, message, data, meta }; the endpoints below hand callers
// the unwrapped payload.

const LIST_TAG = { type: "Vehicles", id: "LIST" };
const STATS_TAG = { type: "FleetStats", id: "SUMMARY" };

const vehicleUrl = (id) => `/vehicles/${encodeURIComponent(id)}`;

// Anything a vehicle change can touch: every list, that vehicle's detail and the summary tiles.
const vehicleChanged = (_result, _error, { id }) => [LIST_TAG, { type: "Vehicles", id }, STATS_TAG];

const unwrap = (response) => response?.data ?? null;

export const fleetApi = createApi({
    reducerPath: "fleetApi",
    baseQuery: baseQueryWithReauth,
    tagTypes: ["Vehicles", "FleetStats"],
    endpoints: (builder) => ({
        // -> { items, meta: { page, limit, total, totalPages } }
        getVehicles: builder.query({
            queryFn: async ({ status, search, page, limit, ...filters }, _api, _extra, fetchWithBQ) => {
                if (status === STATUS_FILTER.IN_ROUTE) {
                    // The list endpoint takes a single status, so "Assigned + On Route" comes from its
                    // own endpoint. That one is active-only, unpaginated and has no search: search and
                    // paging are applied here.
                    const result = await fetchWithBQ({
                        url: "/vehicles/in-route",
                        params: { type: filters.type, depotId: filters.depotId },
                    });
                    if (result.error) return { error: result.error };

                    const needle = search?.toLowerCase();
                    const matching = (result.data?.data ?? []).filter((v) => !needle || v.code.toLowerCase().includes(needle));
                    const totalPages = Math.max(1, Math.ceil(matching.length / limit));
                    const current = Math.min(page, totalPages);
                    return {
                        data: {
                            items: matching.slice((current - 1) * limit, current * limit),
                            meta: { page: current, limit, total: matching.length, totalPages },
                        },
                    };
                }

                const read = (pageNumber) =>
                    fetchWithBQ({ url: "/vehicles", params: { ...filters, status, search, page: pageNumber, limit } });

                let result = await read(page);
                // The last page can vanish after a delete/deactivation: fall back to the new last one
                const totalPages = result.data?.meta?.totalPages ?? 1;
                if (!result.error && page > totalPages) result = await read(totalPages);
                if (result.error) return { error: result.error };

                return { data: { items: result.data?.data ?? [], meta: result.data?.meta ?? null } };
            },
            providesTags: (result) => [
                LIST_TAG,
                ...(result?.items ?? []).map((vehicle) => ({ type: "Vehicles", id: vehicle.id })),
            ],
        }),

        getFleetStats: builder.query({
            query: () => ({ url: "/vehicles/stats" }),
            transformResponse: unwrap,
            providesTags: [STATS_TAG],
        }),

        getDepots: builder.query({
            query: () => ({ url: "/vehicles/depots" }),
            transformResponse: (response) => response?.data ?? [],
            keepUnusedDataFor: 600,
        }),

        getVehicle: builder.query({
            query: (id) => ({ url: vehicleUrl(id) }),
            transformResponse: unwrap,
            providesTags: (_result, _error, id) => [{ type: "Vehicles", id }],
        }),

        createVehicle: builder.mutation({
            query: (body) => ({ url: "/vehicles", method: "POST", body }),
            transformResponse: unwrap,
            invalidatesTags: [LIST_TAG, STATS_TAG],
        }),

        // { id, ...changedFields } — also used for { isActive } and { defaultDriverId: null }
        updateVehicle: builder.mutation({
            query: ({ id, ...body }) => ({ url: vehicleUrl(id), method: "PATCH", body }),
            transformResponse: unwrap,
            invalidatesTags: vehicleChanged,
        }),

        // { id, status, statusNote? }
        updateVehicleStatus: builder.mutation({
            query: ({ id, ...body }) => ({ url: `${vehicleUrl(id)}/status`, method: "PATCH", body }),
            transformResponse: unwrap,
            invalidatesTags: vehicleChanged,
        }),

        // { id, litres, distanceKm?, note? }
        createFuelEntry: builder.mutation({
            query: ({ id, ...body }) => ({ url: `${vehicleUrl(id)}/fuel-entries`, method: "POST", body }),
            transformResponse: unwrap,
            invalidatesTags: vehicleChanged,
        }),

        deleteVehicle: builder.mutation({
            query: ({ id }) => ({ url: vehicleUrl(id), method: "DELETE" }),
            invalidatesTags: vehicleChanged,
        }),
    }),
});

export const {
    useGetVehiclesQuery,
    useGetFleetStatsQuery,
    useGetDepotsQuery,
    useGetVehicleQuery,
    useCreateVehicleMutation,
    useUpdateVehicleMutation,
    useUpdateVehicleStatusMutation,
    useCreateFuelEntryMutation,
    useDeleteVehicleMutation,
} = fleetApi;
