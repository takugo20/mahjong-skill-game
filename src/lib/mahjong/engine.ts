import {
  getAkuukanCallDeposit,
  isAkuukanCallAllowed,
  isAkuukanRonAllowed
} from "../akuukan/callLegality";
import type {
  AkuukanCallKind,
  AkuukanCallOwner
} from "../akuukan/callLegality";
import {
  applyAkuukanE12AfterCall,
  applyAkuukanE15AfterCall
} from "../akuukan/callEffects";
import {
  reserveAkuukanE16DoraTriplet,
  reserveAkuukanE26TenpaiHand
} from "../akuukan/dealComposition";
import {
  getAkuukanPlayerSkill1_5DoraIndicatorCount
} from "../akuukan/doraIndicatorAddition";
import {
  reserveAkuukanE29ShantenHands
} from "../akuukan/shantenDealComposition";
import {
  assignAkuukanE19DiscardRestrictions,
  getAkuukanE19ForbiddenTileIds,
  isAkuukanE19DiscardAllowed,
  synchronizeAkuukanE19PlayerHandRestrictions
} from "../akuukan/discardLegality";
import {
  activateAkuukanE2DrawRestriction,
  assignAkuukanE5TargetSuit,
  clearAkuukanE2DrawRestriction,
  getAkuukanE5TargetSuit,
  getAkuukanE11LiveWallTileIndex,
  getAkuukanLiveWallDrawCandidateIndexes
} from "../akuukan/drawTileSelection";
import {
  getAkuukanPlayerSkill1_4LiveWallDrawIndex
} from "../akuukan/drawWeight";
import {
  areAkuukanDoraIndicatorsVisible,
  areAkuukanHandTilesVisible
} from "../akuukan/informationVisibility";
import type {
  AkuukanInformationViewer
} from "../akuukan/informationVisibility";
import {
  getAkuukanE28RiverDrawCandidates,
  selectRandomAkuukanE28FaceDownCandidate,
  takeAkuukanE28RiverTile
} from "../akuukan/riverDraw";
import {
  selectAkuukanE28RiverDrawCandidate
} from "../akuukan/riverDrawAi";
import {
  isAkuukanE27WinInvalidated
} from "../akuukan/handValueAdjustments";
import {
  AKUUKAN_DRAW_MP_RECOVERY,
  AKUUKAN_INITIAL_MP,
  AKUUKAN_MAX_MP,
  AKUUKAN_ROUND_MP_RECOVERY,
  recoverAkuukanMp
} from "../akuukan/mp";
import {
  applyAkuukanE20PaymentMultiplier,
  isAkuukanE20PaymentMultiplierEnabled
} from "../akuukan/paymentAdjustments";
import {
  applyAkuukanPlayerSkill1_6AtDeal
} from "../akuukan/nextRoundRedTile";
import {
  applyAkuukanRedTileTransformation
} from "../akuukan/redTileTransformation";
import {
  isAkuukanNotenRiichiAllowed,
  isAkuukanOpenRiichiAllowed,
  isAkuukanRiichiProhibited
} from "../akuukan/riichiLegality";
import {
  activateAkuukanEffect,
  beginAkuukanRound,
  beginAkuukanTurn,
  createInitialAkuukanGameState,
  endAkuukanEffect,
  hasAkuukanEffectInstance
} from "../akuukan/state";
import {
  getAkuukanNormalTurnActionCount,
  shouldStartAkuukanAdditionalNormalAction
} from "../akuukan/turnCountChange";
import {
  createAkuukanWinningCandidateScoreAdjuster,
  createAkuukanWinningCandidateYakuEvaluator,
  shouldAkuukanWinningCandidateBeTreatedAsClosed
} from "../akuukan/winningEvaluationEngineAdapter";
import {
  clearAkuukanE6WinningYakuAfterNagashiMangan,
  recordAkuukanE6WinningYaku
} from "../akuukan/winningEvaluationEnemyAbilityHistory";
import type {
  AkuukanGameState,
  AkuukanMatchSetup
} from "../akuukan/types";
import type {
  AkuukanRiichiOwner
} from "../akuukan/riichiLegality";
import type {
  AkuukanWinningCandidateOwner
} from "../akuukan/winningEvaluationEngineAdapter";
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
  getFourKansDrawResult,
  getFourRiichiDrawResult,
  getFourWindsDrawResult,
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
  chooseCpuPostRiichiDiscard,
  chooseCpuRiichi
} from "./cpuRiichi";
import type {
  CpuRiichiDecision
} from "./cpuRiichi";
import {
  resolveExhaustiveDrawSettlement
} from "./drawSettlement";
import {
  resolveNagashiManganSettlement
} from "./nagashiMangan";
import type {
  NagashiManganSettlementResult
} from "./nagashiMangan";
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
  getRiichiClosedKanAllowedTileTypes
} from "./riichiKan";
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

const FIRST_DRAW_TURN_BY_WIND:
  Record<Wind, number> = {
    east: 0,
    south: 1,
    west: 2,
    north: 3
  };

const AKUUKAN_E25_FIRST_ACTION_EFFECT_ID =
  "enemy-ability:E-25:first-normal-action";
const AKUUKAN_E25_SECOND_ACTION_EFFECT_ID =
  "enemy-ability:E-25:second-normal-action";

type AkuukanE25NormalActionStage =
  | "first"
  | "second"
  | null;

export type CpuProgressPhase =
  | "draw"
  | "action";

export interface CpuProgressStep {
  phase: CpuProgressPhase;
  seat: SeatIndex;
  state: GameState;
}

export interface PlayerDiscardProgression {
  stateAfterDiscard: GameState;
  cpuSteps: CpuProgressStep[];
  finalState: GameState;
}

export interface PlayerReactionSkipProgression {
  stateAfterReaction: GameState;
  cpuSteps: CpuProgressStep[];
  finalState: GameState;
}

export interface PlayerRiichiProgression {
  stateAfterDeclaration: GameState;
  cpuSteps: CpuProgressStep[];
  finalState: GameState;
}

export interface NextRoundProgression {
  stateAfterStart: GameState;
  cpuSteps: CpuProgressStep[];
  finalState: GameState;
}

type CpuProgressObserver = (
  step: CpuProgressStep
) => void;

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

function getAkuukanInformationViewer(
  seat: SeatIndex
): AkuukanInformationViewer {
  if (seat === 0) {
    return "player";
  }

  return seat === 2
    ? "selectedEnemy"
    : "normalOpponent";
}

