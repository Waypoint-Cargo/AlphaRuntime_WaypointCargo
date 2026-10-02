import { getPrisma } from "../../config/database.js";

const settingSelect = { key: true, value: true, updatedById: true, updatedAt: true };

// one stored setting, or null when only the default applies
export const findSetting = async (key) => {
    const db = getPrisma();
    return db.systemSetting.findUnique({ where: { key }, select: settingSelect });
};

export const findSettingTx = (tx, key) => {
    return tx.systemSetting.findUnique({ where: { key }, select: settingSelect });
};

// stored rows for a list of keys
export const findSettingsByKeys = async (keys) => {
    const db = getPrisma();
    return db.systemSetting.findMany({ where: { key: { in: keys } }, select: settingSelect });
};

// create or overwrite a setting inside a transaction
export const upsertSettingTx = (tx, { key, value, updatedById }) => {
    return tx.systemSetting.upsert({
        where: { key },
        create: { key, value, updatedById },
        update: { value, updatedById },
        select: settingSelect,
    });
};
