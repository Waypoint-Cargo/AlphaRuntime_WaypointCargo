import { ChevronRight } from "lucide-react";

const TONES = {
    success: "bg-success-light text-success",
    info: "bg-info-light text-info",
    pending: "bg-pending-light text-pending",
};

export default function TrackingStatCard({ icon: Icon, label, value, tone = "info", onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex w-full items-center gap-4 rounded-2xl border border-line bg-surface p-5 text-left transition hover:border-gold"
        >
            <div className={`grid size-14 shrink-0 place-items-center rounded-xl ${TONES[tone]}`}>
                <Icon className="size-6" />
            </div>
            <div className="flex-1">
                <p className="text-sm text-ink-secondary">{label}</p>
                <p className="text-3xl font-extrabold leading-tight text-forest">{value}</p>
            </div>
            <ChevronRight className="size-5 text-ink-secondary" />
        </button>
    );
}