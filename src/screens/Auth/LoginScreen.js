// Placeholder for LoginScreen write me a login screen that allows users to log in with email and password
import React, { useState } from "react";
import {
  Button,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { supabase } from "../../api/supabaseClient"; // Adjust the import path as necessary

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      console.log('Login successful, session should be updated');
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
      />
    </SafeAreaView>
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
  inputNarrow: {
    width: "80%", // make them narrower (or "70%" or 250 for fixed width)
    alignSelf: "center",
  },
  error: {
    color: "red",
    marginBottom: 16,
    textAlign: "center",
  },
});
