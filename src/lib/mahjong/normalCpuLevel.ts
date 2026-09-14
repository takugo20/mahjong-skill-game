import type { GameState, SeatIndex } from "./types";
import { chooseCpuRiichi } from "./cpuRiichi";
import type {
  CpuRiichiDecision,
  CpuRiichiDecisionInput
} from "./cpuRiichi";

export type NormalCpuLevel = 1 | 2 | 3 | 4;

export function getNormalCpuLevel(
  state: GameState,
  seat: SeatIndex
): NormalCpuLevel {
  // プレイヤー・能力者CPU・通常麻雀は変更しない。
  if (
    !state.akuukan ||
    (seat !== 1 && seat !== 3)
  ) {
    return 4;
  }

  const number = Number(
    state.akuukan.setup.enemyId.split("-")[1]
  );

  if (number >= 1 && number <= 4) return 1;
  if (number >= 5 && number <= 8) return 2;
  if (number >= 9 && number <= 12) return 3;

  return 4;
}

interface Candidate {
  acceptance: number;
  discardedBonus: number;
  score: number;
}

export function selectNormalCpuCandidates<
  T extends Candidate
>(
  candidates: readonly T[],
  level: NormalCpuLevel
): T[] {
  if (candidates.length === 0) return [];

  // 最上位は従来と同じ評価・同じ候補順を保つ。
  if (level === 4) {
    const best = Math.max(
      ...candidates.map(candidate => candidate.score)
    );

    return candidates.filter(
      candidate => candidate.score === best
    );
  }

  // 受け入れが残っている候補があれば、
  // 受け入れゼロの候補は避ける。
  const available = candidates.some(
    candidate => candidate.acceptance > 0
  )
    ? candidates.filter(
        candidate => candidate.acceptance > 0
      )
    : [...candidates];

  // よわい：8枚単位、ふつう：4枚単位で比較。
  // つよい：元の正確な評価を使う。
  const step =
    level === 1 ? 8 :
    level === 2 ? 4 :
    1;

  const score = (candidate: T) =>
    level === 3
      ? candidate.score
      : Math.floor(candidate.acceptance / step) * step
        - candidate.discardedBonus * 3;

  const best = Math.max(
    ...available.map(score)
  );

  // 「つよい」は評価差1以内の候補も選ぶ。
  const tolerance = level === 3 ? 1 : 0;

  return available.filter(
    candidate => score(candidate) >= best - tolerance
  );
}

export function chooseLeveledNormalCpuRiichi(
  state: GameState,
  input: CpuRiichiDecisionInput
): CpuRiichiDecision | null {
  const level = getNormalCpuLevel(
    state,
    input.player.seat
  );

  if (level === 4) {
    return chooseCpuRiichi(input);
  }

  // エンジンから渡された合法な立直候補だけを評価。
  const candidates = input.riichiDiscardTileIds.flatMap(
    id => {
      const decision = chooseCpuRiichi({
        ...input,
        riichiDiscardTileIds: [id],
        allowNotenRiichi: false
      });

      if (!decision) return [];

      return [{
        decision,
        acceptance: decision.remainingWinningTileCount,
        discardedBonus: decision.discardedDoraCount,
        score:
          decision.remainingWinningTileCount
          - decision.discardedDoraCount * 3
      }];
    }
  );

  const choices = selectNormalCpuCandidates(
    candidates,
    level
  );

  if (choices.length === 0) return null;

  const random = input.random ?? Math.random;

  const index = Math.min(
    choices.length - 1,
    Math.max(
      0,
      Math.floor(random() * choices.length)
    )
  );

  return choices[index].decision;
}
