export const inputClasses =
    "w-full rounded-xl border border-line bg-surface py-3 pl-11 pr-4 text-sm text-forest " +
    "placeholder:text-ink-secondary/70 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30";

export default function IconInput({ icon: Icon, error, className = "", children, ...props }) {
    return (
        <div className="relative">
            {Icon && (
                <Icon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-secondary" />
            )}
            <input
                {...props}
                aria-invalid={!!error}
                className={`${inputClasses} ${error ? "border-error" : ""} ${className}`}
            />
            {children}
        </div>
    );
}