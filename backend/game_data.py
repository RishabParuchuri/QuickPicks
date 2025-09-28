"""
Hardcoded game data for the Arena sports betting application.
This file contains all the predefined events and games used in the hackathon demo.
"""

from typing import List, Dict, Optional
from models import Event, AnswerChoice

# Available Games (only "Lions vs Ravens" will have events)
AVAILABLE_GAMES = [
    {
        "id": "ravens_bills_demo",
        "name": "Ravens vs Bills (Demo)",
        "status": "active",
        "has_events": True
    },
    {
        "id": "vikings_steelers",
        "name": "Vikings vs Steelers @ 9:30AM",
        "status": "inactive",
        "has_events": False
    },
    {
        "id": "commanders_falcons",
        "name": "Commanders vs Falcons @ 1:00PM", 
        "status": "inactive",
        "has_events": False
    },
    {
        "id": "eagles_buccaneers",
        "name": "Eagles vs Buccaneers @ 1:00PM",
        "status": "inactive", 
        "has_events": False
    },
    {
        "id": "colts_rams",
        "name": "Colts vs Rams @ 4:05PM",
        "status": "inactive",
        "has_events": False
    },
    {
        "id": "packers_cowboys",
        "name": "Packers vs Cowboys @ 8:20PM",
        "status": "inactive",
        "has_events": False
    }
]

# Hardcoded Events for Lions vs Ravens (timing is relative to game start)
DEMO_EVENTS = [
    Event(
        id="event_1",
        question="The Bills are in the red zone! What is the outcome of this drive?",
        answer_choices=[
            AnswerChoice(id=1, text="Touchdown"),
            AnswerChoice(id=2, text="Field Goal"),
            AnswerChoice(id=3, text="Turnover")
        ],
        correct_answer_id=1,
        probability=0.45,  # Medium probability
        points_reward=33,  # Wager amount: 200/6 = 33 points
        timer_seconds=10,
        resolution_delay_seconds=6
    ),
    Event(
        id="event_2", 
        question="How will the Ravens respond to the Bills' touchdown?",
        answer_choices=[
            AnswerChoice(id=1, text="Scoring Drive"),
            AnswerChoice(id=2, text="Punt"),
            AnswerChoice(id=3, text="Interception/Fumble"),
        ],
        correct_answer_id=3,
        probability=0.6,  # Higher probability
        points_reward=33,  # Wager amount: 200/6 = 33 points
        timer_seconds=10,
        resolution_delay_seconds=7
    )
]

# Event timing (seconds after game start)
EVENT_SCHEDULE = [
    {"event_id": "event_1", "delay_seconds": 2},
    {"event_id": "event_2", "delay_seconds": 100},
]

def get_game_by_id(game_id: str) -> Optional[Dict]:
    """Get game information by ID"""
    for game in AVAILABLE_GAMES:
        if game["id"] == game_id:
            return game
    return None

def get_events_for_game(game_id: str) -> List[Event]:
    """Get all events for a specific game"""
    if game_id == "lions_ravens_demo":
        return DEMO_EVENTS.copy()
    return []

def get_event_schedule_for_game(game_id: str) -> List[Dict]:
    """Get event schedule for a specific game"""
    if game_id == "lions_ravens_demo":
        return EVENT_SCHEDULE.copy()
    return []
