import type { GameState } from "../mahjong/types";
import { ENEMY_IDS, type EnemyId } from "./types";

export interface MatchStatistics {
  ranks: [number, number, number, number];
  rounds: number;
  wins: number;
  dealIns: number;
  tsumos: number;
  calls: number;
  riichis: number;
  winPoints: number;
  dealInPoints: number;
}

export type EnemyStatistics =
  Partial<Record<EnemyId, MatchStatistics>>;

export interface MatchStatisticsProgress {
  base: MatchStatistics;
  current: MatchStatistics;
  lastRound: number;
}

export function emptyStatistics(): MatchStatistics {
  return {
    ranks: [0, 0, 0, 0],
    rounds: 0,
    wins: 0,
    dealIns: 0,
    tsumos: 0,
    calls: 0,
    riichis: 0,
    winPoints: 0,
    dealInPoints: 0
  };
}

export function createStatisticsProgress(
  base: MatchStatistics = emptyStatistics()
): MatchStatisticsProgress {
  return {
    base: { ...base, ranks: [...base.ranks] },
    current: emptyStatistics(),
    lastRound: 0
  };
}

export function addStatistics(
  a: MatchStatistics,
  b: MatchStatistics
): MatchStatistics {
  return {
    ranks: [0, 1, 2, 3].map(
      i => a.ranks[i] + b.ranks[i]
    ) as MatchStatistics["ranks"],
    rounds: a.rounds + b.rounds,
    wins: a.wins + b.wins,
    dealIns: a.dealIns + b.dealIns,
    tsumos: a.tsumos + b.tsumos,
    calls: a.calls + b.calls,
    riichis: a.riichis + b.riichis,
    winPoints: a.winPoints + b.winPoints,
    dealInPoints: a.dealInPoints + b.dealInPoints
  };
}

export function totalStatistics(
  data: EnemyStatistics = {}
): MatchStatistics {
  return ENEMY_IDS.reduce(
    (total, id) => addStatistics(
      total,
      data[id] ?? emptyStatistics()
    ),
    emptyStatistics()
  );
}

export function recordStatisticsRound(
  state: GameState
): GameState {
  const progress = state.matchProgress;
  const tracking = progress?.statistics;
  const round = state.round;
  const sequence = state.roundSequence ?? 1;

  if (
    !progress ||
    !tracking ||
    tracking.lastRound >= sequence ||
    (
      round.phase !== "roundEnd" &&
      round.phase !== "matchEnd"
    )
  ) {
    return state;
  }

  // 半荘終了処理で局結果が消された後は集計しない。
  if (
    !round.winResult &&
    !round.doubleRonResult &&
    !round.drawResult &&
    !round.abortiveDrawResult &&
    !round.nagashiManganResult
  ) {
    return state;
  }

  const player = round.players.find(p => p.seat === 0);
  if (!player) return state;

  const wins =
    round.abortiveDrawResult || round.nagashiManganResult
      ? []
      : round.doubleRonResult?.winResults ??
        (round.winResult ? [round.winResult] : []);

  const playerWin = wins.find(
    win => win.winnerSeat === 0
  );

  const dealtIn = wins.some(
    win => win.winMethod === "ron" && win.loserSeat === 0
  );

  const payments =
    round.doubleRonResult?.pointChanges ??
    round.winResult?.pointChanges;

  const delta = emptyStatistics();

  delta.rounds = 1;

  delta.calls = Number(
    player.melds.some(meld => meld.kind !== "closedKan")
  );

  delta.riichis = Number(player.riichi);
  delta.wins = Number(Boolean(playerWin));
  delta.tsumos = Number(playerWin?.winMethod === "tsumo");
  delta.dealIns = Number(dealtIn);

  // 本場・供託・能力補正を含む実際の受取額。
  delta.winPoints = playerWin
    ? Math.max(
        0,
        payments?.find(p => p.seat === 0)?.change ?? 0
      )
    : 0;

  // ダブロンも放銃1回。支払額は2人分を合計する。
  delta.dealInPoints = dealtIn
    ? Math.max(
        0,
        -(payments?.find(p => p.seat === 0)?.change ?? 0)
      )
    : 0;

  return {
    ...state,
    matchProgress: {
      ...progress,
      statistics: {
        ...tracking,
        current: addStatistics(tracking.current, delta),
        lastRound: sequence
      }
    }
  };
}

export function completedStatistics(
  state: GameState
): MatchStatistics | null {
  const tracking = state.matchProgress?.statistics;
  const ranking = state.matchResult?.rankings.find(
    p => p.seat === 0
  );

  if (
    state.round.phase !== "matchEnd" ||
    !tracking ||
    !ranking
  ) {
    return null;
  }

  // 開始時の累計から計算し、保存の再試行で二重加算しない。
  const result = addStatistics(
    tracking.base,
    tracking.current
  );

  result.ranks[ranking.rank - 1] += 1;
  return result;
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export function isEnemyStatistics(
  value: unknown
): value is EnemyStatistics {
  if (!isRecord(value)) return false;

  const keys = Object.keys(emptyStatistics());

  return Object.entries(value).every(([id, record]) => {
    if (
      !ENEMY_IDS.includes(id as EnemyId) ||
      !isRecord(record) ||
      Object.keys(record).length !== keys.length ||
      !keys.every(key =>
        Object.prototype.hasOwnProperty.call(record, key)
      )
    ) {
      return false;
    }

    if (
      !Array.isArray(record.ranks) ||
      record.ranks.length !== 4
    ) {
      return false;
    }

    const counters = [
      ...record.ranks,
      ...keys
        .filter(key => key !== "ranks")
        .map(key => record[key])
    ];

    if (
      !counters.every(n =>
        typeof n === "number" &&
        Number.isSafeInteger(n) &&
        n >= 0
      )
    ) {
      return false;
    }

    const s = record as unknown as MatchStatistics;

    return (
      s.wins + s.dealIns <= s.rounds &&
      s.tsumos <= s.wins &&
      s.calls <= s.rounds &&
      s.riichis <= s.rounds &&
      (s.wins > 0 || s.winPoints === 0) &&
      (s.dealIns > 0 || s.dealInPoints === 0)
    );
  });
}
