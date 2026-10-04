# Loading Module — Architecture & API Reference

Backend for the warehouse **Loader** role: the Home, Tasks, Start Loading and Loading Completed
screens. It lives in `backend/src/modules/loading`, is mounted at **`/api/loading`**, and every
route is **LOADER-only** (`authenticateUser` → `requireRole(Role.LOADER)`).

It follows the pattern in [`../auth/AUTH_MODULE_ARCHITECTURE.md`](../auth/AUTH_MODULE_ARCHITECTURE.md).
Section 1 lists the few places where it goes beyond what the auth module shows, and why.

---

## 1. Layout and conventions

```
loading/
├── loading.routes.js      # router: [authenticateUser, requireRole] → limiter → noStore (reads) → validate → catchAsync(controller)
├── loading.controller.js  # HTTP layer: req → service → sendSuccess; builds the audit context (ip, requestId)
├── loading.service.js     # use cases, transactions, locking, error codes
├── loading.repository.js  # thin Prisma wrappers, one-line intent comment each, *Tx twins for transactional work
├── loading.dto.js         # response shaping - nothing raw leaves the service
├── loading.validator.js   # Zod schemas (body / query / params), every rule has a user-facing message
└── loading.rules.js       # pure domain rules (no I/O) - see below
```

Same as auth: strict one-way layering, named exports only, single-object arguments for
controllers/services, `<action>Controller` / `<action>Service` / `to<Thing>DTO` / `<action>Schema`
naming, `AppError(message, status)` for every failure, `sendSuccess` / `errorHandler` envelopes,
module registered with one line in `routes/index.js`.

Where this module goes beyond auth, following the nearest existing module instead:

