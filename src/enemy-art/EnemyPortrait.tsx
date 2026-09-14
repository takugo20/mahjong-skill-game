import type { CSSProperties } from "react";
import type { EnemyId } from "../lib/akuukan/types";

export const ENEMY_NAMES:
  Readonly<Record<EnemyId, string>> = {
    "enemy-1": "MR1号",
    "enemy-2": "ジン",
    "enemy-3": "ゴルド",
    "enemy-4": "チトセ",
    "enemy-5": "コサメ",
    "enemy-6": "ネムリア",
    "enemy-7": "ナギ",
    "enemy-8": "錆月",
    "enemy-9": "セイラ",
    "enemy-10": "リゼ",
    "enemy-11": "ゴウザ",
    "enemy-12": "ガルド",
    "enemy-13": "トロン",
    "enemy-14": "翠玲",
    "enemy-15": "玄晶",
    "enemy-16": "蝕天"
  };

// 同じフォルダーに一覧画像を1枚置きます。
// 保存された画像のファイル名をそのまま使えます。
const images = import.meta.glob<string>(
  "./*.{png,jpg,jpeg,webp,PNG,JPG,JPEG,WEBP}",
  {
    eager: true,
    query: "?url",
    import: "default"
  }
);

const imageUrl = Object.values(images)[0];

interface Props {
  enemyId: EnemyId;
  size?: "catalog" | "board";
}

export function EnemyPortrait({
  enemyId,
  size = "catalog"
}: Props) {
  const index = Number(enemyId.slice(6)) - 1;
  const column = index % 4;
  const row = Math.floor(index / 4);

  const width = size === "board"
    ? "clamp(30px, 5vmin, 48px)"
    : "clamp(88px, 22vw, 144px)";

  const style: CSSProperties = {
    display: "inline-block",
    position: "relative",
    overflow: "hidden",
    flex: "0 0 auto",
    width,
    aspectRatio: "1",
    verticalAlign: "middle",
    borderRadius: size === "board" ? 5 : 10,
    outline: "1px solid #8ba790",
    background: "#173b2b"
  };

  return (
    <span
      role="img"
      aria-label={ENEMY_NAMES[enemyId] + "の画像"}
      data-enemy-id={enemyId}
      style={style}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            display: "block",
            width: "400%",
            height: "400%",
            maxWidth: "none",
            left: `-${column * 100}%`,
            top: `-${row * 100}%`,
            imageRendering: "pixelated"
          }}
        />
      ) : (
        <span
          style={{
            display: "grid",
            height: "100%",
            placeItems: "center",
            fontSize: 11,
            color: "#d5e4d8"
          }}
        >
          画像未登録
        </span>
      )}
    </span>
  );
}

export function replaceEnemyNumbers(text: string): string {
  return text.replace(
    /敵([0-9]+)/g,
    (match, number: string) => {
      const enemyId =
        `enemy-${Number(number)}` as EnemyId;

      return ENEMY_NAMES[enemyId] ?? match;
    }
  );
}
