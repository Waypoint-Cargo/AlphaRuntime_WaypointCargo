// Label + control + message for the Fleet dialogs. A validation error replaces the hint.
export default function FormField({ label, htmlFor, error, hint, className = "", children }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-bold text-gray-700">{label}</label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-1 text-xs text-red-600" role="alert">{error}</p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="mt-1 text-xs text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}
