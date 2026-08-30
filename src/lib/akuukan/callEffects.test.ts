import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialGameState
} from "../mahjong/engine";
import type {
  GameState
} from "../mahjong/types";
import type {
  AkuukanCallKind
} from "./callLegality";
import {
  AKUUKAN_E12_STEAL_POINTS,
  applyAkuukanE12AfterCall
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
