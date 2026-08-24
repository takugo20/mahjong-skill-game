import type {
  Meld,
  TileSuit
} from "./types";
import type { TileType } from "./hand";
import {
  isClosedHand
} from "./yaku";
import type {
  NormalYakuContext
} from "./yaku";

export type FuComponentId =
  | "base"
  | "closedRon"
  | "tsumo"
  | "dragonPair"
  | "seatWindPair"
  | "prevailingWindPair"
  | "wait"
  | "openTriplet"
  | "closedTriplet"
  | "openKan"
  | "closedKan"
  | "openHandMinimum"
  | "sevenPairs";

export interface FuComponent {
  id: FuComponentId;
  name: string;
  fu: number;
}

export interface FuCalculationResult {
  fu: number;
  rawFu: number;
  fixed: boolean;
  components: FuComponent[];
}

interface EvaluatedGroup {
  kind:
    | "sequence"
    | "triplet"
    | "kan";
  suit: TileSuit;
  rank: number;
  open: boolean;
  fromConcealedTiles: boolean;
}

const WIND_RANKS = {
  east: 1,
  south: 2,
  west: 3,
  north: 4
} as const;

function addComponent(
  components: FuComponent[],
  id: FuComponentId,
  name: string,
  fu: number
): void {
  components.push({
    id,
    name,
    fu
  });
}

function getEvaluatedGroups(
  context: NormalYakuContext
): EvaluatedGroup[] {
  const groups: EvaluatedGroup[] = [];

  if (
    context.decomposition.kind ===
    "standard"
  ) {
    for (
      const group of
      context.decomposition
        .concealedMelds
    ) {
      if (group.kind === "sequence") {
        groups.push({
          kind: "sequence",
          suit: group.suit,
          rank: group.startRank,
          open: false,
          fromConcealedTiles: true
        });
      } else {
        groups.push({
          kind: "triplet",
          suit: group.tile.suit,
          rank: group.tile.rank,
          open: false,
          fromConcealedTiles: true
        });
      }
    }
  }

  for (const meld of context.melds) {
    const firstTile = meld.tiles[0];

    if (!firstTile) {
      continue;
    }

    if (meld.kind === "chi") {
      groups.push({
        kind: "sequence",
        suit: firstTile.suit,
        rank: Math.min(
          ...meld.tiles.map(
            (tile) => tile.rank
          )
        ),
        open: true,
        fromConcealedTiles: false
      });

      continue;
    }

    groups.push({
      kind: isKan(meld)
        ? "kan"
        : "triplet",
      suit: firstTile.suit,
      rank: firstTile.rank,
      open:
        meld.kind !== "closedKan",
      fromConcealedTiles: false
    });
  }

  return groups;
}

function isKan(meld: Meld): boolean {
  return (
    meld.kind === "openKan" ||
    meld.kind === "closedKan" ||
    meld.kind === "addedKan"
  );
}

function isSameTileType(
  group: EvaluatedGroup,
  tile: TileType
): boolean {
  return (
    group.suit === tile.suit &&
    group.rank === tile.rank
  );
}

function isTerminalOrHonor(
  suit: TileSuit,
  rank: number
): boolean {
  return (
    suit === "honor" ||
    rank === 1 ||
    rank === 9
  );
}

function isValuePair(
  pair: TileType,
  context: NormalYakuContext
): boolean {
  if (pair.suit !== "honor") {
    return false;
  }

  return (
    pair.rank >= 5 ||
    pair.rank ===
      WIND_RANKS[context.seatWind] ||
    pair.rank ===
      WIND_RANKS[
        context.prevailingWind
      ]
  );
}

function isPinfuShape(
  context: NormalYakuContext,
  groups: readonly EvaluatedGroup[],
  pair: TileType,
  closed: boolean
): boolean {
  return (
    closed &&
    groups.length === 4 &&
    groups.every(
      (group) =>
        group.kind === "sequence"
    ) &&
    !isValuePair(pair, context) &&
    context.waitType === "ryanmen"
  );
}

function isOpenForFu(
  group: EvaluatedGroup,
  context: NormalYakuContext
): boolean {
  if (group.open) {
    return true;
  }

  return (
    group.kind === "triplet" &&
    group.fromConcealedTiles &&
    context.winMethod === "ron" &&
    context.waitType === "shanpon" &&
    isSameTileType(
      group,
      context.winningTile
    )
  );
}

