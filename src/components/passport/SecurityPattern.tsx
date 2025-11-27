import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, G, LinearGradient, Path, Pattern, Rect, Stop } from "react-native-svg";

type SecurityPatternProps = {
  width: number;
  height: number;
  color?: string;
  opacity?: number;
};

export function SecurityPattern({ width, height, color = "#000", opacity = 0.5 }: SecurityPatternProps) {
  return (
    <View style={[styles.container, { width, height, opacity }]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern
            id="guilloche"
            patternUnits="userSpaceOnUse"
            width="120"
            height="120"
            patternTransform="rotate(30)"
          >
            {/* Complex Guilloche-like geometric pattern */}
            <Circle cx="60" cy="60" r="50" stroke={color} strokeWidth="0.5" fill="none" opacity="0.8" />
            <Circle cx="60" cy="60" r="40" stroke={color} strokeWidth="0.5" fill="none" opacity="0.6" />
            <Circle cx="60" cy="60" r="30" stroke={color} strokeWidth="0.5" fill="none" opacity="0.4" />
            
            <Path d="M10 60 Q 60 10 110 60 T 210 60" stroke={color} strokeWidth="0.5" fill="none" />
            <Path d="M10 70 Q 60 20 110 70 T 210 70" stroke={color} strokeWidth="0.5" fill="none" />
            
            {/* Security Micro-text simulation */}
            <Path d="M20 20 h80 M20 25 h80 M20 30 h80" stroke={color} strokeWidth="0.2" strokeDasharray="2,1" />
          </Pattern>
          
          <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.3" />
            <Stop offset="0.5" stopColor={color} stopOpacity="0.1" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        
        {/* Base Pattern Fill */}
        <Rect width="100%" height="100%" fill="url(#guilloche)" />
        
        {/* CAD / Tech Lines */}
        <G opacity="0.7">
          <Path d={`M${width * 0.1} 0 v${height}`} stroke={color} strokeWidth="0.5" strokeDasharray="10, 5" />
          <Path d={`M${width * 0.9} 0 v${height}`} stroke={color} strokeWidth="0.5" strokeDasharray="10, 5" />
          <Path d={`M0 ${height * 0.33} h${width}`} stroke={color} strokeWidth="0.5" strokeDasharray="10, 5" />
          <Path d={`M0 ${height * 0.66} h${width}`} stroke={color} strokeWidth="0.5" strokeDasharray="10, 5" />
          
          {/* Crosshairs */}
          <Path d={`M${width * 0.5} ${height * 0.5} m-10 0 h20 m-10 -10 v20`} stroke={color} strokeWidth="1" />
        </G>

        {/* Security Color Shapes (CMYK style overlays) */}
        <G opacity="0.4">
           <Circle cx={width * 0.8} cy={height * 0.2} r={30} fill="cyan" opacity="0.2" />
           <Circle cx={width * 0.85} cy={height * 0.25} r={30} fill="magenta" opacity="0.2" />
           <Rect x={width * 0.1} y={height * 0.8} width={40} height={40} fill="yellow" opacity="0.2" />
        </G>

        {/* Topographic Curves */}
        <G opacity="0.6">
          <Path
            d={`M0 ${height * 0.2} C ${width * 0.4} ${height * 0.1}, ${width * 0.6} ${height * 0.3}, ${width} ${height * 0.2}`}
            stroke={color}
            strokeWidth="1"
            fill="none"
          />
          <Path
            d={`M0 ${height * 0.8} C ${width * 0.4} ${height * 0.9}, ${width * 0.6} ${height * 0.7}, ${width} ${height * 0.8}`}
            stroke={color}
            strokeWidth="1"
            fill="none"
          />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: -1,
    overflow: "hidden",
  },
});
