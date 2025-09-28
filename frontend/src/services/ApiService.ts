const API_BASE_URL = 'https://nonforfeitable-repellingly-grady.ngrok-free.dev';
const WS_BASE_URL = 'wss://nonforfeitable-repellingly-grady.ngrok-free.dev';

interface CreateRoomRequest {
  name: string;
  game_name: string;
  host_name: string;
}

interface CreateRoomResponse {
  room_id: string;
  message: string;
}

interface Game {
  id: string;
  name: string;
  status: string;
  has_events: boolean;
}

interface AvailableGamesResponse {
  games: Game[];
}

interface RoomInfo {
  room: {
    id: string;
    name: string;
    game_name: string;
    host_name: string;
    players: Record<string, any>;
    game_status: string;
  };
  leaderboard: Array<{
    name: string;
    score: number;
    current_bet?: number;
  }>;
}

export class ApiService {
  static async getAvailableGames(): Promise<AvailableGamesResponse> {
    const response = await fetch(`${API_BASE_URL}/games`, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch games');
    }
    return response.json();
  }

  static async createRoom(request: CreateRoomRequest): Promise<CreateRoomResponse> {
    const response = await fetch(`${API_BASE_URL}/create-game`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create room');
    }
    
    return response.json();
  }

  static async getRoomInfo(roomId: string): Promise<RoomInfo> {
    const response = await fetch(`${API_BASE_URL}/room/${roomId}`, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch room info');
    }
    return response.json();
  }

  static async startDemoGame(roomId: string): Promise<{ message: string; room_id: string }> {
    const response = await fetch(`${API_BASE_URL}/admin/start-demo/${roomId}`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to start demo game');
    }
    
    return response.json();
  }

  static createWebSocket(roomId: string): WebSocket {
    return new WebSocket(`${WS_BASE_URL}/ws/${roomId}`);
  }
}

export { API_BASE_URL, WS_BASE_URL };