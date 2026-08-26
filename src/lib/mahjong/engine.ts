import type {
  Discard,
  GameState,
  Meld,
  MeldCallDiscardRestriction,
  MeldCallOption,
  PendingKan,
  PlayerState,
  RoundAbortiveDrawResult,
  RoundPointResult,
  RoundWinResult,
  RoundState,
  SeatIndex,
  Tile,
  Wind
} from "./types";
import {
  getAbortiveDrawLabel,
  getNineTerminalsDrawResult
} from "./abortiveDraw";
import {
  getMeldCallOptions
} from "./calls";
import {
  chooseCpuMeldCall,
  chooseCpuOpenKanCall
} from "./cpuCalls";
import type {
  CpuMeldCallDecision,
  CpuOpenKanCallDecision
} from "./cpuCalls";
import {
  chooseCpuSelfKan
} from "./cpuKan";
import type {
  CpuSelfKanDecision
} from "./cpuKan";
import {
  chooseCpuRiichi
} from "./cpuRiichi";
import type {
  CpuRiichiDecision
} from "./cpuRiichi";
import {
  resolveExhaustiveDrawSettlement
} from "./drawSettlement";
import {
  getFuritenStatus
} from "./furiten";
import {
  getOpenKanCallOptions,
  getSelfKanOptions
} from "./kan";
import type {
  OpenKanCallOption,
  SelfKanOption
} from "./kan";
import {
  executeKan
} from "./kanExecution";
import {
  resolveMatchSettlement
} from "./matchSettlement";
import {
  resolveRonDeclarations
} from "./multipleRon";
import {
  getRiichiDiscardTileIds,
  RIICHI_DEPOSIT
} from "./riichi";
import {
  evaluateRoundWin,
  resolveRoundWin
} from "./roundWin";
import type {
  ChankanWinSource,
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
    doubleRiichi: false,
    ippatsu: false,
    temporaryFuriten: false,
    riichiFuriten: false,
    drawnTileId: null,
    drawnTileSource: null
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
  players[0].drawnTileSource = "liveWall";

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
      meldCallOptions: [],
      pendingKan: null,
      turnNumber: 0,
      kanCount: 0,
      doraIndicatorCount: 1,
      rinshanDrawCount: 0,
      winResult: null,
      doubleRonResult: null,
      drawResult: null,
      abortiveDrawResult: null
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
    drawnTileId: drawnTile.id,
    drawnTileSource: "liveWall"
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
      phase: "discarding",
      meldCallOptions: []
    },
    notice:
      seat === 0
        ? "牌をツモりました。捨てる牌を選んでください。"
        : `${currentPlayer.name}がツモりました。`
  };
}

export function discardTile(
  state: GameState,
  tileId: string,
  riichiDeclaration = false
): GameState {
  const round = state.round;

  if (round.phase !== "discarding") {
    return state;
  }

  const seat = round.currentSeat;
  const currentPlayer = round.players[seat];

  if (
    currentPlayer.riichi &&
    currentPlayer.drawnTileId !== tileId
  ) {
    return {
      ...state,
      notice:
        "立直後はツモ切り以外の牌を捨てられません。"
    };
  }

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

  const callRestriction =
    round.meldCallDiscardRestriction;

  if (
    callRestriction?.callerSeat === seat &&
    callRestriction.forbiddenTileTypes.some(
      (tileType) =>
        isSameTileFace(
          discardedTile,
          tileType
        )
    )
  ) {
    return {
      ...state,
      notice:
        "喰い替えに当たる牌は捨てられません。別の牌を選んでください。"
    };
  }

  const remainingHand = [...currentPlayer.hand];
  remainingHand.splice(tileIndex, 1);

  const discard: Discard = {
    tile: discardedTile,
    tsumogiri:
      currentPlayer.drawnTileId === discardedTile.id,
    riichiDeclaration,
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
    ippatsu: currentPlayer.riichi
      ? false
      : currentPlayer.ippatsu,
    drawnTileId: null,
    drawnTileSource: null
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
      meldCallOptions: [],
      meldCallDiscardRestriction: null,
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
  winMethod: "tsumo" | "ron",
  chankanSource?: ChankanWinSource
) {
  const player =
    state.round.players[winnerSeat];

  return {
    round: state.round,
    winnerSeat,
    winMethod,
    doubleRiichi:
      player.doubleRiichi === true,
    rinshan:
      winMethod === "tsumo" &&
      player.drawnTileSource ===
        "rinshan",
    chankanSource,
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
  return getRonCandidates(state).some(
    (candidate) =>
      candidate.winnerSeat === 0
  );
}

function createRoundWinResult(
  resolution:
    ValidRoundWinResolution,
  round: RoundState
): RoundWinResult {
  const best = resolution.evaluation.best;
  const winner =
    round.players[resolution.winnerSeat];

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
    doraCount: best.dora.totalHan,
    doraIndicatorTiles:
      getDoraIndicators(round),
    uraDoraIndicatorTiles:
      winner.riichi ||
      winner.doubleRiichi === true
        ? getUraDoraIndicators(round)
        : [],
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
      pendingKan: null,
      riichiPool: 0,
      winResult:
        createRoundWinResult(
          resolution,
          state.round
        ),
      doubleRonResult: null,
      drawResult: null,
      abortiveDrawResult: null
    },
    notice
  };
}

function finishRoundWithRonCandidates(
  state: GameState,
  candidates:
    readonly ValidRoundWinResolution[]
): GameState {
  const result = resolveRonDeclarations({
    players: state.round.players,
    winResults: candidates.map(
      (candidate) =>
        createRoundWinResult(
          candidate,
          state.round
        )
    ),
    riichiPool: state.round.riichiPool
  });

  if (result.kind === "singleRon") {
    const winner =
      state.round.players[
        result.winResult.winnerSeat
      ];
    const loserSeat =
      result.winResult.loserSeat;
    const loser =
      loserSeat === null
        ? null
        : state.round.players[loserSeat];

    return {
      ...state,
      round: {
        ...state.round,
        players: result.playersAfter,
        phase: "roundEnd",
        pendingKan: null,
        riichiPool:
          result.riichiPoolAfter,
        winResult: result.winResult,
        doubleRonResult: null,
        drawResult: null,
        abortiveDrawResult: null
      },
      notice:
        `${winner.name}が` +
        `${loser?.name ?? "他家"}からロン和了しました。`
    };
  }

  if (result.kind === "doubleRon") {
    const [firstWin, secondWin] =
      result.doubleRonResult.winResults;
    const firstWinner =
      state.round.players[
        firstWin.winnerSeat
      ];
    const secondWinner =
      state.round.players[
        secondWin.winnerSeat
      ];
    const loser =
      state.round.players[
        result.doubleRonResult.loserSeat
      ];

    return {
      ...state,
      round: {
        ...state.round,
        players: result.playersAfter,
        phase: "roundEnd",
        pendingKan: null,
        riichiPool:
          result.riichiPoolAfter,
        winResult: null,
        doubleRonResult:
          result.doubleRonResult,
        drawResult: null,
        abortiveDrawResult: null
      },
      notice:
        `${firstWinner.name}と${secondWinner.name}が` +
        `${loser.name}からダブロンしました。`
    };
  }

  return {
    ...state,
    round: {
      ...state.round,
      players: result.playersAfter,
      phase: "roundEnd",
      pendingKan: null,
      riichiPool:
        result.riichiPoolAfter,
      winResult: null,
      doubleRonResult: null,
      drawResult: null,
      abortiveDrawResult:
        result.abortiveDrawResult
    },
    notice:
      "3人のロンが競合したため、三家和で途中流局です。"
  };
}