function getDoraIndicatorsForCpu(
  state: GameState,
  cpuSeat: SeatIndex
): Tile[] {
  const doraIndicators =
    getDoraIndicators(state.round);

  if (!state.akuukan) {
    return doraIndicators;
  }

  return areAkuukanDoraIndicatorsVisible({
    akuukan: state.akuukan,
    viewer:
      getAkuukanInformationViewer(cpuSeat)
  })
    ? doraIndicators
    : [];
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

interface AkuukanDealComposition {
  readonly liveWall: Tile[];
  readonly reservedTilesBySeat:
    readonly Tile[][];
}

function prepareAkuukanDealComposition(
  akuukan: AkuukanGameState | undefined,
  liveWall: Tile[],
  deadWall: readonly Tile[]
): AkuukanDealComposition {
  if (!akuukan) {
    return {
      liveWall,
      reservedTilesBySeat: [
        [],
        [],
        [],
        []
      ]
    };
  }

  const initialDoraIndicator =
    deadWall[DORA_INDICATOR_INDEXES[0]];

  if (!initialDoraIndicator) {
    throw new Error(
      "初期ドラ表示牌がありません。"
    );
  }

  const doraTripletReservation =
    reserveAkuukanE16DoraTriplet({
      akuukan,
      doraIndicator:
        initialDoraIndicator,
      availableTiles: liveWall
    });
  const tenpaiHandReservation =
    reserveAkuukanE26TenpaiHand({
      akuukan,
      availableTiles:
        doraTripletReservation
          .remainingTiles
    });
  const shantenHandsReservation =
    reserveAkuukanE29ShantenHands({
      akuukan,
      availableTiles:
        tenpaiHandReservation
          .remainingTiles
    });
  const selectedEnemyReservedTiles = [
    ...doraTripletReservation
      .reservedTiles,
    ...tenpaiHandReservation
      .reservedTiles
  ];

  return {
    liveWall:
      shantenHandsReservation
        .remainingTiles,
    reservedTilesBySeat:
      shantenHandsReservation
        .constraintsSatisfied
        ? shantenHandsReservation
            .reservedTilesBySeat
        : [
            [],
            [],
            selectedEnemyReservedTiles,
            []
          ]
  };
}

function takeAkuukanLiveWallTile(
  akuukan: AkuukanGameState | undefined,
  liveWall: Tile[],
  recipientIsSelectedEnemy: boolean
): Tile | undefined {
  const tileIndex = akuukan
    ? getAkuukanE11LiveWallTileIndex({
        akuukan,
        recipientIsSelectedEnemy,
        liveWall
      })
    : liveWall.length > 0
      ? 0
      : null;

  if (tileIndex === null) {
    return undefined;
  }

  const [tile] = liveWall.splice(
    tileIndex,
    1
  );

  return tile;
}

function assignAkuukanDealCompletedEffects(
  akuukan: AkuukanGameState | undefined,
  players: readonly PlayerState[],
  random: () => number
): AkuukanGameState | undefined {
  if (!akuukan) {
    return undefined;
  }

  return assignAkuukanE19DiscardRestrictions({
    akuukan,
    players: players.map((player) => ({
      playerId: player.id,
      isSelectedEnemy: player.seat === 2,
      concealedTiles: player.hand
    })),
    random
  });
}

function applyAkuukanPlayerDealCompletedEffects(
  akuukan: AkuukanGameState | undefined,
  players: PlayerState[],
  random: () => number
): AkuukanGameState | undefined {
  if (!akuukan) {
    return undefined;
  }

  const player = players.find(
    (candidate) => candidate.seat === 0
  );

  if (!player) {
    return akuukan;
  }

  const transformation =
    applyAkuukanRedTileTransformation({
      akuukan,
      skillId: "1-1",
      tiles: player.hand,
      random
    });

  if (transformation.transformedTileId) {
    player.hand = sortTiles(
      transformation.tiles
    );
  }

  const nextRoundTransformation =
    applyAkuukanPlayerSkill1_6AtDeal({
      akuukan,
      tiles: player.hand,
      random
    });

  if (
    nextRoundTransformation.transformedTileId
  ) {
    player.hand = sortTiles(
      nextRoundTransformation.tiles
    );
  }

  return nextRoundTransformation.akuukan;
}

export function createInitialGameState(
  random: () => number = Math.random,
  akuukanSetup?: AkuukanMatchSetup
): GameState {
  const initialAkuukan = akuukanSetup
    ? createInitialAkuukanGameState(
        akuukanSetup
      )
    : undefined;
  const akuukan = initialAkuukan
    ? assignAkuukanE5TargetSuit({
        akuukan: initialAkuukan,
        random
      })
    : undefined;
  const shuffledTiles = shuffleTiles(
    createFullTileSet(),
    random
  );

  const deadWall = shuffledTiles.slice(-14);
  const doraIndicatorCount = akuukan
    ? getAkuukanPlayerSkill1_5DoraIndicatorCount({
        akuukan,
        currentDoraIndicatorCount: 1,
        random
      })
    : 1;
  const availableLiveWall =
    shuffledTiles.slice(0, -14);
  const dealComposition =
    prepareAkuukanDealComposition(
      akuukan,
      availableLiveWall,
      deadWall
    );
  const liveWall =
    dealComposition.liveWall;

  const players: PlayerState[] = [
    createPlayer(0, "あなた"),
    createPlayer(1, "CPU・右"),
    createPlayer(2, "能力者CPU"),
    createPlayer(3, "CPU・左")
  ];

  for (let drawIndex = 0; drawIndex < 13; drawIndex += 1) {
    for (let seat = 0; seat < 4; seat += 1) {
      const reservedTile =
              dealComposition
                .reservedTilesBySeat[seat]?.[
                  drawIndex
                ];
      const tile =
        reservedTile ??
        takeAkuukanLiveWallTile(
          akuukan,
          liveWall,
          seat === 2
        );

      if (!tile) {
        throw new Error("配牌中に通常山が不足しました。");
      }

      players[seat].hand.push(tile);
    }
  }

  const akuukanAfterPlayerDeal =
    applyAkuukanPlayerDealCompletedEffects(
      akuukan,
      players,
      random
    );
  const akuukanAfterDeal =
    assignAkuukanDealCompletedEffects(
      akuukanAfterPlayerDeal,
      players,
      random
    );

  const dealerDraw =
    takeAkuukanLiveWallTile(
      akuukanAfterDeal,
      liveWall,
      false
    );

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
      doraIndicatorCount,
      rinshanDrawCount: 0,
      winResult: null,
      doubleRonResult: null,
      drawResult: null,
      nagashiManganResult: null,
      abortiveDrawResult: null
    },
    initialDealerSeat: 0,
    matchResult: null,
    playerMp: AKUUKAN_INITIAL_MP,
    maxMp: AKUUKAN_MAX_MP,
    ...(akuukanAfterDeal
      ? { akuukan: akuukanAfterDeal }
      : {}),
    notice: "東1局を開始しました。捨てる牌を選んでください。"
  };
}

function beginAkuukanTurnState(
  state: GameState
): GameState {
  if (!state.akuukan) {
    return state;
  }

  const akuukan = beginAkuukanTurn(
    state.akuukan
  );

  return akuukan === state.akuukan
    ? state
    : {
        ...state,
        akuukan
      };
}

function getAkuukanE25NormalActionStage(
  akuukan: AkuukanGameState
): AkuukanE25NormalActionStage {
  if (
    hasAkuukanEffectInstance(
      akuukan,
      AKUUKAN_E25_SECOND_ACTION_EFFECT_ID
    )
  ) {
    return "second";
  }

  if (
    hasAkuukanEffectInstance(
      akuukan,
      AKUUKAN_E25_FIRST_ACTION_EFFECT_ID
    )
  ) {
    return "first";
  }

  return null;
}

function setAkuukanE25NormalActionStage(
  akuukan: AkuukanGameState,
  stage: AkuukanE25NormalActionStage
): AkuukanGameState {
  let updated = endAkuukanEffect(
    akuukan,
    AKUUKAN_E25_FIRST_ACTION_EFFECT_ID
  );
  updated = endAkuukanEffect(
    updated,
    AKUUKAN_E25_SECOND_ACTION_EFFECT_ID
  );

  if (stage === null) {
    return updated;
  }

  return activateAkuukanEffect(updated, {
    instanceId:
      stage === "first"
        ? AKUUKAN_E25_FIRST_ACTION_EFFECT_ID
        : AKUUKAN_E25_SECOND_ACTION_EFFECT_ID,
    sourceId: "enemy-ability:E-25",
    remainingTurns: null
  });
}

function setAkuukanE25NormalActionStageInState(
  state: GameState,
  stage: AkuukanE25NormalActionStage
): GameState {
  if (!state.akuukan) {
    return state;
  }

  const akuukan =
    setAkuukanE25NormalActionStage(
      state.akuukan,
      stage
    );

  return akuukan === state.akuukan
    ? state
    : {
        ...state,
        akuukan
      };
}

function beginAkuukanE25NormalAction(
  state: GameState,
  actor: PlayerState
): GameState {
  if (!state.akuukan) {
    return state;
  }

  const actionCount =
    getAkuukanNormalTurnActionCount({
      akuukan: state.akuukan,
      actorIsSelectedEnemy:
        actor.seat === 2
    });

  if (actionCount !== 2) {
    return setAkuukanE25NormalActionStageInState(
      state,
      null
    );
  }

  const stage =
    getAkuukanE25NormalActionStage(
      state.akuukan
    );

  if (
    stage === "second" &&
    state.round.lastDiscard?.seat ===
      actor.seat
  ) {
    return state;
  }

  return setAkuukanE25NormalActionStageInState(
    state,
    "first"
  );
}

function resolveAkuukanE25AfterDiscard(
  state: GameState
): GameState {
  if (!state.akuukan) {
    return state;
  }

  const stage =
    getAkuukanE25NormalActionStage(
      state.akuukan
    );

  if (stage === null) {
    return state;
  }

  const lastDiscard =
    state.round.lastDiscard;

  if (
    stage === "second" ||
    !lastDiscard ||
    state.round.phase !== "drawing" ||
    state.round.liveWall.length === 0 ||
    !shouldStartAkuukanAdditionalNormalAction({
      akuukan: state.akuukan,
      actorIsSelectedEnemy:
        lastDiscard.seat === 2,
      completedActionCount: 1,
      result: "uninterruptedDiscard"
    })
  ) {
    return setAkuukanE25NormalActionStageInState(
      state,
      null
    );
  }

  const secondActionState =
    setAkuukanE25NormalActionStageInState(
      state,
      "second"
    );

  return {
    ...secondActionState,
    round: {
      ...secondActionState.round,
      currentSeat: lastDiscard.seat
    }
  };
}

function getAkuukanE19ForbiddenTileIdsForPlayer(
  state: GameState,
  player: PlayerState
): readonly string[] {
  return state.akuukan
    ? getAkuukanE19ForbiddenTileIds(
        state.akuukan,
        player.id
      )
    : [];
}

function getForbiddenDiscardTileIdsForPlayer(
  state: GameState,
  player: PlayerState
): string[] {
  const e19ForbiddenTileIdSet = new Set(
    getAkuukanE19ForbiddenTileIdsForPlayer(
      state,
      player
    )
  );
  const callRestriction =
    state.round.meldCallDiscardRestriction;

  return player.hand
    .filter(
      (tile) =>
        e19ForbiddenTileIdSet.has(tile.id) ||
        (
          callRestriction?.callerSeat ===
            player.seat &&
          callRestriction.forbiddenTileTypes.some(
            (tileType) =>
              isSameTileFace(
                tile,
                tileType
              )
          )
        )
    )
    .map((tile) => tile.id);
}

function synchronizeAkuukanE19ForPlayerHand(
  state: GameState,
  seat: SeatIndex
): GameState {
  if (!state.akuukan) {
    return state;
  }

  const player = state.round.players[seat];

  if (!player) {
    return state;
  }

  const akuukan =
    synchronizeAkuukanE19PlayerHandRestrictions({
      akuukan: state.akuukan,
      playerId: player.id,
      concealedTiles: player.hand
    });

  return akuukan === state.akuukan
    ? state
    : {
        ...state,
        akuukan
      };
}

function getAkuukanLiveWallDrawIndex(
  state: GameState,
  player: PlayerState,
  random: () => number
): number | null {
  if (!state.akuukan) {
    return state.round.liveWall.length > 0
      ? 0
      : null;
  }

  const candidateIndexes =
    getAkuukanLiveWallDrawCandidateIndexes({
      akuukan: state.akuukan,
      playerId: player.id,
      recipientIsSelectedEnemy:
        player.seat === 2,
      targetSuit:
        getAkuukanE5TargetSuit(
          state.akuukan
        ),
      previousDiscardTile:
        player.discards[
          player.discards.length - 1
        ]?.tile ?? null,
      concealedTiles: player.hand,
      melds: player.melds,
      liveWall: state.round.liveWall,
      random
    });

  return getAkuukanPlayerSkill1_4LiveWallDrawIndex({
    akuukan: state.akuukan,
    drawerIsPlayer: player.seat === 0,
    liveWall: state.round.liveWall,
    candidateIndexes,
    doraIndicators:
      getDoraIndicators(state.round),
    random
  });
}

