import { useAppSelector } from "@/app/hooks";
import { USER_ROLES } from "@/constants/app.constants";
import {
   selectIsAuthenticated,
   selectIsInitialized,
   selectUser,
} from "@/features/auth/slices/authSlice";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Spinner } from "../components/ui/Spinner";

interface ProtectedRouteProps {
   children: ReactNode;
   requiredRole?: typeof USER_ROLES[keyof typeof USER_ROLES]; // If provided, only users with this role can access the route
}

export function ProtectedRoute({
   children,
   requiredRole,
}: ProtectedRouteProps) {
   const isInitialized = useAppSelector(selectIsInitialized);
   const isAuthenticated = useAppSelector(selectIsAuthenticated);
   const user = useAppSelector(selectUser);
   const location = useLocation();

   // Still restoring session — show spinner, not login redirect
   if (!isInitialized) {
      return <Spinner fullPage message="Restoring session…" />;
   }

   // Not authenticated → preserve intended destination for post-login redirect
   if (!isAuthenticated) {
      return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
   }

   // Role check - id admin role is required and user is not admin, redirect to dashboard
   if (requiredRole && user?.role !== requiredRole) {
      return <Navigate to={ROUTES.DASHBOARD} replace />;
   }

   return <>{children}</>;
}