function finishRoundWithAbortiveDraw(
  state: GameState,
  result: RoundAbortiveDrawResult,
  notice =
    `${getAbortiveDrawLabel(
      result.reason
    )}で途中流局です。`
): GameState {
  return {
    ...state,
    round: {
      ...state.round,
      phase: "roundEnd",
      pendingKan: null,
      meldCallOptions: [],
      meldCallDiscardRestriction: null,
      winResult: null,
      doubleRonResult: null,
      drawResult: null,
      abortiveDrawResult: result
    },
    notice
  };
}

function finishRoundWithExhaustiveDraw(
  state: GameState,
  notice: string
): GameState {
  if (
    state.round.winResult ||
    state.round.doubleRonResult ||
    state.round.drawResult ||
    state.round.abortiveDrawResult
  ) {
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
      pendingKan: null,
      winResult: null,
      doubleRonResult: null,
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
      },
      abortiveDrawResult: null
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
  if (state.round.phase !== "reaction") {
    return {
      ...state,
      notice: "現在はロン和了できません。"
    };
  }

  const candidates = getRonCandidates(
    state
  );

  if (
    !candidates.some(
      (candidate) =>
        candidate.winnerSeat === 0
    )
  ) {
    return {
      ...state,
      notice: "現在はロン和了できません。"
    };
  }

  return finishRoundWithRonCandidates(
    state,
    candidates
  );
}

function getValidWinResolution(
  state: GameState,
  winnerSeat: SeatIndex,
  winMethod: "tsumo" | "ron",
  chankanSource?: ChankanWinSource
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
        winMethod,
        chankanSource
      )
    );

    return resolution.valid
      ? resolution
      : null;
  } catch {
    return null;
  }
}

function getPendingKanChankanSource(
  state: GameState
): ChankanWinSource | null {
  const pendingKan =
    state.round.pendingKan;

  if (
    state.round.phase !== "reaction" ||
    !pendingKan
  ) {
    return null;
  }

  const declarer =
    state.round.players[
      pendingKan.declarerSeat
    ];
  const winningTile = declarer?.hand.find(
    (tile) =>
      tile.id ===
      pendingKan.chankanTileId
  );

  if (!winningTile) {
    return null;
  }

  return {
    declarerSeat:
      pendingKan.declarerSeat,
    winningTile
  };
}

export function getRonCandidates(
  state: GameState
): ValidRoundWinResolution[] {
  const pendingKan =
    state.round.pendingKan;
  const chankanSource =
    getPendingKanChankanSource(state);

  if (pendingKan && !chankanSource) {
    return [];
  }

  const discarderSeat =
    chankanSource?.declarerSeat ??
    state.round.lastDiscard?.seat;

  if (discarderSeat === undefined) {
    return [];
  }

  const candidates:
    ValidRoundWinResolution[] = [];

  let candidateSeat =
    nextSeat(discarderSeat);

  for (
    let checkedCount = 0;
    checkedCount < 3;
    checkedCount += 1
  ) {
    const resolution =
      getValidWinResolution(
        state,
        candidateSeat,
        "ron",
        chankanSource ?? undefined
      );

    const closedKanChankanAllowed =
      pendingKan?.kind !== "closedKan" ||
      resolution?.evaluation.best
        .decomposition.kind ===
        "thirteenOrphans";

    if (
      resolution &&
      closedKanChankanAllowed
    ) {
      candidates.push(resolution);
    }

    candidateSeat =
      nextSeat(candidateSeat);
  }

  return candidates;
}

