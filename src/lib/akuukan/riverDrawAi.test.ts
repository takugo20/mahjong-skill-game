import {
  describe,
  expect,
  it
} from "vitest";
import type {
  PlayerState,
  Tile,
  TileSuit,
  Wind
} from "../mahjong/types";
import type {
  AkuukanE28RiverDrawCandidate
} from "./riverDraw";
import {
  selectAkuukanE28RiverDrawCandidate
} from "./riverDrawAi";

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
    id: `e28-river-ai-${serialNumber}`,
    suit,
    rank,
    red
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

function createDrawer(
  hand: Tile[]
): PlayerState {
  return {
    id: "enemy-15-player",
    name: "敵15",
    seat: 2,
    seatWind: SEAT_WINDS[2],
    score: 25000,
    hand,
    melds: [],
    discards: [],
    isDealer: false,
    riichi: false,
    doubleRiichi: false,
    ippatsu: false,
    temporaryFuriten: false,
    riichiFuriten: false,
    drawnTileId: null,
    drawnTileSource: null
  };
}

function createRiverOwner(
  hand: Tile[],
  discardedTiles: Tile[]
): PlayerState {
  return {
    ...createDrawer(hand),
    id: "river-owner",
    name: "河牌の所有者",
    seat: 0,
    seatWind: "east",
    discards: discardedTiles.map(
      (tile) => ({
        tile,
        tsumogiri: false,
        riichiDeclaration: false,
        faceDown: false,
        called: false
      })
    )
  };
}

function createCandidate(
  tile: Tile,
  options: {
    readonly riverOwnerSeat?: 0 | 1 | 2 | 3;
    readonly discardIndex?: number;
    readonly faceDown?: boolean;
  } = {}
): AkuukanE28RiverDrawCandidate {
  return {
    tile,
    riverOwnerSeat:
      options.riverOwnerSeat ?? 0,
    discardIndex:
      options.discardIndex ?? 0,
    faceDown:
      options.faceDown === true
  };
}

function createSingleWaitHand(): Tile[] {
  return [
    ...createTiles("man", [1, 2, 3]),
    ...createTiles("pin", [1, 2, 3]),
    ...createTiles("sou", [1, 2, 3]),
    ...createTiles("honor", [1, 1, 1]),
    createTile("pin", 5)
  ];
}

function createOneShantenHand(): Tile[] {
  return [
    ...createTiles("man", [1, 2, 3, 5]),
    ...createTiles("pin", [1, 2, 3, 9]),
    ...createTiles("sou", [1, 2, 3]),
    ...createTiles("honor", [1, 1])
  ];
}

