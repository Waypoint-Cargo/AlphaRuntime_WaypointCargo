import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import Badge from "./Badge";
import { ISSUE_STATUSES } from "../constants";

const ICON_TONES = {
    error: "bg-error-light text-error",
    pending: "bg-pending-light text-pending",
    success: "bg-success-light text-success",
};

export default function RecentIssues({ issues }) {
    return (
        <section className="rounded-2xl border border-line bg-surface p-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-forest">Recent Issues</h2>
                    <p className="text-sm text-ink-secondary">Problems reported on your store's deliveries</p>
                </div>
                <Link
                    to="/store/report-issue"
                    className="flex items-center gap-1 text-sm font-semibold text-forest hover:underline"
                >
                    View all
                    <ChevronRight className="size-4" />
                </Link>
            </div>

            <ul className="mt-4 divide-y divide-divider">
                {issues.map((issue) => {
                    const status = ISSUE_STATUSES[issue.status];
                    const Icon = status.icon;
                    return (
                        <li key={issue.id} className="flex items-center gap-4 py-4">
                            <div
                                className={`grid size-11 shrink-0 place-items-center rounded-full ${ICON_TONES[status.tone]}`}
                            >
                                <Icon className="size-5" />
                            </div>

                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-forest">
                                    {issue.order} · {issue.title}
                                </p>
                                <p className="truncate text-sm text-ink-secondary">{issue.description}</p>
                            </div>

                            <span className="hidden text-sm text-ink-secondary sm:block">{issue.time}</span>
                            <Badge tone={status.tone} dot>
                                {status.label}
                            </Badge>
                            <ChevronRight className="hidden size-5 text-forest sm:block" />
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}