function finishCpuRonIfAvailable(
  state: GameState
): GameState | null {
  const candidates = getRonCandidates(
    state
  ).filter(
    (candidate) =>
      candidate.winnerSeat !== 0
  );

  return candidates.length > 0
    ? finishRoundWithRonCandidates(
        state,
        candidates
      )
    : null;
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

function finishCpuNineTerminalsIfAvailable(
  state: GameState,
  cpuSeat: SeatIndex
): GameState | null {
  if (cpuSeat === 0) {
    return null;
  }

  const result =
    getNineTerminalsDrawResult(
      state.round,
      cpuSeat
    );

  if (!result) {
    return null;
  }

  const cpuPlayer =
    state.round.players[cpuSeat];

  return finishRoundWithAbortiveDraw(
    state,
    result,
    `${cpuPlayer.name}が九種九牌を宣言したため、途中流局です。`
  );
}

function createPlayerMeldCallOptions(
  state: GameState
): MeldCallOption[] {
  const lastDiscard =
    state.round.lastDiscard;

  if (
    !lastDiscard ||
    lastDiscard.seat === 0
  ) {
    return [];
  }

  const player = state.round.players[0];

  return getMeldCallOptions({
    callerSeat: 0,
    discarderSeat: lastDiscard.seat,
    calledTile:
      lastDiscard.discard.tile,
    concealedTiles: player.hand,
    callerRiichi: player.riichi,
    liveWallTileCount:
      state.round.liveWall.length
  });
}

export function getPlayerMeldCallOptions(
  state: GameState
): MeldCallOption[] {
  if (state.round.phase !== "reaction") {
    return [];
  }

  return [
    ...(state.round.meldCallOptions ?? [])
  ];
}

export function getPlayerOpenKanCallOptions(
  state: GameState
): OpenKanCallOption[] {
  if (state.round.phase !== "reaction") {
    return [];
  }

  const lastDiscard =
    state.round.lastDiscard;

  if (
    !lastDiscard ||
    lastDiscard.seat === 0
  ) {
    return [];
  }

  const hasAvailablePon =
    (state.round.meldCallOptions ?? [])
      .some(
        (option) =>
          option.callerSeat === 0 &&
          option.kind === "pon" &&
          option.discarderSeat ===
            lastDiscard.seat &&
          option.calledTileId ===
            lastDiscard.discard.tile.id
      );

  if (!hasAvailablePon) {
    return [];
  }

  const player = state.round.players[0];

  return getOpenKanCallOptions({
    callerSeat: 0,
    discarderSeat: lastDiscard.seat,
    calledTile:
      lastDiscard.discard.tile,
    concealedTiles: player.hand,
    callerRiichi: player.riichi,
    kanCount: state.round.kanCount,
    rinshanDrawCount:
      state.round.rinshanDrawCount,
    liveWallTileCount:
      state.round.liveWall.length
  });
}

function getMeldCallSeatDistance(
  discarderSeat: SeatIndex,
  callerSeat: SeatIndex
): number {
  return (
    callerSeat - discarderSeat + 4
  ) % 4;
}

type CallPriorityOption =
  | MeldCallOption
  | OpenKanCallOption;

type CpuCallDecision =
  | {
      kind: "meld";
      option: MeldCallOption;
      decision: CpuMeldCallDecision;
    }
  | {
      kind: "openKan";
      option: OpenKanCallOption;
      decision: CpuOpenKanCallDecision;
    };

function getCallPriorityRank(
  option: CallPriorityOption
): number {
  return option.kind === "chi" ? 1 : 0;
}

function compareCallPriority(
  left: CallPriorityOption,
  right: CallPriorityOption,
  discarderSeat: SeatIndex
): number {
  const priorityDifference =
    getCallPriorityRank(left) -
    getCallPriorityRank(right);

  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  const seatDistanceDifference =
    getMeldCallSeatDistance(
      discarderSeat,
      left.callerSeat
    ) -
    getMeldCallSeatDistance(
      discarderSeat,
      right.callerSeat
    );

  if (seatDistanceDifference !== 0) {
    return seatDistanceDifference;
  }

  if (left.kind === right.kind) {
    return 0;
  }

  return left.kind === "openKan" ? -1 : 1;
}

function getCpuCallDecisions(
  state: GameState
): CpuCallDecision[] {
  const lastDiscard =
    state.round.lastDiscard;

  if (!lastDiscard) {
    return [];
  }

  return state.round.players
    .filter(
      (player) =>
        player.seat !== 0 &&
        player.seat !== lastDiscard.seat
    )
    .flatMap((player) => {
      const meldCallOptions =
        getMeldCallOptions({
          callerSeat: player.seat,
          discarderSeat: lastDiscard.seat,
          calledTile:
            lastDiscard.discard.tile,
          concealedTiles: player.hand,
          callerRiichi: player.riichi,
          liveWallTileCount:
            state.round.liveWall.length
        });
      const meldCallDecision =
        chooseCpuMeldCall({
          player,
          prevailingWind:
            state.round.prevailingWind,
          calledTile:
            lastDiscard.discard.tile,
          options: meldCallOptions
        });
      const openKanCallOptions =
        getOpenKanCallOptions({
          callerSeat: player.seat,
          discarderSeat: lastDiscard.seat,
          calledTile:
            lastDiscard.discard.tile,
          concealedTiles: player.hand,
          callerRiichi: player.riichi,
          kanCount: state.round.kanCount,
          rinshanDrawCount:
            state.round.rinshanDrawCount,
          liveWallTileCount:
            state.round.liveWall.length
        });
      const openKanCallDecision =
        chooseCpuOpenKanCall({
          player,
          prevailingWind:
            state.round.prevailingWind,
          calledTile:
            lastDiscard.discard.tile,
          options: openKanCallOptions
        });
      const decisions: CpuCallDecision[] = [];

      if (openKanCallDecision) {
        decisions.push({
          kind: "openKan",
          option:
            openKanCallDecision.option,
          decision:
            openKanCallDecision
        });
      }

      if (meldCallDecision) {
        decisions.push({
          kind: "meld",
          option: meldCallDecision.option,
          decision: meldCallDecision
        });
      }

      return decisions;
    })
    .sort((left, right) =>
      compareCallPriority(
        left.option,
        right.option,
        lastDiscard.seat
      )
    );
}

function getAvailablePlayerMeldCallOptions(
  state: GameState,
  cpuDecision:
    CpuCallDecision | null
): MeldCallOption[] {
  const options =
    createPlayerMeldCallOptions(state);
  const lastDiscard =
    state.round.lastDiscard;

  if (!cpuDecision || !lastDiscard) {
    return options;
  }

  return options.filter(
    (option) =>
      compareCallPriority(
        option,
        cpuDecision.option,
        lastDiscard.seat
      ) < 0
  );
}

function getMeldCallNotice(
  state: GameState,
  options: readonly MeldCallOption[]
): string {
  const lastDiscard =
    state.round.lastDiscard;

  if (!lastDiscard) {
    return "副露できます。";
  }

  const canPon = options.some(
    (option) => option.kind === "pon"
  );
  const canChi = options.some(
    (option) => option.kind === "chi"
  );

  const actionLabel =
    canPon && canChi
      ? "ポンまたはチー"
      : canPon
        ? "ポン"
        : "チー";

  return (
    `${state.round.players[lastDiscard.seat].name}の` +
    `${getTileLabel(lastDiscard.discard.tile)}に` +
    `${actionLabel}できます。`
  );
}

function isSameTileFace(
  left: Pick<Tile, "suit" | "rank">,
  right: Pick<Tile, "suit" | "rank">
): boolean {
  return (
    left.suit === right.suit &&
    left.rank === right.rank
  );
}

function createMeldCallDiscardRestriction(
  option: MeldCallOption,
  calledTile: Tile,
  handTiles: [Tile, Tile]
): MeldCallDiscardRestriction {
  const forbiddenTileTypes:
    MeldCallDiscardRestriction[
      "forbiddenTileTypes"
    ] = [
      {
        suit: calledTile.suit,
        rank: calledTile.rank
      }
    ];

  if (
    option.kind === "chi" &&
    calledTile.suit !== "honor"
  ) {
    const ranks = [
      calledTile.rank,
      handTiles[0].rank,
      handTiles[1].rank
    ].sort((left, right) => left - right);

    let sujiForbiddenRank: number | null =
      null;

    if (
      calledTile.rank === ranks[0] &&
      ranks[2] < 9
    ) {
      sujiForbiddenRank = ranks[2] + 1;
    } else if (
      calledTile.rank === ranks[2] &&
      ranks[0] > 1
    ) {
      sujiForbiddenRank = ranks[0] - 1;
    }

    if (sujiForbiddenRank !== null) {
      forbiddenTileTypes.push({
        suit: calledTile.suit,
        rank: sujiForbiddenRank
      });
    }
  }

  return {
    callerSeat: option.callerSeat,
    forbiddenTileTypes
  };
}

function applyCpuMeldCall(
  state: GameState,
  decision: CpuMeldCallDecision
): GameState {
  const option = decision.option;
  const lastDiscard =
    state.round.lastDiscard;
  const caller =
    state.round.players[option.callerSeat];

  if (
    !lastDiscard ||
    !caller ||
    lastDiscard.seat !==
      option.discarderSeat ||
    lastDiscard.discard.tile.id !==
      option.calledTileId
  ) {
    return state;
  }

  const firstHandTile = caller.hand.find(
    (tile) =>
      tile.id === option.handTileIds[0]
  );
  const secondHandTile = caller.hand.find(
    (tile) =>
      tile.id === option.handTileIds[1]
  );

  if (
    !firstHandTile ||
    !secondHandTile ||
    firstHandTile.id === secondHandTile.id
  ) {
    return state;
  }

  const handTileIds = new Set(
    option.handTileIds
  );
  const remainingHand = caller.hand.filter(
    (tile) => !handTileIds.has(tile.id)
  );
  const handTiles: [Tile, Tile] = [
    firstHandTile,
    secondHandTile
  ];
  const calledTile =
    lastDiscard.discard.tile;
  const calledMeld: Meld = {
    kind: option.kind,
    tiles: sortTiles([
      ...handTiles,
      calledTile
    ]),
    calledFrom: option.discarderSeat,
    calledTileId: calledTile.id
  };
  const calledDiscard: Discard = {
    ...lastDiscard.discard,
    called: true
  };

  const updatedPlayers =
    state.round.players.map(
      (player): PlayerState => {
        const withoutIppatsu = {
          ...player,
          ippatsu: false
        };

        if (
          player.seat === option.callerSeat
        ) {
          return {
            ...withoutIppatsu,
            hand: sortTiles(remainingHand),
            melds: [
              ...caller.melds,
              calledMeld
            ],
            drawnTileId: null,
            drawnTileSource: null
          };
        }

        if (
          player.seat ===
          option.discarderSeat
        ) {
          return {
            ...withoutIppatsu,
            discards: player.discards.map(
              (discard) =>
                discard.tile.id ===
                option.calledTileId
                  ? calledDiscard
                  : discard
            )
          };
        }

        return withoutIppatsu;
      }
    );

  const callState: GameState = {
    ...state,
    round: {
      ...state.round,
      players: updatedPlayers,
      currentSeat: option.callerSeat,
      phase: "discarding",
      lastDiscard: {
        seat: lastDiscard.seat,
        discard: calledDiscard
      },
      meldCallOptions: [],
      meldCallDiscardRestriction:
        createMeldCallDiscardRestriction(
          option,
          calledTile,
          handTiles
        )
    }
  };

  const discardedState = discardTile(
    callState,
    decision.discardTileId
  );

  if (
    discardedState.round.turnNumber ===
    callState.round.turnNumber
  ) {
    throw new Error(
      "CPUの副露後に打牌できませんでした。"
    );
  }

  const actionLabel =
    option.kind === "pon"
      ? "ポン"
      : "チー";
  const discardedTile =
    discardedState.round.lastDiscard
      ?.discard.tile;

  return {
    ...discardedState,
    notice:
      `${caller.name}が${actionLabel}し、` +
      `${
        discardedTile
          ? getTileLabel(discardedTile)
          : "牌"
      }を捨てました。`
  };
}

function applyCpuOpenKanCall(
  state: GameState,
  decision: CpuOpenKanCallDecision,
  random: () => number
): GameState {
  const option = decision.option;
  const lastDiscard =
    state.round.lastDiscard;
  const caller =
    state.round.players[option.callerSeat];

  if (
    !lastDiscard ||
    !caller ||
    lastDiscard.seat !==
      option.discarderSeat ||
    lastDiscard.discard.tile.id !==
      option.calledTileId
  ) {
    return state;
  }

  const execution = executeKan({
    round: {
      ...state.round,
      phase: "reaction"
    },
    option
  });
  const kanState: GameState = {
    ...state,
    round: execution.round,
    notice:
      `${caller.name}が大明槓し、` +
      `${getTileLabel(
        execution.rinshanTile
      )}を嶺上牌としてツモりました。`
  };
  const cpuTsumoState =
    finishCpuTsumoIfAvailable(
      kanState,
      option.callerSeat
    );

  if (cpuTsumoState) {
    return cpuTsumoState;
  }

  const updatedCaller =
    kanState.round.players[
      option.callerSeat
    ];
  const selectedTile = chooseCpuDiscard(
    updatedCaller,
    kanState.round,
    random
  );
  const discardedState = discardTile(
    kanState,
    selectedTile.id
  );

  if (
    discardedState.round.turnNumber ===
    kanState.round.turnNumber
  ) {
    throw new Error(
      "CPUの大明槓後に打牌できませんでした。"
    );
  }

  const discardedTile =
    discardedState.round.lastDiscard
      ?.discard.tile;

  return {
    ...discardedState,
    notice:
      `${caller.name}が大明槓し、` +
      `${getTileLabel(
        execution.rinshanTile
      )}を嶺上牌としてツモり、` +
      `${
        discardedTile
          ? getTileLabel(discardedTile)
          : "牌"
      }を捨てました。`
  };
}

export function declarePlayerMeldCall(
  state: GameState,
  optionId: string
): GameState {
  if (state.round.phase !== "reaction") {
    return {
      ...state,
      notice: "現在は副露できません。"
    };
  }

  const option =
    state.round.meldCallOptions?.find(
      (candidate) =>
        candidate.id === optionId
    );

  if (!option || option.callerSeat !== 0) {
    return {
      ...state,
      notice:
        "選択したチー・ポン候補は利用できません。"
    };
  }

  const lastDiscard =
    state.round.lastDiscard;

  if (
    !lastDiscard ||
    lastDiscard.seat !==
      option.discarderSeat ||
    lastDiscard.discard.tile.id !==
      option.calledTileId
  ) {
    return {
      ...state,
      notice:
        "副露対象の捨て牌が見つかりません。"
    };
  }

  const originalPlayer =
    state.round.players[0];
  const firstHandTile =
    originalPlayer.hand.find(
      (tile) =>
        tile.id === option.handTileIds[0]
    );
  const secondHandTile =
    originalPlayer.hand.find(
      (tile) =>
        tile.id === option.handTileIds[1]
    );

  if (
    !firstHandTile ||
    !secondHandTile ||
    firstHandTile.id === secondHandTile.id
  ) {
    return {
      ...state,
      notice:
        "副露に使用する手牌が見つかりません。"
    };
  }

  const callState = canPlayerRon(state)
    ? {
        ...state,
        round: {
          ...state.round,
          players: replacePlayer(
            state.round.players,
            {
              ...originalPlayer,
              temporaryFuriten:
                originalPlayer.riichi
                  ? originalPlayer
                      .temporaryFuriten
                  : true,
              riichiFuriten:
                originalPlayer.riichi ||
                originalPlayer
                  .riichiFuriten === true
            }
          )
        }
      }
    : state;

  const cpuRonState =
    finishCpuRonIfAvailable(callState);

  if (cpuRonState) {
    return cpuRonState;
  }

  const callPlayer =
    callState.round.players[0];
  const handTileIds = new Set(
    option.handTileIds
  );
  const remainingHand =
    callPlayer.hand.filter(
      (tile) => !handTileIds.has(tile.id)
    );

  const handTiles: [Tile, Tile] = [
    firstHandTile,
    secondHandTile
  ];
  const calledTile =
    lastDiscard.discard.tile;
  const calledMeld: Meld = {
    kind: option.kind,
    tiles: sortTiles([
      ...handTiles,
      calledTile
    ]),
    calledFrom: option.discarderSeat,
    calledTileId: calledTile.id
  };
  const calledDiscard: Discard = {
    ...lastDiscard.discard,
    called: true
  };

  const updatedPlayers =
    callState.round.players.map(
      (roundPlayer): PlayerState => {
        const withoutIppatsu = {
          ...roundPlayer,
          ippatsu: false
        };

        if (roundPlayer.seat === 0) {
          return {
            ...withoutIppatsu,
            hand: sortTiles(remainingHand),
            melds: [
              ...callPlayer.melds,
              calledMeld
            ],
            drawnTileId: null,
            drawnTileSource: null
          };
        }

        if (
          roundPlayer.seat ===
          option.discarderSeat
        ) {
          return {
            ...withoutIppatsu,
            discards:
              roundPlayer.discards.map(
                (discard) =>
                  discard.tile.id ===
                  option.calledTileId
                    ? calledDiscard
                    : discard
              )
          };
        }

        return withoutIppatsu;
      }
    );

  const actionLabel =
    option.kind === "pon"
      ? "ポン"
      : "チー";

  return {
    ...callState,
    round: {
      ...callState.round,
      players: updatedPlayers,
      currentSeat: 0,
      phase: "discarding",
      lastDiscard: {
        seat: lastDiscard.seat,
        discard: calledDiscard
      },
      meldCallOptions: [],
      meldCallDiscardRestriction:
        createMeldCallDiscardRestriction(
          option,
          calledTile,
          handTiles
        )
    },
    notice:
      `${actionLabel}しました。` +
      "捨てる牌を選んでください。"
  };
}

export function declarePlayerOpenKan(
  state: GameState,
  optionId: string
): GameState {
  const option =
    getPlayerOpenKanCallOptions(state)
      .find(
        (candidate) =>
          candidate.id === optionId
      );

  if (!option) {
    return {
      ...state,
      notice:
        "選択した大明槓候補は利用できません。"
    };
  }

  const originalPlayer =
    state.round.players[0];
  const callState = canPlayerRon(state)
    ? {
        ...state,
        round: {
          ...state.round,
          players: replacePlayer(
            state.round.players,
            {
              ...originalPlayer,
              temporaryFuriten:
                originalPlayer.riichi
                  ? originalPlayer
                      .temporaryFuriten
                  : true,
              riichiFuriten:
                originalPlayer.riichi ||
                originalPlayer
                  .riichiFuriten === true
            }
          )
        }
      }
    : state;
  const cpuRonState =
    finishCpuRonIfAvailable(callState);

  if (cpuRonState) {
    return cpuRonState;
  }

  const execution = executeKan({
    round: callState.round,
    option
  });

  return {
    ...callState,
    round: execution.round,
    notice:
      "大明槓が成立し、" +
      `${getTileLabel(
        execution.rinshanTile
      )}を嶺上牌としてツモりました。`
  };
}

function getCpuSelfKanDecision(
  state: GameState,
  cpuSeat: SeatIndex
): CpuSelfKanDecision | null {
  if (
    cpuSeat === 0 ||
    state.round.currentSeat !== cpuSeat ||
    state.round.phase !== "discarding"
  ) {
    return null;
  }

  const cpuPlayer =
    state.round.players[cpuSeat];

  if (cpuPlayer.drawnTileId === null) {
    return null;
  }

  const options = getSelfKanOptions({
    concealedTiles: cpuPlayer.hand,
    melds: cpuPlayer.melds,
    riichi: cpuPlayer.riichi,
    drawnTileId: cpuPlayer.drawnTileId,
    kanCount: state.round.kanCount,
    rinshanDrawCount:
      state.round.rinshanDrawCount,
    liveWallTileCount:
      state.round.liveWall.length
  });

  return chooseCpuSelfKan({
    player: cpuPlayer,
    options
  });
}

function declareCpuSelfKan(
  state: GameState,
  decision: CpuSelfKanDecision
): GameState {
  const cpuSeat = state.round.currentSeat;
  const cpuPlayer =
    state.round.players[cpuSeat];
  const option = decision.option;

  if (
    cpuSeat === 0 ||
    state.round.phase !== "discarding" ||
    cpuPlayer.drawnTileId === null
  ) {
    return state;
  }

  const pendingKan: PendingKan =
    option.kind === "closedKan"
      ? {
          ...option,
          declarerSeat: cpuSeat,
          chankanTileId:
            option.tileIds.includes(
              cpuPlayer.drawnTileId
            )
              ? cpuPlayer.drawnTileId
              : option.tileIds[0]
        }
      : {
          ...option,
          declarerSeat: cpuSeat,
          chankanTileId: option.tileId
        };
  const kanLabel =
    option.kind === "closedKan"
      ? "暗槓"
      : "加槓";

  return {
    ...state,
    round: {
      ...state.round,
      phase: "reaction",
      pendingKan,
      meldCallOptions: [],
      meldCallDiscardRestriction: null
    },
    notice:
      `${cpuPlayer.name}が${kanLabel}を宣言しました。` +
      "槍槓を確認します。"
  };
}

function playCpuDiscardingTurn(
  state: GameState,
  cpuSeat: SeatIndex,
  random: () => number
): GameState {
  if (
    cpuSeat === 0 ||
    state.round.currentSeat !== cpuSeat ||
    state.round.phase !== "discarding"
  ) {
    return state;
  }

  const cpuTsumoState =
    finishCpuTsumoIfAvailable(
      state,
      cpuSeat
    );

  if (cpuTsumoState) {
    return cpuTsumoState;
  }

  const cpuNineTerminalsState =
    finishCpuNineTerminalsIfAvailable(
      state,
      cpuSeat
    );

  if (cpuNineTerminalsState) {
    return cpuNineTerminalsState;
  }

  const selfKanDecision =
    getCpuSelfKanDecision(
      state,
      cpuSeat
    );

  if (selfKanDecision) {
    const declaredState =
      declareCpuSelfKan(
        state,
        selfKanDecision
      );

    if (canPlayerRon(declaredState)) {
      return declaredState;
    }

    return completeCpuPendingSelfKan(
      declaredState,
      random
    );
  }

  const cpuPlayer =
    state.round.players[cpuSeat];
  const riichiDecision =
    getCpuRiichiDecision(
      state,
      cpuSeat
    );

  if (riichiDecision) {
    return playCpuRiichiDeclaration(
      state,
      cpuSeat,
      riichiDecision
    );
  }

  const selectedTile = cpuPlayer.riichi
    ? cpuPlayer.hand.find(
        (tile) =>
          tile.id ===
          cpuPlayer.drawnTileId
      ) ??
      chooseCpuDiscard(
        cpuPlayer,
        state.round,
        random
      )
    : chooseCpuDiscard(
        cpuPlayer,
        state.round,
        random
      );

  return discardTile(
    state,
    selectedTile.id
  );
}

function completeCpuPendingSelfKan(
  state: GameState,
  random: () => number
): GameState {
  const pendingKan =
    state.round.pendingKan;

  if (
    state.round.phase !== "reaction" ||
    !pendingKan ||
    pendingKan.declarerSeat === 0
  ) {
    return state;
  }

  const cpuRonState =
    finishCpuRonIfAvailable(state);

  if (cpuRonState) {
    return cpuRonState;
  }

  const cpuPlayer =
    state.round.players[
      pendingKan.declarerSeat
    ];
  const kanLabel =
    pendingKan.kind === "closedKan"
      ? "暗槓"
      : "加槓";
  const execution = executeKan({
    round: {
      ...state.round,
      phase: "discarding"
    },
    declarerSeat:
      pendingKan.declarerSeat,
    option: pendingKan
  });
  const kanState: GameState = {
    ...state,
    round: execution.round,
    notice:
      `${cpuPlayer.name}が${kanLabel}し、` +
      `${getTileLabel(
        execution.rinshanTile
      )}を嶺上牌としてツモりました。`
  };
  const continuedState =
    playCpuDiscardingTurn(
      kanState,
      pendingKan.declarerSeat,
      random
    );
  const discardedTile =
    continuedState.round.lastDiscard;
  const directlyDiscarded =
    continuedState.round.kanCount ===
      execution.round.kanCount &&
    discardedTile?.seat ===
      pendingKan.declarerSeat &&
    continuedState.round.turnNumber ===
      execution.round.turnNumber + 1;

  if (!directlyDiscarded) {
    return continuedState;
  }

  return {
    ...continuedState,
    notice:
      `${cpuPlayer.name}が${kanLabel}し、` +
      `${getTileLabel(
        execution.rinshanTile
      )}を嶺上牌としてツモり、` +
      `${getTileLabel(
        discardedTile.discard.tile
      )}を捨てました。`
  };
}

function getVisibleTilesForCpuRiichi(
  state: GameState
): Tile[] {
  return state.round.players.flatMap(
    (player) => [
      ...player.discards.map(
        (discard) => discard.tile
      ),
      ...player.melds.flatMap(
        (meld) => meld.tiles
      )
    ]
  );
}

function getCpuRiichiDecision(
  state: GameState,
  cpuSeat: SeatIndex
): CpuRiichiDecision | null {
  if (
    cpuSeat === 0 ||
    state.round.currentSeat !== cpuSeat ||
    state.round.phase !== "discarding"
  ) {
    return null;
  }

  const cpuPlayer =
    state.round.players[cpuSeat];
  const candidateTileIds =
    getRiichiDiscardTileIds({
      concealedTiles: cpuPlayer.hand,
      melds: cpuPlayer.melds,
      score: cpuPlayer.score,
      liveWallTileCount:
        state.round.liveWall.length,
      alreadyRiichi: cpuPlayer.riichi
    });

  return chooseCpuRiichi({
    player: cpuPlayer,
    riichiDiscardTileIds:
      candidateTileIds,
    doraIndicators:
      getDoraIndicators(state.round),
    visibleTiles:
      getVisibleTilesForCpuRiichi(
        state
      )
  });
}

function isCpuDoubleRiichiDeclaration(
  state: GameState,
  cpuSeat: SeatIndex,
  declarationAlreadyDiscarded = false
): boolean {
  const cpuPlayer =
    state.round.players[cpuSeat];
  const expectedDiscardCount =
    declarationAlreadyDiscarded ? 1 : 0;
  const declarationDiscardIsValid =
    !declarationAlreadyDiscarded ||
    (
      state.round.lastDiscard?.seat ===
        cpuSeat &&
      state.round.lastDiscard.discard
        .riichiDeclaration &&
      cpuPlayer.discards[0]
        ?.riichiDeclaration === true
    );

  return (
    cpuPlayer.discards.length ===
      expectedDiscardCount &&
    declarationDiscardIsValid &&
    state.round.kanCount === 0 &&
    state.round.players.every(
      (player) =>
        player.melds.length === 0
    )
  );
}

function establishCpuRiichi(
  state: GameState,
  cpuSeat: SeatIndex,
  doubleRiichi: boolean
): GameState {
  const cpuPlayer =
    state.round.players[cpuSeat];

  if (
    cpuSeat === 0 ||
    cpuPlayer.riichi ||
    cpuPlayer.score < RIICHI_DEPOSIT
  ) {
    return state;
  }

  const riichiPlayer: PlayerState = {
    ...cpuPlayer,
    score:
      cpuPlayer.score - RIICHI_DEPOSIT,
    riichi: true,
    doubleRiichi,
    ippatsu: true
  };

  return {
    ...state,
    round: {
      ...state.round,
      players: replacePlayer(
        state.round.players,
        riichiPlayer
      ),
      riichiPool:
        state.round.riichiPool +
        RIICHI_DEPOSIT
    },
    notice:
      `${cpuPlayer.name}の` +
      `${
        doubleRiichi
          ? "ダブル立直"
          : "立直"
      }が成立しました。`
  };
}

function playCpuRiichiDeclaration(
  state: GameState,
  cpuSeat: SeatIndex,
  decision: CpuRiichiDecision
): GameState {
  const doubleRiichi =
    isCpuDoubleRiichiDeclaration(
      state,
      cpuSeat
    );
  const discardedState = discardTile(
    state,
    decision.discardTileId,
    true
  );

  if (
    discardedState.round.turnNumber ===
    state.round.turnNumber
  ) {
    return discardedState;
  }

  if (canPlayerRon(discardedState)) {
    return discardedState;
  }

  const cpuRonState =
    finishCpuRonIfAvailable(
      discardedState
    );

  if (cpuRonState) {
    return cpuRonState;
  }

  return establishCpuRiichi(
    discardedState,
    cpuSeat,
    doubleRiichi
  );
}

function getPendingCpuRiichiSeat(
  state: GameState
): SeatIndex | null {
  const lastDiscard =
    state.round.lastDiscard;

  if (
    state.round.phase !== "reaction" ||
    !lastDiscard ||
    lastDiscard.seat === 0 ||
    !lastDiscard.discard
      .riichiDeclaration ||
    state.round.players[lastDiscard.seat]
      .riichi
  ) {
    return null;
  }

  return lastDiscard.seat;
}

function completeCpuTurns(
  state: GameState,
  random: () => number,
  skipInitialPlayerMeldCallReaction = false
): GameState {
  let nextState = state;
  let processedActionCount = 0;
  let skipPlayerMeldCallReaction =
    skipInitialPlayerMeldCallReaction;

  while (processedActionCount < 24) {
    const cpuDecisions =
      getCpuCallDecisions(nextState);
    const cpuDecision =
      cpuDecisions[0] ?? null;
    const playerMeldCallOptions =
      skipPlayerMeldCallReaction
        ? []
        : getAvailablePlayerMeldCallOptions(
            nextState,
            cpuDecision
          );

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
          phase: "reaction",
          meldCallOptions:
            playerMeldCallOptions
        },
        notice:
          `${nextState.round.players[lastDiscard.seat].name}の` +
          `${getTileLabel(lastDiscard.discard.tile)}にロンできます。`
      };
    }

    const cpuRonState =
      finishCpuRonIfAvailable(nextState);

    if (cpuRonState) {
      return cpuRonState;
    }

    if (playerMeldCallOptions.length > 0) {
      return {
        ...nextState,
        round: {
          ...nextState.round,
          phase: "reaction",
          meldCallOptions:
            playerMeldCallOptions
        },
        notice: getMeldCallNotice(
          nextState,
          playerMeldCallOptions
        )
      };
    }

    if (cpuDecision) {
      nextState =
        cpuDecision.kind === "openKan"
          ? applyCpuOpenKanCall(
              nextState,
              cpuDecision.decision,
              random
            )
          : applyCpuMeldCall(
              nextState,
              cpuDecision.decision
            );

      if (
        nextState.round.phase ===
        "roundEnd" &&
        (
          nextState.round.winResult ||
          nextState.round.doubleRonResult
        )
      ) {
        return nextState;
      }

      processedActionCount += 1;
      skipPlayerMeldCallReaction = false;
      continue;
    }

    if (
      nextState.round.phase !== "drawing"
    ) {
      break;
    }

    if (nextState.round.currentSeat === 0) {
      nextState = drawTile(nextState, 0);
      break;
    }

    const cpuSeat = nextState.round.currentSeat;

    nextState = drawTile(
      nextState,
      cpuSeat
    );

    if (nextState.round.phase !== "discarding") {
      break;
    }

    nextState = playCpuDiscardingTurn(
      nextState,
      cpuSeat,
      random
    );

    if (nextState.round.pendingKan) {
      return nextState;
    }

    if (
      nextState.round.phase ===
      "roundEnd" &&
      (
        nextState.round.winResult ||
        nextState.round.doubleRonResult ||
        nextState.round.abortiveDrawResult
      )
    ) {
      return nextState;
    }

    processedActionCount += 1;
    skipPlayerMeldCallReaction = false;
  }

  if (
    nextState.round.phase === "roundEnd" &&
    !nextState.round.winResult &&
    !nextState.round.doubleRonResult &&
    !nextState.round.drawResult &&
    !nextState.round.abortiveDrawResult
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
  const skippedRon = canPlayerRon(state);

  const skippedPlayer: PlayerState = {
    ...player,
    temporaryFuriten:
      skippedRon && !player.riichi
        ? true
        : player.temporaryFuriten,
    riichiFuriten:
      (skippedRon && player.riichi) ||
      player.riichiFuriten === true
  };

  const skippedState: GameState = {
    ...state,
    round: {
      ...state.round,
      players: replacePlayer(
        state.round.players,
        skippedPlayer
      ),
      meldCallOptions: []
    }
  };

  const skippedNotice = skippedRon
    ? "ロンを見送りました。"
    : "副露を見送りました。";

    if (
    skippedState.round.pendingKan &&
    skippedState.round.pendingKan
      .declarerSeat !== 0
  ) {
    const resumedState =
      completeCpuPendingSelfKan(
        skippedState,
        random
      );

    if (
      resumedState.round.phase ===
        "roundEnd" &&
      (
        resumedState.round.winResult ||
        resumedState.round
          .doubleRonResult ||
        resumedState.round.drawResult ||
        resumedState.round
          .abortiveDrawResult
      )
    ) {
      return resumedState;
    }

    return completeCpuTurns(
      resumedState,
      random
    );
  }

    const pendingCpuRiichiSeat =
    getPendingCpuRiichiSeat(
      skippedState
    );

  if (pendingCpuRiichiSeat !== null) {
    const cpuRonState =
      finishCpuRonIfAvailable(
        skippedState
      );

    if (cpuRonState) {
      return cpuRonState;
    }

    const doubleRiichi =
      isCpuDoubleRiichiDeclaration(
        skippedState,
        pendingCpuRiichiSeat,
        true
      );
    const establishedState =
      establishCpuRiichi(
        skippedState,
        pendingCpuRiichiSeat,
        doubleRiichi
      );
    const resumedState: GameState = {
      ...establishedState,
      round: {
        ...establishedState.round,
        phase: "drawing"
      }
    };

    return completeCpuTurns(
      resumedState,
      random,
      true
    );
  }
  
  if (
    skippedState.round.liveWall.length === 0
  ) {
    const cpuRonState =
      finishCpuRonIfAvailable(
        skippedState
      );

    if (cpuRonState) {
      return cpuRonState;
    }

    return finishRoundWithExhaustiveDraw(
      skippedState,
      `${skippedNotice}通常山が尽きたため、荒牌平局です。`
    );
  }

  const resumedState: GameState = {
    ...skippedState,
    round: {
      ...skippedState.round,
      phase: "drawing"
    },
    notice: skippedNotice
  };

  return completeCpuTurns(
    resumedState,
    random,
    true
  );
}

