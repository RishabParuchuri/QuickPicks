import asyncio
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
import logging

from models import (
    Room, Player, Event, GameState, WebSocketMessage, MessageType,
    CreateRoomRequest, CreateRoomResponse, JoinRoomRequest,
    AvailableGamesResponse, EventStatus, GameStatus, PlayerBet
)
from game_data import AVAILABLE_GAMES, get_game_by_id, get_events_for_game, get_event_schedule_for_game

# Custom JSON encoder for datetime objects
class DateTimeEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, datetime):
            return o.isoformat()
        return super().default(o)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Arena Sports Betting API", version="1.0.0")

# CORS middleware for React Native Web
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global game state storage (in-memory)
game_states: Dict[str, GameState] = {}
active_connections: Dict[str, List[WebSocket]] = {}  # room_id -> list of websockets
player_connections: Dict[WebSocket, str] = {}  # websocket -> player_name
room_timers: Dict[str, asyncio.Task] = {}  # room_id -> timer task

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.player_connections: Dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, room_id: str, player_name: str):
        # Don't accept here - it's already accepted in the endpoint
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)
        self.player_connections[websocket] = player_name
        logger.info(f"Player {player_name} connected to room {room_id}")

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections and websocket in self.active_connections[room_id]:
            self.active_connections[room_id].remove(websocket)
        if websocket in self.player_connections:
            del self.player_connections[websocket]
        logger.info(f"Player disconnected from room {room_id}")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_text(json.dumps(message, cls=DateTimeEncoder))
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")

    async def broadcast_to_room(self, message: dict, room_id: str):
        if room_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[room_id]:
                try:
                    await connection.send_text(json.dumps(message, cls=DateTimeEncoder))
                except Exception as e:
                    logger.error(f"Error broadcasting to room {room_id}: {e}")
                    disconnected.append(connection)
            
            # Clean up disconnected connections
            for conn in disconnected:
                self.disconnect(conn, room_id)

manager = ConnectionManager()

# Helper Functions
def generate_room_id() -> str:
    """Generate a unique room ID"""
    return str(uuid.uuid4())[:8]

async def start_event_timer(room_id: str, event: Event):
    """Start two-phase timer for an event: betting phase + resolution phase"""
    try:
        # Phase 1: Betting window
        await asyncio.sleep(event.timer_seconds)
        await close_betting(room_id, event.id)
        
        # Phase 2: Resolution delay
        await asyncio.sleep(event.resolution_delay_seconds)
        await resolve_event(room_id, event.id)
    except asyncio.CancelledError:
        logger.info(f"Timer cancelled for event {event.id} in room {room_id}")

async def close_betting(room_id: str, event_id: str):
    """Close betting window and show 'waiting for resolution' state"""
    if room_id not in game_states:
        return

    game_state = game_states[room_id]
    event = game_state.room.current_event
    
    if not event or event.id != event_id:
        return

    # Broadcast betting closed message
    message = WebSocketMessage(
        type=MessageType.BETTING_CLOSED,
        data={
            "event_id": event_id,
            "event": event.model_dump(),
            "leaderboard": game_state.get_leaderboard(),
            "resolution_in_seconds": event.resolution_delay_seconds
        }
    )
    
    await manager.broadcast_to_room(message.model_dump(), room_id)

