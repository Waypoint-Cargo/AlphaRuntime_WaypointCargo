export default function OrderTabs({ tabs, counts, active, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={active === t.id} className={`tab${active === t.id ? " active" : ""}`} onClick={() => onChange(t.id)}>
          {t.label}
          <span className="count">{counts[t.id]}</span>
        </button>
      ))}
    </div>
  );
}
