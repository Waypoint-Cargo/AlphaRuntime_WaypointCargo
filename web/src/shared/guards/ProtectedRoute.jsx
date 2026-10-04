import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import {
   selectIsInitialized,
   selectUser,
} from "@/modules/auth/slices/authSlice.js";
import { ROUTES } from "@/constants/app.constants";
import { Spinner } from "../ui/Spinner";

// Guards a route (or, used as a layout route without children, a whole area):
//   - session still being restored  -> spinner (never a premature redirect to /login)
//   - not signed in                 -> /login, remembering where the user was heading
//   - signed in with the wrong role -> /unauthorized
// allowedRoles (optional): roles that may enter. Omit to allow any signed-in user.
// The backend enforces roles on every API call; this only keeps the UI honest.
export function ProtectedRoute({ allowedRoles, children }) {
   const isInitialized = useAppSelector(selectIsInitialized);
   const user = useAppSelector(selectUser);
   const location = useLocation();

   if (!isInitialized) {
      return <Spinner fullPage message="Restoring session…" />;
   }

   if (!user) {
      return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
   }

   if (allowedRoles && !allowedRoles.includes(user.role)) {
      return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
   }

   return children ?? <Outlet />;
}
