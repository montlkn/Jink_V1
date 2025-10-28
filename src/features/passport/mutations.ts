import { authActions } from "@/features/auth";
import { log } from "@/lib/log";
import { useUserStore } from "@/state/userStore";

export const passportActions = {
  async signOut() {
    await authActions.signOut();
    try {
      const store = useUserStore.getState?.();
      store?.logout?.();
    } catch (error) {
      log.warn("[passport] Failed to update user store after logout", error);
    }
  },
};
