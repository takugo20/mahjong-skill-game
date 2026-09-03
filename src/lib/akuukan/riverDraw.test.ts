import {
  describe,
  expect,
  it
} from "vitest";
import type {
  Discard,
  PlayerState,
  SeatIndex,
  Tile,
  TileSuit,
  Wind
} from "../mahjong/types";
import {
  getAkuukanE28RiverDrawCandidates,
  isAkuukanE28RiverDrawEnabled,
  selectRandomAkuukanE28FaceDownCandidate,
  takeAkuukanE28RiverTile
} from "./riverDraw";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";
import type {
  AkuukanGameState,
  EnemyId
} from "./types";

let serialNumber = 0;

const SEAT_WINDS: readonly Wind[] = [
  "east",
  "south",
  "west",
  "north"
];

function createTile(
  suit: TileSuit,
  rank: number,
  red = false
): Tile {
  serialNumber += 1;

  return {
    id: `e28-river-draw-${serialNumber}`,
    suit,
    rank,
    red
  };
}

function createDiscard(
  tile: Tile,
  options: {
    readonly called?: boolean;
    readonly faceDown?: boolean;
  } = {}
): Discard {
  return {
    tile,
    tsumogiri: false,
    riichiDeclaration: false,
    faceDown:
      options.faceDown === true,
    called: options.called === true
  };
}

function createPlayer(
  seat: SeatIndex
): PlayerState {
  return {
    id: `player-${seat}`,
    name: `プレイヤー${seat}`,
    seat,
    seatWind: SEAT_WINDS[seat],
    score: 25000,
    hand: [],
    melds: [],
    discards: [],
    isDealer: seat === 0,
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    temporaryFuriten: false,
    riichiFuriten: false,
    drawnTileId: null,
    drawnTileSource: null
  };
}

function createPlayers(): PlayerState[] {
  return [
    createPlayer(0),
    createPlayer(1),
    createPlayer(2),
    createPlayer(3)
  ];
}

function createAkuukan(
  enemyId: EnemyId = "enemy-15"
): AkuukanGameState {
  return createInitialAkuukanGameState({
    enemyId,
    equippedSkills: []
  });
}

describe("E-28の河牌取得有効判定", () => {
  it("敵15本人のツモだけで有効になる", () => {
    const akuukan = createAkuukan();

    expect(
      isAkuukanE28RiverDrawEnabled(
        akuukan,
        true
      )
    ).toBe(true);
    expect(
      isAkuukanE28RiverDrawEnabled(
        akuukan,
        false
      )
    ).toBe(false);
    expect(
      isAkuukanE28RiverDrawEnabled(
        createAkuukan("enemy-14"),
        true
      )
    ).toBe(false);
  });

  it("E-28が無効化されていれば敵15本人でも発動しない", () => {
    const disabled = disableAkuukanSource(
      createAkuukan(),
      "enemy-ability:E-28"
    );

    expect(
      isAkuukanE28RiverDrawEnabled(
        disabled,
        true
      )
    ).toBe(false);
  });
});

describe("E-28の河牌候補", () => {
  it("全員の河と敵15自身の河から副露されていない牌を列挙する", () => {
    const players = createPlayers();
    const first = createTile("man", 1);
    const called = createTile("pin", 2);
    const faceDown = createTile("sou", 3);
    const other = createTile("honor", 4);
    const own = createTile("man", 5);

    players[0].discards = [
      createDiscard(first),
      createDiscard(called, {
        called: true
      }),
      createDiscard(faceDown, {
        faceDown: true
      })
    ];
    players[1].discards = [
      createDiscard(other)
    ];
    players[2].discards = [
      createDiscard(own)
    ];

    const candidates =
      getAkuukanE28RiverDrawCandidates({
        akuukan: createAkuukan(),
        drawerIsSelectedEnemy: true,
        players
      });

    expect(
      candidates.map((candidate) => ({
        tileId: candidate.tile.id,
        riverOwnerSeat:
          candidate.riverOwnerSeat,
        discardIndex:
          candidate.discardIndex
      }))
    ).toEqual([
      {
        tileId: first.id,
        riverOwnerSeat: 0,
        discardIndex: 0
      },
      {
        tileId: faceDown.id,
        riverOwnerSeat: 0,
        discardIndex: 2
      },
      {
        tileId: other.id,
        riverOwnerSeat: 1,
        discardIndex: 0
      },
      {
        tileId: own.id,
        riverOwnerSeat: 2,
        discardIndex: 0
      }
    ]);
  });

  it("能力対象外か河が空なら候補を返さない", () => {
    const players = createPlayers();

    expect(
      getAkuukanE28RiverDrawCandidates({
        akuukan: createAkuukan(),
        drawerIsSelectedEnemy: true,
        players
      })
    ).toEqual([]);

    players[0].discards = [
      createDiscard(createTile("man", 1))
    ];

    expect(
      getAkuukanE28RiverDrawCandidates({
        akuukan: createAkuukan(),
        drawerIsSelectedEnemy: false,
        players
      })
    ).toEqual([]);
  });
});

