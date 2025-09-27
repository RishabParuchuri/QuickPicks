import { AppRegistry } from 'react-native';
import App from './App';

// Register the app
AppRegistry.registerComponent('arena', () => App);

// Run the app
AppRegistry.runApplication('arena', {
  rootTag: document.getElementById('root'),
});
