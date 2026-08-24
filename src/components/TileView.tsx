import type { Tile } from "../lib/mahjong/types";
import {
  getTileFace,
  getTileLabel,
  getTileSuitLabel
} from "../lib/mahjong/tiles";

interface TileViewProps {
  tile?: Tile;
  faceDown?: boolean;
  compact?: boolean;
  selected?: boolean;
  highlighted?: boolean;
  disabled?: boolean;
  onSelect?: (tileId: string) => void;
}

export function TileView({
  tile,
  faceDown = false,
  compact = false,
  selected = false,
  highlighted = false,
  disabled = false,
  onSelect
}: TileViewProps) {
  const classes = [
    "mahjong-tile",
    compact && "mahjong-tile--compact",
    faceDown && "mahjong-tile--back",
    selected && "mahjong-tile--selected",
    highlighted && "mahjong-tile--highlighted",
    tile?.red && "mahjong-tile--red",
    tile && `mahjong-tile--${tile.suit}`
  ]
    .filter(Boolean)
    .join(" ");

  const label = faceDown
    ? "裏向きの牌"
    : tile
      ? getTileLabel(tile)
      : "牌";

  const content = faceDown ? (
    <span className="tile-back-mark">◆</span>
  ) : (
    <>
      <span className="tile-rank">
        {tile ? getTileFace(tile) : "?"}
      </span>

      {tile && tile.suit !== "honor" && (
        <span className="tile-suit">
          {getTileSuitLabel(tile)}
        </span>
      )}
    </>
  );

  if (tile && onSelect) {
    return (
      <button
        type="button"
        className={classes}
        aria-label={label}
        aria-pressed={selected}
        disabled={disabled}
        onClick={() => onSelect(tile.id)}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      className={classes}
      role="img"
      aria-label={label}
    >
      {content}
    </span>
  );
}
