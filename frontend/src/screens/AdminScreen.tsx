import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { 
  Title, 
  Button, 
  Card, 
  Paragraph,
  TextInput,
  useTheme,
  List,
  Divider,
  Snackbar
} from 'react-native-paper';
import { useNavigate } from 'react-router-dom';
import { ApiService } from '../services/ApiService';

const AdminScreen: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [roomId, setRoomId] = useState('');
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleBack = () => {
    navigate('/');
  };

  const handleLoadRoom = async () => {
    if (!roomId.trim()) {
      setError('Please enter a room ID');
      return;
    }

    setLoading(true);
    try {
      const info = await ApiService.getRoomInfo(roomId.trim());
      setRoomInfo(info);
      setSuccess('Room loaded successfully');
    } catch (err) {
      setError('Room not found. Please check the Room ID.');
      setRoomInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleStartDemo = async () => {
    if (!roomInfo) return;

    setStarting(true);
    try {
      const response = await ApiService.startDemoGame(roomInfo.room.id);
      setSuccess(`Demo game started for room ${response.room_id}`);
      
      // Reload room info to show updated status
      setTimeout(() => {
        handleLoadRoom();
      }, 1000);
    } catch (err) {
      setError('Failed to start demo game');
    } finally {
      setStarting(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Title style={[styles.title, { color: theme.colors.onBackground }]}>
          Admin Panel
        </Title>
        
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Paragraph style={{ color: theme.colors.onSurface, marginBottom: 15 }}>
              Enter a room ID to manage or start demo games for testing.
            </Paragraph>
            
            <TextInput
              label="Room ID"
              value={roomId}
              onChangeText={setRoomId}
              mode="outlined"
              style={styles.input}
              placeholder="Enter room ID"
              autoCapitalize="none"
            />
            
            <Button
              mode="contained"
              onPress={handleLoadRoom}
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
              disabled={!roomId.trim() || loading}
              loading={loading}
            >
              Load Room
            </Button>
          </Card.Content>
        </Card>

        {roomInfo && (
          <>
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <Card.Content>
                <Title style={{ color: theme.colors.onSurface, fontSize: 18 }}>
                  Room Information
                </Title>
                
                <List.Item
                  title="Room Name"
                  description={roomInfo.room.name}
                  titleStyle={{ color: theme.colors.onSurface }}
                  descriptionStyle={{ color: theme.colors.outline }}
                />
                <Divider />
                
                <List.Item
                  title="Game"
                  description={roomInfo.room.game_name}
                  titleStyle={{ color: theme.colors.onSurface }}
                  descriptionStyle={{ color: theme.colors.outline }}
                />
                <Divider />
                
                <List.Item
                  title="Host"
                  description={roomInfo.room.host_name}
                  titleStyle={{ color: theme.colors.onSurface }}
                  descriptionStyle={{ color: theme.colors.outline }}
                />
                <Divider />
                
                <List.Item
                  title="Status"
                  description={roomInfo.room.game_status}
                  titleStyle={{ color: theme.colors.onSurface }}
                  descriptionStyle={{ color: theme.colors.outline }}
                />
                <Divider />
                
                <List.Item
                  title="Players"
                  description={`${Object.keys(roomInfo.room.players).length} joined`}
                  titleStyle={{ color: theme.colors.onSurface }}
                  descriptionStyle={{ color: theme.colors.outline }}
                />
              </Card.Content>
            </Card>

            {Object.keys(roomInfo.room.players).length > 0 && (
              <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                  <Title style={{ color: theme.colors.onSurface, fontSize: 18, marginBottom: 10 }}>
                    Players in Room
                  </Title>
                  
                  {roomInfo.leaderboard.map((player: any, index: number) => (
                    <View key={player.name}>
                      <List.Item
                        title={player.name}
                        description={`Score: ${player.score} points${player.current_bet ? ` | Current bet: ${player.current_bet}` : ''}`}
                        left={() => (
                          <View style={[styles.rankBadge, { backgroundColor: theme.colors.primary }]}>
                            <Paragraph style={{ color: theme.colors.onPrimary, fontWeight: 'bold', fontSize: 12 }}>
                              #{index + 1}
                            </Paragraph>
                          </View>
                        )}
                        titleStyle={{ color: theme.colors.onSurface }}
                        descriptionStyle={{ color: theme.colors.outline }}
                      />
                      {index < roomInfo.leaderboard.length - 1 && <Divider />}
                    </View>
                  ))}
                </Card.Content>
              </Card>
            )}

            {roomInfo.room.current_event && (
              <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                <Card.Content>
                  <Title style={{ color: theme.colors.onSurface, fontSize: 18 }}>
                    Current Event
                  </Title>
                  
                  <Paragraph style={{ color: theme.colors.onSurface, marginVertical: 10 }}>
                    {roomInfo.room.current_event.question}
                  </Paragraph>
                  
                  <Paragraph style={{ color: theme.colors.outline }}>
                    Timer: {roomInfo.room.current_event.timer_seconds}s | 
                    Points: {roomInfo.room.current_event.points_reward} | 
                    Probability: {(roomInfo.room.current_event.probability * 100).toFixed(1)}%
                  </Paragraph>
                  
                  <View style={styles.answerList}>
                    {roomInfo.room.current_event.answer_choices.map((choice: any) => (
                      <Paragraph 
                        key={choice.id} 
                        style={{ 
                          color: choice.id === roomInfo.room.current_event.correct_answer_id 
                            ? theme.colors.primary 
                            : theme.colors.onSurface,
                          fontWeight: choice.id === roomInfo.room.current_event.correct_answer_id 
                            ? 'bold' 
                            : 'normal'
                        }}
                      >
                        {choice.id}. {choice.text} 
                        {choice.id === roomInfo.room.current_event.correct_answer_id && ' ✓'}
                      </Paragraph>
                    ))}
                  </View>
                </Card.Content>
              </Card>
            )}

            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <Card.Content>
                <Title style={{ color: theme.colors.onSurface, fontSize: 18, marginBottom: 15 }}>
                  Demo Controls
                </Title>
                
                {roomInfo.room.game_status === 'waiting' ? (
                  <>
                    <Paragraph style={{ color: theme.colors.onSurface, marginBottom: 15 }}>
                      Start the demo game to begin the automated question sequence.
                    </Paragraph>
                    <Button
                      mode="contained"
                      onPress={handleStartDemo}
                      style={[styles.button, { backgroundColor: theme.colors.primary }]}
                      disabled={starting}
                      loading={starting}
                    >
                      Start Demo Game
                    </Button>
                  </>
                ) : roomInfo.room.game_status === 'in_progress' ? (
                  <Paragraph style={{ color: theme.colors.secondary }}>
                    ▶️ Game is currently in progress with automated questions.
                  </Paragraph>
                ) : (
                  <Paragraph style={{ color: theme.colors.tertiary }}>
                    🏁 Game has completed.
                  </Paragraph>
                )}
              </Card.Content>
            </Card>
          </>
        )}

        <Card style={[styles.infoCard, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Card.Content>
            <Title style={{ color: theme.colors.onSurfaceVariant, fontSize: 16 }}>
              How to Test
            </Title>
            <Paragraph style={{ color: theme.colors.onSurfaceVariant, fontSize: 14 }}>
              1. Create a room from the main screen{'\n'}
              2. Have players join using the room ID{'\n'}
              3. Use this admin panel to start the demo game{'\n'}
              4. Questions will appear automatically every few minutes
            </Paragraph>
          </Card.Content>
        </Card>

        <Button
          mode="outlined"
          onPress={handleBack}
          style={styles.backButton}
        >
          Back to Home
        </Button>
      </View>
      
      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={4000}
      >
        {error}
      </Snackbar>
      
      <Snackbar
        visible={!!success}
        onDismiss={() => setSuccess('')}
        duration={4000}
        style={{ backgroundColor: theme.colors.primary }}
      >
        {success}
      </Snackbar>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 24,
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 15,
  },
  input: {
    marginBottom: 15,
  },
  button: {
    paddingVertical: 5,
  },
  rankBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  answerList: {
    marginTop: 10,
  },
  infoCard: {
    marginBottom: 20,
  },
  backButton: {
    marginTop: 20,
    marginBottom: 40,
  },
});

export default AdminScreen;