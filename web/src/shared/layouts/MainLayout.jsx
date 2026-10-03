import { NavLink, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Map as MapIcon, 
  Truck, 
  Car, 
  History, 
  User, 
  Settings, 
  LogOut,
  Bell
} from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/modules/auth/slices/authSlice';
import { useLogout } from '@/modules/auth/hooks/useLogout';
import { ROLE_PROFILE, ROUTES } from '@/constants/app.constants';
import { getInitials } from '@/shared/utils/userUtils';

// Dispatcher shell (sidebar + header). Only reachable for the DISPATCHER role.
export default function MainLayout() {
  const user = useAppSelector(selectUser);
  const { logout, isLoggingOut } = useLogout();

  const sidebarLinks = [
    { name: 'Dashboard', path: ROUTES.DISPATCHER_DASHBOARD, icon: <LayoutDashboard size={20} /> },
    { name: 'Orders', path: ROUTES.DISPATCHER_ORDERS, icon: <Package size={20} /> },
    { name: 'Plan & Allocate', path: ROUTES.DISPATCHER_PLAN, icon: <MapIcon size={20} /> },
    { name: 'Track Deliveries', path: ROUTES.DISPATCHER_TRACKING, icon: <Truck size={20} /> },
    { name: 'Fleet', path: ROUTES.DISPATCHER_FLEET, icon: <Car size={20} /> },
    { name: 'Deferrals', path: ROUTES.DISPATCHER_DEFERRALS, icon: <History size={20} /> },
  ];

  const bottomLinks = [
    { name: 'Profile', path: ROUTES.DISPATCHER_PROFILE, icon: <User size={20} /> },
    { name: 'Settings', path: '/settings', icon: <Settings size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#053D31] text-white flex-col hidden md:flex">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-[#053D31] font-bold text-xl">
              W
            </div>
            <div>
              <h1 className="font-semibold text-[15px] leading-tight text-white">Waypoint Cargo</h1>
              <p className="text-[10px] text-gray-300 font-light mt-0.5">Plan | Delivery | Stay Connected</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {sidebarLinks.map((link) => (
            <NavLink 
              key={link.name} 
              to={link.path}
              className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive ? 'bg-[#FFC107] text-[#053D31]' : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              {link.icon}
              <span className="text-sm font-medium">{link.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 space-y-1 mb-4">
          {bottomLinks.map((link) => (
            <NavLink 
              key={link.name} 
              to={link.path}
              className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive ? 'bg-[#FFC107] text-[#053D31]' : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              {link.icon}
              <span className="text-sm font-medium">{link.name}</span>
            </NavLink>
          ))}
          <div className="pt-2 mt-2">
            <button
              type="button"
              onClick={logout}
              disabled={isLoggingOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-white/10 transition-colors disabled:opacity-60"
            >
              <LogOut size={20} />
              <span className="text-sm font-medium">{isLoggingOut ? 'Signing out…' : 'Log Out'}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-[72px] bg-[#053D31] flex items-center justify-end px-6 gap-4">
           <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
              <Bell size={20} />
           </button>
           <NavLink
              to={ROLE_PROFILE[user?.role] ?? ROUTES.DISPATCHER_PROFILE}
              title={user?.fullName ? `${user.fullName} · My profile` : 'My profile'}
              aria-label="My profile"
              className={({ isActive }) => `w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-medium hover:bg-white/20 transition-colors ${
                isActive ? 'ring-2 ring-[#FFC107]' : ''
              }`}
           >
              {getInitials(user?.fullName)}
           </NavLink>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
