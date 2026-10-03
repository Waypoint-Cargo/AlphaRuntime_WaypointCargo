// Sample data taken from the Figma screens (Store manager – Confirm Orders).
// Replace with API calls when the backend is ready.

export const ORIGIN = "Colombo Central";
export const CUTOFF = { minutes: 16 * 60, label: "4:00 PM" };
export const FLEET = {
  van: { maxWeight: 750, maxVolume: 6 },
  driversAvailable: 4,
  refrigerated: true,
};

export const INITIAL_COUNTS = {
  pending: 12,
  confirmed: 8,
  planned: 6,
  transit: 14,
  delivered: 32,
};

export const TABS = [
  { id: "pending", label: "Pending Review" },
  { id: "confirmed", label: "Confirmed" },
  { id: "planned", label: "Planned" },
  { id: "transit", label: "In Transit" },
  { id: "delivered", label: "Delivered" },
];

export const DRIVERS = {
  gosako: { name: "Gosako Fleet", color: "#18252a" },
  dhl: { name: "DHL", color: "#d40511" },
  fedex: { name: "FedEx", color: "#4d148c" },
  ups: { name: "UPS", color: "#351c15" },
};

const base = [
  { id: "ORD-108", created: "10:24 AM", outlet: "Colombo Central", city: "Colombo", items: 18, weight: 420, volume: 3.2, window: "10:00 AM – 12:00 PM", driver: "gosako" },
  { id: "ORD-107", created: "09:48 AM", outlet: "Kandy Super", city: "Kandy", items: 12, weight: 280, volume: 2.1, window: "01:00 PM – 03:00 PM", driver: "dhl" },
  { id: "ORD-106", created: "09:32 AM", outlet: "Galle Mart", city: "Galle", items: 25, weight: 610, volume: 4.8, window: "02:00 PM – 04:00 PM", driver: "fedex" },
  { id: "ORD-105", created: "08:17 AM", outlet: "Negombo Outlet", city: "Negombo", items: 8, weight: 190, volume: 1.5, window: "10:00 AM – 12:00 PM", driver: "gosako" },
  { id: "ORD-104", created: "07:56 AM", outlet: "Matara Store", city: "Matara", items: 16, weight: 380, volume: 3.0, window: "03:00 PM – 05:00 PM", driver: "ups" },
  { id: "ORD-103", created: "07:32 AM", outlet: "Kurunegala", city: "Kurunegala", items: 10, weight: 260, volume: 2.0, window: "04:00 PM – 06:00 PM", driver: "gosako" },
  { id: "ORD-102", created: "06:21 AM", outlet: "Jaffna Outlet", city: "Jaffna", items: 14, weight: 340, volume: 2.7, window: "09:00 AM – 11:00 AM", driver: "fedex" },
  { id: "ORD-101", created: "05:12 AM", outlet: "Ratnapura", city: "Ratnapura", items: 22, weight: 520, volume: 4.1, window: "01:00 PM – 03:00 PM", driver: "dhl" },
];

// The two Figma states (Pending Review and Planned) show the same eight orders.
// Per-order values that only appear for ORD-108 in the design (destination,
// route, slot, dispatch window) are kept on that record; others fall back to defaults.
const detailsPending = { destination: "Hikkaduwa" };
const detailsPlanned = {
  destination: "Negombo",
  route: "Route 04",
  slot: "Slot A",
  plannedAt: "10:42 AM",
  dispatchWindow: "09:30 AM – 10:00 AM",
};

export const SEED_ORDERS = [
  ...base.map((o) => ({
    ...o,
    uid: `${o.id}-pending`,
    date: "29 Sep 2026",
    type: "Standard Delivery",
    status: "pending",
    vehicleType: "Van",
    requirements: { vehicle: "Van required", loading: "Standard", refrigeration: "Not required" },
    products: [{ name: "Mixed goods", requested: o.items, available: o.items, unit: "units", weight: o.weight }],
    ...detailsPending,
  })),
  ...base.map((o) => ({
    ...o,
    uid: `${o.id}-planned`,
    date: "29 Sep 2026",
    type: "Standard Delivery",
    status: "planned",
    vehicleType: "Van",
    requirements: { vehicle: "Van required", loading: "Standard", refrigeration: "Not required" },
    products: [{ name: "Mixed goods", requested: o.items, available: o.items, unit: "units", weight: o.weight }],
    ...detailsPlanned,
  })),
];
