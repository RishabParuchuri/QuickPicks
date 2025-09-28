import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { 
  Card, 
  Button, 
  useTheme,
  Paragraph,
  Title,
  ActivityIndicator,
  Snackbar
} from 'react-native-paper';
import { useParams } from 'react-router-dom';
import { ApiService } from '../services/ApiService';

interface VideoPlayerProps {
  videoUrl?: string;
}

const VideoScreen: React.FC<VideoPlayerProps> = ({
  videoUrl = '/game-video.mp4' // Default local video from public folder
}) => {
  const theme = useTheme();
  const { roomId } = useParams<{ roomId: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomInfo, setRoomInfo] = useState<any>(null);

  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  useEffect(() => {
    if (!roomId) return;

    // Load room info
    const loadRoomInfo = async () => {
      try {
        const info = await ApiService.getRoomInfo(roomId);
        setRoomInfo(info);
      } catch (err) {
        setError('Failed to load room information');
      }
    };

    loadRoomInfo();

    // Connect to WebSocket for room-specific events
    const connectWebSocket = () => {
      const websocket = ApiService.createWebSocket(roomId);
      
      websocket.onopen = () => {
        console.log('VideoScreen connected to room WebSocket');
        setIsConnected(true);
      };
      
      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('VideoScreen received message:', message);
          
          switch (message.type) {
            case 'room_update':
              if (message.data && typeof message.data === 'object') {
                setRoomInfo(message.data);
              }
              break;
            case 'start_game':
              console.log('Game started - starting video playback');
              setGameStarted(true);
              if (videoRef.current && !isPlaying) {
                videoRef.current.play().catch(err => {
                  console.error('Error auto-playing video:', err);
                  setError('Failed to start video playback');
                });
              }
              break;
            default:
              console.log('Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      websocket.onclose = () => {
        console.log('VideoScreen WebSocket disconnected, attempting to reconnect...');
        setIsConnected(false);
        setTimeout(connectWebSocket, 3000);
      };
      
      websocket.onerror = (error) => {
        console.error('VideoScreen WebSocket error:', error);
        setIsConnected(false);
      };
      
      setWs(websocket);
    };
    
    connectWebSocket();
    
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [roomId, isPlaying]);


  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      
      const handleLoadedMetadata = () => {
        setIsBuffering(false);
        setError(null);
      };

      const handlePlay = () => {
        setIsPlaying(true);
        setIsBuffering(false);
      };

      const handlePause = () => {
        setIsPlaying(false);
      };

      const handleWaiting = () => {
        setIsBuffering(true);
      };

      const handleError = () => {
        setError('Failed to load video');
        setIsBuffering(false);
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      video.addEventListener('waiting', handleWaiting);
      video.addEventListener('error', handleError);

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('waiting', handleWaiting);
        video.removeEventListener('error', handleError);
      };
    }
  }, []);


  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <Title style={{ color: theme.colors.onSurface, fontSize: 20 }}>
          Video Stream - Room {roomId}
        </Title>
        <Paragraph style={{ color: theme.colors.outline }}>
          {gameStarted ? 'Game Started - Video Playing' : 'Waiting for Game Start'} | 
          WebSocket: {isConnected ? 'Connected' : 'Disconnected'}
        </Paragraph>
        {roomInfo && (
          <Paragraph style={{ color: theme.colors.outline, fontSize: 12 }}>
            Room: {roomInfo.room?.name} | Host: {roomInfo.room?.host_name} | 
            Players: {Object.keys(roomInfo.room?.players || {}).length}
          </Paragraph>
        )}
      </View>

      {/* Video Player */}
      <View style={styles.videoContainer}>
        <Card style={[styles.videoCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.videoWrapper}>
            <video
              ref={videoRef}
              src={videoUrl}
              style={styles.video}
              controls={false}
              preload="metadata"
              muted={false}
              loop={false}
            />
            
            {/* Loading overlay */}
            {isBuffering && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Paragraph style={{ color: theme.colors.onSurface, marginTop: 10 }}>
                  Loading...
                </Paragraph>
              </View>
            )}

            {/* Game status overlay */}
            {!gameStarted && (
              <View style={styles.statusOverlay}>
                <Paragraph style={{ color: theme.colors.onSurface, fontSize: 18, textAlign: 'center' }}>
                  Waiting for host to start the game...
                </Paragraph>
              </View>
            )}
          </View>
        </Card>
      </View>

      {/* Game Status */}
      <Card style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Title style={{ color: theme.colors.onSurface, fontSize: 16 }}>
            Video Player Status
          </Title>
          <Paragraph style={{ color: theme.colors.outline, marginTop: 5 }}>
            Room ID: {roomId}
          </Paragraph>
          <Paragraph style={{ color: theme.colors.outline }}>
            Game Status: {gameStarted ? 'Started' : 'Waiting'}
          </Paragraph>
          <Paragraph style={{ color: theme.colors.outline }}>
            Video: {videoUrl}
          </Paragraph>
          <Paragraph style={{ color: theme.colors.outline, fontSize: 12, marginTop: 10 }}>
            This video player is connected to room {roomId} and will automatically start playing when the host starts the game.
          </Paragraph>
        </Card.Content>
      </Card>
      
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  videoContainer: {
    flex: 1,
    padding: 10,
  },
  videoCard: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  videoWrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  statusOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  infoCard: {
    margin: 10,
    marginTop: 0,
  },
});

export default VideoScreen;