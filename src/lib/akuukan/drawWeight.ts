import {
  isDora
} from "../mahjong/tiles";
import type {
  Meld,
  Tile
} from "../mahjong/types";
import {
  getEquippedPlayerSkill
} from "./equipment";
import {
  getPlayerSkillDefinition
} from "./playerSkillCatalog";
import {
  getPlayerSkillLevelDefinition
} from "./playerSkillCatalogTypes";
import {
  isAkuukanSourceDisabled
} from "./state";
import {
  getAkuukanPlayerSkill4_1DrawWeightMultiplier
} from "./adjacentDrawWeight";
import {
  getAkuukanPlayerSkill4_2DrawWeightMultiplier
} from "./sameTileDrawWeight";
import {
  getAkuukanPlayerSkill4_3DrawWeightMultiplier
} from "./shantenImprovementDrawWeight";
import type {
  AkuukanGameState
} from "./types";

export interface AkuukanPlayerSkill1_4DrawInput {
  readonly akuukan: AkuukanGameState;
  readonly drawerIsPlayer: boolean;
  readonly liveWall: readonly Tile[];
  readonly candidateIndexes:
    readonly number[];
  readonly doraIndicators: readonly Tile[];
  readonly hand?: readonly Tile[];
  readonly melds?: readonly Meld[];
  readonly random: () => number;
}

function getEnabledDoraDrawWeightMultiplier(
  akuukan: AkuukanGameState
): number | null {
  const equippedSkill =
    getEquippedPlayerSkill(
      akuukan,
      "1-4"
    );

  if (
    !equippedSkill ||
    isAkuukanSourceDisabled(
      akuukan,
      "player-skill:1-4"
    )
  ) {
    return null;
  }

  const multiplier =
    getPlayerSkillLevelDefinition(
      getPlayerSkillDefinition("1-4"),
      equippedSkill.level
    ).effectValues
      .doraDrawWeightMultiplier;

  if (
    typeof multiplier !== "number" ||
    !Number.isFinite(multiplier) ||
    multiplier <= 0
  ) {
    throw new Error(
      "スキル1-4のドラツモ倍率が不正です。"
    );
  }

  return multiplier;
}

function isConfirmedDora(
  tile: Tile,
  doraIndicators: readonly Tile[]
): boolean {
  return doraIndicators.some(
    (indicator) =>
      isDora(tile, indicator)
  );
}

export function getAkuukanPlayerSkill1_4LiveWallDrawIndex(
  input: AkuukanPlayerSkill1_4DrawInput
): number | null {
  const candidates =
    input.candidateIndexes
      .map((index) => ({
        index,
        tile: input.liveWall[index]
      }))
      .filter(
        (
          candidate
        ): candidate is {
          index: number;
          tile: Tile;
        } => candidate.tile !== undefined
      );
  const firstCandidate = candidates[0];

  if (!firstCandidate) {
    return null;
  }

  if (!input.drawerIsPlayer) {
    return firstCandidate.index;
  }

  const doraMultiplier =
    getEnabledDoraDrawWeightMultiplier(
      input.akuukan
    ) ?? 1;

  const weightedCandidates =
    candidates.map((candidate) => ({
      ...candidate,
      weight:
        (
          isConfirmedDora(
            candidate.tile,
            input.doraIndicators
          )
            ? doraMultiplier
            : 1
        ) *
        getAkuukanPlayerSkill4_1DrawWeightMultiplier({
          akuukan: input.akuukan,
          drawerIsPlayer:
            input.drawerIsPlayer,
          hand: input.hand ?? [],
          candidate: candidate.tile
        }) *
        getAkuukanPlayerSkill4_2DrawWeightMultiplier({
          akuukan: input.akuukan,
          drawerIsPlayer:
            input.drawerIsPlayer,
          hand: input.hand ?? [],
          candidate: candidate.tile
        }) *
        getAkuukanPlayerSkill4_3DrawWeightMultiplier({
          akuukan: input.akuukan,
          drawerIsPlayer:
            input.drawerIsPlayer,
          hand: input.hand ?? [],
          melds: input.melds ?? [],
          candidate: candidate.tile
        })
    }));
  const firstWeight =
    weightedCandidates[0].weight;

  if (
    weightedCandidates.every(
      (candidate) =>
        candidate.weight === firstWeight
    )
  ) {
    return firstCandidate.index;
  }

  const totalWeight =
    weightedCandidates.reduce(
      (total, candidate) =>
        total + candidate.weight,
      0
    );
  const targetWeight =
    input.random() * totalWeight;
  let accumulatedWeight = 0;

  for (const candidate of weightedCandidates) {
    accumulatedWeight += candidate.weight;

    if (targetWeight < accumulatedWeight) {
      return candidate.index;
    }
  }

  return weightedCandidates[
    weightedCandidates.length - 1
  ].index;
}
