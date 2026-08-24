export type NumberSuit = "man" | "pin" | "sou";

export type TileSuit = NumberSuit | "honor";

export type Wind = "east" | "south" | "west" | "north";

export type SeatIndex = 0 | 1 | 2 | 3;

export type GamePhase =
  | "drawing"
  | "discarding"
  | "reaction"
  | "roundEnd"
  | "matchEnd";

export interface Tile {
  id: string;
  suit: TileSuit;
  rank: number;
  red: boolean;
}

export type MeldKind =
  | "chi"
  | "pon"
  | "openKan"
  | "closedKan"
  | "addedKan";

export interface Meld {
  kind: MeldKind;
  tiles: Tile[];
  calledFrom?: SeatIndex;
}

export interface Discard {
  tile: Tile;
  tsumogiri: boolean;
  riichiDeclaration: boolean;
  faceDown: boolean;
  called: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  seat: SeatIndex;
  seatWind: Wind;
  score: number;
  hand: Tile[];
  melds: Meld[];
  discards: Discard[];
  isDealer: boolean;
  riichi: boolean;
  ippatsu: boolean;
  drawnTileId: string | null;
}

export interface LastDiscard {
  seat: SeatIndex;
  discard: Discard;
}

export interface RoundPointResult {
  playerId: string;
  seat: SeatIndex;
  pointsBefore: number;
  change: number;
  pointsAfter: number;
}

export interface RoundWinResult {
  winMethod: "tsumo" | "ron";
  winnerSeat: SeatIndex;
  loserSeat: SeatIndex | null;
  winningTile: Tile;
  yakuNames: string[];
  han: number;
  fu: number | null;
  yakumanMultiplier: number;
  limitName: string | null;
  totalPoints: number;
  pointChanges: RoundPointResult[];
}

export interface RoundState {
  prevailingWind: Wind;
  handNumber: 1 | 2 | 3 | 4;
  honba: number;
  riichiPool: number;
  liveWall: Tile[];
  deadWall: Tile[];
  players: PlayerState[];
  currentSeat: SeatIndex;
  phase: GamePhase;
  lastDiscard: LastDiscard | null;
  turnNumber: number;
  kanCount: number;
  doraIndicatorCount: number;
  rinshanDrawCount: number;
  winResult?: RoundWinResult | null;
}

export interface GameState {
  round: RoundState;
  playerMp: number;
  maxMp: number;
  notice: string;
}
