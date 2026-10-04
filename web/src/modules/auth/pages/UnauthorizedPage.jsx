import { Link } from "react-router-dom";
import { LogOut, ShieldAlert } from "lucide-react";

import { useAppSelector } from "@/store/hooks";
import { ROLE_HOME, ROLE_LABELS } from "@/constants/app.constants";
import AuthLayout from "../components/AuthLayout";
import { useLogout } from "../hooks/useLogout";
import { selectUser } from "../slices/authSlice";

// Shown to a signed-in user who opened an area their role can't use, or whose
// role has no web dashboard at all (loaders, drivers and admins use other apps).
export default function UnauthorizedPage() {
    const user = useAppSelector(selectUser);
    const { logout, isLoggingOut } = useLogout();

    const home = ROLE_HOME[user?.role];
    const roleLabel = ROLE_LABELS[user?.role] ?? "your";

    return (
        <AuthLayout>
            <div className="flex flex-col items-center text-center">
                <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-error-light text-error">
                    <ShieldAlert className="size-7" />
                </div>
                <h1 className="text-3xl font-extrabold text-forest">Access denied</h1>
                <p className="mt-2 text-sm text-ink-secondary">
                    {home
                        ? "You don't have permission to view that page."
                        : `The ${roleLabel} role doesn't have access to the web portal. Please use the Waypoint mobile app, or sign in with a different account.`}
                </p>

                {home && (
                    <Link
                        to={home}
                        className="mt-8 w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:brightness-110"
                    >
                        Go to my dashboard
                    </Link>
                )}

                <button
                    type="button"
                    onClick={logout}
                    disabled={isLoggingOut}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition disabled:opacity-60 ${
                        home
                            ? "mt-3 text-brand hover:underline"
                            : "mt-8 bg-brand text-white shadow-lg shadow-brand/30 hover:brightness-110"
                    }`}
                >
                    <LogOut className="size-4" />
                    {isLoggingOut ? "Signing out..." : "Sign out"}
                </button>
            </div>
        </AuthLayout>
    );
}
