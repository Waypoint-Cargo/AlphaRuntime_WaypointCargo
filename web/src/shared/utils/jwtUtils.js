// Decodes the payload of a JWT without verifying its signature.
// Returns null if the token is missing or malformed.
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
