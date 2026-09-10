import type {
  Tile
} from "../mahjong/types";

const DORA_INDICATOR_INDEXES = [
  4,
  6,
  8,
  10,
  12
] as const;

export type AkuukanHandExchangeWallSource =
  | "liveWall"
  | "deadWall";

export interface AkuukanHandExchangeWallCandidate {
  readonly source:
    AkuukanHandExchangeWallSource;
  readonly index: number;
  readonly tile: Tile;
}

export interface AkuukanHandExchangeWallCandidateInput {
  readonly liveWall: readonly Tile[];
  readonly deadWall: readonly Tile[];
  readonly doraIndicatorCount: number;
  readonly rinshanDrawCount: number;
  readonly acceptsTile?: (
    tile: Tile
  ) => boolean;
}

function getConfirmedDoraIndicatorIndexes(
  doraIndicatorCount: number
): ReadonlySet<number> {
  if (
    !Number.isSafeInteger(
      doraIndicatorCount
    ) ||
    doraIndicatorCount < 0 ||
    doraIndicatorCount >
      DORA_INDICATOR_INDEXES.length
  ) {
    throw new Error(
      "ドラ表示牌数が不正です。"
    );
  }

  return new Set(
    DORA_INDICATOR_INDEXES.slice(
      0,
      doraIndicatorCount
    )
  );
}

function validateRinshanDrawCount(
  rinshanDrawCount: number
): void {
  if (
    !Number.isSafeInteger(
      rinshanDrawCount
    ) ||
    rinshanDrawCount < 0 ||
    rinshanDrawCount > 4
  ) {
    throw new Error(
      "嶺上牌取得回数が不正です。"
    );
  }
}

export function getAkuukanHandExchangeWallCandidates(
  input: AkuukanHandExchangeWallCandidateInput
): AkuukanHandExchangeWallCandidate[] {
  const confirmedDoraIndicatorIndexes =
    getConfirmedDoraIndicatorIndexes(
      input.doraIndicatorCount
    );
  validateRinshanDrawCount(
    input.rinshanDrawCount
  );

  const acceptsTile =
    input.acceptsTile ?? (() => true);
  const liveWallCandidates =
    input.liveWall
      .map((tile, index) => ({
        source: "liveWall" as const,
        index,
        tile
      }))
      .filter((candidate) =>
        acceptsTile(candidate.tile)
      );
  const deadWallCandidates =
    input.deadWall
      .map((tile, index) => ({
        source: "deadWall" as const,
        index,
        tile
      }))
      .filter(
        (candidate) =>
          candidate.index >=
            input.rinshanDrawCount &&
          !confirmedDoraIndicatorIndexes.has(
            candidate.index
          ) &&
          acceptsTile(candidate.tile)
      );

  return [
    ...liveWallCandidates,
    ...deadWallCandidates
  ];
}
