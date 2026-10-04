import { CheckIcon } from "./Icons.jsx";
import { StatusBadge } from "./OrdersTable.jsx";
import { ORIGIN } from "../../../store/orders.js";

// Pending orders have not been through the Review Order availability scan yet,
// so nothing is shown as verified until the order is confirmed.
const RESOURCES = {
  pending: {
    verified: false,
    items: [
      ["Product availability", "Not verified"],
      ["Vehicle capacity", "Not verified"],
      ["Vehicle type", "Not verified"],
      ["Outlet requirements", "Not verified"],
      ["Delivery date & cutoff", "Not verified"],
    ],
  },
  verified: {
    verified: true,
    items: [
      ["Product availability", "Verified"],
      ["Vehicle capacity", "Verified"],
      ["Vehicle type", "Verified"],
      ["Outlet requirements", "Verified"],
      ["Delivery date & cutoff", "Verified"],
    ],
  },
  planned: {
    verified: true,
    items: [
      ["Product availability", "Confirmed"],
      ["Vehicle capacity", "Assigned"],
      ["Vehicle type (Van)", "Assigned"],
      ["Driver availability", "Assigned"],
      ["Outlet requirements", "Confirmed"],
    ],
  },
};

export default function OrderDetailPanel({ order, onReview, onCancel, onViewDetails, onViewRoute, onAssignDriver }) {
  if (!order) {
    return <aside className="card detail empty-detail">Select an order to see its summary.</aside>;
  }
  const planned = order.status === "planned";
  const pending = order.status === "pending";
  const confirmed = order.status === "confirmed";
  const resources = RESOURCES[planned ? "planned" : pending ? "pending" : "verified"];

  return (
    <aside className="card detail" aria-label="Order details">
      <header className="detail-head">
        <div className="detail-title"><h2>{order.id}</h2><StatusBadge status={order.status} /></div>
        <p className="route">{ORIGIN} → {order.destination}</p>
        <p className="meta">
          Created {order.created} · {order.items} items{planned && order.plannedAt ? ` · Planned ${order.plannedAt}` : ""}
        </p>
      </header>

      <div className="detail-body">
        <h3>Order Summary</h3>
        <dl className="summary">
          <div><dt>Order type</dt><dd>{order.type}{planned && order.route ? ` · ${order.route}` : ""}</dd></div>
          <div><dt>Delivery date</dt><dd>{order.date}</dd></div>
          <div><dt>Delivery window</dt><dd>{order.window}{planned && order.slot ? ` · ${order.slot}` : ""}</dd></div>
          <div><dt>Total items</dt><dd>{order.items}</dd></div>
          <div><dt>Total weight</dt><dd>{order.weight} kg</dd></div>
          <div><dt>Total volume</dt><dd>{order.volume} m³</dd></div>
        </dl>

        <section className="resources">
          <h4>Required Resources</h4>
          <ul>
            {resources.items.map(([name, state]) => {
              const displayState = name === "Driver availability" && planned
                ? (order.driver?.name ? `Assigned (${order.driver.name})` : "Unassigned")
                : state;
              const isChecked = resources.verified && displayState !== "Unassigned";
              return (
                <li key={name}>
                  <span className={`tick${isChecked ? "" : " unchecked"}`}>{isChecked && <CheckIcon />}</span>
                  <span className="r-name">{name}</span>
                  <span className={`r-state${isChecked ? "" : " unverified"}`}>{displayState}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="callout">
          {planned ? (
            <>
              <h4>Dispatch window</h4>
              <p className="big">{order.dispatchWindow ?? "09:30 AM – 10:00 AM"}</p>
              <p className="note">Vehicle will depart between 09:30 AM and 10:00 AM.</p>
            </>
          ) : (
            <>
              <h4>Order cutoff</h4>
              <p className="big">4:00 PM</p>
              <p className="note">Orders placed before the cutoff time will be processed for the same day.</p>
            </>
          )}
        </section>
      </div>

      <div className="detail-actions">
        {planned ? (
          <>
            <button className="btn primary" onClick={() => onViewRoute(order)}>View Route →</button>
            <button className="btn" onClick={() => onAssignDriver(order)}>Assign Driver</button>
          </>
        ) : pending ? (
          <>
            <button className="btn primary" onClick={() => onReview(order)}>Review Order →</button>
            <button className="btn danger" onClick={() => onCancel(order)}>Cancel Order</button>
          </>
        ) : confirmed ? (
          <button className="btn danger" onClick={() => onCancel(order)}>Cancel Order</button>
        ) : (
          <button className="btn" onClick={() => onViewDetails(order)}>View Details</button>
        )}
      </div>
    </aside>
  );
}
