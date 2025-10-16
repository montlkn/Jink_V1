/* File: /src/components/auth/ProviderButton.js
  Description: Reusable button component for OAuth providers
  Used for Google, Apple, GitHub, etc.
*/
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
            color={provider === "apple" ? "#fff" : "#000"}
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
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    minHeight: 52,
  },
  btnApple: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  btnSecondary: {
    backgroundColor: "transparent",
    borderColor: "#ccc",
  },
  iconContainer: {
    marginRight: 10,
  },
  txt: {
    color: "#000",
    fontWeight: "600",
    fontSize: 16,
  },
  txtApple: {
    color: "#fff",
  },
  txtSecondary: {
    color: "#666",
  },
});
