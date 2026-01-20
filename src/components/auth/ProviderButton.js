/* File: /src/components/auth/ProviderButton.js
  Description: Reusable button component for OAuth providers
  Used for Google, Apple, GitHub, etc.
*/
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import React from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const providerIcons = {
  google: "logo-google",
  apple: "logo-apple",
  github: "logo-github",
  phone: "call",
  email: "mail",
};

export default function ProviderButton({ provider, label, onPress, variant = "primary" }) {
  const icon = providerIcons[provider];

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.btn,
        variant === "secondary" && styles.btnSecondary,
        provider === "apple" && styles.btnApple,
      ]}
      activeOpacity={0.8}
    >
      {icon && (
        <View style={styles.iconContainer}>
          <Ionicons
            name={icon}
            size={20}
            color={provider === "apple" ? theme.colors.white : theme.colors.black}
          />
        </View>
      )}
      <Text
        style={[
          styles.txt,
          variant === "secondary" && styles.txtSecondary,
          provider === "apple" && styles.txtApple,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    marginVertical: 6,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 52,
  },
  btnApple: {
    backgroundColor: theme.colors.black,
    borderColor: theme.colors.black,
  },
  btnSecondary: {
    backgroundColor: "transparent",
    borderColor: theme.colors.border,
  },
  iconContainer: {
    marginRight: 10,
  },
  txt: {
    color: theme.colors.text,
    fontWeight: "600",
    fontSize: 16,
  },
  txtApple: {
    color: theme.colors.white,
  },
  txtSecondary: {
    color: theme.colors.muted,
  },
});
