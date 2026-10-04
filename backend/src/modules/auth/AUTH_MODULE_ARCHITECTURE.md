# Auth Module — Architecture & Pattern Reference

This document describes the architecture, conventions, and implementation patterns
used in `backend/src/modules/auth`. It exists so that **new feature modules
(`orders`, `fleet`, `employees`, etc.) can be built with the same structure and
standards**. Nothing in this file is prescriptive invention — every pattern described
here is observed directly from the existing auth code.

No source files were modified while writing this document.

---

## 1. Module file layout

Each module lives under `backend/src/modules/<module>/` and is split into strict,
single-responsibility layers. The auth module has six files:

```
auth/
├── auth.routes.js      # Express Router: wires URL + HTTP verb → middleware chain → controller
├── auth.controller.js  # HTTP layer: reads req, calls service, shapes res (status/cookies/body)
├── auth.service.js     # Business logic: orchestrates repository calls, enforces rules, throws AppError
├── auth.repository.js  # Data access only: thin Prisma query wrappers, no business logic
├── auth.dto.js         # Response shaping: strips sensitive/internal fields before they leave the service
└── auth.validator.js   # Zod schemas: request shape/format validation, used by the `validate` middleware
```

**Layering rule (strict one-way dependency chain):**

```
routes → controller → service → repository → Prisma (via getPrisma())
                   ↘ dto (service formats its return value through a DTO before returning)
```

- `routes` never talks to `service` or `repository` directly — only to `controller`.
- `controller` never talks to `repository` or Prisma directly — only to `service`.
- `service` never talks to Prisma directly — only through `repository` functions
  (the one exception is opening a `$transaction` via `getPrisma()`, see §5).
- `repository` contains **no branching business logic** — just parameterized Prisma
  calls, each with a one-line comment describing intent.
- `dto` transformers are called **only from the service layer**, never from the
  controller or repository. This guarantees raw Prisma rows never leak past the
  service boundary.

This mirrors a classic layered/controller-service-repository architecture, with an
explicit DTO stage bolted on for output sanitization.

---

## 2. `auth.routes.js` — Routing layer

Responsibilities:
1. Declare one `createRateLimiter(...)` instance per route (see §6), each with its own
   Redis key prefix, limit, and window.
2. Compose the middleware chain for every route in a fixed order:
   `[auth middleware (if needed)] → [rate limiter] → validate(schema) → catchAsync(controller)`
3. Export a single `Router` instance (`authRouter`) as the default export, to be
   mounted by `routes/index.js` (e.g. `router.use('/auth', authRoutes)`).

Observed ordering convention:
```js
// POST /auth/logout-all  — requires a valid access token
authRouter.post('/logout-all',
    authenticateUser,     // 1. identity must be established first (populates req.user)
    logoutAllLimiter,     // 2. rate limit can then key off req.user.id
    catchAsync(logoutAllController),
);
```
When a route doesn't require auth, `authenticateUser` is simply omitted and the rate
limiter's `keyGenerator` falls back to `req.ip` or a value from the (still
unvalidated at that point) `req.body`.

Every route gets a one-line comment stating the HTTP method + path, e.g.
`// POST /auth/login`.

`validate(schema)` always comes **immediately before** `catchAsync(controller)`, so
the controller can trust `req.body` is already sanitized/typed.

---

## 3. `auth.controller.js` — HTTP layer

Responsibilities: translate between the HTTP world (req/res, headers, cookies,
status codes) and the plain-JS service world. Controllers are intentionally thin.

Key conventions observed:

- **Exported as named async functions**, one per route, named `<action>Controller`
  (`loginController`, `registerController`, …). No default export, no classes.
- Every controller is wrapped by `catchAsync` at the route-registration site (not
  inside the controller itself) — so controllers can `throw` freely and never need
  try/catch for propagating errors.
- Controllers **destructure only what they need** from `req.body` / `req.user`, pass
  it to the matching `*Service` function, and pass the result into a single shared
  response helper.
