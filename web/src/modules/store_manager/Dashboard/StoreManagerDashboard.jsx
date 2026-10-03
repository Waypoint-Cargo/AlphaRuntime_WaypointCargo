import { Link } from "react-router-dom";
import { ArrowRight, ClipboardList, PlusCircle } from "lucide-react";

import { useAppSelector } from "@/store/hooks";
import { selectUser } from "@/modules/auth/slices/authSlice";
import { ROLE_LABELS, ROUTES } from "@/constants/app.constants";
import TopBar from "../../../shared/components/TopBar.jsx";
import Sidebar from "../../../shared/components/Sidebar.jsx";

const SHORTCUTS = [
    {
        to: ROUTES.STORE_MANAGER_ORDERS,
        title: "Review orders",
        text: "Check and confirm orders before dispatch planning.",
        icon: ClipboardList,
    },
    {
        to: ROUTES.STORE_MANAGER_CREATE_ORDER,
        title: "Create an order",
        text: "Enter delivery details and items for a new order.",
        icon: PlusCircle,
    },
];

// Placeholder landing page for store managers. The real dashboard widgets come later;
// this exists so the sign-in -> role redirect has somewhere to land.
export default function StoreManagerDashboard() {
    const user = useAppSelector(selectUser);

    return (
        <div className="app">
            <TopBar />
            <Sidebar active="dashboard" />
            <main className="workspace">
                <div className="main-col">
                    <h1>Store Manager Dashboard</h1>
                    <p className="subtitle">Welcome back, {user?.fullName ?? "Store Manager"}.</p>

                    <section className="rounded-2xl border border-line bg-white p-5">
                        <p className="text-xs font-semibold tracking-widest text-ink-secondary">SIGNED IN AS</p>
                        <p className="mt-1 text-lg font-bold text-forest">{user?.fullName}</p>
                        <p className="text-sm text-ink-secondary">
                            {ROLE_LABELS[user?.role] ?? user?.role}
                            {user?.employeeNumber ? ` · ${user.employeeNumber}` : ""}
                        </p>
                    </section>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                        {SHORTCUTS.map(({ to, title, text, icon: Icon }) => (
                            <Link
                                key={to}
                                to={to}
                                className="group flex items-start gap-4 rounded-2xl border border-line bg-white p-5 transition hover:border-gold"
                            >
                                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-forest text-gold">
                                    <Icon className="size-5" />
                                </span>
                                <span className="flex-1">
                                    <span className="block font-semibold text-forest">{title}</span>
                                    <span className="mt-0.5 block text-sm text-ink-secondary">{text}</span>
                                </span>
                                <ArrowRight className="size-4 self-center text-ink-secondary transition group-hover:translate-x-0.5" />
                            </Link>
                        ))}
                    </div>

                    <p className="mt-6 text-sm text-ink-secondary">Dashboard widgets are coming soon.</p>
                </div>
            </main>
        </div>
    );
}
