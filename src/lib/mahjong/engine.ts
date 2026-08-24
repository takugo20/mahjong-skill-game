import type {
  Discard,
  GameState,
  PlayerState,
  RoundWinResult,
  RoundState,
  SeatIndex,
  Tile,
  Wind
} from "./types";
import {
  evaluateRoundWin,
  resolveRoundWin
} from "./roundWin";
import type {
  ValidRoundWinResolution
} from "./roundWin";
import {
  createFullTileSet,
  getTileLabel,
  getTileTypeKey,
  isDora,
  sortTiles
} from "./tiles";

const WINDS: Wind[] = [
  "east",
  "south",
  "west",
  "north"
];

const DORA_INDICATOR_INDEXES = [
  4,
  6,
  8,
  10,
  12
];

function nextSeat(seat: SeatIndex): SeatIndex {
  return ((seat + 1) % 4) as SeatIndex;
}

function createPlayer(
  seat: SeatIndex,
  name: string
): PlayerState {
  return {
    id: `player-${seat}`,
    name,
    seat,
    seatWind: WINDS[seat],
    score: 25000,
    hand: [],
    melds: [],
    discards: [],
    isDealer: seat === 0,
    riichi: false,
    ippatsu: false,
    drawnTileId: null
  };
}

function replacePlayer(
  players: PlayerState[],
  updatedPlayer: PlayerState
): PlayerState[] {
  return players.map((player) =>
    player.seat === updatedPlayer.seat
      ? updatedPlayer
      : player
  );
}

export function shuffleTiles(
  tiles: Tile[],
  random: () => number = Math.random
): Tile[] {
  const shuffled = [...tiles];

  for (
    let index = shuffled.length - 1;
    index > 0;
    index -= 1
  ) {
    const targetIndex = Math.floor(
      random() * (index + 1)
    );

    const currentTile = shuffled[index];
    shuffled[index] = shuffled[targetIndex];
    shuffled[targetIndex] = currentTile;
  }

  return shuffled;
}

export function getDoraIndicators(
  round: RoundState
): Tile[] {
  return DORA_INDICATOR_INDEXES
    .slice(0, round.doraIndicatorCount)
    .map((index) => round.deadWall[index])
    .filter((tile): tile is Tile => tile !== undefined);
}

export function getWindLabel(wind: Wind): string {
  const labels: Record<Wind, string> = {
    east: "東",
    south: "南",
    west: "西",
    north: "北"
  };

  return labels[wind];
}

export function getRoundLabel(
  round: RoundState
): string {
  return `${getWindLabel(round.prevailingWind)}${round.handNumber}局`;
}

export function createInitialGameState(
  random: () => number = Math.random
): GameState {
  const shuffledTiles = shuffleTiles(
    createFullTileSet(),
    random
  );

  const deadWall = shuffledTiles.slice(-14);
  const liveWall = shuffledTiles.slice(0, -14);

  const players: PlayerState[] = [
    createPlayer(0, "あなた"),
    createPlayer(1, "CPU・右"),
    createPlayer(2, "能力者CPU"),
    createPlayer(3, "CPU・左")
  ];

  for (let drawIndex = 0; drawIndex < 13; drawIndex += 1) {
    for (let seat = 0; seat < 4; seat += 1) {
      const tile = liveWall.shift();

      if (!tile) {
        throw new Error("配牌中に通常山が不足しました。");
      }

      players[seat].hand.push(tile);
    }
  }

  const dealerDraw = liveWall.shift();

  if (!dealerDraw) {
    throw new Error("親の第1ツモ牌がありません。");
  }

  players[0].hand.push(dealerDraw);
  players[0].drawnTileId = dealerDraw.id;

  for (const player of players) {
    player.hand = sortTiles(player.hand);
  }

  return {
    round: {
      prevailingWind: "east",
      handNumber: 1,
      honba: 0,
      riichiPool: 0,
      liveWall,
      deadWall,
      players,
      currentSeat: 0,
      phase: "discarding",
      lastDiscard: null,
      turnNumber: 0,
      kanCount: 0,
      doraIndicatorCount: 1,
      rinshanDrawCount: 0
    },
    playerMp: 420,
    maxMp: 900,
    notice: "東1局を開始しました。捨てる牌を選んでください。"
  };
}

export function drawTile(
  state: GameState,
  seat: SeatIndex
): GameState {
  const round = state.round;

  if (
    round.phase !== "drawing" ||
    round.currentSeat !== seat
  ) {
    return state;
  }

  const drawnTile = round.liveWall[0];

  if (!drawnTile) {
    return {
      ...state,
      round: {
        ...round,
        phase: "roundEnd"
      },
      notice: "通常山が尽きたため、荒牌平局です。"
    };
  }

  const currentPlayer = round.players[seat];

  const updatedPlayer: PlayerState = {
    ...currentPlayer,
    hand: sortTiles([
      ...currentPlayer.hand,
      drawnTile
    ]),
    drawnTileId: drawnTile.id
  };

  const updatedMp =
    seat === 0
      ? Math.min(
          state.maxMp,
          state.playerMp + 30
        )
      : state.playerMp;

  return {
    ...state,
    playerMp: updatedMp,
    round: {
      ...round,
      liveWall: round.liveWall.slice(1),
      players: replacePlayer(
        round.players,
        updatedPlayer
      ),
      phase: "discarding"
    },
    notice:
      seat === 0
        ? "牌をツモりました。捨てる牌を選んでください。"
        : `${currentPlayer.name}がツモりました。`
  };
}

