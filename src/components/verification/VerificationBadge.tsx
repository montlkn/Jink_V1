import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface VerificationBadgeProps {
  verifiedCount: number;
  reliabilityScore: number;
  onPress?: () => void;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  verifiedCount,
  reliabilityScore,
  onPress,
}) => {
  const getVerificationStatus = () => {
    if (reliabilityScore >= 0.9) return 'highly_verified';
    if (reliabilityScore >= 0.7) return 'verified';
    if (reliabilityScore >= 0.5) return 'partially_verified';
    return 'unverified';
  };

  const getBadgeConfig = () => {
    const status = getVerificationStatus();

    const configs = {
      highly_verified: {
        text: `✓✓ ${verifiedCount} users`,
        color: '#10b981',
        backgroundColor: '#10b98120',
        icon: '✓✓',
      },
      verified: {
        text: `✓ ${verifiedCount} users`,
        color: '#3b82f6',
        backgroundColor: '#3b82f620',
        icon: '✓',
      },
      partially_verified: {
        text: `⚠ ${verifiedCount} users`,
        color: '#f59e0b',
        backgroundColor: '#f59e0b20',
        icon: '⚠',
      },
      unverified: {
        text: verifiedCount === 1 ? '1 user' : `${verifiedCount} users`,
        color: '#6b7280',
        backgroundColor: '#6b728020',
        icon: '?',
      },
    };

    return configs[status];
  };

  const config = getBadgeConfig();

  const BadgeContent = (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.backgroundColor,
          borderColor: config.color,
        },
      ]}
    >
      <Text style={[styles.badgeText, { color: config.color }]}>
        {config.text}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {BadgeContent}
      </TouchableOpacity>
    );
  }

  return BadgeContent;
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
