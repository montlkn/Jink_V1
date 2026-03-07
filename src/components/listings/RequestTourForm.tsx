/**
 * RequestTourForm — modal form for requesting a tour of a listing
 *
 * Fields: name, email, phone, tour type, date, time, message
 * Submits to listing_applications table
 */

import { useAuth } from '@/auth/authProvider';
import { log } from '@/lib/log';
import { submitTourRequest, type PropertyListing } from '@/services/listingsService';
import { DESIGNER_REPUBLIC_THEME as theme } from '@/theme/designer_republic';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface RequestTourFormProps {
  visible: boolean;
  listing: PropertyListing;
  onClose: () => void;
}

export function RequestTourForm({ visible, listing, onClose }: RequestTourFormProps) {
  const { session } = useAuth() as any;
  const userId = session?.user?.id;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tourType, setTourType] = useState<'in_person' | 'virtual' | 'open_house'>('in_person');
  const [preferredDateTime, setPreferredDateTime] = useState('Tomorrow Afternoon');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Predefined date/time options
  const dateTimeOptions = [
    'Today Morning',
    'Today Afternoon',
    'Today Evening',
    'Tomorrow Morning',
    'Tomorrow Afternoon',
    'Tomorrow Evening',
    'This Weekend',
    'Next Week',
    'Flexible',
  ];

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setSubmitting(true);

    try {
      const result = await submitTourRequest({
        listingId: listing.id,
        agentId: listing.agent_id,
        userId,
        applicantName: name,
        applicantEmail: email,
        applicantPhone: phone || undefined,
        tourType,
        preferredDate: preferredDateTime,
        preferredTime: undefined,
        message: message || undefined,
      });

      if (result.success) {
        Alert.alert(
          'Request Sent!',
          'Your tour request has been sent to the listing agent. They will contact you soon.',
          [{ text: 'OK', onPress: onClose }]
        );
        // Reset form
        setName('');
        setEmail('');
        setPhone('');
        setPreferredDateTime('Tomorrow Afternoon');
        setMessage('');
      } else {
        Alert.alert('Error', result.error || 'Failed to submit tour request. Please try again.');
      }
    } catch (error) {
      log.error('[RequestTourForm] Submit error', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Request A Tour</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Name */}
            <View style={styles.field}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your full name"
                placeholderTextColor={theme.colors.muted}
                autoCapitalize="words"
              />
            </View>

            {/* Email */}
            <View style={styles.field}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor={theme.colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Phone */}
            <View style={styles.field}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="(555) 123-4567"
                placeholderTextColor={theme.colors.muted}
                keyboardType="phone-pad"
              />
            </View>

            {/* Tour Type */}
            <View style={styles.field}>
              <Text style={styles.label}>Tour Type</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={tourType}
                  onValueChange={(value) => setTourType(value)}
                  style={styles.picker}
                  itemStyle={styles.pickerItemStyle}
                >
                  <Picker.Item label="In-Person Tour" value="in_person" />
                  <Picker.Item label="Virtual Tour" value="virtual" />
                  <Picker.Item label="Open House" value="open_house" />
                </Picker>
              </View>
            </View>

            {/* Preferred Date & Time */}
            <View style={styles.field}>
              <Text style={styles.label}>When would you like to tour?</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={preferredDateTime}
                  onValueChange={(value) => setPreferredDateTime(value)}
                  style={styles.picker}
                  itemStyle={styles.pickerItemStyle}
                >
                  {dateTimeOptions.map((option) => (
                    <Picker.Item key={option} label={option} value={option} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Message */}
            <View style={styles.field}>
              <Text style={styles.label}>Message (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={message}
                onChangeText={setMessage}
                placeholder="Any additional information or questions..."
                placeholderTextColor={theme.colors.muted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color={theme.colors.white} />
              ) : (
                <>
                  <Ionicons name="send" size={18} color={theme.colors.white} />
                  <Text style={styles.submitButtonText}>Send Request</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: 'monospace',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text,
    fontFamily: 'monospace',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  picker: {
    color: theme.colors.text,
    backgroundColor: 'transparent',
  },
  pickerItemStyle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text,
    fontFamily: 'monospace',
    height: 120,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 4,
    gap: 8,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: '700',
    color: theme.colors.white,
    fontFamily: 'monospace',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
