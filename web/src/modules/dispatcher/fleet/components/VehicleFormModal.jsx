import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getApiErrorMessage, getApiFieldErrors } from "@/shared/utils/apiError";
import { useCreateVehicleMutation, useGetDepotsQuery, useUpdateVehicleMutation } from "../fleetApi";
import { TYPE_LABELS, VEHICLE_TYPES } from "../fleetUtils";
import { toVehicleFormValues, toVehiclePayload, vehicleFormSchema } from "../vehicleSchemas";
import { inputClass } from "../vehicleStyles";
import FormField from "./FormField";
import ModalShell from "./ModalShell";

const FORM_FIELDS = Object.keys(toVehicleFormValues());
const control = (error) => `${inputClass(error)} h-10`;

// Adds a vehicle, or edits `vehicle` when one is given. Edits send only what changed.
// onSaved(message, vehicle)  - saved; close and show the message
// onStale(message)           - the vehicle was deleted elsewhere; close, refresh, show the message
export default function VehicleFormModal({ vehicle, onClose, onSaved, onStale }) {
  const isEdit = Boolean(vehicle);
  const [createVehicle, { isLoading: isCreating }] = useCreateVehicleMutation();
  const [updateVehicle, { isLoading: isUpdating }] = useUpdateVehicleMutation();
  const isSaving = isCreating || isUpdating;

  const { data: depots = [], isLoading: loadingDepots, error: depotsError, refetch: refetchDepots } = useGetDepotsQuery();

  const [formError, setFormError] = useState("");
  const [unassignDriver, setUnassignDriver] = useState(false);

  const {
    register, handleSubmit, control: formControl, setValue, setError,
    formState: { errors, dirtyFields, isDirty },
  } = useForm({
    resolver: zodResolver(vehicleFormSchema),
    mode: "onTouched",
    defaultValues: toVehicleFormValues(vehicle),
  });
  const isRefrigerated = useWatch({ control: formControl, name: "isRefrigerated" });

  const clearTemperatures = () => {
    setValue("tempMinC", "", { shouldDirty: true });
    setValue("tempMaxC", "", { shouldDirty: true });
  };

  // Picking a truck type implies whether it has a refrigeration unit; vans can go either way.
  const typeField = register("type", {
    onChange: (event) => {
      if (event.target.value === VEHICLE_TYPES.REFRIGERATED_TRUCK) {
        setValue("isRefrigerated", true, { shouldDirty: true });
      } else if (event.target.value === VEHICLE_TYPES.DRY_BOX_TRUCK) {
        setValue("isRefrigerated", false, { shouldDirty: true });
        clearTemperatures();
      }
    },
  });
  const refrigeratedField = register("isRefrigerated", {
    onChange: (event) => event.target.checked || clearTemperatures(),
  });

  const submit = handleSubmit(async (values) => {
    setFormError("");
    try {
      if (isEdit) {
        const payload = toVehiclePayload(values, dirtyFields);
        // the API can only unassign a driver (assigning needs a driver id this screen can't look up)
        if (unassignDriver) payload.defaultDriverId = null;
        if (Object.keys(payload).length === 0) {
          onClose();
          return;
        }
        const updated = await updateVehicle({ id: vehicle.id, ...payload }).unwrap();
        onSaved(`${updated?.code ?? vehicle.code} was updated.`, updated);
      } else {
        const created = await createVehicle(toVehiclePayload(values)).unwrap();
        onSaved(`${created?.code ?? values.code} was added to the fleet.`, created);
      }
    } catch (err) {
      const message = getApiErrorMessage(err, "Unable to save this vehicle. Please try again.");
      const fieldErrors = Object.entries(getApiFieldErrors(err)).filter(([field]) => FORM_FIELDS.includes(field));

      if (fieldErrors.length > 0) {
        fieldErrors.forEach(([field, text]) => setError(field, { type: "server", message: text }));
        setFormError("Some details need fixing — see the highlighted fields.");
      } else if (err?.status === 409 && /code/i.test(message)) {
        setError("code", { type: "server", message });
      } else if (err?.status === 404) {
        onStale(message);
      } else {
        setFormError(message);
      }
    }
  });

  const aria = (name) => ({
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `vehicle-${name}-error` : undefined,
  });

  const driver = vehicle?.defaultDriver;
  const canSave = isEdit ? isDirty || unassignDriver : true;

  return (
    <ModalShell
      id="vehicle-form" maxWidth={640} busy={isSaving} onClose={onClose}
      title={isEdit ? `Edit ${vehicle.code}` : "Add Vehicle"}
      description={isEdit ? "Update this vehicle's details. Only the fields you change are saved." : "Register a new vehicle in the fleet."}
    >
      <form onSubmit={submit} noValidate>
        <div className="modal-scroll">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Vehicle code" htmlFor="vehicle-code" error={errors.code?.message} hint="Saved in capitals, e.g. VEH061.">
              <input
                id="vehicle-code" type="text" autoComplete="off" maxLength={20} autoFocus={!isEdit}
                className={`${control(errors.code)} uppercase`} {...register("code")} {...aria("code")}
              />
            </FormField>

            <FormField label="Vehicle type" htmlFor="vehicle-type" error={errors.type?.message}>
              <select id="vehicle-type" className={control(errors.type)} {...typeField} {...aria("type")}>
                <option value="">Select a type…</option>
                {Object.values(VEHICLE_TYPES).map((type) => <option key={type} value={type}>{TYPE_LABELS[type]}</option>)}
              </select>
            </FormField>

            <FormField
              label="Home depot" htmlFor="vehicle-homeDepotId" error={errors.homeDepotId?.message}
              hint={depotsError ? undefined : loadingDepots ? "Loading depots…" : undefined}
            >
              <select
                id="vehicle-homeDepotId" className={control(errors.homeDepotId)} disabled={loadingDepots}
                {...register("homeDepotId")} {...aria("homeDepotId")}
              >
                <option value="">{loadingDepots ? "Loading…" : "Select a depot…"}</option>
                {depots.map((depot) => <option key={depot.id} value={depot.id}>{depot.name}</option>)}
              </select>
              {depotsError && !loadingDepots && (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  {getApiErrorMessage(depotsError, "Unable to load depots.")}{" "}
                  <button type="button" onClick={refetchDepots} className="font-bold underline">Try again</button>
                </p>
              )}
            </FormField>

            <FormField label="Refrigeration" htmlFor="vehicle-isRefrigerated">
              <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700">
                <input id="vehicle-isRefrigerated" type="checkbox" className="size-4 accent-[#053D31]" {...refrigeratedField} />
                Has a refrigeration unit
              </label>
            </FormField>

            {isRefrigerated && (
              <>
                <FormField label="Minimum temperature (°C)" htmlFor="vehicle-tempMinC" error={errors.tempMinC?.message} hint="Optional, e.g. -18.">
                  <input id="vehicle-tempMinC" type="text" inputMode="decimal" className={control(errors.tempMinC)} {...register("tempMinC")} {...aria("tempMinC")} />
                </FormField>
                <FormField label="Maximum temperature (°C)" htmlFor="vehicle-tempMaxC" error={errors.tempMaxC?.message} hint="Optional, e.g. 4.">
                  <input id="vehicle-tempMaxC" type="text" inputMode="decimal" className={control(errors.tempMaxC)} {...register("tempMaxC")} {...aria("tempMaxC")} />
                </FormField>
              </>
            )}

            <FormField label="Weight capacity (kg)" htmlFor="vehicle-maxWeightKg" error={errors.maxWeightKg?.message}>
              <input id="vehicle-maxWeightKg" type="text" inputMode="decimal" className={control(errors.maxWeightKg)} {...register("maxWeightKg")} {...aria("maxWeightKg")} />
            </FormField>
            <FormField label="Volume capacity (m³)" htmlFor="vehicle-maxVolumeM3" error={errors.maxVolumeM3?.message}>
              <input id="vehicle-maxVolumeM3" type="text" inputMode="decimal" className={control(errors.maxVolumeM3)} {...register("maxVolumeM3")} {...aria("maxVolumeM3")} />
            </FormField>

            <FormField label="Weekly fuel quota (L)" htmlFor="vehicle-weeklyFuelQuotaL" error={errors.weeklyFuelQuotaL?.message}>
              <input id="vehicle-weeklyFuelQuotaL" type="text" inputMode="decimal" className={control(errors.weeklyFuelQuotaL)} {...register("weeklyFuelQuotaL")} {...aria("weeklyFuelQuotaL")} />
            </FormField>
            <FormField label="Fuel efficiency (km/L)" htmlFor="vehicle-fuelKmPerLitre" error={errors.fuelKmPerLitre?.message} hint="Optional.">
              <input id="vehicle-fuelKmPerLitre" type="text" inputMode="decimal" className={control(errors.fuelKmPerLitre)} {...register("fuelKmPerLitre")} {...aria("fuelKmPerLitre")} />
            </FormField>

            <FormField label="Notes" htmlFor="vehicle-statusNote" error={errors.statusNote?.message} hint="Optional — shown on the vehicle, e.g. what is being serviced." className="sm:col-span-2">
              <textarea
                id="vehicle-statusNote" rows={3} maxLength={500}
                className={`${inputClass(errors.statusNote)} resize-y py-2`} {...register("statusNote")} {...aria("statusNote")}
              />
            </FormField>

            {isEdit && driver && (
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm sm:col-span-2">
                <input
                  type="checkbox" className="mt-0.5 size-4 accent-[#053D31]"
                  checked={unassignDriver} onChange={(e) => setUnassignDriver(e.target.checked)}
                />
                <span>
                  <strong className="block text-gray-900">Unassign the default driver</strong>
                  <span className="text-xs text-gray-500">
                    {driver.fullName}
                    {driver.employeeNumber ? ` (${driver.employeeNumber})` : ""} will no longer be linked to this vehicle.
                  </span>
                </span>
              </label>
            )}
          </div>

          {formError && <p className="emp-alert" role="alert">{formError}</p>}
        </div>

        <div className="modal-foot">
          <button type="button" className="btn" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button type="submit" className="btn primary" disabled={isSaving || !canSave}>
            {isSaving ? "Saving…" : isEdit ? "Save Changes" : "Add Vehicle"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
