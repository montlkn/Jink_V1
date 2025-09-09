/*
  File: App.js
  Description: The main entry point for the entire application.
  Its only job is to render the main navigator.
*/
import React from "react";
import { AuthProvider } from "./src/auth/authProvider";
import AppNavigator from "./src/navigation/AppNavigator";
// This is our global color and theme configuration

const AppTheme = {
  dark: false,
  colors: {
    primary: "#000",
    background: "#F8F8F8",
    card: "#fff",
    text: "#000",
    border: "#e0e0e0",
    notification: "rgb(255, 69, 58)",
  },
};

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
