import type {
  Meld,
  NumberSuit,
  Tile,
  TileSuit,
  Wind
} from "./types";
import type {
  TileType,
  WaitType,
  WinningHandDecomposition
} from "./hand";

export type WinMethod =
  | "tsumo"
  | "ron";

export type NormalYakuId =
  | "riichi"
  | "doubleRiichi"
  | "ippatsu"
  | "menzenTsumo"
  | "tanyao"
  | "pinfu"
  | "iipeikou"
  | "yakuhaiWhite"
  | "yakuhaiGreen"
  | "yakuhaiRed"
  | "seatWind"
  | "prevailingWind"
  | "rinshan"
  | "chankan"
  | "haitei"
  | "houtei"
  | "sevenPairs"
  | "toitoi"
  | "sanankou"
  | "sankantsu"
  | "sanshokuDoukou"
  | "shousangen"
  | "honroutou"
  | "sanshokuDoujun"
  | "ittsuu"
  | "chanta"
  | "ryanpeikou"
  | "junchan"
  | "honitsu"
  | "chinitsu";

export interface NormalYakuResult {
  id: NormalYakuId;
  name: string;
  han: number;
}

export interface NormalYakuContext {
  concealedTiles: readonly Tile[];
  melds: readonly Meld[];
  decomposition:
    WinningHandDecomposition;
  winningTile: TileType;
  waitType: WaitType;
  winMethod: WinMethod;
  seatWind: Wind;
  prevailingWind: Wind;
  riichi?: boolean;
  doubleRiichi?: boolean;
  ippatsu?: boolean;
  rinshan?: boolean;
  chankan?: boolean;
  haitei?: boolean;
  houtei?: boolean;
  treatAsClosed?: boolean;
}

interface EvaluatedGroup {
  kind:
    | "sequence"
    | "triplet"
    | "kan";
  suit: TileSuit;
  rank: number;
  open: boolean;
  source:
    | "concealed"
    | "meld";
}

const WIND_RANKS: Record<
  Wind,
  number
> = {
  east: 1,
  south: 2,
  west: 3,
  north: 4
};

const NUMBER_SUITS: NumberSuit[] = [
  "man",
  "pin",
  "sou"
];

export function isClosedHand(
  melds: readonly Meld[]
): boolean {
  return melds.every(
    (meld) => meld.kind === "closedKan"
  );
}

function getAllPhysicalTiles(
  context: NormalYakuContext
): Tile[] {
  return [
    ...context.concealedTiles,
    ...context.melds.flatMap(
      (meld) => meld.tiles
    )
  ];
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
          source: "concealed"
        });
      } else {
        groups.push({
          kind: "triplet",
          suit: group.tile.suit,
          rank: group.tile.rank,
          open: false,
          source: "concealed"
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
      if (firstTile.suit === "honor") {
        continue;
      }

      const startRank = Math.min(
        ...meld.tiles.map(
          (tile) => tile.rank
        )
      );

      groups.push({
        kind: "sequence",
        suit: firstTile.suit,
        rank: startRank,
        open: true,
        source: "meld"
      });

      continue;
    }

    const isKan =
      meld.kind === "openKan" ||
      meld.kind === "closedKan" ||
      meld.kind === "addedKan";

    groups.push({
      kind: isKan ? "kan" : "triplet",
      suit: firstTile.suit,
      rank: firstTile.rank,
      open:
        meld.kind !== "closedKan",
      source: "meld"
    });
  }

  return groups;
}