- A local, module-scoped helper builds any response shape shared across multiple
  controllers (here: `sendSession`, `readRefreshToken`, `clientInfo`, `isMobileClient`)
  instead of duplicating logic per controller. These helpers sit at the top of the
  file above the exported controllers.
- All success responses go through the shared `sendSuccess(res, { statusCode, message, data })`
  utility (`utils/apiResponse.js`) — controllers never call `res.json()` directly.
- Controllers throw `AppError(message, statusCode)` for request-level problems that
  are purely HTTP-shaped (e.g. "missing token in header/cookie") — business-rule
  errors are thrown deeper, in the service.
- Cookie/env-dependent behavior (secure flag, sameSite, path, maxAge) is centralized
  in one `COOKIE_OPTIONS` object built once from `config`, not repeated inline.
- Dual client support (web cookie vs. mobile body token) is handled via a small
  `isMobileClient(req)` predicate checked at the top of any controller/helper that
  needs to branch — this pattern generalizes to "any cross-cutting request-shape
  decision gets its own tiny named predicate function near the top of the file."

Controller signature pattern:
```js
export const xController = async (req, res) => {
    const { field1, field2 } = req.body; // already validated
    const result = await xService({ field1, field2, ...derivedContext(req) });
    return sendSuccess(res, { statusCode: 200, message: "...", data: result });
};
```

---

## 4. `auth.service.js` — Business logic layer

This is where all business rules, security checks, and orchestration across multiple
repository calls live.

Conventions:

- **Named exports**, one function per use case, named `<action>Service`, always
  accepting a **single destructured options object** (never positional args):
  `loginService({ identifier, password, deviceId, userAgent, ip })`.
- All domain/validation failures are raised via `throw new AppError(message, statusCode)`
  — never return `{ error: ... }` objects, never return `null`/`false` to signal
  failure for anything the caller must act on.
- Each `AppError` gets a specific, user-facing message and the correct HTTP status
  (401 unauthenticated, 403 forbidden/unapproved, 409 conflict, 429 rate/lockout,
  400 bad input at the business-rule level).
- Security-sensitive logic is commented inline with a short rationale, not just a
  description, e.g.:
  ```js
  // TIMING ATTACK PREVENTION:
  const hashToCompare = user ? user.password : DUMMY_HASH;
  ```
  ```js
  // REUSE ATTACK: if the token is already revoked, a previously-rotated token
  // is being replayed. Revoke the entire family to invalidate all derived tokens.
  ```
  This documents *why*, not *what* — the "what" is already obvious from the code.
- Services call **only repository functions** for persistence, and **DTO functions**
  to shape their return value. A service's return value is always either `void`
  (for fire-and-forget actions like `logoutService`) or the output of a `to*DTO(...)`
  call — never a raw Prisma record.
- Side effects that are not persistence (e.g. sending email via
  `sendPasswordResetEmail`) are called directly from the service, after the DB write
  completes.
- Security-relevant constants (lockout thresholds, salt rounds, dummy bcrypt hash)
  are declared as top-of-file `const`s, sourced from `config` where they are
  environment-tunable (`config.maxLoginAttempts`, `config.lockoutDurationMs`) and
  hardcoded where they are a fixed security parameter (`SALT_ROUNDS = 12`).
- Enumeration-prevention pattern: handlers that must not reveal whether a resource
  exists (e.g. `forgotPasswordService`) silently `return` on a not-found/inactive
  case instead of throwing, and the controller always sends the same generic
  success message regardless of outcome.
- Token/session lifecycle logic (rotation, reuse-detection, family revocation,
  blocklisting) is fully contained in the service — repository functions only ever
  perform one Prisma operation each.

Service signature pattern:
```js
export const xService = async ({ field1, field2, ...context }) => {
    const record = await findXxx(...);              // repository
    if (!record) throw new AppError("...", 404);     // business rule
    // ... more checks / side effects ...
    return toXxxResponseDTO(record, ...);             // dto
};
```

