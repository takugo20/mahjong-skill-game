import {
  calculateDora
} from "./dora";
import type {
  DoraCalculationResult
} from "./dora";
import {
  calculateFu
} from "./fu";
import type {
  FuCalculationResult
} from "./fu";
import {
  getWaitTypes,
  getWinningHandDecompositions
} from "./hand";
import type {
  TileType,
  WaitType,
  WinningHandDecomposition
} from "./hand";
import {
  calculateScore
} from "./score";
import type {
  ScoreCalculationResult
} from "./score";
import type {
  Meld,
  Tile,
  Wind
} from "./types";
import {
  evaluateNormalYaku
} from "./yaku";
import type {
  NormalYakuContext,
  NormalYakuResult,
  WinMethod
} from "./yaku";
import {
  evaluateYakuman,
  getYakumanMultiplier
} from "./yakuman";
import type {
  YakumanContext,
  YakumanResult
} from "./yakuman";

export interface WinningCandidateYakuEvaluation {
  readonly normalYaku:
    readonly NormalYakuResult[];
  readonly yakuman:
    readonly YakumanResult[];
  readonly hasValidYaku: boolean;
}

export type WinningCandidateYakuEvaluator = (
  context: YakumanContext
) => WinningCandidateYakuEvaluation;

export type WinningCandidateScoreAdjuster = (
  score: ScoreCalculationResult
) => ScoreCalculationResult;

export interface WinningHandEvaluationInput {
  concealedTiles: readonly Tile[];
  melds?: readonly Meld[];
  winningTile: TileType;
  winMethod: WinMethod;
  seatWind: Wind;
  prevailingWind: Wind;
  doraIndicators?: readonly TileType[];
  uraDoraIndicators?: readonly TileType[];
  riichi?: boolean;
  doubleRiichi?: boolean;
  ippatsu?: boolean;
  rinshan?: boolean;
  chankan?: boolean;
  haitei?: boolean;
  houtei?: boolean;
  tenhou?: boolean;
  chiihou?: boolean;
  treatAsClosed?: boolean;
  honba?: number;
  riichiSticks?: number;
  kiriageMangan?: boolean;
  kazoeYakuman?: boolean;
  candidateYakuEvaluator?:
    WinningCandidateYakuEvaluator;
  candidateScoreAdjuster?:
    WinningCandidateScoreAdjuster;
}

export interface WinningHandCandidate {
  decomposition:
    WinningHandDecomposition;
  waitType: WaitType;
  isYakuman: boolean;
  normalYaku: NormalYakuResult[];
  evaluatedNormalYaku:
    NormalYakuResult[];
  yakuman: YakumanResult[];
  dora: DoraCalculationResult;
  yakuHan: number;
  bonusHan: number;
  totalHan: number;
  yakumanMultiplier: number;
  fu: FuCalculationResult | null;
  score: ScoreCalculationResult;
}

export type WinningHandFailureReason =
  | "notWinningHand"
  | "noYaku";

export interface ValidWinningHandEvaluation {
  valid: true;
  best: WinningHandCandidate;
  candidates: WinningHandCandidate[];
}

export interface InvalidWinningHandEvaluation {
  valid: false;
  reason: WinningHandFailureReason;
  candidates: [];
}

export type WinningHandEvaluationResult =
  | ValidWinningHandEvaluation
  | InvalidWinningHandEvaluation;

function createContext(
  input: WinningHandEvaluationInput,
  concealedTiles: Tile[],
  melds: Meld[],
  decomposition:
    WinningHandDecomposition,
  waitType: WaitType
): YakumanContext {
  return {
    concealedTiles,
    melds,
    decomposition,
    winningTile: input.winningTile,
    waitType,
    winMethod: input.winMethod,
    seatWind: input.seatWind,
    prevailingWind:
      input.prevailingWind,
    riichi: input.riichi,
    doubleRiichi:
      input.doubleRiichi,
    ippatsu: input.ippatsu,
    rinshan: input.rinshan,
    chankan: input.chankan,
    haitei: input.haitei,
    houtei: input.houtei,
    tenhou: input.tenhou,
    chiihou: input.chiihou,
    treatAsClosed:
      input.treatAsClosed
  };
}

function sumNormalYakuHan(
  yaku: readonly NormalYakuResult[]
): number {
  return yaku.reduce(
    (total, result) =>
      total + result.han,
    0
  );
}

function evaluateCandidateYaku(
  input: WinningHandEvaluationInput,
  context: YakumanContext
): WinningCandidateYakuEvaluation {
  if (input.candidateYakuEvaluator) {
    return input.candidateYakuEvaluator(
      context
    );
  }

  const normalYaku =
    evaluateNormalYaku(context);
  const yakuman = evaluateYakuman(context);

  return {
    normalYaku,
    yakuman,
    hasValidYaku:
      normalYaku.length > 0 ||
      yakuman.length > 0
  };
}

