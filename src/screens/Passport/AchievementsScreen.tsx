import { achievementLedger, type AchievementDefinition } from "@/constants/passportContent";
import { AchievementDetailModal, PassportBackButton, PassportInfoButton } from "@/features/passport";
import { screens, type RootParams } from "@/navigation/routes";
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import {
    Alert,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type Navigation = NativeStackNavigationProp<RootParams, typeof screens.PassportAchievements>;

type AchievementCardProps = {
  item: AchievementDefinition;
  onPress: (item: AchievementDefinition) => void;
};

function AchievementCard({ item, onPress }: AchievementCardProps) {
  const missable = item.missable;
  const statusColor = missable ? theme.colors.primary : theme.colors.secondary;

  return (
    <TouchableOpacity style={[styles.card, { borderColor: statusColor }]} activeOpacity={0.8} onPress={() => onPress(item)}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBadge, { backgroundColor: statusColor }]}>
          <Ionicons name="ribbon" size={14} color={theme.colors.background} />
        </View>
        <Text style={[styles.xpText, { color: statusColor }]}>{item.xp.toLocaleString()} XP</Text>
      </View>
      
      <View style={styles.cardBody}>
        <Text numberOfLines={2} style={styles.cardTitle}>{item.title}</Text>
        <View style={[styles.divider, { backgroundColor: statusColor }]} />
        <Text numberOfLines={3} style={styles.verification}>{item.verification}</Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={[styles.statusText, { color: statusColor }]}>
          {missable ? "LIMITED TIME" : "PERMANENT RECORD"}
        </Text>
        <Ionicons name={missable ? "flash" : "checkmark-circle"} size={12} color={statusColor} />
      </View>
    </TouchableOpacity>
  );
}

export default function AchievementsScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementDefinition | null>(null);

  const handleInfo = useCallback(() => {
    Alert.alert(
      "ACHIEVEMENT LOG",
      "Achievements signal milestone skill and streaks. Unlock them by scanning buildings, completing derives, and pursuing special challenges."
    );
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <PassportBackButton onPress={() => navigation.goBack()} style={styles.backButton} />
        <Text style={styles.headerTitle}>ACHIEVEMENT LOG</Text>
        <PassportInfoButton
          onPress={handleInfo}
          accessibilityLabel="Learn about achievements"
        />
      </View>

      <FlatList
        data={achievementLedger}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <AchievementCard item={item} onPress={setSelectedAchievement} />}
        showsVerticalScrollIndicator={false}
      />

      <AchievementDetailModal
        visible={selectedAchievement !== null}
        achievement={selectedAchievement}
        onClose={() => setSelectedAchievement(null)}
      />
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
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 44,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.text,
    letterSpacing: 2,
    textAlign: "center",
    fontFamily: theme.typography.fontFamily.bold,
  },
  infoButton: {
    width: 44,
  },
  listContent: {
    padding: 16,
  },
  column: {
    justifyContent: "space-between",
    gap: 16,
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: 12,
    marginBottom: 16,
    flex: 1,
    borderWidth: 2,
    minHeight: 180,
    justifyContent: "space-between",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  iconBadge: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 0,
  },
  xpText: {
    fontSize: 10,
    fontWeight: "bold",
    fontFamily: "Courier",
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  divider: {
    height: 2,
    width: 20,
    marginBottom: 8,
  },
  verification: {
    fontSize: 10,
    color: theme.colors.muted,
    lineHeight: 14,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  statusText: {
    fontSize: 8,
    fontWeight: "bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