function isTripletLike(
  group: EvaluatedGroup
): boolean {
  return (
    group.kind === "triplet" ||
    group.kind === "kan"
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

  if (pair.rank >= 5) {
    return true;
  }

  return (
    pair.rank ===
      WIND_RANKS[context.seatWind] ||
    pair.rank ===
      WIND_RANKS[
        context.prevailingWind
      ]
  );
}

function addYaku(
  results: NormalYakuResult[],
  id: NormalYakuId,
  name: string,
  han: number
): void {
  if (
    results.some(
      (result) => result.id === id
    )
  ) {
    return;
  }

  results.push({
    id,
    name,
    han
  });
}

function hasTriplet(
  groups: readonly EvaluatedGroup[],
  suit: TileSuit,
  rank: number
): boolean {
  return groups.some(
    (group) =>
      isTripletLike(group) &&
      group.suit === suit &&
      group.rank === rank
  );
}

function hasSequence(
  groups: readonly EvaluatedGroup[],
  suit: NumberSuit,
  startRank: number
): boolean {
  return groups.some(
    (group) =>
      group.kind === "sequence" &&
      group.suit === suit &&
      group.rank === startRank
  );
}

function countSequencePairs(
  groups: readonly EvaluatedGroup[]
): number {
  const counts = new Map<
    string,
    number
  >();

  for (const group of groups) {
    if (group.kind !== "sequence") {
      continue;
    }

    const key =
      `${group.suit}-${group.rank}`;

    counts.set(
      key,
      (counts.get(key) ?? 0) + 1
    );
  }

  let pairCount = 0;

  for (const count of counts.values()) {
    pairCount += Math.floor(count / 2);
  }

  return pairCount;
}

function countConcealedTriplets(
  groups: readonly EvaluatedGroup[],
  context: NormalYakuContext
): number {
  return groups.filter((group) => {
    if (
      !isTripletLike(group) ||
      group.open
    ) {
      return false;
    }

    const completedByRon =
      group.source === "concealed" &&
      context.winMethod === "ron" &&
      context.waitType === "shanpon" &&
      isSameTileType(
        group,
        context.winningTile
      );

    return !completedByRon;
  }).length;
}

function isChantaGroup(
  group: EvaluatedGroup
): boolean {
  if (group.kind === "sequence") {
    return (
      group.rank === 1 ||
      group.rank === 7
    );
  }

  return isTerminalOrHonor(
    group.suit,
    group.rank
  );
}

function addYakuhai(
  results: NormalYakuResult[],
  groups: readonly EvaluatedGroup[],
  context: NormalYakuContext
): void {
  if (hasTriplet(groups, "honor", 5)) {
    addYaku(
      results,
      "yakuhaiWhite",
      "役牌・白",
      1
    );
  }

  if (hasTriplet(groups, "honor", 6)) {
    addYaku(
      results,
      "yakuhaiGreen",
      "役牌・發",
      1
    );
  }

  if (hasTriplet(groups, "honor", 7)) {
    addYaku(
      results,
      "yakuhaiRed",
      "役牌・中",
      1
    );
  }

  if (
    hasTriplet(
      groups,
      "honor",
      WIND_RANKS[context.seatWind]
    )
  ) {
    addYaku(
      results,
      "seatWind",
      "自風牌",
      1
    );
  }

  if (
    hasTriplet(
      groups,
      "honor",
      WIND_RANKS[
        context.prevailingWind
      ]
    )
  ) {
    addYaku(
      results,
      "prevailingWind",
      "場風牌",
      1
    );
  }
}

export function evaluateNormalYaku(
  context: NormalYakuContext
): NormalYakuResult[] {
  const results: NormalYakuResult[] = [];

  const closed =
    isClosedHand(context.melds) ||
    context.treatAsClosed === true;

  const groups =
    getEvaluatedGroups(context);

  const allTiles =
    getAllPhysicalTiles(context);

  const isStandard =
    context.decomposition.kind ===
    "standard";

  const pair = isStandard
    ? context.decomposition.pair
    : null;

  if (
    closed &&
    context.doubleRiichi
  ) {
    addYaku(
      results,
      "doubleRiichi",
      "ダブル立直",
      2
    );
  } else if (
    closed &&
    context.riichi
  ) {
    addYaku(
      results,
      "riichi",
      "立直",
      1
    );
  }

  if (
    closed &&
    context.ippatsu &&
    (
      context.riichi ||
      context.doubleRiichi
    )
  ) {
    addYaku(
      results,
      "ippatsu",
      "一発",
      1
    );
  }

  if (
    closed &&
    context.winMethod === "tsumo"
  ) {
    addYaku(
      results,
      "menzenTsumo",
      "門前清自摸和",
      1
    );
  }

  const tanyao =
    allTiles.length > 0 &&
    allTiles.every(
      (tile) =>
        tile.suit !== "honor" &&
        tile.rank >= 2 &&
        tile.rank <= 8
    );

  if (tanyao) {
    addYaku(
      results,
      "tanyao",
      "断么九",
      1
    );
  }

  if (
    isStandard &&
    pair &&
    closed &&
    groups.length === 4 &&
    groups.every(
      (group) =>
        group.kind === "sequence"
    ) &&
    !isValuePair(pair, context) &&
    context.waitType === "ryanmen"
  ) {
    addYaku(
      results,
      "pinfu",
      "平和",
      1
    );
  }

  if (closed && isStandard) {
    const sequencePairCount =
      countSequencePairs(groups);

    if (sequencePairCount >= 2) {
      addYaku(
        results,
        "ryanpeikou",
        "二盃口",
        3
      );
    } else if (
      sequencePairCount >= 1
    ) {
      addYaku(
        results,
        "iipeikou",
        "一盃口",
        1
      );
    }
  }

  if (isStandard) {
    addYakuhai(
      results,
      groups,
      context
    );
  }

  if (
    context.winMethod === "tsumo" &&
    context.rinshan
  ) {
    addYaku(
      results,
      "rinshan",
      "嶺上開花",
      1
    );
  } else if (
    context.winMethod === "tsumo" &&
    context.haitei
  ) {
    addYaku(
      results,
      "haitei",
      "海底摸月",
      1
    );
  }

  if (
    context.winMethod === "ron" &&
    context.chankan
  ) {
    addYaku(
      results,
      "chankan",
      "槍槓",
      1
    );
  } else if (
    context.winMethod === "ron" &&
    context.houtei
  ) {
    addYaku(
      results,
      "houtei",
      "河底撈魚",
      1
    );
  }

  if (
    context.decomposition.kind ===
    "sevenPairs"
  ) {
    addYaku(
      results,
      "sevenPairs",
      "七対子",
      2
    );
  }

  if (
    isStandard &&
    groups.length === 4 &&
    groups.every(isTripletLike)
  ) {
    addYaku(
      results,
      "toitoi",
      "対々和",
      2
    );
  }

  if (
    isStandard &&
    countConcealedTriplets(
      groups,
      context
    ) >= 3
  ) {
    addYaku(
      results,
      "sanankou",
      "三暗刻",
      2
    );
  }

  if (
    isStandard &&
    groups.filter(
      (group) => group.kind === "kan"
    ).length >= 3
  ) {
    addYaku(
      results,
      "sankantsu",
      "三槓子",
      2
    );
  }

  if (isStandard) {
    const hasSanshokuDoukou =
      Array.from(
        {
          length: 9
        },
        (_, index) => index + 1
      ).some((rank) =>
        NUMBER_SUITS.every((suit) =>
          hasTriplet(
            groups,
            suit,
            rank
          )
        )
      );

    if (hasSanshokuDoukou) {
      addYaku(
        results,
        "sanshokuDoukou",
        "三色同刻",
        2
      );
    }
  }

  if (isStandard && pair) {
    const dragonTripletCount = [
      5,
      6,
      7
    ].filter((rank) =>
      hasTriplet(
        groups,
        "honor",
        rank
      )
    ).length;

    const dragonPair =
      pair.suit === "honor" &&
      pair.rank >= 5 &&
      pair.rank <= 7;

    if (
      dragonTripletCount === 2 &&
      dragonPair
    ) {
      addYaku(
        results,
        "shousangen",
        "小三元",
        2
      );
    }
  }

  const honroutou =
    allTiles.length > 0 &&
    allTiles.every((tile) =>
      isTerminalOrHonor(
        tile.suit,
        tile.rank
      )
    );

  if (honroutou) {
    addYaku(
      results,
      "honroutou",
      "混老頭",
      2
    );
  }

  if (isStandard) {
    const hasSanshokuDoujun =
      Array.from(
        {
          length: 7
        },
        (_, index) => index + 1
      ).some((startRank) =>
        NUMBER_SUITS.every((suit) =>
          hasSequence(
            groups,
            suit,
            startRank
          )
        )
      );

    if (hasSanshokuDoujun) {
      addYaku(
        results,
        "sanshokuDoujun",
        "三色同順",
        closed ? 2 : 1
      );
    }

    const hasIttsuu =
      NUMBER_SUITS.some((suit) =>
        [1, 4, 7].every(
          (startRank) =>
            hasSequence(
              groups,
              suit,
              startRank
            )
        )
      );

    if (hasIttsuu) {
      addYaku(
        results,
        "ittsuu",
        "一気通貫",
        closed ? 2 : 1
      );
    }
  }

  if (
    isStandard &&
    pair &&
    groups.length === 4
  ) {
    const hasSequenceGroup =
      groups.some(
        (group) =>
          group.kind === "sequence"
      );

    const everyGroupHasYaochu =
      groups.every(isChantaGroup);

    const pairHasYaochu =
      isTerminalOrHonor(
        pair.suit,
        pair.rank
      );

    if (
      hasSequenceGroup &&
      everyGroupHasYaochu &&
      pairHasYaochu
    ) {
      const containsHonor =
        allTiles.some(
          (tile) =>
            tile.suit === "honor"
        );

      if (containsHonor) {
        addYaku(
          results,
          "chanta",
          "混全帯么九",
          closed ? 2 : 1
        );
      } else {
        addYaku(
          results,
          "junchan",
          "純全帯么九",
          closed ? 3 : 2
        );
      }
    }
  }

  const numberSuits =
    new Set<NumberSuit>();

  let containsHonor = false;

  for (const tile of allTiles) {
    if (tile.suit === "honor") {
      containsHonor = true;
    } else {
      numberSuits.add(tile.suit);
    }
  }

  if (numberSuits.size === 1) {
    if (containsHonor) {
      addYaku(
        results,
        "honitsu",
        "混一色",
        closed ? 3 : 2
      );
    } else {
      addYaku(
        results,
        "chinitsu",
        "清一色",
        closed ? 6 : 5
      );
    }
  }

  return results;
}
