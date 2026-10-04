import { ChevronDownIcon } from "./Icons.jsx";

function Select({ value, onChange, options, label }) {
  return (
    <label className="select">
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDownIcon className="select-caret" />
    </label>
  );
}

export default function Filters({ filters, setFilters, outlets, couriers, types }) {
  const set = (k) => (v) => setFilters((f) => ({ ...f, [k]: v }));
  return (
    <div className="filters">
      <input className="search" type="search" placeholder="Search orders…" value={filters.query} onChange={(e) => set("query")(e.target.value)} aria-label="Search orders" />
      <Select label="Outlet" value={filters.outlet} onChange={set("outlet")} options={["All Outlets", ...outlets]} />
      <Select label="Order type" value={filters.type} onChange={set("type")} options={["All Order Types", ...types]} />
      <Select label="Courier" value={filters.courier} onChange={set("courier")} options={["All Couriers", ...couriers]} />
      <div className="date-chip">Today, 29 Sep 2026</div>
    </div>
  );
}
