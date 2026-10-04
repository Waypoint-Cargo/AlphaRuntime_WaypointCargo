const Bar = ({ className = "" }) => <div className={`rounded-lg bg-muted ${className}`} />;

// Placeholder shaped like the loaded profile (hero + four cards) so the page doesn't jump.
export default function ProfileSkeleton() {
    return (
        <div className="animate-pulse" role="status" aria-label="Loading your profile">
            <div className="flex flex-col items-center gap-6 rounded-3xl border border-line bg-surface p-6 sm:flex-row sm:p-8">
                <div className="size-24 shrink-0 rounded-full bg-muted sm:size-28" />
                <div className="w-full flex-1 space-y-3">
                    <Bar className="mx-auto h-3 w-24 sm:mx-0" />
                    <Bar className="mx-auto h-7 w-3/4 sm:mx-0 sm:w-64" />
                    <Bar className="mx-auto h-4 w-1/2 sm:mx-0 sm:w-48" />
                </div>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
                {[0, 1, 2, 3].map((card) => (
                    <div key={card} className="rounded-2xl border border-line bg-surface p-5">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="size-9 rounded-xl bg-muted" />
                            <Bar className="h-4 w-32" />
                        </div>
                        <div className="space-y-4">
                            {[0, 1, 2, 3].map((row) => <Bar key={row} className="h-4 w-full" />)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
