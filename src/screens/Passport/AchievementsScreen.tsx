import { achievementLedger, type AchievementDefinition } from "@/constants/passportContent";
import { InlineFlipCard, PassportBackButton, PassportInfoButton } from "@/features/passport";
import { screens, type RootParams } from "@/navigation/routes";
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import {
  Alert,
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
        <Text style={[styles.xpText, { color: statusColor, fontSize: 9 }]}>DETAILS</Text>
      </View>
      
      <View style={[styles.cardBody, { justifyContent: 'center' }]}>
        <Text numberOfLines={2} style={[styles.cardTitle, { fontSize: 12, textAlign: 'center', marginBottom: 4 }]}>
          {item.title}
        </Text>
        
        <View style={[styles.divider, { backgroundColor: statusColor, alignSelf: 'center', width: 20, marginBottom: 6 }]} />
        
        <Text style={[styles.miniLabel, { fontSize: 9 }]}>PURPOSE</Text>
        <Text numberOfLines={4} style={[styles.miniDescription, { fontSize: 11, lineHeight: 14, marginBottom: 6 }]}>{item.purpose}</Text>
        
        <View style={{ height: 4 }} />
        
        <Text style={[styles.miniLabel, { fontSize: 9 }]}>UNLOCK</Text>
        <Text numberOfLines={3} style={[styles.miniDescription, { fontSize: 11, lineHeight: 14 }]}>{item.verification}</Text>
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handlePress = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  const handleInfo = useCallback(() => {
    Alert.alert(
      "ACHIEVEMENT LOG",
      "Achievements signal milestone skill and streaks. Unlock them by scanning buildings, completing derives, and pursuing special challenges."
    );
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
        <View style={styles.gridContainer}>
          {achievementLedger.map((item) => (
            <AchievementCard 
              key={item.id} 
              item={item} 
              expanded={expandedId === item.id}
              onPress={handlePress} 
            />
          ))}
        </View>
      </ScrollView>
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
    fontSize: 11,
    fontWeight: "bold",
    fontFamily: "Courier",
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
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
    fontSize: 12,
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
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  miniLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: theme.colors.muted,
    marginBottom: 2,
    textAlign: 'center',
  },
  miniDescription: {
    fontSize: 12,
    lineHeight: 14,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
});