---

## 5. `auth.repository.js` — Data access layer

Conventions:

- Every exported function is a **thin, named wrapper around one Prisma call**
  (`db.user.findUnique`, `db.refreshToken.updateMany`, etc.). No conditionals that
  encode business rules — at most a `?? null` default for optional columns.
- Each function gets `const db = getPrisma();` at the top (lazy client resolution
  via `config/database.js`), then immediately returns the Prisma call.
- Every function has a one-line `//` comment above it describing intent in plain
  English (e.g. `// revoke a single refresh token by its DB id (used during normal rotation)`).
- Prisma `select` objects are **explicit, never `select: undefined`/implicit-all** —
  sensitive columns (like `password`) are only selected in the one function that
  legitimately needs it (`findUserForLogin`), and reusable select shapes are
  factored into a shared `const` (`userSessionSelect`) and spread (`...userSessionSelect`)
  into more specific selects.
- **Transaction-aware variants**: any repository function that must participate in a
  multi-step atomic operation has a `*Tx(tx, ...)` twin (e.g. `createUser` /
  `createUserTx`, `invalidateUserPasswordResets` / `invalidateUserPasswordResetsTx`).
  The `Tx` variant takes the Prisma transaction client (`tx`) as its first argument
  instead of calling `getPrisma()` itself, and is called from inside a
  `db.$transaction(async (tx) => { ... })` block in the service.
- Repository functions are not required to validate their inputs — that responsibility
  sits upstream (validator schema + service-level checks).

---

## 6. `auth.validator.js` — Request validation layer

Conventions:

- Built entirely on **Zod**. Every schema wraps the parts of the request it governs
  in a single object: `z.object({ body: z.object({...}) })` (also supports `query`
  and `params` siblings — see `middlewares/validate.js`, §7).
- Reusable field-level schemas are factored out as top-level `const`s with
  self-documenting names (`sanitizedEmail`, `strongPassword`, `sanitizedEmployeeNumber`,
  `registrableRole`) and reused across multiple route schemas via spreading/reference.
- Every `.min()/.max()/.regex()/.refine()` call carries a **user-facing error message**
  string as its second argument — never a bare validator with default Zod messages.
- String fields that come from user input and will be used for lookups/comparisons
  are normalized at the schema level: `.trim()`, `.toLowerCase()`.
- Defense-in-depth input sanitization happens at this layer even though it duplicates
  some app-level protection, e.g. rejecting null bytes/control characters in
  passwords via `.refine()`.
- Enum-like fields pull their allowed values from the Prisma-generated enum
  (`Role` from `../../generated/prisma/index.js`) rather than hardcoding strings, so
  the validator always stays in sync with the schema.
- One exported schema per route/use case, named `<action>Schema`
  (`loginSchema`, `registerSchema`, `forgotPasswordSchema`, ...), matching the
  `<action>Service`/`<action>Controller` naming used in the other layers.

---

## 7. `auth.dto.js` — Response shaping layer

Conventions:

- Documented at the top of the file with the *rule* it enforces (see the file's own
  header comment): **nothing from the service layer should reach the controller as
  a raw Prisma object** — everything passes through a DTO transformer first.
- Each transformer is a **named, pure function** `to<Thing>DTO(...)` that takes raw
  domain object(s) (plus any extra fields like freshly-issued tokens) and returns a
  plain object literal containing only client-safe fields.
- Transformers compose: `toLoginResponseDTO` calls `toUserDTO` internally rather than
  duplicating the user-shaping logic.
- DTOs never contain `password`, internal flags, or anything not meant for the
  wire format.

---

## 8. Cross-cutting middleware used by the module

These live outside the module (`backend/src/middlewares/`, `backend/src/utils/`) but
the auth module is the primary/canonical consumer and establishes how they're used.

