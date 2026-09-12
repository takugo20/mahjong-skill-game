import type { Tile } from "../mahjong/types";
import {
  getAkuukanPlayerSkill5_7DrawWeightMultiplier,
  type AkuukanPlayerSkill5_7DrawWeightInput
} from "./rinshanWinningDrawWeight";

export interface AkuukanPlayerSkill5_7SelectionInput
  extends Omit<
    AkuukanPlayerSkill5_7DrawWeightInput,
    "candidateHasLegalTsumoWin"
  > {
  // 先頭には、本来取得する嶺上牌を渡す。
  readonly candidates: readonly Tile[];
  readonly winningTileIds: readonly string[];
  readonly random: () => number;
}

export function selectAkuukanPlayerSkill5_7RinshanTile(
  input: AkuukanPlayerSkill5_7SelectionInput
): Tile | null {
  const firstCandidate = input.candidates[0];
  if (!firstCandidate) {
    return null;
  }

  const winningIds = new Set(input.winningTileIds);
  const weightedCandidates = input.candidates.map(tile => ({
    tile,
    weight: getAkuukanPlayerSkill5_7DrawWeightMultiplier({
      akuukan: input.akuukan,
      drawerIsPlayer: input.drawerIsPlayer,
      isRinshanDraw: input.isRinshanDraw,
      tenpaiBeforeDraw: input.tenpaiBeforeDraw,
      candidateHasLegalTsumoWin: winningIds.has(tile.id)
    })
  }));

  const firstWeight = weightedCandidates[0].weight;
  if (
    weightedCandidates.every(
      ({ weight }) => weight === firstWeight
    )
  ) {
    return firstCandidate;
  }

  const totalWeight = weightedCandidates.reduce(
    (total, candidate) => total + candidate.weight,
    0
  );
  const targetWeight = input.random() * totalWeight;
  let accumulatedWeight = 0;

  for (const candidate of weightedCandidates) {
    accumulatedWeight += candidate.weight;
    if (targetWeight < accumulatedWeight) {
      return candidate.tile;
    }
  }

  return weightedCandidates[weightedCandidates.length - 1].tile;
}
