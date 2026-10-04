const TONES = {
    pending: "bg-pending-light text-pending",
    info: "bg-info-light text-info",
    success: "bg-success-light text-success",
    error: "bg-error-light text-error",
    frozen: "bg-violet-100 text-violet-700",
};

export default function Badge({ tone = "info", icon: Icon, dot = false, children }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${TONES[tone]}`}
        >
            {Icon && <Icon className="size-3.5" />}
            {dot && <span className="size-2 rounded-full bg-current" />}
            {children}
        </span>
    );
}