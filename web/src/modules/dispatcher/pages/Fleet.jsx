import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { useAppDispatch } from '@/store/hooks';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import {
  fleetApi, useGetDepotsQuery, useGetFleetStatsQuery, useGetVehicleQuery, useGetVehiclesQuery,
} from '../fleet/fleetApi';
import { ALL, DEFAULT_FILTERS, hasActiveFilters, toQueryArgs } from '../fleet/fleetUtils';
import FleetFilters from '../fleet/components/FleetFilters';
import FleetSummary from '../fleet/components/FleetSummary';
import FleetTable from '../fleet/components/FleetTable';
import FuelEntryModal from '../fleet/components/FuelEntryModal';
import VehicleDetailPanel from '../fleet/components/VehicleDetailPanel';
import { DeleteVehicleModal, ToggleActiveModal } from '../fleet/components/VehicleConfirmModals';
import VehicleFormModal from '../fleet/components/VehicleFormModal';
import VehicleStatusModal from '../fleet/components/VehicleStatusModal';

const SEARCH_DELAY_MS = 300;
const TOAST_MS = 4000;

const listFormat = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' });
const plural = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`;

function loadErrorMessage(error) {
  if (!error) return null;
  if (error.status === 403) return "You don't have permission to view the fleet.";
  return getApiErrorMessage(error, 'Unable to load the fleet. Please try again.');
}

export default function Fleet() {
  const dispatch = useAppDispatch();

  const [filters, setFilters] = useState(DEFAULT_FILTERS); // what the list is queried with
  const [search, setSearch] = useState('');                // what is typed; reaches `filters` after a short pause
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [dialog, setDialog] = useState(null);              // { type, vehicle? }
  const [toast, setToast] = useState('');

  const searchTimer = useRef(null);
  const toastTimer = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => () => {
    window.clearTimeout(searchTimer.current);
    window.clearTimeout(toastTimer.current);
  }, []);

  const list = useGetVehiclesQuery(toQueryArgs(filters, page), { refetchOnMountOrArgChange: true });
  const stats = useGetFleetStatsQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: depots = [] } = useGetDepotsQuery();

  // While a new filter/page loads, `data` still holds the previous result so the rows can dim instead
  // of vanishing. If that load fails, don't keep showing rows that don't match the filters now active;
  // `currentData` only exists for the arguments in use (a failed background refresh keeps its rows).
  const listFailed = list.isError && !list.currentData;
  const vehicles = listFailed ? [] : list.data?.items ?? [];
  const meta = listFailed ? null : list.data?.meta ?? null;

  // The panel shows the clicked vehicle, or the first one until something is clicked
  const selectedRow = vehicles.find((vehicle) => vehicle.id === selectedId) ?? vehicles[0];
  const detail = useGetVehicleQuery(selectedRow?.id, { skip: !selectedRow, refetchOnMountOrArgChange: true });
  const selected = detail.currentData ?? selectedRow;

  const isFiltered = hasActiveFilters(filters);

  const notify = useCallback((message) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), TOAST_MS);
  }, []);

  const refreshAll = () => dispatch(fleetApi.util.invalidateTags(['Vehicles', 'FleetStats']));

  // ---- filters ----------------------------------------------------------

  const applyFilters = (patch) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  const changeSearch = (value) => {
    setSearch(value);
    window.clearTimeout(searchTimer.current);
    if (value.trim() === '') {
      applyFilters({ search: '' });
      return;
    }
    searchTimer.current = window.setTimeout(() => applyFilters({ search: value.trim() }), SEARCH_DELAY_MS);
  };

  // Summary tiles are status shortcuts; pressing the active one again goes back to everything
  const pickStatus = (status) => applyFilters({ status: filters.status === status ? ALL : status });

  const clearFilters = () => {
    window.clearTimeout(searchTimer.current);
    setSearch('');
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  const selectVehicle = (id) => {
    setSelectedId(id);
    // below xl the details sit under the table, so bring them into view
    if (!window.matchMedia('(min-width: 1280px)').matches) {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // ---- dialogs ----------------------------------------------------------

  const openDialog = (type, vehicle) => setDialog({ type, vehicle });
  const closeDialog = useCallback(() => setDialog(null), []);

  const done = (message) => {
    closeDialog();
    notify(message);
  };

  const stale = (message) => {
    done(message);
    refreshAll();
  };

  const added = (message, vehicle) => {
    done(message);
    // show the new vehicle: it may sit on another page or be hidden by the current filters
    window.clearTimeout(searchTimer.current);
    setSearch(vehicle.code);
    setFilters({ ...DEFAULT_FILTERS, search: vehicle.code });
    setPage(1);
    setSelectedId(vehicle.id);
  };

  const dialogVehicle = dialog?.vehicle;

  // ---- table copy -------------------------------------------------------

  const total = meta?.total;
  const depotNames = depots.map((depot) => depot.name);
  let subtitle = listFailed ? 'Vehicles unavailable' : 'Loading vehicles…';
  if (total !== undefined) {
    if (isFiltered) subtitle = `${plural(total, 'vehicle')} match your filters`;
    else subtitle = `${plural(total, 'vehicle')}${depotNames.length ? ` across ${listFormat.format(depotNames)}` : ''}`;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fleet</h1>
          <p className="text-gray-500 text-sm mt-1">Dispatcher view of every vehicle, its capacity and current status.</p>
        </div>
        <button
          type="button"
          onClick={() => openDialog('add')}
          className="inline-flex items-center gap-2 rounded-lg bg-[#FFC107] px-4 py-2.5 text-sm font-bold text-[#053D31] shadow-sm transition hover:brightness-95"
        >
          <Plus size={16} aria-hidden="true" /> Add Vehicle
        </button>
      </div>

      <FleetSummary stats={stats.data} status={filters.status} onSelect={pickStatus} />

      <FleetFilters
        filters={filters}
        search={search}
        depots={depots}
        onFilter={applyFilters}
        onSearch={changeSearch}
        onRefresh={refreshAll}
        isRefreshing={list.isFetching || stats.isFetching}
      />

      {/* Main Content Split */}
      <div className="flex flex-col xl:flex-row gap-6">

        <FleetTable
          vehicles={vehicles}
          meta={meta}
          selectedId={selected?.id}
          onSelect={selectVehicle}
          onPage={setPage}
          subtitle={subtitle}
          state={{
            isLoading: list.isLoading,
            isFetching: list.isFetching,
            errorMessage: listFailed ? loadErrorMessage(list.error) : null,
            onRetry: list.refetch,
            isFiltered,
            onClearFilters: clearFilters,
            onAdd: () => openDialog('add'),
          }}
        />

        <div ref={panelRef} className="w-full xl:w-80 shrink-0 xl:sticky xl:top-0 xl:self-start scroll-mt-2">
          <VehicleDetailPanel vehicle={selected} loading={list.isLoading} onAction={(type) => openDialog(type, selected)} />
        </div>

      </div>

      {dialog?.type === 'add' && (
        <VehicleFormModal onClose={closeDialog} onSaved={added} onStale={stale} />
      )}

      {dialog?.type === 'edit' && (
        <VehicleFormModal
          key={dialogVehicle.id} vehicle={dialogVehicle}
          onClose={closeDialog} onSaved={done} onStale={stale}
        />
      )}

      {dialog?.type === 'status' && (
        <VehicleStatusModal
          key={dialogVehicle.id} vehicle={dialogVehicle}
          onClose={closeDialog} onUpdated={done} onStale={stale}
        />
      )}

      {dialog?.type === 'fuel' && (
        <FuelEntryModal
          key={dialogVehicle.id} vehicle={dialogVehicle}
          onClose={closeDialog} onLogged={done} onStale={stale}
        />
      )}

      {(dialog?.type === 'deactivate' || dialog?.type === 'reactivate') && (
        <ToggleActiveModal
          key={dialogVehicle.id} vehicle={dialogVehicle}
          onClose={closeDialog} onDone={done} onStale={stale}
        />
      )}

      {dialog?.type === 'delete' && (
        <DeleteVehicleModal
          key={dialogVehicle.id} vehicle={dialogVehicle}
          onClose={closeDialog} onDeleted={done} onStale={stale}
          onDeactivateInstead={() => openDialog('deactivate', dialogVehicle)}
        />
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
