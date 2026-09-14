import { useState } from "react";
import {
  EnemyPortrait,
  ENEMY_NAMES
} from "./enemy-art/EnemyPortrait";
import type { EnemyProgressState } from "./lib/akuukan/enemyProgress";
import type { EnemyId } from "./lib/akuukan/types";
import { ENEMY_CATALOG } from "./lib/akuukan/enemyCatalog";

const DESCRIPTIONS: Readonly<Record<EnemyId, readonly string[]>> = {
  "enemy-1": [
    "他家にはドラ表示牌が裏返しに見える。",
    "自分が追っかけ立直をすると、先制立直していた他家は、通常のツモでは和了牌をツモれなくなる。"
  ],
  "enemy-2": [
    "他家は1,000点を供託しないと副露できない。",
    "自分は聴牌していなくても立直することができる。立直後は副露することができなくなるが、手替わりは可能。"
  ],
  "enemy-3": [
    "他家は立直できない。",
    "自分の和了時、前回の和了時と同じ役が含まれていたら、その役の翻数が2倍になる。"
  ],
  "enemy-4": [
    "他家はチー・ポン・大明槓・暗槓ができない（加槓は可能）。",
    "自分がポン、大明槓するたびに他家から1,000点ずつ奪う。"
  ],
  "enemy-5": [
    "自分はいずれか一種の数牌だけをツモる。",
    "自分は副露しても門前扱いになる。"
  ],
  "enemy-6": [
    "自分以外の他家の全能力を無効化する。",
    "自分は常に他家の手牌が見える。"
  ],
  "enemy-7": [
    "他家は役満を含む全ての2翻以上の役が成立しなくなる。",
    "他家の配牌・通常ツモを制限し、風牌が自分に集まりやすくなる。"
  ],
  "enemy-8": [
    "プレイヤーから他家の河が裏返しに見え、副露やロンもできない。",
    "自分が副露して晒した牌が赤ドラになる。"
  ],
  "enemy-9": [
    "自分の配牌にドラ暗刻が含まれる。",
    "他家は立直以外の全ての1翻の役が成立しなくなる。"
  ],
  "enemy-10": [
    "他家はランダムな3枚の牌を捨てられなくなる。副露・暗槓・加槓、和了には使用可能。",
    "自分の和了点が2倍になる。"
  ],
  "enemy-11": [
    "他家は手牌にある牌と同種の牌を山からツモれなくなる。",
    "自分の満貫未満の和了を満貫として処理する。"
  ],
  "enemy-12": [
    "他家は直前に捨てた牌と同種の牌を50％の確率でツモる。",
    "自分の捨て牌が裏返しになり、ロンや副露の対象にならない。"
  ],
  "enemy-13": [
    "自分の手番に「ツモ→打牌」を2回行う。1回目の捨て牌を鳴かれると、2回目は行えない。"
  ],
  "enemy-14": [
    "自分は配牌で聴牌する。"
  ],
  "enemy-15": [
    "他家の満貫未満の和了を無効化し、途中流局にする。",
    "自分は山からの通常ツモの代わりに河拾いが可能。"
  ],
  "enemy-16": [
    "自分の配牌が一向聴以下になり、他家は四向聴以上になる。"
  ]
};

interface Props {
  selectedEnemyId: EnemyId;
  progress: EnemyProgressState;
  onData?: (enemyId: EnemyId) => void;
}

function EnemyGuideEntry({
  enemyId,
  initiallyOpen,
  wins,
  onData
}: {
  enemyId: EnemyId;
  initiallyOpen: boolean;
  wins: number;
  onData?: (enemyId: EnemyId) => void;
}) {
  const [open, setOpen] = useState(initiallyOpen);

  return (
    <details
      className="enemy-guide-entry"
      open={open}
      onToggle={event => {
        setOpen(event.currentTarget.open);
      }}
    >
      <summary>
        <span
          style={{
            display: "inline-flex",
            width: "calc(100% - 1.5em)",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            verticalAlign: "top",
            lineHeight: 1.6
          }}
        >
          <span style={{ minWidth: 0 }}>
            <span
              style={{
                display: "block",
                fontWeight: 700
              }}
            >
              {ENEMY_NAMES[enemyId]}
            </span>

            {open && (
              <span
                style={{
                  display: "block",
                  marginTop: 8,
                  fontWeight: 400,
                  fontSize: "0.95em"
                }}
              >
                <span style={{ display: "block" }}>
                  勝利回数：
                </span>
                <span>{wins}回</span>
              </span>
            )}
          </span>

          {open && (
            <EnemyPortrait enemyId={enemyId} />
          )}
        </span>
      </summary>

      {onData && (
        <button
          type="button"
          className="akuukan-skill-back"
          aria-label={`${ENEMY_NAMES[enemyId]}のデータ`}
          onClick={() => onData(enemyId)}
        >
          データ
        </button>
      )}

      <dl className="enemy-guide-content">
        <dt>特殊能力：</dt>
        <dd>
          <ul>
            {DESCRIPTIONS[enemyId].map(description => (
              <li key={description}>
                {description}
              </li>
            ))}
          </ul>
        </dd>
      </dl>
    </details>
  );
}

export function EnemyGuide({
  selectedEnemyId,
  progress,
  onData
}: Props) {
  return (
    <section
      aria-label="対戦相手の情報"
      className="enemy-guide"
    >
      {ENEMY_CATALOG.map(enemy => {
        const record = progress.enemies[enemy.id];

        if (!record.isUnlocked) {
          return (
            <button
              key={enemy.id}
              type="button"
              className="enemy-guide-locked"
              disabled
            >
              <span aria-hidden="true">▶︎ </span>
              {ENEMY_NAMES[enemy.id]}（未解放）
            </button>
          );
        }

        return (
          <EnemyGuideEntry
            key={`${selectedEnemyId}:${enemy.id}`}
            enemyId={enemy.id}
            initiallyOpen={enemy.id === selectedEnemyId}
            wins={record.firstPlaceCount}
            onData={onData}
          />
        );
      })}
    </section>
  );
}
