// Placeholder for LoginScreen write me a login screen that allows users to log in with email and password
import React, { useState } from "react";
import {
  ActivityIndicator,
  Button,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../api/supabaseClient"; // Adjust the import path as necessary

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showSignUp, setShowSignUp] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (loginError) {
      setError(loginError.message);
    } else {
      // Don't navigate - let AppNavigator handle routing based on session state
      console.log("Login successful, session should be updated");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <TextInput
        style={[styles.input, styles.inputNarrow]}
        placeholder="email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={[styles.input, styles.inputNarrow]}
        placeholder="password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        title={loading ? "Logging in..." : "Login"}
        onPress={handleLogin}
        disabled={loading}
        style={styles.button}
      />

      <View style={{ height: 16 }} />

      <TouchableOpacity onPress={() => setShowSignUp(true)}>
        <Text style={styles.linkText}>New here? Create an account</Text>
      </TouchableOpacity>

      <SignUpModal visible={showSignUp} onClose={() => setShowSignUp(false)} />
    </SafeAreaView>
  );
}

/** SignUp modal */
function SignUpModal({ visible, onClose }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    setError("");
    setInfo("");

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName || null },
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (!data.session) {
      setInfo("Check your inbox to confirm your email.");
    } else {
      console.log("Sign up successful, session should be updated");
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalWrapper}
      >
        <View style={styles.modalCard}>
          <Text style={styles.title}>Create Account</Text>

          <TextInput
            style={[styles.input, styles.inputNarrow]}
            placeholder="full name (optional)"
            value={fullName}
            onChangeText={setFullName}
          />
          <TextInput
            style={[styles.input, styles.inputNarrow]}
            placeholder="email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={[styles.input, styles.inputNarrow]}
            placeholder="password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {!!error && <Text style={styles.error}>{error}</Text>}
          {!!info && <Text style={styles.info}>{info}</Text>}

          <Button
            title={loading ? "Creating account..." : "Sign up"}
            onPress={handleSignUp}
            disabled={loading}
          />

          <View style={{ height: 12 }} />
          <Button title="Close" onPress={onClose} color="#666" />
          {loading && (
            <View style={{ marginTop: 12, alignItems: "center" }}>
              <ActivityIndicator />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    height: 48,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  inputNarrow: { width: "80%", alignSelf: "center" },
  error: { color: "red", marginBottom: 16, textAlign: "center" },
  info: { color: "green", marginBottom: 16, textAlign: "center" },
  linkText: {
    textAlign: "center",
    textDecorationLine: "underline",
    fontSize: 16,
  },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  modalWrapper: { position: "absolute", left: 0, right: 0, bottom: 0 },
  modalCard: {
    backgroundColor: "#fff",
    padding: 24,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 8,
    elevation: 8,
  },
  button: {
    maxWidth: 360,
  },
});
