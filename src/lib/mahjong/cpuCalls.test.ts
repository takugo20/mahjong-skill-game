import {
  describe,
  expect,
  it
} from "vitest";
import {
  getMeldCallOptions
} from "./calls";
import {
  chooseCpuMeldCall
} from "./cpuCalls";
import type {
  Meld,
  PlayerState,
  SeatIndex,
  Tile,
  TileSuit
} from "./types";

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number
): Tile {
  serialNumber += 1;

  return {
    id: `cpu-call-${serialNumber}`,
    suit,
    rank,
    red: false
  };
}

function createTiles(
  suit: TileSuit,
  ranks: readonly number[]
): Tile[] {
  return ranks.map(
    (rank) => createTile(suit, rank)
  );
}

function createCpuPlayer(
  hand: Tile[],
  melds: Meld[] = []
): PlayerState {
  return {
    id: "cpu-call-player",
    name: "CPU・右",
    seat: 1,
    seatWind: "south",
    score: 25000,
    hand,
    melds,
    discards: [],
    isDealer: false,
    riichi: false,
    ippatsu: false,
    drawnTileId: null
  };
}

function createOptions(
  player: PlayerState,
  calledTile: Tile,
  discarderSeat: SeatIndex = 0
) {
  return getMeldCallOptions({
    callerSeat: player.seat,
    discarderSeat,
    calledTile,
    concealedTiles: player.hand,
    callerRiichi: player.riichi,
    liveWallTileCount: 40
  });
}

describe("CPUの副露判断", () => {
  it("役牌をポンして向聴数が進む場合は鳴く", () => {
    const calledTile =
      createTile("honor", 5);
    const discardTile =
      createTile("man", 9);
    const player = createCpuPlayer([
      ...createTiles("honor", [5, 5]),
      ...createTiles("man", [2, 2]),
      discardTile,
      ...createTiles(
        "pin",
        [1, 2, 3, 4, 5, 6]
      ),
      ...createTiles("sou", [7, 8])
    ]);

    const result = chooseCpuMeldCall({
      player,
      prevailingWind: "east",
      calledTile,
      options: createOptions(
        player,
        calledTile
      )
    });

    expect(result?.option.kind).toBe(
      "pon"
    );
    expect(result?.discardTileId).toBe(
      discardTile.id
    );
    expect(result?.shantenBefore).toBe(1);
    expect(result?.shantenAfter).toBe(0);
  });

  it("喰いタンを維持して向聴数が進む場合はチーする", () => {
    const calledTile =
      createTile("man", 4);
    const discardTile =
      createTile("honor", 7);
    const player = createCpuPlayer([
      ...createTiles("man", [5, 6, 7, 8]),
      ...createTiles(
        "pin",
        [2, 2, 2, 3, 4]
      ),
      ...createTiles("sou", [5, 6, 7]),
      discardTile
    ]);

    const result = chooseCpuMeldCall({
      player,
      prevailingWind: "east",
      calledTile,
      options: createOptions(
        player,
        calledTile
      )
    });

    expect(result?.option.kind).toBe(
      "chi"
    );
    expect(result?.discardTileId).toBe(
      discardTile.id
    );
    expect(result?.shantenBefore).toBe(1);
    expect(result?.shantenAfter).toBe(0);
  });

  it("役牌の副露があれば么九牌を含むチーも選べる", () => {
    const calledTile =
      createTile("man", 1);
    const discardTile =
      createTile("honor", 7);
    const valueHonorTiles =
      createTiles("honor", [5, 5, 5]);
    const valueHonorMeld: Meld = {
      kind: "pon",
      tiles: valueHonorTiles,
      calledFrom: 0,
      calledTileId:
        valueHonorTiles[0].id
    };
    const player = createCpuPlayer(
      [
        ...createTiles("man", [2, 3]),
        ...createTiles(
          "pin",
          [2, 2, 2, 3, 4]
        ),
        ...createTiles("sou", [7, 8]),
        discardTile
      ],
      [valueHonorMeld]
    );

    const result = chooseCpuMeldCall({
      player,
      prevailingWind: "east",
      calledTile,
      options: createOptions(
        player,
        calledTile
      )
    });

    expect(result?.option.kind).toBe(
      "chi"
    );
    expect(result?.discardTileId).toBe(
      discardTile.id
    );
    expect(result?.shantenBefore).toBe(1);
    expect(result?.shantenAfter).toBe(0);
  });

  it("副露後に確実な役がなくなる場合は鳴かない", () => {
    const calledTile =
      createTile("man", 1);
    const player = createCpuPlayer([
      ...createTiles("man", [2, 3, 7, 8]),
      ...createTiles(
        "pin",
        [2, 2, 2, 3, 4]
      ),
      ...createTiles("sou", [5, 6, 7]),
      createTile("honor", 7)
    ]);

    const result = chooseCpuMeldCall({
      player,
      prevailingWind: "east",
      calledTile,
      options: createOptions(
        player,
        calledTile
      )
    });

    expect(result).toBeNull();
  });

  it("鳴いても向聴数が進まない場合は鳴かない", () => {
    const calledTile =
      createTile("honor", 5);
    const player = createCpuPlayer([
      ...createTiles("honor", [5, 5]),
      ...createTiles(
        "man",
        [1, 2, 3, 4, 5, 6]
      ),
      ...createTiles("pin", [7, 8, 9]),
      ...createTiles("sou", [2, 3])
    ]);

    const result = chooseCpuMeldCall({
      player,
      prevailingWind: "east",
      calledTile,
      options: createOptions(
        player,
        calledTile
      )
    });

    expect(result).toBeNull();
  });

  it("チー直後の筋喰い替えを避けて合法牌を捨てる", () => {
    const calledTile =
      createTile("man", 4);
    const forbiddenSeven =
      createTile("man", 7);
    const discardTile =
      createTile("pin", 8);
    const player = createCpuPlayer([
      ...createTiles("man", [5, 6]),
      forbiddenSeven,
      createTile("man", 8),
      ...createTiles(
        "pin",
        [2, 2, 2, 3, 4]
      ),
      discardTile,
      ...createTiles("sou", [5, 6, 7])
    ]);

    const result = chooseCpuMeldCall({
      player,
      prevailingWind: "east",
      calledTile,
      options: createOptions(
        player,
        calledTile
      )
    });

    expect(result?.option.kind).toBe(
      "chi"
    );
    expect(result?.discardTileId).toBe(
      discardTile.id
    );
    expect(result?.discardTileId).not.toBe(
      forbiddenSeven.id
    );
  });

  it("プレイヤー・立直中のCPU・候補なしでは鳴かない", () => {
    const calledTile =
      createTile("honor", 5);
    const player = createCpuPlayer([
      ...createTiles("honor", [5, 5]),
      ...createTiles("man", [2, 2, 9]),
      ...createTiles(
        "pin",
        [1, 2, 3, 4, 5, 6]
      ),
      ...createTiles("sou", [7, 8])
    ]);
    const options = createOptions(
      player,
      calledTile
    );

    expect(
      chooseCpuMeldCall({
        player: {
          ...player,
          seat: 0
        },
        prevailingWind: "east",
        calledTile,
        options
      })
    ).toBeNull();

    expect(
      chooseCpuMeldCall({
        player: {
          ...player,
          riichi: true
        },
        prevailingWind: "east",
        calledTile,
        options
      })
    ).toBeNull();

    expect(
      chooseCpuMeldCall({
        player,
        prevailingWind: "east",
        calledTile,
        options: []
      })
    ).toBeNull();
  });
});
