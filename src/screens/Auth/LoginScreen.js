import React from "react";
import { AuthFeature } from "@/features/auth";

export default function LoginScreen(props) {
  return <AuthFeature navigation={props.navigation} />;
}
