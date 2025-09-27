import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { 
  Title, 
  Button, 
  Card, 
  Paragraph,
  TextInput,
  useTheme,
  ActivityIndicator,
  Snackbar
} from 'react-native-paper';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiService } from '../services/ApiService';

const JoinRoomByIdScreen: React.FC = () => {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const theme = useTheme();
  
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [roomInfo, setRoomInfo] = useState<any>(null);

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!roomId) {
      setError('Room ID is missing');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // First, check if the room exists
      const roomData = await ApiService.getRoomInfo(roomId);
      setRoomInfo(roomData);

      // Navigate to the player game screen
      navigate(`/player-game/${roomId}/${encodeURIComponent(playerName.trim())}`);
    } catch (err) {
      console.error('Error joining room:', err);
      setError('Room not found or failed to join. Please check the room ID.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Title style={[styles.title, { color: theme.colors.onBackground }]}>
          Join Room
        </Title>
        
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={{ color: theme.colors.onSurface, fontSize: 18 }}>
              Room ID: {roomId}
            </Title>
            
            {roomInfo && (
              <View style={styles.roomInfo}>
                <Paragraph style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
                  {roomInfo?.room?.name || 'Unknown Room'}
                </Paragraph>
                <Paragraph style={{ color: theme.colors.outline }}>
                  Game: {roomInfo?.room?.game_name || 'Unknown Game'}
                </Paragraph>
                <Paragraph style={{ color: theme.colors.outline }}>
                  Status: {roomInfo?.room?.game_status || 'Unknown'}
                </Paragraph>
                <Paragraph style={{ color: theme.colors.outline }}>
                  Players: {Object.keys(roomInfo?.room?.players || {}).length}
                </Paragraph>
              </View>
            )}
            
            <TextInput
              label="Your Name"
              value={playerName}
              onChangeText={setPlayerName}
              mode="outlined"
              style={styles.nameInput}
              placeholder="Enter your name"
              maxLength={20}
              disabled={loading}
            />
            
            <Button
              mode="contained"
              onPress={handleJoinRoom}
              style={[styles.joinButton, { backgroundColor: theme.colors.primary }]}
              disabled={loading || !playerName.trim()}
              loading={loading}
            >
              {loading ? 'Joining...' : 'Join Room'}
            </Button>
            
            <Button
              mode="outlined"
              onPress={handleBack}
              style={styles.backButton}
              disabled={loading}
            >
              Back to Home
            </Button>
          </Card.Content>
        </Card>

        {/* Instructions */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Card.Content>
            <Title style={{ color: theme.colors.onSurfaceVariant, fontSize: 16 }}>
              How to Join
            </Title>
            <Paragraph style={{ color: theme.colors.onSurfaceVariant, marginTop: 5 }}>
              1. Enter your name above
            </Paragraph>
            <Paragraph style={{ color: theme.colors.onSurfaceVariant }}>
              2. Click "Join Room" to enter the game
            </Paragraph>
            <Paragraph style={{ color: theme.colors.onSurfaceVariant }}>
              3. Wait for the host to start the game
            </Paragraph>
          </Card.Content>
        </Card>
      </View>
      
      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={4000}
      >
        {error}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 30,
    fontSize: 28,
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 20,
  },
  roomInfo: {
    marginVertical: 15,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  nameInput: {
    marginVertical: 15,
    backgroundColor: 'transparent',
  },
  joinButton: {
    marginVertical: 10,
    paddingVertical: 8,
  },
  backButton: {
    marginTop: 10,
  },
});

export default JoinRoomByIdScreen;
