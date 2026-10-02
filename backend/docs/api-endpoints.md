# Waypoint API endpoints

97 endpoints in 22 modules. Generated from the route files; every path is under `/api`.

## Conventions

- **Authentication:** every endpoint except register, login, refresh, logout, forgot-password and reset-password needs `Authorization: Bearer <access token>`.
- **Roles:** the roles column lists who may call the endpoint; "any signed-in user" endpoints check scope inside the service. Store managers act on their own outlet, dispatchers and loaders on their depots, drivers on their own trips, ADMIN everywhere the endpoint allows it.
- **Rate limit:** requests per minute per user (per IP before sign-in), counted separately for each endpoint. Reads default to 120, writes to 30; exceptions are the upload (20), pings and sync (60) and the stricter authentication limits. Over the limit the answer is 429 with `Retry-After`.
- **Success:** `{ success: true, message, data, requestId }`. Lists use `data: { items, pagination: { page, pageSize, total } }`.
- **Errors:** `{ success: false, message, details?, requestId }` with 400 (malformed), 401 (not signed in), 403 (not allowed), 404, 409 (state conflict; `details[].code` names it, e.g. `VEHICLE_BUSY`), 413, 415, 422 (validation; `details[]` has `field`, `message`, `code`) or 429.
- **Dates and times:** business dates are `YYYY-MM-DD` in Asia/Colombo; timestamps are ISO-8601 (device times must carry an offset).
- **Offline work:** mutating field calls take an optional `clientMutationId` and can be replayed through `POST /sync/batch` (types: TRIP_DEPARTED, STOP_EVENT, STOP_PROOF, ISSUE_REPORTED, LOCATION_PINGS for drivers; LOAD_ITEM_CHECKED, LOADING_COMPLETED, ISSUE_REPORTED for loaders).
- **Larger request bodies:** the default JSON limit is 10 KB; `/api/sync` accepts 256 KB and `POST /api/forecast/import` 2 MB.

## All endpoints

