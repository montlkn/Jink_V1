import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import PillButton from '../common/PillButton';

const PassportHeader = ({ passportNumber, issueDate, onLogout }) => {
  return (
    <LinearGradient
      colors={[
        '#1a2332',
        '#2a3e5a',
        '#3a5270',
        'rgba(58, 82, 112, 0.85)',
        'rgba(58, 82, 112, 0.6)',
        'rgba(248, 248, 248, 0.3)',
        'rgba(248, 248, 248, 0)'
      ]}
      locations={[0, 0.2, 0.4, 0.6, 0.75, 0.9, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.headerContainer}
      pointerEvents="box-none"
    >
      <View style={styles.passportHeader}>
        {/* Passport Number and Logout */}
        <View style={styles.passportHeaderBottom}>
          <View style={styles.passportInfo}>
            <Text style={styles.passportLabel}>PASSPORT NO.</Text>
            <Text style={styles.passportNumber}>
              {passportNumber || 'AR-0000-0000'}
            </Text>
            {issueDate && (
              <>
                <Text style={styles.passportLabel}>DATE OF ISSUE</Text>
                <Text style={styles.passportDate}>{issueDate}</Text>
              </>
            )}
          </View>
          <PillButton
            title="Logout"
            onPress={onLogout}
            style={styles.logoutButton}
            textStyle={styles.logoutText}
          />
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    height: 180,
  },
  passportHeader: {
    gap: 12,
  },
  passportHeaderBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 16,
  },
  passportInfo: {
    flex: 1,
  },
  passportLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(212, 175, 55, 0.7)',
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 2,
  },
  passportNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
    fontFamily: 'Courier',
  },
  passportDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 1,
  },
  logoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: '#d4af37',
    borderWidth: 1,
  },
  logoutText: {
    color: '#d4af37',
    fontSize: 11,
  },
});

export default PassportHeader;
