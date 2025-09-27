import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { 
  Title, 
  Button, 
  Card, 
  Paragraph,
  useTheme,
  List,
  Divider,
  Chip,
  ActivityIndicator,
  Snackbar
} from 'react-native-paper';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiService } from '../services/ApiService';

const HostDashboardScreen: React.FC = () => {
  const navigate = useNavigate();
  const { roomId, hostName } = useParams<{ roomId: string; hostName: string }>();
  const theme = useTheme();
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startingGame, setStartingGame] = useState(false);
  const [error, setError] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  
  const decodedHostName = hostName ? decodeURIComponent(hostName).trim() : '';

  useEffect(() => {
    if (roomId && decodedHostName) {
      loadRoomInfo();
      connectWebSocket();
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, decodedHostName]);

  const loadRoomInfo = async () => {
    if (!roomId) return;
    
    try {
      const info = await ApiService.getRoomInfo(roomId);
      setRoomInfo(info);
    } catch (err) {
      setError('Failed to load room information');
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    if (!roomId) return;
    
    const websocket = ApiService.createWebSocket(roomId);
    
    websocket.onopen = () => {
      console.log('Host connected to WebSocket');
      // Join as host
      websocket.send(JSON.stringify({
        type: 'join_room',
        data: { player_name: decodedHostName }
      }));
    };

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message);
    };

    websocket.onclose = () => {
      console.log('WebSocket connection closed');
      // Attempt to reconnect after a delay
      setTimeout(() => {
        if (roomId) {
          connectWebSocket();
        }
      }, 3000);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Connection error occurred');
    };

    setWs(websocket);
  };

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'room_update':
        setRoomInfo(message.data);
        break;
      case 'new_event':
        setRoomInfo((prev: any) => ({
          ...prev,
          room: {
            ...prev.room,
            current_event: message.data.event
          },
          leaderboard: message.data.leaderboard
        }));
        break;
      case 'event_results':
        setRoomInfo((prev: any) => ({
          ...prev,
          leaderboard: message.data.leaderboard
        }));
        break;
      case 'game_ended':
        setRoomInfo((prev: any) => ({
          ...prev,
          room: {
            ...prev.room,
            game_status: 'completed'
          },
          leaderboard: message.data.final_leaderboard
        }));
        break;
    }
  };

  const handleStartGame = async () => {
    if (!ws || !roomInfo) return;

    setStartingGame(true);
    try {
      // Send start game message via WebSocket
      ws.send(JSON.stringify({
        type: 'start_game',
        data: {}
      }));
    } catch (err) {
      setError('Failed to start game');
    } finally {
      setStartingGame(false);
    }
  };

  const handleBack = () => {
    if (ws) {
      ws.close();
    }
    navigate('/');
  };

  const getGameStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return theme.colors.secondary;
      case 'in_progress':
        return theme.colors.primary;
      case 'completed':
        return theme.colors.tertiary;
      default:
        return theme.colors.outline;
    }
  };

  const getGameStatusText = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'Waiting to Start';
      case 'in_progress':
        return 'Game in Progress';
      case 'completed':
        return 'Game Completed';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
        <Paragraph style={{ color: theme.colors.onBackground, marginTop: 10 }}>
          Loading room...
        </Paragraph>
      </View>
    );
  }

  if (!roomInfo) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <Paragraph style={{ color: theme.colors.onBackground }}>
          Room not found
        </Paragraph>
        <Button mode="outlined" onPress={handleBack} style={{ marginTop: 20 }}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Title style={[styles.title, { color: theme.colors.onBackground }]}>
          Host Dashboard
        </Title>
        
        {/* Room Info */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.roomHeader}>
              <View>
                <Title style={{ color: theme.colors.onSurface, fontSize: 20 }}>
                  {roomInfo.room.name}
                </Title>
                <Paragraph style={{ color: theme.colors.onSurface }}>
                  {roomInfo.room.game_name}
                </Paragraph>
              </View>
              <Chip 
                mode="outlined"
                textStyle={{ color: getGameStatusColor(roomInfo.room.game_status) }}
                style={{ borderColor: getGameStatusColor(roomInfo.room.game_status) }}
              >
                {getGameStatusText(roomInfo.room.game_status)}
              </Chip>
            </View>
            
            <Paragraph style={{ color: theme.colors.outline, marginTop: 10 }}>
              Room ID: {roomInfo.room.id}
            </Paragraph>
          </Card.Content>
        </Card>

        {/* Game Controls */}
        {roomInfo.room.game_status === 'waiting' && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Paragraph style={{ color: theme.colors.onSurface, marginBottom: 15 }}>
                Ready to start the game? Make sure players have joined first.
              </Paragraph>
              <Button
                mode="contained"
                onPress={handleStartGame}
                style={{ backgroundColor: theme.colors.primary }}
                disabled={startingGame || Object.keys(roomInfo.room.players).length === 0}
                loading={startingGame}
              >
                Start Game
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Current Event */}
        {roomInfo.room.current_event && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Title style={{ color: theme.colors.onSurface, fontSize: 18 }}>
                Current Question
              </Title>
              <Paragraph style={{ color: theme.colors.onSurface, marginVertical: 10 }}>
                {roomInfo.room.current_event.question}
              </Paragraph>
              
              <View style={styles.answerChoices}>
                {roomInfo.room.current_event.answer_choices.map((choice: any) => (
                  <Chip key={choice.id} style={styles.answerChip} mode="outlined">
                    {choice.text}
                  </Chip>
                ))}
              </View>
              
              <Paragraph style={{ color: theme.colors.outline, marginTop: 10 }}>
                Timer: {roomInfo.room.current_event.timer_seconds}s | 
                Points: {roomInfo.room.current_event.points_reward}
              </Paragraph>
            </Card.Content>
          </Card>
        )}

        {/* Players List */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={{ color: theme.colors.onSurface, fontSize: 18 }}>
              Players ({Object.keys(roomInfo.room.players).length})
            </Title>
            
            {Object.keys(roomInfo.room.players).length === 0 ? (
              <Paragraph style={{ color: theme.colors.outline, textAlign: 'center', marginTop: 20 }}>
                No players joined yet. Share the room ID with players.
              </Paragraph>
            ) : (
              roomInfo.leaderboard.map((player: any, index: number) => (
                <View key={player.name}>
                  <List.Item
                    title={player.name}
                    description={`Score: ${player.score}${player.current_bet ? ` | Current bet: Answer ${player.current_bet}` : ''}`}
                    left={(props) => (
                      <View style={[styles.rankBadge, { backgroundColor: theme.colors.primary }]}>
                        <Paragraph style={{ color: theme.colors.onPrimary, fontWeight: 'bold' }}>
                          #{index + 1}
                        </Paragraph>
                      </View>
                    )}
                    titleStyle={{ color: theme.colors.onSurface }}
                    descriptionStyle={{ color: theme.colors.outline }}
                  />
                  {index < roomInfo.leaderboard.length - 1 && <Divider />}
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        <Button
          mode="outlined"
          onPress={handleBack}
          style={styles.backButton}
        >
          Leave Room
        </Button>
      </View>
      
      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={4000}
      >
        {error}
      </Snackbar>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  answerChoices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 10,
  },
  answerChip: {
    marginRight: 5,
    marginBottom: 5,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  backButton: {
    marginTop: 20,
    marginBottom: 40,
  },
});

export default HostDashboardScreen;