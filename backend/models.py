from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Literal, Any
from datetime import datetime
from enum import Enum


class EventStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"


class GameStatus(str, Enum):
    WAITING = "waiting"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class Player(BaseModel):
    name: str
    score: int = 0
    current_bet: Optional[int] = None
    joined_at: datetime = Field(default_factory=datetime.now)

    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }


class AnswerChoice(BaseModel):
    id: int
    text: str


class Event(BaseModel):
    id: str
    question: str
    answer_choices: List[AnswerChoice]
    correct_answer_id: int
    probability: float = Field(ge=0.0, le=1.0, description="Probability of the correct answer (0-1)")
    points_reward: int = Field(gt=0, description="Points awarded for correct answer")
    timer_seconds: int = Field(gt=0, description="Time limit for answering in seconds")
    resolution_delay_seconds: int = Field(gt=0, description="Delay between betting close and answer resolution in seconds")
    status: EventStatus = EventStatus.PENDING
    created_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }


class PlayerBet(BaseModel):
    player_name: str
    answer_id: int
    submitted_at: datetime = Field(default_factory=datetime.now)

    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }


class Room(BaseModel):
    id: str
    name: str = Field(description="Name of the venue/organizer")
    game_name: str = Field(description="Name of the sports game")
    host_name: str
    players: Dict[str, Player] = Field(default_factory=dict)
    current_event: Optional[Event] = None
    completed_events: List[Event] = Field(default_factory=list)
    game_status: GameStatus = GameStatus.WAITING
    created_at: datetime = Field(default_factory=datetime.now)

    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }


class GameState(BaseModel):
    room: Room
    current_bets: Dict[str, PlayerBet] = Field(default_factory=dict)
    event_results: Dict[str, Dict[str, int]] = Field(default_factory=dict)  # event_id -> {player_name: points_earned}

    def get_leaderboard(self) -> List[Dict[str, Any]]:
        """Return sorted leaderboard by score"""
        leaderboard = []
        for player_name, player in self.room.players.items():
            if player_name and player:  # Ensure both name and player exist
                leaderboard.append({
                    "name": player_name,
                    "score": player.score if player.score is not None else 0,
                    "current_bet": player.current_bet
                })
        return sorted(leaderboard, key=lambda x: x.get("score", 0), reverse=True)

    def calculate_points(self, probability: float) -> int:
        """Calculate points based on event probability"""
        if probability >= 0.8:
            return 10  # Very likely events
        elif probability >= 0.6:
            return 25  # Somewhat likely events
        elif probability >= 0.4:
            return 50  # Even odds
        elif probability >= 0.2:
            return 100  # Unlikely events
        else:
            return 200  # Very unlikely events


# WebSocket Message Types
class MessageType(str, Enum):
    # Client to Server
    JOIN_ROOM = "join_room"
    PLACE_BET = "place_bet"
    START_GAME = "start_game"
    
    # Server to Client
    ROOM_UPDATE = "room_update"
    NEW_EVENT = "new_event"
    BETTING_CLOSED = "betting_closed"
    EVENT_RESOLVED = "event_resolved"
    EVENT_RESULTS = "event_results"  # Kept for backward compatibility
    GAME_ENDED = "game_ended"
    BET_PLACED = "bet_placed"
    ERROR = "error"


class WebSocketMessage(BaseModel):
    type: MessageType
    data: Dict = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.now)

    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }


# API Request/Response Models
class CreateRoomRequest(BaseModel):
    name: str = Field(description="Name of the venue/organizer")
    game_name: str = Field(description="Name of the sports game")
    host_name: str


class CreateRoomResponse(BaseModel):
    room_id: str
    message: str = "Room created successfully"


class JoinRoomRequest(BaseModel):
    player_name: str


class GameInfo(BaseModel):
    id: str
    name: str
    status: str
    has_events: bool

class AvailableGamesResponse(BaseModel):
    games: List[GameInfo] = Field(description="List of available games with name and status")