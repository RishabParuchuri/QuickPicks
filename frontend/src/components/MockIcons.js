// Mock icons to replace react-native-vector-icons
import React from 'react';
import { Text } from 'react-native';

// Simple text-based icon replacement
const MockIcon = ({ name, size = 24, color = '#000', ...props }) => (
  <Text style={{ fontSize: size, color, fontFamily: 'sans-serif' }} {...props}>
    {getIconText(name)}
  </Text>
);

const getIconText = (name) => {
  const iconMap = {
    // Common icons used in the app
    'home': '🏠',
    'plus': '+',
    'users': '👥',
    'play': '▶️',
    'stop': '⏹️',
    'trophy': '🏆',
    'clock': '🕐',
    'check': '✓',
    'close': '✕',
    'menu': '☰',
    'arrow-back': '←',
    'arrow-forward': '→',
    'settings': '⚙️',
    'star': '⭐',
    'heart': '♥️',
    // Default fallback
    default: '●'
  };
  
  return iconMap[name] || iconMap.default;
};

export default MockIcon;