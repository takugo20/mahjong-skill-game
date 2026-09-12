import {
  getAkuukanHandExchangeWallCandidates,
  type AkuukanHandExchangeWallCandidate,
  type AkuukanHandExchangeWallCandidateInput
} from "./handExchange";
import {
  getAkuukanPlayerSkill5_8DrawWeightMultiplier,
  type AkuukanPlayerSkill5_8DrawWeightInput
} from "./haiteiWinningDrawWeight";

export interface AkuukanPlayerSkill5_8CandidateInput
  extends Omit<
      AkuukanHandExchangeWallCandidateInput,
      "acceptsTile"
    >,
    Omit<
      AkuukanPlayerSkill5_8DrawWeightInput,
      "isLastLiveWallTile" | "candidateHasLegalTsumoWin"
    > {}

export function getAkuukanPlayerSkill5_8HaiteiCandidates(
  input: AkuukanPlayerSkill5_8CandidateInput
): AkuukanHandExchangeWallCandidate[] {
  const multiplier = getAkuukanPlayerSkill5_8DrawWeightMultiplier({
    akuukan: input.akuukan,
    drawerIsPlayer: input.drawerIsPlayer,
    isNormalLiveWallDraw: input.isNormalLiveWallDraw,
    isLastLiveWallTile: input.liveWall.length === 1,
    tenpaiBeforeDraw: input.tenpaiBeforeDraw,
    candidateHasLegalTsumoWin: true
  });

  if (multiplier === 1) {
    return [];
  }

  // 強制牌種・候補除外・重量計算は、この候補一覧に対して後で行う。
  return getAkuukanHandExchangeWallCandidates({
    liveWall: input.liveWall,
    deadWall: input.deadWall,
    doraIndicatorCount: input.doraIndicatorCount,
    rinshanDrawCount: input.rinshanDrawCount
  });
}
