import React from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useProfileData } from "./useProfileData";

export function ProfileView(): JSX.Element {
  const { status, profile, error, refresh } = useProfileData();
  const isLoading = status === "loading";

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#111" />
        <Text style={styles.loadingText}>Loading profile…</Text>
      </SafeAreaView>
    );
  }

  if (status === "error") {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorTitle}>We couldn't load your profile.</Text>
        <Text style={styles.errorMessage}>
          {error instanceof Error ? error.message : "Please try again in a moment."}
        </Text>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorTitle}>Your profile is empty.</Text>
        <Text style={styles.errorMessage}>Sign in and add a few details to get started.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} />}
      >
        <View style={styles.header}>
          {profile.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>{profile.displayName.slice(0, 1)}</Text>
            </View>
          )}
          <Text style={styles.name}>{profile.displayName}</Text>
          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Last updated</Text>
          <Text style={styles.sectionValue}>
            {profile.updatedAt
              ? new Date(profile.updatedAt).toLocaleString()
              : "Not updated yet"}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 120;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 24,
  },
  centered: {
    flex: 1,
    backgroundColor: "#F8F8F8",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  loadingText: {
    fontSize: 15,
    color: "#555",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111",
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
  },
  header: {
    alignItems: "center",
    gap: 16,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: "#D9D9D9",
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 42,
    fontWeight: "600",
    color: "#111",
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
  },
  bio: {
    fontSize: 15,
    color: "#444",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  sectionLabel: {
    fontSize: 13,
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sectionValue: {
    fontSize: 16,
    color: "#111",
    fontWeight: "500",
  },
});
