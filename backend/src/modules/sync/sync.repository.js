import { getPrisma } from "../../config/database.js";

// ---- mutations already seen ----

export const findSyncMutation = async (clientMutationId) => {
    return getPrisma().syncMutation.findUnique({ where: { clientMutationId } });
};

// pass a transaction to record the mutation together with other rows
export const createSyncMutation = async (data, tx) => {
    const client = tx ?? getPrisma();
    return client.syncMutation.create({ data, select: { clientMutationId: true } });
};

// ---- idempotency keys ----

export const findIdempotencyKey = async ({ userId, key }) => {
    return getPrisma().idempotencyKey.findUnique({ where: { userId_key: { userId, key } } });
};

// Claims a key for a request. Returns true when the key was new, false when it already existed.
export const claimIdempotencyKey = async ({ userId, key, requestHash }) => {
    const { count } = await getPrisma().idempotencyKey.createMany({
        data: [{ userId, key, requestHash }],
        skipDuplicates: true,
    });
    return count === 1;
};

// Takes over a key whose request never stored a response and has not been touched since `staleBefore`
// (the process that claimed it died). Returns true when this request now owns the key.
export const takeOverIdempotencyKey = async ({ userId, key, staleBefore, now }) => {
    const { count } = await getPrisma().idempotencyKey.updateMany({
        where: { userId, key, statusCode: null, createdAt: { lt: staleBefore } },
        data: { createdAt: now },
    });
    return count === 1;
};

export const storeIdempotencyResponse = async ({ userId, key, statusCode, response }) => {
    await getPrisma().idempotencyKey.update({ where: { userId_key: { userId, key } }, data: { statusCode, response } });
};

export const deleteIdempotencyKey = async ({ userId, key }) => {
    await getPrisma().idempotencyKey.deleteMany({ where: { userId, key } });
};