export function discardTile(
  state: GameState,
  tileId: string
): GameState {
  const round = state.round;

  if (round.phase !== "discarding") {
    return state;
  }

  const seat = round.currentSeat;
  const currentPlayer = round.players[seat];

  const tileIndex = currentPlayer.hand.findIndex(
    (tile) => tile.id === tileId
  );

  if (tileIndex < 0) {
    return {
      ...state,
      notice: "指定された牌は手牌にありません。"
    };
  }

  const discardedTile = currentPlayer.hand[tileIndex];
  const remainingHand = [...currentPlayer.hand];
  remainingHand.splice(tileIndex, 1);

  const discard: Discard = {
    tile: discardedTile,
    tsumogiri:
      currentPlayer.drawnTileId === discardedTile.id,
    riichiDeclaration: false,
    faceDown: false,
    called: false
  };

  const updatedPlayer: PlayerState = {
    ...currentPlayer,
    hand: remainingHand,
    discards: [
      ...currentPlayer.discards,
      discard
    ],
    drawnTileId: null
  };

  const wallIsEmpty = round.liveWall.length === 0;
  const followingSeat = nextSeat(seat);

  return {
    ...state,
    round: {
      ...round,
      players: replacePlayer(
        round.players,
        updatedPlayer
      ),
      currentSeat: followingSeat,
      phase: wallIsEmpty
        ? "roundEnd"
        : "drawing",
      lastDiscard: {
        seat,
        discard
      },
      turnNumber: round.turnNumber + 1
    },
    notice: wallIsEmpty
      ? "最後の牌が捨てられました。荒牌平局です。"
      : `${currentPlayer.name}が牌を捨てました。`
  };
}

function calculateDiscardPriority(
  tile: Tile,
  player: PlayerState,
  round: RoundState,
  random: () => number
): number {
  const sameTypeCount = player.hand.filter(
    (handTile) =>
      getTileTypeKey(handTile) ===
      getTileTypeKey(tile)
  ).length;

  const doraIndicators = getDoraIndicators(round);
  const tileIsDora = doraIndicators.some(
    (indicator) => isDora(tile, indicator)
  );

  let priority = random() * 0.25;

  if (tile.red) {
    priority -= 8;
  }

  if (tileIsDora) {
    priority -= 6;
  }

  if (sameTypeCount >= 2) {
    priority -= 4;
  }

  if (tile.suit === "honor") {
    priority += sameTypeCount === 1 ? 5 : -1;
    return priority;
  }

  const hasNearbyTile = player.hand.some(
    (handTile) =>
      handTile.suit === tile.suit &&
      handTile.id !== tile.id &&
      Math.abs(handTile.rank - tile.rank) <= 2
  );

  if (!hasNearbyTile) {
    priority += 4;
  }

  if (tile.rank === 1 || tile.rank === 9) {
    priority += 3;
  } else if (
    tile.rank === 2 ||
    tile.rank === 8
  ) {
    priority += 2;
  }

  return priority;
}

function chooseCpuDiscard(
  player: PlayerState,
  round: RoundState,
  random: () => number
): Tile {
  const candidates = player.hand.map((tile) => ({
    tile,
    priority: calculateDiscardPriority(
      tile,
      player,
      round,
      random
    )
  }));

  candidates.sort(
    (left, right) =>
      right.priority - left.priority
  );

  const selectedTile = candidates[0]?.tile;

  if (!selectedTile) {
    throw new Error("CPUに捨てられる牌がありません。");
  }

  return selectedTile;
}

function completeCpuTurns(
  state: GameState,
  random: () => number
): GameState {
  let nextState = state;
  let processedCpuCount = 0;

  while (
    nextState.round.phase === "drawing" &&
    nextState.round.currentSeat !== 0 &&
    processedCpuCount < 3
  ) {
    const cpuSeat = nextState.round.currentSeat;

    nextState = drawTile(
      nextState,
      cpuSeat
    );

    if (nextState.round.phase !== "discarding") {
      break;
    }

    const cpuPlayer =
      nextState.round.players[cpuSeat];

    const selectedTile = chooseCpuDiscard(
      cpuPlayer,
      nextState.round,
      random
    );

    nextState = discardTile(
      nextState,
      selectedTile.id
    );

    processedCpuCount += 1;
  }

  if (
    nextState.round.phase === "drawing" &&
    nextState.round.currentSeat === 0
  ) {
    nextState = drawTile(nextState, 0);
  }

  return nextState;
}

export function playPlayerDiscard(
  state: GameState,
  tileId: string,
  random: () => number = Math.random
): GameState {
  if (
    state.round.currentSeat !== 0 ||
    state.round.phase !== "discarding"
  ) {
    return {
      ...state,
      notice: "現在はプレイヤーの打牌手番ではありません。"
    };
  }

  const discardedState = discardTile(
    state,
    tileId
  );

  if (discardedState.round.phase === "roundEnd") {
    return discardedState;
  }

  return completeCpuTurns(
    discardedState,
    random
  );
}
