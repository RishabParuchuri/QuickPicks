import asyncio
import json
from collections import deque
from fastapi import FastAPI, HTTPException
import uvicorn
import websockets
from typing import Optional

app = FastAPI()

# A map: game_id → deque of plays
game_play_histories: dict[str, deque] = {}
MAX_PLAYS_PER_GAME = 100  # keep some buffer, but we serve last N


# WebSocket connection state
class GameFeedClient:
    def __init__(self, base_ws_url: str, api_token: str, game_id: str):
        """
        base_ws_url: e.g. "wss://nfl-feed.example.com/game/{game_id}/stream"
        api_token: your auth token or API key
        game_id: which game to track
        """
        self.base_ws_url = base_ws_url
        self.api_token = api_token
        self.game_id = game_id
        self.url = base_ws_url.format(game_id=game_id)
        self.url = f"{self.url}?token={self.api_token}"
        self.ws = None
        self._should_stop = False

    async def connect_and_consume(self):
        backoff = 1
        while not self._should_stop:
            try:
                async with websockets.connect(
                    self.url, ping_interval=20, ping_timeout=10
                ) as ws:
                    self.ws = ws
                    print(f"[{self.game_id}] Connected to feed")
                    backoff = 1
                    await self._consume_loop()
            except Exception as e:
                print(
                    f"[{self.game_id}] WebSocket error: {e}, reconnecting in {backoff}s"
                )
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 30)

    async def _consume_loop(self):
        async for msg in self.ws:
            try:
                data = json.loads(msg)
            except Exception as e:
                print(f"[{self.game_id}] Failed to parse JSON: {e}; raw={msg}")
                continue

            # Example assumption: data looks like:
            # {
            #   "type": "play",
            #   "game_id": "1234",
            #   "play": { … }
            # }
            if data.get("type") == "play" and data.get("game_id") == self.game_id:
                play = data["play"]
                dq = game_play_histories.setdefault(
                    self.game_id, deque(maxlen=MAX_PLAYS_PER_GAME)
                )
                dq.append(play)
                # Optionally log or process “play” further
                # print(f"[{self.game_id}] New play: {play}")

    def stop(self):
        self._should_stop = True
        # optionally close websocket


# We'll run one GameFeedClient instance (per game) in background

feed_client: Optional[GameFeedClient] = None


@app.get("/lastplays/{game_id}")
async def get_last_plays(game_id: str, n: int = 5):
    """
    Return up to the last n plays for the specified game_id.
    If game_id is not being tracked or has no plays, returns an error or empty list.
    """
    dq = game_play_histories.get(game_id)
    if dq is None:
        # No data for this game
        return {"game_id": game_id, "plays": []}
    # Return the last n plays (in chronological order)
    # deque stores in arrival order, so take the tail
    plays = list(dq)[-n:]
    return {"game_id": game_id, "plays": plays}


async def startup_feed(game_id: str, base_ws_url: str, api_token: str):
    global feed_client
    # You could support multiple games by holding multiple clients
    feed_client = GameFeedClient(base_ws_url, api_token, game_id)
    await feed_client.connect_and_consume()


def start_server(game_id: str, base_ws_url: str, api_token: str):
    """
    Bootstraps the HTTP server + WS consumer.
    """
    config = uvicorn.Config(app, host="0.0.0.0", port=8000, log_level="info")
    server = uvicorn.Server(config)

    # Kick off both in asyncio
    async def runner():
        await asyncio.gather(
            server.serve(),
            startup_feed(game_id, base_ws_url, api_token),
        )

    asyncio.run(runner())