function adjustCandidateScore(
  input: WinningHandEvaluationInput,
  score: ScoreCalculationResult
): ScoreCalculationResult {
  return input.candidateScoreAdjuster
    ? input.candidateScoreAdjuster(score)
    : score;
}

function compareCandidates(
  left: WinningHandCandidate,
  right: WinningHandCandidate
): number {
  const scoreDifference =
    right.score.totalPoints -
    left.score.totalPoints;

  if (scoreDifference !== 0) {
    return scoreDifference;
  }

  const yakumanDifference =
    right.yakumanMultiplier -
    left.yakumanMultiplier;

  if (yakumanDifference !== 0) {
    return yakumanDifference;
  }

  const hanDifference =
    right.totalHan - left.totalHan;

  if (hanDifference !== 0) {
    return hanDifference;
  }

  return (
    right.fu?.fu ?? 0
  ) - (
    left.fu?.fu ?? 0
  );
}

export function evaluateWinningHand(
  input: WinningHandEvaluationInput
): WinningHandEvaluationResult {
  const concealedTiles = [
    ...input.concealedTiles
  ];

  const melds = [
    ...(input.melds ?? [])
  ];

  const decompositions =
    getWinningHandDecompositions(
      concealedTiles,
      melds
    );

  if (decompositions.length === 0) {
    return {
      valid: false,
      reason: "notWinningHand",
      candidates: []
    };
  }

  const dora = calculateDora({
    concealedTiles,
    melds,
    doraIndicators:
      input.doraIndicators,
    uraDoraIndicators:
      input.uraDoraIndicators,
    riichi: input.riichi,
    doubleRiichi:
      input.doubleRiichi
  });

  const candidates:
    WinningHandCandidate[] = [];

  let evaluatedWaitCount = 0;

  for (
    const decomposition of
    decompositions
  ) {
    const waitTypes = getWaitTypes(
      decomposition,
      input.winningTile
    );

    for (const waitType of waitTypes) {
      evaluatedWaitCount += 1;

      const context = createContext(
        input,
        concealedTiles,
        melds,
        decomposition,
        waitType
      );

      const yakuEvaluation =
        evaluateCandidateYaku(
          input,
          context
        );

      if (!yakuEvaluation.hasValidYaku) {
        continue;
      }

      const yakuman = [
        ...yakuEvaluation.yakuman
      ];

      if (yakuman.length > 0) {
        const evaluatedNormalYaku = [
          ...yakuEvaluation.normalYaku
        ];
        const yakumanMultiplier =
          getYakumanMultiplier(
            yakuman
          );

        const score = adjustCandidateScore(
          input,
          calculateScore({
            han: 0,
            fu: 0,
            winMethod: input.winMethod,
            dealer:
              input.seatWind === "east",
            yakumanMultiplier,
            honba: input.honba,
            riichiSticks:
              input.riichiSticks,
            kiriageMangan:
              input.kiriageMangan,
            kazoeYakuman:
              input.kazoeYakuman
          })
        );

        candidates.push({
          decomposition,
          waitType,
          isYakuman: true,
          normalYaku: [],
          evaluatedNormalYaku,
          yakuman,
          dora,
          yakuHan: 0,
          bonusHan: 0,
          totalHan: 0,
          yakumanMultiplier,
          fu: null,
          score
        });

        continue;
      }

      const normalContext:
        NormalYakuContext = context;

      const normalYaku = [
        ...yakuEvaluation.normalYaku
      ];

      const yakuHan =
        sumNormalYakuHan(
          normalYaku
        );

      if (yakuHan === 0) {
        continue;
      }

      const fu = calculateFu(
        normalContext
      );

      if (!fu) {
        continue;
      }

      const totalHan =
        yakuHan + dora.totalHan;

      const score = adjustCandidateScore(
        input,
        calculateScore({
          han: totalHan,
          fu: fu.fu,
          winMethod: input.winMethod,
          dealer:
            input.seatWind === "east",
          honba: input.honba,
          riichiSticks:
            input.riichiSticks,
          kiriageMangan:
            input.kiriageMangan,
          kazoeYakuman:
            input.kazoeYakuman
        })
      );

      candidates.push({
        decomposition,
        waitType,
        isYakuman: false,
        normalYaku,
        evaluatedNormalYaku:
          normalYaku,
        yakuman: [],
        dora,
        yakuHan,
        bonusHan: dora.totalHan,
        totalHan,
        yakumanMultiplier: 0,
        fu,
        score
      });
    }
  }

  if (candidates.length === 0) {
    return {
      valid: false,
      reason:
        evaluatedWaitCount === 0
          ? "notWinningHand"
          : "noYaku",
      candidates: []
    };
  }

  candidates.sort(compareCandidates);

  const best = candidates[0];

  if (!best) {
    return {
      valid: false,
      reason: "notWinningHand",
      candidates: []
    };
  }

  return {
    valid: true,
    best,
    candidates
  };
}