export function canPlayerDeclareNineTerminals(
  state: GameState
): boolean {
  return (
    getNineTerminalsDrawResult(
      state.round,
      0
    ) !== null
  );
}

export function declarePlayerNineTerminals(
  state: GameState
): GameState {
  const result =
    getNineTerminalsDrawResult(
      state.round,
      0
    );

  if (!result) {
    return {
      ...state,
      notice:
        "現在は九種九牌を宣言できません。"
    };
  }

  return finishRoundWithAbortiveDraw(
    state,
    result,
    "九種九牌を宣言したため、途中流局です。"
  );
}

export function getPlayerRiichiDiscardTileIds(
  state: GameState
): string[] {
  if (
    state.round.currentSeat !== 0 ||
    state.round.phase !== "discarding"
  ) {
    return [];
  }

  const player = state.round.players[0];

  return getRiichiDiscardTileIds({
    concealedTiles: player.hand,
    melds: player.melds,
    score: player.score,
    liveWallTileCount:
      state.round.liveWall.length,
    alreadyRiichi: player.riichi
  });
}

export function getPlayerSelfKanOptions(
  state: GameState
): SelfKanOption[] {
  if (
    state.round.currentSeat !== 0 ||
    state.round.phase !== "discarding"
  ) {
    return [];
  }

  const player = state.round.players[0];

  if (player.drawnTileId === null) {
    return [];
  }

  return getSelfKanOptions({
    concealedTiles: player.hand,
    melds: player.melds,
    riichi: player.riichi,
    drawnTileId: player.drawnTileId,
    kanCount: state.round.kanCount,
    rinshanDrawCount:
      state.round.rinshanDrawCount,
    liveWallTileCount:
      state.round.liveWall.length
  });
}

