import { DashboardIcon, PlusCircleIcon, ClipboardIcon, PinIcon, AlertIcon, UsersIcon, SettingsIcon, LogOutIcon } from "../../modules/store_manager/Orders/Icons.jsx";

const MAIN = [
  { id: "dashboard", label: "Dashboard", Icon: DashboardIcon },
  { id: "create", label: "Create Order", Icon: PlusCircleIcon },
  { id: "orders", label: "Orders", Icon: ClipboardIcon },
  { id: "tracking", label: "Delivery Tracking", Icon: PinIcon },
];
const SUPPORT = [
  { id: "issue", label: "Report Delivery Issue", Icon: AlertIcon },
  { id: "employees", label: "Manage Employees", Icon: UsersIcon },
];

function NavItem({ item, active }) {
  const { Icon } = item;
  return (
    <a href={`#${item.id}`} className={`nav-item${active ? " active" : ""}`} aria-current={active ? "page" : undefined}>
      {active && <span className="accent" />}
      <Icon />
      <span>{item.label}</span>
    </a>
  );
}

export default function Sidebar({ active = "orders" }) {
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
        <a href="#logout" className="nav-item small"><LogOutIcon /><span>Log Out</span></a>
      </div>
    </aside>
  );
}
