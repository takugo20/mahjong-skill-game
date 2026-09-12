import {
  executeKan,
  type KanExecutionInput,
  type KanExecutionResult
} from "../mahjong/kanExecution";
import { executeKanWithAkuukanPlayerSkill5_3 } from "./kanDoraExecution";
import { getAkuukanHandExchangeWallCandidates } from "./handExchange";
import { getAkuukanPlayerSkill5_7DrawWeightMultiplier } from "./rinshanWinningDrawWeight";
import { exchangeAkuukanPlayerSkill5_7RinshanTile } from "./rinshanWinningTileExchange";
import type { AkuukanGameState } from "./types";

export function executeKanWithAkuukanPlayerSkill5_7(
  input: KanExecutionInput,
  akuukan: AkuukanGameState | null | undefined,
  hasLegalTsumoWin: (result: KanExecutionResult) => boolean,
  random: () => number = Math.random
): KanExecutionResult {
  const ordinary = executeKanWithAkuukanPlayerSkill5_3(
    input,
    akuukan,
    random
  );

  if (
    !akuukan ||
    getAkuukanPlayerSkill5_7DrawWeightMultiplier({
      akuukan,
      drawerIsPlayer: ordinary.declarerSeat === 0,
      isRinshanDraw: true,
      tenpaiBeforeDraw: true,
      candidateHasLegalTsumoWin: true
    }) === 1
  ) {
    return ordinary;
  }

  // 槓ドラの交換結果を保ち、嶺上取得直前の山を復元する。
  const targetIndex = input.round.rinshanDrawCount;
  const liveWall = [
    ...ordinary.round.liveWall,
    ordinary.replacementTile
  ];
  const deadWall = [...ordinary.round.deadWall];
  deadWall[targetIndex] = ordinary.rinshanTile;

  const wallInput = {
    liveWall,
    deadWall,
    doraIndicatorCount: ordinary.round.doraIndicatorCount,
    rinshanDrawCount: targetIndex
  };

  const winningTileIds: string[] = [];

  for (
    const candidate of getAkuukanHandExchangeWallCandidates(
      wallInput
    )
  ) {
    const candidateLiveWall = [...liveWall];
    const candidateDeadWall = [...deadWall];

    if (candidate.source === "liveWall") {
      candidateLiveWall[candidate.index] = ordinary.rinshanTile;
    } else {
      candidateDeadWall[candidate.index] = ordinary.rinshanTile;
    }

    candidateDeadWall[targetIndex] = candidate.tile;

    const simulated = executeKan({
      ...input,
      round: {
        ...input.round,
        liveWall: candidateLiveWall,
        deadWall: candidateDeadWall
      }
    });

    if (hasLegalTsumoWin(simulated)) {
      winningTileIds.push(candidate.tile.id);
    }
  }

  if (winningTileIds.length === 0) {
    return ordinary;
  }

  const walls = exchangeAkuukanPlayerSkill5_7RinshanTile({
    ...wallInput,
    akuukan,
    drawerIsPlayer: true,
    isRinshanDraw: true,

    // 槓成立後の手牌に候補を加えて合法和了できることを確認済み。
    tenpaiBeforeDraw: true,

    winningTileIds,
    random
  });

  return executeKan({
    ...input,
    round: {
      ...input.round,
      ...walls
    }
  });
}