export function declarePlayerSelfKan(
  state: GameState,
  optionId: string
): GameState {
  const option =
    getPlayerSelfKanOptions(state).find(
      (candidate) =>
        candidate.id === optionId
    );

  if (!option) {
    return {
      ...state,
      notice:
        "選択した槓候補は利用できません。"
    };
  }

  const player = state.round.players[0];

  const pendingKan: PendingKan =
    option.kind === "closedKan"
      ? {
          ...option,
          declarerSeat: 0,
          chankanTileId:
            player.drawnTileId !== null &&
            option.tileIds.includes(
              player.drawnTileId
            )
              ? player.drawnTileId
              : option.tileIds[0]
        }
      : {
          ...option,
          declarerSeat: 0,
          chankanTileId: option.tileId
        };

  return {
    ...state,
    round: {
      ...state.round,
      phase: "reaction",
      pendingKan,
      meldCallOptions: [],
      meldCallDiscardRestriction: null
    },
    notice:
      option.kind === "closedKan"
        ? "暗槓を宣言しました。槍槓を確認します。"
        : "加槓を宣言しました。槍槓を確認します。"
  };
}

export function completePlayerSelfKan(
  state: GameState
): GameState {
  const pendingKan =
    state.round.pendingKan;

  if (
    state.round.phase !== "reaction" ||
    !pendingKan ||
    pendingKan.declarerSeat !== 0
  ) {
    return {
      ...state,
      notice:
        "成立待ちの槓はありません。"
    };
  }

  const execution = executeKan({
    round: {
      ...state.round,
      phase: "discarding"
    },
    declarerSeat: 0,
    option: pendingKan
  });
  const kanLabel =
    pendingKan.kind === "closedKan"
      ? "暗槓"
      : "加槓";

  return {
    ...state,
    round: execution.round,
    notice:
      `${kanLabel}が成立し、` +
      `${getTileLabel(
        execution.rinshanTile
      )}を嶺上牌としてツモりました。`
  };
}

