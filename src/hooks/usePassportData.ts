import { usePassportContext } from "@/state/PassportContext";
import { useEffect } from "react";

export { type PassportDataState } from "@/state/PassportContext";

/**
 * Hook to access passport data. Automatically triggers load if data hasn't been fetched yet.
 * This is the optimized lazy-loading pattern - passport data only loads when a screen uses this hook.
 */
export function usePassportData() {
  const context = usePassportContext();

  // Trigger load when component using this hook mounts and data is idle
  useEffect(() => {
    if (context.status === "idle" && "load" in context) {
      context.load();
    }
  }, [context]);

  return context;
}
