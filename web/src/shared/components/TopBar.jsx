import { NavLink } from "react-router-dom";
import { BellIcon, WaypointMark } from "../../modules/store_manager/Orders/Icons.jsx";
import { useAppSelector } from "@/store/hooks";
import { selectUser } from "@/modules/auth/slices/authSlice";
import { ROLE_PROFILE, ROUTES } from "@/constants/app.constants";
import { getInitials } from "@/shared/utils/userUtils";

// `initials` overrides the signed-in user's initials (defaults to them)
export default function TopBar({ initials }) {
  const user = useAppSelector(selectUser);
  // the avatar opens the signed-in user's own profile (each role has its own route)
  const profilePath = ROLE_PROFILE[user?.role] ?? ROUTES.ROOT;

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
        <NavLink
          to={profilePath} className="round-btn avatar" aria-label="My profile"
          title={user?.fullName ? `${user.fullName} · My profile` : "My profile"}
        >
          {initials ?? getInitials(user?.fullName)}
        </NavLink>
      </div>
    </header>
  );
}
