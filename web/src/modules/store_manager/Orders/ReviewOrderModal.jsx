import { useEffect, useRef, useState } from "react";
import { ORIGIN, CUTOFF } from "../../../store/orders.js";
import { CHECKS, buildScanResult } from "./scan.js";
import { CheckIcon } from "./Icons.jsx";
import { useLazyGetOrderChecksQuery } from "./ordersApi.js";

const STAGES = ["Pending Review", "Confirmed", "Planned", "Loaded", "In Transit", "Delivered"];
const STEP_MS = 280;

function CheckRow({ label, state, value }) {
  return (
    <li className={`fc-row ${state}`}>
      <span className="fc-icon">
        {state === "pass" && <CheckIcon />}
        {state === "warn" && "!"}
        {state === "fail" && "×"}
        {state === "active" && <i className="spin" />}
      </span>
      <span className="fc-name">{label}</span>
      <span className="fc-val">{value}</span>
    </li>
  );
}

export default function ReviewOrderModal({ order, now, busy = false, onClose, onConfirm, onDefer }) {
  // idle -> loading (waiting on the API) -> scanning (rows revealed one by one) -> done
  const [phase, setPhase] = useState("idle");
  const [revealed, setRevealed] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const closeRef = useRef(null);
  const [fetchChecks] = useLazyGetOrderChecksQuery();

  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = previousOverflow; };
  }, [onClose]);

  useEffect(() => {
    if (phase !== "scanning") return undefined;
    const id = setInterval(() => setRevealed((count) => {
      const next = Math.min(count + 1, CHECKS.length);
      if (next >= CHECKS.length) setPhase("done");
      return next;
    }), STEP_MS);
    return () => clearInterval(id);
  }, [phase]);

  const startScan = async () => {
    if (phase === "loading" || phase === "scanning") return;
    setError("");
    setResult(null);
    setRevealed(0);
    setPhase("loading");
    try {
      const response = await fetchChecks(order.raw?.id ?? order.uid).unwrap();
      setResult(buildScanResult(order, response));
      setPhase("scanning");
    } catch (err) {
      setPhase("idle");
      setError(err?.data?.message || "Unable to run the availability scan right now.");
    }
  };

  const scanning = phase === "loading" || phase === "scanning";
  const scanned = phase === "scanning" || phase === "done";
  const done = phase === "done";
  const ok = done && result.ok;
  const attention = done && !result.ok;
  const tone = ok ? "pass" : attention ? "warn" : "idle";
  const rowState = (index) => {
    if (phase === "loading") return index === 0 ? "active" : "idle";
    if (!scanned) return "idle";
    if (index < revealed) return result.checks[index].state;
    if (phase === "scanning" && index === revealed) return "active";
    return "idle";
  };
  const rowValue = (index) => {
    const state = rowState(index);
    if (state === "pass" || state === "warn" || state === "fail") return result.checks[index].value;
    return state === "active" ? "Checking..." : "Pending";
  };
  const groupState = (indexes) => {
    const states = indexes.map(rowState);
    if (states.includes("active")) return "active";
    if (states.includes("idle")) return "idle";
    if (states.includes("fail")) return "fail";
    if (states.includes("warn")) return "warn";
    return "pass";
  };
  const stockShown = scanned && revealed >= 1;
  const stockWarn = stockShown && result.shortages.length > 0;
  const missingUnits = stockWarn ? result.shortages.reduce((total, shortage) => total + shortage.missing, 0) : 0;
  const cutoffShown = scanned && revealed >= CHECKS.length;
  const cutoffRow = cutoffShown ? result.checks[CHECKS.length - 1] : null;
  const badge = !scanned && !scanning ? ["SCAN REQUIRED", "idle"] : !done ? ["SCANNING...", "idle"] : ok ? ["READY TO CONFIRM", "pass"] : ["ATTENTION REQUIRED", "warn"];

  let proceedTitle = "Run the availability scan";
  let proceedText = "Scan stock, capacity and cutoff first. The order can only be confirmed once the checks have run and none have failed.";
  if (error) proceedText = error;
  if (scanning) { proceedTitle = "Scanning..."; proceedText = "Checking availability for this order."; }
  if (ok) {
    proceedTitle = "Proceed for Order planning";
    proceedText = result.rollover
      ? "This order is past today's cutoff. Confirming will move delivery to the next operating day."
      : "Order can be confirmed for dispatcher planning.";
  }
  if (attention) {
    const messages = [];
    const failed = result.checks.filter((check) => check.state === "fail").map((check) => check.label.toLowerCase());
    if (result.shortages.length) messages.push("Resolve the stock shortage before confirming.");
    if (failed.length) messages.push(`Failed checks: ${failed.join(", ")}.`);
    if (!messages.length) messages.push("Resolve the flagged checks before confirming.");
    proceedTitle = "Attention required";
    proceedText = `${messages.join(" ")} The order is not ready for dispatcher planning.`;
  }

  return (
    <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="ro-title">
        <header className="modal-head">
          <div><h2 id="ro-title">Review Order</h2><p>Review the order details and confirm that it is ready for dispatcher planning.</p></div>
          <div className="modal-head-right"><strong>{order.id}</strong><span className="badge pending">Pending Review</span><button ref={closeRef} className="x-btn" onClick={onClose} aria-label="Close">X</button></div>
        </header>
        <div className="modal-scroll">
          <div className="strip"><b>{order.id}</b><span>{ORIGIN} -&gt; {order.destination}</span><span className="muted">Created {order.created}</span><span>{order.items} items</span><span>{order.weight} kg</span><span>{order.volume} m3</span><span className="muted">Delivery: {order.date} - {order.window}</span></div>
          <div className="stages">{STAGES.map((stage, index) => <span key={stage} className={`stage${index === 0 ? " on" : ""}`}>{stage}</span>)}</div>
          <div className="modal-grid">
            <div className="col">
              <section className="box"><h4>Order Details</h4><div className="kv3">
                <div><small>Outlet</small><b>{order.outlet}</b></div><div><small>Delivery Date</small><b>{order.date}</b></div><div><small>Delivery Window</small><b>{order.window}</b></div><div><small>Order Type</small><b>{order.type}</b></div><div><small>Order Reference</small><b>{order.id}</b></div><div><small>Created</small><b>{order.created}</b></div>
              </div></section>
              <section className="box"><div className="box-title"><h4>Products</h4><span className="muted">{done ? (result.shortages.length ? `${result.shortages.length} product line(s) short on stock` : "All product quantities available") : "Stock not checked yet"}</span></div>
                <div className={`banner ${stockShown ? (stockWarn ? "warn" : "pass") : "idle"}`}>{!stockShown && (scanning ? "Checking stock levels..." : "Run the availability scan to check stock for each product.")}{stockShown && !stockWarn && "All requested quantities are currently available."}{stockWarn && `${missingUnits} units unavailable - ${result.shortages.map((shortage) => `${shortage.name} requested ${shortage.requested}, available ${shortage.available}`).join("; ")}. This order is not fully ready.`}</div>
                <table className="ptable"><thead><tr><th>Product</th><th>Requested</th><th>Available</th><th>Unit</th><th>Weight</th><th className="st">Status</th></tr></thead><tbody>{(result?.products ?? order.products).map((product, index) => { const short = stockShown && (product.inStock === false || product.available < product.requested); const weight = order.products[index]?.weight; return <tr key={`${product.name}-${index}`}><td>{product.name}</td><td>{product.requested}</td><td className={short ? "amber" : ""}>{stockShown ? product.available : "-"}</td><td>{product.unit}</td><td>{weight ?? product.weight ?? 0} kg</td><td className={`st ${!stockShown ? "muted" : short ? "amber" : "green"}`}>{!stockShown ? "-" : product.inStock === false ? "Not stocked" : short ? "Limited" : "Available"}</td></tr>; })}</tbody></table>
              </section>
              <section className="box"><h4>Outlet Requirements</h4><div className="kv3"><div><small>Vehicle restriction</small><b>{order.requirements.vehicle}</b></div><div><small>Loading</small><b>{order.requirements.loading}</b></div><div><small>Refrigeration</small><b>{order.requirements.refrigeration}</b></div></div></section>
              <section className={`proceed ${tone}`}><div><h4>{proceedTitle}</h4><p>{proceedText}</p></div><div className="actions"><button className="btn" onClick={startScan} disabled={scanning || busy}>{scanning ? "Scanning..." : done ? "Scan Again" : "Availability Scan"}</button><button className="btn" onClick={() => onDefer(order)} disabled={scanning || busy}>Save as Deferred</button><button className="btn confirm" onClick={() => onConfirm(order)} disabled={!ok || busy}>{busy ? "Updating..." : "Confirm Order"}</button></div></section>
            </div>
            <div className="col side"><section className={`box fc ${tone}`}><div className="box-title"><h4>Fulfillment Check</h4><span className={`pill ${badge[1]}`}>{badge[0]}</span></div><ul className="fc-list">{CHECKS.map((check, index) => <CheckRow key={check.id} label={check.label} state={rowState(index)} value={rowValue(index)} />)}</ul></section>
              <section className="box"><h4>Resource Capacity</h4><div className="kv2"><div><small>Weight</small><b>{order.weight} kg</b></div><div><small>Volume</small><b>{order.volume} m3</b></div><div><small>Required vehicle</small><b>{order.vehicleType}</b></div><div><small>Refrigeration</small><b>{order.requirements.refrigeration}</b></div></div>{[["Compatible vehicles available", [3]], ["Weight and volume within capacity", [1, 2]]].map(([text, indexes]) => { const state = groupState(indexes); return <p key={text} className={`cap ${state}`}>{state === "pass" ? "OK" : state === "warn" || state === "fail" ? "!" : "-"} {text}</p>; })}</section>
              <section className={`cutoff ${cutoffShown ? (cutoffRow.state === "pass" ? "pass" : "warn") : "idle"}`}><h5>Order Cutoff</h5><p className="big">{CUTOFF.label}</p><p className="note">Orders placed before the cutoff time will be processed for the same day.</p><p className="now">Current time {now.label}{cutoffShown && (cutoffRow.state === "pass" ? " - Within cutoff" : " - Not within cutoff")}</p></section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
