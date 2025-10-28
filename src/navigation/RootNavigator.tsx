import React from "react";
import { AuthProvider } from "@/auth/authProvider";
import { OrbTransitionProvider } from "@/state/orbTransitionContext";
import { AppStack } from "./Stack";

export default function RootNavigator() {
  // Wrap global providers here so routing stays single-sourced in AppStack.
  return (
    <AuthProvider>
      <OrbTransitionProvider>
        <AppStack />
      </OrbTransitionProvider>
    </AuthProvider>
  );
}
