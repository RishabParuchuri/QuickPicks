import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Title, Paragraph, Button, useTheme } from 'react-native-paper';
import QRCode from 'qrcode';

interface QRCodeGeneratorProps {
  roomId: string;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ roomId }) => {
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (roomId) {
      generateQRCode();
    }
  }, [roomId]);

  const generateQRCode = async () => {
    try {
      // Get the current domain and port
      const currentUrl = window.location.origin;
      const joinUrl = `${currentUrl}/join-room-by-id/${roomId}`;
      setQrUrl(joinUrl);

      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, joinUrl, {
          width: 200,
          margin: 2,
          color: {
            dark: theme.colors.onSurface,
            light: theme.colors.surface,
          },
        });
      }
      setError('');
    } catch (err) {
      console.error('Error generating QR code:', err);
      setError('Failed to generate QR code');
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
      // You could add a toast notification here if needed
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const shareUrl = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join Game Room',
        text: `Join my game room with ID: ${roomId}`,
        url: qrUrl,
      });
    } else {
      copyToClipboard();
    }
  };

  return (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <Title style={{ color: theme.colors.onSurface, fontSize: 18, textAlign: 'center' }}>
          📱 Join Room QR Code
        </Title>
        
        <View style={styles.qrContainer}>
          {error ? (
            <Paragraph style={{ color: theme.colors.error, textAlign: 'center' }}>
              {error}
            </Paragraph>
          ) : (
            <canvas
              ref={canvasRef}
              style={styles.qrCanvas}
            />
          )}
        </View>

        <Paragraph style={{ 
          color: theme.colors.outline, 
          textAlign: 'center', 
          marginTop: 10,
          fontSize: 12 
        }}>
          Players can scan this QR code to join the room
        </Paragraph>

        <View style={styles.urlContainer}>
          <Paragraph style={{ 
            color: theme.colors.onSurface, 
            fontSize: 12,
            textAlign: 'center',
            marginVertical: 10
          }}>
            {qrUrl}
          </Paragraph>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={copyToClipboard}
            style={[styles.button, { borderColor: theme.colors.primary }]}
            labelStyle={{ color: theme.colors.primary }}
          >
            Copy Link
          </Button>
          <Button
            mode="contained"
            onPress={shareUrl}
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
          >
            Share
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 15,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 15,
  },
  qrCanvas: {
    maxWidth: '100%',
    height: 'auto',
  },
  urlContainer: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 8,
    borderRadius: 4,
    marginVertical: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
  },
});

export default QRCodeGenerator;
