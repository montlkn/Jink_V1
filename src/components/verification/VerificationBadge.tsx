import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DESIGNER_REPUBLIC_THEME as theme } from '@/theme/designer_republic';
import { APP_COLORS } from '@/constants/appColors';

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
        color: APP_COLORS.success,
        backgroundColor: APP_COLORS.success + '20',
        icon: '✓✓',
      },
      verified: {
        text: `✓ ${verifiedCount} users`,
        color: theme.colors.secondary,
        backgroundColor: theme.colors.secondary + '20',
        icon: '✓',
      },
      partially_verified: {
        text: `⚠ ${verifiedCount} users`,
        color: APP_COLORS.warning,
        backgroundColor: APP_COLORS.warning + '20',
        icon: '⚠',
      },
      unverified: {
        text: verifiedCount === 1 ? '1 user' : `${verifiedCount} users`,
        color: theme.colors.muted,
        backgroundColor: theme.colors.muted + '20',
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
