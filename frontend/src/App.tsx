import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Provider as PaperProvider, MD3DarkTheme } from 'react-native-paper';
import AppRouter from './router/AppRouter';
import './App.css';

// Custom theme with purple/dark grey theme (PrizePicks inspired)
const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#8B5CF6', // Purple
    primaryContainer: '#7C3AED',
    secondary: '#A855F7',
    secondaryContainer: '#9333EA',
    surface: '#1F2937', // Dark grey
    surfaceVariant: '#374151',
    background: '#111827', // Very dark grey
    onBackground: '#F9FAFB',
    onSurface: '#F9FAFB',
    outline: '#6B7280',
  },
};

function App() {
  const { width, height } = useWindowDimensions();
  
  return (
    <PaperProvider theme={theme}>
      <View style={{ 
        width,
        height,
        backgroundColor: theme.colors.background
      }}>
        <AppRouter />
      </View>
    </PaperProvider>
  );
}

export default App;
