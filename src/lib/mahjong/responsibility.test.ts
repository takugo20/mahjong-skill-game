import {
  describe,
  expect,
  it
} from "vitest";
import {
  getYakumanResponsibilities
} from "./responsibility";
import type {
  Meld,
  MeldKind,
  SeatIndex,
  Tile,
  TileSuit
} from "./types";

let serialNumber = 0;

function createTiles(
  suit: TileSuit,
  rank: number,
  count: 3 | 4
): Tile[] {
  return Array.from(
    { length: count },
    () => {
      serialNumber += 1;

      return {
        id:
          `responsibility-${suit}-${rank}-` +
          serialNumber,
        suit,
        rank,
        red: false
      };
    }
  );
}

function createMeld(
  rank: number,
  calledFrom: SeatIndex,
  kind: Extract<
    MeldKind,
    "pon" | "openKan" | "addedKan"
  > = "pon"
): Meld {
  return {
    kind,
    tiles: createTiles(
      "honor",
      rank,
      kind === "pon" ? 3 : 4
    ),
    calledFrom,
    calledTileId:
      `called-${rank}-${serialNumber}`
  };
}

function createClosedKan(
  rank: number
): Meld {
  return {
    kind: "closedKan",
    tiles: createTiles(
      "honor",
      rank,
      4
    )
  };
}

function createNumberKan(
  suit: Exclude<TileSuit, "honor">,
  rank: number,
  kind: "openKan" | "closedKan",
  calledFrom?: SeatIndex
): Meld {
  return {
    kind,
    tiles: createTiles(suit, rank, 4),
    calledFrom
  };
}

describe("責任払いの責任者判定", () => {
  it("3種類目の三元牌をポンさせた者を大三元の責任者にする", () => {
    const result =
      getYakumanResponsibilities([
        createMeld(5, 1),
        createMeld(6, 2),
        createMeld(7, 3)
      ]);

    expect(result).toEqual([
      {
        yakumanId:
          "bigThreeDragons",
        yakumanMultiplier: 1,
        responsibleSeat: 3
      }
    ]);
  });

  it("3種類目の三元牌を大明槓させた者も責任者にする", () => {
    const result =
      getYakumanResponsibilities([
        createMeld(7, 3),
        createMeld(5, 1),
        createMeld(
          6,
          2,
          "openKan"
        )
      ]);

    expect(result[0]).toEqual({
      yakumanId: "bigThreeDragons",
      yakumanMultiplier: 1,
      responsibleSeat: 2
    });
  });

  it("ポンを加槓した後も元の責任者を維持する", () => {
    const result =
      getYakumanResponsibilities([
        createMeld(5, 1),
        createMeld(6, 2),
        createMeld(
          7,
          3,
          "addedKan"
        )
      ]);

    expect(result[0]?.responsibleSeat).toBe(
      3
    );
  });

  it("最後の三元牌を暗槓で完成した場合は責任払いにしない", () => {
    const result =
      getYakumanResponsibilities([
        createMeld(5, 1),
        createMeld(6, 2),
        createClosedKan(7)
      ]);

    expect(result).toEqual([]);
  });

  it("4種類目の風牌を鳴かせた者を大四喜の責任者にする", () => {
    const result =
      getYakumanResponsibilities([
        createMeld(2, 1),
        createMeld(4, 2),
        createMeld(1, 3),
        createMeld(3, 1)
      ]);

    expect(result).toEqual([
      {
        yakumanId: "bigFourWinds",
        yakumanMultiplier: 2,
        responsibleSeat: 1
      }
    ]);
  });

  it("3副露と暗刻・暗槓で大四喜にしても責任払いにしない", () => {
    const withConcealedTriplet =
      getYakumanResponsibilities([
        createMeld(1, 1),
        createMeld(2, 2),
        createMeld(3, 3)
      ]);
    const withClosedKan =
      getYakumanResponsibilities([
        createMeld(1, 1),
        createMeld(2, 2),
        createMeld(3, 3),
        createClosedKan(4)
      ]);

    expect(
      withConcealedTriplet
    ).toEqual([]);
    expect(withClosedKan).toEqual([]);
  });

  it("四槓子だけでは責任払いを設定しない", () => {
    const result =
      getYakumanResponsibilities([
        createMeld(
          1,
          1,
          "openKan"
        ),
        createMeld(
          2,
          2,
          "openKan"
        ),
        createNumberKan(
          "man",
          1,
          "openKan",
          3
        ),
        createNumberKan(
          "pin",
          9,
          "closedKan"
        )
      ]);

    expect(result).toEqual([]);
  });
});
