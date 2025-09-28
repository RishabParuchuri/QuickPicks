"""
Hardcoded game data for the Arena sports betting application.
This file contains all the predefined events and games used in the hackathon demo.
"""

from typing import List, Dict, Optional
from models import Event, AnswerChoice

# Available Games (only "Lions vs Ravens" will have events)
AVAILABLE_GAMES = [
    {
        "id": "lions_ravens_demo",
        "name": "Lions vs Ravens @ 7pm",
        "status": "active",
        "has_events": True
    },
    {
        "id": "chiefs_bills",
        "name": "Chiefs vs Bills @ 8:30pm", 
        "status": "inactive",
        "has_events": False
    },
    {
        "id": "cowboys_eagles",
        "name": "Cowboys vs Eagles @ 1pm",
        "status": "inactive", 
        "has_events": False
    },
    {
        "id": "packers_bears",
        "name": "Packers vs Bears @ 4:25pm",
        "status": "inactive",
        "has_events": False
    },
    {
        "id": "patriots_jets",
        "name": "Patriots vs Jets @ 6pm",
        "status": "inactive",
        "has_events": False
    }
]

# Hardcoded Events for Lions vs Ravens (timing is relative to game start)
DEMO_EVENTS = [
    Event(
        id="event_1",
        question="Will the Lions score a touchdown on this drive?",
        answer_choices=[
            AnswerChoice(id=1, text="Yes"),
            AnswerChoice(id=2, text="No")
        ],
        correct_answer_id=1,
        probability=0.45,  # Medium probability
        points_reward=33,  # Wager amount: 200/6 = 33 points
        timer_seconds=30,
        resolution_delay_seconds=10  # 10s delay for suspense
    ),
    Event(
        id="event_2", 
        question="What will happen on the next play?",
        answer_choices=[
            AnswerChoice(id=1, text="Rushing play"),
            AnswerChoice(id=2, text="Passing play"),
            AnswerChoice(id=3, text="Turnover"),
            AnswerChoice(id=4, text="Score")
        ],
        correct_answer_id=2,
        probability=0.6,  # Higher probability
        points_reward=33,  # Wager amount: 200/6 = 33 points
        timer_seconds=20,
        resolution_delay_seconds=8  # Shorter delay for quick play
    ),
    Event(
        id="event_3",
        question="Will Lamar Jackson throw for over 15 yards this play?",
        answer_choices=[
            AnswerChoice(id=1, text="Yes"),
            AnswerChoice(id=2, text="No")
        ],
        correct_answer_id=2,
        probability=0.25,  # Lower probability
        points_reward=33,  # Wager amount: 200/6 = 33 points
        timer_seconds=25,
        resolution_delay_seconds=12  # Longer delay for higher stakes
    ),
    Event(
        id="event_4",
        question="Which team will score next?",
        answer_choices=[
            AnswerChoice(id=1, text="Lions"),
            AnswerChoice(id=2, text="Ravens"),
            AnswerChoice(id=3, text="Neither (End of quarter)")
        ],
        correct_answer_id=1,
        probability=0.4,  # Even-ish odds
        points_reward=33,  # Wager amount: 200/6 = 33 points
        timer_seconds=35,
        resolution_delay_seconds=15  # Longer delay for scoring prediction
    ),
    Event(
        id="event_5",
        question="Will there be a penalty called on this play?",
        answer_choices=[
            AnswerChoice(id=1, text="Yes"),
            AnswerChoice(id=2, text="No")
        ],
        correct_answer_id=2,
        probability=0.8,  # High probability
        points_reward=33,  # Wager amount: 200/6 = 33 points
        timer_seconds=15,
        resolution_delay_seconds=5  # Quick resolution for simple question
    ),
    Event(
        id="event_6",
        question="Final prediction: Who will win the game?",
        answer_choices=[
            AnswerChoice(id=1, text="Lions"),
            AnswerChoice(id=2, text="Ravens"),
            AnswerChoice(id=3, text="Tie (OT)")
        ],
        correct_answer_id=2,
        probability=0.35,  # Lower probability
        points_reward=33,  # Wager amount: 200/6 = 33 points
        timer_seconds=45,
        resolution_delay_seconds=20  # Longest delay for final prediction
    )
]

# Event timing (seconds after game start)
EVENT_SCHEDULE = [
    {"event_id": "event_1", "delay_seconds": 10},   # 10 seconds after start
    {"event_id": "event_2", "delay_seconds": 60},   # 1 minute after start
    {"event_id": "event_3", "delay_seconds": 120},  # 2 minutes after start
    {"event_id": "event_4", "delay_seconds": 180},  # 3 minutes after start
    {"event_id": "event_5", "delay_seconds": 240},  # 4 minutes after start
    {"event_id": "event_6", "delay_seconds": 300}   # 5 minutes after start
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