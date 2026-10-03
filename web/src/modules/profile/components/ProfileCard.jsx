import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

// Card with an icon tile + title, used for each section of the profile.
export function ProfileCard({ icon: Icon, title, children }) {
    return (
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm shadow-forest/5">
            <header className="mb-4 flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-muted text-brand">
                    <Icon className="size-[18px]" aria-hidden="true" />
                </span>
                <h2 className="text-base font-bold text-forest">{title}</h2>
            </header>
            {children}
        </section>
    );
}

// Label / value rows separated by hairlines.
export function InfoList({ children }) {
    return <dl className="divide-y divide-divider">{children}</dl>;
}

export function InfoRow({ label, children, copyValue, breakAll = false }) {
    return (
        <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <dt className="shrink-0 text-sm text-ink-secondary">{label}</dt>
            <dd className="flex min-w-0 items-center justify-end gap-2 text-right text-sm font-semibold text-forest">
                <span className={`min-w-0 ${breakAll ? "break-all" : "break-words"}`}>{children}</span>
                {copyValue && <CopyButton value={copyValue} label={`Copy ${label.toLowerCase()}`} />}
            </dd>
        </div>
    );
}

const TONES = {
    success: "bg-success-light text-success",
    error: "bg-error-light text-error",
    pending: "bg-pending-light text-pending",
    neutral: "bg-muted text-ink-secondary",
    brand: "bg-brand/10 text-brand",
};

export function StatusPill({ tone = "neutral", children }) {
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${TONES[tone]}`}>
            <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
            {children}
        </span>
    );
}

// Copies `value` to the clipboard and flips to a tick for a moment.
export function CopyButton({ value, label }) {
    const [copied, setCopied] = useState(false);
    const timer = useRef(null);

    useEffect(() => () => window.clearTimeout(timer.current), []);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => setCopied(false), 1600);
        } catch {
            // clipboard blocked (insecure origin / permissions) — nothing useful to show
        }
    };

    return (
        <button
            type="button" onClick={copy} aria-label={copied ? "Copied" : label} title={copied ? "Copied" : label}
            className={`grid size-7 shrink-0 place-items-center rounded-lg border transition ${
                copied
                    ? "border-success/30 bg-success-light text-success"
                    : "border-line text-ink-secondary hover:border-gold hover:text-forest"
            }`}
        >
            {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
        </button>
    );
}
