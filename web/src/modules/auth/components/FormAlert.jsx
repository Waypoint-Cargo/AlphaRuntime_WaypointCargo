import { AlertCircle, CheckCircle2, Info } from "lucide-react";

const VARIANTS = {
    error: { box: "border-error/30 bg-error-light text-error", icon: AlertCircle, role: "alert" },
    success: { box: "border-success/30 bg-success-light text-success", icon: CheckCircle2, role: "status" },
    info: { box: "border-info/30 bg-info-light text-info", icon: Info, role: "status" },
};

// A banner for server-side messages above/below an auth form
export default function FormAlert({ type = "error", children }) {
    const { box, icon: Icon, role } = VARIANTS[type];

    return (
        <div role={role} className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${box}`}>
            <Icon className="mt-0.5 size-4 shrink-0" />
            <p>{children}</p>
        </div>
    );
}
