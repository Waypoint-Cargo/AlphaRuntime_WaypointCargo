import { CheckCircle2 } from "lucide-react";

const LEVELS = [
    null,
    { label: "Weak", text: "text-error", bar: "bg-error" },
    { label: "Fair", text: "text-pending", bar: "bg-pending" },
    { label: "Good", text: "text-success", bar: "bg-success" },
    { label: "Strong", text: "text-success", bar: "bg-success" },
];

export default function PasswordStrength({ password = "" }) {
    if (!password) return null;

    const checks = [
        { label: "8+ characters", ok: password.length >= 8 },
        { label: "1 uppercase", ok: /[A-Z]/.test(password) },
        { label: "1 number", ok: /\d/.test(password) },
    ];

    // 1 point per passed check, plus 1 bonus point for a special character like ! or @
    const score = checks.filter((c) => c.ok).length + (/[^A-Za-z0-9]/.test(password) ? 1 : 0);
    const level = LEVELS[score];

    return (
        <div className="mt-2">
            <div className="grid grid-cols-4 gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                    <span key={i} className={`h-1 rounded-full ${level && i < score ? level.bar : "bg-divider"}`} />
                ))}
            </div>

            {level && <p className={`mt-1.5 text-xs font-medium ${level.text}`}>{level.label}</p>}

            <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                {checks.map(({ label, ok }) => (
                    <li key={label} className="flex items-center gap-1 text-xs text-ink-secondary">
                        <CheckCircle2 className={`size-3.5 ${ok ? "text-success" : "text-line"}`} />
                        {label}
                    </li>
                ))}
            </ul>
        </div>
    );
}