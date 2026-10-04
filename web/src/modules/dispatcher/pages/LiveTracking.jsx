import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Search,
  ChevronDown,
  Filter,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Check,
  Navigation,
  Box,
  Truck,
  RefreshCcw,
  Phone,
  Star,
  ChevronRight,
  ClipboardList,
  Flag,
  Plus,
  Minus,
  Crosshair,
} from 'lucide-react';

/* ---------- Sample data (unchanged) ---------- */

const mockDrivers = [
  {
    id: '#GS-10250',
    name: 'Mateus Pacheco',
    initials: 'MP',
    status: 'In Transit',
    eta: '6:07 pm',
    stopsLeft: 5,
    parcels: 12,
    issue: null,
    progress: 58,
    selected: true
  },
  {
    id: '#GS-10291',
    name: 'João Ribeiro',
    initials: 'JR',
    status: 'Delayed',
    eta: '+28 min',
    stopsLeft: 8,
    parcels: 20,
    issue: 'Traffic delay',
    progress: 32,
    selected: false
  },
  {
    id: '#GS-10215',
    name: 'Ana Ferreira',
    initials: 'AF',
    status: 'Completed',
    eta: 'Done',
    stopsLeft: 0,
    parcels: 18,
    issue: null,
    progress: 100,
    selected: false
  },
  {
    id: '#GS-10308',
    name: 'Tomás Garcia',
    initials: 'TG',
    status: 'In Transit',
    eta: '7:45 pm',
    stopsLeft: 11,
    parcels: 24,
    issue: null,
    progress: 19,
    selected: false
  },
  {
    id: '#GS-10334',
    name: 'Lena Sousa',
    initials: 'LS',
    status: 'In Transit',
    eta: '6:52 pm',
    stopsLeft: 6,
    parcels: 15,
    issue: null,
    progress: 45,
    selected: false
  }
];

/* ---------- Look-and-feel lists ---------- */

const STATS = [
  { label: 'Active Deliveries', value: 24, icon: Truck, tile: 'bg-green-50 text-green-600' },
  { label: 'In Transit', value: 15, icon: Navigation, tile: 'bg-blue-50 text-blue-600' },
  { label: 'Delayed', value: 3, icon: AlertTriangle, tile: 'bg-orange-50 text-orange-500' },
  { label: 'Delivered Today', value: 86, icon: CheckCircle2, tile: 'bg-green-50 text-green-600' },
];

const STATUS_STYLES = {
  'In Transit': { pill: 'bg-blue-50 text-blue-600', eta: 'text-blue-600', bar: 'bg-blue-500', row: '' },
  Delayed: { pill: 'bg-orange-100 text-orange-600', eta: 'text-orange-500', bar: 'bg-orange-500', row: 'bg-orange-50' },
  Completed: { pill: 'bg-green-100 text-green-600', eta: 'text-green-600', bar: 'bg-green-500', row: '' },
};

// Avatar colours, in the same order as the design
const AVATAR_TONES = [
  'bg-blue-50 text-blue-600',
  'bg-orange-50 text-orange-600',
  'bg-green-50 text-green-600',
  'bg-violet-50 text-violet-600',
  'bg-red-50 text-red-500',
];

const STEPS = [
  { label: 'Order Confirmed', time: '09:15 AM', state: 'done' },
  { label: 'Picked UP', time: '10:02 AM', state: 'done' },
  { label: 'In Transit', time: '12:18 PM', state: 'current' },
  { label: 'Out for Delivery', time: '', state: 'todo' },
  { label: 'Delivered', time: '', state: 'todo' },
];

/* ---------- Map setup (sample positions) ---------- */

const MAP_CENTER = [6.9271, 79.8612]; // Colombo
const MAP_ZOOM = 12;

const svgIcon = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

const ICON_SHAPES = {
  truck: svgIcon(
    '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>'
  ),
  pin: svgIcon(
    '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>'
  ),
  alert: svgIcon(
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>'
  ),
};

