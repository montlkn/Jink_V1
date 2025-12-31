import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import { BlurView } from "expo-blur";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ModalCloseButton from "./ModalCloseButton";

type CreateListModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, tagline: string, mood: string) => Promise<void>;
};

export function CreateListModal({
  visible,
  onClose,
  onSave,
}: CreateListModalProps): JSX.Element {
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [mood, setMood] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;

    setSaving(true);
    try {
      await onSave(name.trim(), tagline.trim(), mood.trim());
      // Reset form
      setName("");
      setTagline("");
      setMood("");
      onClose();
    } catch (error) {
      console.error("[CreateListModal] Save error:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setName("");
    setTagline("");
    setMood("");
    onClose();
  };

  const canSave = name.trim().length > 0 && !saving;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <View style={styles.bottomSheet}>
            <View style={styles.handle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>NEW LIST</Text>
              <View style={styles.headerRight}>
                <ModalCloseButton onPress={handleClose} />
              </View>
            </View>

            <View style={styles.form}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>LIST NAME *</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Art Deco Favorites"
                  placeholderTextColor={theme.colors.muted}
                  autoFocus
                  returnKeyType="next"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>TAGLINE</Text>
                <TextInput
                  style={styles.input}
                  value={tagline}
                  onChangeText={setTagline}
                  placeholder="e.g. Golden age glamour"
                  placeholderTextColor={theme.colors.muted}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>DESCRIPTION</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={mood}
                  onChangeText={setMood}
                  placeholder="What makes this collection special?"
                  placeholderTextColor={theme.colors.muted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>

            <SafeAreaView edges={["bottom"]}>
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.cancelButton} onPress={handleClose} disabled={saving}>
                  <Text style={styles.cancelText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={!canSave}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={theme.colors.background} />
                  ) : (
                    <Text style={styles.saveText}>CREATE</Text>
                  )}
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  backdrop: {
    flex: 1,
  },
  keyboardView: {
    justifyContent: "flex-end",
  },
  bottomSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: theme.colors.accent,
    overflow: "hidden",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.muted,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
    letterSpacing: 2,
  },
  headerRight: {
    zIndex: 1,
  },
  form: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: "bold",
    color: theme.colors.accent,
    marginBottom: 8,
    letterSpacing: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    fontFamily: "Courier",
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelText: {
    fontSize: 12,
    fontWeight: "bold",
    color: theme.colors.muted,
    letterSpacing: 1,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveText: {
    fontSize: 12,
    fontWeight: "bold",
    color: theme.colors.background,
    letterSpacing: 1,
  },
});

export default CreateListModal;
