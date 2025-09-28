import React, { useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { 
  Title, 
  Button, 
  Card, 
  Paragraph,
  TextInput,
  useTheme 
} from 'react-native-paper';
import { useNavigate } from 'react-router-dom';

const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');

  const handleCreateRoom = () => {
    if (playerName.trim()) {
      navigate(`/create-room/${encodeURIComponent(playerName.trim())}`);
    }
  };

  const handleJoinRoom = () => {
    if (playerName.trim()) {
      navigate(`/join-room/${encodeURIComponent(playerName.trim())}`);
    }
  };

  const handleJoinByRoomId = () => {
    if (roomId.trim()) {
      navigate(`/join-room-by-id/${roomId.trim()}`);
    }
  };

  const handleAdminAccess = () => {
    navigate('/admin');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Image 
          source={{ uri: '/QuickPicks-removebg-preview.png' }}
          style={styles.logo}
          resizeMode="contain"
        />
        <Title style={[styles.title, { color: theme.colors.onBackground }]}>
          QuickPicks Trivia
        </Title>
        
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Paragraph style={{ color: theme.colors.onSurface, textAlign: 'center', marginBottom: 20 }}>
              Enter your name to get started
            </Paragraph>
            
            <TextInput
              label="Your Name"
              value={playerName}
              onChangeText={setPlayerName}
              mode="outlined"
              style={styles.input}
              theme={{ colors: { onSurfaceVariant: theme.colors.onSurface } }}
            />
            
            <Button
              mode="contained"
              onPress={handleCreateRoom}
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
              disabled={!playerName.trim()}
            >
              Host a Game
            </Button>
            
            <Button
              mode="outlined"
              onPress={handleJoinRoom}
              style={styles.button}
              disabled={!playerName.trim()}
            >
              Join a Game
            </Button>
            
            <Paragraph style={{ color: theme.colors.outline, textAlign: 'center', marginVertical: 15 }}>
              Or join directly with a Room ID:
            </Paragraph>
            
            <TextInput
              label="Room ID"
              value={roomId}
              onChangeText={setRoomId}
              mode="outlined"
              style={styles.input}
              placeholder="Enter room ID"
              theme={{ colors: { onSurfaceVariant: theme.colors.onSurface } }}
            />
            
            <Button
              mode="outlined"
              onPress={handleJoinByRoomId}
              style={styles.button}
              disabled={!roomId.trim()}
            >
              Join by Room ID
            </Button>
            
            <Button
              mode="text"
              onPress={handleAdminAccess}
              style={styles.adminButton}
              textColor={theme.colors.outline}
            >
              Admin Panel
            </Button>
          </Card.Content>
        </Card>
        
        <Paragraph style={[styles.footer, { color: theme.colors.outline }]}>
          Fast-paced trivia with strategic point wagering
        </Paragraph>
      </View>
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
  logo: {
    width: 100,
    height: 100,
    alignSelf: 'center',
    marginBottom: 0,
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
  input: {
    marginBottom: 20,
  },
  button: {
    marginBottom: 15,
    paddingVertical: 5,
  },
  adminButton: {
    marginTop: 10,
  },
  footer: {
    textAlign: 'center',
    fontSize: 14,
  },
});

export default HomeScreen;