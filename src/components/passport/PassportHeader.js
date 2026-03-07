import { DESIGNER_REPUBLIC_THEME as theme } from '@/theme/designer_republic';
import { generateIdRef } from '@/utils/idGenerator';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PassportLogoutButton } from './PassportLogoutButton';

import { LinearGradient } from 'expo-linear-gradient';

const PassportHeader = ({ issueDate, totalBuildingsScanned, onLogout, levelTitle, levelTier, style }) => {
  const [idRef, setIdRef] = useState('DR-LOAD-ING');

  useEffect(() => {
    generateIdRef().then(setIdRef);
  }, []);

  const displayTitle = levelTitle || 'NEWCOMER';
  const displayTier = levelTier || 'EXPLORER';

  return (
    <LinearGradient
      colors={[theme.colors.background, theme.colors.background, `${theme.colors.background}00`]}
      locations={[0, 0.5, 1]}
      style={[styles.headerContainer, style]}
    >
      {/* Top bar with status and logout */}
      <View style={styles.topBar}>
        <View style={styles.statusRow}>
          <View style={styles.indicator} />
          <Text style={styles.systemText}>SYS READY</Text>
        </View>
        <PassportLogoutButton
          onPress={onLogout}
          style={styles.logoutButton}
        />
      </View>
      
      {/* Passport info */}
      <View style={styles.passportInfo}>
        <View style={styles.dataRow}>
          <Text style={styles.passportLabel}>ID REF</Text>
          <Text style={styles.passportNumber}>
            {idRef}
          </Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.passportLabel}>RANK</Text>
          <Text style={styles.rankTitle}>
            {displayTitle.toUpperCase()} 
            <Text style={styles.tierText}> • {displayTier.toUpperCase()}</Text>
          </Text>
        </View>
        
        <View style={styles.metaRow}>
          {issueDate && (
            <View style={styles.metaItem}>
              <Text style={styles.passportLabel}>ISSUED</Text>
              <Text style={styles.passportDate}>{issueDate}</Text>
            </View>
          )}

          {totalBuildingsScanned !== undefined && (
            <View style={styles.metaItem}>
              <Text style={styles.passportLabel}>BUILDINGS</Text>
              <Text style={styles.passportDate}>{totalBuildingsScanned} SCANNED</Text>
            </View>
          )}
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: 60,
    paddingBottom: 24, // Increased padding for better fade area
    paddingHorizontal: 20,
    // Background handled by gradient
    // Border removed for seamless fade
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12, // Space between top bar and info
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  indicator: {
    width: 8,
    height: 8,
    backgroundColor: theme.colors.accent,
    borderRadius: 12,
  },
  systemText: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  passportInfo: {
    gap: 8,
  },
  dataRow: {
    gap: 2,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 4,
  },
  metaItem: {
    gap: 2,
  },
  passportLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.muted,
    letterSpacing: 1,
  },
  passportNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    letterSpacing: 1,
    fontFamily: theme.typography.fontFamily.bold,
  },
  rankTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
    letterSpacing: 1,
    fontFamily: theme.typography.fontFamily.bold,
  },
  tierText: {
    fontSize: 12,
    color: theme.colors.muted,
    fontWeight: '600',
  },
  passportDate: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    letterSpacing: 1,
  },
  logoutButton: {
    // Styles handled by component
  },
});

export default PassportHeader;
