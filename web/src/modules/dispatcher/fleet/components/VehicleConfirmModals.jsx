import { useState } from "react";
import { getApiErrorMessage } from "@/shared/utils/apiError";
import { useDeleteVehicleMutation, useUpdateVehicleMutation } from "../fleetApi";
import { isCommitted } from "../fleetUtils";
import ModalShell from "./ModalShell";
import { VehicleTypeLabel } from "./VehicleBadges";

function VehicleStrip({ vehicle }) {
  return (
    <div className="strip">
      <b>{vehicle.code}</b>
      <VehicleTypeLabel type={vehicle.type} />
      <span>{vehicle.homeDepot?.name ?? "No depot"}</span>
    </div>
  );
}

// Deactivating hides a vehicle from planning but keeps its history; reactivating brings it back.
// onDone(message, vehicle) - changed; close and show the message
// onStale(message)         - the vehicle was deleted elsewhere; close, refresh, show the message
export function ToggleActiveModal({ vehicle, onClose, onDone, onStale }) {
  const [updateVehicle, { isLoading }] = useUpdateVehicleMutation();
  const [error, setError] = useState("");

  const reactivating = !vehicle.isActive;

  const confirm = async () => {
    setError("");
    try {
      const updated = await updateVehicle({ id: vehicle.id, isActive: reactivating }).unwrap();
      onDone(reactivating ? `${vehicle.code} was reactivated.` : `${vehicle.code} was deactivated.`, updated);
    } catch (err) {
      const message = getApiErrorMessage(err, "Unable to update this vehicle. Please try again.");
      if (err?.status === 404) onStale(message);
      else setError(message); // 409 (assigned / on route), 429, network…
    }
  };

  return (
    <ModalShell
      id="vehicle-active" role="alertdialog" busy={isLoading} onClose={onClose} maxWidth={480}
      title={reactivating ? "Reactivate Vehicle" : "Deactivate Vehicle"}
      description={
        reactivating
          ? "The vehicle returns to the fleet with the status it had, and can be assigned to deliveries again."
          : "The vehicle is taken out of service and no longer counted in the fleet. Its history is kept, and you can reactivate it later."
      }
    >
      <div className="modal-scroll" style={{ paddingBottom: 20 }}>
        <VehicleStrip vehicle={vehicle} />
        {error && <p className="emp-alert" role="alert">{error}</p>}
      </div>

      <div className="modal-foot">
        <button type="button" className="btn" onClick={onClose} disabled={isLoading}>Cancel</button>
        <button
          type="button" autoFocus onClick={confirm} disabled={isLoading}
          className={reactivating ? "btn primary" : "btn danger-solid"}
        >
          {isLoading ? "Saving…" : reactivating ? "Reactivate Vehicle" : "Deactivate Vehicle"}
        </button>
      </div>
    </ModalShell>
  );
}

// Permanent. Vehicles with trips or fuel logs on record can't be deleted — the API says so (409),
// and the dialog then offers to deactivate instead.
// onDeleted(message)       - deleted; close and show the message
// onStale(message)         - already deleted elsewhere; close, refresh, show the message
// onDeactivateInstead()    - switch to the deactivate dialog
export function DeleteVehicleModal({ vehicle, onClose, onDeleted, onStale, onDeactivateInstead }) {
  const [deleteVehicle, { isLoading }] = useDeleteVehicleMutation();
  const [error, setError] = useState("");
  const [blockedByHistory, setBlockedByHistory] = useState(false);

  const confirm = async () => {
    setError("");
    try {
      await deleteVehicle({ id: vehicle.id }).unwrap();
      onDeleted(`${vehicle.code} was deleted.`);
    } catch (err) {
      const message = getApiErrorMessage(err, "Unable to delete this vehicle. Please try again.");
      if (err?.status === 404) {
        onStale(message);
        return;
      }
      setBlockedByHistory(err?.status === 409 && /deactivate/i.test(message) && vehicle.isActive && !isCommitted(vehicle));
      setError(message);
    }
  };

  return (
    <ModalShell
      id="vehicle-delete" role="alertdialog" busy={isLoading} onClose={onClose} maxWidth={480}
      title="Delete Vehicle"
      description="This permanently deletes the vehicle. This cannot be undone."
    >
      <div className="modal-scroll" style={{ paddingBottom: 20 }}>
        <VehicleStrip vehicle={vehicle} />
        <p className="banner idle">
          Vehicles with trips or fuel logs on record can’t be deleted — deactivate them instead to keep the history.
        </p>
        {error && <p className="emp-alert" role="alert">{error}</p>}
      </div>

      <div className="modal-foot">
        <button type="button" className="btn" onClick={onClose} disabled={isLoading}>Keep Vehicle</button>
        {blockedByHistory ? (
          <button type="button" className="btn primary" onClick={onDeactivateInstead}>Deactivate Instead</button>
        ) : (
          <button type="button" className="btn danger-solid" onClick={confirm} disabled={isLoading} autoFocus>
            {isLoading ? "Deleting…" : "Delete Vehicle"}
          </button>
        )}
      </div>
    </ModalShell>
  );
}
