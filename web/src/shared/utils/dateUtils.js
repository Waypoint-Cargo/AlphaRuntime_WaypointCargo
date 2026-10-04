const parse = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

// "04 Oct 2026"
export function formatDate(value, fallback = "—") {
    const date = parse(value);
    if (!date) return fallback;
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// "just now", "5 minutes ago", "3 days ago", "2 months ago"
export function formatTimeAgo(value, fallback = "—") {
    const date = parse(value);
    if (!date) return fallback;

    const seconds = Math.round((Date.now() - date.getTime()) / 1000);
    if (seconds < 45) return "just now";

    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    const units = [
        ["year", 31_536_000],
        ["month", 2_592_000],
        ["day", 86_400],
        ["hour", 3_600],
        ["minute", 60],
    ];
    const [unit, size] = units.find(([, size]) => seconds >= size) ?? units[units.length - 1];
    return rtf.format(-Math.round(seconds / size), unit);
}

// "04 Oct 2026, 10:24 AM"
export function formatDateTime(value, fallback = "—") {
    const date = parse(value);
    if (!date) return fallback;

    // hourCycle (not hour12) so midnight is "12:05 AM" in every engine, not "00:05 AM"
    const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h12" });
    return `${formatDate(date)}, ${time.toUpperCase()}`;
}
