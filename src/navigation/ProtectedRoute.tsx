import { useAuthData } from "@/hooks/useAuthData";
import { navigate } from "./nav";
import { screens } from "./routes";

type ProtectedRouteProps = {
  children: JSX.Element;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const state = useAuthData();

  if (state.status === "loading") {
    return null;
  }

  if (!state.session) {
    navigate(screens.AuthLogin);
    return null;
  }

  return children;
}
