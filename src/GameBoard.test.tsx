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

describe("対局画面", () => {
  it("半荘戦と表示し配り直し操作を表示しない", () => {
    const html = renderToStaticMarkup(
      <GameBoard />
    );

    expect(html).toContain("半荘戦");
    expect(html).not.toContain("配り直し");
  });
});
