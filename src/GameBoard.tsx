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
  PlayerState
} from "./lib/mahjong/types";

type OpponentPosition =
  | "top"
  | "left"
  | "right";

interface RiverProps {
  player: PlayerState;
  lastDiscardTileId: string | null;
}

function formatScore(score: number): string {
  return score.toLocaleString("ja-JP");
}

function River({
  player,
  lastDiscardTileId
}: RiverProps) {
  if (player.discards.length === 0) {
    return (
      <div
        className="discard-grid discard-grid--empty"
        aria-label={`${player.name}の河`}
      />
    );
  }

  return (
    <div
      className="discard-grid"
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

interface OpponentAreaProps {
  player: PlayerState;
  position: OpponentPosition;
  lastDiscardTileId: string | null;
}

function OpponentArea({
  player,
  position,
  lastDiscardTileId
}: OpponentAreaProps) {
  return (
    <section
      className={`opponent-area opponent-area--${position}`}
      aria-label={player.name}
    >
      <div className="player-status">
        <div className="player-status__name">
          <span className="wind-badge">
            {getWindLabel(player.seatWind)}
          </span>
          <span>{player.name}</span>
        </div>

        <strong>
          {formatScore(player.score)}
        </strong>
      </div>

      {player.seat === 2 && (
        <div className="enemy-ability-badge">
          特殊能力者
        </div>
      )}

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

      <River
        player={player}
        lastDiscardTileId={lastDiscardTileId}
      />
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
      current === tileId ? null : tileId
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

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="app-kicker">
            SKILL MAHJONG
          </p>
          <h1>麻雀スキルゲーム</h1>
        </div>

        <div className="version-badge">
          試作版 0.1
        </div>
      </header>

      <section className="game-table">
        <OpponentArea
          player={round.players[2]}
          position="top"
          lastDiscardTileId={lastDiscardTileId}
        />

        <OpponentArea
          player={round.players[3]}
          position="left"
          lastDiscardTileId={lastDiscardTileId}
        />

        <section
          className="table-center"
          aria-label="卓中央の情報"
        >
          <div className="round-heading">
            <strong>
              {getRoundLabel(round)}
            </strong>
            <span>{round.honba}本場</span>
          </div>

          <div className="center-stat-grid">
            <div>
              <span>残り</span>
              <strong>
                {round.liveWall.length}
              </strong>
            </div>

            <div>
              <span>供託</span>
              <strong>
                {formatScore(round.riichiPool)}
              </strong>
            </div>

            <div>
              <span>槓</span>
              <strong>{round.kanCount}</strong>
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

        <OpponentArea
          player={round.players[1]}
          position="right"
          lastDiscardTileId={lastDiscardTileId}
        />

        <section className="human-area">
          <River
            player={player}
            lastDiscardTileId={lastDiscardTileId}
          />

          <div className="human-status-row">
            <div className="player-status">
              <div className="player-status__name">
                <span className="wind-badge">
                  {getWindLabel(player.seatWind)}
                </span>
                <span>{player.name}</span>
              </div>

              <strong>
                {formatScore(player.score)}
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
            {player.hand.map((tile) => (
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
            ))}
          </div>
        </section>
      </section>

      <section
        className="control-panel"
        aria-label="操作欄"
      >
        <p
          className="game-notice"
          aria-live="polite"
        >
          {gameState.notice}
        </p>

        <div className="selection-status">
          {selectedTile
            ? `${getTileLabel(selectedTile)}を選択中`
            : "手牌を1枚選択してください"}
        </div>

        <div className="control-buttons">
          {round.phase === "roundEnd" ? (
            <button
              type="button"
              className="primary-button"
              onClick={handleRestart}
            >
              局を再開
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
              この牌を捨てる
            </button>
          )}

          <button
            type="button"
            className="secondary-button"
            onClick={handleRestart}
          >
            最初から
          </button>
        </div>
      </section>
    </main>
  );
}
