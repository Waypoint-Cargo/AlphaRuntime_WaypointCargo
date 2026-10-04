import { AppError } from "../../utils/appError.js";
import { findUserProfileById, deleteOwnAccount } from "./users.repository.js";
import { toProfileDTO } from "./users.dto.js";
import { verifyAccessToken } from "../../utils/tokens.js";
import { addToBlocklist, setUserInvalidateBefore } from "../../utils/tokenBlocklist.js";

export const getProfileService = async ({ userId }) => {
    const user = await findUserProfileById(userId);
    if (!user) throw new AppError("User not found.", 404);
    return toProfileDTO(user);
};

export const deleteOwnAccountService = async ({ userId, accessToken }) => {
    try {
        await deleteOwnAccount(userId);
    } catch (error) {
        // Foreign key restrictions (orders created, trips driven, etc.) block the delete.
        if (error.code === "P2003") {
            throw new AppError(
                "Your account has associated records (orders, trips, deliveries, etc.) and cannot be deleted. Contact an administrator.",
                409,
            );
        }
        throw error;
    }

    // The user row (and its refresh tokens, via cascade) is gone, but a still-valid
    // access token could otherwise keep working until it expires — kill it now.
    await setUserInvalidateBefore(userId);
    await _blocklistAccessToken(accessToken);
};

// Add an access token to the Redis blocklist (mirrors auth.service.js's own helper)
async function _blocklistAccessToken(accessToken) {
    if (!accessToken) return;
    let payload;
    try {
        payload = verifyAccessToken(accessToken, { ignoreExpiration: true });
    } catch (error) {
        return; // invalid/forged token — nothing legitimate to blocklist
    }
    if (!payload?.exp) return;
    const remainingMs = payload.exp * 1000 - Date.now();
    await addToBlocklist(accessToken, remainingMs);
}
