// Static UI constants for the Store Manager orders screens.

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

