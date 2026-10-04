import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/app.constants";
import { useLogoutMutation } from "../api/authApi";

// Signs the user out: tells the backend (revokes the refresh session + blocklists
// the access token, clears the cookie), drops the local session, then goes to /login.
export function useLogout() {
   const navigate = useNavigate();
   const [logoutRequest, { isLoading }] = useLogoutMutation();

   const logout = async () => {
      // never rejects — the mutation signs out locally whatever the server answers
      await logoutRequest();
      // explicit sign-out: no "return to where you were" state on the login page
      navigate(ROUTES.LOGIN, { replace: true });
   };

   return { logout, isLoggingOut: isLoading };
}
