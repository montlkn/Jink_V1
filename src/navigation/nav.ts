import { createNavigationContainerRef } from "@react-navigation/native";
import type { RootParams } from "./routes";

export const navRef = createNavigationContainerRef<RootParams>();

export function navigate<Name extends keyof RootParams>(
  name: Name,
  params?: RootParams[Name]
) {
  if (navRef.isReady()) navRef.navigate(name as any, params as any);
}

export function goBack() {
  if (navRef.isReady() && navRef.canGoBack()) navRef.goBack();
}
