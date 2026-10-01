import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Map, 
  Truck, 
  Car, 
  Users, 
  User, 
  Settings, 
  LogOut,
  Bell
} from 'lucide-react';

export default function MainLayout({ children }) {
  const sidebarLinks = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Orders', icon: <Package size={20} /> },
    { name: 'Plan & Allocate', icon: <Map size={20} /> },
    { name: 'Track Deliveries', icon: <Truck size={20} /> },
    { name: 'Fleet', icon: <Car size={20} /> },
    { name: 'Referrals', icon: <Users size={20} /> },
  ];

  const bottomLinks = [
    { name: 'Profile', icon: <User size={20} />, active: true },
    { name: 'Settings', icon: <Settings size={20} /> },
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
            <a 
              key={link.name} 
              href="#" 
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-white/10 transition-colors"
            >
              {link.icon}
              <span className="text-sm font-medium">{link.name}</span>
            </a>
          ))}
        </nav>

        <div className="px-4 py-4 space-y-1 mb-4">
          {bottomLinks.map((link) => (
            <a 
              key={link.name} 
              href="#" 
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                link.active 
                  ? 'bg-[#FFC107] text-[#053D31]' 
                  : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              {link.icon}
              <span className="text-sm font-medium">{link.name}</span>
            </a>
          ))}
          <div className="pt-2 mt-2">
            <a 
              href="#" 
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-white/10 transition-colors"
            >
              <LogOut size={20} />
              <span className="text-sm font-medium">Log Out</span>
            </a>
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
           <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-medium hover:bg-white/20 transition-colors">
              AR
           </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
