import type { GameState } from "../mahjong/types";
import type { EnemyProgressState } from "./enemyProgress";
import type { AkuukanMatchSetup } from "./types";
import {
  settleAkuukanMatchProgress,
  type AkuukanMatchProgressSettlement
} from "./matchProgressSettlement";

export interface AkuukanGameMatchProgress {
  readonly initialSetup: AkuukanMatchSetup;
  readonly initialEnemyProgress: EnemyProgressState;
  readonly settlement: AkuukanMatchProgressSettlement | null;
}

export function createAkuukanGameMatchProgress(
  setup: AkuukanMatchSetup,
  enemyProgress: EnemyProgressState
): AkuukanGameMatchProgress {
  return {
    initialSetup: {
      ...setup,
      equippedSkills: setup.equippedSkills.map(
        skill => ({ ...skill })
      )
    },
    initialEnemyProgress: {
      enemies: Object.fromEntries(
        Object.entries(enemyProgress.enemies).map(
          ([id, progress]) => [id, { ...progress }]
        )
      ) as EnemyProgressState["enemies"]
    },
    settlement: null
  };
}

export function settleAkuukanGameMatchProgress(
  state: GameState
): GameState {
  const progress = state.matchProgress;

  if (
    !state.akuukan ||
    !progress ||
    progress.settlement ||
    state.round.phase !== "matchEnd" ||
    !state.matchResult
  ) {
    return state;
  }

  const player = state.round.players.find(
    value => value.seat === 0
  );
  const ranking = state.matchResult.rankings.find(
    value =>
      value.seat === 0 &&
      value.playerId === player?.id
  );

  if (!ranking || !state.playerSkillDrawProgress) {
    throw new Error(
      "対局終了時の順位または成長進捗がありません。"
    );
  }

  const settlement = settleAkuukanMatchProgress({
    matchIsFinalized: true,
    finalRank: ranking.rank,
    setup: progress.initialSetup,
    enemyProgress: progress.initialEnemyProgress,
    growth: state.playerSkillDrawProgress.growth
  });

  if (!settlement) {
    throw new Error(
      "対局終了時の成長処理に失敗しました。"
    );
  }

  return {
    ...state,
    playerSkillDrawProgress: {
      ...state.playerSkillDrawProgress,
      growth: settlement.growth
    },
    matchProgress: {
      ...progress,
      settlement
    }
  };
}