async def resolve_event(room_id: str, event_id: str):
    """Resolve an event and calculate scores"""
    if room_id not in game_states:
        return

    game_state = game_states[room_id]
    event = game_state.room.current_event
    
    if not event or event.id != event_id:
        return

    # Mark event as completed
    event.status = EventStatus.COMPLETED
    
    # Calculate results using new wagering system
    results = game_state.calculate_points_distribution(event_id, event.correct_answer_id)
    
    # Award points to winners and deduct wagered amounts from losers
    for player_name, points_earned in results.items():
        if player_name in game_state.room.players:
            player = game_state.room.players[player_name]
            # Add winnings to player's score
            player.score += points_earned
            # Reset wagered amount for next event
            player.wagered_amount = 0
    
    # Store results
    game_state.event_results[event_id] = results
    
    # Move event to completed
    game_state.room.completed_events.append(event)
    game_state.room.current_event = None
    
    # Clear current bets
    game_state.current_bets.clear()
    
    # Reset player current_bet
    for player in game_state.room.players.values():
        player.current_bet = None

    # Broadcast event resolved with results
    message = WebSocketMessage(
        type=MessageType.EVENT_RESOLVED,
        data={
            "event_id": event_id,
            "correct_answer_id": event.correct_answer_id,
            "correct_answer_text": next((choice.text for choice in event.answer_choices if choice.id == event.correct_answer_id), "Unknown"),
            "results": results,
            "leaderboard": game_state.get_leaderboard(),
            "event": event.model_dump()
        }
    )
    
    await manager.broadcast_to_room(message.model_dump(), room_id)
    
    # Check if game is complete
    events_for_game = get_events_for_game("lions_ravens_demo")  # Hardcoded for demo
    if len(game_state.room.completed_events) >= len(events_for_game):
        await end_game(room_id)
    else:
        # Schedule next event after a delay
        await asyncio.sleep(5)  # 5 second pause between events
        await schedule_next_event(room_id)

async def schedule_next_event(room_id: str):
    """Schedule the next event for a room"""
    if room_id not in game_states:
        return
        
    game_state = game_states[room_id]
    events_for_game = get_events_for_game("lions_ravens_demo")  # Hardcoded for demo
    
    next_event_index = len(game_state.room.completed_events)
    if next_event_index < len(events_for_game):
        next_event = events_for_game[next_event_index]
        next_event.status = EventStatus.ACTIVE
        next_event.created_at = datetime.now()
        next_event.expires_at = datetime.now() + timedelta(seconds=next_event.timer_seconds)
        
        game_state.room.current_event = next_event
        
        # Broadcast new event
        message = WebSocketMessage(
            type=MessageType.NEW_EVENT,
            data={
                "event": next_event.model_dump(),
                "leaderboard": game_state.get_leaderboard()
            }
        )
        
        await manager.broadcast_to_room(message.model_dump(), room_id)
        
        # Start timer for this event
        if room_id in room_timers:
            room_timers[room_id].cancel()
        room_timers[room_id] = asyncio.create_task(start_event_timer(room_id, next_event))

async def end_game(room_id: str):
    """End the game and show final results"""
    if room_id not in game_states:
        return
        
    game_state = game_states[room_id]
    game_state.room.game_status = GameStatus.COMPLETED
    
    message = WebSocketMessage(
        type=MessageType.GAME_ENDED,
        data={
            "final_leaderboard": game_state.get_leaderboard(),
            "total_events": len(game_state.room.completed_events)
        }
    )
    
    await manager.broadcast_to_room(message.model_dump(), room_id)
    
    # Clean up timer
    if room_id in room_timers:
        room_timers[room_id].cancel()
        del room_timers[room_id]

# API Routes
@app.get("/")
async def root():
    return {"message": "Arena Sports Betting API", "status": "running"}

@app.get("/games", response_model=AvailableGamesResponse)
async def get_available_games():
    """Get list of available games"""
    from models import GameInfo
    games = [GameInfo(**game) for game in AVAILABLE_GAMES]
    return AvailableGamesResponse(games=games)

@app.post("/create-game", response_model=CreateRoomResponse)
async def create_room(request: CreateRoomRequest):
    """Create a new game room"""
    room_id = generate_room_id()
    
    room = Room(
        id=room_id,
        name=request.name,
        game_name=request.game_name,
        host_name=request.host_name
    )
    
    game_states[room_id] = GameState(room=room)
    
    logger.info(f"Created room {room_id} for {request.host_name}")
    
    return CreateRoomResponse(room_id=room_id)

