import {
  useState
} from "react";
import { TileView } from "./components/TileView";
import {
  createInitialGameState,
  getDoraIndicators,
  getRoundLabel,
  getWindLabel,
  playPlayerDiscard
} from "./lib/mahjong/engine";
import {
  getTileLabel
} from "./lib/mahjong/tiles";
import type {
  PlayerState,
  Tile
} from "./lib/mahjong/types";

type OpponentPosition =
  | "top"
  | "left"
  | "right";

type RiverPosition =
  | OpponentPosition
  | "bottom";

interface RiverProps {
  player: PlayerState;
  position: RiverPosition;
  lastDiscardTileId: string | null;
}

interface OpponentAreaProps {
  player: PlayerState;
  position: OpponentPosition;
}

function formatScore(score: number): string {
  return score.toLocaleString("ja-JP");
}

function River({
  player,
  position,
  lastDiscardTileId
}: RiverProps) {
  const classes = [
    "discard-grid",
    `discard-grid--${position}`
  ];

  if (player.discards.length === 0) {
    classes.push("discard-grid--empty");
  }

  return (
    <div
      className={classes.join(" ")}
      aria-label={`${player.name}の河`}
    >
      {player.discards.map((discard) => (
        <TileView
          key={discard.tile.id}
          tile={discard.tile}
          compact
          highlighted={
            discard.tile.id === lastDiscardTileId
          }
        />
      ))}
    </div>
  );
}

function OpponentArea({
  player,
  position
}: OpponentAreaProps) {
  return (
    <section
      className={`opponent-area opponent-area--${position}`}
      aria-label={player.name}
    >
      <div
        className="opponent-hand"
        data-count={`${player.hand.length}枚`}
        aria-label={`${player.name}の手牌${player.hand.length}枚`}
      >
        {Array.from({
          length: player.hand.length
        }).map((_, index) => (
          <TileView
            key={`${player.id}-hidden-${index}`}
            faceDown
            compact
          />
        ))}
      </div>

      <div className="opponent-meta">
        <div className="player-status">
          <div className="player-status__name">
            <span className="wind-badge">
              {getWindLabel(player.seatWind)}
            </span>

            <span>{player.name}</span>
          </div>

          <strong>
            {formatScore(player.score)}点
          </strong>
        </div>

        {player.seat === 2 && (
          <div className="enemy-ability-badge">
            特殊能力者
          </div>
        )}
      </div>
    </section>
  );
}