export function playPlayerSelfKan(
  state: GameState,
  optionId: string
): GameState {
  const declaredState =
    declarePlayerSelfKan(
      state,
      optionId
    );

  if (!declaredState.round.pendingKan) {
    return declaredState;
  }

  const cpuChankanState =
    finishCpuRonIfAvailable(
      declaredState
    );

  return cpuChankanState ??
    completePlayerSelfKan(
      declaredState
    );
}

export function canPlayerRiichi(
  state: GameState
): boolean {
  return (
    getPlayerRiichiDiscardTileIds(state)
      .length > 0
  );
}

function isDoubleRiichiDeclaration(
  state: GameState
): boolean {
  const player = state.round.players[0];

  return (
    player.discards.length === 0 &&
    state.round.kanCount === 0 &&
    state.round.players.every(
      (roundPlayer) =>
        roundPlayer.melds.length === 0
    )
  );
}

function establishPlayerRiichi(
  state: GameState,
  doubleRiichi: boolean
): GameState {
  const player = state.round.players[0];

  const riichiPlayer: PlayerState = {
    ...player,
    score: player.score - RIICHI_DEPOSIT,
    riichi: true,
    doubleRiichi,
    ippatsu: true
  };

  return {
    ...state,
    round: {
      ...state.round,
      players: replacePlayer(
        state.round.players,
        riichiPlayer
      ),
      riichiPool:
        state.round.riichiPool +
        RIICHI_DEPOSIT
    },
    notice: doubleRiichi
      ? "ダブル立直が成立しました。"
      : "立直が成立しました。"
  };
}

