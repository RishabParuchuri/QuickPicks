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
    score: int = 200  # Everyone starts with 200 points
    current_bet: Optional[int] = None
    wagered_amount: int = 0  # Points wagered on current question
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
    resolution_delay_seconds: int = Field(gt=0, description="Delay between answer submission close and result resolution in seconds")
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

    def calculate_wager_amount(self, total_events: int) -> int:
        """Calculate wager amount per question: 200/N points (rounded down)"""
        return 200 // total_events
    
    def calculate_points_distribution(self, event_id: str, correct_answer_id: int) -> Dict[str, int]:
        """Calculate point distribution for an event using wagering system"""
        results = {}
        total_wagered = 0
        correct_players = []
        
        # Find all players who bet on this event and identify correct answers
        for player_name, bet in self.current_bets.items():
            if player_name in self.room.players:
                player = self.room.players[player_name]
                wager = player.wagered_amount
                total_wagered += wager
                
                if bet.answer_id == correct_answer_id:
                    correct_players.append(player_name)
        
        # Check if anyone got the answer right
        if correct_players and total_wagered > 0:
            # Distribute winnings among correct players (round down)
            points_per_winner = total_wagered // len(correct_players)
            for player_name in correct_players:
                results[player_name] = points_per_winner
            
            # Players with wrong answers get 0 points but still lose their wager
            for player_name, bet in self.current_bets.items():
                if player_name not in results:
                    results[player_name] = 0
        else:
            # No one got the answer right - everyone gets their wager back
            for player_name, bet in self.current_bets.items():
                if player_name in self.room.players:
                    wager = self.room.players[player_name].wagered_amount
                    results[player_name] = wager  # Return their wagered amount
                
        return results


# WebSocket Message Types
class MessageType(str, Enum):
    # Client to Server
    JOIN_ROOM = "join_room"
    SUBMIT_ANSWER = "submit_answer"
    START_GAME = "start_game"
    
    # Server to Client
    ROOM_UPDATE = "room_update"
    NEW_EVENT = "new_event"
    ANSWERS_CLOSED = "answers_closed"
    EVENT_RESOLVED = "event_resolved"
    EVENT_RESULTS = "event_results"  # Kept for backward compatibility
    GAME_ENDED = "game_ended"
    ANSWER_SUBMITTED = "answer_submitted"
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