@app.get("/room/{room_id}")
async def get_room_info(room_id: str):
    """Get room information"""
    if room_id not in game_states:
        raise HTTPException(status_code=404, detail="Room not found")
    
    game_state = game_states[room_id]
    return {
        "room": game_state.room.model_dump(),
        "leaderboard": game_state.get_leaderboard()
    }

# WebSocket endpoint
@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    if room_id not in game_states:
        await websocket.close(code=4004, reason="Room not found")
        return
    
    player_name = None
    try:
        # Wait for join message
        await websocket.accept()
        data = await websocket.receive_text()
        message = json.loads(data)
        
        if message.get("type") != MessageType.JOIN_ROOM:
            await websocket.close(code=4000, reason="Must send join_room message first")
            return
            
        player_name = message.get("data", {}).get("player_name")
        if not player_name:
            await websocket.close(code=4000, reason="Player name required")
            return
        
        # Trim whitespace from player name
        player_name = player_name.strip()
        
        # Add player to room (but not if they are the host)
        game_state = game_states[room_id]
        is_host = player_name == game_state.room.host_name
        
        if not is_host and player_name not in game_state.room.players:
            game_state.room.players[player_name] = Player(name=player_name)
            logger.info(f"Added new player {player_name} to room {room_id}")
        elif not is_host:
            logger.info(f"Player {player_name} already exists in room {room_id}")
        else:
            logger.info(f"Host {player_name} connecting to room {room_id}")
        
        # Connect player
        await manager.connect(websocket, room_id, player_name)
        
        # Validate that we have at least one non-host player for game to start
        non_host_players = [name for name in game_state.room.players.keys() if name != game_state.room.host_name]
        logger.info(f"Room {room_id} now has {len(non_host_players)} non-host players: {non_host_players}")
        
        # Send room update to the joining player
        room_update = WebSocketMessage(
            type=MessageType.ROOM_UPDATE,
            data={
                "room": game_state.room.model_dump(),
                "leaderboard": game_state.get_leaderboard(),
                "current_event": game_state.room.current_event.model_dump() if game_state.room.current_event else None
            }
        )
        
        await manager.send_personal_message(room_update.model_dump(), websocket)
        
        # Broadcast to all room members that a new player joined
        player_joined_update = WebSocketMessage(
            type=MessageType.ROOM_UPDATE,
            data={
                "room": game_state.room.model_dump(),
                "leaderboard": game_state.get_leaderboard(),
                "message": f"{player_name} joined the room"
            }
        )
        
        await manager.broadcast_to_room(player_joined_update.model_dump(), room_id)
        
        # Listen for messages
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            message_type = message_data.get("type")
            
            if message_type == MessageType.PLACE_BET:
                answer_id = message_data.get("data", {}).get("answer_id")
                if answer_id and game_state.room.current_event:
                    # Check if betting window is still open (event is active)
                    if game_state.room.current_event.status == EventStatus.ACTIVE:
                        # Check if betting deadline has passed
                        current_time = datetime.now()
                        if (game_state.room.current_event.expires_at and 
                            current_time <= game_state.room.current_event.expires_at):
                            
                            # Calculate wager amount based on total events
                            from game_data import get_events_for_game
                            events_for_game = get_events_for_game("lions_ravens_demo")  # Hardcoded for demo
                            wager_amount = game_state.calculate_wager_amount(len(events_for_game))
                            
                            # Check if player has enough points to wager
                            player = game_state.room.players[player_name]
                            if player.score >= wager_amount:
                                bet = PlayerBet(player_name=player_name, answer_id=answer_id)
                                game_state.current_bets[player_name] = bet
                                player.current_bet = answer_id
                                player.wagered_amount = wager_amount
                                
                                # Deduct wager from player's score immediately
                                player.score -= wager_amount
                                
                                # Send personal confirmation to the player who placed the bet
                                bet_confirmation = WebSocketMessage(
                                    type=MessageType.BET_PLACED,
                                    data={
                                        "answer_id": answer_id, 
                                        "wagered_amount": wager_amount,
                                        "message": f"Bet placed! Wagered {wager_amount} points"
                                    }
                                )
                                await manager.send_personal_message(bet_confirmation.model_dump(), websocket)
                                
                                # Broadcast updated room state so host can see player activity
                                room_update = WebSocketMessage(
                                    type=MessageType.ROOM_UPDATE,
                                    data={
                                        "room": game_state.room.model_dump(),
                                        "leaderboard": game_state.get_leaderboard(),
                                        "message": f"{player_name} placed a bet"
                                    }
                                )
                                await manager.broadcast_to_room(room_update.model_dump(), room_id)
                            else:
                                # Not enough points to wager
                                error_message = WebSocketMessage(
                                    type=MessageType.ERROR,
                                    data={"message": f"Not enough points to wager {wager_amount} points"}
                                )
                                await manager.send_personal_message(error_message.model_dump(), websocket)
                        else:
                            # Betting window closed
                            error_message = WebSocketMessage(
                                type=MessageType.ERROR,
                                data={"message": "Betting window has closed"}
                            )
                            await manager.send_personal_message(error_message.model_dump(), websocket)
                    else:
                        # Event not active (completed or pending)
                        error_message = WebSocketMessage(
                            type=MessageType.ERROR,
                            data={"message": "No active betting event"}
                        )
                        await manager.send_personal_message(error_message.model_dump(), websocket)
            
            elif message_type == MessageType.START_GAME and player_name == game_state.room.host_name:
                if game_state.room.game_status == GameStatus.WAITING:
                    # Check if there are any non-host players
                    non_host_players = [name for name in game_state.room.players.keys() if name != game_state.room.host_name]
                    if len(non_host_players) == 0:
                        error_message = WebSocketMessage(
                            type=MessageType.ERROR,
                            data={"message": "Cannot start game: No players have joined yet"}
                        )
                        await manager.send_personal_message(error_message.model_dump(), websocket)
                    else:
                        logger.info(f"Starting game in room {room_id} with {len(non_host_players)} players")
                        game_state.room.game_status = GameStatus.IN_PROGRESS
                        await schedule_next_event(room_id)
            
    except WebSocketDisconnect:
        if player_name and room_id:
            manager.disconnect(websocket, room_id)
            # Remove player from room state and notify others (but not if they are the host)
            if room_id in game_states and player_name != game_states[room_id].room.host_name and player_name in game_states[room_id].room.players:
                del game_states[room_id].room.players[player_name]
                
                # Notify remaining players that someone left
                player_left_update = WebSocketMessage(
                    type=MessageType.ROOM_UPDATE,
                    data={
                        "room": game_states[room_id].room.model_dump(),
                        "leaderboard": game_states[room_id].get_leaderboard(),
                        "message": f"{player_name} left the room"
                    }
                )
                await manager.broadcast_to_room(player_left_update.model_dump(), room_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        if player_name and room_id:
            manager.disconnect(websocket, room_id)
            # Remove player from room state on error as well (but not if they are the host)
            if room_id in game_states and player_name != game_states[room_id].room.host_name and player_name in game_states[room_id].room.players:
                del game_states[room_id].room.players[player_name]

# Admin endpoint to manually start demo game (for testing)
@app.post("/admin/start-demo/{room_id}")
async def start_demo_game(room_id: str):
    """Admin endpoint to start demo game"""
    if room_id not in game_states:
        raise HTTPException(status_code=404, detail="Room not found")
    
    game_state = game_states[room_id]
    if game_state.room.game_status != GameStatus.WAITING:
        raise HTTPException(status_code=400, detail="Game already started")
    
    game_state.room.game_status = GameStatus.IN_PROGRESS
    await schedule_next_event(room_id)
    
    return {"message": "Demo game started", "room_id": room_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)