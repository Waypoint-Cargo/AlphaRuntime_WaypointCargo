// Each "tone" is a pair: soft background + strong icon color (from our theme)
const TONES = {
    muted: "bg-muted text-forest",
    info: "bg-info-light text-info",
    pending: "bg-pending-light text-pending",
    success: "bg-success-light text-success",
    error: "bg-error-light text-error",
};

export default function StatCard({ icon: Icon, value, label, tone = "muted" }) {
    return (
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
            <div className={`grid size-12 shrink-0 place-items-center rounded-full ${TONES[tone]}`}>
                <Icon className="size-6" />
            </div>
            <div>
                <p className="text-3xl font-extrabold leading-none text-forest">{value}</p>
                <p className="mt-1 text-sm text-ink-secondary">{label}</p>
            </div>
        </div>
    );
}