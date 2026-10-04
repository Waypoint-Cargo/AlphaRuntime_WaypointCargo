// Stable avatar background for a person: the same name always gets the same colour.
export function getAvatarColor(seed) {
    let hash = 0;
    for (const char of String(seed ?? "")) {
        hash = char.charCodeAt(0) + ((hash << 5) - hash);
    }
    return `hsl(${Math.abs(hash) % 360}, 55%, 45%)`;
}

// "Tharindu Perera" -> "TP", "Madonna" -> "M"
export function getInitials(fullName, fallback = "?") {
    const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return fallback;

    const first = parts[0][0];
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return `${first}${last}`.toUpperCase();
}
