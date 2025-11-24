import React, { useCallback, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { visaCarousel } from "@/constants/passportContent";
import { screens, type RootParams } from "@/navigation/routes";
import { PassportBackdrop, PassportInfoButton } from "@/features/passport";

type Navigation = NativeStackNavigationProp<RootParams, typeof screens.PassportVisas>;

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.9;

function VisaCard({ item }: { item: (typeof visaCarousel)[number] }) {
  return (
    <View style={[styles.card, { borderColor: item.accent }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.badge, { backgroundColor: `${item.accent}14` }]}>
          <Ionicons name="document-text" size={18} color={item.accent} />
          <Text style={[styles.badgeText, { color: item.accent }]}>{item.neighborhood}</Text>
        </View>
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.requirement}>{item.requirement}</Text>
      <Text style={styles.description}>{item.description}</Text>
      <Text style={styles.grantedAt}>Granted {item.grantedAt}</Text>
    </View>
  );
}

export default function VisasScreen(): JSX.Element {
  const navigation = useNavigation<Navigation>();
  const [activeIndex, setActiveIndex] = useState(0);
  const handleInfo = useCallback(() => {
    Alert.alert(
      "Neighborhood Visas",
      "Visas celebrate neighborhoods you know intimately. Earn them by meeting local visit requirements—unique scans, twilight derives, or other place-based goals. Each visa tells the story of how you qualified."
    );
  }, []);

  const onMomentumEnd = useCallback(
    ({
      nativeEvent,
    }: {
      nativeEvent: { contentOffset: { x: number } };
    }) => {
      const nextIndex = Math.round(nativeEvent.contentOffset.x / CARD_WIDTH);
      setActiveIndex(nextIndex);
    },
    []
  );

  return (
    <SafeAreaView style={styles.container}>
      <PassportBackdrop tailColor="#F6F2EA" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Neighborhood Visas</Text>
        <PassportInfoButton
          style={styles.infoButton}
          onPress={handleInfo}
          accessibilityLabel="Learn about visas"
        />
      </View>
      <Text style={styles.subheader}>
        Visas unlock when you know a neighborhood by heart. Review your signatures and plan the next
        dossier.
      </Text>

      <View style={styles.carouselWrapper}>
        <FlatList
          data={visaCarousel}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToAlignment="center"
          snapToInterval={CARD_WIDTH}
          decelerationRate="fast"
          contentContainerStyle={styles.carousel}
          renderItem={({ item }) => (
            <View style={{ width: CARD_WIDTH, marginRight: 16 }}>
              <VisaCard item={item} />
            </View>
          )}
          onMomentumScrollEnd={onMomentumEnd}
        />
      </View>

      <View style={styles.pagination}>
        {visaCarousel.map((visa, index) => (
          <View
            key={visa.id}
            style={[
              styles.dot,
              {
                backgroundColor: index === activeIndex ? visa.accent : "#CBD5F5",
              },
            ]}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F2EA",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
    zIndex: 3,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  infoButton: {
    marginBottom: 2,
  },
  subheader: {
    fontSize: 14,
    color: "#475569",
    paddingHorizontal: 20,
    marginBottom: 24,
    zIndex: 2,
  },
  carouselWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 60,
  },
  carousel: {
    paddingHorizontal: (width - CARD_WIDTH) / 2,
    alignItems: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    gap: 14,
    minHeight: 360,
    justifyContent: "space-between",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  grantedAt: {
    fontSize: 12,
    color: "#475569",
    textAlign: "right",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  requirement: {
    fontSize: 13,
    color: "#1F2937",
    fontWeight: "600",
  },
  description: {
    fontSize: 13,
    color: "#475569",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 24,
    marginBottom: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
