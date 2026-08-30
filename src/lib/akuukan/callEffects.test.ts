import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialGameState
} from "../mahjong/engine";
import type {
  GameState,
  Meld,
  Tile
} from "../mahjong/types";
import type {
  AkuukanCallKind
} from "./callLegality";
import {
  AKUUKAN_E12_STEAL_POINTS,
  applyAkuukanE12AfterCall,
  applyAkuukanE15AfterCall
} from "./callEffects";
import {
  disableAkuukanSource
} from "./state";
import type {
  EnemyId
} from "./types";

function createState(
  enemyId: EnemyId = "enemy-4"
): GameState {
  return createInitialGameState(
    () => 0.5,
    {
      enemyId,
      equippedSkills: []
    }
  );
}

function applyE12(
  state: GameState,
  kind: AkuukanCallKind = "pon",
  callerIsSelectedEnemy = true,
  callerId =
    state.round.players[2].id
) {
  if (!state.akuukan) {
    throw new Error(
      "亜空間状態が初期化されていません。"
    );
  }

  return applyAkuukanE12AfterCall({
    akuukan: state.akuukan,
    callerIsSelectedEnemy,
    kind,
    callerId,
    players: state.round.players
  });
}

describe("E-12の副露後点数奪取", () => {
  it("敵4のポンで各他家から1000点ずつ奪う", () => {
    const state = createState();
    const originalScores =
      state.round.players.map(
        (player) => player.score
      );
    const result = applyE12(state);

    expect(result).not.toBeNull();

    if (!result) {
      throw new Error(
        "E-12が発動しませんでした。"
      );
    }

    expect(
      result.players.map(
        (player) => player.score
      )
    ).toEqual([
      24000,
      24000,
      28000,
      24000
    ]);
    expect(result.transfers).toEqual([
      {
        fromPlayerId:
          state.round.players[0].id,
        points:
          AKUUKAN_E12_STEAL_POINTS
      },
      {
        fromPlayerId:
          state.round.players[1].id,
        points:
          AKUUKAN_E12_STEAL_POINTS
      },
      {
        fromPlayerId:
          state.round.players[3].id,
        points:
          AKUUKAN_E12_STEAL_POINTS
      }
    ]);
    expect(result.totalStolenPoints).toBe(
      3000
    );
    expect(
      state.round.players.map(
        (player) => player.score
      )
    ).toEqual(originalScores);
  });

  it("大明槓では1000点未満の全持ち点だけを奪い0点からは奪わない", () => {
    const state = createState();

    state.round.players[0].score = 600;
    state.round.players[1].score = 0;
    state.round.players[2].score = 25000;
    state.round.players[3].score = 1500;

    const result = applyE12(
      state,
      "openKan"
    );

    expect(result).not.toBeNull();

    if (!result) {
      throw new Error(
        "E-12が発動しませんでした。"
      );
    }

    expect(
      result.players.map(
        (player) => player.score
      )
    ).toEqual([
      0,
      0,
      26600,
      500
    ]);
    expect(result.transfers).toEqual([
      {
        fromPlayerId:
          state.round.players[0].id,
        points: 600
      },
      {
        fromPlayerId:
          state.round.players[3].id,
        points: 1000
      }
    ]);
    expect(result.totalStolenPoints).toBe(
      1600
    );
  });

  it("呼出者が敵4本人でなければ発動しない", () => {
    const state = createState();
    const scoresBefore =
      state.round.players.map(
        (player) => player.score
      );

    expect(
      applyE12(
        state,
        "pon",
        false
      )
    ).toBeNull();
    expect(
      state.round.players.map(
        (player) => player.score
      )
    ).toEqual(scoresBefore);
  });

  it("チー・暗槓・加槓では発動しない", () => {
    for (
      const kind of [
        "chi",
        "closedKan",
        "addedKan"
      ] as const
    ) {
      expect(
        applyE12(
          createState(),
          kind
        )
      ).toBeNull();
    }
  });

  it("E-12が存在しないか無効なら発動しない", () => {
    const otherEnemy = createState(
      "enemy-1"
    );
    const disabled = createState();

    if (!disabled.akuukan) {
      throw new Error(
        "亜空間状態が初期化されていません。"
      );
    }

    disabled.akuukan =
      disableAkuukanSource(
        disabled.akuukan,
        "enemy-ability:E-12"
      );

    expect(
      applyE12(otherEnemy)
    ).toBeNull();
    expect(
      applyE12(disabled)
    ).toBeNull();
  });

  it("呼出者IDが対局者に存在しなければ発動しない", () => {
    const state = createState();

    expect(
      applyE12(
        state,
        "pon",
        true,
        "unknown-player"
      )
    ).toBeNull();
  });
});

let e15TileNumber = 0;

function createE15Tile(
  rank: number,
  red = false
): Tile {
  e15TileNumber += 1;

  return {
    id: `akuukan-e15-${e15TileNumber}`,
    suit: "man",
    rank,
    red
  };
}

function createE15Meld(
  kind: Meld["kind"],
  ranks: readonly number[]
): Meld {
  return {
    kind,
    tiles: ranks.map(
      (rank) => createE15Tile(rank)
    )
  };
}

