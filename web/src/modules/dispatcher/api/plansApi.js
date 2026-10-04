import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "@/services/baseQuery";

export const plansApi = createApi({
  reducerPath: "plansApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Plans", "Plan", "PlanQueue", "VehicleOptions", "Orders"],
  endpoints: (builder) => ({
    getPlans: builder.query({
      query: (params = {}) => ({
        url: "/plans",
        params: {
          ...(params.depotId ? { depotId: params.depotId } : {}),
          ...(params.deliveryDate ? { deliveryDate: params.deliveryDate } : {}),
          ...(params.status ? { status: params.status } : {}),
        },
      }),
      transformResponse: (res) => res?.data ?? [],
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: "Plans", id })), { type: "Plans", id: "LIST" }]
          : [{ type: "Plans", id: "LIST" }],
    }),

    getPlanById: builder.query({
      query: (id) => `/plans/${id}`,
      transformResponse: (res) => res?.data ?? null,
      providesTags: (_res, _err, id) => [{ type: "Plan", id }],
    }),

    getPlanQueue: builder.query({
      query: ({ id, ...params }) => ({
        url: `/plans/${id}/queue`,
        params: {
          ...(params.page ? { page: params.page } : {}),
          ...(params.pageSize ? { pageSize: params.pageSize } : {}),
          ...(params.brand && params.brand !== "ALL" ? { brand: params.brand } : {}),
          ...(params.tempClass && params.tempClass !== "ALL" ? { tempClass: params.tempClass } : {}),
          ...(params.sort ? { sort: params.sort } : {}),
          ...(params.q ? { q: params.q } : {}),
        },
      }),
      transformResponse: (res) => res?.data ?? { plan: null, items: [] },
      providesTags: (_res, _err, { id }) => [{ type: "PlanQueue", id }],
    }),

    closePlan: builder.mutation({
      query: (body) => ({
        url: "/plans/close",
        method: "POST",
        body,
      }),
      transformResponse: (res) => res?.data,
      invalidatesTags: [{ type: "Plans", id: "LIST" }, { type: "Orders" }],
    }),

    publishPlan: builder.mutation({
      query: ({ id, deferUnplanned = false }) => ({
        url: `/plans/${id}/publish`,
        method: "POST",
        body: { deferUnplanned },
      }),
      transformResponse: (res) => res?.data,
      invalidatesTags: (_res, _err, { id }) => [
        { type: "Plans", id: "LIST" },
        { type: "Plan", id },
        { type: "PlanQueue", id },
        { type: "Orders" },
      ],
    }),

    getVehicleOptions: builder.query({
      query: ({ orderId, sort }) => ({
        url: "/allocations/vehicle-options",
        params: {
          orderId,
          ...(sort ? { sort: String(sort).toLowerCase() } : {}),
        },
      }),
      transformResponse: (res) => {
        const rawOptions = res?.data?.options ?? (Array.isArray(res?.data) ? res.data : []);
        return rawOptions.map((opt) => {
          const checksMap = Object.fromEntries((opt.checks ?? []).map((c) => [c.code, c]));
          const vehicle = opt.vehicle ?? {};
          const maxWeight = Number(vehicle.maxWeightKg || 0);
          const maxVolume = Number(vehicle.maxVolumeM3 || 0);
          const currentWeight = Number(opt.currentLoad?.weightKg || 0);
          const currentVolume = Number(opt.currentLoad?.volumeM3 || 0);

          // Real proposed weight & volume from the engine checks
          const proposedWeight = Number(checksMap.WEIGHT?.value ?? currentWeight);
          const proposedVolume = Number(checksMap.VOLUME?.value ?? currentVolume);
          const weightUtilization = Number(checksMap.NEAR_CAPACITY?.value ?? (maxWeight > 0 ? Math.round((proposedWeight / maxWeight) * 100) : 0));
          const volumeUtilization = maxVolume > 0 ? Math.round((proposedVolume / maxVolume) * 100) : 0;

          // Fuel quota calculations
          const quotaL = opt.fuel?.quotaL ?? 100;
          const committedL = opt.fuel?.committedL ?? 0;
          const remainingL = opt.fuel?.remainingL != null ? Number(opt.fuel.remainingL) : Math.max(0, quotaL - committedL);

          const warningsList = opt.warnings?.map((w) => w.message || w.code) ?? [];
          const warningCodesList = opt.warnings?.map((w) => w.code || w) ?? [];
          const violationsList = opt.blockers?.map((b) => b.message || b.code) ?? [];

          return {
            ...opt,
            vehicleId: vehicle.id,
            registrationNo: vehicle.code ?? "Vehicle",
            vehicleType: vehicle.type,
            isRefrigerated: vehicle.isRefrigerated,
            maxWeightKg: maxWeight,
            maxVolumeM3: maxVolume,
            capacityKg: maxWeight,
            capacityM3: maxVolume,
            driver: vehicle.driver,
            valid: opt.verdict === "PASS",
            canAllocateWithWarnings: opt.verdict === "WARN",
            isBlocked: opt.verdict === "FAIL",
            violations: violationsList,
            warnings: warningsList,
            warningCodes: warningCodesList,
            checks: {
              temperatureFit: {
                passed: checksMap.TEMPERATURE?.status === "PASS",
                reason: checksMap.TEMPERATURE?.message ?? "Temp compatible",
              },
              weightCapacity: {
                passed: checksMap.WEIGHT?.status === "PASS",
                proposedKg: proposedWeight,
                capacityKg: maxWeight,
                utilizationPct: weightUtilization,
                reason: checksMap.WEIGHT?.message,
              },
              volumeCapacity: {
                passed: checksMap.VOLUME?.status === "PASS",
                proposedM3: proposedVolume,
                capacityM3: maxVolume,
                utilizationPct: volumeUtilization,
                reason: checksMap.VOLUME?.message,
              },
              timeWindowFeasibility: {
                passed: checksMap.DELIVERY_WINDOW?.status !== "FAIL",
                reason: checksMap.DELIVERY_WINDOW?.message ?? "Window met",
              },
              fuelQuota: {
                passed: checksMap.FUEL_QUOTA?.status !== "FAIL",
                weeklyRemainingL: remainingL,
                quotaL,
                tripEstimatedL: opt.fuel?.tripFuelL ?? 0,
                measurable: opt.fuel?.measurable ?? false,
                reason: checksMap.FUEL_QUOTA?.message ?? "Quota ok",
              },
              vehicleAccess: {
                passed: checksMap.VAN_ONLY?.status === "PASS",
                reason: checksMap.VAN_ONLY?.message ?? "Vehicle access verified",
              },
              overallVerdict: opt.verdict,
            },
          };
        });
      },
      providesTags: (_res, _err, { orderId }) => [{ type: "VehicleOptions", id: orderId }],
    }),

    validateAllocation: builder.mutation({
      query: (body) => ({
        url: "/allocations/validate",
        method: "POST",
        body,
      }),
      transformResponse: (res) => res?.data,
    }),

    allocateOrder: builder.mutation({
      query: (body) => ({
        url: "/allocations",
        method: "POST",
        body,
      }),
      transformResponse: (res) => res?.data,
      invalidatesTags: (_res, _err, arg) => [
        { type: "Plan" },
        { type: "PlanQueue" },
        { type: "VehicleOptions", id: arg?.orderId },
        { type: "Orders" },
      ],
    }),

    unallocateOrder: builder.mutation({
      query: ({ orderId, reason }) => ({
        url: `/allocations/${orderId}`,
        method: "DELETE",
        body: reason ? { reason } : undefined,
      }),
      transformResponse: (res) => res?.data,
      invalidatesTags: (_res, _err, { orderId }) => [
        { type: "Plan" },
        { type: "PlanQueue" },
        { type: "VehicleOptions", id: orderId },
        { type: "Orders" },
      ],
    }),
  }),
});

export const {
  useGetPlansQuery,
  useGetPlanByIdQuery,
  useGetPlanQueueQuery,
  useClosePlanMutation,
  usePublishPlanMutation,
  useGetVehicleOptionsQuery,
  useValidateAllocationMutation,
  useAllocateOrderMutation,
  useUnallocateOrderMutation,
} = plansApi;
