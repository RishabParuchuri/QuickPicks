# QuickPicks Trivia

A real-time sports trivia platform that allows organizers to host interactive betting games during sporting events. Players can join rooms, place strategic bets on live events, and compete on a dynamic leaderboard.

## Overview

QuickPicks Trivia enables organizers (bars, venues, or individuals) to create interactive trivia rooms for sports games. As events unfold during the game, players receive "Quick Pick" opportunities - time-limited betting events where they can wager points based on predicted outcomes. The scoring system rewards correct predictions with points proportional to the event's probability, creating strategic gameplay where players must balance risk and reward.

### Key Features

- **Real-time Multiplayer**: WebSocket-powered live gameplay with instant updates
- **Strategic Wagering**: Point-based betting system with risk/reward calculations  
- **Dynamic Leaderboards**: Live score tracking and rankings
- **Room-based Games**: Multiple concurrent games with unique room codes
- **Mobile-friendly**: Responsive React Native Web interface
- **Host Controls**: Dedicated dashboard for game organizers

## Project Structure

```
arena/
├── backend/                 # FastAPI WebSocket server
│   ├── main.py             # Main application entry point
│   ├── models.py           # Pydantic data models
│   ├── game_data.py        # Hardcoded game events and data
│   └── requirements.txt    # Python dependencies
├── frontend/               # React Native Web client
│   ├── src/
│   │   ├── screens/        # Application screens
│   │   ├── components/     # Reusable components
│   │   ├── services/       # API communication
│   │   └── router/         # Navigation routing
│   └── package.json        # Node.js dependencies
└── event_detection/        # Future: Live event detection
```

## Technology Stack

### Backend
- **FastAPI**: High-performance Python web framework
- **WebSocket**: Real-time bidirectional communication
- **Pydantic**: Data validation and serialization
- **Uvicorn**: ASGI web server
- **In-memory Storage**: Dictionary-based game state management

### Frontend
- **React Native for Web**: Cross-platform UI framework
- **React Native Paper**: Material Design component library
- **TypeScript**: Type-safe JavaScript development
- **React Router**: Client-side navigation
- **WebSocket Client**: Real-time server communication

### Design System
- **Theme**: Purple and dark grey color scheme (PrizePicks-inspired)
- **Responsive Design**: Mobile-first approach
- **Component Library**: React Native Paper for consistent UI

## Game Flow

### Room Creation
1. Organizer creates a room with:
   - Room name (venue/location)
   - Game name (e.g., "Lions vs Ravens @ 7pm")
   - Host name identification

### Player Experience
1. Players join using room ID or browse available rooms
2. Enter display name (no authentication required)
3. Wait in lobby until host starts the game
4. Receive real-time event notifications
5. Place bets within time windows
6. View live leaderboard updates
7. See final rankings at game end

### Event Structure
Each Quick Pick event includes:
- **Question/Scenario**: What players are betting on
- **Answer Choices**: 2-4 possible outcomes
- **Odds**: Probability-based scoring multipliers
- **Timer**: Limited response window
- **Resolution**: Automated outcome determination

### Scoring System
- Players start with base points
- Wager amount calculated based on total events
- Correct answers earn points based on probability
- Incorrect answers lose wagered points
- Lower probability events offer higher rewards

## Getting Started

### Prerequisites
- Python 3.8 or higher
- Node.js 16 or higher
- npm or yarn package manager

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd arena/backend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Start the FastAPI server:
   ```bash
   python main.py
   ```

The backend will run on `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd arena/frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run start
   ```

The frontend will run on `http://localhost:3000`

## Deployment with ngrok

For external access during development:

1. Install ngrok globally:
   ```bash
   npm install -g ngrok
   ```

2. Expose the backend (in a new terminal):
   ```bash
   ngrok http 8000
   ```

3. Expose the frontend (in another terminal):
   ```bash
   ngrok http 3000
   ```

4. Use the provided ngrok URLs to access the application remotely

## API Endpoints

### HTTP Routes
- `GET /` - Health check
- `GET /games` - List available games
- `POST /create-game` - Create new room
- `GET /room/{room_id}` - Get room information
- `POST /admin/start-demo/{room_id}` - Admin game control

### WebSocket Routes
- `WS /ws/{room_id}` - Real-time game communication

### WebSocket Message Types
- `JOIN_ROOM` - Player joins room
- `START_GAME` - Host initiates game
- `NEW_EVENT` - New question broadcast
- `SUBMIT_ANSWER` - Player submits bet
- `ANSWERS_CLOSED` - Betting window closed
- `EVENT_RESOLVED` - Results and scoring
- `ROOM_UPDATE` - General room state changes
- `GAME_ENDED` - Final results

## Data Models

### Core Entities
- **Room**: Game container with players and events
- **Player**: Individual participant with score and bets
- **Event**: Individual betting opportunity
- **GameState**: Complete room state management
- **WebSocketMessage**: Real-time communication format

### Game Status Flow
1. `WAITING` - Room created, accepting players
2. `IN_PROGRESS` - Game active, events occurring  
3. `COMPLETED` - All events finished, final scores

## Development Notes

### Hackathon Shortcuts
- **Hardcoded Events**: Pre-defined question set for demo
- **No Authentication**: Name-based player identification
- **In-Memory Storage**: No persistent database
- **Single Game Type**: "Lions vs Ravens" demo only
- **Manual Event Triggers**: No live sports data integration

### Configuration Files
- `game_data.py` - Centralized event and game definitions
- Easy modification of questions, timers, and scoring
- Probability-based point calculations
- Extensible for future game types

## Testing

### Manual Testing Flow
1. Create a room as host
2. Join as multiple players (different browsers/devices)  
3. Start game from host dashboard
4. Place bets during event windows
5. Observe real-time scoring and leaderboards
6. Verify final results

### Admin Features
- Manual game start endpoint
- Room state inspection
- Event timing controls
- Debug logging throughout

## Future Enhancements

### Live Sports Integration
- Real-time event detection from sports APIs
- Automated question generation
- Dynamic probability calculations
- Multiple concurrent games

### Enhanced Features
- User authentication and profiles
- Persistent game history
- Advanced analytics dashboard
- Custom event creation tools
- Mobile native applications

### Scalability
- Database integration (PostgreSQL/MongoDB)
- Redis for session management
- Horizontal scaling architecture
- Cloud deployment configurations

## Contributing

This project was built for HackGT 12. For development:

1. Fork the repository
2. Create feature branches for new functionality
3. Test thoroughly with multiple concurrent users
4. Submit pull requests with clear descriptions

## Architecture Decisions

### WebSocket-First Design
Real-time communication is essential for synchronized gameplay. The WebSocket architecture ensures all players see events and results simultaneously.

### React Native for Web
Enables rapid development with mobile-ready components while maintaining web compatibility.

### In-Memory State Management
Simplifies development and reduces infrastructure requirements for hackathon timeline.

### Probability-Based Scoring  
Creates strategic depth where players must evaluate risk vs reward for each betting opportunity.

## License

This project is developed for educational and hackathon purposes.