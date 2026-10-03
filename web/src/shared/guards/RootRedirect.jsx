import { Navigate } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import {
   selectIsInitialized,
   selectUser,
} from "@/modules/auth/slices/authSlice.js";
import { ROUTES } from "@/constants/app.constants";
import { getRoleHome } from "@/shared/utils/routeUtils";
import { Spinner } from "../ui/Spinner";

// "/" and any unknown URL: signed-in users go to their role's dashboard, everyone else to login
export function RootRedirect() {
   const isInitialized = useAppSelector(selectIsInitialized);
   const user = useAppSelector(selectUser);

   if (!isInitialized) {
      return <Spinner fullPage message="Loading..." />;
   }

   return <Navigate to={user ? getRoleHome(user.role) : ROUTES.LOGIN} replace />;
}
