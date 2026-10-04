import { Link } from "react-router-dom";
import { Clock, MapPin, Truck, User } from "lucide-react";
import Badge from "./Badge";
import { STATUSES } from "../constants";

const ICON_TONES = {
    info: "bg-info-light text-info",
    success: "bg-success-light text-success",
    pending: "bg-pending-light text-pending",
};

// One line with a round icon, a small label and a bold value
function InfoRow({ icon: Icon, tone, label, value }) {
    return (
        <div className="flex items-center gap-3">
            <div className={`grid size-10 shrink-0 place-items-center rounded-full ${ICON_TONES[tone]}`}>
                <Icon className="size-5" />
            </div>
            <div>
                <p className="text-xs text-ink-secondary">{label}</p>
                <p className="font-semibold text-forest">{value}</p>
            </div>
        </div>
    );
}

export default function CurrentDelivery({ delivery }) {
    const status = STATUSES[delivery.status];

    return (
        <section className="rounded-2xl border border-line bg-surface p-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-forest">Current Delivery</h2>
                <Badge tone="success" dot>
                    Live
                </Badge>
            </div>

            <div className="mt-4 rounded-xl bg-screen p-4">
                <p className="text-xs text-ink-secondary">Order number</p>
                <p className="text-2xl font-extrabold text-forest">{delivery.id}</p>
                <p className="text-sm text-ink-secondary">{delivery.typeLabel}</p>
            </div>

            <div className="mt-5 space-y-4">
                <InfoRow icon={Clock} tone="info" label="ETA" value={delivery.eta} />
                <InfoRow icon={Truck} tone="success" label="Vehicle" value={delivery.vehicle} />
                <InfoRow icon={User} tone="pending" label="Driver" value={delivery.driver} />
            </div>

            <div className="mt-5 border-t border-divider pt-5">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-ink-secondary">Delivery status</span>
                    <Badge tone={status.tone} dot>
                        {status.label}
                    </Badge>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-divider">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${delivery.progress}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-xs text-ink-secondary">
                    <span>Departed {delivery.departed}</span>
                    <span>Arrives {delivery.arrives}</span>
                </div>
            </div>

            <Link
                to="/store/tracking"
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-forest py-3 text-sm font-semibold text-white transition hover:brightness-125"
            >
                <MapPin className="size-4" />
                Track Delivery
            </Link>
        </section>
    );
}