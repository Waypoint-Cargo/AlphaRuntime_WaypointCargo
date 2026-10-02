import { AppError } from "../../utils/appError.js";
import { getPrisma } from "../../config/database.js";
import * as auditService from "../audit/audit.service.js";
import { findSetting, findSettingsByKeys, findSettingTx, upsertSettingTx } from "./settings.repository.js";
import { toSettingDTO, toSettingListDTO } from "./settings.dto.js";

// Known keys and the value used while no row is stored.
// (Per-key value rules live in settings.validator.js under the same key names.)
const SETTING_DEFAULTS = Object.freeze({
    order_cutoff_local_time: "16:00", // orders for the next day close at 4 PM
    near_capacity_threshold: 0.9,
});

const KNOWN_KEYS = Object.keys(SETTING_DEFAULTS);

const assertKnownKey = (key) => {
    if (!Object.hasOwn(SETTING_DEFAULTS, key)) {
        throw new AppError(`Unknown setting '${key}'.`, 404);
    }
};

// Used by every other module: the stored value, or the default when nothing is stored.
export const getSetting = async (key) => {
    assertKnownKey(key);
    const row = await findSetting(key);
    return row ? row.value : SETTING_DEFAULTS[key];
};

export const listSettingsService = async () => {
    const rows = await findSettingsByKeys(KNOWN_KEYS);
    const stored = new Map(rows.map((row) => [row.key, row]));

    return toSettingListDTO(
        KNOWN_KEYS.map((key) => {
            const row = stored.get(key);
            return {
                key,
                value: row ? row.value : SETTING_DEFAULTS[key],
                isDefault: !row,
                updatedAt: row?.updatedAt,
                updatedById: row?.updatedById,
            };
        }),
    );
};

export const updateSettingService = async ({ key, value, context }) => {
    assertKnownKey(key);

    const db = getPrisma();
    const saved = await db.$transaction(async (tx) => {
        const before = await findSettingTx(tx, key);
        const row = await upsertSettingTx(tx, { key, value, updatedById: context.actorId });

        await auditService.recordTx(tx, {
            ...context,
            action: "SETTING_UPDATED",
            entityType: "SystemSetting",
            entityId: key,
            before: { value: before ? before.value : SETTING_DEFAULTS[key], isDefault: !before },
            after: { value: row.value, isDefault: false },
        });

        return row;
    });

    return toSettingDTO({ ...saved, isDefault: false });
};
