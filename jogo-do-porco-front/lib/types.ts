export interface AuthResponse {
  token: string;
  username: string;
  email: string;
}

export interface PlayerDto {
  id: string;
  username: string;
  letters?: string;
  isBot?: boolean;
}

export interface Room {
  id: string;
  name: string;
  roomCode: string;
  status: "Lobby" | "Playing" | "Finished";
  playerCount: number;
  createdAt: string;
  isPrivate: boolean;
  players: PlayerDto[];
  maxPlayers: number;
}

export interface SlapInfo {
  playerId: string;
  timestamp: string;
}

export interface GameStateUpdate {
  gameId: string;
  phase: "Playing" | "Slapping" | "RoundOver" | "GameOver";
  handSizes: Record<string, number>;
  currentTurnPlayerId: string;
  lastRoundLoserId?: string | null;
  lastPassedCard?: Card | null;
  discardPileTop?: Card | null;
  drawPileCount?: number;
  slapOrder?: SlapInfo[] | null;
}

export interface RoundCompletedEvent {
  gameId: string;
  loserPlayerId: string;
  coringaHolderId: string | null;
  playerLetters: Record<string, string>;
  gameOver: boolean;
  gameLoserPlayerId: string | null;
}

export interface Card {
  suit: string;
  value: string;
}