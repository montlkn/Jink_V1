import { createNavigationContainerRef, CommonActions } from "@react-navigation/native";
import type { RootParams } from "./routes";

export const navRef = createNavigationContainerRef<RootParams>();

export function navigate<Name extends keyof RootParams>(
  name: Name,
  params?: RootParams[Name]
) {
  if (navRef.isReady()) {
    navRef.navigate(name as any, params as any);
  } else {
    console.warn("[nav] navigate() called before navRef is ready", name, params);
  }
}

export function goBack() {
  if (navRef.isReady() && navRef.canGoBack()) navRef.goBack();
}

/**
 * Reset navigation stack and navigate to a specific screen
 * Used after completing flows (e.g., tour completion) to clear history
 */
export function resetToScreen<Name extends keyof RootParams>(
  name: Name,
  params?: RootParams[Name]
) {
  if (navRef.isReady()) {
    navRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: name as string, params: params as any }],
      })
    );
  } else {
    console.warn("[nav] resetToScreen() called before navRef is ready", name, params);
  }
}