| Need | Followed | Notes |
|---|---|---|
| Role guard on every route | `fleet.routes.js` (`const x = [authenticateUser, requireRole(...)]`, spread into each route) | LOADER only; no ADMIN override |
| Read / write rate limiters | `fleet.routes.js` (shared limiters, reads fail open, writes fail closed) | three limiters: read 120/min, progress 300/min (the +/- stepper), lifecycle 60/min |
| Lists: `data` + `meta` | `fleet` (`page`, `limit`, `total`, `totalPages`) | |
| Machine-readable error codes | `orders.service.js` (`new AppError(msg, status, { code: "..." })`) | auth has no `details`; the UI needs codes to tell 409s apart |
| Order status changes | `transitionOrdersTx` exported by `orders.service.js` | version-checked, writes `OrderEvent` |
| Depot scoping | `getScope` in `orders.adapters.js` (UserDepot, falling back to the outlet's depot) | see section 10 |
| Seventh file `loading.rules.js` | `orders.adapters.js` is precedent for a non-layer helper file | keeps the service about orchestration; the rules are unit-testable |

New here (no precedent in the codebase): `AuditLog` writes for lifecycle changes, a raw
`SELECT … FOR NO KEY UPDATE` and `nextval('issue_ref_seq')` in the repository, `Cache-Control: no-store`
on reads.

---

## 2. Vocabulary

| Word | Meaning everywhere in this API |
|---|---|
| **items** | **units** — the sum of order-line quantities. Same meaning as `Order.itemCount`. `totalItems`, `loadedItems`, `remainingItems`, `itemCount`, `itemsToLoad`. |
| **lines** | order lines (`OrderItem` rows). Always `lines`, `lineCount`, `totalLines`, `loadedLines` — never "items". |
| **task** | one trip's loading job. `tripId` is the task id. A trip is "route R-005" on the screens. |
| **stop** | one outlet on the trip. It can hold **two orders** (a Fresh outlet orders dry + chilled for the same day). |

So the placeholder screens' "46 Items", "244 Total Items" and "176 items loaded" are all **units**;
the "16 Items" badge on an outlet is its **line** count (`lineCount`).

---

## 3. Data model

A loading task is **not a new table** — it is a `Trip` (route + vehicle + departure) plus its
`LoadingSession`. The module reads the live plan and writes only the loader's own records.

```
DispatchPlan (PUBLISHED / IN_EXECUTION / COMPLETED, per depot + day)
  └─ Trip  (route code R-005, vehicle, plannedDeparture, status PLANNED→LOADING→LOADED)      ← the task
       ├─ Stop (sequence, outlet)  ──< Allocation >── Order ──< OrderItem (the lines)         ← the live plan
       ├─ LoadingSession (0..1)    status, lock, timings                                      ← created on first claim
       │     └─ LoadingItemCheck   one per OrderItem: plannedQty, loadedQty, status, shortQty ← saved quantities
       └─ Issue (LOADING_SHORTFALL) ──< LoadingItemCheck.issueId                              ← shortfall report
```

**No `LoadingSession` row = PENDING.** The row is created when a loader claims the task, so the
planning module does not have to know about loading.

### Migration `20261004090000_add_loading_lifecycle`

Purely additive (applies to a live database with no table rewrite).

| Table | Added | Purpose |
|---|---|---|
| enum `LoadingStatus` | `IN_PROGRESS`, `PAUSED`, `ON_HOLD`, `COMPLETED` | session state (PENDING is "no row") |
| `LoadingSession` | `status` (default `IN_PROGRESS`) | lifecycle |
| | `lockedById` → `User` (SET NULL), `lockExpiresAt` | claim lock |
| | `pausedAt`, `pausedSec` | idle time (PAUSED / ON_HOLD) excluded from the loading duration |
| `LoadingItemCheck` | `shortQty` (default 0), `note`, `issueId` → `Issue` (SET NULL) | shortfall detail per line |
| indexes | `LoadingSession(status)`, `(lockedById)`, `LoadingItemCheck(issueId)` | |

Hand-written in the same file (Prisma cannot express them): backfill `status = COMPLETED` where
`completedAt` is set, and CHECKs — `pausedSec >= 0`, a COMPLETED session has `completedAt`, only an
IN_PROGRESS session carries a lock, quantities are never negative. There is deliberately **no**
`loadedQty <= plannedQty` CHECK: if the dispatcher shrinks an order after loading started, the
surplus is real and has to be unloaded. The service enforces the limit on every write.

Existing columns reused as designed: `LoadingSession.departedShort`, `startedBy/At`,
`completedBy/At`; `LoadingItemCheck.status` (`LoadCheckStatus`), `checkedBy/At`; `Issue`
(`source = LOADER`, `type = LOADING_SHORTFALL`, `expectedQty`, `actualQty`, `clientMutationId`).

### What the module writes

| When | Writes |
|---|---|
| claim (first start) | `LoadingSession`, one `LoadingItemCheck` per line, `Trip` PLANNED→LOADING, `Vehicle` AVAILABLE→ASSIGNED, `AuditLog` |
| resume / takeover | session lock, any new plan lines get a saved row, vehicle AVAILABLE→ASSIGNED if it is not already, `AuditLog` |
| quantity save | `LoadingItemCheck` rows |
| shortfall | `Issue` (`ISS-###` from `issue_ref_seq`), flags on the lines, session → ON_HOLD, `AuditLog` |
| complete | session → COMPLETED, `Trip` → **LOADED** ("ready for the driver"), each `PLANNED` order → `LOADED` / `PARTIALLY_LOADED` (+`OrderEvent`), `AuditLog` |

Audit actions: `LOADING_STARTED`, `LOADING_RESUMED`, `LOADING_LOCK_TAKEN_OVER`, `LOADING_PAUSED`,
`LOADING_SHORTFALL_REPORTED`, `LOADING_COMPLETED`. Quantity saves are not audited per tap —
`LoadingItemCheck.checkedBy/At` records who touched each line last.

---

## 4. Task lifecycle

```
                 start                    pause
   PENDING ───────────────► IN_PROGRESS ───────────► PAUSED
 (no session)                 │  ▲  ▲                  │
                              │  │  └──── start ───────┘   (any loader; quantities kept)
                              │  └─ start by holder = heartbeat
                              │  └─ start after lock expiry = takeover
                shortfall     │
                              ▼                complete
                           ON_HOLD       IN_PROGRESS ───────► COMPLETED   (terminal, read-only)
                              │
                              └── dispatcher review (separate flow) ──► PAUSED
```

| State | Meaning | Lock | Who can act |
|---|---|---|---|
| `PENDING` | in the shared pool, no session row | – | any loader at the depot may `start` |
| `IN_PROGRESS` | one loader is loading it | `lockedBy`, `lockExpiresAt` | the holder: save, pause, shortfall, complete. Others: only after the lock expired |
| `PAUSED` | back in the pool, every saved quantity kept | – | any loader may `start` (resume) |
| `ON_HOLD` | shortfall reported, waiting for the dispatcher | – | nobody on the loader side; `start` → 409 `TASK_ON_HOLD` |
| `COMPLETED` | finished; the vehicle is ready for its driver | – | read-only |

**Tabs:** Pending = `PENDING + IN_PROGRESS + PAUSED + ON_HOLD` on a trip still `PLANNED`/`LOADING`;
Completed = `COMPLETED`.

### Completing when lines are short

`complete` is **blocked** (422 `COMPLETION_BLOCKED`) while any line is below its planned quantity —
**unless a shortfall has been recorded for that line.** A recorded shortfall puts the whole load on
hold, so the sequence for a vehicle that must leave short is:

1. loader loads what exists, **reports the shortfall** → `ON_HOLD`, `ISS-###` raised;
2. dispatcher reviews and **releases the hold** (accepts departing short) → `PAUSED`;
3. a loader resumes, loads the remaining available units (a flagged line can never be loaded above
   `plannedQty − shortQty`), and **completes** → `departedShort = true`, the affected orders become
   `PARTIALLY_LOADED`, the rest `LOADED`.

Other blockers: nothing to load, a plan constraint violation, items loaded beyond the plan, units
still on the vehicle from an order that left the plan.

---

## 5. Locking and concurrency rules

1. **One winner per claim.** Creating the session is `INSERT … ON CONFLICT DO NOTHING` on the unique
   `tripId`; moving PAUSED/expired → IN_PROGRESS is a single `UPDATE … WHERE status = … AND …`
   (compare-and-set). Whoever affects a row wins; the rest get 409 `TASK_LOCKED` naming the holder.
2. **The lock is `lockedById + lockExpiresAt`.** TTL is `LOADING_LOCK_TTL_MS` (default 900000 = 15 min).
   Every successful write by the holder pushes the expiry forward. `ttlSec` is returned with the lock.
3. **Heartbeat = `POST …/start` as the holder.** It extends the lock and returns the fresh task. A
   client that keeps the Start Loading screen open should call it about every `ttlSec / 3`.
4. **Takeover.** An `IN_PROGRESS` session whose lock expired (dead tablet, forgotten task, or holder
   account deleted) can be claimed by another loader. It is audited (`LOADING_LOCK_TAKEN_OVER`) and
   the former holder's next write gets 409 `TASK_LOCKED`. A holder whose lock expired but whom nobody
   replaced carries on normally and re-arms the lock on their next save.
5. **One vehicle, one route at a time.** Claiming first takes `SELECT … FOR NO KEY UPDATE` on the trip's
   vehicle row, so two claims on the same vehicle run one after the other; a claim is refused
   (409 `VEHICLE_BUSY`) while another route of that vehicle and day has a live lock. This is the
   "two people cannot load the same vehicle at once" rule — a vehicle that runs two routes in a day
   is loaded for them one after the other.
6. **Writes serialise on the session row.** Save / shortfall / complete begin by a compare-and-set on
   `status = IN_PROGRESS AND lockedById = me`; that statement holds a row lock until commit, so no
   pause, takeover or second save can interleave. Start, shortfall and complete are single database
   transactions — all or nothing.
7. **Pause releases.** `IN_PROGRESS → PAUSED`, lock cleared, quantities kept. A different loader
   resumes exactly where it stopped.
8. **Idempotent where a retry is natural:** pause on `PAUSED` → 200; start as the holder → 200;
   complete again by the loader who completed → 200; a shortfall retried with the same
   `clientMutationId` files nothing new.
9. **Quantities are absolute, not deltas.** `PATCH …/lines` carries "loaded so far". Concurrent
   writers cannot exist (only the holder writes), so the last write wins; a client should send the
   final value of a burst of taps rather than every tap.
10. **Plan drift is checked on every write** (section 6): the live plan decides what is valid.

---

## 6. Plan changes while a task is open

* Every read and write rebuilds the task from the **live** plan (stops → allocated orders → lines)
  laid over the saved quantities. Nothing is cached; reads send `Cache-Control: no-store`.
* Only orders in `PLANNED / PARTIALLY_LOADED / LOADED` are loadable (deferred or cancelled orders
  drop out). A **finished** load is frozen: it keeps showing every order that was on it.
* **`planRevision`** is a fingerprint of stop order, lines and quantities. Echo it back on `PATCH
  …/lines` and `POST …/complete`; if the plan changed meanwhile → 409 `PLAN_CHANGED` carrying the
  current revision. It is optional — without it only the structural checks below apply.
* An order **removed** from the trip after units were loaded appears in `removedLines`
  (units still on the vehicle). Such a line can be set lower (down to 0 = unloaded), never higher,
  and blocks completion until it is back to 0.
* An order **added** to the trip shows up with nothing loaded and raises the totals.
* A line that shrinks below what is loaded shows `excessQty > 0` and blocks completion.
* If the dispatcher **cancels the trip** (or the plan is completed) mid-load, saving, reporting and
  completing return 409 `TRIP_NOT_LOADABLE`; `pause` stays available so the lock can be released, and
  the task leaves the pool. If the plan is withdrawn back to a draft, the task simply disappears
  (404) and the unattended lock expires on its own.

### Derived fields (the plan has no such columns)

| Field | Rule |
|---|---|
| `priority` | `HIGH` if the load carries chilled/frozen goods **or** any stop's window closes by 08:00 (Fresh stores open at 08:00); otherwise `NORMAL` |
| `brand` | the brand with the most units on the trip (ties: FRESH, STYLE, TECH); `brands` lists all |
| `tempRequirement` | highest of `AMBIENT < CHILLED < FROZEN` across the orders; `requiresRefrigeration` is `≠ AMBIENT` |
| `loadPosition` | goods leave in stop order, so the last stop has `loadPosition 1` (load it first); `sequence` is the delivery order |
| `loadingSec` | `(completedAt − startedAt) − idle time`; `elapsedSec` is the wall-clock span, `idleSec` the paused/held time |
| `percent` | `floor(loaded / total × 100)`, loaded capped per line — 99.6 % never reads 100 % |

---

## 7. Operating constraints

The dispatcher plans these; the loader API **exposes** them and **refuses** the obvious breaches.

| Code | Kind | Condition |
|---|---|---|
| `VEHICLE_UNAVAILABLE` | violation | vehicle deactivated or in `MAINTENANCE` |
| `TEMPERATURE_MISMATCH` | violation | chilled/frozen order on a non-refrigerated vehicle |
| `VAN_ONLY_OUTLET` | violation | a `van_only` outlet on a truck (order snapshot wins over the outlet row, as in the DB trigger) |
| `WEIGHT_LIMIT_EXCEEDED` / `VOLUME_LIMIT_EXCEEDED` | violation | load above the vehicle's limit |
| `WINDOW_AT_RISK` | warning | a stop's `plannedArrival` is outside its delivery window (mall access window for mall outlets) |
| `DEPARTURE_PASSED` | warning | `plannedDeparture` is in the past and the load is not finished |
| `VEHICLE_ON_ROUTE` | warning | vehicle still marked on route |

Violations make `start` fail with 409 `PLAN_CONSTRAINT_VIOLATION` (listed in `details.violations`),
set `actions.canStart = false`, appear on the list card, and block `complete`. Warnings only inform.
Fuel quotas are a planning concern and are not checked here.

---

## 8. Endpoint reference

Base path `/api/loading`. All routes need `Authorization: Bearer <access token>` of a `LOADER`.
Success: `{ success: true, message, data, requestId, meta? }`. Error:
`{ success: false, message, details?, requestId }`, where `details.code` is the machine code from
section 9 (validation failures are 422 with `details: [{ field, message, code }]`).
Common to all: 401 no/invalid token, 403 wrong role / `NO_DEPOT` / `ACCOUNT_INACTIVE`, 429 rate limit.
Trips outside the loader's depot answer **404** `TASK_NOT_FOUND` (existence is not leaked).

### Home

#### `GET /summary` — daily figures
Query: `date` (`YYYY-MM-DD`, default today in Asia/Colombo).

```json
{ "date": "2026-10-04", "pendingLoads": 9, "readyToDepart": 0, "openIssues": 0,
  "itemsToLoad": 231, "departures": 10, "departuresRemaining": 9,
  "byStatus": { "PENDING": 9, "IN_PROGRESS": 0, "PAUSED": 0, "ON_HOLD": 0, "COMPLETED": 0 },
  "nextStep": { "type": "START_LOADING", "title": "You have loads ready to begin.",
                "message": "View your ready loads and start loading.", "count": 5,
                "tripId": "…", "routeCode": "R-T04" } }
```

| Field | Definition (loader's depots, one day) |
|---|---|
| `pendingLoads` | tasks on the Pending tab — always equals `meta.total` of `GET /tasks?tab=pending` |
| `readyToDepart` | loading `COMPLETED` and the trip still `LOADED` (waiting for its driver) |
| `openIssues` | `OPEN`/`INVESTIGATING` shortfall reports of the loader's depots, any day — always equals `meta.counts.pending` of `GET /issues` |
| `itemsToLoad` | units still to load across the Pending tab |
| `departures` / `departuresRemaining` | trips scheduled (not cancelled) / not yet departed |
| `nextStep.type` | `RESUME_LOADING` (you hold a task) · `START_LOADING` (`count` = startable tasks) · `AWAITING_REVIEW` · `WAITING` · `ALL_CLEAR` |

Errors: 422 bad date.

### Issues

#### `GET /issues` — shortfall reports (the Issues screen)
Query: `tab` (`pending` default | `resolved`), `limit` (50, max 100). Newest first. The reports are the
`LOADING_SHORTFALL` issues raised by loaders on trips of the caller's depots, whoever reported them and whatever
day the trip is on. **Pending** = `OPEN` or `INVESTIGATING`: a report stays here until the dispatcher marks it
`RESOLVED`, which moves it to **Resolved**. Returns `data: [issue]` and
`meta: { tab, limit, total, counts: { pending, resolved } }` (the counts of both tabs, for the tab labels).
`Home.openIssues` is the same number as `counts.pending`.

```json
{ "id": "…", "reference": "ISS-001", "status": "OPEN", "isResolved": false,
  "reason": "Pallet 3 was not delivered to the dock",
  "reportedAt": "2026-10-04T12:24:38.048Z", "reportedBy": { "id": "…", "fullName": "Harini Pasansha" },
  "resolvedAt": null, "resolvedBy": null, "resolutionNote": null,
  "trip": { "id": "…", "routeCode": "R-DEMO-2" },
  "orderReferences": ["ORD-DEMO-04", "ORD-DEMO-05"], "totalShortItems": 5,
  "lines": [ { "orderItemId": "…", "orderReference": "ORD-DEMO-04", "itemCode": "…", "lineNo": 1,
               "itemName": "Cotton Shirt", "status": "SHORT", "plannedQty": 40, "loadedQty": 36,
               "shortQty": 4, "availableQty": 36, "note": "none on pallet" } ] }
```
`reason` is what the loader typed (null when nothing was typed); `lines[].status` is `SHORT | DAMAGED | WRONG_ITEM`.
The dispatcher's side (investigate, resolve) has no endpoint yet; until it exists, set `Issue.status`, `resolvedAt`,
`resolvedById` and `resolutionNote` directly. Errors: 422 bad query.

### Tasks

#### `GET /tasks` — the shared task pool
Query: `tab` (`pending` default | `completed`), `search` (contains, route or vehicle code),
`brand` (`FRESH|STYLE|TECH`), `date`, `page` (1), `limit` (20, max 100).
Order: Pending by `plannedDeparture` ascending (nulls last), Completed by `completedAt` descending.
Returns `data: [card]` and `meta: { page, limit, total, totalPages, date, tab }`.

```json
{ "tripId": "…", "sessionId": null, "routeCode": "R-T04", "tripNumber": 1, "deliveryDate": "2026-10-04",
  "status": "PENDING", "tripStatus": "PLANNED",
  "brand": "FRESH", "brands": ["FRESH"], "priority": "HIGH",
  "tempRequirement": "CHILLED", "requiresRefrigeration": true,
  "plannedDeparture": "2026-10-04T00:00:00.000Z",
  "depot": { "id": "…", "code": "PLY", "name": "Peliyagoda Distribution Centre" },
  "vehicle": { "id": "…", "code": "V-VAN-1", "type": "VAN", "isRefrigerated": true, "status": "AVAILABLE",
               "maxWeightKg": 1200, "maxVolumeM3": 8 },
  "outletCount": 1, "lineCount": 2, "itemCount": 10,
  "progress": { "totalItems": 10, "loadedItems": 0, "remainingItems": 10, "excessItems": 0,
                "percent": 0, "totalLines": 2, "loadedLines": 0 },
  "lock": null, "violations": [],
  "actions": { "canStart": true, "canPause": false, "canUpdateLines": false,
               "canReportShortfall": false, "canComplete": false } }
```
`status` is the task state (card badge: `PENDING` = "Waiting to Load"). `lock`, when present:
`{ heldBy: {id, fullName}, isMine, expiresAt, isExpired, ttlSec }` — `isExpired` means "available to
take over". Errors: 422 bad query.

#### `POST /tasks/:tripId/start` — "Open Task" (claim · resume · take over · heartbeat)
No body. Returns the full task (same as `GET /tasks/:tripId`), status `IN_PROGRESS`, `lock.isMine = true`.

| Situation | Result |
|---|---|
| no session | claim: create session, seed one saved row per line, trip → `LOADING`, vehicle → `ASSIGNED` |
| `PAUSED` | resume (idle time banked) |
| `IN_PROGRESS`, mine | 200, lock extended (heartbeat) |
| `IN_PROGRESS`, other's, lock expired | take over |
| `IN_PROGRESS`, other's, lock live | 409 `TASK_LOCKED` |
| `ON_HOLD` / `COMPLETED` | 409 `TASK_ON_HOLD` / `TASK_COMPLETED` |

Other errors: 409 `VEHICLE_BUSY`, `PLAN_CONSTRAINT_VIOLATION`, `TRIP_NOT_LOADABLE`, 404.

### Start Loading

#### `GET /tasks/:tripId` — the live task (always fresh, `Cache-Control: no-store`)
Header fields as on the card, plus:

```json
{ "load": { "weightKg": 192, "volumeM3": 0.96, "weightPercent": 3, "volumePercent": 3 },
  "progress": { "totalItems": 96, "loadedItems": 0, "remainingItems": 96, "percent": 0, "totalLines": 7, … },
  "timing": { "startedAt": "…", "completedAt": null, "pausedAt": null, "elapsedSec": 0, "idleSec": 0, "loadingSec": 0 },
  "lock": { "heldBy": { "id": "…", "fullName": "…" }, "isMine": true, "expiresAt": "…", "isExpired": false, "ttlSec": 900 },
  "planRevision": "982898420b243738",
  "violations": [], "warnings": [ { "code": "WINDOW_AT_RISK", "message": "…", "outletCode": "OUT-T3" } ],
  "actions": { "canStart": true, "canPause": true, "canUpdateLines": true, "canReportShortfall": true, "canComplete": false },
  "completionBlockers": [ { "code": "LINES_NOT_LOADED", "count": 7, "items": 96, "message": "…" } ],
  "shortfall": null, "removedLines": [],
  "stops": [ {
    "stopId": "…", "sequence": 1, "loadPosition": 2, "status": "NOT_STARTED",
    "outlet": { "id": "…", "code": "OUT-T1", "name": "…", "district": "Colombo", "brand": "FRESH",
                "vanOnly": false, "isMall": false, "unloadingType": null,
                "window": { "startMin": 300, "endMin": 450 }, "mallWindow": null },
    "plannedArrival": "…",
    "orders": [ { "id": "…", "reference": "ORD-T0001", "tempClass": "CHILLED", "status": "PLANNED" } ],
    "lineCount": 5, "progress": { "totalItems": 56, "loadedItems": 0, … },
    "lines": [ { "orderItemId": "…", "orderReference": "ORD-T0001", "lineNo": 1, "itemCode": "SKU-1-1",
                 "itemName": "Whole Milk 1L", "unit": "EA", "tempClass": "CHILLED",
                 "plannedQty": 12, "loadedQty": 0, "remainingQty": 12, "excessQty": 0,
                 "maxLoadableQty": 12, "status": "PENDING", "shortQty": 0, "note": null, "checkedAt": null } ]
  } ] }
```
`stops[].status`: `NOT_STARTED · IN_PROGRESS · LOADED · SHORT`. Line `status` is `LoadCheckStatus`
(`PENDING · VERIFIED · SHORT · DAMAGED · WRONG_ITEM`). `itemCode` is `OrderItem.sku`, or `null` when the
order line has none. Errors: 404.

#### `PATCH /tasks/:tripId/lines` — save loaded quantities (the stepper)
```json
{ "lines": [ { "orderItemId": "…", "loadedQty": 5 } ], "planRevision": "982898420b243738" }
```
`lines`: 1–100 distinct lines, `loadedQty` an integer ≥ 0 (**absolute**). `planRevision` optional.
Holder only. Returns `{ lines: [updated], removedLines: [{orderItemId, loadedQty}], stops: [{stopId, status, progress}], progress, lock, canComplete, planRevision }`
so the screen can redraw the progress block and the outlet badges without a second call.
A line reaching its planned quantity becomes `VERIFIED`; lowering it returns to `PENDING`.
Errors: 409 `TASK_NOT_STARTED` · `TASK_LOCKED` · `TASK_PAUSED` · `TASK_ON_HOLD` · `TASK_COMPLETED` ·
`TRIP_NOT_LOADABLE` · `PLAN_CHANGED`; 422 `QTY_EXCEEDS_PLANNED` (`details`: `requested`, `plannedQty`,
`shortQty`, `maxLoadableQty`) · `LINE_NOT_IN_PLAN`.

#### `POST /tasks/:tripId/pause` — "Pause Loading"
No body. Returns the task, status `PAUSED`. Errors: 409 `TASK_LOCKED` (not yours), `TASK_NOT_STARTED`,
`TASK_ON_HOLD`, `TASK_COMPLETED`.

#### `POST /tasks/:tripId/shortfall` — "Report Shortfall"
```json
{ "reason": "Pallet 3 was not delivered to the dock", "clientMutationId": "7c1f0e2a-…",
  "lines": [ { "orderItemId": "…", "type": "MISSING", "shortQty": 2, "note": "none on pallet" },
             { "orderItemId": "…", "type": "DAMAGED", "shortQty": 1 } ] }
```
`lines`: 1–25, `type` ∈ `MISSING | DAMAGED | WRONG_ITEM`, `shortQty` ≥ 1 (units that cannot be loaded),
`note` ≤ 160 chars; `reason` ≤ 500; `clientMutationId` 8–64 chars (optional, makes a retry safe).
Holder only. **201** with the task: status `ON_HOLD`, lock released, and
`shortfall: { issue: { id, reference: "ISS-001", status: "OPEN", description, reportedAt, reportedBy }, totalShortItems, lines: […] }`.
Each line is flagged `SHORT / DAMAGED / WRONG_ITEM` with `shortQty`, `note`, `issueId`. One `Issue`
(`source LOADER`, `type LOADING_SHORTFALL`) is filed per report; `orderId` is set only when every
line belongs to one order.
Errors: 409 as for `PATCH` plus `DUPLICATE_REQUEST`; 422 `SHORT_QTY_EXCEEDS_PLANNED` ·
`LOADED_EXCEEDS_AVAILABLE` (lower the loaded quantity first) · `LINE_NOT_IN_PLAN`.

### Loading Completed

#### `GET /tasks/:tripId/summary` — review before, record after
Works in every state. Header fields, `startedAt`, `completedAt`, `loadingSec`, `elapsedSec`, `idleSec`,
`departedShort`, `completedBy`, `progress`, `shortfall`, `planRevision`, and:

```json
{ "outlets": [ { "stopId": "…", "sequence": 1, "outlet": { "id": "…", "code": "OUT-T1", "name": "…", "district": "…" },
                 "orderReferences": ["ORD-T0001", "ORD-T0002"], "lineCount": 5,
                 "totalItems": 56, "loadedItems": 56, "remainingItems": 0, "status": "LOADED" } ],
  "completion": { "canComplete": true, "willDepartShort": false, "blockers": [] } }
```
Before completion this is the **review** (`completion.blockers` says what is left); after, the record.
It is built from the frozen load, so it stays correct after the orders and trip move on.

#### `POST /tasks/:tripId/complete` — "Review & Complete"
Body: `{ "planRevision": "…" }` (optional but recommended — pass the revision of the summary the loader
just reviewed). Holder only. Returns the summary (status `COMPLETED`).
Effects: session `COMPLETED` with `completedAt/By` and `departedShort`; trip **`LOADED`**; every
`PLANNED` order `LOADED` (all lines full) or `PARTIALLY_LOADED`; audit row — one transaction.
Errors: 422 `COMPLETION_BLOCKED` (`details.blockers`, e.g. `LINES_NOT_LOADED`, `EXCESS_LOADED`,
`REMOVED_LINES_STILL_LOADED`, `PLAN_CONSTRAINT_VIOLATION`, `NOTHING_TO_LOAD`); 409 `PLAN_CHANGED` ·
`TASK_NOT_STARTED` · `TASK_LOCKED` · `TASK_PAUSED` · `TASK_ON_HOLD` · `TASK_COMPLETED` (someone else
completed it) · `TRIP_NOT_LOADABLE`.

---

## 9. Error codes (`details.code`)

| Status | Code | Meaning |
|---|---|---|
| 403 | `NO_DEPOT` | loader has neither a `UserDepot` row nor an outlet |
| 403 | `ACCOUNT_INACTIVE` | account deactivated or not approved |
| 404 | `TASK_NOT_FOUND` | no such trip at the loader's depots, or its plan is not published |
| 409 | `TASK_LOCKED` | someone else holds it (`lockedBy`, `lockExpiresAt`) |
| 409 | `VEHICLE_BUSY` | another route of the same vehicle and day is being loaded (`routeCode`, `lockedBy`) |
| 409 | `TASK_NOT_STARTED` · `TASK_PAUSED` · `TASK_ON_HOLD` · `TASK_COMPLETED` | wrong state for this action |
| 409 | `TRIP_NOT_LOADABLE` | trip cancelled/departed or plan not published (`tripStatus`, `planStatus`) |
| 409 | `PLAN_CONSTRAINT_VIOLATION` | a hard operating constraint is broken (`violations`) |
| 409 | `PLAN_CHANGED` | the plan moved since the client's `planRevision` (current one returned) |
| 409 | `DUPLICATE_REQUEST` | `clientMutationId` already used for another report |
| 409 | `TASK_CHANGED` | a compare-and-set lost to an unclassified change; simply retry |
| 422 | `QTY_EXCEEDS_PLANNED` | would load more than `maxLoadableQty` |
| 422 | `LINE_NOT_IN_PLAN` | the line is not (or no longer) part of this trip's plan |
| 422 | `SHORT_QTY_EXCEEDS_PLANNED` · `LOADED_EXCEEDS_AVAILABLE` | shortfall report inconsistent with the plan / what is loaded |
| 422 | `COMPLETION_BLOCKED` | `blockers: [{ code, message, … }]` |
| 422 | – | request validation (`details: [{ field, message, code }]`) |

---

## 10. Assumptions and differences from the brief

1. **Module name.** The scaffold was `loading`, so that is the folder and the mount point
   (`/api/loading`), not `loader`.
2. **Task = trip.** Tasks are not assigned to a loader; the lock exists only while `IN_PROGRESS`.
3. **Depot scope.** A loader sees the depots in `UserDepot`; nothing creates those rows for loaders
   today (the employee approval flow only assigns an outlet), so with no rows the **outlet's depot** is
   used. A loader with neither gets 403 `NO_DEPOT`.
4. **"Today"** is the Asia/Colombo date; `?date=` selects another day (e.g. evening pre-loading for
   tomorrow's early runs). `CalendarDay` is not consulted — a non-operating day simply has no
   published plan.
5. **Priority** is derived (section 6); there is no stored priority.
6. **"Temporarily cancelled" ≠ trip `CANCELLED`.** A shortfall puts the *session* `ON_HOLD` and leaves the
   trip `LOADING`; cancelling the trip is terminal and would make the dispatcher's review un-doable.
7. **"A vehicle can carry more than one route"** is modelled by the dataset as two trips of one
   vehicle (`tripNumber` 1 or 2), not two loads at once. Loaders work them one after the other
   (`VEHICLE_BUSY`).
8. **Stops can hold two orders** (dry + chilled for one Fresh outlet), so a stop has `orders[]` and the
   lines carry `orderReference`.
9. **`departures`** on Home counts all scheduled trips (not only the remaining ones);
   `departuresRemaining` is the other reading.
10. The brief's loader screens show no notification to the dispatcher or driver. None is sent; the
    integration points are `Trip.status = LOADED`, the order statuses, and the open `Issue`.
11. `calendar.csv` is not in `backend/data_files` (only `outlets.csv`, `vehicles.csv`,
    `district_travel.csv`); the module does not need it.

---

## 11. Operating notes

* **Apply the migration** to each database: `cd backend && npx prisma migrate deploy`, then
  `npx prisma generate` (the client is git-ignored). Additive and safe on a live database. It was
  replayed from scratch on an empty Postgres 17 together with every earlier migration, and
  `prisma migrate diff` against `schema.prisma` is empty.
* **Config:** `LOADING_LOCK_TTL_MS` (optional, default 900000).
* **Releasing a hold — contract for the dispatcher flow.** Set `LoadingSession.status = 'PAUSED'`
  (leave `pausedAt`, so the idle time counts) and resolve the `Issue`. If the dispatcher *replans*
  instead of accepting the shortfall, also reset the flagged lines (`status = 'PENDING'`, `shortQty = 0`,
  `issueId = NULL`); flagged lines are otherwise treated as "accepted short".
* **Performance.** Prisma 7 loads each relation of a nested read as its own SQL statement, so a task
  detail read is about 20 statements (a stepper save about 21 including the transaction). That is
  invisible next to the database in the same region, noticeable over a long remote link. The
  `relationJoins` preview feature would make it one statement but would change the default for every
  module, so it is **not** enabled here. Prisma's pg adapter also prints a one-time
  `DeprecationWarning` about parallel queries inside a transaction; the existing orders module
  triggers it too.
* **Verification.** 64 integration checks ran the real Express app against a throwaway Postgres 17
  (two loaders racing, expired-lock takeover, plan changes mid-load, shortfall → hold → release →
  complete short, every constraint, every error code). They are not in the repository.