describe("E-28の裏向き河牌選択", () => {
  it("表向き牌を除外して裏向き牌だけからランダムに選ぶ", () => {
    const players = createPlayers();
    const faceUp = createTile("man", 1);
    const firstFaceDown = createTile(
      "pin",
      2
    );
    const secondFaceDown = createTile(
      "sou",
      3
    );

    players[0].discards = [
      createDiscard(faceUp),
      createDiscard(firstFaceDown, {
        faceDown: true
      })
    ];
    players[1].discards = [
      createDiscard(secondFaceDown, {
        faceDown: true
      })
    ];

    const candidates =
      getAkuukanE28RiverDrawCandidates({
        akuukan: createAkuukan(),
        drawerIsSelectedEnemy: true,
        players
      });

    expect(
      selectRandomAkuukanE28FaceDownCandidate(
        candidates,
        () => 0
      )?.tile
    ).toBe(firstFaceDown);
    expect(
      selectRandomAkuukanE28FaceDownCandidate(
        candidates,
        () => 0.999
      )?.tile
    ).toBe(secondFaceDown);
  });

  it("裏向き牌が河にない場合は選択しない", () => {
    const players = createPlayers();

    players[0].discards = [
      createDiscard(createTile("honor", 1))
    ];

    const candidates =
      getAkuukanE28RiverDrawCandidates({
        akuukan: createAkuukan(),
        drawerIsSelectedEnemy: true,
        players
      });

    expect(
      selectRandomAkuukanE28FaceDownCandidate(
        candidates,
        () => 0.5
      )
    ).toBeNull();
  });
});

describe("E-28の河牌取得", () => {
  it("同じ牌種のうち指定した物理牌だけを河と履歴から取り除く", () => {
    const players = createPlayers();
    const normalFive = createTile(
      "man",
      5
    );
    const redFive = createTile(
      "man",
      5,
      true
    );
    const otherDiscard = createTile(
      "pin",
      9
    );

    players[0].discards = [
      createDiscard(normalFive),
      createDiscard(redFive)
    ];
    players[1].discards = [
      createDiscard(otherDiscard)
    ];

    const result = takeAkuukanE28RiverTile({
      akuukan: createAkuukan(),
      drawerIsSelectedEnemy: true,
      players,
      riverOwnerSeat: 0,
      tileId: redFive.id
    });

    expect(result).not.toBeNull();
    expect(result?.drawnTile).toBe(redFive);
    expect(result?.riverOwnerSeat).toBe(0);
    expect(result?.discardIndex).toBe(1);
    expect(
      result?.players[0].discards.map(
        (discard) => discard.tile.id
      )
    ).toEqual([normalFive.id]);
    expect(
      result?.players[1].discards[0]
        .tile.id
    ).toBe(otherDiscard.id);

    expect(
      players[0].discards.map(
        (discard) => discard.tile.id
      )
    ).toEqual([
      normalFive.id,
      redFive.id
    ]);
    expect(result?.players).not.toBe(
      players
    );
    expect(result?.players[0]).not.toBe(
      players[0]
    );
    expect(result?.players[1]).toBe(
      players[1]
    );
  });

  it("敵15自身の河からも牌を取得できる", () => {
    const players = createPlayers();
    const ownDiscard = createTile(
      "sou",
      6
    );

    players[2].discards = [
      createDiscard(ownDiscard)
    ];

    const result = takeAkuukanE28RiverTile({
      akuukan: createAkuukan(),
      drawerIsSelectedEnemy: true,
      players,
      riverOwnerSeat: 2,
      tileId: ownDiscard.id
    });

    expect(result?.drawnTile).toBe(
      ownDiscard
    );
    expect(
      result?.players[2].discards
    ).toEqual([]);
  });

  it("存在しない牌・副露済み牌・能力無効時は取得しない", () => {
    const players = createPlayers();
    const calledTile = createTile(
      "honor",
      5
    );
    const availableTile = createTile(
      "pin",
      7
    );

    players[0].discards = [
      createDiscard(availableTile)
    ];
    players[3].discards = [
      createDiscard(calledTile, {
        called: true
      })
    ];

    expect(
      takeAkuukanE28RiverTile({
        akuukan: createAkuukan(),
        drawerIsSelectedEnemy: true,
        players,
        riverOwnerSeat: 3,
        tileId: calledTile.id
      })
    ).toBeNull();
    expect(
      takeAkuukanE28RiverTile({
        akuukan: createAkuukan(),
        drawerIsSelectedEnemy: true,
        players,
        riverOwnerSeat: 0,
        tileId: "missing-tile"
      })
    ).toBeNull();
    expect(
      takeAkuukanE28RiverTile({
        akuukan: disableAkuukanSource(
          createAkuukan(),
          "enemy-ability:E-28"
        ),
        drawerIsSelectedEnemy: true,
        players,
        riverOwnerSeat: 0,
        tileId: availableTile.id
      })
    ).toBeNull();
  });
});
