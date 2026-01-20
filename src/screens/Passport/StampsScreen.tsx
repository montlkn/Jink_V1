import { useAuth } from '@/auth/authProvider';
import { PassportBackButton, StampCollectionView } from "@/features/passport";
import { screens, type RootParams } from "@/navigation/routes";
import { theme } from "@/theme/tokens";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
    SafeAreaView,
    StyleSheet,
    Text,
    View
} from "react-native";

type Navigation = NativeStackNavigationProp<RootParams, typeof screens.PassportStamps>;

export default function StampsScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();
  const { session } = useAuth() as any;

  if (!session?.user?.id) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Please log in to view stamps</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <PassportBackButton onPress={() => navigation.goBack()} />
        </View>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>STAMPS</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Stamp Collection with Tab Filtering */}
      <StampCollectionView userId={session.user.id} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: theme.layout.borderWidth.thin,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  headerLeft: {
    width: 44,
    alignItems: "flex-start",
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.fontSize.base,
    fontWeight: "bold",
    color: theme.colors.text,
    letterSpacing: theme.typography.letterSpacing.widest,
    textAlign: "center",
  },
  headerRight: {
    width: 44,
    alignItems: "flex-end",
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 14,
    color: theme.colors.muted,
  },
});
