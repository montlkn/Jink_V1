import { DESIGNER_REPUBLIC_THEME as theme } from "@/theme/designer_republic";
import { StyleSheet, Text, View } from "react-native";

const PassportStamp = ({ stamp, date, size = 80 }) => {
  // Generate a deterministic color based on the stamp title
  const getColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      theme.colors.primary,
      theme.colors.secondary,
      theme.colors.accent,
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  const stampColor = getColor(stamp);
  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  });

  return (
    <View style={[styles.container, { width: size, height: size, borderColor: stampColor }]}>
      <View style={[styles.innerBorder, { borderColor: stampColor }]}>
        <View style={styles.content}>
          <Text style={[styles.stampText, { color: stampColor, fontSize: size * 0.12, fontWeight: 'bold' }]} numberOfLines={2}>
            {stamp.toUpperCase()}
          </Text>
          <View style={[styles.divider, { backgroundColor: stampColor }]} />
          <Text style={[styles.dateText, { color: stampColor, fontSize: size * 0.1 }]}>
            {formattedDate}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    transform: [{ rotate: "-5deg" }],
    borderRadius: 12,
  },
  innerBorder: {
    width: "90%",
    height: "90%",
    borderWidth: 1,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  stampText: {
    textAlign: "center",
    fontFamily: "Courier",
    paddingHorizontal: 2,
    maxWidth: '95%',
  },
  divider: {
    width: "40%",
    height: 1,
    marginVertical: 4,
  },
  dateText: {
    textAlign: "center",
    fontFamily: "Courier",
  },
  stampDivider: {
    width: 30,
    height: 2,
    backgroundColor: theme.colors.primary,
    marginVertical: 4,
  },
  stampDate: {
    fontSize: 8,
    fontWeight: '600',
    color: theme.colors.primary,
    textAlign: 'center',
    letterSpacing: 1,
  },
  stampCode: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 2,
    letterSpacing: 2,
  },
});

export default PassportStamp;
