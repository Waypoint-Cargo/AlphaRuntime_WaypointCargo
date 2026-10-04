import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import {
   selectIsInitialized,
   selectUser,
} from "@/modules/auth/slices/authSlice.js";
import { resolvePostLoginPath } from "@/shared/utils/routeUtils";
import { Spinner } from "../ui/Spinner";

// For pages only signed-out visitors should see (login, register, forgot password).
// A signed-in user is sent on to the page they were heading to before being asked
// to sign in (if their role may open it), otherwise to their role's dashboard.
// This is also what performs the redirect right after a successful login.
export function GuestRoute({ children }) {
   const isInitialized = useAppSelector(selectIsInitialized);
   const user = useAppSelector(selectUser);
   const location = useLocation();

   // Still restoring session — show spinner to prevent a flash of the login page
   if (!isInitialized) {
      return <Spinner fullPage message="Loading..." />;
   }

   if (user) {
      const from = location.state?.from;
      const fromPath = from ? `${from.pathname}${from.search ?? ""}${from.hash ?? ""}` : null;
      return <Navigate to={resolvePostLoginPath(user, fromPath)} replace />;
   }

   return children ?? <Outlet />;
}
