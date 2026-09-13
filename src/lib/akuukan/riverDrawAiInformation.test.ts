import { expect, it } from "vitest";
import { createInitialGameState } from "../mahjong/engine";
import {
  selectAkuukanE28RiverDrawCandidate as choose
} from "./riverDrawAi";
import type { Tile, TileSuit } from "../mahjong/types";
import type { AkuukanE28RiverDrawCandidate } from "./riverDraw";

let serial = 0;

function t(
  suit: TileSuit,
  rank: number,
  red = false
): Tile {
  return {
    id: `river-info-${++serial}`,
    suit,
    rank,
    red
  };
}

function ts(suit: TileSuit, ranks: number[]) {
  return ranks.map(rank => t(suit, rank));
}

function candidate(
  tile: Tile,
  faceDown = false
): AkuukanE28RiverDrawCandidate {
  return {
    tile,
    faceDown,
    riverOwnerSeat: 0,
    discardIndex: 0
  };
}

function fixture() {
  const state = createInitialGameState(
    () => 0.5,
    { enemyId: "enemy-15", equippedSkills: [] }
  );

  const drawer = state.round.players[2];

  drawer.hand = [
    ...ts("man", [1, 2, 3]),
    ...ts("pin", [1, 2, 3]),
    ...ts("sou", [1, 2, 3]),
    ...ts("honor", [1, 1, 1]),
    t("pin", 5)
  ];
  drawer.melds = [];
  drawer.discards = [];
  drawer.drawnTileId = null;

  return { state, drawer };
}

it("役なしの完成形を即ツモ和了と誤認しない", () => {
  const { drawer } = fixture();

  drawer.hand = [
    ...ts("pin", [4, 5, 6]),
    ...ts("sou", [7, 8, 9]),
    ...ts("honor", [5, 5]),
    ...ts("man", [9, 9])
  ];
  drawer.melds = [{
    kind: "chi",
    tiles: ts("man", [1, 2, 3]),
    calledTileId: "open",
    calledFrom: 1
  }];

  const noYaku = candidate(t("man", 9));
  const withYaku = candidate(t("honor", 5));

  expect(
    choose({ drawer, candidates: [noYaku, withYaku] })
  ).toBe(withYaku);
});

it("立直後は手替わりを前提に河牌を拾わず、和了牌は拾う", () => {
  const { drawer } = fixture();
  drawer.riichi = true;

  expect(
    choose({
      drawer,
      candidates: [
        candidate(t("pin", 6)),
        candidate(t("man", 9, true))
      ]
    })
  ).toBeNull();

  const win = candidate(t("pin", 5));

  expect(
    choose({ drawer, candidates: [win] })
  ).toBe(win);
});

it("山・相手の手牌・裏向き牌の中身を変えても判断が変わらない", () => {
  const { state, drawer } = fixture();
  const useful = candidate(t("pin", 6));
  const hidden = candidate(t("pin", 5), true);
  const other = state.round.players[0];

  other.discards = [{
    tile: t("pin", 6),
    faceDown: true,
    called: false,
    tsumogiri: false,
    riichiDeclaration: false
  }];

  const input = {
    drawer,
    players: state.round.players,
    candidates: [hidden, useful],
    liveWall: ts("pin", [4, 4, 7, 7])
  };

  const before = choose(input);
  expect(before).toBe(useful);

  other.hand = ts("pin", [6, 6, 6]);
  other.discards[0].tile = t("honor", 7);
  input.candidates[0] = candidate(t("honor", 7), true);

  expect(
    choose({
      ...input,
      liveWall: ts("honor", [1, 2, 3, 4])
    })
  ).toBe(before);
});

it("見えている同じ牌を重複して渡しても判断が変わらない", () => {
  const { drawer } = fixture();
  const useful = candidate(t("pin", 6));
  const visibleTiles = [...drawer.hand, useful.tile];

  const input = {
    drawer,
    candidates: [useful],
    visibleTiles
  };

  expect(choose(input)).toBe(useful);

  expect(
    choose({
      ...input,
      visibleTiles: [...visibleTiles, ...visibleTiles]
    })
  ).toBe(useful);
});

it("河拾いの評価で手牌や捨て牌を変更しない", () => {
  const { state, drawer } = fixture();

  const input = {
    drawer,
    players: state.round.players,
    candidates: [candidate(t("pin", 6))]
  };

  const before = JSON.stringify(input);
  choose(input);

  expect(JSON.stringify(input)).toBe(before);
});