| Method | Path | Roles | Limit/min | Purpose |
|---|---|---|---|---|
| POST | `/auth/login` | public | 5 | Sign in with employee number and password; returns an access token (and a refresh token for mobile clients). |
| POST | `/auth/register` | public | 5 | Register an account; it stays unapproved until an administrator approves it. |
| POST | `/auth/refresh` | public | 10 | Exchange a refresh token for a new access token. |
| POST | `/auth/logout` | public | 20 | End the current session by revoking its refresh token. |
| POST | `/auth/logout-all` | any signed-in user | 5 | End every session of the signed-in user. |
| POST | `/auth/forgot-password` | public | 3 | Send a password-reset link by email. |
| POST | `/auth/reset-password` | public | 5 | Set a new password with a reset token. |
| POST | `/auth/change-password` | any signed-in user | 5 | Change the password of the signed-in user (starts a fresh session). |
| GET | `/auth/me` | any signed-in user | 120 | The signed-in user's profile with outlet or depots. |
| PATCH | `/users/me` | any signed-in user | 30 | Update the signed-in user's own name, phone and avatar. |
| GET | `/users` | ADMIN | 120 | List users (filter by role, approval, status; search). |
| GET | `/users/:id` | ADMIN | 120 | One user in detail. |
| PATCH | `/users/:id/approve` | ADMIN | 30 | Approve a registration and assign the role with its outlet or depots. |
| PATCH | `/users/:id/scope` | ADMIN | 30 | Change a user's role, outlet or depots. |
| PATCH | `/users/:id/status` | ADMIN | 30 | Activate or deactivate a user. |
| GET | `/settings` | ADMIN, DISPATCHER | 120 | Read the system settings (order cut-off time, near-capacity threshold). |
| PUT | `/settings/:key` | ADMIN | 30 | Change one system setting. |
| GET | `/audit` | ADMIN | 120 | Search the audit log (entity, actor, action, date range). |
| GET | `/notifications` | any signed-in user | 120 | The signed-in user's notifications, optionally unread only. |
| GET | `/notifications/unread-count` | any signed-in user | 120 | How many notifications are unread. |
| POST | `/notifications/read-all` | any signed-in user | 30 | Mark all notifications as read. |
| PATCH | `/notifications/:id/read` | any signed-in user | 30 | Mark one notification as read. |
| GET | `/reference/depots` | any signed-in user | 120 | List the depots. |
| GET | `/reference/outlets` | STORE_MANAGER, DISPATCHER, LOADER, ADMIN | 120 | List outlets (filter by depot, brand, district, mall, van-only; search). |
| GET | `/reference/outlets/:id` | STORE_MANAGER, DISPATCHER, LOADER, ADMIN | 120 | One outlet with its delivery window and access constraints. |
| GET | `/reference/calendar` | any signed-in user | 120 | The operating calendar for a date range (paydays, festivals, monsoon). |
| GET | `/reference/cutoff` | STORE_MANAGER, DISPATCHER | 120 | The order cut-off for a delivery date and whether it is still open. |
| GET | `/fleet` | DISPATCHER, ADMIN | 120 | List vehicles (filter by depot, type, refrigeration, status; search). |
| GET | `/fleet/summary` | DISPATCHER | 120 | Vehicle counts for a date: active, refrigerated, with trips, in transit. |
| GET | `/fleet/my-vehicle` | DRIVER | 120 | The driver's own vehicle with its trips on a date and weekly fuel. |
| GET | `/fleet/:id` | DISPATCHER, ADMIN, DRIVER | 120 | One vehicle with its trips on a date and weekly fuel. |
| PATCH | `/fleet/:id` | ADMIN | 30 | Activate or deactivate a vehicle, set its status note or default driver. |
| POST | `/orders` | STORE_MANAGER | 30 | Create an order, optionally submitting it at once. |
| GET | `/orders` | STORE_MANAGER, DISPATCHER, ADMIN | 120 | List orders (date, status, brand, temperature, outlet, search). |
| GET | `/orders/summary` | STORE_MANAGER, DISPATCHER, ADMIN | 120 | Order counts by status and brand for a date. |
| GET | `/orders/:id/checks` | STORE_MANAGER, DISPATCHER | 120 | The checks an order must pass before confirmation (window, capacity, cut-off). |
| GET | `/orders/:id` | STORE_MANAGER, DISPATCHER, ADMIN | 120 | One order with items, history, allocation, deferral and receipt. |
| PATCH | `/orders/:id` | STORE_MANAGER | 30 | Edit an order that is still a draft or pending review (version-checked). |
| POST | `/orders/:id/submit` | STORE_MANAGER | 30 | Submit a draft for review. |
| POST | `/orders/:id/confirm` | STORE_MANAGER | 30 | Confirm an order; it rolls to the next run when the cut-off has passed. |
| POST | `/orders/:id/cancel` | STORE_MANAGER | 30 | Cancel an order. |
| GET | `/trips` | DISPATCHER, LOADER | 120 | List trips of a date and depot, or of a plan. |
| PATCH | `/trips/sequence-requests/:requestId` | DISPATCHER | 30 | Approve or reject a stop-order request. |
| GET | `/trips/:id` | DISPATCHER, LOADER, DRIVER | 120 | One trip with its stops, orders and totals. |
| PATCH | `/trips/:id/sequence` | DISPATCHER | 30 | Reorder the stops of a trip. |
| PATCH | `/trips/:id/driver` | DISPATCHER | 30 | Assign another driver to a trip. |
| POST | `/trips/:id/sequence-requests` | DRIVER | 30 | A driver asks to change the stop order of a trip. |
| GET | `/trips/:id/sequence-requests` | DISPATCHER, DRIVER | 120 | The stop-order requests of a trip. |
| GET | `/allocations/vehicle-options` | DISPATCHER | 120 | Vehicles and trip numbers that can take an order, with the reasons for the others. |
| POST | `/allocations/validate` | DISPATCHER | 120 | Run the allocation checks for an order on a vehicle trip without saving. |
| POST | `/allocations` | DISPATCHER | 30 | Allocate an order to a vehicle trip (warnings must be acknowledged). |
| DELETE | `/allocations/:orderId` | DISPATCHER | 30 | Take an order off its trip. |
| POST | `/plans/close` | DISPATCHER | 30 | Close order intake for a depot and date and start planning. |
| GET | `/plans` | DISPATCHER, ADMIN | 120 | List plans. |
| GET | `/plans/:id` | DISPATCHER, ADMIN | 120 | One plan with its trips and queue counts. |
| GET | `/plans/:id/queue` | DISPATCHER, ADMIN | 120 | The orders of a plan that are waiting to be planned. |
| POST | `/plans/:id/publish` | DISPATCHER | 30 | Publish the plan: loading sessions, fuel ledger, driver and store notifications. |
| POST | `/deferrals` | DISPATCHER | 30 | Defer an order to the next operating day with a reason. |
| GET | `/deferrals` | DISPATCHER, ADMIN | 120 | List deferrals. |
| GET | `/deferrals/summary` | DISPATCHER, ADMIN | 120 | Deferral counts for a date. |
| GET | `/deferrals/outlets/:outletId/history` | DISPATCHER, ADMIN | 120 | An outlet's deferral history. |
| GET | `/deferrals/:id` | DISPATCHER, ADMIN | 120 | One deferral with the outlet's recent deferrals. |
| PATCH | `/deferrals/:id/decision` | DISPATCHER | 30 | Decide a pending deferral. |
| POST | `/deferrals/:id/replan` | DISPATCHER | 30 | Bring a deferred order back into planning. |
| POST | `/files` | DRIVER, LOADER, STORE_MANAGER, DISPATCHER | 20 | Upload a signature or photo (JPEG, PNG or WEBP up to 5 MB; idempotent by clientFileId). |
| GET | `/files/:id` | any signed-in user | 120 | Download a stored image (uploader, admin, the depot's dispatcher, the outlet's store manager). |
| POST | `/issues` | LOADER, DRIVER, STORE_MANAGER, DISPATCHER | 30 | Report an issue; its source follows the reporter's role. |
| GET | `/issues` | any signed-in user | 120 | List issues in the caller's scope (status, source, type, order, trip, dates). |
| GET | `/issues/:id` | any signed-in user | 120 | One issue with its photos. |
| PATCH | `/issues/:id/status` | DISPATCHER | 30 | Move an issue to INVESTIGATING or RESOLVED. |
| GET | `/loading/summary` | LOADER | 120 | Loading progress for a date: trips and items by status. |
| GET | `/loading/tasks` | LOADER | 120 | The day's loading tasks (trips), sorted by vehicle, with progress. |
| GET | `/loading/tasks/:tripId` | LOADER | 120 | One loading task: stops, load sequence and every item. |
| POST | `/loading/tasks/:tripId/start` | LOADER | 30 | Start loading a trip. |
| PATCH | `/loading/tasks/:tripId/items/:orderItemId` | LOADER | 30 | Record what was loaded for one item. |
| POST | `/loading/tasks/:tripId/complete` | LOADER | 30 | Finish loading; a shortfall needs departShort. |
| GET | `/deliveries/today` | DRIVER | 120 | The driver's route bundle for a day. |
| GET | `/deliveries/summary` | DRIVER | 120 | Stops total, completed and on time, and the next stop. |
| POST | `/deliveries/trips/:tripId/depart` | DRIVER | 30 | Leave the depot (the vehicle must not be out on another trip). |
| POST | `/deliveries/stops/:stopId/events` | DRIVER | 30 | Record ARRIVED, UNLOADING_STARTED, FAILED or SKIPPED at a stop. |
| POST | `/deliveries/stops/:stopId/proof` | DRIVER | 30 | Submit the proof of delivery: receiver, signature, photos, delivered quantities. |
| POST | `/receipts/orders/:orderId` | STORE_MANAGER | 30 | Confirm receipt of a delivered order. |
| GET | `/receipts/orders/:orderId/proof` | STORE_MANAGER, DISPATCHER | 120 | The proof of delivery of an order against what was ordered. |
| POST | `/sync/batch` | DRIVER, LOADER | 60 | Replay up to 50 offline changes; the Idempotency-Key header is required. |
| POST | `/tracking/trips/:tripId/pings` | DRIVER | 60 | Send GPS pings of a trip that is on the road (1 to 100 per request). |
| GET | `/tracking/live` | DISPATCHER | 120 | The dispatcher's live view of the day's trips with last position and delays. |
| GET | `/tracking/outlet` | STORE_MANAGER | 120 | A store manager's view of today's trips to their outlet (own stop only). |
| GET | `/tracking/trips/:tripId` | DISPATCHER, DRIVER | 120 | The last 200 pings and the stop statuses of a trip. |
| GET | `/dashboards/dispatcher` | DISPATCHER | 120 | Dispatcher KPIs, order pipeline, attention items and operational health. |
| GET | `/dashboards/store-manager` | STORE_MANAGER | 120 | Store manager KPIs, today's deliveries, current delivery and recent issues. |
| GET | `/dashboards/loader` | LOADER | 120 | The loader's loading summary for a date. |
| GET | `/employees` | STORE_MANAGER | 120 | List the outlet's staff (role, active, search). |
| POST | `/employees` | STORE_MANAGER | 30 | Add an employee to the outlet. |
| PATCH | `/employees/:id` | STORE_MANAGER | 30 | Update an employee of the outlet. |
| POST | `/forecast/import` | ADMIN | 30 | Import a model's demand forecast (up to 5000 rows; upserts per date, depot, brand, temperature class and model version). |
| GET | `/forecast/demand` | DISPATCHER | 120 | Forecast demand for a date range (at most 92 days; the latest model per date unless one is named). |
| GET | `/forecast/capacity` | DISPATCHER | 120 | Vehicles and drivers needed against the active fleet for a week, with the formula used. |
