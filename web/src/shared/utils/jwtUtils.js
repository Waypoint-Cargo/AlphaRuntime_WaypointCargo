// Decodes the payload of a JWT without verifying its signature.
// Returns null if the token is missing or malformed.
// Only for reading display/routing claims — the backend verifies every token.
export function decodeJwtPayload(token) {
   if (!token || typeof token !== "string") return null;

   const parts = token.split(".");
   if (parts.length !== 3) return null;

   try {
      const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const json = decodeURIComponent(
         atob(base64)
            .split("")
            .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
            .join(""),
      );
      return JSON.parse(json);
   } catch {
      return null;
   }
}

// Builds the client-side user from the access-token claims issued by the
// backend (utils/tokens.js): { sub, employeeNumber, fullName, role }.
export function userFromAccessToken(token) {
   const claims = decodeJwtPayload(token);
   if (!claims?.sub) return null;

   return {
      id: claims.sub,
      employeeNumber: claims.employeeNumber ?? null,
      fullName: claims.fullName ?? null,
      role: claims.role ?? null,
   };
}
