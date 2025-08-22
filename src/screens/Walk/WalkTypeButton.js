// import React from 'react';
// import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
// import { BlurView } from 'expo-blur';

// const WalkTypeButton = ({ title, color, onPress }) => {
//   return (
//     <TouchableOpacity onPress={onPress} style={styles.container}>
//       <View style={styles.blurCircleContainer}>
//         <View style={[styles.blurCircle, { backgroundColor: color }]} />
//       </View>
//       <BlurView intensity={90} tint="light" style={styles.button}>
//         <Text style={styles.text}>{title}</Text>
//       </BlurView>
//     </TouchableOpacity>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   button: {
//     width: 200,
//     height: 70,
//     borderRadius: 35,
//     alignItems: 'center',
//     justifyContent: 'center',
//     overflow: 'hidden',
//     borderWidth: 1,
//     borderColor: 'rgba(255, 255, 255, 0.5)',
//   },
//   text: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#000',
//     letterSpacing: 1,
//   },
//   blurCircleContainer: {
//     position: 'absolute',
//   },
//   blurCircle: {
//     width: 150,
//     height: 150,
//     borderRadius: 75,
//   }
// });

// export default WalkTypeButton;