function applyE15(
  state: GameState,
  kind: AkuukanCallKind,
  melds: readonly Meld[],
  meldIndex = 0,
  addedTileId?: string,
  callerIsSelectedEnemy = true
) {
  if (!state.akuukan) {
    throw new Error(
      "亜空間状態が初期化されていません。"
    );
  }

  return applyAkuukanE15AfterCall({
    akuukan: state.akuukan,
    callerIsSelectedEnemy,
    kind,
    melds,
    meldIndex,
    ...(addedTileId
      ? { addedTileId }
      : {})
  });
}

describe("E-15の副露面子赤ドラ化", () => {
  it("チーした面子全体だけを赤ドラ化し元データを変更しない", () => {
    const state = createState("enemy-8");
    const existingMeld = createE15Meld(
      "pon",
      [7, 7, 7]
    );
    const calledMeld = createE15Meld(
      "chi",
      [1, 2, 3]
    );
    const melds = [
      existingMeld,
      calledMeld
    ];
    const result = applyE15(
      state,
      "chi",
      melds,
      1
    );

    expect(result).not.toBeNull();

    if (!result) {
      throw new Error(
        "E-15が発動しませんでした。"
      );
    }

    expect(result.melds[0]).toBe(
      existingMeld
    );
    expect(
      result.melds[0].tiles.map(
        (tile) => tile.red
      )
    ).toEqual([false, false, false]);
    expect(
      result.melds[1].tiles.map(
        (tile) => tile.red
      )
    ).toEqual([true, true, true]);
    expect(result.redTileIds).toEqual(
      calledMeld.tiles.map(
        (tile) => tile.id
      )
    );
    expect(
      calledMeld.tiles.map(
        (tile) => tile.red
      )
    ).toEqual([false, false, false]);
  });

  it("ポンした3枚すべてを赤ドラ化する", () => {
    const state = createState("enemy-8");
    const meld = createE15Meld(
      "pon",
      [5, 5, 5]
    );
    const result = applyE15(
      state,
      "pon",
      [meld]
    );

    expect(
      result?.melds[0].tiles.map(
        (tile) => tile.red
      )
    ).toEqual([true, true, true]);
    expect(result?.redTileIds).toEqual(
      meld.tiles.map(
        (tile) => tile.id
      )
    );
  });

  it("大明槓した4枚すべてを赤ドラ化する", () => {
    const state = createState("enemy-8");
    const meld = createE15Meld(
      "openKan",
      [3, 3, 3, 3]
    );
    const result = applyE15(
      state,
      "openKan",
      [meld]
    );

    expect(
      result?.melds[0].tiles.map(
        (tile) => tile.red
      )
    ).toEqual([
      true,
      true,
      true,
      true
    ]);
    expect(result?.redTileIds).toHaveLength(
      4
    );
  });

  it("加槓では新しく加えた1枚だけを赤ドラ化する", () => {
    const state = createState("enemy-8");
    const meld = createE15Meld(
      "addedKan",
      [6, 6, 6, 6]
    );
    const addedTile = meld.tiles[3];
    const result = applyE15(
      state,
      "addedKan",
      [meld],
      0,
      addedTile.id
    );

    expect(
      result?.melds[0].tiles.map(
        (tile) => tile.red
      )
    ).toEqual([
      false,
      false,
      false,
      true
    ]);
    expect(result?.redTileIds).toEqual([
      addedTile.id
    ]);
  });

  it("暗槓は赤ドラ化の対象外とする", () => {
    const state = createState("enemy-8");
    const meld = createE15Meld(
      "closedKan",
      [4, 4, 4, 4]
    );

    expect(
      applyE15(
        state,
        "closedKan",
        [meld]
      )
    ).toBeNull();
    expect(
      meld.tiles.map(
        (tile) => tile.red
      )
    ).toEqual([
      false,
      false,
      false,
      false
    ]);
  });

  it("敵8本人以外・E-15不所持・能力無効なら発動しない", () => {
    const enemy8 = createState("enemy-8");
    const otherEnemy = createState(
      "enemy-1"
    );
    const disabled = createState(
      "enemy-8"
    );
    const meld = createE15Meld(
      "pon",
      [2, 2, 2]
    );

    if (!disabled.akuukan) {
      throw new Error(
        "亜空間状態が初期化されていません。"
      );
    }

    disabled.akuukan =
      disableAkuukanSource(
        disabled.akuukan,
        "enemy-ability:E-15"
      );

    expect(
      applyE15(
        enemy8,
        "pon",
        [meld],
        0,
        undefined,
        false
      )
    ).toBeNull();
    expect(
      applyE15(
        otherEnemy,
        "pon",
        [meld]
      )
    ).toBeNull();
    expect(
      applyE15(
        disabled,
        "pon",
        [meld]
      )
    ).toBeNull();
  });

  it("面子番号・面子種別・加槓牌IDが不正なら発動しない", () => {
    const state = createState("enemy-8");
    const pon = createE15Meld(
      "pon",
      [8, 8, 8]
    );
    const addedKan = createE15Meld(
      "addedKan",
      [9, 9, 9, 9]
    );

    expect(
      applyE15(
        state,
        "pon",
        [pon],
        1
      )
    ).toBeNull();
    expect(
      applyE15(
        state,
        "chi",
        [pon]
      )
    ).toBeNull();
    expect(
      applyE15(
        state,
        "addedKan",
        [addedKan],
        0,
        "unknown-tile"
      )
    ).toBeNull();
  });
});
