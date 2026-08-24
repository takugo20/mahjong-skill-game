import type {
  Discard,
  GameState,
  PlayerState,
  RoundPointResult,
  RoundWinResult,
  RoundState,
  SeatIndex,
  Tile,
  Wind
} from "./types";
import {
  resolveExhaustiveDrawSettlement
} from "./drawSettlement";
import {
  getFuritenStatus
} from "./furiten";
import {
  resolveMatchSettlement
} from "./matchSettlement";
import {
  evaluateRoundWin,
  resolveRoundWin
} from "./roundWin";
import type {
  ValidRoundWinResolution
} from "./roundWin";
import {
  isTenpai
} from "./hand";
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
    temporaryFuriten: false,
    riichiFuriten: false,
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
      rinshanDrawCount: 0,
      winResult: null,
      drawResult: null
    },
    initialDealerSeat: 0,
    matchResult: null,
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
    return finishRoundWithExhaustiveDraw(
      state,
      "通常山が尽きたため、荒牌平局です。"
    );
  }

  const currentPlayer = round.players[seat];

  const updatedPlayer: PlayerState = {
    ...currentPlayer,
    hand: sortTiles([
      ...currentPlayer.hand,
      drawnTile
    ]),
    temporaryFuriten: false,
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

function getUraDoraIndicators(
  round: RoundState
): Tile[] {
  return DORA_INDICATOR_INDEXES
    .slice(0, round.doraIndicatorCount)
    .map(
      (index) => round.deadWall[index + 1]
    )
    .filter(
      (tile): tile is Tile =>
        tile !== undefined
    );
}

function createWinInput(
  state: GameState,
  winnerSeat: SeatIndex,
  winMethod: "tsumo" | "ron"
) {
  const player =
    state.round.players[winnerSeat];

  return {
    round: state.round,
    winnerSeat,
    winMethod,
    doraIndicators:
      getDoraIndicators(state.round),
    uraDoraIndicators:
      player.riichi
        ? getUraDoraIndicators(
            state.round
          )
        : undefined
  };
}

function isPlayerFuriten(
  state: GameState,
  seat: SeatIndex
): boolean {
  const player = state.round.players[seat];

  return getFuritenStatus({
    concealedTiles: player.hand,
    melds: player.melds,
    discards: player.discards,
    temporaryFuriten:
      player.temporaryFuriten,
    riichiFuriten:
      player.riichiFuriten
  }).isFuriten;
}

export function canPlayerTsumo(
  state: GameState
): boolean {
  try {
    return evaluateRoundWin(
      createWinInput(
        state,
        0,
        "tsumo"
      )
    ).valid;
  } catch {
    return false;
  }
}

export function canPlayerRon(
  state: GameState
): boolean {
  if (
    state.round.lastDiscard?.seat === 0
  ) {
    return false;
  }

  try {
    if (isPlayerFuriten(state, 0)) {
      return false;
    }

    return evaluateRoundWin(
      createWinInput(
        state,
        0,
        "ron"
      )
    ).valid;
  } catch {
    return false;
  }
}

function createRoundWinResult(
  resolution:
    ValidRoundWinResolution
): RoundWinResult {
  const best = resolution.evaluation.best;

  const yakuNames = best.isYakuman
    ? best.yakuman.map(
        (yakuman) => yakuman.name
      )
    : best.normalYaku.map(
        (yaku) => yaku.name
      );

  return {
    winMethod: resolution.winMethod,
    winnerSeat: resolution.winnerSeat,
    loserSeat: resolution.loserSeat,
    winningTile: resolution.winningTile,
    yakuNames,
    han: best.totalHan,
    fu: best.fu?.fu ?? null,
    yakumanMultiplier:
      best.yakumanMultiplier,
    limitName: best.score.limitName,
    totalPoints: best.score.totalPoints,
    pointChanges:
      resolution.pointChanges
  };
}

function finishRoundWithWin(
  state: GameState,
  resolution:
    ValidRoundWinResolution
): GameState {
  const winner =
    state.round.players[
      resolution.winnerSeat
    ];

  const loser =
    resolution.loserSeat === null
      ? null
      : state.round.players[
          resolution.loserSeat
        ];

  const notice =
    resolution.winMethod === "tsumo"
      ? `${winner.name}がツモ和了しました。`
      : `${winner.name}が${loser?.name ?? "他家"}からロン和了しました。`;

  return {
    ...state,
    round: {
      ...state.round,
      players: resolution.playersAfter,
      phase: "roundEnd",
      riichiPool: 0,
      winResult:
        createRoundWinResult(resolution),
      drawResult: null
    },
    notice
  };
}

function finishRoundWithExhaustiveDraw(
  state: GameState,
  notice: string
): GameState {
  if (state.round.drawResult) {
    return state;
  }

  const tenpaiPlayerIds =
    state.round.players
      .filter((player) =>
        isTenpai(
          player.hand,
          player.melds
        )
      )
      .map((player) => player.id);

  const settlement =
    resolveExhaustiveDrawSettlement({
      players: state.round.players.map(
        (player) => ({
          id: player.id,
          wind: player.seatWind,
          points: player.score
        })
      ),
      tenpaiPlayerIds
    });

  const pointsAfterById = new Map(
    settlement.pointChanges.map(
      (change) => [
        change.playerId,
        change.pointsAfter
      ]
    )
  );

  const playersAfter =
    state.round.players.map((player) => ({
      ...player,
      score:
        pointsAfterById.get(player.id) ??
        player.score
    }));

  const seatByPlayerId = new Map(
    state.round.players.map(
      (player) => [
        player.id,
        player.seat
      ]
    )
  );

  const pointChanges: RoundPointResult[] =
    settlement.pointChanges.map(
      (change) => {
        const seat = seatByPlayerId.get(
          change.playerId
        );

        if (seat === undefined) {
          throw new Error(
            "流局精算の対象プレイヤーが見つかりません。"
          );
        }

        return {
          ...change,
          seat
        };
      }
    );

  const tenpaiIdSet = new Set(
    settlement.tenpaiPlayerIds
  );

  return {
    ...state,
    round: {
      ...state.round,
      players: playersAfter,
      phase: "roundEnd",
      winResult: null,
      drawResult: {
        tenpaiSeats:
          state.round.players
            .filter((player) =>
              tenpaiIdSet.has(player.id)
            )
            .map((player) => player.seat),
        notenSeats:
          state.round.players
            .filter((player) =>
              !tenpaiIdSet.has(player.id)
            )
            .map((player) => player.seat),
        pointChanges
      }
    },
    notice
  };
}

export function declarePlayerTsumo(
  state: GameState
): GameState {
  if (!canPlayerTsumo(state)) {
    return {
      ...state,
      notice: "現在の手牌ではツモ和了できません。"
    };
  }

  const resolution = resolveRoundWin(
    createWinInput(
      state,
      0,
      "tsumo"
    )
  );

  if (!resolution.valid) {
    return {
      ...state,
      notice: "ツモ和了の精算に失敗しました。"
    };
  }

  return finishRoundWithWin(
    state,
    resolution
  );
}

export function declarePlayerRon(
  state: GameState
): GameState {
  if (
    state.round.phase !== "reaction" ||
    !canPlayerRon(state)
  ) {
    return {
      ...state,
      notice: "現在はロン和了できません。"
    };
  }

  const resolution = resolveRoundWin(
    createWinInput(
      state,
      0,
      "ron"
    )
  );

  if (!resolution.valid) {
    return {
      ...state,
      notice: "ロン和了の精算に失敗しました。"
    };
  }

  return finishRoundWithWin(
    state,
    resolution
  );
}

function getValidWinResolution(
  state: GameState,
  winnerSeat: SeatIndex,
  winMethod: "tsumo" | "ron"
): ValidRoundWinResolution | null {
  try {
    if (
      winMethod === "ron" &&
      isPlayerFuriten(
        state,
        winnerSeat
      )
    ) {
      return null;
    }

    const resolution = resolveRoundWin(
      createWinInput(
        state,
        winnerSeat,
        winMethod
      )
    );

    return resolution.valid
      ? resolution
      : null;
  } catch {
    return null;
  }
}

function finishCpuRonIfAvailable(
  state: GameState
): GameState | null {
  const discarderSeat =
    state.round.lastDiscard?.seat;

  if (discarderSeat === undefined) {
    return null;
  }

  let candidateSeat =
    nextSeat(discarderSeat);

  for (
    let checkedCount = 0;
    checkedCount < 3;
    checkedCount += 1
  ) {
    if (candidateSeat !== 0) {
      const resolution =
        getValidWinResolution(
          state,
          candidateSeat,
          "ron"
        );

      if (resolution) {
        return finishRoundWithWin(
          state,
          resolution
        );
      }
    }

    candidateSeat =
      nextSeat(candidateSeat);
  }

  return null;
}

function finishCpuTsumoIfAvailable(
  state: GameState,
  cpuSeat: SeatIndex
): GameState | null {
  const resolution =
    getValidWinResolution(
      state,
      cpuSeat,
      "tsumo"
    );

  return resolution
    ? finishRoundWithWin(
        state,
        resolution
      )
    : null;
}

function completeCpuTurns(
  state: GameState,
  random: () => number
): GameState {
  const cpuRonState =
    finishCpuRonIfAvailable(state);

  if (cpuRonState) {
    return cpuRonState;
  }

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

    const cpuTsumoState =
      finishCpuTsumoIfAvailable(
        nextState,
        cpuSeat
      );

    if (cpuTsumoState) {
      return cpuTsumoState;
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

    if (canPlayerRon(nextState)) {
      const lastDiscard =
        nextState.round.lastDiscard;

      if (!lastDiscard) {
        throw new Error(
          "ロン対象の捨て牌が見つかりません。"
        );
      }

      return {
        ...nextState,
        round: {
          ...nextState.round,
          phase: "reaction"
        },
        notice:
          `${nextState.round.players[lastDiscard.seat].name}の` +
          `${getTileLabel(lastDiscard.discard.tile)}にロンできます。`
      };
    }

    const otherCpuRonState =
      finishCpuRonIfAvailable(
        nextState
      );

    if (otherCpuRonState) {
      return otherCpuRonState;
    }
  }

  if (
    nextState.round.phase === "drawing" &&
    nextState.round.currentSeat === 0
  ) {
    nextState = drawTile(nextState, 0);
  }

  if (
    nextState.round.phase === "roundEnd" &&
    !nextState.round.winResult
  ) {
    return finishRoundWithExhaustiveDraw(
      nextState,
      nextState.notice
    );
  }

  return nextState;
}

export function skipPlayerRon(
  state: GameState,
  random: () => number = Math.random
): GameState {
  if (state.round.phase !== "reaction") {
    return state;
  }

  const player = state.round.players[0];

  const skippedPlayer: PlayerState = {
    ...player,
    temporaryFuriten:
      player.riichi ? false : true,
    riichiFuriten:
      player.riichi ||
      player.riichiFuriten === true
  };

  const skippedState: GameState = {
    ...state,
    round: {
      ...state.round,
      players: replacePlayer(
        state.round.players,
        skippedPlayer
      )
    }
  };

  if (
    skippedState.round.liveWall.length === 0
  ) {
    return finishRoundWithExhaustiveDraw(
      skippedState,
      "ロンを見送りました。通常山が尽きたため、荒牌平局です。"
    );
  }

  const resumedState: GameState = {
    ...skippedState,
    round: {
      ...skippedState.round,
      phase: "drawing"
    },
    notice: "ロンを見送りました。"
  };

  return completeCpuTurns(
    resumedState,
    random
  );
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

  const cpuRonState =
    finishCpuRonIfAvailable(
      discardedState
    );

  if (cpuRonState) {
    return cpuRonState;
  }

  if (discardedState.round.phase === "roundEnd") {
    return finishRoundWithExhaustiveDraw(
      discardedState,
      discardedState.notice
    );
  }

  return completeCpuTurns(
    discardedState,
    random
  );
}

function getDealerSeat(
  round: RoundState
): SeatIndex {
  const dealer = round.players.find(
    (player) => player.isDealer
  );

  if (!dealer) {
    throw new Error(
      "親のプレイヤーが見つかりません。"
    );
  }

  return dealer.seat;
}

function getSeatWindForDealer(
  seat: SeatIndex,
  dealerSeat: SeatIndex
): Wind {
  const distance =
    (seat - dealerSeat + 4) % 4;

  return WINDS[distance];
}

function preparePlayersForNextRound(
  players: PlayerState[],
  dealerSeat: SeatIndex
): PlayerState[] {
  return players.map((player) => ({
    ...player,
    seatWind: getSeatWindForDealer(
      player.seat,
      dealerSeat
    ),
    hand: [],
    melds: [],
    discards: [],
    isDealer:
      player.seat === dealerSeat,    riichi: false,
    ippatsu: false,
    temporaryFuriten: false,
    riichiFuriten: false,
    drawnTileId: null
  }));
}

function dealNextRoundHands(
  players: PlayerState[],
  dealerSeat: SeatIndex,
  random: () => number
): {
  players: PlayerState[];
  liveWall: Tile[];
  deadWall: Tile[];
} {
  const shuffledTiles = shuffleTiles(
    createFullTileSet(),
    random
  );

  const deadWall = shuffledTiles.slice(-14);
  const liveWall = shuffledTiles.slice(0, -14);

  for (
    let drawIndex = 0;
    drawIndex < 13;
    drawIndex += 1
  ) {
    for (
      let seatOffset = 0;
      seatOffset < 4;
      seatOffset += 1
    ) {
      const seat = (
        (dealerSeat + seatOffset) % 4
      ) as SeatIndex;

      const tile = liveWall.shift();

      if (!tile) {
        throw new Error(
          "次局の配牌中に通常山が不足しました。"
        );
      }

      players[seat].hand.push(tile);
    }
  }

  for (const player of players) {
    player.hand = sortTiles(player.hand);
  }

  return {
    players,
    liveWall,
    deadWall
  };
}

function dealerContinues(
  round: RoundState,
  dealerSeat: SeatIndex
): boolean {
  if (round.winResult) {
    return (
      round.winResult.winnerSeat ===
      dealerSeat
    );
  }

  if (round.drawResult) {
    return round.drawResult.tenpaiSeats.includes(
      dealerSeat
    );
  }

  const dealer = round.players[dealerSeat];

  return isTenpai(
    dealer.hand,
    dealer.melds
  );
}

interface RoundPosition {
  prevailingWind:
    RoundState["prevailingWind"];
  handNumber: RoundState["handNumber"];
}

function isHanchanFinalHand(
  round: RoundState
): boolean {
  return (
    round.prevailingWind === "south" &&
    round.handNumber === 4
  );
}

function getAdvancedRoundPosition(
  round: RoundState
): RoundPosition {
  if (round.handNumber < 4) {
    return {
      prevailingWind:
        round.prevailingWind,
      handNumber: (
        round.handNumber + 1
      ) as RoundState["handNumber"]
    };
  }

  if (round.prevailingWind === "east") {
    return {
      prevailingWind: "south",
      handNumber: 1
    };
  }

  throw new Error(
    "南4局を越えて次局を開始できません。"
  );
}

function finishMatch(
  state: GameState,
  notice: string
): GameState {
  const settlement =
    resolveMatchSettlement({
      players: state.round.players.map(
        (player) => ({
          id: player.id,
          seat: player.seat,
          points: player.score
        })
      ),
      riichiPool: state.round.riichiPool,
      initialDealerSeat:
        state.initialDealerSeat
    });

  const finalPointsById = new Map(
    settlement.playersAfter.map(
      (player) => [
        player.id,
        player.points
      ]
    )
  );

  return {
    ...state,
    round: {
      ...state.round,
      riichiPool: 0,
      players: state.round.players.map(
        (player) => ({
          ...player,
          score:
            finalPointsById.get(player.id) ??
            player.score
        })
      ),
      phase: "matchEnd",
      winResult: null,
      drawResult: null
    },
    matchResult: {
      provisionalLeaderId:
        settlement.provisionalLeaderId,
      riichiPoolRecipientId:
        settlement.riichiPoolRecipientId,
      riichiPoolAward:
        settlement.riichiPoolAward,
      rankings: settlement.rankings
    },
    notice
  };
}

export function startNextRound(
  state: GameState,
  random: () => number = Math.random
): GameState {
  if (state.round.phase !== "roundEnd") {
    return state;
  }

  if (
    state.round.players.some(
      (player) => player.score < 0
    )
  ) {
    return finishMatch(
      state,
      "持ち点が0点未満のプレイヤーがいるため、半荘戦が終了しました。"
    );
  }

  const currentDealerSeat =
    getDealerSeat(state.round);

  const continues = dealerContinues(
    state.round,
    currentDealerSeat
  );

  const isExhaustiveDraw =
    state.round.winResult == null;

  if (
    !continues &&
    isHanchanFinalHand(state.round)
  ) {
    return finishMatch(
      state,
      "半荘戦が終了しました。最終得点を確認してください。"
    );
  }

  const nextDealerSeat = continues
    ? currentDealerSeat
    : nextSeat(currentDealerSeat);

  const nextPosition: RoundPosition =
    continues
      ? {
          prevailingWind:
            state.round.prevailingWind,
          handNumber:
            state.round.handNumber
        }
      : getAdvancedRoundPosition(
          state.round
        );

  const nextHonba =
    continues || isExhaustiveDraw
      ? state.round.honba + 1
      : 0;

  const preparedPlayers =
    preparePlayersForNextRound(
      state.round.players,
      nextDealerSeat
    );

  const dealt = dealNextRoundHands(
    preparedPlayers,
    nextDealerSeat,
    random
  );

  const dealtState: GameState = {
    ...state,
    matchResult: null,
    playerMp: Math.min(
      state.maxMp,
      state.playerMp + 390
    ),
    round: {
      prevailingWind:
        nextPosition.prevailingWind,
      handNumber:
        nextPosition.handNumber,
      honba: nextHonba,
      riichiPool:
        state.round.riichiPool,
      liveWall: dealt.liveWall,
      deadWall: dealt.deadWall,
      players: dealt.players,
      currentSeat: nextDealerSeat,
      phase: "drawing",
      lastDiscard: null,
      turnNumber: 0,
      kanCount: 0,
      doraIndicatorCount: 1,
      rinshanDrawCount: 0,
      winResult: null,
      drawResult: null
    },
    notice: "次局を開始します。"
  };

  const startedState =
    nextDealerSeat === 0
      ? drawTile(dealtState, 0)
      : completeCpuTurns(
          dealtState,
          random
        );

  if (
    startedState.round.phase ===
    "roundEnd"
  ) {
    return startedState;
  }

  return {
    ...startedState,
    notice:
      `${getRoundLabel(startedState.round)}を開始しました。` +
      startedState.notice
  };
}
