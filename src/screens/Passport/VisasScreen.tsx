import { useAuth } from '@/auth/authProvider';
import { visaCarousel } from "@/constants/passportContent";
import {
    InfoMenu,
    PassportBackButton,
    PassportInfoButton,
    SecurityPattern,
    fetchUserVisas,
} from "@/features/passport";
import { screens, type RootParams } from "@/navigation/routes";
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import {
    Dimensions,
    SafeAreaView,
    StyleSheet,
    Text,
    View
} from "react-native";
import Animated, {
    interpolate,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
} from "react-native-reanimated";

type Navigation = NativeStackNavigationProp<RootParams, typeof screens.PassportVisas>;

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const SPACING = 10;
const ITEM_SIZE = CARD_WIDTH + SPACING;

function VisaCard({ item, index, scrollX }: { item: (typeof visaCarousel)[number]; index: number; scrollX: Animated.SharedValue<number> }) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * ITEM_SIZE,
      index * ITEM_SIZE,
      (index + 1) * ITEM_SIZE,
    ];

    const rotateZ = interpolate(
      scrollX.value,
      inputRange,
      [45, 0, -45],
      "clamp"
    );

    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.8, 1, 0.8],
      "clamp"
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.5, 1, 0.5],
      "clamp"
    );

    return {
      transform: [
        { perspective: 1000 },
        { rotateZ: `${rotateZ}deg` },
        { scale },
      ],
      opacity,
    };
  });

  return (
    <Animated.View style={[styles.cardContainer, animatedStyle]}>
      <View style={[styles.card, { borderColor: item.accent }]}>
          <SecurityPattern width={CARD_WIDTH} height={440} color={item.accent} opacity={0.15} />
        
        <View style={styles.cardHeader}>
          <View style={[styles.badge, { borderColor: item.accent }]}>
            <Ionicons name="document-text" size={14} color={item.accent} />
            <Text style={[styles.badgeText, { color: item.accent }]}>{item.neighborhood}</Text>
          </View>
          <Text style={styles.grantedAt}>GRANTED {item.grantedAt}</Text>
        </View>
        
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <View style={styles.divider} />
          <Text style={styles.requirement}>{item.requirement}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>

        <View style={styles.cardFooter}>
          <Text style={[styles.footerText, { color: item.accent }]}>OFFICIAL VISA DOC</Text>
          {/* QR Code Removed per user request */}
        </View>
      </View>
    </Animated.View>
  );
}

export default function VisasScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();
  const { session } = useAuth() as any;
  const scrollX = useSharedValue(0);
  const [showInfoMenu, setShowInfoMenu] = useState(false);
  const [userVisas, setUserVisas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserVisas(session.user.id)
        .then((visas) => {
          // Transform DB visas to match carousel format
          const transformedVisas = visas.map((v: any, idx: number) => ({
            id: v.id,
            neighborhood: v.visa?.neighborhood || 'Unknown',
            title: v.visa?.title || 'Neighborhood Visa',
            requirement: `${v.visa?.requirement || 10}+ buildings explored`,
            description: v.visa?.description || 'You have become familiar with this neighborhood.',
            grantedAt: new Date(v.granted_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
            accent: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'][idx % 5],
          }));
          setUserVisas(transformedVisas);
          setLoading(false);
        })
        .catch((err) => {
          console.error('[VisasScreen] Failed to fetch visas', err);
          setLoading(false);
        });
    }
  }, [session?.user?.id]);

  const displayVisas = userVisas.length > 0 ? userVisas : visaCarousel;

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

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
          <Text style={styles.headerTitle}>VISA DOSSIER</Text>
        </View>
        <View style={styles.headerRight}>
          <PassportInfoButton onPress={handleInfo} />
        </View>
      </View>

      <View style={styles.carouselWrapper}>
        {loading ? (
          <Text style={styles.loadingText}>Loading visas...</Text>
        ) : displayVisas.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={theme.colors.muted} />
            <Text style={styles.emptyTitle}>NO VISAS YET</Text>
            <Text style={styles.emptyText}>
              Explore neighborhoods by scanning 10+ buildings in an area to earn your first visa.
            </Text>
          </View>
        ) : (
          <Animated.FlatList
            data={displayVisas}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={ITEM_SIZE}
            decelerationRate="fast"
            contentContainerStyle={styles.carousel}
            onScroll={onScroll}
            scrollEventThrottle={16}
            renderItem={({ item, index }) => (
              <VisaCard item={item} index={index} scrollX={scrollX} />
            )}
          />
        )}
      </View>

      <InfoMenu
        visible={showInfoMenu}
        onClose={() => setShowInfoMenu(false)}
        title="NEIGHBORHOOD VISAS"
        content="Visas celebrate neighborhoods you know intimately. Earn them by meeting local visit requirements."
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
  headerRight: {
    width: 44,
    alignItems: "flex-end",
  },
  headerTitleContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.text,
    letterSpacing: 2,
    fontFamily: theme.typography.fontFamily.bold,
    textAlign: "center",
  },

  carouselWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  carousel: {
    paddingHorizontal: (width - ITEM_SIZE) / 2,
    alignItems: "center",
  },
  cardContainer: {
    width: ITEM_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 24,
    borderWidth: 4,
    minHeight: 440,
    justifyContent: "space-between",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 0,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  grantedAt: {
    fontSize: 10,
    color: theme.colors.muted,
    fontFamily: "Courier",
    letterSpacing: 1,
  },
  cardBody: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  cardTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: theme.colors.text,
    letterSpacing: -1,
    textTransform: "uppercase",
    fontFamily: theme.typography.fontFamily.bold,
    lineHeight: 36,
  },
  divider: {
    height: 4,
    backgroundColor: theme.colors.text,
    width: 40,
    marginBottom: 8,
  },
  requirement: {
    fontSize: 10,
    color: theme.colors.muted,
    fontWeight: "bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  description: {
    fontSize: 12,
    color: theme.colors.text,
    lineHeight: 18,
    fontFamily: "Courier",
    marginTop: 8,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 16,
  },
  footerText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
  },
  loadingText: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyTitle: {
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.text,
    letterSpacing: 2,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
