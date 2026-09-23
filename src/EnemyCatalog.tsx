import { useEffect, useRef, useState } from "react";
import { EnemyGuide } from "./EnemyGuide";
import { ENEMY_NAMES } from "./enemy-art/EnemyPortrait";
import type {
  EnemyProgressState
} from "./lib/akuukan/enemyProgress";
import type { EnemyId } from "./lib/akuukan/types";
import {
  emptyStatistics,
  totalStatistics,
  type EnemyStatistics
} from "./lib/akuukan/matchStatistics";

interface Props {
  selectedEnemyId: EnemyId;
  progress: EnemyProgressState;
  statistics?: EnemyStatistics;
  onBack: () => void;
}

export function EnemyCatalog({
  selectedEnemyId,
  progress,
  statistics,
  onBack
}: Props) {
  const [target, setTarget] =
    useState<EnemyId | "all" | null>(null);

  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (target !== null) {
      heading.current?.focus();
      heading.current?.scrollIntoView?.({
        block: "start"
      });
    }
  }, [target]);

  if (target !== null) {
    const data = target === "all"
      ? totalStatistics(statistics)
      : statistics?.[target] ?? emptyStatistics();

    const matches = data.ranks.reduce(
      (sum, n) => sum + n,
      0
    );

    const percent = (n: number, d: number) =>
      d ? `${(n / d * 100).toFixed(1)}%` : "—";

    const points = (n: number, d: number) =>
      d
        ? `${Math.round(n / d).toLocaleString("ja-JP")}点`
        : "—";

    const rows = [
      ["対局回数", `${matches}回`],
      ["各順位の回数（1位〜4位）", data.ranks.join("-")],
      [
        "平均順位",
        matches
          ? `${(
            data.ranks.reduce(
              (sum, n, i) => sum + n * (i + 1),
              0
            ) / matches
          ).toFixed(2)
          }位`
          : "—"
      ],
      ["和了率", percent(data.wins, data.rounds)],
      ["放銃率", percent(data.dealIns, data.rounds)],
      ["ツモ率", percent(data.tsumos, data.wins)],
      ["副露率", percent(data.calls, data.rounds)],
      ["立直率", percent(data.riichis, data.rounds)],
      ["平均和了点", points(data.winPoints, data.wins)],
      [
        "平均放銃点",
        points(data.dealInPoints, data.dealIns)
      ]
    ];

    return (
      <main className="akuukan-skill-screen">
        <h1 ref={heading} tabIndex={-1}>
          {target === "all"
            ? "全対戦データ"
            : `${ENEMY_NAMES[target]}との対局データ`}
        </h1>

        <button
          type="button"
          className="akuukan-skill-back"
          onClick={() => setTarget(null)}
        >
          敵図鑑に戻る
        </button>

        <p>
          あなたの成績です。集計局数：{data.rounds}局
        </p>

        {matches === 0 && (
          <p>
            まだ記録がありません。半荘終了後に保存されます。
          </p>
        )}

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse"
          }}
        >
          <caption
            style={{
              textAlign: "left",
              padding: "12px 0"
            }}
          >
            対局成績
          </caption>

          <tbody>
            {rows.map(([label, value]) => (
              <tr
                key={label}
                style={{
                  borderBottom: "1px solid #567568"
                }}
              >
                <th
                  scope="row"
                  style={{
                    textAlign: "left",
                    padding: "14px 8px",
                    fontWeight: 400
                  }}
                >
                  {label}
                </th>
                <td
                  style={{
                    textAlign: "right",
                    padding: "14px 8px",
                    color: "#f3d68b",
                    fontVariantNumeric: "tabular-nums"
                  }}
                >
                  {value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    );
  }

  return (
    <main className="akuukan-skill-screen">
      <h1>敵図鑑</h1>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12
        }}
      >
        <button
          type="button"
          className="akuukan-skill-back akuukan-back-button"
          onClick={onBack}
        >
          戻る
        </button>

        <button
          type="button"
          className="akuukan-skill-back"
          onClick={() => setTarget("all")}
        >
          全対戦データ
        </button>
      </div>

      <EnemyGuide
        selectedEnemyId={selectedEnemyId}
        progress={progress}
        onData={setTarget}
      />
    </main>
  );
}
