// screens/Auth/AuthScreen.tsx
import React, { useState } from "react";
import {
  Button,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../api/supabaseClient"; // adjust path as needed

export default function AuthScreen({ navigation }) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    setError("");

    if (isSignup && password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      if (isSignup) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: "myapp://auth-callback" },
        });
        if (signUpError) throw signUpError;
        // Typically you want to show "Check your email for confirmation"
        navigation.navigate("main");
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (loginError) throw loginError;
        navigation.navigate("main");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{isSignup ? "Create Account" : "Login"}</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {isSignup && (
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
        />
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        title={
          loading
            ? isSignup
              ? "Creating..."
              : "Logging in..."
            : isSignup
            ? "Sign Up"
            : "Login"
        }
        onPress={handleAuth}
        disabled={loading}
      />

      <View style={styles.toggleContainer}>
        <Text>
          {isSignup ? "Already have an account?" : "Don't have an account?"}
        </Text>
        <TouchableOpacity onPress={() => setIsSignup(!isSignup)}>
          <Text style={styles.toggleText}>
            {isSignup ? " Log In" : " Sign Up"}
          </Text>
        </TouchableOpacity>
      </View>
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
  error: {
    color: "red",
    marginBottom: 16,
    textAlign: "center",
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
  toggleText: {
    color: "#007bff",
    fontWeight: "bold",
  },
});