export function drawAkuukanE28RiverTile(
  state: GameState,
  seat: SeatIndex,
  riverOwnerSeat: SeatIndex,
  tileId: string,
  random: () => number = Math.random
): GameState {
  const round = state.round;

  if (
    !state.akuukan ||
    round.phase !== "drawing" ||
    round.currentSeat !== seat
  ) {
    return state;
  }

  const candidates =
    getAkuukanE28RiverDrawCandidates({
      akuukan: state.akuukan,
      drawerIsSelectedEnemy: seat === 2,
      players: round.players
    });
  const requestedCandidate =
    candidates.find(
      (candidate) =>
        candidate.riverOwnerSeat ===
          riverOwnerSeat &&
        candidate.tile.id === tileId
    );

  if (!requestedCandidate) {
    return state;
  }

  const selectedCandidate =
    requestedCandidate.faceDown
      ? selectRandomAkuukanE28FaceDownCandidate(
          candidates,
          random
        )
      : requestedCandidate;

  if (!selectedCandidate) {
    return state;
  }

  const riverDraw = takeAkuukanE28RiverTile({
    akuukan: state.akuukan,
    drawerIsSelectedEnemy: seat === 2,
    players: round.players,
    riverOwnerSeat:
      selectedCandidate.riverOwnerSeat,
    tileId: selectedCandidate.tile.id
  });

  if (!riverDraw) {
    return state;
  }

  const currentPlayer =
    riverDraw.players.find(
      (player) => player.seat === seat
    );

  if (!currentPlayer) {
    return state;
  }

  const updatedPlayer: PlayerState = {
    ...currentPlayer,
    hand: sortTiles([
      ...currentPlayer.hand,
      riverDraw.drawnTile
    ]),
    temporaryFuriten: false,
    drawnTileId: riverDraw.drawnTile.id,
    drawnTileSource: "river"
  };

  return beginAkuukanTurnState({
    ...state,
    round: {
      ...round,
      players: replacePlayer(
        riverDraw.players,
        updatedPlayer
      ),
      phase: "discarding",
      meldCallOptions: []
    },
    notice:
      `${currentPlayer.name}が河から牌をツモりました。`
  });
}

