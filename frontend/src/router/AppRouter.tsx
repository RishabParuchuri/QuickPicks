import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomeScreen from '../screens/HomeScreen';
import CreateRoomScreen from '../screens/CreateRoomScreen';
import JoinRoomScreen from '../screens/JoinRoomScreen';
import HostDashboardScreen from '../screens/HostDashboardScreen';
import PlayerGameScreen from '../screens/PlayerGameScreen';
import AdminScreen from '../screens/AdminScreen';
import VideoScreen from '../screens/VideoScreen';

const AppRouter: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/create-room/:hostName" element={<CreateRoomScreen />} />
        <Route path="/join-room/:playerName" element={<JoinRoomScreen />} />
        <Route path="/host-dashboard/:roomId/:hostName" element={<HostDashboardScreen />} />
        <Route path="/player-game/:roomId/:playerName" element={<PlayerGameScreen />} />
        <Route path="/video" element={<VideoScreen />} />
        <Route path="/admin" element={<AdminScreen />} />
        {/* Redirect any unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;