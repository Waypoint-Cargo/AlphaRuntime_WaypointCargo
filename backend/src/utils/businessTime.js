// Business time helpers for Asia/Colombo (UTC+05:30, no daylight saving).
// Pure: built-in Date only, no Prisma, no I/O.
//
// Calendar dates travel through the backend as "YYYY-MM-DD" strings; a Prisma @db.Date value is a
// Date at UTC midnight (convert with toYmd / fromYmd).

const COLOMBO_OFFSET_MIN = 330;
const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

const pad = (value) => String(value).padStart(2, "0");

// the instant shifted so that its UTC fields read as Colombo wall-clock fields
const asColomboWallClock = (now) => new Date(now.getTime() + COLOMBO_OFFSET_MIN * MS_PER_MINUTE);

// ---- calendar dates ----

export const isValidYmd = (text) => {
    if (typeof text !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
    const date = new Date(`${text}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
};

// "YYYY-MM-DD" -> Date at UTC midnight
export const fromYmd = (text) => {
    if (!isValidYmd(text)) throw new RangeError(`'${text}' is not a YYYY-MM-DD date`);
    return new Date(`${text}T00:00:00Z`);
};

// Date at UTC midnight (a @db.Date value) -> "YYYY-MM-DD"
export const toYmd = (date) => date.toISOString().slice(0, 10);

export const addDays = (text, days) => toYmd(new Date(fromYmd(text).getTime() + days * MS_PER_DAY));

// number of days between two dates (to - from)
export const diffDays = (from, to) => Math.round((fromYmd(to).getTime() - fromYmd(from).getTime()) / MS_PER_DAY);

// Monday of the ISO week that contains the date (accepts "YYYY-MM-DD" or a UTC-midnight Date)
export const mondayOf = (date) => {
    const day = typeof date === "string" ? fromYmd(date) : fromYmd(toYmd(date));
    const weekday = (day.getUTCDay() + 6) % 7; // Monday = 0
    return toYmd(new Date(day.getTime() - weekday * MS_PER_DAY));
};

// ---- business clock ----

// today's date in Asia/Colombo
export const todayBusinessDate = (now = new Date()) => toYmd(asColomboWallClock(now));

// minutes after midnight in Asia/Colombo
export const businessMinutesOfDay = (now = new Date()) => {
    const wallClock = asColomboWallClock(now);
    return wallClock.getUTCHours() * 60 + wallClock.getUTCMinutes();
};

export const minutesToHHMM = (minutes) => {
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1439) {
        throw new RangeError(`${minutes} is not a minute of the day`);
    }
    return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
};

export const hhmmToMinutes = (text) => {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(text ?? "");
    if (!match) throw new RangeError(`'${text}' is not an HH:MM time`);
    return Number(match[1]) * 60 + Number(match[2]);
};

// the UTC instant of a local Asia/Colombo time on a calendar date
export const toUtcInstant = (date, hhmm) => {
    const localMidnightUtc = fromYmd(date).getTime();
    return new Date(localMidnightUtc + (hhmmToMinutes(hhmm) - COLOMBO_OFFSET_MIN) * MS_PER_MINUTE);
};

// ---- device clocks ----

// a device clock may run a little ahead; anything further ahead than this is replaced by the server time
const FUTURE_TOLERANCE_MS = 5 * 60_000;

// The moment a device reports (a Date), corrected by clockOffsetMs (milliseconds to add to the device's
// clock to get server time). Never more than five minutes ahead of `now`.
export const deviceInstant = (recordedAt, { clockOffsetMs, now = new Date() } = {}) => {
    const instant = new Date(recordedAt.getTime() + (clockOffsetMs ?? 0));
    return instant.getTime() - now.getTime() > FUTURE_TOLERANCE_MS ? now : instant;
};