const makePin = (background, inner, size = 32) =>
  L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${background};border-radius:9999px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center">${inner}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

const VAN_ICON = makePin('#0D302D', ICON_SHAPES.truck);
const STOP_ICON = makePin('#16A34A', ICON_SHAPES.pin, 28);
const ISSUE_ICON = makePin('#EA580C', ICON_SHAPES.alert, 28);

const ACTIVE_ROUTE = [
  [6.9271, 79.8612], [6.9205, 79.8665], [6.912, 79.872], [6.904, 79.869],
  [6.896, 79.866], [6.886, 79.862], [6.853, 79.864],
];
const OTHER_ROUTE = [
  [6.985, 79.93], [6.965, 79.915], [6.95, 79.9], [6.938, 79.888], [6.925, 79.9], [6.9, 79.93],
];
const VANS = [[6.9271, 79.8612], [6.853, 79.864], [6.985, 79.93]];
const STOPS = [[6.97, 79.9], [6.935, 79.925], [6.9, 79.93], [6.86, 79.92]];
const ISSUE_SPOTS = [[6.915, 79.84], [6.885, 79.885]];

// Buttons and toggles drawn on top of the map
function MapOverlay({ activeTab, setActiveTab }) {
  const map = useMap();
  const recenter = () => map.setView(MAP_CENTER, MAP_ZOOM);
  // Stops clicks on our buttons from also moving/zooming the map
  const stop = (el) => {
    if (el) L.DomEvent.disableClickPropagation(el);
  };

  return (
    <>
      <div ref={stop} className="absolute left-4 top-4 z-[1000] flex rounded-xl border border-line bg-surface p-1 shadow-sm">
        {['Drivers', 'Orders'].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab ? 'bg-forest text-white' : 'text-ink-secondary hover:bg-muted'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div ref={stop} className="absolute right-4 top-4 z-[1000] flex flex-col gap-2">
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
          <button type="button" aria-label="Zoom in" onClick={() => map.zoomIn()} className="grid size-10 place-items-center text-forest hover:bg-muted">
            <Plus size={18} />
          </button>
          <button type="button" aria-label="Zoom out" onClick={() => map.zoomOut()} className="grid size-10 place-items-center border-t border-divider text-forest hover:bg-muted">
            <Minus size={18} />
          </button>
        </div>
        <button type="button" aria-label="Locate" onClick={recenter} className="grid size-10 place-items-center rounded-xl border border-line bg-surface text-forest shadow-sm hover:bg-muted">
          <Crosshair size={18} />
        </button>
      </div>

      <button
        ref={stop}
        type="button"
        onClick={recenter}
        className="absolute bottom-4 right-4 z-[1000] flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-forest shadow hover:bg-muted"
      >
        <Crosshair size={16} /> Recenter
      </button>
    </>
  );
}

const sectionLabel = 'text-xs font-bold uppercase tracking-wider text-ink-secondary';

export default function LiveTracking() {
  const [activeTab, setActiveTab] = useState('Drivers');

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="rounded-2xl border border-line bg-surface px-6 py-5 shadow-sm">
        <h1 className="text-[30px] font-extrabold tracking-[-0.04em] text-forest">Live Tracking</h1>
        <p className="mt-1 text-sm font-medium text-ink-secondary">Monitor active driver locations and delivery status in real time</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map(({ label, value, icon: Icon, tile }) => (
          <div
            key={label}
            className="flex cursor-pointer items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-sm transition-colors hover:border-gold"
          >
            <div className={`grid size-12 shrink-0 place-items-center rounded-xl ${tile}`}>
              <Icon size={22} />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">{label}</p>
              <p className="mt-1 text-[31px] font-extrabold leading-none tracking-[-0.05em] text-forest">{value}</p>
            </div>
            <ChevronRight size={20} className="text-ink-secondary" />
          </div>
        ))}
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-sm">
        <div className="relative min-w-56 flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-secondary" />
          <input
            type="text"
            placeholder="Search address..."
            className="h-11 w-full rounded-xl border border-line bg-screen pl-11 pr-4 text-sm font-medium text-forest outline-none placeholder:text-ink-secondary/80 focus:border-gold focus:ring-2 focus:ring-gold/30"
          />
        </div>
        <button type="button" className="flex h-11 items-center justify-between gap-6 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-forest hover:border-gold">
          All Status <ChevronDown size={16} className="text-ink-secondary" />
        </button>
        <button type="button" className="flex h-11 items-center justify-between gap-6 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-forest hover:border-gold">
          All Couriers <ChevronDown size={16} className="text-ink-secondary" />
        </button>
        <button type="button" className="flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-forest hover:border-gold">
          <Filter size={16} /> Filters
        </button>

        <div className="ml-auto flex items-center gap-5 text-sm">
          <span className="flex items-center gap-2 font-semibold text-forest">
            <span className="size-2 rounded-full bg-green-500"></span>
            Live
          </span>
          <span className="hidden text-ink-secondary sm:block">Updated 12 sec ago</span>
        </div>
      </div>

      {/* Drivers list + map */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">

        {/* Active Drivers */}
        <section className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm lg:h-[32rem]">
          <div className="flex items-center justify-between px-5 py-4">
            <h3 className="flex items-center gap-2 text-[15px] font-extrabold text-forest">
              Active Drivers
              <span className="rounded-full bg-gold px-2 py-0.5 text-[11px] font-extrabold text-forest">34</span>
            </h3>
            <button type="button" className="flex items-center gap-1 text-sm font-medium text-ink-secondary hover:text-forest">
              ETA sort <ChevronDown size={14} />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto lg:max-h-none lg:flex-1">
            <div className="divide-y divide-divider">
              {mockDrivers.map((driver, index) => {
                const s = STATUS_STYLES[driver.status];
                return (
                  <div key={driver.id} className={`cursor-pointer px-5 py-4 transition-colors ${s.row} ${s.row ? '' : 'hover:bg-screen'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`grid size-10 shrink-0 place-items-center rounded-full text-xs font-extrabold ${AVATAR_TONES[index % AVATAR_TONES.length]}`}>
                          {driver.initials}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[13px] font-bold text-forest">{driver.id}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.pill}`}>{driver.status}</span>
                          </div>
                          <p className="mt-0.5 text-sm text-ink-secondary">{driver.name}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${s.eta}`}>{driver.eta}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-secondary">
                      <span className="flex items-center gap-1.5"><MapPin size={14} /> {driver.stopsLeft} stops left</span>
                      <span className="flex items-center gap-1.5"><Box size={14} /> {driver.parcels} parcels</span>
                      {driver.issue ? (
                        <span className="flex items-center gap-1.5 text-orange-500"><AlertTriangle size={14} /> {driver.issue}</span>
                      ) : driver.status !== 'Completed' ? (
                        <span className="flex items-center gap-1.5"><Clock size={14} /> On time</span>
                      ) : null}
                    </div>

                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-secondary">
                        <span>Progress</span>
                        <span className="font-extrabold text-forest">{driver.progress}%</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-divider">
                        <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${driver.progress}%` }}></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Map */}
        <section className="h-96 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm lg:h-[32rem]">
          <MapContainer
            center={MAP_CENTER}
            zoom={MAP_ZOOM}
            style={{ height: '100%', width: '100%', zIndex: 0 }}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />

            <Polyline positions={OTHER_ROUTE} pathOptions={{ color: '#2F5D62', weight: 4 }} />
            <Polyline positions={ACTIVE_ROUTE} pathOptions={{ color: '#F2BE32', weight: 4 }} />

            {STOPS.map((pos, i) => (
              <Marker key={`stop-${i}`} position={pos} icon={STOP_ICON} />
            ))}
            {ISSUE_SPOTS.map((pos, i) => (
              <Marker key={`issue-${i}`} position={pos} icon={ISSUE_ICON} />
            ))}
            {VANS.map((pos, i) => (
              <Marker key={`van-${i}`} position={pos} icon={VAN_ICON}>
                {i === 0 && (
                  <Tooltip permanent direction="top" offset={[0, -18]}>
                    <strong>Van 023</strong>
                    <br />
                    Kasun Perera
                  </Tooltip>
                )}
              </Marker>
            ))}

            <MapOverlay activeTab={activeTab} setActiveTab={setActiveTab} />
          </MapContainer>
        </section>
      </div>

      {/* Bottom details bar (full width) */}
      <section className="grid divide-y divide-divider rounded-2xl border border-line bg-surface shadow-sm lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_minmax(0,1.35fr)_minmax(0,1fr)] lg:divide-x lg:divide-y-0">

        {/* Order details */}
        <div className="p-6">
          <p className={sectionLabel}>Order Details</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h3 className="text-[30px] font-extrabold leading-none tracking-[-0.05em] text-forest">#GS-10250</h3>
            <span className="flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-600">
              <span className="size-1.5 rounded-full bg-blue-500"></span> In Transit
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-ink-secondary">Colombo <span className="mx-1">→</span> Hikkaduwa</p>

          <p className="mt-4 flex items-center gap-2 text-lg font-extrabold text-forest">
            <Clock size={18} className="text-ink-secondary" /> ETA 18 min
          </p>
          <p className="mt-2 flex items-center gap-2 text-sm text-ink-secondary">
            <Clock size={16} /> Last update 12:18 PM (12 sec ago)
          </p>
        </div>

        {/* Delivery progress */}
        <div className="p-6">
          <p className={sectionLabel}>Delivery Progress</p>
          <div className="relative mt-5">
            <div className="absolute left-[10%] right-[10%] top-3.5 h-0.5 bg-divider">
              <div className="h-full w-1/2 bg-green-500"></div>
            </div>
            <div className="relative grid grid-cols-5">
              {STEPS.map((step, i) => (
                <div key={step.label} className="flex flex-col items-center text-center">
                  <div
                    className={`grid size-7 place-items-center rounded-full ${
                      step.state === 'done'
                        ? 'bg-green-500 text-white'
                        : step.state === 'current'
                          ? 'bg-blue-500 text-white ring-4 ring-blue-100'
                          : 'border-2 border-line bg-surface text-ink-secondary'
                    }`}
                  >
                    {step.state === 'done' && <Check size={14} />}
                    {step.state === 'current' && <Truck size={14} />}
                    {step.state === 'todo' && (i === 3 ? <MapPin size={12} /> : <Check size={12} />)}
                  </div>
                  <p className={`mt-2 text-[11px] leading-tight ${step.state === 'todo' ? 'font-medium text-ink-secondary' : 'font-bold text-forest'}`}>
                    {step.label}
                  </p>
                  {step.time && <p className="mt-0.5 text-[10px] text-ink-secondary">{step.time}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Driver */}
        <div className="p-6">
          <p className={sectionLabel}>Driver</p>
          <div className="mt-3 flex items-center gap-4">
            <div className="grid size-16 shrink-0 place-items-center rounded-full bg-blue-50 text-xl font-extrabold text-blue-600">KP</div>
            <div>
              <h4 className="text-[17px] font-extrabold leading-tight text-forest">Kasun Perera</h4>
              <p className="text-sm text-ink-secondary">Van 023 <span className="mx-1">·</span> Toyota Hiace</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm font-bold text-green-600">
                <Phone size={14} /> +94 77 123 4567
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button type="button" className="flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-125">
              <ClipboardList size={16} /> Driver Details
            </button>
            <p className="flex items-center gap-1.5 text-sm font-medium text-ink-secondary">
              <Star size={14} className="text-gold" fill="currentColor" /> 4.9
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6">
          <p className={sectionLabel}>Actions</p>
          <div className="mt-4 flex flex-col gap-3">
            <button type="button" className="flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-bold text-forest hover:border-gold">
              <RefreshCcw size={16} /> Reassign
            </button>
            <button type="button" className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100">
              <AlertTriangle size={16} /> Report Issue
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}