export function GameBoard() {
  const [
    gameState,
    setGameState
  ] = useState(createInitialGameState);

  const [
    selectedTileId,
    setSelectedTileId
  ] = useState<string | null>(null);

  const round = gameState.round;
  const player = round.players[0];

  const selectedTile = player.hand.find(
    (tile) => tile.id === selectedTileId
  );

  const drawnTile =
    player.drawnTileId === null
      ? undefined
      : player.hand.find(
          (tile) =>
            tile.id === player.drawnTileId
        );

  const mainHandTiles = drawnTile
    ? player.hand.filter(
        (tile) => tile.id !== drawnTile.id
      )
    : player.hand;

  const doraIndicators =
    getDoraIndicators(round);

  const lastDiscardTileId =
    round.lastDiscard?.discard.tile.id ?? null;

  const canDiscard =
    round.currentSeat === 0 &&
    round.phase === "discarding";

  function handleTileSelection(
    tileId: string
  ) {
    if (!canDiscard) {
      return;
    }

    setSelectedTileId((current) =>
      current === tileId
        ? null
        : tileId
    );
  }

  function handleDiscard() {
    if (!selectedTileId || !canDiscard) {
      return;
    }

    setGameState((currentState) =>
      playPlayerDiscard(
        currentState,
        selectedTileId
      )
    );

    setSelectedTileId(null);
  }

  function handleRestart() {
    setGameState(createInitialGameState());
    setSelectedTileId(null);
  }

  function renderPlayerTile(tile: Tile) {
    return (
      <TileView
        key={tile.id}
        tile={tile}
        selected={
          selectedTileId === tile.id
        }
        highlighted={
          player.drawnTileId === tile.id
        }
        disabled={!canDiscard}
        onSelect={handleTileSelection}
      />
    );
  }

  return (
    <main className="app-shell">
      <section
        className="game-table"
        aria-label="麻雀卓"
      >
        <p
          className="game-notice table-notice"
          aria-live="polite"
        >
          {gameState.notice}
        </p>

        <div className="round-corner-panel">
          <span>
            {getWindLabel(
              round.prevailingWind
            )}
            風戦
          </span>

          <strong>
            {getRoundLabel(round)}
          </strong>

          <small>
            {round.honba}本場
          </small>
        </div>

        <OpponentArea
          player={round.players[2]}
          position="top"
        />

        <OpponentArea
          player={round.players[3]}
          position="left"
        />

        <OpponentArea
          player={round.players[1]}
          position="right"
        />

        <div className="river-position river-position--top">
          <River
            player={round.players[2]}
            position="top"
            lastDiscardTileId={lastDiscardTileId}
          />
        </div>

        <div className="river-position river-position--left">
          <River
            player={round.players[3]}
            position="left"
            lastDiscardTileId={lastDiscardTileId}
          />
        </div>

        <div className="river-position river-position--right">
          <River
            player={round.players[1]}
            position="right"
            lastDiscardTileId={lastDiscardTileId}
          />
        </div>

        <div className="river-position river-position--bottom">
          <River
            player={player}
            position="bottom"
            lastDiscardTileId={lastDiscardTileId}
          />
        </div>

        <section
          className="table-center"
          aria-label="卓中央の情報"
        >
          <div className="center-remaining">
            <span>残り</span>

            <strong>
              {round.liveWall.length}
            </strong>

            <span>枚</span>
          </div>

          <div className="center-stat-grid">
            <div>
              <span>供託</span>
              <strong>
                {formatScore(
                  round.riichiPool
                )}
              </strong>
            </div>

            <div>
              <span>槓</span>
              <strong>
                {round.kanCount}
              </strong>
            </div>
          </div>

          <div className="dora-panel">
            <span>ドラ表示</span>

            <div className="dora-tiles">
              {doraIndicators.map((tile) => (
                <TileView
                  key={tile.id}
                  tile={tile}
                  compact
                />
              ))}
            </div>
          </div>
        </section>

        <section className="human-area">
          <div className="human-status-row">
            <div className="player-status">
              <div className="player-status__name">
                <span className="wind-badge">
                  {getWindLabel(
                    player.seatWind
                  )}
                </span>

                <span>{player.name}</span>
              </div>

              <strong>
                {formatScore(player.score)}点
              </strong>
            </div>

            <div className="mp-panel">
              <div className="mp-panel__label">
                <span>MP</span>

                <strong>
                  {gameState.playerMp}
                  ／
                  {gameState.maxMp}
                </strong>
              </div>

              <div className="mp-gauge">
                <span
                  style={{
                    width: `${
                      gameState.playerMp /
                      gameState.maxMp *
                      100
                    }%`
                  }}
                />
              </div>
            </div>
          </div>

          <div
            className="human-hand"
            aria-label="プレイヤーの手牌"
          >
            <div className="human-hand__main">
              {mainHandTiles.map(
                renderPlayerTile
              )}
            </div>

            {drawnTile && (
              <div className="human-hand__drawn">
                {renderPlayerTile(drawnTile)}
              </div>
            )}
          </div>
        </section>

        <section
          className="control-panel table-actions"
          aria-label="操作欄"
        >
          <div className="selection-status">
            {selectedTile
              ? `${getTileLabel(
                  selectedTile
                )}を選択中`
              : "牌を選択"}
          </div>

          <div className="control-buttons">
            {round.phase === "roundEnd" ? (
              <button
                type="button"
                className="primary-button"
                onClick={handleRestart}
              >
                次局
              </button>
            ) : (
              <button
                type="button"
                className="primary-button"
                disabled={
                  !selectedTileId ||
                  !canDiscard
                }
                onClick={handleDiscard}
              >
                打牌
              </button>
            )}

            <button
              type="button"
              className="secondary-button"
              onClick={handleRestart}
            >
              配り直し
            </button>
          </div>
        </section>
      </section>

      <div
        className="orientation-overlay"
        role="status"
        aria-label="端末を横向きにしてください"
      >
        <div className="orientation-card">
          <div className="orientation-device-row">
            <div
              className="
                orientation-device
                orientation-device--portrait
              "
              aria-hidden="true"
            >
              <span />
            </div>

            <div
              className="orientation-arrow"
              aria-hidden="true"
            >
              →
            </div>

            <div
              className="
                orientation-device
                orientation-device--landscape
              "
              aria-hidden="true"
            >
              <span />
            </div>
          </div>

          <strong>
            端末を横向きにしてください
          </strong>

          <p>
            麻雀卓全体を表示するため、
            横画面でプレイします。
          </p>
        </div>
      </div>
    </main>
  );
}
