// A setting as the client sees it. `isDefault` is true while no row is stored for the key.
export const toSettingDTO = ({ key, value, isDefault, updatedAt, updatedById }) => ({
    key,
    value,
    isDefault,
    updatedAt: updatedAt ?? null,
    updatedById: updatedById ?? null,
});

export const toSettingListDTO = (settings) => ({
    items: settings.map(toSettingDTO),
});
