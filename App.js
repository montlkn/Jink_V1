/*
  File: App.js
  Description: The main entry point for the entire application.
  Its only job is to render the main navigator.
*/
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import BottomTabNavigator from './src/navigation/BottomTabNavigator';

// This is our global color and theme configuration
const AppTheme = {
  dark: false,
  colors: {
    primary: '#000',
    background: '#F8F8F8',
    card: '#fff',
    text: '#000',
    border: '#e0e0e0',
    notification: 'rgb(255, 69, 58)',
  },
};

export default function App() {
  return (
    <NavigationContainer theme={AppTheme}>
      <BottomTabNavigator />
    </NavigationContainer>
  );
}
