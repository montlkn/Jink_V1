/* File: /src/screens/Auth/LoginScreen.js
  Description: Login screen with SSO (Google, Apple), email/password, and phone auth
*/
import React, { useState } from "react";
import {
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
import { useAuth } from "../../auth/authProvider";
import ProviderButton from "../../components/auth/ProviderButton";

export default function LoginScreen({ navigation }) {
  // Auth mode: 'sso' | 'email' | 'phone' | 'phoneVerify'
  const [authMode, setAuthMode] = useState("sso");

  // Email/password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  // Phone auth state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  // UI state
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, signInWithProvider, signInWithPhone, verifyPhoneOtp } = useAuth();

  // SSO Handlers
  const handleSSOLogin = async (provider) => {
    try {
      setLoading(true);
      setError("");
      // Navigate to callback handler before opening browser so it can catch the deep link
      navigation.navigate("AuthCallback");
      await signInWithProvider(provider);
      // OAuth will redirect to browser, then callback to app
    } catch (err) {
      setError(err.message || "Failed to sign in with provider");
    } finally {
      setLoading(false);
    }
  };

  // Email/Password Handlers
  const handleEmailLogin = async () => {
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    try {
      setLoading(true);
      setError("");

      if (isSignUp) {
        await signUp(email, password);
        setError(""); // Clear any previous errors
        // Show success message
        alert("Sign up successful! Please check your email to verify your account.");
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  // Phone Auth Handlers
  const handlePhoneSendOtp = async () => {
    if (!phone) {
      setError("Phone number is required");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await signInWithPhone(phone);
      setAuthMode("phoneVerify");
      alert("OTP sent to your phone!");
    } catch (err) {
      setError(err.message || "Failed to send OTP");
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
      await verifyPhoneOtp(phone, otp);
      // Session will be created, AppNavigator will handle routing
    } catch (err) {
      setError(err.message || "Invalid OTP code");
    } finally {
      setLoading(false);
    }
  };

  // Render SSO view
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

  // Render Email/Password view
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

  // Render Phone view
  const renderPhone = () => (
    <>
      <Text style={styles.title}>Sign In with Phone</Text>
      <Text style={styles.subtitle}>Enter your phone number</Text>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Phone (+1234567890)"
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
          <Text style={styles.primaryButtonText}>
            {loading ? "Sending..." : "Send OTP"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setAuthMode("sso")} style={styles.backButton}>
          <Text style={styles.backText}>← Back to other options</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  // Render Phone OTP verification view
  const renderPhoneVerify = () => (
    <>
      <Text style={styles.title}>Verify OTP</Text>
      <Text style={styles.subtitle}>Enter the code sent to {phone}</Text>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter OTP"
          keyboardType="number-pad"
          value={otp}
          onChangeText={setOtp}
          editable={!loading}
          maxLength={6}
        />

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handlePhoneVerifyOtp}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? "Verifying..." : "Verify"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setAuthMode("phone")} style={styles.backButton}>
          <Text style={styles.backText}>← Change phone number</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {authMode === "sso" && renderSSO()}
          {authMode === "email" && renderEmail()}
          {authMode === "phone" && renderPhone()}
          {authMode === "phoneVerify" && renderPhoneVerify()}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
    color: "#000",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: "center",
    color: "#666",
  },
  ssoContainer: {
    marginBottom: 16,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e0e0e0",
  },
  dividerText: {
    marginHorizontal: 16,
    color: "#999",
    fontSize: 14,
    fontWeight: "500",
  },
  formContainer: {
    marginTop: 8,
  },
  input: {
    height: 52,
    borderColor: "#e0e0e0",
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  primaryButton: {
    backgroundColor: "#000",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  linkText: {
    color: "#000",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    textDecorationLine: "underline",
  },
  backButton: {
    marginTop: 24,
    alignItems: "center",
  },
  backText: {
    color: "#666",
    fontSize: 14,
  },
  error: {
    color: "#e74c3c",
    marginTop: 16,
    textAlign: "center",
    fontSize: 14,
    paddingHorizontal: 16,
  },
});
