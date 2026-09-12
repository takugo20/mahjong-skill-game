import { TileView } from "./TileView";
import type {
  Meld,
  SeatIndex
} from "../lib/mahjong/types";

interface Props {
  meld: Meld;
  seat: SeatIndex;
  compact?: boolean;
  declarationTargetTileIds?: readonly string[];
}

export function MeldTiles({
  meld,
  seat,
  compact = false,
  declarationTargetTileIds = []
}: Props) {
  const added = meld.kind === "addedKan"
    ? meld.tiles.find(
        tile => tile.id === meld.addedTileId
      ) ??
      [...meld.tiles].reverse().find(
        tile => tile.id !== meld.calledTileId
      )
    : undefined;

  const base = meld.tiles.filter(
    tile => tile.id !== added?.id
  );

  const called = base.find(
    tile => tile.id === meld.calledTileId
  );

  let ordered = base;

  if (called && meld.calledFrom !== undefined) {
    const others = base.filter(
      tile => tile.id !== called.id
    );
    const distance =
      (meld.calledFrom - seat + 4) % 4;

    const index =
      meld.kind === "chi" || distance === 3
        ? 0
        : distance === 2
          ? 1
          : others.length;

    ordered = [
      ...others.slice(0, index),
      called,
      ...others.slice(index)
    ];
  }

  return (
    <>
      {ordered.map((tile, index) => {
        const isCalled =
          tile.id === meld.calledTileId;

        const faceDown =
          meld.kind === "closedKan" &&
          (index === 0 || index === ordered.length - 1);

        return (
          <span
            key={tile.id}
            className={
              `meld-tile${
                isCalled ? " meld-tile--called" : ""
              }${
                isCalled && added
                  ? " meld-tile--stacked"
                  : ""
              }`
            }
            data-called-tile={
              isCalled ? "true" : undefined
            }
          >
            <TileView
              tile={faceDown ? undefined : tile}
              faceDown={faceDown}
              compact={compact}
              declarationTarget={
                !faceDown &&
                declarationTargetTileIds.includes(tile.id)
              }
            />

            {isCalled && added && (
              <span
                className="meld-stack-upper"
                data-added-tile="true"
              >
                <TileView
                  tile={added}
                  compact={compact}
                  declarationTarget={
                    declarationTargetTileIds.includes(
                      added.id
                    )
                  }
                />
              </span>
            )}
          </span>
        );
      })}
    </>
  );
}
