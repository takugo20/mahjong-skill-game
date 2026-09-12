import { TileView } from "./TileView";
import { sortTiles } from "../lib/mahjong/tiles";
import type {
  PlayerState,
  RoundWinResult
} from "../lib/mahjong/types";

interface Props {
  player: Pick<PlayerState, "name" | "hand" | "melds">;
  result: Pick<RoundWinResult, "winMethod" | "winningTile">;
}

const MELD_LABELS = {
  chi: "チー",
  pon: "ポン",
  openKan: "大明槓",
  closedKan: "暗槓",
  addedKan: "加槓"
} as const;

export function WinResultHand({
  player,
  result
}: Props) {
  const hand = sortTiles(
    player.hand.filter(
      tile => tile.id !== result.winningTile.id
    )
  );

  return (
    <section
      className="win-result-hand"
      aria-label={`${player.name}の和了牌姿`}
    >
      <div className="win-result-hand-tiles">
        <div
          className="win-result-concealed"
          role="group"
          aria-label="手牌"
        >
          {hand.map(tile => (
            <TileView key={tile.id} tile={tile} />
          ))}
        </div>

        <div
          className="win-result-winning"
          role="group"
          aria-label="和了牌"
        >
          <TileView tile={result.winningTile} />

          <small>
            {result.winMethod === "tsumo" ? "ツモ" : "ロン"}
          </small>
        </div>
      </div>

      {player.melds.length > 0 && (
        <div className="win-result-melds">
          {player.melds.map((meld, index) => (
            <div
              key={index}
              role="group"
              aria-label={MELD_LABELS[meld.kind]}
            >
              <div className="win-result-meld-tiles">
                {meld.tiles.map(tile => (
                  <TileView key={tile.id} tile={tile} />
                ))}
              </div>

              <small>{MELD_LABELS[meld.kind]}</small>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
