import { Outlet } from "react-router-dom";
import TopBar from "@/shared/components/TopBar";
import Sidebar from "@/shared/components/Sidebar";

export default function StoreManagerLayout({ children, active = "dashboard" }) {
    return (
        <div className="app">
            <TopBar />
            <Sidebar active={active} />
            <main className="workspace">
                <div className="main-col">{children ?? <Outlet />}</div>
            </main>
        </div>
    );
}