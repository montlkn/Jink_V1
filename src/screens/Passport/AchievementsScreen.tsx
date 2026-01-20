import { type AchievementDefinition } from "@/constants/passportContent";
import { InfoMenu, InlineFlipCard, PassportBackButton, PassportInfoButton } from "@/features/passport";
import { usePassportData } from "@/hooks/usePassportData";
import { screens, type RootParams } from "@/navigation/routes";
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useMemo, useState } from "react";
import {
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    UIManager,
    View
} from "react-native";

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

type Navigation = NativeStackNavigationProp<RootParams, typeof screens.PassportAchievements>;

type AchievementCardProps = {
  item: AchievementDefinition;
  expanded: boolean;
  onPress: (id: string) => void;
};

function AchievementCard({ item, expanded, onPress }: AchievementCardProps) {
  const missable = item.missable;
  const statusColor = missable ? theme.colors.primary : theme.colors.secondary;

  const handlePress = () => {
    onPress(item.id);
  };

  const FrontContent = (
    <View style={{ 
      flex: 1, 
      padding: 12, 
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: statusColor,
      overflow: 'hidden',
    }}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBadge, { backgroundColor: statusColor }]}>
          <Ionicons name="ribbon" size={16} color={theme.colors.background} />
        </View>
        <Text style={[styles.xpText, { color: statusColor }]}>{item.xp.toLocaleString()} XP</Text>
      </View>
      
      <View style={[styles.cardBody, { flex: 1, justifyContent: 'center' }]}>
        <Text numberOfLines={2} style={styles.cardTitle}>
          {item.title}
        </Text>
        
        <View style={[styles.divider, { backgroundColor: statusColor }]} />
        <Text numberOfLines={3} style={styles.verification}>{item.verification}</Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={[styles.statusText, { color: statusColor }]}>
          {missable ? "LIMITED TIME" : "PERMANENT RECORD"}
        </Text>
        <Ionicons name={missable ? "flash" : "checkmark-circle"} size={12} color={statusColor} />
      </View>
    </View>
  );

  const BackContent = (
    <View style={{ 
      flex: 1, 
      padding: 10, 
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: statusColor,
      overflow: 'hidden',
    }}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBadge, { backgroundColor: statusColor }]}>
          <Ionicons name="information-circle" size={14} color={theme.colors.background} />
        </View>
        <Text style={[styles.xpText, { color: statusColor, fontSize: theme.typography.fontSize.xxxs }]}>DETAILS</Text>
      </View>

      <View style={[styles.cardBody, { justifyContent: 'center' }]}>
        <Text numberOfLines={2} style={[styles.cardTitle, { fontSize: theme.typography.fontSize.sm, textAlign: 'center', marginBottom: 4 }]}>
          {item.title}
        </Text>

        <View style={[styles.divider, { backgroundColor: statusColor, alignSelf: 'center', width: 20, marginBottom: 6 }]} />

        <Text style={[styles.miniLabel, { fontSize: theme.typography.fontSize.xxxs }]}>PURPOSE</Text>
        <Text numberOfLines={4} style={[styles.miniDescription, { fontSize: theme.typography.fontSize.xsPlus, lineHeight: 14, marginBottom: 6 }]}>{item.purpose}</Text>

        <View style={{ height: 4 }} />

        <Text style={[styles.miniLabel, { fontSize: theme.typography.fontSize.xxxs }]}>UNLOCK</Text>
        <Text numberOfLines={3} style={[styles.miniDescription, { fontSize: theme.typography.fontSize.xsPlus, lineHeight: 14 }]}>{item.verification}</Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={[styles.statusText, { color: statusColor }]}>
          {missable ? "MISSABLE" : "STABLE"}
        </Text>
      </View>
    </View>
  );

  return (
    <TouchableOpacity 
      style={[
        styles.card, 
        { 
          width: '48%',
          height: 220,
        }
      ]} 
      activeOpacity={0.8} 
      onPress={handlePress}
    >
      <InlineFlipCard 
        isOpen={expanded}
        front={FrontContent}
        back={BackContent}
        style={{ height: '100%' }}
      />
    </TouchableOpacity>
  );
}

export default function AchievementsScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();
  const passportState = usePassportData();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showInfoMenu, setShowInfoMenu] = useState(false);

  // Convert user's raw achievement IDs to display-friendly achievement objects
  const userAchievements = useMemo(() => {
    if (passportState.status !== 'ready') return [];
    
    // Map raw achievement IDs to display-friendly objects
    return passportState.value.achievements.map((achievement, index) => {
      // Create display-friendly title from ID
      const displayTitle = achievement.name
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      return {
        id: `user-achievement-${index}`,
        title: displayTitle,
        purpose: `Earned: ${displayTitle}`,
        xp: 100,
        missable: false,
        verification: 'Completed through user activity',
      };
    });
  }, [passportState]);

  const handlePress = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  const handleInfo = useCallback(() => {
    setShowInfoMenu(true);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <PassportBackButton onPress={() => navigation.goBack()} />
        </View>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>ACHIEVEMENT LOG</Text>
        </View>
        <View style={styles.headerRight}>
          <PassportInfoButton
            onPress={handleInfo}
            accessibilityLabel="Learn about achievements"
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {userAchievements.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🏆</Text>
            <Text style={styles.emptyStateTitle}>NO ACHIEVEMENTS YET</Text>
            <Text style={styles.emptyStateText}>
              Complete challenges and milestones to unlock achievements
            </Text>
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {userAchievements.map((item) => (
              <AchievementCard 
                key={item.id} 
                item={item} 
                expanded={expandedId === item.id}
                onPress={handlePress} 
              />
            ))}
          </View>
        )}
      </ScrollView>

      <InfoMenu
        visible={showInfoMenu}
        onClose={() => setShowInfoMenu(false)}
        title="ACHIEVEMENT LOG"
        content="Achievements signal milestone skill and streaks. Unlock them by scanning buildings, completing derives, and pursuing special challenges."
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
  headerLeft: {
    width: 44,
    alignItems: "flex-start",
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerRight: {
    width: 44,
    alignItems: "flex-end",
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: "bold",
    color: theme.colors.text,
    letterSpacing: 2,
    textAlign: "center",
    fontFamily: theme.typography.fontFamily.bold,
  },
  infoButton: {
    width: 44,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  iconBadge: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  xpText: {
    fontSize: theme.typography.fontSize.xsPlus,
    fontWeight: "bold",
    fontFamily: "Courier",
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: theme.typography.fontSize.mdPlus,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  divider: {
    height: 2,
    width: 20,
    marginBottom: 4,
  },
  verification: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.muted,
    lineHeight: 15,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  statusText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: "bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  miniLabel: {
    fontSize: theme.typography.fontSize.xxxs,
    fontWeight: "bold",
    color: theme.colors.muted,
    marginBottom: 2,
    textAlign: 'center',
  },
  miniDescription: {
    fontSize: theme.typography.fontSize.sm,
    lineHeight: 14,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyStateIcon: {
    fontSize: theme.typography.fontSize.xxxxl,
  },
  emptyStateTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: 'bold',
    color: theme.colors.text,
    letterSpacing: 2,
  },
  emptyStateText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.muted,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 18,
  },
});
