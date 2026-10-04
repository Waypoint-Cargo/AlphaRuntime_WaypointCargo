import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "@/services/baseQuery";

const UI_STATUS_MAP = {
  DRAFT: "pending",
  PENDING_REVIEW: "pending",
  CONFIRMED: "confirmed",
  DEFERRED: "confirmed",
  PLANNED: "planned",
  LOADED: "planned",
  PARTIALLY_LOADED: "planned",
  IN_TRANSIT: "transit",
  DELIVERED: "delivered",
  PARTIALLY_DELIVERED: "delivered",
  RECEIVED: "delivered",
  RECEIVED_WITH_ISSUES: "delivered",
  FAILED: "delivered",
  CANCELLED: "pending",
};

const toClockLabel = (minutes) => {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return "—";
  const safeMinutes = Number(minutes);
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  const normalized = ((hours + 11) % 12) + 1;
  return `${normalized}:${String(mins).padStart(2, "0")} ${suffix}`;
};

const toDateLabel = (dateLike) => {
  if (!dateLike) return "—";
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return dateLike;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const UNLOADING_LABELS = { REAR_DOCK: "Rear dock", CURB: "Curbside", MALL_BAY: "Mall bay" };

const normalizeOrder = (order) => {
  const status = UI_STATUS_MAP[order.status] ?? "pending";
  const items = Array.isArray(order.items) ? order.items : [];
  const totalWeight = Number(order.totalWeightKg ?? 0);
  const totalVolume = Number(order.totalVolumeM3 ?? 0);
  const window = order.window ?? {};
  const createdAt = order.createdAt ? new Date(order.createdAt) : null;

  return {
    uid: order.id,
    id: order.reference ?? order.id,
    status,
    created: createdAt ? createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—",
    date: order.deliveryDate ? toDateLabel(order.deliveryDate) : "—",
    outlet: order.outletName ?? order.outlet?.name ?? order.outletId ?? "Outlet",
    depot: order.depotName ?? order.depot?.name ?? order.depotId ?? "Depot",
    city: order.city ?? "Colombo",
    items: Number(order.itemCount ?? items.length ?? 0),
    weight: Number.isFinite(totalWeight) ? totalWeight : 0,
    volume: Number.isFinite(totalVolume) ? totalVolume : 0,
    type: order.brand ?? "Standard Delivery",
    window: window.startMin !== undefined && window.endMin !== undefined
      ? `${toClockLabel(window.startMin)} – ${toClockLabel(window.endMin)}`
      : "—",
    vehicleType: order.snapshot?.vanOnly ? "Van" : "Any",
    requirements: {
      vehicle: order.snapshot?.vanOnly ? "Van required" : "No restriction",
      loading: UNLOADING_LABELS[order.snapshot?.unloadingType] ?? "Standard",
      refrigeration: order.tempClass && order.tempClass !== "AMBIENT" ? "Required" : "Not required",
    },
    products: items.map((item) => ({
      name: item.itemName ?? "Item",
      requested: Number(item.quantity ?? 0),
      available: Number(item.quantity ?? 0),
      unit: item.unit ?? "units",
      weight: Number(item.weightKg ?? 0),
    })),
    destination: order.destination ?? "Colombo",
    route: order.route ?? "Route 01",
    slot: order.slot ?? "Slot A",
    plannedAt: order.confirmedAt ? new Date(order.confirmedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—",
    dispatchWindow: order.dispatchWindow ?? "09:30 AM – 10:00 AM",
    driver: order.driver ?? null,
    raw: order,
  };
};

const STATUS_QUERY_MAP = {
  pending: "PENDING_REVIEW",
  confirmed: "CONFIRMED",
  planned: "PLANNED",
  transit: "IN_TRANSIT",
  delivered: "DELIVERED",
};

export const ordersApi = createApi({
  reducerPath: "ordersApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Orders"],
  endpoints: (builder) => ({
    getOrders: builder.query({
      query: ({ status = null, page = 1, pageSize = 20, q = "" } = {}) => ({
        url: "/orders",
        params: {
          page,
          pageSize,
          ...(status ? { status: STATUS_QUERY_MAP[status] ?? status } : {}),
          ...(q ? { q } : {}),
        },
      }),
      transformResponse(response) {
        return {
          items: (response?.data ?? []).filter((order) => order.status !== "CANCELLED").map(normalizeOrder),
          meta: response?.meta ?? { page: 1, pageSize: 20, total: 0, pageCount: 1 },
        };
      },
      providesTags: [{ type: "Orders", id: "LIST" }],
    }),
    getOrderSummary: builder.query({
      query: ({ deliveryDate } = {}) => ({
        url: "/orders/summary",
        params: deliveryDate ? { deliveryDate } : {},
      }),
      transformResponse(response) {
        return response?.data ?? { byStatus: {}, byBrand: {}, byTab: {} };
      },
    }),
    getOrderById: builder.query({
      query: (id) => ({ url: `/orders/${id}` }),
      transformResponse(response) {
        return normalizeOrder(response?.data ?? {});
      },
    }),
    getOrderChecks: builder.query({
      query: (id) => ({ url: `/orders/${id}/checks` }),
      transformResponse: (response) => response?.data ?? { verdict: "FAIL", checks: [] },
    }),
    createOrder: builder.mutation({
      query: (payload) => ({ url: "/orders", method: "POST", body: payload }),
      invalidatesTags: [{ type: "Orders", id: "LIST" }],
    }),
    submitOrder: builder.mutation({
      query: ({ id }) => ({ url: `/orders/${id}/submit`, method: "POST" }),
      invalidatesTags: [{ type: "Orders", id: "LIST" }],
    }),
    confirmOrder: builder.mutation({
      query: ({ id }) => ({ url: `/orders/${id}/confirm`, method: "POST" }),
      invalidatesTags: [{ type: "Orders", id: "LIST" }],
    }),
    cancelOrder: builder.mutation({
      query: ({ id, reason }) => ({ url: `/orders/${id}/cancel`, method: "POST", body: { reason } }),
      invalidatesTags: [{ type: "Orders", id: "LIST" }],
    }),
    deferOrder: builder.mutation({
      query: ({ id, reason }) => ({ url: `/orders/${id}/defer`, method: "POST", body: { reason } }),
      invalidatesTags: [{ type: "Orders", id: "LIST" }],
    }),
  }),
});

export const {
  useGetOrdersQuery,
  useGetOrderSummaryQuery,
  useGetOrderByIdQuery,
  useLazyGetOrderChecksQuery,
  useCreateOrderMutation,
  useSubmitOrderMutation,
  useConfirmOrderMutation,
  useCancelOrderMutation,
  useDeferOrderMutation,
} = ordersApi;
