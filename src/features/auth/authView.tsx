import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ProviderButton from "@/components/auth/ProviderButton";
import { authActions } from "./mutations";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { screens, type RootParams } from "@/navigation/routes";

type AuthNavigation = NativeStackNavigationProp<RootParams, typeof screens.AuthLogin>;

type AuthViewProps = {
  navigation: AuthNavigation;
};

export function AuthView({ navigation }: AuthViewProps) {
  const [authMode, setAuthMode] = useState<"sso" | "email" | "phone" | "phoneVerify">("sso");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSSOLogin = async (provider: "apple" | "google" | "github") => {
    try {
      setLoading(true);
      setError("");
      navigation.navigate(screens.AuthCallback);
      await authActions.signInWithProvider(provider);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sign in with provider";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    try {
      setLoading(true);
      setError("");

      if (isSignUp) {
        await authActions.signUpWithEmail(email, password);
        Alert.alert("Success", "Sign up successful! Please check your email to verify your account.");
      } else {
        await authActions.signInWithEmail(email, password);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSendOtp = async () => {
    if (!phone) {
      setError("Phone number is required");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await authActions.signInWithPhone(phone);
      setAuthMode("phoneVerify");
      Alert.alert("Success", "OTP sent to your phone!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send OTP";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneVerifyOtp = async () => {
    if (!otp) {
      setError("OTP code is required");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await authActions.verifyPhoneOtp(phone, otp);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid OTP code";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const renderSSO = () => (
    <>
      <Text style={styles.title}>time to jink</Text>
      <Text style={styles.subtitle}>Sign in to continue</Text>

      <View style={styles.ssoContainer}>
        <ProviderButton
          provider="apple"
          label="Continue with Apple"
          onPress={() => handleSSOLogin("apple")}
        />
        <ProviderButton
          provider="google"
          label="Continue with Google"
          onPress={() => handleSSOLogin("google")}
        />
      </View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <ProviderButton
        provider="email"
        label="Continue with Email"
        onPress={() => setAuthMode("email")}
        variant="secondary"
      />
      <ProviderButton
        provider="phone"
        label="Continue with Phone"
        onPress={() => setAuthMode("phone")}
        variant="secondary"
      />
    </>
  );

  const renderEmail = () => (
    <>
      <Text style={styles.title}>{isSignUp ? "Sign Up" : "Sign In"}</Text>
      <Text style={styles.subtitle}>with Email & Password</Text>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleEmailLogin}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? "Please wait..." : isSignUp ? "Sign Up" : "Sign In"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
          <Text style={styles.linkText}>
            {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setAuthMode("sso")} style={styles.backButton}>
          <Text style={styles.backText}>← Back to other options</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderPhone = () => (
    <>
      <Text style={styles.title}>Sign In</Text>
      <Text style={styles.subtitle}>with Phone</Text>
      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="+1 555 123 4567"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handlePhoneSendOtp}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>{loading ? "Sending..." : "Send OTP"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setAuthMode("sso")} style={styles.backButton}>
          <Text style={styles.backText}>← Back to other options</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderPhoneVerify = () => (
    <>
      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.subtitle}>We sent a code to your phone</Text>
      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="123456"
          keyboardType="number-pad"
          value={otp}
          onChangeText={setOtp}
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handlePhoneVerifyOtp}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>{loading ? "Verifying..." : "Verify OTP"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setAuthMode("phone")} style={styles.backButton}>
          <Text style={styles.backText}>← Back to phone login</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {authMode === "sso" && renderSSO()}
          {authMode === "email" && renderEmail()}
          {authMode === "phone" && renderPhone()}
          {authMode === "phoneVerify" && renderPhoneVerify()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0D0D0D",
  },
  flex: {
    flex: 1,
  },
  container: {
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "left",
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: 16,
    color: "#BBBBBB",
    marginBottom: 8,
  },
  ssoContainer: {
    gap: 12,
    marginBottom: 24,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  dividerText: {
    color: "#888",
    fontSize: 12,
    textTransform: "uppercase",
  },
  formContainer: {
    gap: 16,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#FFF",
  },
  primaryButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#000",
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  linkText: {
    color: "#FFFFFF",
    textAlign: "center",
    textDecorationLine: "underline",
  },
  backButton: {
    alignSelf: "flex-start",
  },
  backText: {
    color: "#FFFFFF",
    opacity: 0.7,
  },
  errorText: {
    color: "#FF6B6B",
    textAlign: "center",
  },
});
