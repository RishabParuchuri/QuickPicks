import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { 
  Title, 
  Button, 
  Card, 
  Paragraph,
  TextInput,
  useTheme,
  RadioButton,
  Snackbar
} from 'react-native-paper';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiService } from '../services/ApiService';

interface Game {
  id: string;
  name: string;
  status: string;
  has_events: boolean;
}

const CreateRoomScreen: React.FC = () => {
  const navigate = useNavigate();
  const { hostName } = useParams<{ hostName: string }>();
  const theme = useTheme();
  const [roomName, setRoomName] = useState('');
  const [selectedGame, setSelectedGame] = useState('');
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const decodedHostName = hostName ? decodeURIComponent(hostName).trim() : '';

  useEffect(() => {
    loadAvailableGames();
  }, []);

  const loadAvailableGames = async () => {
    try {
      const response = await ApiService.getAvailableGames();
      setGames(response.games);
    } catch (err) {
      setError('Failed to load available games');
    }
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim() || !selectedGame) {
      return;
    }

    const selectedGameData = games.find(g => g.id === selectedGame);
    if (!selectedGameData?.has_events) {
      setError('Selected game is not available for betting yet');
      return;
    }

    setLoading(true);
    try {
      const response = await ApiService.createRoom({
        name: roomName.trim(),
        game_name: selectedGameData.name,
        host_name: decodedHostName
      });

      navigate(`/host-dashboard/${response.room_id}/${encodeURIComponent(decodedHostName)}`);
    } catch (err) {
      setError('Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  const selectedGameData = games.find(g => g.id === selectedGame);
  const canCreateRoom = roomName.trim() && selectedGame && selectedGameData?.has_events;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Title style={[styles.title, { color: theme.colors.onBackground }]}>
          Create Game Room
        </Title>
        
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Paragraph style={{ color: theme.colors.onSurface, marginBottom: 20 }}>
              Host: {decodedHostName}
            </Paragraph>
            
            <TextInput
              label="Room Name (e.g., Bar Name, Home Party)"
              value={roomName}
              onChangeText={setRoomName}
              mode="outlined"
              style={styles.input}
              placeholder="Enter venue or event name"
            />
            
            <Paragraph style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Select Game:
            </Paragraph>
            
            <RadioButton.Group
              onValueChange={setSelectedGame}
              value={selectedGame}
            >
              {games.map((game) => (
                <View key={game.id} style={styles.radioItem}>
                  <RadioButton.Item
                    label={game.name}
                    value={game.id}
                    disabled={!game.has_events}
                    labelStyle={{
                      color: game.has_events ? theme.colors.onSurface : theme.colors.outline
                    }}
                  />
                  {!game.has_events && (
                    <Paragraph style={[styles.disabledText, { color: theme.colors.outline }]}>
                      (Not available for betting)
                    </Paragraph>
                  )}
                </View>
              ))}
            </RadioButton.Group>
            
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
                onPress={handleCreateRoom}
                style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
                disabled={!canCreateRoom || loading}
                loading={loading}
              >
                Create Room
              </Button>
            </View>
          </Card.Content>
        </Card>
        
        {selectedGame && !selectedGameData?.has_events && (
          <Card style={[styles.warningCard, { backgroundColor: theme.colors.errorContainer }]}>
            <Card.Content>
              <Paragraph style={{ color: theme.colors.onErrorContainer }}>
                This game is not yet available for live betting. Please select "Lions vs Ravens @ 7pm" for the demo.
              </Paragraph>
            </Card.Content>
          </Card>
        )}
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
    maxWidth: 500,
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
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  radioItem: {
    marginBottom: 5,
  },
  disabledText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginLeft: 40,
    marginTop: -5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  backButton: {
    flex: 0.4,
    marginRight: 10,
  },
  createButton: {
    flex: 0.6,
    marginLeft: 10,
  },
  warningCard: {
    marginBottom: 20,
  },
});

export default CreateRoomScreen;