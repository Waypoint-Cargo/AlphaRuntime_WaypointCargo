import { useEffect, useMemo, useRef, useState } from "react";
import TopBar from "../../../shared/components/TopBar.jsx";
import Sidebar from "../../../shared/components/Sidebar.jsx";
import { useCreateOrderMutation } from "./ordersApi.js";

const TEMP_CLASSES = [
  { value: "AMBIENT", label: "Ambient" },
  { value: "CHILLED", label: "Chilled" },
  { value: "FROZEN", label: "Frozen" },
];

// Dates are evaluated in the depot's timezone, same as the backend cutoff logic.
const colomboDate = (offsetDays = 0) => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date(Date.now() + offsetDays * 86_400_000));

let rowKey = 0;
const blankItem = () => ({ key: ++rowKey, itemName: "", sku: "", unit: "EA", quantity: "", weightKg: "", volumeM3: "", notes: "" });

const round = (value, places) => Math.round(value * 10 ** places) / 10 ** places;

// Mirrors the Zod rules in backend orders.validator.js so mistakes are caught before the request.
function validate(form) {
  const errors = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.requestedDeliveryDate)) errors.push("Choose a delivery date.");
  else if (form.requestedDeliveryDate < colomboDate()) errors.push("The delivery date cannot be in the past.");
  if (form.specialInstructions.length > 500) errors.push("Special instructions must be 500 characters or fewer.");
  form.items.forEach((item, index) => {
    const line = `Item ${index + 1}`;
    const quantity = Number(item.quantity);
    const weight = Number(item.weightKg);
    const volume = Number(item.volumeM3);
    if (!item.itemName.trim()) errors.push(`${line}: enter an item name.`);
    if (item.itemName.trim().length > 120) errors.push(`${line}: item name must be 120 characters or fewer.`);
    if (item.sku.trim().length > 40) errors.push(`${line}: SKU must be 40 characters or fewer.`);
    if (!item.unit.trim() || item.unit.trim().length > 20) errors.push(`${line}: unit must be 1-20 characters.`);
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 100000) errors.push(`${line}: quantity must be a whole number between 1 and 100000.`);
    if (!(weight > 0) || weight > 20000) errors.push(`${line}: weight must be greater than 0 and at most 20000 kg.`);
    if (!(volume > 0) || volume > 100) errors.push(`${line}: volume must be greater than 0 and at most 100 m³.`);
    if (item.notes.trim().length > 300) errors.push(`${line}: notes must be 300 characters or fewer.`);
  });
  return errors;
}

