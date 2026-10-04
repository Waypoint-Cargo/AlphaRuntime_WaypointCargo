-- Business constraints, sequences and the weekly-fuel view.
-- Hand-written: Prisma's schema language cannot express any of this.
--
-- Every rule violation is raised with SQLSTATE 23514 (check_violation), so the
-- application's central error handler turns it into HTTP 422 carrying the message below.
-- Application code checks the same rules first and explains them to the user;
-- these are the safety net for anything that bypasses a service.

-- ---------------------------------------------------------------------------
-- 1. Reference sequences (used through raw SQL in the repositories: nextval('...'))
-- ---------------------------------------------------------------------------

CREATE SEQUENCE order_ref_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 NO CYCLE; -- ORD-000001
CREATE SEQUENCE issue_ref_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 NO CYCLE; -- ISS-001
CREATE SEQUENCE trip_code_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 NO CYCLE; -- R-001

-- ---------------------------------------------------------------------------
-- 2. CHECK constraints
-- ---------------------------------------------------------------------------

-- "A vehicle can run up to two routes per day"
ALTER TABLE "Trip" ADD CONSTRAINT trip_number_chk CHECK ("tripNumber" IN (1, 2));

-- uploads are at most 5 MB
ALTER TABLE "File" ADD CONSTRAINT file_size_chk CHECK ("sizeBytes" > 0 AND "sizeBytes" <= 5242880);

-- ---------------------------------------------------------------------------
-- 3. Vehicle: the default driver must hold the DRIVER role
-- ---------------------------------------------------------------------------

CREATE FUNCTION vehicle_driver_role_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."defaultDriverId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "User" u WHERE u.id = NEW."defaultDriverId" AND u.role = 'DRIVER'
  ) THEN
    RAISE EXCEPTION 'A vehicle''s default driver must be a user with the DRIVER role.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER vehicle_driver_role
  BEFORE INSERT OR UPDATE OF "defaultDriverId" ON "Vehicle"
  FOR EACH ROW EXECUTE FUNCTION vehicle_driver_role_fn();

-- ---------------------------------------------------------------------------
-- 4. Order: depot and brand are copies of the outlet's and must stay equal to them
-- ---------------------------------------------------------------------------

CREATE FUNCTION order_outlet_consistency_fn() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  outlet_depot text;
  outlet_brand "Brand";
BEGIN
  SELECT o."depotId", o.brand INTO outlet_depot, outlet_brand FROM "Outlet" o WHERE o.id = NEW."outletId";

  IF NEW."depotId" <> outlet_depot THEN
    RAISE EXCEPTION 'An order''s depot must be the depot of its outlet.' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.brand <> outlet_brand THEN
    RAISE EXCEPTION 'An order''s brand must be the brand of its outlet.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER order_outlet_consistency
  BEFORE INSERT OR UPDATE OF "outletId", "depotId", brand ON "Order"
  FOR EACH ROW EXECUTE FUNCTION order_outlet_consistency_fn();

-- ---------------------------------------------------------------------------
-- 5. Trip: same date and depot as its plan; the driver holds the DRIVER role
-- ---------------------------------------------------------------------------

CREATE FUNCTION trip_consistency_fn() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  plan_date  date;
  plan_depot text;
  vehicle_depot text;
BEGIN
  SELECT p."deliveryDate", p."depotId" INTO plan_date, plan_depot FROM "DispatchPlan" p WHERE p.id = NEW."planId";

  IF NEW."deliveryDate" <> plan_date THEN
    RAISE EXCEPTION 'A trip''s delivery date must equal the date of its dispatch plan.' USING ERRCODE = 'check_violation';
  END IF;

  SELECT v."homeDepotId" INTO vehicle_depot FROM "Vehicle" v WHERE v.id = NEW."vehicleId";
  IF vehicle_depot <> plan_depot THEN
    RAISE EXCEPTION 'A trip''s vehicle must operate from the depot of its dispatch plan.' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW."driverId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "User" u WHERE u.id = NEW."driverId" AND u.role = 'DRIVER'
  ) THEN
    RAISE EXCEPTION 'A trip''s driver must be a user with the DRIVER role.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trip_consistency
  BEFORE INSERT OR UPDATE OF "planId", "vehicleId", "driverId", "deliveryDate" ON "Trip"
  FOR EACH ROW EXECUTE FUNCTION trip_consistency_fn();

-- ---------------------------------------------------------------------------
-- 6. Allocation: the hard rules. Advisory lock + service checks prevent races;
--    this is the last line of defence.
-- ---------------------------------------------------------------------------

CREATE FUNCTION allocation_rules_fn() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  o "Order"%ROWTYPE;
  s "Stop"%ROWTYPE;
  t "Trip"%ROWTYPE;
  v "Vehicle"%ROWTYPE;
  outlet_van_only boolean;
  load_weight numeric;
  load_volume numeric;
