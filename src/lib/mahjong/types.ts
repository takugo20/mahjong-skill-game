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

export type DrawnTileSource =
  | "liveWall"
  | "rinshan";

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
  calledTileId?: string;
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
  doubleRiichi?: boolean;
  ippatsu: boolean;
  temporaryFuriten?: boolean;
  riichiFuriten?: boolean;
  drawnTileId: string | null;
  drawnTileSource?:
    DrawnTileSource | null;
}

export interface LastDiscard {
  seat: SeatIndex;
  discard: Discard;
}

export type MeldCallKind =
  | "chi"
  | "pon";

export interface MeldCallOption {
  id: string;
  kind: MeldCallKind;
  callerSeat: SeatIndex;
  discarderSeat: SeatIndex;
  calledTileId: string;
  handTileIds: [string, string];
}

export interface MeldCallDiscardRestriction {
  callerSeat: SeatIndex;
  forbiddenTileTypes: Array<
    Pick<Tile, "suit" | "rank">
  >;
}

export interface PendingClosedKan {
  id: string;
  kind: "closedKan";
  declarerSeat: SeatIndex;
  tileIds: [
    string,
    string,
    string,
    string
  ];
  chankanTileId: string;
}

export interface PendingAddedKan {
  id: string;
  kind: "addedKan";
  declarerSeat: SeatIndex;
  meldIndex: number;
  tileId: string;
  chankanTileId: string;
}

export type PendingKan =
  | PendingClosedKan
  | PendingAddedKan;

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
  doraCount?: number;
  doraIndicatorTiles?: Tile[];
  uraDoraIndicatorTiles?: Tile[];
  han: number;
  fu: number | null;
  yakumanMultiplier: number;
  limitName: string | null;
  totalPoints: number;
  pointChanges: RoundPointResult[];
}

export interface RoundDoubleRonResult {
  loserSeat: SeatIndex;
  winResults: [
    RoundWinResult,
    RoundWinResult
  ];
  pointChanges: RoundPointResult[];
  riichiPoolRecipientSeat:
    SeatIndex | null;
}

export interface RoundTripleRonDrawResult {
  reason: "tripleRon";
  discarderSeat: SeatIndex;
  ronCandidateSeats: [
    SeatIndex,
    SeatIndex,
    SeatIndex
  ];
}

export type RoundAbortiveDrawResult =
  RoundTripleRonDrawResult;

export interface RoundDrawResult {
  tenpaiSeats: SeatIndex[];
  notenSeats: SeatIndex[];
  pointChanges: RoundPointResult[];
}

export interface MatchRankingResult {
  rank: 1 | 2 | 3 | 4;
  playerId: string;
  seat: SeatIndex;
  pointsBeforePool: number;
  riichiPoolAward: number;
  finalPoints: number;
}

export interface MatchResult {
  provisionalLeaderId: string;
  riichiPoolRecipientId: string | null;
  riichiPoolAward: number;
  rankings: MatchRankingResult[];
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
  meldCallOptions?: MeldCallOption[];
  meldCallDiscardRestriction?:
    MeldCallDiscardRestriction | null;
  pendingKan?: PendingKan | null;
  turnNumber: number;
  kanCount: number;
  doraIndicatorCount: number;
  rinshanDrawCount: number;
  winResult?: RoundWinResult | null;
  doubleRonResult?:
    RoundDoubleRonResult | null;
  drawResult?: RoundDrawResult | null;
  abortiveDrawResult?:
    RoundAbortiveDrawResult | null;
}

export interface GameState {
  round: RoundState;
  initialDealerSeat: SeatIndex;
  matchResult: MatchResult | null;
  playerMp: number;
  maxMp: number;
  notice: string;
}
