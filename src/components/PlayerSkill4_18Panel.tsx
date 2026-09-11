import { TileView } from "./TileView";
import type { Tile } from "../lib/mahjong/types";

interface PlayerSkill4_18PanelProps {
  tiles: readonly Tile[];
  selectableTileIds: readonly string[];
  selectedTileIds: readonly string[];
  maximumCount: number;
  disabled?: boolean;
  onSelectionChange: (tileIds: string[]) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PlayerSkill4_18Panel({
  tiles,
  selectableTileIds,
  selectedTileIds,
  maximumCount,
  disabled = false,
  onSelectionChange,
  onConfirm,
  onCancel
}: PlayerSkill4_18PanelProps) {
  const candidates = tiles.filter(
    (tile) =>
      (tile.suit === "man" || tile.suit === "pin") &&
      selectableTileIds.includes(tile.id)
  );

  const selected = candidates
    .filter((tile) => selectedTileIds.includes(tile.id))
    .map((tile) => tile.id);

  function toggleTile(tileId: string) {
    if (disabled) return;

    if (selected.includes(tileId)) {
      onSelectionChange(
        selected.filter((id) => id !== tileId)
      );
    } else if (
      selected.length < maximumCount &&
      candidates.some((tile) => tile.id === tileId)
    ) {
      onSelectionChange([...selected, tileId]);
    }
  }

  return (
    <section aria-label="手牌整理【索】の交換牌選択">
      <p role="status">
        手牌整理【索】：交換する萬子・筒子を選択
        （{selected.length}／{maximumCount}枚）
      </p>

      <p>
        選んだ牌を索子と交換します。
        確定前なら取り消せます。
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 4
        }}
      >
        {candidates.map((tile) => (
          <TileView
            key={tile.id}
            tile={tile}
            selected={selected.includes(tile.id)}
            disabled={
              disabled ||
              (
                selected.length >= maximumCount &&
                !selected.includes(tile.id)
              )
            }
            onSelect={toggleTile}
          />
        ))}
      </div>

      {candidates.length === 0 && (
        <p>交換できる牌がありません。</p>
      )}

      <div className="control-buttons">
        <button
          type="button"
          className="primary-button"
          disabled={
            disabled ||
            selected.length === 0 ||
            selected.length > maximumCount
          }
          onClick={onConfirm}
        >
          選択した牌を索子と交換
        </button>

        <button
          type="button"
          className="secondary-button"
          disabled={disabled}
          onClick={onCancel}
        >
          交換を取り消す
        </button>
      </div>
    </section>
  );
}