BEGIN
  SELECT * INTO o FROM "Order" WHERE id = NEW."orderId";
  SELECT * INTO s FROM "Stop"  WHERE id = NEW."stopId";
  SELECT * INTO t FROM "Trip"  WHERE id = s."tripId";
  SELECT * INTO v FROM "Vehicle" WHERE id = t."vehicleId";

  IF s."outletId" <> o."outletId" THEN
    RAISE EXCEPTION 'An order must be allocated to a stop at its own outlet.' USING ERRCODE = 'check_violation';
  END IF;
  IF t."deliveryDate" <> o."deliveryDate" THEN
    RAISE EXCEPTION 'An order must be allocated to a trip on its delivery date.' USING ERRCODE = 'check_violation';
  END IF;
  IF v."homeDepotId" <> o."depotId" THEN
    RAISE EXCEPTION 'An order must be allocated to a vehicle of its own depot.' USING ERRCODE = 'check_violation';
  END IF;
  IF o."tempClass" IN ('CHILLED', 'FROZEN') AND NOT v."isRefrigerated" THEN
    RAISE EXCEPTION 'Chilled and frozen orders need a refrigerated vehicle.' USING ERRCODE = 'check_violation';
  END IF;

  SELECT ou."vanOnly" INTO outlet_van_only FROM "Outlet" ou WHERE ou.id = o."outletId";
  IF COALESCE(o."vanOnly", outlet_van_only) AND v.type <> 'VAN' THEN
    RAISE EXCEPTION 'This outlet can only be served by a van.' USING ERRCODE = 'check_violation';
  END IF;

  -- a load must fit both the weight and the volume limit
  SELECT COALESCE(SUM(o2."totalWeightKg"), 0), COALESCE(SUM(o2."totalVolumeM3"), 0)
    INTO load_weight, load_volume
    FROM "Allocation" a2
    JOIN "Stop"  s2 ON s2.id = a2."stopId"
    JOIN "Order" o2 ON o2.id = a2."orderId"
   WHERE s2."tripId" = t.id AND a2.id <> NEW.id;

  IF load_weight + o."totalWeightKg" > v."maxWeightKg" THEN
    RAISE EXCEPTION 'The trip would exceed the vehicle''s weight limit.' USING ERRCODE = 'check_violation';
  END IF;
  IF load_volume + o."totalVolumeM3" > v."maxVolumeM3" THEN
    RAISE EXCEPTION 'The trip would exceed the vehicle''s volume limit.' USING ERRCODE = 'check_violation';
  END IF;

  -- only when a new allocation is created (later updates must not fail because
  -- a vehicle was deactivated or an order moved on since)
  IF TG_OP = 'INSERT' THEN
    IF NOT v."isActive" THEN
      RAISE EXCEPTION 'The vehicle is not active.' USING ERRCODE = 'check_violation';
    END IF;
    IF t.status <> 'PLANNED' THEN
      RAISE EXCEPTION 'Orders can only be allocated to a trip that is still PLANNED.' USING ERRCODE = 'check_violation';
    END IF;
    IF o.status NOT IN ('CONFIRMED', 'DEFERRED') THEN
      RAISE EXCEPTION 'Only confirmed or deferred orders can be allocated.' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER allocation_rules
  BEFORE INSERT OR UPDATE ON "Allocation"
  FOR EACH ROW EXECUTE FUNCTION allocation_rules_fn();

-- ---------------------------------------------------------------------------
-- 7. Append-only history tables: OrderEvent, StopEvent, AuditLog
--    Direct UPDATE/DELETE is refused. Two automatic foreign-key actions stay possible:
--      - deleting a user sets actorId to NULL (an UPDATE that changes nothing else)
--      - deleting a parent row cascades the delete (runs one trigger level deeper)
--    TRUNCATE is not intercepted.
-- ---------------------------------------------------------------------------

CREATE FUNCTION append_only_fn() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF pg_trigger_depth() > 1 THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION '% is append-only: rows cannot be deleted.', TG_TABLE_NAME USING ERRCODE = 'check_violation';
  END IF;

  IF NEW."actorId" IS NULL AND (to_jsonb(NEW) - 'actorId') = (to_jsonb(OLD) - 'actorId') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION '% is append-only: rows cannot be modified.', TG_TABLE_NAME USING ERRCODE = 'check_violation';
END $$;

CREATE TRIGGER orderevent_append_only BEFORE UPDATE OR DELETE ON "OrderEvent"
  FOR EACH ROW EXECUTE FUNCTION append_only_fn();
CREATE TRIGGER stopevent_append_only BEFORE UPDATE OR DELETE ON "StopEvent"
  FOR EACH ROW EXECUTE FUNCTION append_only_fn();
CREATE TRIGGER auditlog_append_only BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION append_only_fn();

-- ---------------------------------------------------------------------------
-- 8. Weekly fuel per vehicle (quota, used, remaining). One row per vehicle and ISO week
--    (weekStart = Monday) that has at least one ledger entry.
--    used = PLANNED litres of published plans, replaced by ACTUAL litres once a trip
--           reports them, plus ADJUSTMENT litres (may be negative).
--    Cancelled trips do not count.
-- ---------------------------------------------------------------------------

CREATE VIEW vehicle_week_fuel AS
SELECT
  e."vehicleId"                         AS "vehicleId",
  e."weekStart"                         AS "weekStart",
  v."weeklyFuelQuotaL"                  AS "quotaL",
  SUM(e.litres)                         AS "usedL",
  SUM(e."distanceKm")                   AS "usedKm",
  v."weeklyFuelQuotaL" - SUM(e.litres)  AS "remainingL"
FROM "FuelLedgerEntry" e
JOIN "Vehicle" v ON v.id = e."vehicleId"
LEFT JOIN "Trip" t ON t.id = e."tripId"
WHERE e.kind = 'ADJUSTMENT'
   OR (
        e.kind IN ('PLANNED', 'ACTUAL')
        AND t.status <> 'CANCELLED'
        AND NOT (
          e.kind = 'PLANNED'
          AND EXISTS (SELECT 1 FROM "FuelLedgerEntry" a WHERE a."tripId" = e."tripId" AND a.kind = 'ACTUAL')
        )
      )
GROUP BY e."vehicleId", e."weekStart", v."weeklyFuelQuotaL";
