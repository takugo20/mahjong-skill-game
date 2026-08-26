import {
  isYaochu
} from "./tiles";
import type {
  Meld,
  PlayerState,
  RoundAbortiveDrawReason,
  RoundFourKansDrawResult,
  RoundFourRiichiDrawResult,
  RoundFourWindsDrawResult,
  RoundNineTerminalsDrawResult,
  RoundState,
  SeatIndex,
  Tile,
  Wind
} from "./types";

const WIND_BY_HONOR_RANK:
  Partial<Record<number, Wind>> = {
    1: "east",
    2: "south",
    3: "west",
    4: "north"
  };

function getPlayersInSeatOrder(
  round: RoundState
): [
  PlayerState,
  PlayerState,
  PlayerState,
  PlayerState
] | null {
  const eastSeatPlayer =
    round.players.find(
      (player) => player.seat === 0
    );
  const southSeatPlayer =
    round.players.find(
      (player) => player.seat === 1
    );
  const westSeatPlayer =
    round.players.find(
      (player) => player.seat === 2
    );
  const northSeatPlayer =
    round.players.find(
      (player) => player.seat === 3
    );

  if (
    !eastSeatPlayer ||
    !southSeatPlayer ||
    !westSeatPlayer ||
    !northSeatPlayer
  ) {
    return null;
  }

  return [
    eastSeatPlayer,
    southSeatPlayer,
    westSeatPlayer,
    northSeatPlayer
  ];
}

function hasEstablishedCallOrKan(
  round: RoundState
): boolean {
  return (
    round.kanCount > 0 ||
    round.players.some(
      (player) =>
        player.melds.length > 0
    )
  );
}

function getTileTypeKey(
  tile: Pick<Tile, "suit" | "rank">
): string {
  return `${tile.suit}-${tile.rank}`;
}

export function countDistinctYaochuTypes(
  tiles: readonly Tile[]
): number {
  return new Set(
    tiles
      .filter(isYaochu)
      .map(getTileTypeKey)
  ).size;
}

export function getNineTerminalsDrawResult(
  round: RoundState,
  declarerSeat: SeatIndex
): RoundNineTerminalsDrawResult | null {
  if (
    round.phase !== "discarding" ||
    round.currentSeat !== declarerSeat ||
    hasEstablishedCallOrKan(round)
  ) {
    return null;
  }

  const declarer = round.players.find(
    (player) =>
      player.seat === declarerSeat
  );

  if (
    !declarer ||
    declarer.discards.length !== 0 ||
    declarer.hand.length !== 14 ||
    declarer.drawnTileId === null ||
    declarer.drawnTileSource !==
      "liveWall"
  ) {
    return null;
  }

  const distinctYaochuCount =
    countDistinctYaochuTypes(
      declarer.hand
    );

  if (distinctYaochuCount < 9) {
    return null;
  }

  return {
    reason: "nineTerminals",
    declarerSeat,
    distinctYaochuCount
  };
}

export function getFourWindsDrawResult(
  round: RoundState
): RoundFourWindsDrawResult | null {
  if (hasEstablishedCallOrKan(round)) {
    return null;
  }

  const players =
    getPlayersInSeatOrder(round);

  if (
    !players ||
    players.some(
      (player) =>
        player.discards.length !== 1
    )
  ) {
    return null;
  }

  const firstDiscards = players.map(
    (player) => player.discards[0]
  );
  const firstTile =
    firstDiscards[0]?.tile;

  if (
    !firstTile ||
    firstTile.suit !== "honor" ||
    firstDiscards.some(
      (discard) =>
        !discard ||
        discard.called ||
        discard.tile.suit !== "honor" ||
        discard.tile.rank !==
          firstTile.rank
    )
  ) {
    return null;
  }

  const wind =
    WIND_BY_HONOR_RANK[
      firstTile.rank
    ];

  if (!wind) {
    return null;
  }

  return {
    reason: "fourWinds",
    wind
  };
}

export function getFourRiichiDrawResult(
  round: RoundState
): RoundFourRiichiDrawResult | null {
  const players =
    getPlayersInSeatOrder(round);

  if (
    !players ||
    players.some(
      (player) => !player.riichi
    )
  ) {
    return null;
  }

  return {
    reason: "fourRiichi",
    riichiSeats: [
      players[0].seat,
      players[1].seat,
      players[2].seat,
      players[3].seat
    ]
  };
}

function isKanMeld(meld: Meld): boolean {
  return (
    meld.kind === "openKan" ||
    meld.kind === "closedKan" ||
    meld.kind === "addedKan"
  );
}

function countKans(
  player: PlayerState
): number {
  return player.melds.filter(
    isKanMeld
  ).length;
}

export function getFourKansDrawResult(
  round: RoundState
): RoundFourKansDrawResult | null {
  const players =
    getPlayersInSeatOrder(round);

  if (!players || round.kanCount !== 4) {
    return null;
  }

  const kanCountsBySeat:
    RoundFourKansDrawResult[
      "kanCountsBySeat"
    ] = [
      countKans(players[0]),
      countKans(players[1]),
      countKans(players[2]),
      countKans(players[3])
    ];

  const totalKanCount =
    kanCountsBySeat.reduce(
      (total, count) => total + count,
      0
    );
  const declarerCount =
    kanCountsBySeat.filter(
      (count) => count > 0
    ).length;

  if (
    totalKanCount !== 4 ||
    declarerCount < 2
  ) {
    return null;
  }

  return {
    reason: "fourKans",
    kanCountsBySeat
  };
}

export function getAbortiveDrawLabel(
  reason: RoundAbortiveDrawReason
): string {
  switch (reason) {
    case "nineTerminals":
      return "九種九牌";
    case "fourWinds":
      return "四風連打";
    case "fourRiichi":
      return "四家立直";
    case "fourKans":
      return "四槓散了";
    case "tripleRon":
      return "三家和";
  }
}
