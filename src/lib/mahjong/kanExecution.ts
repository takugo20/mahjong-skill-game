import type {
  AddedKanOption,
  ClosedKanOption,
  OpenKanCallOption
} from "./kan";
import {
  advanceKanWall
} from "./kanWall";
import {
  sortTiles
} from "./tiles";
import type {
  Discard,
  Meld,
  PlayerState,
  RoundState,
  SeatIndex,
  Tile
} from "./types";

export interface SelfKanExecutionInput {
  round: RoundState;
  declarerSeat: SeatIndex;
  option:
    | ClosedKanOption
    | AddedKanOption;
}

export interface OpenKanExecutionInput {
  round: RoundState;
  option: OpenKanCallOption;
}

export type KanExecutionInput =
  | SelfKanExecutionInput
  | OpenKanExecutionInput;

export interface KanExecutionResult {
  round: RoundState;
  declarerSeat: SeatIndex;
  rinshanTile: Tile;
  replacementTile: Tile;
}

interface PreparedKan {
  declarerSeat: SeatIndex;
  handAfterDeclaration: Tile[];
  meldsAfterDeclaration: Meld[];
  calledDiscard: Discard | null;
  discarderSeat: SeatIndex | null;
}

function isSameTileType(
  left: Pick<Tile, "suit" | "rank">,
  right: Pick<Tile, "suit" | "rank">
): boolean {
  return (
    left.suit === right.suit &&
    left.rank === right.rank
  );
}

function getPlayer(
  round: RoundState,
  seat: SeatIndex
): PlayerState {
  const player = round.players.find(
    (candidate) => candidate.seat === seat
  );

  if (!player) {
    throw new Error(
      "槓を宣言したプレイヤーが見つかりません。"
    );
  }

  return player;
}

function getUniqueHandTiles(
  hand: readonly Tile[],
  tileIds: readonly string[]
): Tile[] {
  if (
    new Set(tileIds).size !==
    tileIds.length
  ) {
    throw new Error(
      "槓に使用する牌IDが重複しています。"
    );
  }

  const tileById = new Map(
    hand.map((tile) => [tile.id, tile])
  );
  const tiles = tileIds.map(
    (tileId) => tileById.get(tileId)
  );

  if (
    tiles.some(
      (tile): tile is undefined =>
        tile === undefined
    )
  ) {
    throw new Error(
      "槓に使用する牌が手牌にありません。"
    );
  }

  return tiles as Tile[];
}

function validateSameTileType(
  tiles: readonly Tile[]
): void {
  const firstTile = tiles[0];

  if (
    !firstTile ||
    tiles.some(
      (tile) =>
        !isSameTileType(tile, firstTile)
    )
  ) {
    throw new Error(
      "槓には同じ牌種4枚が必要です。"
    );
  }
}

function removeHandTiles(
  hand: readonly Tile[],
  usedTiles: readonly Tile[]
): Tile[] {
  const usedTileIds = new Set(
    usedTiles.map((tile) => tile.id)
  );

  return hand.filter(
    (tile) => !usedTileIds.has(tile.id)
  );
}

function prepareClosedKan(
  input: SelfKanExecutionInput,
  option: ClosedKanOption
): PreparedKan {
  if (
    input.round.phase !== "discarding" ||
    input.round.currentSeat !==
      input.declarerSeat
  ) {
    throw new Error(
      "暗槓できる手番ではありません。"
    );
  }

  const declarer = getPlayer(
    input.round,
    input.declarerSeat
  );
  const kanTiles = getUniqueHandTiles(
    declarer.hand,
    option.tileIds
  );

  validateSameTileType(kanTiles);

  return {
    declarerSeat: input.declarerSeat,
    handAfterDeclaration:
      removeHandTiles(
        declarer.hand,
        kanTiles
      ),
    meldsAfterDeclaration: [
      ...declarer.melds,
      {
        kind: "closedKan",
        tiles: sortTiles(kanTiles)
      }
    ],
    calledDiscard: null,
    discarderSeat: null
  };
}

function prepareAddedKan(
  input: SelfKanExecutionInput,
  option: AddedKanOption
): PreparedKan {
  if (
    input.round.phase !== "discarding" ||
    input.round.currentSeat !==
      input.declarerSeat
  ) {
    throw new Error(
      "加槓できる手番ではありません。"
    );
  }

  const declarer = getPlayer(
    input.round,
    input.declarerSeat
  );
  const originalMeld =
    declarer.melds[option.meldIndex];

  if (
    !originalMeld ||
    originalMeld.kind !== "pon" ||
    originalMeld.tiles.length !== 3
  ) {
    throw new Error(
      "加槓の対象となるポンがありません。"
    );
  }

  const [addedTile] = getUniqueHandTiles(
    declarer.hand,
    [option.tileId]
  );
  const originalTile =
    originalMeld.tiles[0];

  if (
    !originalTile ||
    !isSameTileType(
      addedTile,
      originalTile
    )
  ) {
    throw new Error(
      "加槓牌がポンと同じ牌種ではありません。"
    );
  }

  const kanTiles = [
    ...originalMeld.tiles,
    addedTile
  ];

  validateSameTileType(kanTiles);

  const addedMeld: Meld = {
    ...originalMeld,
    kind: "addedKan",
    tiles: sortTiles(kanTiles)
  };

  return {
    declarerSeat: input.declarerSeat,
    handAfterDeclaration:
      removeHandTiles(
        declarer.hand,
        [addedTile]
      ),
    meldsAfterDeclaration:
      declarer.melds.map(
        (meld, meldIndex) =>
          meldIndex === option.meldIndex
            ? addedMeld
            : meld
      ),
    calledDiscard: null,
    discarderSeat: null
  };
}