describe("敵15 E-28の河牌選択AI", () => {
  it("その場でツモ和了できる牌を選ぶ", () => {
    const drawer = createDrawer(
      createSingleWaitHand()
    );
    const unrelated = createCandidate(
      createTile("man", 9)
    );
    const winning = createCandidate(
      createTile("pin", 5),
      {
        riverOwnerSeat: 1,
        discardIndex: 2
      }
    );

    expect(
      selectAkuukanE28RiverDrawCandidate({
        drawer,
        candidates: [unrelated, winning]
      })
    ).toBe(winning);
  });

  it("七対子を完成させる牌もツモ和了候補として選ぶ", () => {
    const drawer = createDrawer([
      ...createTiles(
        "man",
        [1, 1, 2, 2, 3, 3]
      ),
      ...createTiles(
        "pin",
        [4, 4, 5, 5, 6, 6]
      ),
      createTile("sou", 9)
    ]);
    const winning = createCandidate(
      createTile("sou", 9)
    );

    expect(
      selectAkuukanE28RiverDrawCandidate({
        drawer,
        candidates: [winning]
      })
    ).toBe(winning);
  });

  it("一向聴から聴牌へ進める牌を選ぶ", () => {
    const drawer = createDrawer(
      createOneShantenHand()
    );
    const unrelated = createCandidate(
      createTile("honor", 7)
    );
    const tenpai = createCandidate(
      createTile("man", 4),
      {
        riverOwnerSeat: 3
      }
    );

    expect(
      selectAkuukanE28RiverDrawCandidate({
        drawer,
        candidates: [unrelated, tenpai]
      })
    ).toBe(tenpai);
  });

  it("向聴数が進まない表向き牌しかなければ通常山を選ぶ", () => {
    const drawer = createDrawer(
      createOneShantenHand()
    );

    expect(
      selectAkuukanE28RiverDrawCandidate({
        drawer,
        candidates: [
          createCandidate(
            createTile("honor", 7)
          ),
          createCandidate(
            createTile("sou", 9)
          )
        ]
      })
    ).toBeNull();
  });

  it("裏向き牌が和了牌でも内容を参照せず通常山を選ぶ", () => {
    const drawer = createDrawer(
      createSingleWaitHand()
    );
    const hiddenWinning = createCandidate(
      createTile("pin", 5),
      {
        faceDown: true
      }
    );

    expect(
      selectAkuukanE28RiverDrawCandidate({
        drawer,
        candidates: [hiddenWinning]
      })
    ).toBeNull();
  });

    it("向聴数が同じなら通常山の受け入れ枚数を増やす牌を選ぶ", () => {
    const drawer = createDrawer(
      createSingleWaitHand()
    );
    const acceptanceImprovement =
      createCandidate(
        createTile("pin", 6)
      );
    const redDora = createCandidate(
      createTile("man", 9, true),
      {
        riverOwnerSeat: 1
      }
    );

    expect(
      selectAkuukanE28RiverDrawCandidate({
        drawer,
        candidates: [
          redDora,
          acceptanceImprovement
        ],
        liveWall: [
          createTile("pin", 5),
          createTile("pin", 4),
          createTile("pin", 4),
          createTile("pin", 7),
          createTile("pin", 7)
        ],
        doraIndicators: [
          createTile("man", 8)
        ]
      })
    ).toBe(acceptanceImprovement);
  });

  it("受け入れを増やす牌がなければ最も価値が高いドラ・赤ドラを選ぶ", () => {
    const drawer = createDrawer(
      createSingleWaitHand()
    );
    const unrelated = createCandidate(
      createTile("honor", 7)
    );
    const normalDora = createCandidate(
      createTile("man", 9),
      {
        riverOwnerSeat: 1
      }
    );
    const redDora = createCandidate(
      createTile("man", 9, true),
      {
        riverOwnerSeat: 3
      }
    );

    expect(
      selectAkuukanE28RiverDrawCandidate({
        drawer,
        candidates: [
          unrelated,
          normalDora,
          redDora
        ],
        doraIndicators: [
          createTile("man", 8)
        ]
      })
    ).toBe(redDora);
  });

    it("小さな改善で他家の捨て牌振聴を解除する河牌は避ける", () => {
    const drawer = createDrawer(
      createSingleWaitHand()
    );
    const riskyTile = createTile(
      "pin",
      6
    );
    const riskyCandidate = createCandidate(
      riskyTile,
      {
        riverOwnerSeat: 0,
        discardIndex: 0
      }
    );
    const riverOwner = createRiverOwner(
      [
        ...createTiles("man", [1, 2, 3]),
        ...createTiles("pin", [1, 2, 3]),
        ...createTiles("sou", [1, 2, 3]),
        ...createTiles(
          "honor",
          [1, 1, 1]
        ),
        createTile("pin", 6)
      ],
      [riskyTile]
    );

    expect(
      selectAkuukanE28RiverDrawCandidate({
        drawer,
        players: [riverOwner, drawer],
        candidates: [riskyCandidate],
        liveWall: [
          createTile("pin", 5),
          createTile("pin", 4),
          createTile("pin", 4),
          createTile("pin", 7),
          createTile("pin", 7)
        ]
      })
    ).toBeNull();
  });

  it("向聴数が進むなら他家の振聴解除より手牌改善を優先する", () => {
    const drawer = createDrawer(
      createOneShantenHand()
    );
    const improvingTile = createTile(
      "man",
      4
    );
    const improvingCandidate =
      createCandidate(
        improvingTile,
        {
          riverOwnerSeat: 0,
          discardIndex: 0
        }
      );
    const riverOwner = createRiverOwner(
      [
        ...createTiles("man", [1, 2, 3]),
        ...createTiles("pin", [1, 2, 3]),
        ...createTiles("sou", [1, 2, 3]),
        ...createTiles(
          "honor",
          [1, 1, 1]
        ),
        createTile("man", 4)
      ],
      [improvingTile]
    );

    expect(
      selectAkuukanE28RiverDrawCandidate({
        drawer,
        players: [riverOwner, drawer],
        candidates: [
          improvingCandidate
        ]
      })
    ).toBe(improvingCandidate);
  });

  it("同じ和了牌の履歴が残るなら受け入れを増やす河牌を選ぶ", () => {
    const drawer = createDrawer(
      createSingleWaitHand()
    );
    const selectedTile = createTile(
      "pin",
      6
    );
    const remainingTile = createTile(
      "pin",
      6
    );
    const candidate = createCandidate(
      selectedTile,
      {
        riverOwnerSeat: 0,
        discardIndex: 0
      }
    );
    const riverOwner = createRiverOwner(
      [
        ...createTiles("man", [1, 2, 3]),
        ...createTiles("pin", [1, 2, 3]),
        ...createTiles("sou", [1, 2, 3]),
        ...createTiles(
          "honor",
          [1, 1, 1]
        ),
        createTile("pin", 6)
      ],
      [selectedTile, remainingTile]
    );

    expect(
      selectAkuukanE28RiverDrawCandidate({
        drawer,
        players: [riverOwner, drawer],
        candidates: [candidate],
        liveWall: [
          createTile("pin", 5),
          createTile("pin", 4),
          createTile("pin", 4),
          createTile("pin", 7),
          createTile("pin", 7)
        ]
      })
    ).toBe(candidate);
  });

  it("自分の河にある唯一の和了牌を回収候補にできる", () => {
    const drawer = createDrawer(
      createSingleWaitHand()
    );
    const ownWinningTile = createTile(
      "pin",
      5
    );

    drawer.discards = [{
      tile: ownWinningTile,
      tsumogiri: false,
      riichiDeclaration: false,
      faceDown: false,
      called: false
    }];

    const ownRecovery = createCandidate(
      ownWinningTile,
      {
        riverOwnerSeat: 2,
        discardIndex: 0
      }
    );

    expect(
      selectAkuukanE28RiverDrawCandidate({
        drawer,
        candidates: [ownRecovery]
      })
    ).toBe(ownRecovery);
  });
});
