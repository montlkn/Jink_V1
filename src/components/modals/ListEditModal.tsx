import { BlurView } from "expo-blur";
import { useEffect, useState } from "react";
import {
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import ModalCloseButton from "./ModalCloseButton";

type ListEditModalProps = {
  visible: boolean;
  initialName: string;
  initialTagline: string;
  initialMood: string;
  onClose: () => void;
  onSave: (name: string, tagline: string, mood: string) => void;
};

export function ListEditModal({
  visible,
  initialName,
  initialTagline,
  initialMood,
  onClose,
  onSave,
}: ListEditModalProps): JSX.Element {
  const [name, setName] = useState(initialName);
  const [tagline, setTagline] = useState(initialTagline);
  const [mood, setMood] = useState(initialMood);

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setTagline(initialTagline);
      setMood(initialMood);
    }
  }, [visible, initialName, initialTagline, initialMood]);

  const handleSave = () => {
    onSave(name, tagline, mood);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit List</Text>
              <View style={styles.headerRight}>
                <ModalCloseButton onPress={onClose} />
              </View>
            </View>

            <View style={styles.form}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>List Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter list name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Tagline</Text>
                <TextInput
                  style={styles.input}
                  value={tagline}
                  onChangeText={setTagline}
                  placeholder="Enter tagline"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={mood}
                  onChangeText={setMood}
                  placeholder="Enter description"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    width: "90%",
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    fontFamily: "Courier",
    letterSpacing: 0.5,
  },
  headerRight: {
    zIndex: 1,
  },
  form: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
    fontFamily: "Courier",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#F9FAFB",
    fontFamily: "Courier",
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    fontFamily: "Courier",
    letterSpacing: 0.5,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#1ABC9C",
    alignItems: "center",
  },
  saveText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    fontFamily: "Courier",
    letterSpacing: 0.5,
  },
});

export default ListEditModal;