function prepareOpenKan(
  input: OpenKanExecutionInput
): PreparedKan {
  const option = input.option;
  const lastDiscard =
    input.round.lastDiscard;

  if (
    input.round.phase !== "reaction" ||
    option.callerSeat ===
      option.discarderSeat ||
    !lastDiscard ||
    lastDiscard.seat !==
      option.discarderSeat ||
    lastDiscard.discard.tile.id !==
      option.calledTileId
  ) {
    throw new Error(
      "大明槓の対象となる捨て牌がありません。"
    );
  }

  const declarer = getPlayer(
    input.round,
    option.callerSeat
  );
  const handTiles = getUniqueHandTiles(
    declarer.hand,
    option.handTileIds
  );
  const calledTile =
    lastDiscard.discard.tile;
  const kanTiles = [
    ...handTiles,
    calledTile
  ];

  validateSameTileType(kanTiles);

  return {
    declarerSeat: option.callerSeat,
    handAfterDeclaration:
      removeHandTiles(
        declarer.hand,
        handTiles
      ),
    meldsAfterDeclaration: [
      ...declarer.melds,
      {
        kind: "openKan",
        tiles: sortTiles(kanTiles),
        calledFrom: option.discarderSeat,
        calledTileId: calledTile.id
      }
    ],
    calledDiscard: {
      ...lastDiscard.discard,
      called: true
    },
    discarderSeat: option.discarderSeat
  };
}

function prepareKan(
  input: KanExecutionInput
): PreparedKan {
  if (isOpenKanExecutionInput(input)) {
    return prepareOpenKan(input);
  }

  return input.option.kind === "closedKan"
    ? prepareClosedKan(
        input,
        input.option
      )
    : prepareAddedKan(
        input,
        input.option
      );
}

function isOpenKanExecutionInput(
  input: KanExecutionInput
): input is OpenKanExecutionInput {
  return input.option.kind === "openKan";
}

function updatePlayers(
  round: RoundState,
  prepared: PreparedKan,
  rinshanTile: Tile
): PlayerState[] {
  return round.players.map(
    (player): PlayerState => {
      const withoutIppatsu = {
        ...player,
        ippatsu: false
      };

      if (
        player.seat ===
        prepared.declarerSeat
      ) {
        return {
          ...withoutIppatsu,
          hand: sortTiles([
            ...prepared
              .handAfterDeclaration,
            rinshanTile
          ]),
          melds:
            prepared.meldsAfterDeclaration,
          temporaryFuriten: false,
          drawnTileId: rinshanTile.id
        };
      }

      if (
        prepared.calledDiscard &&
        player.seat ===
          prepared.discarderSeat
      ) {
        return {
          ...withoutIppatsu,
          discards: player.discards.map(
            (discard) =>
              discard.tile.id ===
              prepared.calledDiscard
                ?.tile.id
                ? prepared.calledDiscard
                : discard
          )
        };
      }

      return withoutIppatsu;
    }
  );
}

export function executeKan(
  input: KanExecutionInput
): KanExecutionResult {
  const prepared = prepareKan(input);
  const rinshanDraw = advanceKanWall({
    liveWall: input.round.liveWall,
    deadWall: input.round.deadWall,
    kanCount: input.round.kanCount,
    doraIndicatorCount:
      input.round.doraIndicatorCount,
    rinshanDrawCount:
      input.round.rinshanDrawCount
  });
  const lastDiscard =
    prepared.calledDiscard &&
    prepared.discarderSeat !== null
      ? {
          seat: prepared.discarderSeat,
          discard:
            prepared.calledDiscard
        }
      : input.round.lastDiscard;

  return {
    declarerSeat: prepared.declarerSeat,
    rinshanTile:
      rinshanDraw.rinshanTile,
    replacementTile:
      rinshanDraw.replacementTile,
    round: {
      ...input.round,
      liveWall: rinshanDraw.liveWall,
      deadWall: rinshanDraw.deadWall,
      players: updatePlayers(
        input.round,
        prepared,
        rinshanDraw.rinshanTile
      ),
      currentSeat: prepared.declarerSeat,
      phase: "discarding",
      lastDiscard,
      meldCallOptions: [],
      meldCallDiscardRestriction: null,
      kanCount: rinshanDraw.kanCount,
      doraIndicatorCount:
        rinshanDraw.doraIndicatorCount,
      rinshanDrawCount:
        rinshanDraw.rinshanDrawCount
    }
  };
}