### `middlewares/validate.js`
- Generic Express middleware factory: `validate(zodSchema)` returns `(req, res, next) => ...`.
- Parses `req.body` (handling a `data`-wrapped multipart case and malformed JSON),
  plus `req.query`/`req.params`, through `schema.safeParse(...)`.
- On failure: responds `422` directly with a normalized `{ success: false, message, details: [{field, message, code}], requestId }` shape — it does **not** throw/forward to `errorHandler`.
- On success: overwrites `req.body`/`req.params`/`req.query` with the parsed
  (trimmed/coerced) values so downstream code always sees sanitized data.

### `middlewares/authenticate.js`
- `authenticateUser`: wraps itself in `catchAsync`, extracts a Bearer token,
  verifies it (`verifyAccessToken`), checks a Redis blocklist (`isBlocklisted`), and
  checks a per-user "invalidate before" timestamp (`getUserInvalidateBefore`) to
  support instant logout-all. Populates `req.user = { id, username, role }` and
  `req.accessToken`.
- `requireRole(...roles)`: a small curried middleware factory for role-gating routes
  downstream of `authenticateUser` — not currently used in auth routes but exported
  for other modules to use (e.g. `router.get('/x', authenticateUser, requireRole('ADMIN'), ...)`).

### `middlewares/rateLimiter.js`
- `createRateLimiter({ redis, limit, windowMs, prefix, errorMessage, keyGenerator, fallbackBehavior, onRedisError })`
  returns Express middleware implementing a Redis Lua-script fixed-window limiter.
- **One instance per route**, each with its own `prefix` (Redis key namespace) and
  `keyGenerator` tailored to that route's identity concept (`req.user?.id ?? req.ip`
  for authenticated routes, `req.body?.email ?? req.ip` for pre-auth email-keyed
  routes).
- `fallbackBehavior: 'block'` is used on every auth route so a Redis outage **fails
  closed** on security-sensitive endpoints (reject the request) rather than open.
- `onRedisError` always logs a `logger.warn(...)` with a descriptive message — never
  silently swallowed.

### `utils/apiResponse.js` — `sendSuccess`
- The single shared helper for all success responses:
  `{ success: true, message, data, requestId, meta? }`.

### `utils/appError.js` — `AppError`
- Custom `Error` subclass carrying `statusCode`, `details`, and `isOperational`.
  `isOperational: true` (default) marks it as a trusted, intentionally-thrown error
  whose `message`/`details` are safe to show the client as-is.

### `middlewares/errorHandler.js`
- Final Express error-handling middleware (registered last in `app.js`).
- Only trusts `message`/`details` from `AppError` instances with `isOperational: true`;
  anything else is logged with its full stack and replaced with a generic message in
  production.
- Always responds with `{ success: false, message, details?, requestId }`.

### `utils/catchAsync.js`
- `catchAsync(fn)` wraps an async Express handler so any rejected promise is
  forwarded to `next(err)` → `errorHandler`. Applied at the **route-registration
  call site**, not inside controllers/service functions.

### `utils/tokens.js` / `utils/tokenBlocklist.js`
- JWT signing/verification (`signAccessToken`, `signRefreshToken`, `verifyAccessToken`,
  `verifyRefreshToken`) and SHA-256 hashing helpers for both token types, used so raw
  tokens are never stored — only their hashes (refresh tokens in Postgres via
  `auth.repository.js`, access tokens in Redis via the blocklist).
- `tokenBlocklist.js` implements the Redis-backed access-token revocation primitives
  (`addToBlocklist`, `isBlocklisted`) and the per-user "invalidate before" timestamp
  used for instant global logout (`setUserInvalidateBefore`, `getUserInvalidateBefore`).

---

## 9. Request/response flow (end-to-end example: `POST /auth/login`)

