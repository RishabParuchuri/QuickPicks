import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
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
  Snackbar,
  ProgressBar
} from 'react-native-paper';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiService } from '../services/ApiService';

const PlayerGameScreen: React.FC = () => {
  const navigate = useNavigate();
  const { roomId, playerName } = useParams<{ roomId: string; playerName: string }>();
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  
  const decodedPlayerName = playerName ? decodeURIComponent(playerName).trim() : '';

  useEffect(() => {
    if (roomId && decodedPlayerName) {
      loadRoomInfo();
      connectWebSocket();
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, decodedPlayerName]);

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

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (roomInfo?.room?.current_event && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => Math.max(0, prev - 1));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timeRemaining, roomInfo?.room?.current_event]);

  const connectWebSocket = () => {
    if (!roomId) return;
    
    const websocket = ApiService.createWebSocket(roomId);
    
    websocket.onopen = () => {
      console.log('Player connected to WebSocket');
      websocket.send(JSON.stringify({
        type: 'join_room',
        data: { player_name: decodedPlayerName }
      }));
    };

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleWebSocketMessage(message);
    };

    websocket.onclose = () => {
      console.log('WebSocket connection closed');
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
    console.log('WebSocket message received:', message);
    
    try {
      switch (message.type) {
        case 'room_update':
          console.log('Room update - leaderboard:', message.data?.leaderboard);
          if (message.data && typeof message.data === 'object') {
            setRoomInfo(message.data);
          }
          break;
        case 'new_event':
          console.log('New event - leaderboard:', message.data?.leaderboard);
          if (message.data && typeof message.data === 'object') {
            setRoomInfo((prev: any) => {
              if (!prev || typeof prev !== 'object') {
                return {
                  room: { current_event: message.data.event },
                  leaderboard: message.data.leaderboard || []
                };
              }
              return {
                ...prev,
                room: {
                  ...prev.room,
                  current_event: message.data.event
                },
                leaderboard: message.data.leaderboard || []
              };
            });
            setSelectedAnswer(null);
            setHasSubmitted(false);
            setTimeRemaining(message.data.event?.timer_seconds || 0);
          }
          break;
        case 'event_results':
          console.log('Event results - leaderboard:', message.data?.leaderboard);
          if (message.data && typeof message.data === 'object') {
            setRoomInfo((prev: any) => {
              if (!prev || typeof prev !== 'object') {
                return { leaderboard: message.data.leaderboard || [] };
              }
              return {
                ...prev,
                leaderboard: message.data.leaderboard || []
              };
            });
            setHasSubmitted(false);
            setSelectedAnswer(null);
          }
          break;
        case 'game_ended':
          console.log('Game ended - leaderboard:', message.data?.final_leaderboard);
          if (message.data && typeof message.data === 'object') {
            setRoomInfo((prev: any) => {
              if (!prev || typeof prev !== 'object') {
                return {
                  room: { game_status: 'completed' },
                  leaderboard: message.data.final_leaderboard || []
                };
              }
              return {
                ...prev,
                room: {
                  ...prev.room,
                  game_status: 'completed'
                },
                leaderboard: message.data.final_leaderboard || []
              };
            });
          }
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error, message);
    }
  };

  const handleAnswerSelect = (answerId: number) => {
    if (!hasSubmitted && roomInfo?.room?.current_event && answerId) {
      setSelectedAnswer(answerId);
    }
  };

  const handleSubmitAnswer = () => {
    if (!ws || !selectedAnswer || hasSubmitted) return;

    ws.send(JSON.stringify({
      type: 'place_bet',
      data: { answer_id: selectedAnswer }
    }));

    setHasSubmitted(true);
  };

  const handleBack = () => {
    if (ws) {
      ws.close();
    }
    navigate('/');
  };

  const getPlayerRank = () => {
    if (!roomInfo?.leaderboard || !Array.isArray(roomInfo.leaderboard)) return null;
    try {
      const validLeaderboard = roomInfo.leaderboard.filter((p: any) => p && p.name && typeof p.name === 'string');
      const playerIndex = validLeaderboard.findIndex((p: any) => p.name === decodedPlayerName);
      return playerIndex >= 0 ? playerIndex + 1 : null;
    } catch (error) {
      console.error('Error in getPlayerRank:', error);
      return null;
    }
  };

  const getPlayerScore = () => {
    if (!roomInfo?.leaderboard || !Array.isArray(roomInfo.leaderboard)) return 0;
    try {
      const player = roomInfo.leaderboard.find((p: any) => p && p.name && typeof p.name === 'string' && p.name === decodedPlayerName);
      return player?.score || 0;
    } catch (error) {
      console.error('Error in getPlayerScore:', error);
      return 0;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
        <Paragraph style={{ color: theme.colors.onBackground, marginTop: 10 }}>
          Joining room...
        </Paragraph>
      </View>
    );
  }

  if (!roomInfo) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <Paragraph style={{ color: theme.colors.onBackground }}>
          Unable to connect to room
        </Paragraph>
        <Button mode="outlined" onPress={handleBack} style={{ marginTop: 20 }}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background, width: windowWidth }]}>
      <View style={[styles.content, { width: windowWidth }]}>
        {/* Room Header - 20% of screen */}
        <Card style={[styles.roomCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.roomHeader}>
              <View>
                <Title style={{ color: theme.colors.onSurface, fontSize: 18 }}>
                  {roomInfo?.room?.name || 'Loading...'}
                </Title>
                <Paragraph style={{ color: theme.colors.outline }}>
                  {roomInfo?.room?.game_name || ''}
                </Paragraph>
              </View>
              <View style={styles.playerStats}>
                <Paragraph style={{ color: theme.colors.onSurface, fontSize: 16, fontWeight: 'bold' }}>
                  #{getPlayerRank() || '-'} | {getPlayerScore()} pts
                </Paragraph>
                <Paragraph style={{ color: theme.colors.outline, fontSize: 12 }}>
                  {decodedPlayerName}
                </Paragraph>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Game Status */}
        {roomInfo?.room?.game_status === 'waiting' && (
          <Card style={[styles.statusCard, { backgroundColor: theme.colors.secondaryContainer }]}>
            <Card.Content>
              <Paragraph style={{ color: theme.colors.onSecondaryContainer, textAlign: 'center' }}>
                🕐 Waiting for host to start the game...
              </Paragraph>
            </Card.Content>
          </Card>
        )}

        {roomInfo?.room?.game_status === 'completed' && (
          <Card style={[styles.statusCard, { backgroundColor: theme.colors.tertiaryContainer }]}>
            <Card.Content>
              <Title style={{ color: theme.colors.onTertiaryContainer, textAlign: 'center' }}>
                🎉 Game Completed!
              </Title>
              <Paragraph style={{ color: theme.colors.onTertiaryContainer, textAlign: 'center' }}>
                Final Position: #{getPlayerRank()} with {getPlayerScore()} points
              </Paragraph>
            </Card.Content>
          </Card>
        )}

        {/* Current Question - 20% of screen */}
        {roomInfo?.room?.current_event && (
          <Card style={[styles.questionCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <View style={styles.questionHeader}>
                <Title style={{ color: theme.colors.onSurface, fontSize: 16, flex: 1 }}>
                  {roomInfo?.room?.current_event?.question || ''}
                </Title>
                <View style={styles.timerContainer}>
                  <Paragraph style={{ color: theme.colors.primary, fontSize: 18, fontWeight: 'bold' }}>
                    {timeRemaining}s
                  </Paragraph>
                  <ProgressBar 
                    progress={roomInfo?.room?.current_event?.timer_seconds ? timeRemaining / roomInfo.room.current_event.timer_seconds : 0}
                    color={theme.colors.primary}
                    style={{ width: 40, height: 4 }}
                  />
                </View>
              </View>
              
              <Paragraph style={{ color: theme.colors.outline, fontSize: 12, marginTop: 5 }}>
                Points: {roomInfo?.room?.current_event?.points_reward || 0}
              </Paragraph>
            </Card.Content>
          </Card>
        )}

        {/* Answer Choices - 60% of screen */}
        {roomInfo?.room?.current_event && (
          <View style={styles.answersContainer}>
            <View style={styles.answersGrid}>
              {roomInfo?.room?.current_event?.answer_choices?.map((choice: any) => (
                <Card
                  key={choice.id}
                  style={[
                    styles.answerCard,
                    { 
                      backgroundColor: selectedAnswer === choice.id 
                        ? theme.colors.primaryContainer 
                        : theme.colors.surface 
                    }
                  ]}
                >
                  <Card.Content>
                    <Button
                      mode={selectedAnswer === choice.id ? "contained" : "outlined"}
                      onPress={() => handleAnswerSelect(choice.id)}
                      style={styles.answerButton}
                      disabled={hasSubmitted || timeRemaining === 0}
                      buttonColor={selectedAnswer === choice.id ? theme.colors.primary : 'transparent'}
                    >
                      {choice?.text || 'Answer'}
                    </Button>
                  </Card.Content>
                </Card>
              )) || []}
            </View>
            
            {selectedAnswer && !hasSubmitted && timeRemaining > 0 && (
              <Button
                mode="contained"
                onPress={handleSubmitAnswer}
                style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
              >
                Submit Answer
              </Button>
            )}
            
            {hasSubmitted && (
              <Card style={[styles.submittedCard, { backgroundColor: theme.colors.tertiaryContainer }]}>
                <Card.Content>
                  <Paragraph style={{ color: theme.colors.onTertiaryContainer, textAlign: 'center' }}>
                    ✓ Answer submitted! Waiting for results...
                  </Paragraph>
                </Card.Content>
              </Card>
            )}
          </View>
        )}

        {/* Leaderboard */}
        <Card style={[styles.leaderboardCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={{ color: theme.colors.onSurface, fontSize: 16, marginBottom: 10 }}>
              Leaderboard
            </Title>
            
            {(() => {
              try {
                if (!roomInfo?.leaderboard || !Array.isArray(roomInfo.leaderboard)) {
                  return (
                    <Paragraph style={{ color: theme.colors.outline, textAlign: 'center' }}>
                      No players yet
                    </Paragraph>
                  );
                }

                const validPlayers = roomInfo.leaderboard.filter((player: any) => {
                  return player && 
                         typeof player === 'object' && 
                         player.name && 
                         typeof player.name === 'string' &&
                         player.name.trim() !== '';
                });

                if (validPlayers.length === 0) {
                  return (
                    <Paragraph style={{ color: theme.colors.outline, textAlign: 'center' }}>
                      No valid players
                    </Paragraph>
                  );
                }

                return validPlayers.map((player: any, index: number) => (
                  <View key={`${player.name}-${index}`}>
                    <List.Item
                      title={player.name}
                      description={`${player.score || 0} points`}
                      left={() => (
                        <View style={[
                          styles.rankBadge,
                          {
                            backgroundColor: player.name === decodedPlayerName 
                              ? theme.colors.primary 
                              : theme.colors.outline
                          }
                        ]}>
                          <Paragraph style={{
                            color: player.name === decodedPlayerName 
                              ? theme.colors.onPrimary 
                              : theme.colors.surface,
                            fontWeight: 'bold',
                            fontSize: 12
                          }}>
                            #{index + 1}
                          </Paragraph>
                        </View>
                      )}
                      right={() => player.current_bet ? (
                        <Chip mode="outlined" compact>
                          Bet: {player.current_bet}
                        </Chip>
                      ) : null}
                      titleStyle={{ 
                        color: player.name === decodedPlayerName 
                          ? theme.colors.primary 
                          : theme.colors.onSurface,
                        fontWeight: player.name === decodedPlayerName ? 'bold' : 'normal'
                      }}
                      descriptionStyle={{ color: theme.colors.outline }}
                    />
                    {index < validPlayers.length - 1 && <Divider />}
                  </View>
                ));
              } catch (error) {
                console.error('Error rendering leaderboard:', error, roomInfo);
                return (
                  <Paragraph style={{ color: theme.colors.error, textAlign: 'center' }}>
                    Error loading leaderboard
                  </Paragraph>
                );
              }
            })()}
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
    padding: 15,
  },
  roomCard: {
    marginBottom: 15,
    minHeight: '15%',
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerStats: {
    alignItems: 'flex-end',
  },
  statusCard: {
    marginBottom: 15,
  },
  questionCard: {
    marginBottom: 15,
    minHeight: '15%',
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  timerContainer: {
    alignItems: 'center',
    marginLeft: 10,
  },
  answersContainer: {
    marginBottom: 15,
    minHeight: '40%',
  },
  answersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  answerCard: {
    width: '48%',
    marginBottom: 10,
    minHeight: 80,
  },
  answerButton: {
    minHeight: 50,
    justifyContent: 'center',
  },
  submitButton: {
    marginVertical: 15,
    paddingVertical: 10,
  },
  submittedCard: {
    marginVertical: 15,
  },
  leaderboardCard: {
    marginBottom: 15,
  },
  rankBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  backButton: {
    marginTop: 20,
    marginBottom: 40,
  },
});

export default PlayerGameScreen;