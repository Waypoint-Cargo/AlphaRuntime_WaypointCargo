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

// "04 Oct 2026, 10:24 AM"
export function formatDateTime(value, fallback = "—") {
    const date = parse(value);
    if (!date) return fallback;

    // hourCycle (not hour12) so midnight is "12:05 AM" in every engine, not "00:05 AM"
    const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h12" });
    return `${formatDate(date)}, ${time.toUpperCase()}`;
}
