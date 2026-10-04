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
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const close = () => setOpen(false);

    const handleLogout = () => {
        navigate("/login");
    };

    return (
        <div
            className="grid min-h-screen bg-screen"
            style={{
                gridTemplateColumns: "260px minmax(0, 1fr)",
                gridTemplateRows: "72px minmax(0, 1fr)",
                gridTemplateAreas: '"top top" "side main"',
            }}
        >
            <header
                className="flex items-center justify-between border-b border-white/10 bg-forest px-4 text-white lg:px-6"
                style={{ gridArea: "top" }}
            >
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

            {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={close} />}

            <aside
                className={`flex w-[260px] shrink-0 flex-col justify-between bg-forest p-4 transition-transform lg:static lg:translate-x-0 ${
                    open ? "translate-x-0" : "-translate-x-full"
                }`}
                style={{ gridArea: "side" }}
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

            <main className="min-h-0 w-full overflow-hidden" style={{ gridArea: "main" }}>
                <div className="h-full w-full max-w-[1480px] mx-auto p-3 lg:p-5">{children}</div>
            </main>
        </div>
    );
}