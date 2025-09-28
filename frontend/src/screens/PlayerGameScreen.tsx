import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
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
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [originalRoomData, setOriginalRoomData] = useState<any>(null); // Store original room data permanently
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
      // Store the original room data permanently so it never gets lost
      if (info?.room && !originalRoomData) {
        setOriginalRoomData({
          name: info.room.name,
          game_name: info.room.game_name,
          id: info.room.id
        });
        console.log('Stored original room data:', info.room.name, info.room.game_name);
      }
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
              // Always ensure we have the original room data
              const roomData = prev?.room || {};
              if (originalRoomData) {
                roomData.name = originalRoomData.name;
                roomData.game_name = originalRoomData.game_name;
                roomData.id = originalRoomData.id;
              }
              
              if (!prev || typeof prev !== 'object') {
                console.warn('No previous room info available for new_event');
                return {
                  room: { 
                    ...roomData,
                    current_event: message.data.event 
                  },
                  leaderboard: message.data.leaderboard || [],
                  // Clear previous event resolution status when new event starts
                  answerStatus: undefined,
                  lastEventResult: undefined
                };
              }
              return {
                ...prev,
                room: {
                  ...roomData,
                  ...prev.room,
                  current_event: message.data.event
                },
                leaderboard: message.data.leaderboard || [],
                // Clear previous event resolution status when new event starts
                answerStatus: undefined,
                lastEventResult: undefined
              };
            });
            setSelectedAnswer(null);
            setHasSubmitted(false);
            setTimeRemaining(message.data.event?.timer_seconds || 0);
          }
          break;
        case 'answers_closed':
          console.log('Answer period closed - waiting for resolution');
          if (message.data && typeof message.data === 'object') {
            setTimeRemaining(0); // Stop the timer
            setRoomInfo((prev: any) => ({
              ...prev,
              leaderboard: message.data.leaderboard || prev?.leaderboard || [],
              answerStatus: 'closed',
              resolutionTimeRemaining: message.data.resolution_in_seconds || 0
            }));
          }
          break;
        case 'event_resolved':
          console.log('Event resolved - results:', message.data);
          if (message.data && typeof message.data === 'object') {
            setRoomInfo((prev: any) => {
              // Always ensure we have the original room data
              const roomData = prev?.room || {};
              if (originalRoomData) {
                roomData.name = originalRoomData.name;
                roomData.game_name = originalRoomData.game_name;
                roomData.id = originalRoomData.id;
              }
              
              if (!prev || typeof prev !== 'object') {
                console.warn('No previous room info available for event_resolved');
                return {
                  room: { 
                    ...roomData,
                    current_event: null 
                  },
                  leaderboard: message.data.leaderboard || [],
                  lastEventResult: {
                    correct_answer_id: message.data.correct_answer_id,
                    correct_answer_text: message.data.correct_answer_text,
                    results: message.data.results
                  }
                };
              }
              return {
                ...prev,
                room: {
                  ...roomData,
                  ...prev.room,
                  current_event: null
                },
                leaderboard: message.data.leaderboard || [],
                answerStatus: 'resolved',
                lastEventResult: {
                  correct_answer_id: message.data.correct_answer_id,
                  correct_answer_text: message.data.correct_answer_text,
                  results: message.data.results
                }
              };
            });
            setHasSubmitted(false);
            setSelectedAnswer(null);
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
        case 'answer_submitted':
          console.log('Answer submitted successfully:', message.data);
          // Answer confirmation received - player's answer is now locked in
          // The hasSubmitted state was already set to true when sending the answer
          break;
        case 'error':
          console.log('WebSocket error:', message.data?.message);
          setError(message.data?.message || 'An error occurred');
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
      type: 'submit_answer',
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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header Navbar */}
      <View style={[styles.headerNavbar, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.navbarContent}>
          <View style={styles.gameInfo}>
            <Title style={[styles.gameTitle, { color: theme.colors.onSurface }]}>
              {originalRoomData?.name || roomInfo?.room?.name || 'Loading...'}
            </Title>
            <Paragraph style={[styles.gameSubtitle, { color: theme.colors.outline }]}>
              {originalRoomData?.game_name || roomInfo?.room?.game_name || ''}
            </Paragraph>
          </View>
          <View style={styles.playerInfo}>
            <View style={[styles.rankBadge, { backgroundColor: theme.colors.primary }]}>
              <Paragraph style={[styles.rankText, { color: theme.colors.onPrimary }]}>
                #{getPlayerRank() || '-'}
              </Paragraph>
            </View>
            <View style={styles.scoreSection}>
              <Paragraph style={[styles.scoreText, { color: theme.colors.onSurface }]}>
                {getPlayerScore()} pts
              </Paragraph>
              <Paragraph style={[styles.playerName, { color: theme.colors.outline }]}>
                {decodedPlayerName}
              </Paragraph>
            </View>
          </View>
        </View>
      </View>

      {/* Main Content Area */}
      <View style={styles.mainContent}>

        {/* Game Status - Only show waiting message when game hasn't started AND no active question */}
        {roomInfo?.room?.game_status === 'waiting' && !roomInfo?.room?.current_event && (
          <Card style={[styles.statusCard, { backgroundColor: theme.colors.secondaryContainer }]}>
            <Card.Content>
              <Paragraph style={{ color: theme.colors.onSecondaryContainer, textAlign: 'center' }}>
                🕐 Waiting for host to start the game...
              </Paragraph>
            </Card.Content>
          </Card>
        )}

        {roomInfo?.answerStatus === 'closed' && (
          <Card style={[styles.statusCard, { backgroundColor: theme.colors.errorContainer }]}>
            <Card.Content>
              <Paragraph style={{ color: theme.colors.onErrorContainer, textAlign: 'center' }}>
                ⏳ Time's up! Waiting for results...
              </Paragraph>
            </Card.Content>
          </Card>
        )}

        {roomInfo?.answerStatus === 'resolved' && roomInfo?.lastEventResult && (
          <Card style={[styles.statusCard, { backgroundColor: theme.colors.tertiaryContainer }]}>
            <Card.Content>
              <Title style={{ color: theme.colors.onTertiaryContainer, textAlign: 'center', fontSize: 16 }}>
                📊 Question Resolved!
              </Title>
              <Paragraph style={{ color: theme.colors.onTertiaryContainer, textAlign: 'center' }}>
                Correct Answer: {roomInfo.lastEventResult.correct_answer_text}
              </Paragraph>
              {roomInfo.lastEventResult.results?.[decodedPlayerName] !== undefined && (
                <Paragraph style={{ color: theme.colors.onTertiaryContainer, textAlign: 'center', fontWeight: 'bold' }}>
                  You earned: {roomInfo.lastEventResult.results[decodedPlayerName]} points
                </Paragraph>
              )}
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

        {/* Question and Answer Choices - Takes up most of the screen, hide when answers are closed */}
        {roomInfo?.room?.current_event && roomInfo?.answerStatus !== 'closed' && (
          <View style={styles.questionContainer}>
            {/* Question Header */}
            <View style={[styles.questionHeader, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.questionContent}>
                <Title style={[styles.questionText, { color: theme.colors.onSurface }]}>
                  {roomInfo?.room?.current_event?.question || ''}
                </Title>
                <View style={styles.questionMeta}>
                  <Chip 
                    mode="flat" 
                    style={[styles.pointsChip, { backgroundColor: `${theme.colors.primary}20` }]}
                    textStyle={{ color: theme.colors.primary, fontWeight: 'bold' }}
                  >
                    {roomInfo?.room?.current_event?.points_reward || 0} pts
                  </Chip>
                </View>
              </View>
              <View style={styles.timerSection}>
                <Title style={[styles.timerText, { color: theme.colors.primary }]}>
                  {timeRemaining}
                </Title>
                <Paragraph style={[styles.timerLabel, { color: theme.colors.outline }]}>
                  seconds
                </Paragraph>
                <ProgressBar 
                  progress={roomInfo?.room?.current_event?.timer_seconds ? timeRemaining / roomInfo.room.current_event.timer_seconds : 0}
                  color={theme.colors.primary}
                  style={styles.progressBar}
                />
              </View>
            </View>

            {/* Answer Choices - Large buttons taking most of the screen */}
            <View style={styles.choicesContainer}>
              <View style={styles.choicesGrid}>
                {roomInfo?.room?.current_event?.answer_choices?.map((choice: any) => (
                  <TouchableOpacity
                    key={choice.id}
                    onPress={() => handleAnswerSelect(choice.id)}
                    style={[
                      styles.choiceButton,
                      {
                        backgroundColor: selectedAnswer === choice.id 
                          ? theme.colors.primary 
                          : 'transparent',
                        borderColor: theme.colors.primary,
                        borderWidth: 2,
                      }
                    ]}
                    disabled={hasSubmitted || timeRemaining === 0}
                    activeOpacity={0.7}
                  >
                    <View style={styles.choiceButtonContent}>
                      <Text
                        style={[
                          styles.choiceButtonLabel,
                          {
                            color: selectedAnswer === choice.id 
                              ? theme.colors.onPrimary 
                              : theme.colors.onSurface,
                          }
                        ]}
                        numberOfLines={0}
                      >
                        {choice?.text || 'Answer'}
                      </Text>
                    </View>
                  </TouchableOpacity>
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
              <View style={[styles.submittedIndicator, { backgroundColor: theme.colors.tertiaryContainer }]}>
                <Paragraph style={[styles.submittedText, { color: theme.colors.onTertiaryContainer }]}>
                  ✓ Answer submitted! Waiting for results...
                </Paragraph>
              </View>
            )}
          </View>
          </View>
        )}

        {/* Leaderboard - Only show when no active question */}
        {!roomInfo?.room?.current_event && (
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
                          styles.leaderboardRankBadge,
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
                      right={() => player.current_answer ? (
                        <Chip mode="outlined" compact>
                          Answer: {player.current_answer}
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
        )}

      </View>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: theme.colors.surface }]}>
        <Button
          mode="outlined"
          onPress={handleBack}
          style={styles.leaveButton}
          textColor={theme.colors.outline}
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
    </View>
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
  // Header Navbar Styles
  headerNavbar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  navbarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gameInfo: {
    flex: 1,
  },
  gameTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  gameSubtitle: {
    fontSize: 14,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  scoreSection: {
    alignItems: 'flex-end',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  playerName: {
    fontSize: 12,
  },
  // Main Content Styles
  mainContent: {
    flex: 1,
    padding: 16,
  },
  // Question Container Styles
  questionContainer: {
    flex: 1,
  },
  questionHeader: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questionContent: {
    flex: 1,
    marginRight: 20,
  },
  questionText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    lineHeight: 24,
  },
  questionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsChip: {
    borderRadius: 16,
  },
  timerSection: {
    alignItems: 'center',
    minWidth: 80,
  },
  timerText: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 36,
  },
  timerLabel: {
    fontSize: 12,
    marginTop: -4,
  },
  progressBar: {
    width: 60,
    height: 4,
    marginTop: 8,
    borderRadius: 2,
  },
  // Choice Buttons Styles
  choicesContainer: {
    flex: 1,
    paddingVertical: 20,
  },
  choicesGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  choiceButton: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '45%', // Use flexBasis instead of minWidth
    maxWidth: '48%', // Prevent overflow
    minHeight: 100,
    borderRadius: 12,
    justifyContent: 'center',
  },
  choiceButtonContent: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    width: '100%',
  },
  choiceButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
    flex: 1,
    flexWrap: 'wrap',
    width: '100%',
  },
  submitButton: {
    marginTop: 20,
    borderRadius: 12,
  },
  submittedIndicator: {
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  submittedText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Footer Styles
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  leaveButton: {
    borderRadius: 8,
  },
  // Legacy styles for other components
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
  legacyQuestionHeader: {
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
  legacySubmitButton: {
    marginVertical: 15,
    paddingVertical: 10,
  },
  submittedCard: {
    marginVertical: 15,
  },
  leaderboardCard: {
    marginBottom: 15,
  },
  leaderboardRankBadge: {
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