export function drawTile(
  state: GameState,
  seat: SeatIndex,
  random: () => number = Math.random
): GameState {
  const round = state.round;

  if (
    round.phase !== "drawing" ||
    round.currentSeat !== seat
  ) {
    return state;
  }

  const currentPlayer = round.players[seat];
  const drawIndex =
    getAkuukanLiveWallDrawIndex(
      state,
      currentPlayer,
      random
    );
  const drawnTile =
    drawIndex === null
      ? undefined
      : round.liveWall[drawIndex];

  if (!drawnTile || drawIndex === null) {
    return finishRoundWithExhaustiveDraw(
      state,
      "通常山が尽きたため、荒牌平局です。"
    );
  }

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
      ? recoverAkuukanMp(
          state.playerMp,
          AKUUKAN_DRAW_MP_RECOVERY,
          state.maxMp
        )
      : state.playerMp;

  const drawnState = beginAkuukanTurnState({
    ...state,
    playerMp: updatedMp,
    round: {
      ...round,
      liveWall: [
        ...round.liveWall.slice(0, drawIndex),
        ...round.liveWall.slice(drawIndex + 1)
      ],
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
  });

  return beginAkuukanE25NormalAction(
    drawnState,
    updatedPlayer
  );
}

export function drawCpuTile(
  state: GameState,
  seat: SeatIndex,
  random: () => number = Math.random
): GameState {
  const drawer = state.round.players[seat];

  if (
    !state.akuukan ||
    seat === 0 ||
    !drawer ||
    state.round.liveWall.length === 0
  ) {
    return drawTile(state, seat, random);
  }

  const candidates =
    getAkuukanE28RiverDrawCandidates({
      akuukan: state.akuukan,
      drawerIsSelectedEnemy: seat === 2,
      players: state.round.players
    });
  const selectedCandidate =
    selectAkuukanE28RiverDrawCandidate({
      drawer,
      players: state.round.players,
      candidates,
      liveWall: state.round.liveWall,
      doraIndicators:
        getDoraIndicatorsForCpu(
          state,
          seat
        )
    });

  if (!selectedCandidate) {
    return drawTile(state, seat, random);
  }

  const riverDrawState =
    drawAkuukanE28RiverTile(
      state,
      seat,
      selectedCandidate.riverOwnerSeat,
      selectedCandidate.tile.id,
      random
    );

  return riverDrawState === state
    ? drawTile(state, seat, random)
    : riverDrawState;
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
  const canChangeRiichiHand =
    currentPlayer.riichi &&
    isNotenRiichiAllowed(state, seat);

  if (
    currentPlayer.riichi &&
    currentPlayer.drawnTileId !== tileId &&
    !canChangeRiichiHand
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

  if (
    state.akuukan &&
    !isAkuukanE19DiscardAllowed({
      akuukan: state.akuukan,
      playerId: currentPlayer.id,
      tileId: discardedTile.id
    })
  ) {
    return {
      ...state,
      notice:
        "この牌は敵10の能力により捨てられません。別の牌を選んでください。"
    };
  }

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
      currentPlayer.drawnTileId ===
        discardedTile.id ||
      canChangeRiichiHand,
    riichiDeclaration,
    faceDown: false,
    called: false,
    drawnTileSource:
      currentPlayer.drawnTileSource ??
      null
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
  doraIndicators: readonly Tile[],
  random: () => number
): number {
  const sameTypeCount = player.hand.filter(
    (handTile) =>
      getTileTypeKey(handTile) ===
      getTileTypeKey(tile)
  ).length;

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
  doraIndicators: readonly Tile[],
  random: () => number,
  forbiddenTileIds: readonly string[] = []
): Tile {
  const forbiddenTileIdSet = new Set(
    forbiddenTileIds
  );
  const candidates = player.hand
    .filter(
      (tile) =>
        !forbiddenTileIdSet.has(tile.id)
    )
    .map((tile) => ({
      tile,
      priority: calculateDiscardPriority(
        tile,
        player,
        doraIndicators,
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

function isFirstUninterruptedTsumo(
  state: GameState,
  player: PlayerState,
  winMethod: "tsumo" | "ron"
): boolean {
  return (
    winMethod === "tsumo" &&
    state.round.phase === "discarding" &&
    state.round.currentSeat ===
      player.seat &&
    player.drawnTileId !== null &&
    player.drawnTileSource ===
      "liveWall" &&
    player.discards.length === 0 &&
    state.round.turnNumber ===
      FIRST_DRAW_TURN_BY_WIND[
        player.seatWind
      ] &&
    state.round.kanCount === 0 &&
    state.round.players.every(
      (roundPlayer) =>
        roundPlayer.melds.length === 0
    )
  );
}

function getAkuukanWinningCandidateOwner(
  winnerSeat: SeatIndex
): AkuukanWinningCandidateOwner {
  if (winnerSeat === 0) {
    return "player";
  }

  return winnerSeat === 2
    ? "selectedEnemy"
    : "normalOpponent";
}

function createWinInput(
  state: GameState,
  winnerSeat: SeatIndex,
  winMethod: "tsumo" | "ron",
  chankanSource?: ChankanWinSource
) {
  const player =
    state.round.players[winnerSeat];
  const firstUninterruptedTsumo =
    isFirstUninterruptedTsumo(
      state,
      player,
      winMethod
    );
  const akuukanWinningInput =
    state.akuukan
      ? {
          akuukan: state.akuukan,
          owner:
            getAkuukanWinningCandidateOwner(
              winnerSeat
            )
        }
      : null;

  return {
    round: state.round,
    winnerSeat,
    winMethod,
    ...(akuukanWinningInput
      ? {
          treatAsClosed:
            shouldAkuukanWinningCandidateBeTreatedAsClosed(
              akuukanWinningInput
            ),
          candidateYakuEvaluator:
            createAkuukanWinningCandidateYakuEvaluator(
              akuukanWinningInput
            ),
          candidateScoreAdjuster:
            createAkuukanWinningCandidateScoreAdjuster(
              {
                ...akuukanWinningInput,
                winMethod,
                dealer: player.isDealer
              }
            )
        }
      : {}),
    doubleRiichi:
      player.doubleRiichi === true,
    rinshan:
      winMethod === "tsumo" &&
      player.drawnTileSource ===
        "rinshan",
    tenhou:
      firstUninterruptedTsumo &&
      player.isDealer,
    chiihou:
      firstUninterruptedTsumo &&
      !player.isDealer,
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

function applyAkuukanE20ToWinResolution(
  state: GameState,
  resolution:
    ValidRoundWinResolution
): ValidRoundWinResolution {
  const akuukan = state.akuukan;

  if (
    !akuukan ||
    resolution.winnerSeat !== 2 ||
    !isAkuukanE20PaymentMultiplierEnabled(
      akuukan,
      true
    )
  ) {
    return resolution;
  }

  const winnerChange =
    resolution.pointChanges.find(
      (change) =>
        change.seat ===
        resolution.winnerSeat
    );

  if (!winnerChange) {
    throw new Error(
      "E-20の和了者点数移動が見つかりません。"
    );
  }

  const paymentPointsBefore =
    resolution.pointChanges.reduce(
      (total, change) =>
        change.change < 0
          ? total - change.change
          : total,
      0
    );
  const nonPaymentPoints =
    winnerChange.change -
    paymentPointsBefore;

  if (
    !Number.isSafeInteger(
      nonPaymentPoints
    ) ||
    nonPaymentPoints < 0
  ) {
    throw new Error(
      "E-20の支払額と供託点を分離できません。"
    );
  }

  let paymentPointsAfter = 0;
  const adjustedPayerChanges =
    resolution.pointChanges.map(
      (change) => {
        if (change.change >= 0) {
          return { ...change };
        }

        const paymentPoints =
          applyAkuukanE20PaymentMultiplier({
            akuukan,
            winnerIsSelectedEnemy: true,
            paymentPoints: -change.change
          });

        paymentPointsAfter += paymentPoints;

        return {
          ...change,
          change: -paymentPoints,
          pointsAfter:
            change.pointsBefore -
            paymentPoints
        };
      }
    );
  const winnerPointsAfter =
    paymentPointsAfter +
    nonPaymentPoints;
  const pointChanges =
    adjustedPayerChanges.map(
      (change) =>
        change.seat ===
        resolution.winnerSeat
          ? {
              ...change,
              change: winnerPointsAfter,
              pointsAfter:
                change.pointsBefore +
                winnerPointsAfter
            }
          : change
    );
  const pointsAfterByPlayerId =
    new Map(
      pointChanges.map(
        (change) => [
          change.playerId,
          change.pointsAfter
        ]
      )
    );

  return {
    ...resolution,
    pointChanges,
    playersAfter:
      resolution.playersAfter.map(
        (player) => ({
          ...player,
          score:
            pointsAfterByPlayerId.get(
              player.id
            ) ?? player.score
        })
      )
  };
}

function applyAkuukanE20ToNagashiSettlement(
  state: GameState,
  settlement:
    NagashiManganSettlementResult
): NagashiManganSettlementResult {
  const selectedEnemy =
    state.round.players[2];
  const akuukan = state.akuukan;

  if (
    !akuukan ||
    !settlement.winnerIds.includes(
      selectedEnemy.id
    ) ||
    !isAkuukanE20PaymentMultiplierEnabled(
      akuukan,
      true
    )
  ) {
    return settlement;
  }

  const changesByPlayerId = new Map(
    state.round.players.map(
      (player) => [player.id, 0]
    )
  );
  const payments =
    settlement.payments.map(
      (payment) => ({
        ...payment,
        points:
          payment.winnerId ===
          selectedEnemy.id
            ? applyAkuukanE20PaymentMultiplier(
                {
                  akuukan,
                  winnerIsSelectedEnemy:
                    true,
                  paymentPoints:
                    payment.points
                }
              )
            : payment.points
      })
    );

  for (const payment of payments) {
    changesByPlayerId.set(
      payment.winnerId,
      (changesByPlayerId.get(
        payment.winnerId
      ) ?? 0) + payment.points
    );
    changesByPlayerId.set(
      payment.payerId,
      (changesByPlayerId.get(
        payment.payerId
      ) ?? 0) - payment.points
    );
  }

  if (
    settlement.riichiPoolRecipientId
  ) {
    changesByPlayerId.set(
      settlement.riichiPoolRecipientId,
      (changesByPlayerId.get(
        settlement.riichiPoolRecipientId
      ) ?? 0) + state.round.riichiPool
    );
  }

  const pointChanges =
    settlement.pointChanges.map(
      (change) => {
        const adjustedChange =
          changesByPlayerId.get(
            change.playerId
          ) ?? 0;

        return {
          ...change,
          change: adjustedChange,
          pointsAfter:
            change.pointsBefore +
            adjustedChange
        };
      }
    );
  const pointsAfterByPlayerId =
    new Map(
      pointChanges.map(
        (change) => [
          change.playerId,
          change.pointsAfter
        ]
      )
    );

  return {
    ...settlement,
    payments,
    pointChanges,
    playersAfter:
      settlement.playersAfter.map(
        (player) => ({
          ...player,
          points:
            pointsAfterByPlayerId.get(
              player.id
            ) ?? player.points
        })
      )
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

interface AkuukanPlayerSkill1_3Application {
  readonly state: GameState;
  readonly scoringState: GameState;
}

function applyAkuukanPlayerSkill1_3BeforeWin(
  state: GameState,
  winMethod: "tsumo" | "ron",
  random: () => number
): AkuukanPlayerSkill1_3Application {
  const unchanged = {
    state,
    scoringState: state
  };

  if (!state.akuukan) {
    return unchanged;
  }

  const player = state.round.players[0];
  const ronWinningTile =
    winMethod === "ron"
      ? getPendingKanChankanSource(state)
          ?.winningTile ??
        state.round.lastDiscard?.discard
          .tile ??
        null
      : null;

  if (
    winMethod === "ron" &&
    !ronWinningTile
  ) {
    return unchanged;
  }

  const transformation =
    applyAkuukanRedTileTransformation({
      akuukan: state.akuukan,
      skillId: "1-3",
      tiles:
        ronWinningTile
          ? [
              ...player.hand,
              ronWinningTile
            ]
          : player.hand,
      random
    });

  if (!transformation.transformedTileId) {
    return unchanged;
  }

  const transformedTile =
    transformation.tiles.find(
      (tile) =>
        tile.id ===
        transformation.transformedTileId
    );

  if (!transformedTile) {
    return unchanged;
  }

  const transformedTileById = new Map(
    transformation.tiles.map((tile) => [
      tile.id,
      tile
    ])
  );
  const transformedPlayerHand =
    player.hand.map(
      (tile) =>
        transformedTileById.get(tile.id) ??
        tile
    );
  const playerHandChanged =
    player.hand.some(
      (tile) =>
        tile.id === transformedTile.id
    );
  const stateAfterTransformation =
    playerHandChanged
      ? {
          ...state,
          round: {
            ...state.round,
            players: replacePlayer(
              state.round.players,
              {
                ...player,
                hand: sortTiles(
                  transformedPlayerHand
                )
              }
            )
          }
        }
      : state;

  if (
    winMethod !== "ron" ||
    transformedTile.id !==
      ronWinningTile?.id
  ) {
    return {
      state: stateAfterTransformation,
      scoringState:
        stateAfterTransformation
    };
  }

  const pendingKan =
    stateAfterTransformation.round
      .pendingKan;

  if (pendingKan) {
    const declarer =
      stateAfterTransformation.round
        .players[pendingKan.declarerSeat];

    return {
      state: stateAfterTransformation,
      scoringState: {
        ...stateAfterTransformation,
        round: {
          ...stateAfterTransformation.round,
          players: replacePlayer(
            stateAfterTransformation.round
              .players,
            {
              ...declarer,
              hand: declarer.hand.map(
                (tile) =>
                  tile.id ===
                  transformedTile.id
                    ? transformedTile
                    : tile
              )
            }
          )
        }
      }
    };
  }

  const lastDiscard =
    stateAfterTransformation.round
      .lastDiscard;

  if (!lastDiscard) {
    return unchanged;
  }

  return {
    state: stateAfterTransformation,
    scoringState: {
      ...stateAfterTransformation,
      round: {
        ...stateAfterTransformation.round,
        lastDiscard: {
          ...lastDiscard,
          discard: {
            ...lastDiscard.discard,
            tile: transformedTile
          }
        }
      }
    }
  };
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

    const winnerPointChange =
    resolution.pointChanges.find(
      (change) =>
        change.seat ===
        resolution.winnerSeat
    );

  if (!winnerPointChange) {
    throw new Error(
      "和了者の点数移動が見つかりません。"
    );
  }

    const responsiblePlayer =
    resolution.responsibility === null
      ? null
      : round.players.find(
          (player) =>
            player.id ===
            resolution.responsibility
              ?.responsiblePlayerId
        );

  if (
    resolution.responsibility &&
    !responsiblePlayer
  ) {
    throw new Error(
      "責任払いの責任者が見つかりません。"
    );
  }
  
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
    responsibility:
      resolution.responsibility &&
      responsiblePlayer
        ? {
            yakumanId:
              resolution.responsibility
                .yakumanId,
            yakumanMultiplier:
              resolution.responsibility
                .yakumanMultiplier,
            responsibleSeat:
              responsiblePlayer.seat
          }
        : null,
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
    totalPoints:
      winnerPointChange.change,
    pointChanges:
      resolution.pointChanges
  };
}

function recordAkuukanE6AfterWins(
  state: GameState,
  resolutions:
    readonly ValidRoundWinResolution[]
): GameState["akuukan"] {
  if (!state.akuukan) {
    return undefined;
  }

  const selectedEnemyWin =
    resolutions.find(
      (resolution) =>
        resolution.winnerSeat === 2
    );

  if (!selectedEnemyWin) {
    return state.akuukan;
  }

  return recordAkuukanE6WinningYaku({
    akuukan: state.akuukan,
    winnerIsSelectedEnemy: true,
    normalYakuIds:
      selectedEnemyWin.evaluation.best
        .evaluatedNormalYaku.map(
          (yaku) => yaku.id
        )
  });
}

function isAkuukanE27ResolutionInvalidated(
  state: GameState,
  resolution:
    ValidRoundWinResolution
): boolean {
  if (!state.akuukan) {
    return false;
  }

  return isAkuukanE27WinInvalidated({
    akuukan: state.akuukan,
    winnerIsSelectedEnemy:
      resolution.winnerSeat === 2,
    score:
      resolution.evaluation.best.score
  });
}

function finishRoundWithAkuukanE27Draw(
  state: GameState,
  resolutions:
    readonly ValidRoundWinResolution[]
): GameState {
  return finishRoundWithAbortiveDraw(
    state,
    {
      reason: "enemyAbilityE27",
      invalidatedWinnerSeats:
        resolutions.map(
          (resolution) =>
            resolution.winnerSeat
        )
    },
    "E-27により満貫未満の和了が無効となり、特殊途中流局です。"
  );
}

function finishRoundWithWin(
  state: GameState,
  resolution:
    ValidRoundWinResolution
): GameState {
  if (
    isAkuukanE27ResolutionInvalidated(
      state,
      resolution
    )
  ) {
    return finishRoundWithAkuukanE27Draw(
      state,
      [resolution]
    );
  }

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
  const akuukan =
    recordAkuukanE6AfterWins(
      state,
      [resolution]
    );

  return {
    ...state,
    ...(akuukan ? { akuukan } : {}),
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
      nagashiManganResult: null,
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

  if (
    result.kind !== "tripleRon" &&
    candidates.some((candidate) =>
      isAkuukanE27ResolutionInvalidated(
        state,
        candidate
      )
    )
  ) {
    return finishRoundWithAkuukanE27Draw(
      state,
      candidates
    );
  }

  const akuukan =
    result.kind === "singleRon" ||
    result.kind === "doubleRon"
      ? recordAkuukanE6AfterWins(
          state,
          candidates
        )
      : state.akuukan;

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
      ...(akuukan ? { akuukan } : {}),
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
        nagashiManganResult: null,
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
      ...(akuukan ? { akuukan } : {}),
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
        nagashiManganResult: null,
        abortiveDrawResult: null
      },
      notice:
        `${firstWinner.name}と${secondWinner.name}が` +
        `${loser.name}からダブロンしました。`
    };
  }

  return {
    ...state,
    ...(akuukan ? { akuukan } : {}),
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
    state.round.nagashiManganResult ||
    state.round.abortiveDrawResult
  ) {
    return state;
  }

  const settlementPlayers =
    state.round.players.map(
      (player) => ({
        id: player.id,
        wind: player.seatWind,
        points: player.score,
        discards: player.discards
      })
    );

  const seatByPlayerId = new Map(
    state.round.players.map(
      (player) => [
        player.id,
        player.seat
      ]
    )
  );

  const getSeat = (
    playerId: string
  ): SeatIndex => {
    const seat = seatByPlayerId.get(
      playerId
    );

    if (seat === undefined) {
      throw new Error(
        "局精算の対象プレイヤーが見つかりません。"
      );
    }

    return seat;
  };

  const applyPointChanges = (
    pointChanges: readonly Omit<
      RoundPointResult,
      "seat"
    >[]
  ): PlayerState[] => {
    const pointsAfterById = new Map(
      pointChanges.map(
        (change) => [
          change.playerId,
          change.pointsAfter
        ]
      )
    );

    return state.round.players.map(
      (player) => ({
        ...player,
        score:
          pointsAfterById.get(
            player.id
          ) ?? player.score
      })
    );
  };

  const toRoundPointChanges = (
    pointChanges: readonly Omit<
      RoundPointResult,
      "seat"
    >[]
  ): RoundPointResult[] =>
    pointChanges.map((change) => ({
      ...change,
      seat: getSeat(change.playerId)
    }));

  const baseNagashiSettlement =
    resolveNagashiManganSettlement({
      players: settlementPlayers,
      honba: state.round.honba,
      riichiPool:
        state.round.riichiPool
    });
  const nagashiSettlement =
    baseNagashiSettlement
      ? applyAkuukanE20ToNagashiSettlement(
          state,
          baseNagashiSettlement
        )
      : null;

  if (nagashiSettlement) {
    const winnerSeats =
      nagashiSettlement.winnerIds.map(
        getSeat
      );
    const winnerNames = winnerSeats.map(
      (seat) =>
        state.round.players[seat].name
    );
    const akuukan = state.akuukan
      ? clearAkuukanE6WinningYakuAfterNagashiMangan(
          {
            akuukan: state.akuukan,
            winnerIsSelectedEnemy:
              winnerSeats.includes(2)
          }
        )
      : undefined;

    return {
      ...state,
      ...(akuukan ? { akuukan } : {}),
      round: {
        ...state.round,
        players: applyPointChanges(
          nagashiSettlement.pointChanges
        ),
        phase: "roundEnd",
        pendingKan: null,
        riichiPool: 0,
        winResult: null,
        doubleRonResult: null,
        drawResult: null,
        nagashiManganResult: {
          winnerSeats,
          riichiPoolRecipientSeat:
            nagashiSettlement
              .riichiPoolRecipientId ===
            null
              ? null
              : getSeat(
                  nagashiSettlement
                    .riichiPoolRecipientId
                ),
          pointChanges:
            toRoundPointChanges(
              nagashiSettlement
                .pointChanges
            )
        },
        abortiveDrawResult: null
      },
      notice:
        `${winnerNames.join("・")}が` +
        "流し満貫を成立させました。"
    };
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
      players: settlementPlayers,
      tenpaiPlayerIds
    });
  const playersAfter = applyPointChanges(
    settlement.pointChanges
  );
  const pointChanges =
    toRoundPointChanges(
      settlement.pointChanges
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
      nagashiManganResult: null,
      abortiveDrawResult: null
    },
    notice
  };
}

export function declarePlayerTsumo(
  state: GameState,
  random: () => number = Math.random
): GameState {
  if (!canPlayerTsumo(state)) {
    return {
      ...state,
      notice: "現在の手牌ではツモ和了できません。"
    };
  }

  const application =
    applyAkuukanPlayerSkill1_3BeforeWin(
      state,
      "tsumo",
      random
    );
  const resolution = resolveRoundWin(
    createWinInput(
      application.scoringState,
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
    application.state,
    resolution
  );
}

export function declarePlayerRon(
  state: GameState,
  random: () => number = Math.random
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

  if (candidates.length === 3) {
    return finishRoundWithRonCandidates(
      state,
      candidates
    );
  }

  const application =
    applyAkuukanPlayerSkill1_3BeforeWin(
      state,
      "ron",
      random
    );
  const chankanSource =
    getPendingKanChankanSource(
      application.scoringState
    );
  const playerResolution =
    getValidWinResolution(
      application.scoringState,
      0,
      "ron",
      chankanSource ?? undefined
    );

  if (!playerResolution) {
    return {
      ...state,
      notice: "ロン和了の精算に失敗しました。"
    };
  }

  return finishRoundWithRonCandidates(
    application.state,
    candidates.map((candidate) =>
      candidate.winnerSeat === 0
        ? playerResolution
        : candidate
    )
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
      ? applyAkuukanE20ToWinResolution(
          state,
          resolution
        )
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
    if (
      state.akuukan &&
      !isAkuukanRonAllowed({
        akuukan: state.akuukan,
        winner:
          getAkuukanCallOwner(
            candidateSeat
          ),
        ...(chankanSource
          ? {}
          : {
              discardOwner:
                getAkuukanCallOwner(
                  discarderSeat
                )
            })
      })
    ) {
      candidateSeat =
        nextSeat(candidateSeat);
      continue;
    }

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

function finishFourWindsIfAvailable(
  state: GameState
): GameState | null {
  const result =
    getFourWindsDrawResult(
      state.round
    );

  return result
    ? finishRoundWithAbortiveDraw(
        state,
        result
      )
    : null;
}

function finishFourRiichiIfAvailable(
  state: GameState
): GameState | null {
  const lastDiscard =
    state.round.lastDiscard;

  if (
    state.round.phase !== "drawing" ||
    !lastDiscard?.discard
      .riichiDeclaration ||
    !state.round.players[
      lastDiscard.seat
    ]?.riichi
  ) {
    return null;
  }

  const result =
    getFourRiichiDrawResult(
      state.round
    );

  return result
    ? finishRoundWithAbortiveDraw(
        state,
        result
      )
    : null;
}

function finishFourKansIfAvailable(
  state: GameState
): GameState | null {
  const result =
    getFourKansDrawResult(
      state.round
    );

  return result
    ? finishRoundWithAbortiveDraw(
        state,
        result
      )
    : null;
}

function getAkuukanCallOwner(
  seat: SeatIndex
): AkuukanCallOwner {
  if (seat === 0) {
    return "player";
  }

  return seat === 2
    ? "selectedEnemy"
    : "normalOpponent";
}

function isCallAllowed(
  state: GameState,
  seat: SeatIndex,
  kind: AkuukanCallKind,
  discarderSeat?: SeatIndex
): boolean {
  if (!state.akuukan) {
    return true;
  }

  const caller =
    state.round.players[seat];

  return (
    caller !== undefined &&
    isAkuukanCallAllowed({
      akuukan: state.akuukan,
      owner: getAkuukanCallOwner(seat),
      kind,
      score: caller.score,
      ...(discarderSeat === undefined
        ? {}
        : {
            discardOwner:
              getAkuukanCallOwner(
                discarderSeat
              )
          })
    })
  );
}

function applyCallDeposit(
  state: GameState,
  seat: SeatIndex,
  kind: AkuukanCallKind
): GameState {
  if (!state.akuukan) {
    return state;
  }

  const caller =
    state.round.players[seat];

  if (!caller) {
    return state;
  }

  const deposit = getAkuukanCallDeposit({
    akuukan: state.akuukan,
    owner: getAkuukanCallOwner(seat),
    kind,
    score: caller.score
  });

  if (deposit === 0) {
    return state;
  }

  return {
    ...state,
    round: {
      ...state.round,
      players: state.round.players.map(
        (player): PlayerState =>
          player.seat === seat
            ? {
                ...player,
                score:
                  player.score - deposit
              }
            : player
      ),
      riichiPool:
        state.round.riichiPool + deposit
    }
  };
}

interface CallAfterEffectTarget {
  readonly meldIndex?: number;
  readonly addedTileId?: string;
}

function applyAkuukanPlayerSkill1_2AfterCall(
  state: GameState,
  callerSeat: SeatIndex,
  kind: AkuukanCallKind,
  random: () => number
): GameState {
  if (
    !state.akuukan ||
    callerSeat === 0 ||
    (
      kind !== "chi" &&
      kind !== "pon" &&
      kind !== "openKan"
    )
  ) {
    return state;
  }

  const player = state.round.players[0];
  const transformation =
    applyAkuukanRedTileTransformation({
      akuukan: state.akuukan,
      skillId: "1-2",
      tiles: player.hand,
      random
    });

  if (!transformation.transformedTileId) {
    return state;
  }

  return {
    ...state,
    round: {
      ...state.round,
      players: replacePlayer(
        state.round.players,
        {
          ...player,
          hand: sortTiles(
            transformation.tiles
          )
        }
      )
    }
  };
}

function applyCallAfterEffects(
  state: GameState,
  seat: SeatIndex,
  kind: AkuukanCallKind,
  target?: CallAfterEffectTarget,
  random: () => number = Math.random
): GameState {
  let stateAfterEffects =
    kind === "chi" ||
    kind === "pon" ||
    kind === "openKan"
      ? setAkuukanE25NormalActionStageInState(
          state,
          null
        )
      : state;

  stateAfterEffects = applyCallDeposit(
    stateAfterEffects,
    seat,
    kind
  );

  stateAfterEffects =
    synchronizeAkuukanE19ForPlayerHand(
      stateAfterEffects,
      seat
    );

  const akuukan = stateAfterEffects.akuukan;

  if (!akuukan) {
    return stateAfterEffects;
  }

  let caller =
    stateAfterEffects.round.players[seat];

  if (!caller) {
    return stateAfterEffects;
  }

  const e12Result =
    applyAkuukanE12AfterCall({
      akuukan,
      callerIsSelectedEnemy:
        getAkuukanCallOwner(seat) ===
        "selectedEnemy",
      kind,
      callerId: caller.id,
      players:
        stateAfterEffects.round.players
    });

  if (e12Result) {
    stateAfterEffects = {
      ...stateAfterEffects,
      round: {
        ...stateAfterEffects.round,
        players: e12Result.players
      }
    };
  }

  stateAfterEffects =
    applyAkuukanPlayerSkill1_2AfterCall(
      stateAfterEffects,
      seat,
      kind,
      random
    );

  caller =
    stateAfterEffects.round.players[seat];

  const e15Result =
    applyAkuukanE15AfterCall({
      akuukan,
      callerIsSelectedEnemy:
        getAkuukanCallOwner(seat) ===
        "selectedEnemy",
      kind,
      melds: caller.melds,
      meldIndex:
        target?.meldIndex ??
        caller.melds.length - 1,
      ...(target?.addedTileId
        ? {
            addedTileId:
              target.addedTileId
          }
        : {})
    });

  if (!e15Result) {
    return stateAfterEffects;
  }

  return {
    ...stateAfterEffects,
    round: {
      ...stateAfterEffects.round,
      players: replacePlayer(
        stateAfterEffects.round.players,
        {
          ...caller,
          melds: e15Result.melds
        }
      )
    }
  };
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
  }).filter((option) =>
    isCallAllowed(
      state,
      0,
      option.kind,
      lastDiscard.seat
    )
  );
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

  if (
    !isCallAllowed(
      state,
      0,
      "openKan",
      lastDiscard.seat
    )
  ) {
    return [];
  }

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
        }).filter((option) =>
          isCallAllowed(
            state,
            player.seat,
            option.kind,
            lastDiscard.seat
          )
        );
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
        isCallAllowed(
          state,
          player.seat,
          "openKan",
          lastDiscard.seat
        )
          ? getOpenKanCallOptions({
              callerSeat: player.seat,
              discarderSeat:
                lastDiscard.seat,
              calledTile:
                lastDiscard.discard.tile,
              concealedTiles: player.hand,
              callerRiichi: player.riichi,
              kanCount:
                state.round.kanCount,
              rinshanDrawCount:
                state.round
                  .rinshanDrawCount,
              liveWallTileCount:
                state.round.liveWall.length
            })
          : [];
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
  decision: CpuMeldCallDecision,
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

  const callState = beginAkuukanTurnState(
    applyCallAfterEffects(
      {
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
      },
      option.callerSeat,
      option.kind,
      undefined,
      random
    )
  );

  const callerAfterCall =
    callState.round.players[
      option.callerSeat
    ];
  const forbiddenTileIds =
    getForbiddenDiscardTileIdsForPlayer(
      callState,
      callerAfterCall
    );
  const forbiddenTileIdSet = new Set(
    forbiddenTileIds
  );
  const requestedTile =
    callerAfterCall.hand.find(
      (tile) =>
        tile.id ===
          decision.discardTileId &&
        !forbiddenTileIdSet.has(tile.id)
    );
  const selectedTile =
    requestedTile ??
    chooseCpuDiscard(
      callerAfterCall,
      getDoraIndicatorsForCpu(
        callState,
        option.callerSeat
      ),
      random,
      forbiddenTileIds
    );
  const discardedState = discardTile(
    callState,
    selectedTile.id
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
  const kanState = beginAkuukanTurnState(
    applyCallAfterEffects(
      {
        ...state,
        round: execution.round,
        notice:
          `${caller.name}が大明槓し、` +
          `${getTileLabel(
            execution.rinshanTile
          )}を嶺上牌としてツモりました。`
      },
      option.callerSeat,
      "openKan",
      undefined,
      random
    )
  );
  
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
    getDoraIndicatorsForCpu(
      kanState,
      option.callerSeat
    ),
    random,
    getForbiddenDiscardTileIdsForPlayer(
      kanState,
      updatedCaller
    )
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

  return beginAkuukanTurnState(
    applyCallAfterEffects(
      {
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
      },
      0,
      option.kind
    )
  );
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
  const kanState = beginAkuukanTurnState(
    applyCallAfterEffects(
      {
        ...callState,
        round: execution.round,
        notice:
          "大明槓が成立し、" +
          `${getTileLabel(
            execution.rinshanTile
          )}を嶺上牌としてツモりました。`
      },
      0,
      "openKan"
    )
  );

  return kanState;
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
    riichiClosedKanAllowedTileTypes:
      cpuPlayer.riichi
        ? getRiichiClosedKanAllowedTileTypes({
            concealedTiles:
              cpuPlayer.hand,
            melds: cpuPlayer.melds,
            drawnTileId:
              cpuPlayer.drawnTileId,
            seatWind:
              cpuPlayer.seatWind,
            prevailingWind:
              state.round.prevailingWind
          })
        : undefined,
    kanCount: state.round.kanCount,
    rinshanDrawCount:
      state.round.rinshanDrawCount,
    liveWallTileCount:
      state.round.liveWall.length
  }).filter((option) =>
    isCallAllowed(
      state,
      cpuSeat,
      option.kind
    )
  );

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
  const forbiddenTileIds =
    getForbiddenDiscardTileIdsForPlayer(
      state,
      cpuPlayer
    );
  const forbiddenTileIdSet = new Set(
    forbiddenTileIds
  );
  const cpuDoraIndicators =
    getDoraIndicatorsForCpu(
      state,
      cpuSeat
    );
  const riichiDecision =
    getCpuRiichiDecision(
      state,
      cpuSeat,
      random
    );

  if (riichiDecision) {
    return playCpuRiichiDeclaration(
      state,
      cpuSeat,
      riichiDecision
    );
  }

  const postRiichiDiscardDecision =
    cpuPlayer.riichi &&
    isNotenRiichiAllowed(
      state,
      cpuSeat
    )
      ? chooseCpuPostRiichiDiscard({
          player: cpuPlayer,
          doraIndicators:
            cpuDoraIndicators,
          visibleTiles:
            getVisibleTilesForCpuRiichi(
              state,
              cpuSeat
            ),
        })
      : null;
  const postRiichiSelectedTile =
    postRiichiDiscardDecision
      ? cpuPlayer.hand.find(
          (tile) =>
            tile.id ===
            postRiichiDiscardDecision
              .discardTileId &&
            !forbiddenTileIdSet.has(
              tile.id
            )
        )
      : undefined;
  const selectedTile =
    postRiichiSelectedTile ??
    (cpuPlayer.riichi
      ? cpuPlayer.hand.find(
          (tile) =>
            tile.id ===
            cpuPlayer.drawnTileId
        ) ??
        chooseCpuDiscard(
          cpuPlayer,
          cpuDoraIndicators,
          random,
          forbiddenTileIds
        )
      : chooseCpuDiscard(
          cpuPlayer,
          cpuDoraIndicators,
          random,
          forbiddenTileIds
        ));

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
  const kanState = beginAkuukanTurnState(
    applyCallAfterEffects(
      {
        ...state,
        round: execution.round,
        notice:
          `${cpuPlayer.name}が${kanLabel}し、` +
          `${getTileLabel(
            execution.rinshanTile
          )}を嶺上牌としてツモりました。`
      },
      pendingKan.declarerSeat,
      pendingKan.kind,
      pendingKan.kind === "addedKan"
        ? {
            meldIndex:
              pendingKan.meldIndex,
            addedTileId:
              pendingKan.tileId
          }
        : undefined
    )
  );
  
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
  state: GameState,
  cpuSeat: SeatIndex
): Tile[] {
  const publicTiles =
    state.round.players.flatMap(
      (player) => [
        ...player.discards.map(
          (discard) => discard.tile
        ),
        ...player.melds.flatMap(
          (meld) => meld.tiles
        )
      ]
    );
  const akuukan = state.akuukan;

  if (!akuukan) {
    return publicTiles;
  }

  const viewer =
    getAkuukanInformationViewer(
      cpuSeat
    );
  const visibleHandTiles =
    state.round.players.flatMap(
      (player) =>
        areAkuukanHandTilesVisible({
          akuukan,
          viewer,
          viewerIsHandOwner:
            player.seat === cpuSeat
        })
          ? player.hand
          : []
    );

  return [
    ...publicTiles,
    ...visibleHandTiles
  ];
}

function getAkuukanRiichiOwner(
  seat: SeatIndex
): AkuukanRiichiOwner {
  if (seat === 0) {
    return "player";
  }

  return seat === 2
    ? "selectedEnemy"
    : "normalOpponent";
}

function isOpenRiichiAllowed(
  state: GameState,
  seat: SeatIndex
): boolean {
  return state.akuukan
    ? isAkuukanOpenRiichiAllowed({
        akuukan: state.akuukan,
        owner:
          getAkuukanRiichiOwner(seat)
      })
    : false;
}

function isNotenRiichiAllowed(
  state: GameState,
  seat: SeatIndex
): boolean {
  return state.akuukan
    ? isAkuukanNotenRiichiAllowed({
        akuukan: state.akuukan,
        owner:
          getAkuukanRiichiOwner(seat)
      })
    : false;
}

function isRiichiProhibited(
  state: GameState,
  seat: SeatIndex
): boolean {
  return state.akuukan
    ? isAkuukanRiichiProhibited({
        akuukan: state.akuukan,
        owner:
          getAkuukanRiichiOwner(seat)
      })
    : false;
}

function getCpuRiichiDecision(
  state: GameState,
  cpuSeat: SeatIndex,
  random: () => number
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
  const forbiddenTileIdSet = new Set(
    getAkuukanE19ForbiddenTileIdsForPlayer(
      state,
      cpuPlayer
    )
  );
  const candidateTileIds =
    getRiichiDiscardTileIds({
      concealedTiles: cpuPlayer.hand,
      melds: cpuPlayer.melds,
      score: cpuPlayer.score,
      liveWallTileCount:
        state.round.liveWall.length,
      alreadyRiichi: cpuPlayer.riichi,
      allowOpenHand:
        isOpenRiichiAllowed(
          state,
          cpuSeat
        ),
      allowNoten:
        isNotenRiichiAllowed(
          state,
          cpuSeat
        ),
      riichiProhibited:
        isRiichiProhibited(
          state,
          cpuSeat
        )
    }).filter(
      (tileId) =>
        !forbiddenTileIdSet.has(tileId)
    );

  return chooseCpuRiichi({
    player: cpuPlayer,
    riichiDiscardTileIds:
      candidateTileIds,
    doraIndicators:
      getDoraIndicatorsForCpu(
        state,
        cpuSeat
      ),
    visibleTiles:
      getVisibleTilesForCpuRiichi(
        state,
        cpuSeat
      ),
    allowNotenRiichi:
      isNotenRiichiAllowed(
        state,
        cpuSeat
      ),
    random
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

  const akuukan = state.akuukan
    ? activateAkuukanE2DrawRestriction({
        akuukan: state.akuukan,
        declarerIsSelectedEnemy:
          cpuSeat === 2,
        priorRiichiPlayerIds:
          state.round.players
            .filter(
              (player) =>
                player.seat !== cpuSeat &&
                player.riichi
            )
            .map((player) => player.id)
      })
    : undefined;

  return {
    ...state,
    ...(akuukan ? { akuukan } : {}),
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
  skipInitialPlayerMeldCallReaction = false,
  onCpuProgress?: CpuProgressObserver
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

    const fourKansState =
      finishFourKansIfAvailable(
        nextState
      );

    if (fourKansState) {
      return fourKansState;
    }

    const fourRiichiState =
      finishFourRiichiIfAvailable(
        nextState
      );

    if (fourRiichiState) {
      return fourRiichiState;
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
      const cpuActionSeat =
        cpuDecision.option.callerSeat;

      nextState =
        cpuDecision.kind === "openKan"
          ? applyCpuOpenKanCall(
              nextState,
              cpuDecision.decision,
              random
            )
          : applyCpuMeldCall(
              nextState,
              cpuDecision.decision,
              random
            );

      onCpuProgress?.({
        phase: "action",
        seat: cpuActionSeat,
        state: nextState
      });

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

    const fourWindsState =
      finishFourWindsIfAvailable(
        nextState
      );

    if (fourWindsState) {
      return fourWindsState;
    }

    nextState =
      resolveAkuukanE25AfterDiscard(
        nextState
      );

    if (
      nextState.round.phase !== "drawing"
    ) {
      break;
    }

    if (nextState.round.currentSeat === 0) {
      nextState = drawTile(
        nextState,
        0,
        random
      );
      break;
    }

    const cpuSeat =
      nextState.round.currentSeat;

    nextState = drawCpuTile(
      nextState,
      cpuSeat,
      random
    );

    onCpuProgress?.({
      phase: "draw",
      seat: cpuSeat,
      state: nextState
    });

    if (
      nextState.round.phase !==
      "discarding"
    ) {
      break;
    }

    nextState = playCpuDiscardingTurn(
      nextState,
      cpuSeat,
      random
    );

    onCpuProgress?.({
      phase: "action",
      seat: cpuSeat,
      state: nextState
    });

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

interface PlayerReactionSkipResolution {
  stateAfterReaction: GameState;
  finalState: GameState;
}

function resolvePlayerReactionSkip(
  state: GameState,
  random: () => number,
  onCpuProgress?: CpuProgressObserver
): PlayerReactionSkipResolution {
  if (state.round.phase !== "reaction") {
    return {
      stateAfterReaction: state,
      finalState: state
    };
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

  const skippedNotice = skippedRon
    ? "ロンを見送りました。"
    : "副露を見送りました。";
  const skippedState: GameState = {
    ...state,
    round: {
      ...state.round,
      players: replacePlayer(
        state.round.players,
        skippedPlayer
      ),
      meldCallOptions: []
    },
    notice: skippedNotice
  };

  if (
    skippedState.round.pendingKan &&
    skippedState.round.pendingKan
      .declarerSeat !== 0
  ) {
    const cpuSeat =
      skippedState.round.pendingKan
        .declarerSeat;
    const resumedState =
      completeCpuPendingSelfKan(
        skippedState,
        random
      );

    onCpuProgress?.({
      phase: "action",
      seat: cpuSeat,
      state: resumedState
    });

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
      return {
        stateAfterReaction: skippedState,
        finalState: resumedState
      };
    }

    return {
      stateAfterReaction: skippedState,
      finalState: completeCpuTurns(
        resumedState,
        random,
        false,
        onCpuProgress
      )
    };
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
      return {
        stateAfterReaction: skippedState,
        finalState: cpuRonState
      };
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

    onCpuProgress?.({
      phase: "action",
      seat: pendingCpuRiichiSeat,
      state: resumedState
    });

    return {
      stateAfterReaction: skippedState,
      finalState: completeCpuTurns(
        resumedState,
        random,
        true,
        onCpuProgress
      )
    };
  }

  if (
    skippedState.round.liveWall.length === 0
  ) {
    const cpuRonState =
      finishCpuRonIfAvailable(
        skippedState
      );

    if (cpuRonState) {
      return {
        stateAfterReaction: skippedState,
        finalState: cpuRonState
      };
    }

    return {
      stateAfterReaction: skippedState,
      finalState:
        finishRoundWithExhaustiveDraw(
          skippedState,
          `${skippedNotice}通常山が尽きたため、荒牌平局です。`
        )
    };
  }

  const resumedState: GameState = {
    ...skippedState,
    round: {
      ...skippedState.round,
      phase: "drawing"
    },
    notice: skippedNotice
  };

  return {
    stateAfterReaction: resumedState,
    finalState: completeCpuTurns(
      resumedState,
      random,
      true,
      onCpuProgress
    )
  };
}

export function skipPlayerRon(
  state: GameState,
  random: () => number = Math.random
): GameState {
  return resolvePlayerReactionSkip(
    state,
    random
  ).finalState;
}

export function createPlayerReactionSkipProgression(
  state: GameState,
  random: () => number = Math.random
): PlayerReactionSkipProgression {
  const cpuSteps: CpuProgressStep[] = [];
  const resolution =
    resolvePlayerReactionSkip(
      state,
      random,
      (step) => {
        cpuSteps.push(step);
      }
    );

  return {
    stateAfterReaction:
      resolution.stateAfterReaction,
    cpuSteps,
    finalState: resolution.finalState
  };
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
  const forbiddenTileIdSet = new Set(
    getAkuukanE19ForbiddenTileIdsForPlayer(
      state,
      player
    )
  );

  return getRiichiDiscardTileIds({
    concealedTiles: player.hand,
    melds: player.melds,
    score: player.score,
    liveWallTileCount:
      state.round.liveWall.length,
    alreadyRiichi: player.riichi,
    allowOpenHand:
      isOpenRiichiAllowed(state, 0),
    allowNoten:
      isNotenRiichiAllowed(state, 0),
    riichiProhibited:
      isRiichiProhibited(state, 0)
  }).filter(
    (tileId) =>
      !forbiddenTileIdSet.has(tileId)
  );
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
    riichiClosedKanAllowedTileTypes:
      player.riichi
        ? getRiichiClosedKanAllowedTileTypes({
            concealedTiles:
              player.hand,
            melds: player.melds,
            drawnTileId:
              player.drawnTileId,
            seatWind:
              player.seatWind,
            prevailingWind:
              state.round.prevailingWind
          })
        : undefined,
    kanCount: state.round.kanCount,
    rinshanDrawCount:
      state.round.rinshanDrawCount,
    liveWallTileCount:
      state.round.liveWall.length
  }).filter((option) =>
    isCallAllowed(
      state,
      0,
      option.kind
    )
  );
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

  const kanState = beginAkuukanTurnState(
    synchronizeAkuukanE19ForPlayerHand(
      {
        ...state,
        round: execution.round,
        notice:
          `${kanLabel}が成立し、` +
          `${getTileLabel(
            execution.rinshanTile
          )}を嶺上牌としてツモりました。`
      },
      0
    )
  );

  return kanState;
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

interface PlayerRiichiResolution {
  stateAfterDeclaration: GameState;
  finalState: GameState;
}

function resolvePlayerRiichi(
  state: GameState,
  tileId: string,
  random: () => number,
  onCpuProgress?: CpuProgressObserver
): PlayerRiichiResolution {
  const candidateTileIds =
    getPlayerRiichiDiscardTileIds(state);

  if (!candidateTileIds.includes(tileId)) {
    const invalidState = {
      ...state,
      notice:
        "選択した牌では立直を宣言できません。"
    };

    return {
      stateAfterDeclaration: invalidState,
      finalState: invalidState
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
    return {
      stateAfterDeclaration: discardedState,
      finalState: discardedState
    };
  }

  const cpuRonState =
    finishCpuRonIfAvailable(
      discardedState
    );

  if (cpuRonState) {
    return {
      stateAfterDeclaration: discardedState,
      finalState: cpuRonState
    };
  }

  const establishedState =
    establishPlayerRiichi(
      discardedState,
      doubleRiichi
    );

  const progressedState =
    completeCpuTurns(
      establishedState,
      random,
      false,
      onCpuProgress
    );

  if (
    progressedState.round.phase ===
      "discarding" &&
    progressedState.round.currentSeat === 0
  ) {
    const finalState = {
      ...progressedState,
      notice:
        (
          doubleRiichi
            ? "ダブル立直が成立しました。"
            : "立直が成立しました。"
        ) +
        progressedState.notice
    };

    return {
      stateAfterDeclaration:
        establishedState,
      finalState
    };
  }

  return {
    stateAfterDeclaration:
      establishedState,
    finalState: progressedState
  };
}

export function declarePlayerRiichi(
  state: GameState,
  tileId: string,
  random: () => number = Math.random
): GameState {
  return resolvePlayerRiichi(
    state,
    tileId,
    random
  ).finalState;
}

export function createPlayerRiichiProgression(
  state: GameState,
  tileId: string,
  random: () => number = Math.random
): PlayerRiichiProgression {
  const cpuSteps: CpuProgressStep[] = [];
  const resolution = resolvePlayerRiichi(
    state,
    tileId,
    random,
    (step) => {
      cpuSteps.push(step);
    }
  );

  return {
    stateAfterDeclaration:
      resolution.stateAfterDeclaration,
    cpuSteps,
    finalState: resolution.finalState
  };
}

interface PlayerDiscardResolution {
  stateAfterDiscard: GameState;
  finalState: GameState;
}

function resolvePlayerDiscard(
  state: GameState,
  tileId: string,
  random: () => number,
  onCpuProgress?: CpuProgressObserver
): PlayerDiscardResolution {
  if (
    state.round.currentSeat !== 0 ||
    state.round.phase !== "discarding"
  ) {
    const invalidState = {
      ...state,
      notice: "現在はプレイヤーの打牌手番ではありません。"
    };

    return {
      stateAfterDiscard: invalidState,
      finalState: invalidState
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
    return {
      stateAfterDiscard: discardedState,
      finalState: discardedState
    };
  }

  const cpuRonState =
    finishCpuRonIfAvailable(
      discardedState
    );

  if (cpuRonState) {
    return {
      stateAfterDiscard: discardedState,
      finalState: cpuRonState
    };
  }

  const fourKansState =
    finishFourKansIfAvailable(
      discardedState
    );

  if (fourKansState) {
    return {
      stateAfterDiscard: discardedState,
      finalState: fourKansState
    };
  }

  if (discardedState.round.phase === "roundEnd") {
    return {
      stateAfterDiscard: discardedState,
      finalState:
        finishRoundWithExhaustiveDraw(
          discardedState,
          discardedState.notice
        )
    };
  }

  return {
    stateAfterDiscard: discardedState,
    finalState: completeCpuTurns(
      discardedState,
      random,
      false,
      onCpuProgress
    )
  };
}

export function playPlayerDiscard(
  state: GameState,
  tileId: string,
  random: () => number = Math.random
): GameState {
  return resolvePlayerDiscard(
    state,
    tileId,
    random
  ).finalState;
}

export function createPlayerDiscardProgression(
  state: GameState,
  tileId: string,
  random: () => number = Math.random
): PlayerDiscardProgression {
  const cpuSteps: CpuProgressStep[] = [];
  const resolution = resolvePlayerDiscard(
    state,
    tileId,
    random,
    (step) => {
      cpuSteps.push(step);
    }
  );

  return {
    stateAfterDiscard:
      resolution.stateAfterDiscard,
    cpuSteps,
    finalState: resolution.finalState
  };
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
  random: () => number,
  akuukan?: AkuukanGameState
): {
  players: PlayerState[];
  liveWall: Tile[];
  deadWall: Tile[];
  doraIndicatorCount: number;
} {
  const shuffledTiles = shuffleTiles(
    createFullTileSet(),
    random
  );

  const deadWall = shuffledTiles.slice(-14);
  const doraIndicatorCount = akuukan
    ? getAkuukanPlayerSkill1_5DoraIndicatorCount({
        akuukan,
        currentDoraIndicatorCount: 1,
        random
      })
    : 1;
  const availableLiveWall =
    shuffledTiles.slice(0, -14);
  const dealComposition =
    prepareAkuukanDealComposition(
      akuukan,
      availableLiveWall,
      deadWall
    );
  const liveWall =
    dealComposition.liveWall;

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

      const reservedTile =
              dealComposition
                .reservedTilesBySeat[seat]?.[
                  drawIndex
                ];
      const tile =
        reservedTile ??
        takeAkuukanLiveWallTile(
          akuukan,
          liveWall,
          seat === 2
        );

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
    deadWall,
    doraIndicatorCount
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

  if (round.nagashiManganResult) {
    return round.nagashiManganResult
      .winnerSeats.includes(
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
      nagashiManganResult: null,
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

interface NextRoundResolution {
  stateAfterStart: GameState;
  finalState: GameState;
}

function resolveNextRoundStart(
  state: GameState,
  random: () => number,
  onCpuProgress?: CpuProgressObserver
): NextRoundResolution {
  if (state.round.phase !== "roundEnd") {
    return {
      stateAfterStart: state,
      finalState: state
    };
  }

  if (
    state.round.players.some(
      (player) => player.score < 0
    )
  ) {
    const finishedState = finishMatch(
      state,
      "持ち点が0点未満のプレイヤーがいるため、半荘戦が終了しました。"
    );

    return {
      stateAfterStart: finishedState,
      finalState: finishedState
    };
  }

  const currentDealerSeat =
    getDealerSeat(state.round);

  const continues = dealerContinues(
    state.round,
    currentDealerSeat
  );

  const isDraw =
    state.round.winResult == null &&
    state.round.doubleRonResult == null &&
    state.round.nagashiManganResult ==
      null;

  if (
    !continues &&
    isHanchanFinalHand(state.round)
  ) {
    const finishedState = finishMatch(
      state,
      "半荘戦が終了しました。最終得点を確認してください。"
    );

    return {
      stateAfterStart: finishedState,
      finalState: finishedState
    };
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
  const begunAkuukan = state.akuukan
    ? beginAkuukanRound(
        clearAkuukanE2DrawRestriction(
          state.akuukan
        )
      )
    : undefined;
  const nextAkuukan = begunAkuukan
    ? assignAkuukanE5TargetSuit({
        akuukan: begunAkuukan,
        random
      })
    : undefined;

  const dealt = dealNextRoundHands(
    preparedPlayers,
    nextDealerSeat,
    random,
    nextAkuukan
  );
  applyAkuukanPlayerDealCompletedEffects(
    nextAkuukan,
    dealt.players,
    random
  );
  const dealtAkuukan =
    assignAkuukanDealCompletedEffects(
      nextAkuukan,
      dealt.players,
      random
    );

  const dealtState: GameState = {
    ...state,
    ...(dealtAkuukan
      ? { akuukan: dealtAkuukan }
      : {}),
    matchResult: null,
    playerMp: recoverAkuukanMp(
      state.playerMp,
      AKUUKAN_ROUND_MP_RECOVERY,
      state.maxMp
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
      doraIndicatorCount:
        dealt.doraIndicatorCount,
      rinshanDrawCount: 0,
      winResult: null,
      doubleRonResult: null,
      drawResult: null,
      nagashiManganResult: null,
      abortiveDrawResult: null
    },
    notice: "次局を開始します。"
  };

  const startedState =
    nextDealerSeat === 0
      ? drawTile(
          dealtState,
          0,
          random
        )
      : completeCpuTurns(
          dealtState,
          random,
          false,
          onCpuProgress
        );

  if (
    startedState.round.phase ===
    "roundEnd"
  ) {
    return {
      stateAfterStart:
        nextDealerSeat === 0
          ? startedState
          : dealtState,
      finalState: startedState
    };
  }

  const finalState = {
    ...startedState,
    notice:
      `${getRoundLabel(startedState.round)}を開始しました。` +
      startedState.notice
  };

  return {
    stateAfterStart:
      nextDealerSeat === 0
        ? finalState
        : dealtState,
    finalState
  };
}

export function startNextRound(
  state: GameState,
  random: () => number = Math.random
): GameState {
  return resolveNextRoundStart(
    state,
    random
  ).finalState;
}

export function createNextRoundProgression(
  state: GameState,
  random: () => number = Math.random
): NextRoundProgression {
  const cpuSteps: CpuProgressStep[] = [];
  const resolution = resolveNextRoundStart(
    state,
    random,
    (step) => {
      cpuSteps.push(step);
    }
  );

  return {
    stateAfterStart:
      resolution.stateAfterStart,
    cpuSteps,
    finalState: resolution.finalState
  };
}
