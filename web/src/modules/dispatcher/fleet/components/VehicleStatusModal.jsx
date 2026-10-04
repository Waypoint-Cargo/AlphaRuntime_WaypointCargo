import { useState } from "react";
import { getApiErrorMessage } from "@/shared/utils/apiError";
import { useUpdateVehicleStatusMutation } from "../fleetApi";
import { STATUS_HINTS, STATUS_LABELS, STATUS_TRANSITIONS } from "../fleetUtils";
import { inputClass } from "../vehicleStyles";
import ModalShell from "./ModalShell";
import { StatusBadge } from "./VehicleBadges";

const MAX_NOTE = 500;

// Moves a vehicle along the status workflow; only the moves the API allows are offered.
// onUpdated(message, vehicle)  - changed; close and show the message
// onStale(message)             - the vehicle was deleted elsewhere; close, refresh, show the message
export default function VehicleStatusModal({ vehicle, onClose, onUpdated, onStale }) {
  const [updateStatus, { isLoading }] = useUpdateVehicleStatusMutation();
  const options = STATUS_TRANSITIONS[vehicle.status] ?? [];

  const [status, setStatus] = useState("");
  const [note, setNote] = useState(vehicle.statusNote ?? "");
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    if (!status || isLoading) return;

    setError("");
    try {
      // always sent, so clearing the box clears the note
      const updated = await updateStatus({ id: vehicle.id, status, statusNote: note.trim() }).unwrap();
      onUpdated(`${vehicle.code} is now ${STATUS_LABELS[status]}.`, updated);
    } catch (err) {
      const message = getApiErrorMessage(err, "Unable to change the status. Please try again.");
      if (err?.status === 404) onStale(message);
      else setError(message); // 409 (not a valid move any more), 400 (deactivated), 429, network…
    }
  };

  return (
    <ModalShell
      id="vehicle-status" busy={isLoading} onClose={onClose} maxWidth={520}
      title="Change Status" description={`Update where ${vehicle.code} is in the delivery workflow.`}
    >
      <form onSubmit={submit}>
        <div className="modal-scroll">
          <div className="strip" style={{ marginBottom: 16 }}>
            <b>{vehicle.code}</b>
            <span>Currently</span>
            <StatusBadge vehicle={vehicle} size="sm" />
          </div>

          <fieldset disabled={isLoading}>
            <legend className="mb-2 text-xs font-bold text-gray-700">Move to</legend>
            <div className="space-y-2">
              {options.map((option) => (
                <label
                  key={option}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#FFC107] ${
                    status === option ? "border-[#FFC107] bg-yellow-50" : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio" name="status" value={option} checked={status === option}
                    onChange={() => setStatus(option)} className="mt-0.5 size-4 accent-[#053D31]"
                  />
                  <span>
                    <strong className="block text-gray-900">{STATUS_LABELS[option]}</strong>
                    <span className="text-xs text-gray-500">{STATUS_HINTS[option]}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label htmlFor="vehicle-status-note" className="mb-1.5 mt-4 block text-xs font-bold text-gray-700">Note (optional)</label>
          <textarea
            id="vehicle-status-note" rows={3} maxLength={MAX_NOTE} value={note} onChange={(e) => setNote(e.target.value)}
            disabled={isLoading} className={`${inputClass(false)} resize-y py-2`}
            placeholder={status === "MAINTENANCE" ? "What is being serviced?" : "Anything the next dispatcher should know"}
          />
          <p className="mt-1 text-xs text-gray-500">Shown on the vehicle. Clear it when it no longer applies.</p>

          {error && <p className="emp-alert" role="alert">{error}</p>}
        </div>

        <div className="modal-foot">
          <button type="button" className="btn" onClick={onClose} disabled={isLoading}>Cancel</button>
          <button type="submit" className="btn primary" disabled={!status || isLoading}>
            {isLoading ? "Updating…" : "Update Status"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
