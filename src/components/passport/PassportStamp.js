import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PassportStamp = ({ stamp, date }) => {
  // Format stamp name to fit in circular design
  const formatStampText = (text) => {
    if (text.length > 12) {
      return text.substring(0, 12);
    }
    return text;
  };

  // Get or format date
  const stampDate = date || new Date().toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).toUpperCase();

  return (
    <View style={styles.stampContainer}>
      <View style={styles.stampOuter}>
        <View style={styles.stampInner}>
          <Text style={styles.stampLocation}>{formatStampText(stamp)}</Text>
          <View style={styles.stampDivider} />
          <Text style={styles.stampDate}>{stampDate}</Text>
          <Text style={styles.stampCode}>NYC</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  stampContainer: {
    marginRight: 12,
    marginBottom: 8,
  },
  stampOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: '#E74C3C',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-5deg' }],
  },
  stampInner: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 1.5,
    borderColor: '#E74C3C',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  stampLocation: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#E74C3C',
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  stampDivider: {
    width: 30,
    height: 1,
    backgroundColor: '#E74C3C',
    marginVertical: 4,
  },
  stampDate: {
    fontSize: 8,
    fontWeight: '600',
    color: '#E74C3C',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  stampCode: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#E74C3C',
    marginTop: 2,
    letterSpacing: 1,
  },
});

export default PassportStamp;
