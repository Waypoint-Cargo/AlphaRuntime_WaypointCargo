import { AlertCircle, Info, RefreshCw } from "lucide-react";
import { getApiErrorMessage } from "@/shared/utils/apiError";
import { useGetMyProfileQuery } from "../api/profileApi";
import ProfileHero from "../components/ProfileHero";
import ProfileSections from "../components/ProfileSections";
import ProfileSkeleton from "../components/ProfileSkeleton";

// "My Profile" for the signed-in user (GET /users/me). Shell-agnostic: the Dispatcher and the
// Store Manager each render this inside their own sidebar/header layout.
export default function UserProfile() {
    const { data: profile, isLoading, isFetching, error, refetch } = useGetMyProfileQuery(undefined, {
        refetchOnMountOrArgChange: true,
    });

    return (
        <div className="mx-auto w-full max-w-5xl pb-8" aria-busy={isLoading}>
            <h1>My Profile</h1>
            <p className="subtitle">Your account details and access in Waypoint Cargo.</p>

            {isLoading && <ProfileSkeleton />}

            {/* keep showing the last good profile if only a background refresh failed */}
            {!isLoading && !profile && (
                <div role="alert" className="flex flex-col items-center rounded-2xl border border-line bg-surface px-6 py-14 text-center">
                    <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-error-light text-error">
                        <AlertCircle className="size-7" aria-hidden="true" />
                    </span>
                    <h2 className="text-lg font-bold text-forest">We couldn’t load your profile</h2>
                    <p className="mt-1 max-w-md text-sm text-ink-secondary">
                        {getApiErrorMessage(error, "Something went wrong while loading your profile. Please try again.")}
                    </p>
                    <button
                        type="button" onClick={refetch} disabled={isFetching}
                        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-125 disabled:opacity-60"
                    >
                        <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
                        Try again
                    </button>
                </div>
            )}

            {profile && (
                <div className="space-y-5">
                    <ProfileHero profile={profile} />
                    <ProfileSections profile={profile} />
                    <p className="flex items-center justify-center gap-2 text-center text-xs text-ink-secondary">
                        <Info className="size-3.5 shrink-0" aria-hidden="true" />
                        These details are read-only for now.
                    </p>
                </div>
            )}
        </div>
    );
}
