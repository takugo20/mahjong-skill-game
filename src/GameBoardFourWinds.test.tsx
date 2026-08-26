import {
  renderToStaticMarkup
} from "react-dom/server";
import {
  describe,
  expect,
  it
} from "vitest";
import {
  GameBoard
} from "./GameBoard";
import {
  createInitialGameState
} from "./lib/mahjong/engine";
import type {
  GameState,
  Wind
} from "./lib/mahjong/types";

function createFourWindsResultState(
  wind: Wind,
  riichiPool: number
): GameState {
  const state = createInitialGameState(
    () => 0.5
  );

  state.round.phase = "roundEnd";
  state.round.riichiPool = riichiPool;
  state.round.winResult = null;
  state.round.doubleRonResult = null;
  state.round.drawResult = null;
  state.round.abortiveDrawResult = {
    reason: "fourWinds",
    wind
  };

  return state;
}

function getResultHtml(
  state: GameState
): string {
  const html = renderToStaticMarkup(
    <GameBoard initialState={state} />
  );

  const startIndex = html.indexOf(
    'aria-label="四風連打結果"'
  );

  return startIndex < 0
    ? ""
    : html.slice(startIndex);
}

describe("四風連打の結果画面", () => {
  it("対象の風牌と供託持越しを表示する", () => {
    const html = getResultHtml(
      createFourWindsResultState(
        "east",
        2000
      )
    );

    expect(html).toContain(
      'aria-label="四風連打結果"'
    );
    expect(html).toContain(
      "途中流局"
    );
    expect(html).toContain(
      "四風連打"
    );
    expect(html).toContain(
      "東4枚"
    );
    expect(html).toContain(
      "4人とも東"
    );
    expect(html).toContain(
      "点数移動なし"
    );
    expect(html).toContain(
      "親は連荘し、本場を1つ増やします。"
    );
    expect(html).toContain(
      "供託2,000点は次局へ持ち越します。"
    );
    expect(html).toContain(
      ">次局へ</button>"
    );
  });

  it("対象風牌を切り替え供託がなければその旨を表示する", () => {
    const html = getResultHtml(
      createFourWindsResultState(
        "north",
        0
      )
    );

    expect(html).toContain(
      "北4枚"
    );
    expect(html).toContain(
      "4人とも北"
    );
    expect(html).toContain(
      "供託点はありません。"
    );
    expect(html).not.toContain(
      "供託0点は次局へ持ち越します。"
    );
  });
});
