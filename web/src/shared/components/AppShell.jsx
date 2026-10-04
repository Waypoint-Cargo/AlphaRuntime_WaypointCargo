import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Bell, LogOut, Menu, Settings, X } from "lucide-react";

function NavItem({ to, icon: Icon, label, end, onClick }) {
    return (
        <NavLink
            to={to}
            end={end}
            onClick={onClick}
            className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] transition ${
                    isActive ? "bg-gold font-semibold text-forest" : "font-medium text-white/90 hover:bg-white/10"
                }`
            }
        >
            <Icon className="size-5" />
            {label}
        </NavLink>
    );
}

export default function AppShell({ nav = [], support = [], settingsPath, user, children }) {
    const [open, setOpen] = useState(false); // is the sidebar open on phones?
    const navigate = useNavigate();
    const close = () => setOpen(false);

    const handleLogout = () => {
        // TODO: clear the saved login here later
        navigate("/login");
    };

    return (
        <div className="flex min-h-screen flex-col bg-screen">
            {/* Top bar */}
            <header className="flex h-16 items-center justify-between border-b border-white/10 bg-forest px-4 text-white lg:px-6">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        aria-label="Open menu"
                        className="lg:hidden"
                    >
                        <Menu className="size-6" />
                    </button>
                    <div className="grid size-10 place-items-center rounded-xl bg-gold text-lg font-black text-forest">
                        W
                    </div>
                    <div className="leading-tight">
                        <p className="font-bold">Waypoint Cargo</p>
                        <p className="hidden text-xs text-white/70 sm:block">Plan | Delivery | Stay Connected</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        aria-label="Notifications"
                        className="grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"
                    >
                        <Bell className="size-5" />
                    </button>
                    <div className="grid size-10 place-items-center rounded-full bg-white/10 text-sm font-bold">
                        {user?.initials}
                    </div>
                </div>
            </header>

            <div className="flex flex-1">
                {/* Dark overlay behind the sidebar on phones */}
                {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={close} />}

                {/* Sidebar */}
                <aside
                    className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col justify-between bg-forest p-4 transition-transform lg:static lg:translate-x-0 ${
                        open ? "translate-x-0" : "-translate-x-full"
                    }`}
                >
                    <div>
                        <button
                            type="button"
                            onClick={close}
                            aria-label="Close menu"
                            className="mb-2 ml-auto block text-white lg:hidden"
                        >
                            <X className="size-6" />
                        </button>

                        <nav className="space-y-2">
                            {nav.map((item) => (
                                <NavItem key={item.to} {...item} onClick={close} />
                            ))}
                        </nav>

                        {support.length > 0 && (
                            <>
                                <p className="mb-2 mt-8 px-4 text-xs font-semibold tracking-widest text-white/50">
                                    SUPPORT
                                </p>
                                <nav className="space-y-2">
                                    {support.map((item) => (
                                        <NavItem key={item.to} {...item} onClick={close} />
                                    ))}
                                </nav>
                            </>
                        )}
                    </div>

                    <div className="space-y-1">
                        <NavItem to={settingsPath} icon={Settings} label="Setting" onClick={close} />
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium text-white/90 transition hover:bg-white/10"
                        >
                            <LogOut className="size-5" />
                            Log Out
                        </button>
                    </div>
                </aside>

                {/* Page content goes here */}
                <main className="min-w-0 flex-1 p-5 lg:p-8">{children}</main>
            </div>
        </div>
    );
}