function addGroupFu(
  components: FuComponent[],
  group: EvaluatedGroup,
  context: NormalYakuContext
): void {
  if (group.kind === "sequence") {
    return;
  }

  const terminalOrHonor =
    isTerminalOrHonor(
      group.suit,
      group.rank
    );

  const open =
    isOpenForFu(group, context);

  if (group.kind === "triplet") {
    const fu = open
      ? terminalOrHonor
        ? 4
        : 2
      : terminalOrHonor
        ? 8
        : 4;

    addComponent(
      components,
      open
        ? "openTriplet"
        : "closedTriplet",
      `${terminalOrHonor ? "么九牌" : "中張牌"}の${open ? "明刻" : "暗刻"}`,
      fu
    );

    return;
  }

  const fu = open
    ? terminalOrHonor
      ? 16
      : 8
    : terminalOrHonor
      ? 32
      : 16;

  addComponent(
    components,
    open ? "openKan" : "closedKan",
    `${terminalOrHonor ? "么九牌" : "中張牌"}の${open ? "明槓" : "暗槓"}`,
    fu
  );
}

function addPairFu(
  components: FuComponent[],
  pair: TileType,
  context: NormalYakuContext
): void {
  if (pair.suit !== "honor") {
    return;
  }

  if (
    pair.rank >= 5 &&
    pair.rank <= 7
  ) {
    addComponent(
      components,
      "dragonPair",
      "三元牌の雀頭",
      2
    );
  }

  if (
    pair.rank ===
    WIND_RANKS[context.seatWind]
  ) {
    addComponent(
      components,
      "seatWindPair",
      "自風牌の雀頭",
      2
    );
  }

  if (
    pair.rank ===
    WIND_RANKS[
      context.prevailingWind
    ]
  ) {
    addComponent(
      components,
      "prevailingWindPair",
      "場風牌の雀頭",
      2
    );
  }
}

function addWaitFu(
  components: FuComponent[],
  context: NormalYakuContext
): void {
  const waitNames = {
    tanki: "単騎待ち",
    kanchan: "嵌張待ち",
    penchan: "辺張待ち"
  } as const;

  if (
    context.waitType !== "tanki" &&
    context.waitType !== "kanchan" &&
    context.waitType !== "penchan"
  ) {
    return;
  }

  addComponent(
    components,
    "wait",
    waitNames[context.waitType],
    2
  );
}

function roundFu(rawFu: number): number {
  return Math.ceil(rawFu / 10) * 10;
}

export function calculateFu(
  context: NormalYakuContext
): FuCalculationResult | null {
  if (
    context.decomposition.kind ===
    "thirteenOrphans"
  ) {
    return null;
  }

  if (
    context.decomposition.kind ===
    "sevenPairs"
  ) {
    return {
      fu: 25,
      rawFu: 25,
      fixed: true,
      components: [
        {
          id: "sevenPairs",
          name: "七対子",
          fu: 25
        }
      ]
    };
  }

  const components: FuComponent[] = [];

  addComponent(
    components,
    "base",
    "副底",
    20
  );

  const groups =
    getEvaluatedGroups(context);

  const pair =
    context.decomposition.pair;

  const closed =
    isClosedHand(context.melds) ||
    context.treatAsClosed === true;

  const pinfuShape =
    isPinfuShape(
      context,
      groups,
      pair,
      closed
    );

  if (
    context.winMethod === "ron" &&
    closed
  ) {
    addComponent(
      components,
      "closedRon",
      "門前ロン",
      10
    );
  }

  if (
    context.winMethod === "tsumo" &&
    !pinfuShape
  ) {
    addComponent(
      components,
      "tsumo",
      "ツモ",
      2
    );
  }

  for (const group of groups) {
    addGroupFu(
      components,
      group,
      context
    );
  }

  addPairFu(
    components,
    pair,
    context
  );

  addWaitFu(
    components,
    context
  );

  let rawFu = components.reduce(
    (total, component) =>
      total + component.fu,
    0
  );

  if (
    !closed &&
    context.winMethod === "ron" &&
    rawFu === 20
  ) {
    addComponent(
      components,
      "openHandMinimum",
      "副露ロンの最低符",
      10
    );

    rawFu = 30;
  }

  return {
    fu:
      pinfuShape &&
      context.winMethod === "tsumo"
        ? 20
        : roundFu(rawFu),
    rawFu,
    fixed: false,
    components
  };
}
