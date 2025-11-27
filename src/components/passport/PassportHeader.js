import { DESIGNER_REPUBLIC_THEME as theme } from '@/theme/designer_republic';
import { generateIdRef } from '@/utils/idGenerator';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PassportLogoutButton } from './PassportLogoutButton';

const PassportHeader = ({ issueDate, onLogout }) => {
  const [idRef, setIdRef] = useState('DR-LOAD-ING');

  useEffect(() => {
    generateIdRef().then(setIdRef);
  }, []);

  return (
    <View style={styles.headerContainer}>
      <View style={styles.topBar}>
        <View style={styles.indicator} />
        <Text style={styles.systemText}>SYS READY</Text>
      </View>
      
      <View style={styles.passportHeader}>
        <View style={styles.passportInfo}>
          <View style={styles.dataRow}>
            <Text style={styles.passportLabel}>ID REF</Text>
            <Text style={styles.passportNumber}>
              {idRef}
            </Text>
          </View>
          
          {issueDate && (
            <View style={styles.dataRow}>
              <Text style={styles.passportLabel}>ISSUED</Text>
              <Text style={styles.passportDate}>{issueDate}</Text>
            </View>
          )}
        </View>
        
        <PassportLogoutButton
          onPress={onLogout}
          style={styles.logoutButton}
        />
      </View>
      
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    backgroundColor: theme.colors.accent,
    borderRadius: 0,
  },
  systemText: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  passportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  passportInfo: {
    gap: 8,
  },
  dataRow: {
    gap: 4,
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
  passportDate: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    letterSpacing: 1,
  },
  logoutButton: {
    // Styles handled by component, but can override here if needed
  },
  logoutText: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});

export default PassportHeader;
