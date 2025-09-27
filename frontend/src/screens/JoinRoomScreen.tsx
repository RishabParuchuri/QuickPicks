import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { 
  Title, 
  Button, 
  Card, 
  Paragraph,
  TextInput,
  useTheme,
  Snackbar
} from 'react-native-paper';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiService } from '../services/ApiService';

const JoinRoomScreen: React.FC = () => {
  const navigate = useNavigate();
  const { playerName } = useParams<{ playerName: string }>();
  const theme = useTheme();
  const [roomId, setRoomId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const decodedPlayerName = playerName ? decodeURIComponent(playerName).trim() : '';

  const handleJoinRoom = async () => {
    if (!roomId.trim()) {
      setError('Please enter a room ID');
      return;
    }

    setLoading(true);
    try {
      await ApiService.getRoomInfo(roomId.trim());
      
      navigate(`/player-game/${roomId.trim()}/${encodeURIComponent(decodedPlayerName)}`);
    } catch (err) {
      setError('Room not found. Please check the Room ID.');
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
          Join Game Room
        </Title>
        
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Paragraph style={{ color: theme.colors.onSurface, marginBottom: 20 }}>
              Player: {decodedPlayerName}
            </Paragraph>
            
            <TextInput
              label="Room ID"
              value={roomId}
              onChangeText={setRoomId}
              mode="outlined"
              style={styles.input}
              placeholder="Enter the room ID from host"
              autoCapitalize="none"
            />
            
            <Paragraph style={[styles.helpText, { color: theme.colors.outline }]}>
              Ask the host for the Room ID to join their game.
            </Paragraph>
            
            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={handleBack}
                style={styles.backButton}
                disabled={loading}
              >
                Back
              </Button>
              
              <Button
                mode="contained"
                onPress={handleJoinRoom}
                style={[styles.joinButton, { backgroundColor: theme.colors.primary }]}
                disabled={!roomId.trim() || loading}
                loading={loading}
              >
                Join Room
              </Button>
            </View>
          </Card.Content>
        </Card>
        
        <Card style={[styles.infoCard, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Card.Content>
            <Paragraph style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              💡 Tip: Room IDs are usually 8 characters long and provided by the game host.
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
  },
  title: {
    textAlign: 'center',
    marginBottom: 30,
    fontSize: 24,
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 20,
  },
  input: {
    marginBottom: 10,
  },
  helpText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backButton: {
    flex: 0.4,
    marginRight: 10,
  },
  joinButton: {
    flex: 0.6,
    marginLeft: 10,
  },
  infoCard: {
    marginBottom: 20,
  },
});

export default JoinRoomScreen;