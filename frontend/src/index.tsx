import { AppRegistry } from 'react-native';
import App from './App';

// Register the app
AppRegistry.registerComponent('QuickPicks', () => App);

// Run the app
AppRegistry.runApplication('QuickPicks', {
  rootTag: document.getElementById('root'),
});