export function declarePlayerRiichi(
  state: GameState,
  tileId: string,
  random: () => number = Math.random
): GameState {
  const candidateTileIds =
    getPlayerRiichiDiscardTileIds(state);

  if (!candidateTileIds.includes(tileId)) {
    return {
      ...state,
      notice:
        "選択した牌では立直を宣言できません。"
    };
  }

  const doubleRiichi =
    isDoubleRiichiDeclaration(state);

  const discardedState = discardTile(
    state,
    tileId,
    true
  );

  if (
    discardedState.round.turnNumber ===
    state.round.turnNumber
  ) {
    return discardedState;
  }

  const cpuRonState =
    finishCpuRonIfAvailable(
      discardedState
    );

  if (cpuRonState) {
    return cpuRonState;
  }

  const establishedState =
    establishPlayerRiichi(
      discardedState,
      doubleRiichi
    );

  const progressedState =
    completeCpuTurns(
      establishedState,
      random
    );

  if (
    progressedState.round.phase ===
      "discarding" &&
    progressedState.round.currentSeat === 0
  ) {
    return {
      ...progressedState,
      notice:
        (
          doubleRiichi
            ? "ダブル立直が成立しました。"
            : "立直が成立しました。"
        ) +
        progressedState.notice
    };
  }

  return progressedState;
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

  if (
    discardedState.round.turnNumber ===
    state.round.turnNumber
  ) {
    return discardedState;
  }

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
      player.seat === dealerSeat,
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    temporaryFuriten: false,
    riichiFuriten: false,
    drawnTileId: null,
    drawnTileSource: null
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

    if (round.doubleRonResult) {
    return round.doubleRonResult
      .winResults.some(
        (winResult) =>
          winResult.winnerSeat ===
          dealerSeat
      );
  }

  if (round.abortiveDrawResult) {
    return true;
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
      pendingKan: null,
      winResult: null,
      doubleRonResult: null,
      drawResult: null,
      abortiveDrawResult: null
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

  const isDraw =
    state.round.winResult == null &&
    state.round.doubleRonResult == null;

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
    continues || isDraw
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
      meldCallOptions: [],
      pendingKan: null,
      turnNumber: 0,
      kanCount: 0,
      doraIndicatorCount: 1,
      rinshanDrawCount: 0,
      winResult: null,
      doubleRonResult: null,
      drawResult: null,
      abortiveDrawResult: null
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
