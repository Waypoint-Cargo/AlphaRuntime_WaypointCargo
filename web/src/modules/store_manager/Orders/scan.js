// Rows shown in the Review Order "Fulfillment Check" list. Every id is the
// `code` returned by GET /api/orders/:id/checks.
export const CHECKS = [
  { id: "STOCK_AVAILABILITY", label: "Product availability" },
  { id: "WEIGHT_FIT", label: "Weight capacity" },
  { id: "VOLUME_FIT", label: "Volume capacity" },
  { id: "VEHICLE_TYPE", label: "Vehicle type" },
  { id: "OUTLET_REQUIREMENTS", label: "Outlet requirements" },
  { id: "OPERATING_DAY", label: "Delivery date" },
  { id: "CUTOFF", label: "Order cutoff" },
];

// Current time in the depot's timezone, matching the backend cutoff logic.
export function getNow() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Colombo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const h = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const m = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  const h12 = ((h + 11) % 12) + 1;
  return { minutes: h * 60 + m, label: `${h12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}` };
}

const stockLines = (check) => (Array.isArray(check?.value) ? check.value : []);
const STATE_BY_STATUS = { PASS: "pass", INFO: "pass", WARN: "warn", FAIL: "fail" };

const describe = (check) => {
  const ok = check.status === "PASS" || check.status === "INFO";
  switch (check.code) {
    case "WEIGHT_FIT": return ok ? `Fits (max ${check.limit} kg)` : `Over capacity (${check.value} / ${check.limit} kg)`;
    case "VOLUME_FIT": return ok ? `Fits (max ${check.limit} m³)` : `Over capacity (${check.value} / ${check.limit} m³)`;
    case "VEHICLE_TYPE": return ok ? "Compatible" : "No compatible vehicle";
    case "OUTLET_REQUIREMENTS": return "Compatible";
    case "OPERATING_DAY": return ok ? "Operating day" : "Not an operating day";
    case "CUTOFF": return ok ? "Within cutoff" : "Past cutoff – date will roll over";
    case "STOCK_AVAILABILITY": return ok ? "Available" : stockLines(check).some((l) => !l.inStock) ? "Item not stocked" : "Short on stock";
    default: return check.message ?? check.status;
  }
};

// Turns the backend verdict into the shape ReviewOrderModal renders.
//  ok       -> order may be confirmed (no FAIL checks, no shortages)
//  rollover -> cutoff has passed; confirming moves delivery to the next operating day
export function buildScanResult(order, response) {
  const byCode = Object.fromEntries((response?.checks ?? []).map((check) => [check.code, check]));
  const stockLines = Array.isArray(byCode.STOCK_AVAILABILITY?.value) ? byCode.STOCK_AVAILABILITY.value : [];
  const products = stockLines.map((line) => ({
    name: line.itemName, sku: line.sku, unit: line.unit, requested: line.requested, available: line.available, inStock: line.inStock,
  }));
  const shortages = stockLines
    .filter((line) => line.status === "FAIL")
    .map((line) => ({
      name: line.itemName,
      requested: line.requested,
      available: line.available,
      missing: Math.max(0, line.requested - line.available),
      inStock: line.inStock,
    }));

  const checks = CHECKS.map((definition) => {
    const check = byCode[definition.id];
    if (!check) return { ...definition, state: "warn", value: "Not evaluated" };
    return { ...definition, state: STATE_BY_STATUS[check.status] ?? "warn", value: describe(check) };
  });

  const verdict = response?.verdict ?? "FAIL";
  return {
    checks,
    shortages,
    products,
    verdict,
    rollover: byCode.CUTOFF?.status === "WARN",
    cutoffOk: byCode.CUTOFF?.status === "PASS",
    ok: verdict !== "FAIL" && shortages.length === 0,
  };
}
