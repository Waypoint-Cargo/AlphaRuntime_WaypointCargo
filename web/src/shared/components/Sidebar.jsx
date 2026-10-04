import { Link } from "react-router-dom";
import { DashboardIcon, PlusCircleIcon, ClipboardIcon, PinIcon, AlertIcon, UsersIcon, SettingsIcon, LogOutIcon } from "../../modules/store_manager/Orders/Icons.jsx";
import { ROUTES } from "@/constants/app.constants";
import { useLogout } from "@/modules/auth/hooks/useLogout";

// `to` = real route. Items without one are not built yet and stay as "#id" placeholders.
const MAIN = [
  { id: "dashboard", label: "Dashboard", Icon: DashboardIcon, to: ROUTES.STORE_MANAGER_DASHBOARD },
  { id: "create", label: "Create Order", Icon: PlusCircleIcon, to: ROUTES.STORE_MANAGER_CREATE_ORDER },
  { id: "orders", label: "Orders", Icon: ClipboardIcon, to: ROUTES.STORE_MANAGER_ORDERS },
  { id: "tracking", label: "Delivery Tracking", Icon: PinIcon },
];
const SUPPORT = [
  { id: "issue", label: "Report Delivery Issue", Icon: AlertIcon },
  { id: "employees", label: "Manage Employees", Icon: UsersIcon, to: ROUTES.STORE_MANAGER_EMPLOYEES },
];

function NavItem({ item, active }) {
  const { Icon } = item;
  const className = `nav-item${active ? " active" : ""}`;
  const content = (
    <>
      {active && <span className="accent" />}
      <Icon />
      <span>{item.label}</span>
    </>
  );

  return item.to ? (
    <Link to={item.to} className={className} aria-current={active ? "page" : undefined}>{content}</Link>
  ) : (
    <a href={`#${item.id}`} className={className} aria-current={active ? "page" : undefined}>{content}</a>
  );
}

export default function Sidebar({ active = "orders" }) {
  const { logout, isLoggingOut } = useLogout();

  return (
    <aside className="sidebar">
      <nav>
        <div className="nav-group">
          {MAIN.map((i) => <NavItem key={i.id} item={i} active={i.id === active} />)}
        </div>
        <div className="nav-group">
          <p className="nav-heading">SUPPORT</p>
          {SUPPORT.map((i) => <NavItem key={i.id} item={i} active={i.id === active} />)}
        </div>
      </nav>
      <div className="nav-group bottom">
        <a href="#settings" className="nav-item small"><SettingsIcon /><span>Setting</span></a>
        <button type="button" className="nav-item small" onClick={logout} disabled={isLoggingOut}>
          <LogOutIcon /><span>{isLoggingOut ? "Signing out…" : "Log Out"}</span>
        </button>
      </div>
    </aside>
  );
}
