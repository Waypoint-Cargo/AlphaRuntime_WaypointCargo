import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getApiErrorMessage, getApiFieldErrors } from "@/shared/utils/apiError";
import { useCreateFuelEntryMutation } from "../fleetApi";
import { formatLitres } from "../fleetUtils";
import { fuelEntrySchema } from "../vehicleSchemas";
import { inputClass } from "../vehicleStyles";
import FormField from "./FormField";
import ModalShell from "./ModalShell";

const control = (error) => `${inputClass(error)} h-10`;

// Logs fuel actually used against this week's quota (POST /vehicles/:id/fuel-entries).
// onLogged(message, vehicle)  - recorded; close and show the message
// onStale(message)            - the vehicle was deleted elsewhere; close, refresh, show the message
export default function FuelEntryModal({ vehicle, onClose, onLogged, onStale }) {
  const [createFuelEntry, { isLoading }] = useCreateFuelEntryMutation();
  const [formError, setFormError] = useState("");

  const { register, handleSubmit, control: formControl, setError, formState: { errors } } = useForm({
    resolver: zodResolver(fuelEntrySchema),
    mode: "onTouched",
    defaultValues: { litres: "", distanceKm: "", note: "" },
  });
  const litresText = useWatch({ control: formControl, name: "litres" });

  const fuel = vehicle.fuel;
  const litres = Number(litresText);
  const exceedsQuota = fuel && litresText?.trim() && Number.isFinite(litres) && litres > fuel.remainingL;

  const submit = handleSubmit(async ({ litres: amount, distanceKm, note }) => {
    setFormError("");
    try {
      const updated = await createFuelEntry({
        id: vehicle.id,
        litres: amount,
        ...(distanceKm !== undefined ? { distanceKm } : {}),
        ...(note ? { note } : {}),
      }).unwrap();
      onLogged(`${formatLitres(amount)} logged for ${vehicle.code}.`, updated);
    } catch (err) {
      const message = getApiErrorMessage(err, "Unable to log this fuel entry. Please try again.");
      const fieldErrors = Object.entries(getApiFieldErrors(err)).filter(([field]) => ["litres", "distanceKm", "note"].includes(field));

      if (fieldErrors.length > 0) {
        fieldErrors.forEach(([field, text]) => setError(field, { type: "server", message: text }));
        setFormError("Some details need fixing — see the highlighted fields.");
      } else if (err?.status === 404) {
        onStale(message);
      } else {
        setFormError(message);
      }
    }
  });

  const aria = (name) => ({
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `fuel-${name}-error` : undefined,
  });

  return (
    <ModalShell
      id="fuel-entry" busy={isLoading} onClose={onClose} maxWidth={480}
      title="Log Fuel" description="Record fuel used. It counts against this week's quota."
    >
      <form onSubmit={submit} noValidate>
        <div className="modal-scroll">
          <div className="strip" style={{ marginBottom: 16 }}>
            <b>{vehicle.code}</b>
            {fuel ? (
              <span>{formatLitres(fuel.remainingL)} left of {formatLitres(fuel.quotaL)} this week ({fuel.remainingPercent}%)</span>
            ) : (
              <span>{formatLitres(vehicle.weeklyFuelQuotaL)} weekly quota</span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Fuel used (L)" htmlFor="fuel-litres" error={errors.litres?.message}>
              <input
                id="fuel-litres" type="text" inputMode="decimal" autoComplete="off" autoFocus
                className={control(errors.litres)} {...register("litres")} {...aria("litres")}
              />
            </FormField>
            <FormField label="Distance driven (km)" htmlFor="fuel-distanceKm" error={errors.distanceKm?.message} hint="Optional.">
              <input
                id="fuel-distanceKm" type="text" inputMode="decimal" autoComplete="off"
                className={control(errors.distanceKm)} {...register("distanceKm")} {...aria("distanceKm")}
              />
            </FormField>
            <FormField label="Note" htmlFor="fuel-note" error={errors.note?.message} hint="Optional, e.g. refuel at Peliyagoda depot." className="sm:col-span-2">
              <textarea
                id="fuel-note" rows={2} maxLength={500}
                className={`${inputClass(errors.note)} resize-y py-2`} {...register("note")} {...aria("note")}
              />
            </FormField>
          </div>

          {exceedsQuota && (
            <p className="banner warn">
              That is more than the {formatLitres(fuel.remainingL)} left this week. The entry is still recorded, and the quota shows as used up.
            </p>
          )}

          {formError && <p className="emp-alert" role="alert">{formError}</p>}
        </div>

        <div className="modal-foot">
          <button type="button" className="btn" onClick={onClose} disabled={isLoading}>Cancel</button>
          <button type="submit" className="btn primary" disabled={isLoading}>{isLoading ? "Saving…" : "Log Fuel"}</button>
        </div>
      </form>
    </ModalShell>
  );
}
