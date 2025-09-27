import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { 
  Card, 
  Button, 
  useTheme,
  IconButton,
  ProgressBar,
  Paragraph,
  Title,
  ActivityIndicator,
  Snackbar
} from 'react-native-paper';
import { ApiService } from '../services/ApiService';

interface VideoPlayerProps {
  videoUrl?: string;
}

const VideoScreen: React.FC<VideoPlayerProps> = ({
  videoUrl = '/game-video.mp4' // Default local video from public folder
}) => {
  const theme = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);

  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  useEffect(() => {
    // Listen for game start events from localStorage or custom events
    const handleGameStart = () => {
      console.log('Game start event received - starting video playback');
      setGameStarted(true);
      if (autoPlayEnabled && videoRef.current && !isPlaying) {
        videoRef.current.play().catch(err => {
          console.error('Error auto-playing video:', err);
          setError('Failed to start video playback');
        });
      }
    };

    // Listen for custom game start events
    window.addEventListener('gameStarted', handleGameStart);
    
    // Also check localStorage for game start status
    const checkGameStatus = () => {
      const gameStatus = localStorage.getItem('gameStarted');
      if (gameStatus === 'true' && !gameStarted) {
        handleGameStart();
      }
    };

    // Check immediately and then periodically
    checkGameStatus();
    const interval = setInterval(checkGameStatus, 1000);

    return () => {
      window.removeEventListener('gameStarted', handleGameStart);
      clearInterval(interval);
    };
  }, [autoPlayEnabled, isPlaying, gameStarted]);


  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      
      const handleLoadedMetadata = () => {
        setDuration(video.duration);
        setIsBuffering(false);
        setError(null);
      };

      const handleTimeUpdate = () => {
        setCurrentTime(video.currentTime);
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

      const handleVolumeChange = () => {
        setVolume(video.volume);
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      video.addEventListener('waiting', handleWaiting);
      video.addEventListener('error', handleError);
      video.addEventListener('volumechange', handleVolumeChange);

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('waiting', handleWaiting);
        video.removeEventListener('error', handleError);
        video.removeEventListener('volumechange', handleVolumeChange);
      };
    }
  }, []);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(err => {
          console.error('Error playing video:', err);
          setError('Failed to play video');
        });
      }
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
    }
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const triggerGameStart = () => {
    // Set localStorage flag
    localStorage.setItem('gameStarted', 'true');
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('gameStarted'));
  };

  const resetGameStatus = () => {
    localStorage.setItem('gameStarted', 'false');
    setGameStarted(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <Title style={{ color: theme.colors.onSurface, fontSize: 20 }}>
          Video Stream
        </Title>
        <Paragraph style={{ color: theme.colors.outline }}>
          {gameStarted ? 'Game Started - Auto Play Active' : 'Waiting for Game Start'}
        </Paragraph>
        <View style={styles.headerControls}>
          <Button
            mode={autoPlayEnabled ? 'contained' : 'outlined'}
            onPress={() => setAutoPlayEnabled(!autoPlayEnabled)}
            compact
            style={{ marginRight: 10 }}
          >
            Auto Play: {autoPlayEnabled ? 'ON' : 'OFF'}
          </Button>
          <Button
            mode="outlined"
            onPress={triggerGameStart}
            compact
            style={{ marginRight: 10 }}
          >
            Test Start Game
          </Button>
          <Button
            mode="outlined"
            onPress={resetGameStatus}
            compact
          >
            Reset
          </Button>
        </View>
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
              onMouseEnter={() => setShowControls(true)}
              onMouseLeave={() => setShowControls(false)}
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

            {/* Custom controls overlay */}
            <View 
              style={[
                styles.controlsOverlay,
                { opacity: showControls ? 1 : 0 }
              ]}
            >
              {/* Progress bar */}
              <View style={styles.progressContainer}>
                <ProgressBar
                  progress={duration > 0 ? currentTime / duration : 0}
                  color={theme.colors.primary}
                  style={styles.progressBar}
                />
              </View>

              {/* Control buttons */}
              <View style={styles.controlsRow}>
                <View style={styles.leftControls}>
                  <IconButton
                    icon={isPlaying ? 'pause' : 'play'}
                    size={24}
                    iconColor={theme.colors.onSurface}
                    onPress={handlePlayPause}
                    style={styles.controlButton}
                  />
                  
                  <View style={styles.timeDisplay}>
                    <Paragraph style={{ color: theme.colors.onSurface, fontSize: 12 }}>
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </Paragraph>
                  </View>
                </View>

                <View style={styles.rightControls}>
                  <IconButton
                    icon={volume === 0 ? 'volume-off' : volume < 0.5 ? 'volume-low' : 'volume-high'}
                    size={20}
                    iconColor={theme.colors.onSurface}
                    onPress={() => handleVolumeChange(volume === 0 ? 1 : 0)}
                    style={styles.controlButton}
                  />
                </View>
              </View>
            </View>
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
            Auto Play: {autoPlayEnabled ? 'Enabled' : 'Disabled'}
          </Paragraph>
          <Paragraph style={{ color: theme.colors.outline }}>
            Game Status: {gameStarted ? 'Started' : 'Waiting'}
          </Paragraph>
          <Paragraph style={{ color: theme.colors.outline }}>
            Video: {videoUrl}
          </Paragraph>
          <Paragraph style={{ color: theme.colors.outline, fontSize: 12, marginTop: 10 }}>
            This video player listens for game start events and will automatically begin playback when a game starts.
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
  headerControls: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
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
  controlsOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    zIndex: 3,
  },
  progressContainer: {
    marginBottom: 10,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    margin: 0,
  },
  timeDisplay: {
    marginLeft: 10,
  },
  infoCard: {
    margin: 10,
    marginTop: 0,
  },
});

export default VideoScreen;