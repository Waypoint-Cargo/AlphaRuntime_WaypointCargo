import { Activity, Building2, MapPin, Phone, Shield, User, Warehouse } from "lucide-react";
import { ROLE_LABELS } from "@/constants/app.constants";
import { formatDate, formatDateTime } from "@/shared/utils/dateUtils";
import { InfoList, InfoRow, ProfileCard, StatusPill } from "./ProfileCard";

const titleCase = (value) => (value ? value.charAt(0) + value.slice(1).toLowerCase() : "");

function PersonalInfo({ profile }) {
    return (
        <ProfileCard icon={User} title="Contact & Identity">
            <InfoList>
                <InfoRow label="Full name">{profile.fullName}</InfoRow>
                <InfoRow label="Email" copyValue={profile.email} breakAll>{profile.email}</InfoRow>
                <InfoRow label="Phone">
                    {profile.phone ? (
                        <span className="inline-flex items-center gap-1.5">
                            <Phone className="size-3.5 text-ink-secondary" aria-hidden="true" />
                            {profile.phone}
                        </span>
                    ) : "—"}
                </InfoRow>
                <InfoRow label="Employee number" copyValue={profile.employeeNumber ?? undefined}>
                    <span className="font-mono">{profile.employeeNumber ?? "—"}</span>
                </InfoRow>
            </InfoList>
        </ProfileCard>
    );
}

function RoleAndAccess({ profile }) {
    const isActive = profile.accountStatus === "ACTIVE";
    const isApproved = profile.approvalStatus === "APPROVED";

    return (
        <ProfileCard icon={Shield} title="Role & Access">
            <InfoList>
                <InfoRow label="Role"><StatusPill tone="brand">{ROLE_LABELS[profile.role] ?? profile.role}</StatusPill></InfoRow>
                <InfoRow label="Account status">
                    <StatusPill tone={isActive ? "success" : "error"}>{isActive ? "Active" : "Suspended"}</StatusPill>
                </InfoRow>
                <InfoRow label="Approval">
                    <StatusPill tone={isApproved ? "success" : "pending"}>{isApproved ? "Approved" : "Pending"}</StatusPill>
                </InfoRow>
                <InfoRow label="Approved on">{formatDate(profile.approvedAt)}</InfoRow>
            </InfoList>
        </ProfileCard>
    );
}

// Store managers belong to an outlet; dispatchers and loaders work out of depots. Show whatever
// the account has, and one friendly message when it has neither.
function WorkLocation({ outlet, depots }) {
    const hasOutlet = Boolean(outlet);
    const hasDepots = depots.length > 0;

    return (
        <ProfileCard icon={Building2} title="Work Location">
            {!hasOutlet && !hasDepots && (
                <p className="rounded-xl bg-muted px-4 py-6 text-center text-sm text-ink-secondary">
                    No outlet or depot has been assigned to your account yet.
                </p>
            )}

            {hasOutlet && (
                <div className="rounded-xl bg-muted p-4">
                    <p className="text-xs font-semibold tracking-widest text-ink-secondary">OUTLET</p>
                    <p className="mt-1 text-base font-bold text-forest">{outlet.name}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-md bg-surface px-2 py-1 font-mono font-semibold text-forest ring-1 ring-line">{outlet.code}</span>
                        <span className="rounded-md bg-gold/25 px-2 py-1 font-semibold text-forest">{titleCase(outlet.brand)}</span>
                        <span className="inline-flex items-center gap-1 text-ink-secondary">
                            <MapPin className="size-3.5" aria-hidden="true" />
                            {outlet.district}
                        </span>
                    </div>
                </div>
            )}

            {hasDepots && (
                <div className={hasOutlet ? "mt-4" : undefined}>
                    <p className="mb-2 text-xs font-semibold tracking-widest text-ink-secondary">DEPOTS</p>
                    <ul className="space-y-2">
                        {depots.map((depot) => (
                            <li key={depot.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
                                <Warehouse className="size-4 shrink-0 text-brand" aria-hidden="true" />
                                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-forest">{depot.name}</span>
                                <span className="font-mono text-xs text-ink-secondary">{depot.code}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </ProfileCard>
    );
}

function AccountActivity({ profile }) {
    return (
        <ProfileCard icon={Activity} title="Account Activity">
            <InfoList>
                <InfoRow label="Last sign-in">{formatDateTime(profile.lastLoginAt, "Never")}</InfoRow>
                <InfoRow label="Member since">{formatDate(profile.createdAt)}</InfoRow>
                <InfoRow label="Last updated">{formatDate(profile.updatedAt)}</InfoRow>
                <InfoRow label="Sign-in lock">
                    {profile.isLocked
                        ? <StatusPill tone="error">Locked until {formatDateTime(profile.lockedUntil)}</StatusPill>
                        : <StatusPill tone="success">Not locked</StatusPill>}
                </InfoRow>
            </InfoList>
        </ProfileCard>
    );
}

export default function ProfileSections({ profile }) {
    return (
        <div className="grid gap-5 lg:grid-cols-2">
            <PersonalInfo profile={profile} />
            <RoleAndAccess profile={profile} />
            <WorkLocation outlet={profile.outlet} depots={profile.depots ?? []} />
            <AccountActivity profile={profile} />
        </div>
    );
}
