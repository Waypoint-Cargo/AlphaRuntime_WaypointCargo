import { BadgeCheck, Hash, ShieldAlert } from "lucide-react";
import { ROLE_LABELS } from "@/constants/app.constants";
import { getInitials } from "@/shared/utils/userUtils";

function Chip({ icon: Icon, children, className = "" }) {
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/15 ${className}`}>
            <Icon className="size-3.5" aria-hidden="true" />
            {children}
        </span>
    );
}

// The big banner at the top: avatar, name, role, and the account's headline status.
export default function ProfileHero({ profile }) {
    const isActive = profile.accountStatus === "ACTIVE";
    const isApproved = profile.approvalStatus === "APPROVED";

    return (
        <section className="relative overflow-hidden rounded-3xl bg-forest text-white shadow-lg shadow-forest/20">
            {/* decoration only */}
            <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full bg-gold/20 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-16 size-72 rounded-full bg-brand/60 blur-3xl" />
            <div
                aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.07]"
                style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "18px 18px" }}
            />

            <div className="relative flex flex-col items-center gap-6 p-6 text-center sm:flex-row sm:p-8 sm:text-left">
                <div
                    className="grid size-24 shrink-0 place-items-center rounded-full bg-gold text-3xl font-extrabold text-forest ring-4 ring-white/15 sm:size-28 sm:text-4xl"
                    aria-hidden="true"
                >
                    {getInitials(profile.fullName)}
                </div>

                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold tracking-widest text-gold">
                        {(ROLE_LABELS[profile.role] ?? profile.role ?? "").toUpperCase()}
                    </p>
                    <h2 className="mt-1 break-words text-2xl font-extrabold sm:text-3xl">{profile.fullName}</h2>
                    <p className="mt-1 break-all text-sm text-white/70">{profile.email}</p>

                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                        {profile.employeeNumber && <Chip icon={Hash} className="font-mono">{profile.employeeNumber}</Chip>}
                        <Chip icon={isActive ? BadgeCheck : ShieldAlert} className={isActive ? "" : "text-gold"}>
                            {isActive ? "Active account" : "Account suspended"}
                        </Chip>
                        {!isApproved && <Chip icon={ShieldAlert} className="text-gold">Awaiting approval</Chip>}
                    </div>
                </div>
            </div>
        </section>
    );
}