```
Client
  └─▶ app.js            CORS, helmet, body parsing, request logging, requestId
       └─▶ routes/index.js      mounts authRouter at /api/auth
            └─▶ auth.routes.js  POST /login
                 ├─ loginLimiter         (Redis fixed-window, 5/min, keyed by req.ip, fail-closed)
                 ├─ validate(loginSchema) (Zod: parses & sanitizes identifier (employee number or email)/password/deviceId)
                 └─ catchAsync(loginController)
                      └─▶ auth.controller.js: loginController
                           ├─ reads req.body + clientInfo(req) {userAgent, ip}
                           └─▶ auth.service.js: loginService
                                ├─ auth.repository.js: findUserForLogin()
                                ├─ bcrypt.compare() with timing-attack-safe dummy hash
                                ├─ lockout / failed-attempt bookkeeping (repository calls)
                                ├─ isActive / isApproved checks → AppError(403) if failing
                                ├─ sign access + refresh JWT (utils/tokens.js)
                                ├─ auth.repository.js: storeRefreshToken() (hashed)
                                └─▶ auth.dto.js: toLoginResponseDTO(user, accessToken, refreshToken)
                           ◀── plain DTO object returned to controller
                           └─ sendSession(req, res, {message, result})
                                ├─ mobile client → token in JSON body (sendSuccess)
                                └─ web client    → token in httpOnly cookie + sendSuccess(body w/o token)
  ◀─────────────────────────────────────────────────────────────────────────── 200 JSON response

  (any throw at any layer) ──▶ caught by catchAsync ──▶ next(err) ──▶ errorHandler ──▶ JSON error response
```

Key properties this flow demonstrates, to replicate in new modules:
- Errors are thrown as plain exceptions anywhere in the call stack and always
  bubble up to the single global `errorHandler` — no per-layer try/catch for
  control flow, only where an error must be *handled* (e.g. revoking a token on
  verify failure) before optionally re-throwing.
- Every layer receives/returns plain objects, not framework-specific types — only
  `controller` and `routes` ever touch `req`/`res` directly.
- Multi-client support (web vs. mobile) is resolved once, in the controller, via a
  small predicate — services and lower layers are client-agnostic.

---

## 10. Naming & style conventions checklist (for new modules)

When creating a new module (e.g. `orders`), mirror these conventions:

- [ ] File names: `<module>.routes.js`, `<module>.controller.js`, `<module>.service.js`,
      `<module>.repository.js`, `<module>.dto.js`, `<module>.validator.js`.
- [ ] All exports are **named** (no default exports except the Router itself in
      `*.routes.js`).
- [ ] Function naming is suffix-based and consistent across layers for the same
      use case: `xController` / `xService` / `to XxxResponseDTO` / `xSchema`.
- [ ] Service and controller functions take a **single destructured params object**,
      never a long positional argument list (repository functions are the one place
      positional args are used, e.g. `storeRefreshToken(userId, tokenHash, family, ...)`,
      but this is less strict).
- [ ] Every thrown error is an `AppError(message, statusCode)` with a clear,
      user-facing message and correct status code — never a raw `Error` or a
      silently-returned falsy value.
- [ ] Every repository function has a one-line intent comment above it.
- [ ] Any non-obvious security/business decision gets an inline comment explaining
      *why*, not what.
- [ ] Routes declare rate limiters inline at the top of the file (one per route,
      scoped Redis prefix, `fallbackBehavior: 'block'` for sensitive mutations),
      then compose `[authenticateUser] → limiter → validate(schema) → catchAsync(controller)`.
- [ ] All Zod schemas wrap `body`/`query`/`params`, reuse shared field-level
      sub-schemas, and give every validator a human-readable message.
- [ ] All responses — success or error — go through `sendSuccess` /
      `errorHandler` so the response envelope (`success`, `message`, `data`/`details`,
      `requestId`) is consistent across the entire API.
- [ ] New module is registered by adding one line to `routes/index.js`:
      `router.use('/<module>', <module>Routes);`.
