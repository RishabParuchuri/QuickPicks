import React from 'react';
import { useNavigation } from './NavigationProvider';
import HomeScreen from '../screens/HomeScreen';
import CreateRoomScreen from '../screens/CreateRoomScreen';
import JoinRoomScreen from '../screens/JoinRoomScreen';
import HostDashboardScreen from '../screens/HostDashboardScreen';
import PlayerGameScreen from '../screens/PlayerGameScreen';
import AdminScreen from '../screens/AdminScreen';

const AppNavigator: React.FC = () => {
  const { currentScreen } = useNavigation();

  switch (currentScreen) {
    case 'home':
      return <HomeScreen />;
    case 'create-room':
      return <CreateRoomScreen />;
    case 'join-room':
      return <JoinRoomScreen />;
    case 'host-dashboard':
      return <HostDashboardScreen />;
    case 'player-game':
      return <PlayerGameScreen />;
    case 'admin':
      return <AdminScreen />;
    default:
      return <HomeScreen />;
  }
};

export default AppNavigator;