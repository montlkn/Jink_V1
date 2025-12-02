import PassportStamp from "@/components/passport/PassportStamp";
import type { StampDefinition } from "@/constants/passportContent";
import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
// BlurView removed - using solid overlay instead
import {
    ScrollView, StyleSheet, Text, View
} from "react-native";
import FlipModal from "./FlipModal";
import ModalCloseButton from "./ModalCloseButton";

type StampDetailModalProps = {
  visible: boolean;
  stamp: StampDefinition | null;
  onClose: () => void;
};

const rarityColors: Record<StampDefinition["rarity"], string> = {
  common: theme.colors.muted,
  rare: theme.colors.secondary,
  epic: theme.colors.primary,
  legendary: theme.colors.accent,
};

const rarityLabels: Record<StampDefinition["rarity"], string> = {
  common: "COMMON",
  rare: "RARE",
  epic: "EPIC",
  legendary: "LEGENDARY",
};

export function StampDetailModal({ visible, stamp, onClose }: StampDetailModalProps): JSX.Element {
  if (!stamp) return <></>;

  const rarityColor = rarityColors[stamp.rarity];

  return (
    <FlipModal visible={visible} onClose={onClose}>
          <View style={[styles.modalContent, { borderColor: rarityColor }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { backgroundColor: rarityColor }]}>
              <Text style={styles.headerTitle}>STAMP DOSSIER</Text>
              <ModalCloseButton onPress={onClose} />
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              {/* Stamp Display */}
              <View style={styles.stampContainer}>
                <PassportStamp stamp={stamp.title} date={stamp.issuedAt} size={100} />
              </View>

              {/* Title & Rarity */}
              <View style={styles.section}>
                <Text style={styles.stampTitle}>{stamp.title}</Text>
                <View style={[styles.rarityBadge, { borderColor: rarityColor }]}>
                  <Text style={[styles.rarityText, { color: rarityColor }]}>
                    {rarityLabels[stamp.rarity]}
                  </Text>
                </View>
              </View>

              {/* Description */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>DESCRIPTION</Text>
                <Text style={styles.description}>{stamp.description}</Text>
              </View>

              {/* Source */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>SOURCE</Text>
                <Text style={styles.sourceText}>{stamp.source}</Text>
              </View>

              {/* Issue Date */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>ISSUED</Text>
                <Text style={styles.dateText}>
                  {new Date(stamp.issuedAt).toLocaleDateString("en-US", {
                    month: "numeric",
                    day: "numeric",
                    year: "numeric",
                  }).split('/').join('.')}
                </Text>
              </View>
            </ScrollView>
          </View>
    </FlipModal>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderRadius: 12,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.background,
    letterSpacing: 1,
    fontFamily: "Courier",
  },

  scrollView: {
    maxHeight: 500,
  },
  stampContainer: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  stampTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 12,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  rarityBadge: {
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 0,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontFamily: "Courier",
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    fontFamily: "Courier",
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text,
    fontFamily: "Courier",
  },
  sourceText: {
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: "Courier",
  },
  dateText: {
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: "Courier",
  },
});

export default StampDetailModal;
