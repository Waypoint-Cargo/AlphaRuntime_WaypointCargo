import { CheckIcon } from "./Icons.jsx";
import { DRIVERS } from "../../../store/orders.js";

const STATUS = {
  pending: { label: "Pending Review", cls: "pending" },
  confirmed: { label: "Confirmed", cls: "ok" },
  planned: { label: "Planned", cls: "ok" },
  transit: { label: "In Transit", cls: "ok" },
  delivered: { label: "Delivered", cls: "ok" },
};

function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 55%, 45%)`;
}

function getDriverDisplay(driver) {
  if (!driver) {
    return { name: "Unassigned", color: "#b0bec5", isAssigned: false };
  }
  if (typeof driver === "object") {
    const name = driver.name || driver.fullName || "Driver";
    return {
      name,
      color: stringToColor(name),
      isAssigned: true,
      phone: driver.phone,
      employeeNumber: driver.employeeNumber,
    };
  }
  if (DRIVERS[driver]) {
    return { ...DRIVERS[driver], isAssigned: true };
  }
  return {
    name: String(driver),
    color: stringToColor(String(driver)),
    isAssigned: true,
  };
}

export function StatusBadge({ status }) {
  const s = STATUS[status] || { label: status || "Unknown", cls: "pending" };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

function Checkbox({ checked, onChange, label }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} aria-label={label} className={`checkbox${checked ? " checked" : ""}`}
      onClick={(e) => { e.stopPropagation(); onChange(); }}>
      {checked && <CheckIcon />}
    </button>
  );
}

export default function OrdersTable({ rows, status, activeUid, selected, onToggle, onRowClick, total, page, pageCount, onPage }) {
  const showDriver = status === "planned";
  return (
    <section className="card table-card">
      <div className={`row head${showDriver ? " with-driver" : ""}`}>
        <span />
        <span>Order ID</span>
        <span>Outlet</span>
        <span>Items</span>
        <span>Delivery Date &amp; Window</span>
        {showDriver && <span>Driver</span>}
        <span>Status</span>
        <span className="right">Actions</span>
      </div>

      <div className="rows">
        {rows.length === 0 && <div className="empty">No orders in this view.</div>}
        {rows.map((o) => {
          const active = o.uid === activeUid;
          const driverInfo = getDriverDisplay(o.driver);
          return (
            <div key={o.uid} tabIndex={0} role="button" aria-pressed={active}
              className={`row body${showDriver ? " with-driver" : ""}${active && status === "pending" ? " active" : ""}`}
              onClick={() => onRowClick(o.uid)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onRowClick(o.uid))}>
              <Checkbox checked={selected.has(o.uid)} onChange={() => onToggle(o.uid)} label={`Select ${o.id}`} />
              <div className="cell"><strong>{o.id}</strong><small>Created {o.created}</small></div>
              <div className="cell"><span>{o.outlet}</span><small>{o.city}</small></div>
              <div className="cell"><span>{o.items} items</span><small>{o.weight} kg · {o.volume} m³</small></div>
              <div className="cell"><span>{o.date}</span><small>{o.window}</small></div>
              {showDriver && (
                <div className="cell driver" title={driverInfo.name}>
                  <i style={{ background: driverInfo.color }} />
                  <span style={!driverInfo.isAssigned ? { color: "var(--stone)", fontStyle: "italic" } : {}}>
                    {driverInfo.name}
                  </span>
                </div>
              )}
              <div className="cell"><StatusBadge status={o.status} /></div>
              <div className="cell right chevron" aria-hidden="true">›</div>
            </div>
          );
        })}
      </div>

      <footer className="table-foot">
        <span>Showing {rows.length} of {total} orders</span>
        <div className="pager">
          <button onClick={() => onPage(Math.max(1, page - 1))} aria-label="Previous page">‹</button>
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
            <button key={n} className={n === page ? "on" : ""} onClick={() => onPage(n)}>{n}</button>
          ))}
          <button onClick={() => onPage(Math.min(pageCount, page + 1))} aria-label="Next page">›</button>
        </div>
      </footer>
    </section>
  );
}
