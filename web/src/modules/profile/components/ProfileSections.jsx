import { Activity, Building2, Phone, Shield, User, Warehouse } from "lucide-react";
import { ROLE_LABELS } from "@/constants/app.constants";
import { formatDate, formatDateTime } from "@/shared/utils/dateUtils";
import { InfoList, InfoRow, ProfileCard, StatusPill } from "./ProfileCard";

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

// Dispatchers and loaders work out of depots; show them, or one friendly message when there are none.
function WorkLocation({ depots }) {
    const hasDepots = depots.length > 0;

    return (
        <ProfileCard icon={Building2} title="Work Location">
            {!hasDepots && (
                <p className="rounded-xl bg-muted px-4 py-6 text-center text-sm text-ink-secondary">
                    No depot has been assigned to your account yet.
                </p>
            )}

            {hasDepots && (
                <div>
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
            <WorkLocation depots={profile.depots ?? []} />
            <AccountActivity profile={profile} />
        </div>
    );
}