export default function CreateOrderPage() {
  const [form, setForm] = useState(() => ({
    tempClass: "AMBIENT",
    requestedDeliveryDate: colomboDate(1),
    specialInstructions: "",
    isFragile: false,
    isHighValue: false,
    submit: true,
    items: [blankItem()],
  }));
  const [errors, setErrors] = useState([]);
  const [toast, setToast] = useState("");
  const redirectTimer = useRef(null);
  const [createOrder, { isLoading }] = useCreateOrderMutation();

  useEffect(() => () => window.clearTimeout(redirectTimer.current), []);

  const setField = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));
  const setItem = (key, field, value) => setForm((current) => ({
    ...current,
    items: current.items.map((item) => (item.key === key ? { ...item, [field]: value } : item)),
  }));
  const addItem = () => setForm((current) => ({ ...current, items: [...current.items, blankItem()] }));
  const removeItem = (key) => setForm((current) => ({
    ...current,
    items: current.items.length > 1 ? current.items.filter((item) => item.key !== key) : current.items,
  }));

  const totals = useMemo(() => form.items.reduce((sum, item) => ({
    units: sum.units + (Number(item.quantity) > 0 ? Number(item.quantity) : 0),
    weight: sum.weight + (Number(item.weightKg) > 0 ? Number(item.weightKg) : 0),
    volume: sum.volume + (Number(item.volumeM3) > 0 ? Number(item.volumeM3) : 0),
  }), { units: 0, weight: 0, volume: 0 }), [form.items]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const problems = validate(form);
    setErrors(problems);
    if (problems.length) return;

    const payload = {
      tempClass: form.tempClass,
      requestedDeliveryDate: form.requestedDeliveryDate,
      isFragile: form.isFragile,
      isHighValue: form.isHighValue,
      submit: form.submit,
      ...(form.specialInstructions.trim() ? { specialInstructions: form.specialInstructions.trim() } : {}),
      items: form.items.map((item) => ({
        itemName: item.itemName.trim(),
        unit: item.unit.trim(),
        quantity: Number(item.quantity),
        weightKg: Number(item.weightKg),
        volumeM3: Number(item.volumeM3),
        ...(item.sku.trim() ? { sku: item.sku.trim() } : {}),
        ...(item.notes.trim() ? { notes: item.notes.trim() } : {}),
      })),
    };

    try {
      const response = await createOrder(payload).unwrap();
      const reference = response?.data?.reference ?? "Order";
      setToast(`${reference} created${form.submit ? " and sent for review" : " as a draft"}.`);
      redirectTimer.current = window.setTimeout(() => { window.location.hash = "orders"; }, 900);
    } catch (error) {
      const details = Array.isArray(error?.data?.details) ? error.data.details.map((detail) => (detail.field ? `${detail.field}: ${detail.message}` : detail.message)) : [];
      setErrors([error?.data?.message || "Unable to create the order right now.", ...details]);
    }
  };

  return (
    <div className="app">
      <TopBar initials="AR" />
      <Sidebar active="create" />
      <main className="workspace">
        <form className="main-col" onSubmit={handleSubmit} noValidate>
          <h1>Create Order</h1>
          <p className="subtitle">Enter the delivery details and items. The order then appears under Pending Review for confirmation.</p>

          {errors.length > 0 && (
            <div className="co-errors" role="alert">
              <strong>Please fix the following:</strong>
              <ul>{errors.map((message) => <li key={message}>{message}</li>)}</ul>
            </div>
          )}

          <section className="card co-card">
            <h3>Delivery details</h3>
            <div className="co-grid">
              <label className="co-field">
                <span>Delivery date</span>
                <input type="date" min={colomboDate()} value={form.requestedDeliveryDate} onChange={(event) => setField("requestedDeliveryDate")(event.target.value)} />
              </label>
              <label className="co-field">
                <span>Temperature class</span>
                <select value={form.tempClass} onChange={(event) => setField("tempClass")(event.target.value)}>
                  {TEMP_CLASSES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>
            <label className="co-field">
              <span>Special instructions <small>(optional)</small></span>
              <textarea rows={3} maxLength={500} value={form.specialInstructions} onChange={(event) => setField("specialInstructions")(event.target.value)} placeholder="e.g. Deliver to the rear loading dock" />
            </label>
            <div className="co-toggles">
              <label><input type="checkbox" checked={form.isFragile} onChange={(event) => setField("isFragile")(event.target.checked)} /> Fragile</label>
              <label><input type="checkbox" checked={form.isHighValue} onChange={(event) => setField("isHighValue")(event.target.checked)} /> High value</label>
            </div>
          </section>

          <section className="card co-card">
            <div className="co-card-head">
              <h3>Items</h3>
              <button type="button" className="btn" onClick={addItem}>+ Add item</button>
            </div>
            <div className="co-items">
              <div className="co-item head">
                <span>Item name</span><span>SKU</span><span>Unit</span><span>Qty</span><span>Weight (kg)</span><span>Volume (m³)</span><span>Notes</span><span />
              </div>
              {form.items.map((item, index) => (
                <div className="co-item" key={item.key}>
                  <input aria-label={`Item ${index + 1} name`} value={item.itemName} onChange={(event) => setItem(item.key, "itemName", event.target.value)} placeholder="Item name" />
                  <input aria-label={`Item ${index + 1} SKU`} value={item.sku} onChange={(event) => setItem(item.key, "sku", event.target.value)} placeholder="SKU" />
                  <input aria-label={`Item ${index + 1} unit`} value={item.unit} onChange={(event) => setItem(item.key, "unit", event.target.value)} />
                  <input aria-label={`Item ${index + 1} quantity`} type="number" min="1" step="1" value={item.quantity} onChange={(event) => setItem(item.key, "quantity", event.target.value)} />
                  <input aria-label={`Item ${index + 1} weight`} type="number" min="0" step="0.01" value={item.weightKg} onChange={(event) => setItem(item.key, "weightKg", event.target.value)} />
                  <input aria-label={`Item ${index + 1} volume`} type="number" min="0" step="0.001" value={item.volumeM3} onChange={(event) => setItem(item.key, "volumeM3", event.target.value)} />
                  <input aria-label={`Item ${index + 1} notes`} value={item.notes} onChange={(event) => setItem(item.key, "notes", event.target.value)} placeholder="Notes" />
                  <button type="button" className="co-remove" aria-label={`Remove item ${index + 1}`} onClick={() => removeItem(item.key)} disabled={form.items.length === 1}>×</button>
                </div>
              ))}
            </div>
          </section>
        </form>

        <aside className="card detail" aria-label="Order summary">
          <header className="detail-head">
            <div className="detail-title"><h2>New order</h2></div>
            <p className="meta">Totals update as you add items.</p>
          </header>
          <div className="detail-body">
            <dl className="summary">
              <div><dt>Delivery date</dt><dd>{form.requestedDeliveryDate || "—"}</dd></div>
              <div><dt>Temperature class</dt><dd>{TEMP_CLASSES.find((option) => option.value === form.tempClass)?.label}</dd></div>
              <div><dt>Line items</dt><dd>{form.items.length}</dd></div>
              <div><dt>Total units</dt><dd>{totals.units}</dd></div>
              <div><dt>Total weight</dt><dd>{round(totals.weight, 2)} kg</dd></div>
              <div><dt>Total volume</dt><dd>{round(totals.volume, 3)} m³</dd></div>
            </dl>
            <label className="co-submit-toggle">
              <input type="checkbox" checked={form.submit} onChange={(event) => setField("submit")(event.target.checked)} />
              <span>
                <b>Send for review immediately</b>
                <small>{form.submit ? "The order goes straight to Pending Review." : "The order is saved as a draft."}</small>
              </span>
            </label>
          </div>
          <div className="detail-actions">
            <button type="button" className="btn primary" onClick={handleSubmit} disabled={isLoading || Boolean(toast)}>
              {isLoading ? "Creating…" : form.submit ? "Create & submit order" : "Save as draft"}
            </button>
            <a className="btn co-link" href="#orders">Cancel</a>
          </div>
        </aside>
      </main>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
