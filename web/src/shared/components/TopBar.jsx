import { BellIcon, WaypointMark } from "../../modules/store_manager/Orders/Icons.jsx";

export default function TopBar({ initials = "AR" }) {
  return (
    <header className="topbar">
      <div className="brand">
        <WaypointMark />
        <div className="brand-text">
          <strong>Waypoint Cargo</strong>
          <span>Plan | Delivery | Stay Connected</span>
        </div>
      </div>
      <div className="topbar-actions">
        <button className="round-btn" aria-label="Notifications"><BellIcon /></button>
        <button className="round-btn avatar" aria-label="Account">{initials}</button>
      </div>
    </header>
  );
}
