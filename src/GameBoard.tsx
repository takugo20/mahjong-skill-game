import {
  useState
} from "react";
import { TileView } from "./components/TileView";
import {
  canPlayerRon,
  canPlayerTsumo,
  createInitialGameState,
  declarePlayerRon,
  declarePlayerTsumo,
  getDoraIndicators,
  getRoundLabel,
  getWindLabel,
  playPlayerDiscard,
  skipPlayerRon,
  startNextRound
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

interface GameBoardProps {
  initialState?: ReturnType<
    typeof createInitialGameState
  >;
}

function formatScore(score: number): string {
  return score.toLocaleString("ja-JP");
}

function formatPointChange(
  change: number
): string {
  if (change > 0) {
    return `+${formatScore(change)}`;
  }

  return formatScore(change);
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

export function GameBoard({
  initialState
}: GameBoardProps = {}) {
  const [
    gameState,
    setGameState
  ] = useState(
    () =>
      initialState ??
      createInitialGameState()
  );

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

  const canTsumo =
    canPlayerTsumo(gameState);

  const canRon =
    round.phase === "reaction" &&
    canPlayerRon(gameState);

  const winResult =
    round.winResult ?? null;

  const drawResult =
    round.drawResult ?? null;

  const matchResult =
    gameState.matchResult;

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

  function handleTsumo() {
    setGameState((currentState) =>
      declarePlayerTsumo(currentState)
    );

    setSelectedTileId(null);
  }

  function handleRon() {
    setGameState((currentState) =>
      declarePlayerRon(currentState)
    );

    setSelectedTileId(null);
  }

  function handleSkipRon() {
    setGameState((currentState) =>
      skipPlayerRon(currentState)
    );

    setSelectedTileId(null);
  }

  function handleNextRound() {
    setGameState((currentState) =>
      startNextRound(currentState)
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
          <span>半荘戦</span>
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
            {round.phase === "matchEnd"
              ? "対局終了"
              : round.phase === "reaction"
                ? "ロン可能"
                : canTsumo
                  ? "ツモ和了可能"
                  : selectedTile
                    ? `${getTileLabel(
                        selectedTile
                      )}を選択中`
                    : "牌を選択"}
          </div>

          <div className="control-buttons">
            {round.phase === "matchEnd" ? (
              <button
                type="button"
                className="primary-button"
                onClick={handleRestart}
              >
                新しい対局
              </button>
            ) : round.phase === "roundEnd" ? (
              <button
                type="button"
                className="primary-button"
                onClick={handleNextRound}
              >
                次局
              </button>
            ) : round.phase === "reaction" ? (
              <>
                <button
                  type="button"
                  className="primary-button win-button"
                  disabled={!canRon}
                  onClick={handleRon}
                >
                  ロン
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleSkipRon}
                >
                  見逃す
                </button>
              </>
            ) : (
              <>
                {canTsumo && (
                  <button
                    type="button"
                    className="primary-button win-button"
                    onClick={handleTsumo}
                  >
                    ツモ
                  </button>
                )}

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
              </>
            )}
          </div>
        </section>
        {winResult && (
          <section
            className="win-result-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="和了結果"
          >
            <article className="win-result-card">
              <header className="win-result-header">
                <div>
                  <span>
                    {winResult.winMethod === "tsumo"
                      ? "ツモ"
                      : "ロン"}
                  </span>

                  <strong>和了</strong>
                </div>

                <TileView
                  tile={winResult.winningTile}
                  compact
                  highlighted
                />
              </header>

              <div className="win-result-yaku">
                {winResult.yakuNames.map(
                  (name) => (
                    <span key={name}>{name}</span>
                  )
                )}
              </div>

              <div className="win-result-score">
                <strong>
                  {winResult.yakumanMultiplier > 0
                    ? winResult.limitName ?? "役満"
                    : `${winResult.han}翻 ${winResult.fu ?? 0}符`}
                </strong>

                {winResult.limitName &&
                  winResult.yakumanMultiplier === 0 && (
                    <span>
                      {winResult.limitName}
                    </span>
                  )}

                <b>
                  {formatScore(
                    winResult.totalPoints
                  )}
                  点
                </b>
              </div>

              <div className="win-result-changes">
                {winResult.pointChanges.map(
                  (change) => {
                    const changedPlayer =
                      round.players[change.seat];

                    return (
                      <div key={change.playerId}>
                        <span>
                          {getWindLabel(
                            changedPlayer.seatWind
                          )}
                          ・{changedPlayer.name}
                        </span>

                        <strong
                          className={
                            change.change > 0
                              ? "point-change--plus"
                              : change.change < 0
                                ? "point-change--minus"
                                : ""
                          }
                        >
                          {formatPointChange(
                            change.change
                          )}
                        </strong>

                        <small>
                          {formatScore(
                            change.pointsAfter
                          )}
                          点
                        </small>
                      </div>
                    );
                  }
                )}
              </div>

              <button
                type="button"
                className="primary-button win-result-next"
                onClick={handleNextRound}
              >
                次局へ
              </button>
            </article>
          </section>
        )}
        {drawResult &&
          round.phase === "roundEnd" && (
            <section
              className="win-result-overlay"
              role="dialog"
              aria-modal="true"
              aria-label="流局結果"
            >
              <article className="win-result-card draw-result-card">
                <header className="win-result-header">
                  <div>
                    <span>荒牌</span>

                    <strong>流局</strong>
                  </div>

                  <b className="draw-result-count">
                    聴牌
                    {drawResult.tenpaiSeats.length}
                    人
                  </b>
                </header>

                <div className="draw-result-summary">
                  <span>不聴罰符</span>

                  <strong>
                    {drawResult.tenpaiSeats.length === 0 ||
                    drawResult.notenSeats.length === 0
                      ? "点数移動なし"
                      : "合計3,000点"}
                  </strong>
                </div>

                <div className="win-result-changes draw-result-changes">
                  {drawResult.pointChanges.map(
                    (change) => {
                      const changedPlayer =
                        round.players[change.seat];

                      const tenpai =
                        drawResult.tenpaiSeats.includes(
                          change.seat
                        );

                      return (
                        <div key={change.playerId}>
                          <b
                            className={
                              tenpai
                                ? "draw-status draw-status--tenpai"
                                : "draw-status draw-status--noten"
                            }
                          >
                            {tenpai
                              ? "聴牌"
                              : "不聴"}
                          </b>

                          <span>
                            {getWindLabel(
                              changedPlayer.seatWind
                            )}
                            ・{changedPlayer.name}
                          </span>

                          <strong
                            className={
                              change.change > 0
                                ? "point-change--plus"
                                : change.change < 0
                                  ? "point-change--minus"
                                  : ""
                            }
                          >
                            {formatPointChange(
                              change.change
                            )}
                          </strong>

                          <small>
                            {formatScore(
                              change.pointsAfter
                            )}
                            点
                          </small>
                        </div>
                      );
                    }
                  )}
                </div>

                <button
                  type="button"
                  className="primary-button win-result-next"
                  onClick={handleNextRound}
                >
                  次局へ
                </button>
              </article>
            </section>
          )}
        {matchResult &&
          round.phase === "matchEnd" && (
            <section
              className="win-result-overlay"
              role="dialog"
              aria-modal="true"
              aria-label="対局結果"
            >
              <article className="win-result-card match-result-card">
                <header className="win-result-header">
                  <div>
                    <span>半荘戦</span>

                    <strong>対局終了</strong>
                  </div>

                  <b className="match-result-title">
                    最終順位
                  </b>
                </header>

                <div className="match-result-rankings">
                  {matchResult.rankings.map(
                    (ranking) => {
                      const rankedPlayer =
                        round.players.find(
                          (candidate) =>
                            candidate.id ===
                            ranking.playerId
                        );

                      if (!rankedPlayer) {
                        return null;
                      }

                      return (
                        <div
                          key={ranking.playerId}
                          className={`match-result-row ${
                            ranking.rank === 1
                              ? "match-result-row--first"
                              : ""
                          }`}
                        >
                          <strong className="match-result-rank">
                            {ranking.rank}位
                          </strong>

                          <div className="match-result-player">
                            <b>
                              {rankedPlayer.name}
                            </b>

                            {ranking.seat ===
                              gameState.initialDealerSeat && (
                                <span>起家</span>
                              )}
                          </div>

                          <span className="match-result-award">
                            {ranking.riichiPoolAward > 0
                              ? `供託 +${formatScore(
                                  ranking.riichiPoolAward
                                )}点`
                              : ""}
                          </span>

                          <strong className="match-result-points">
                            {formatScore(
                              ranking.finalPoints
                            )}
                            点
                          </strong>
                        </div>
                      );
                    }
                  )}
                </div>

                <p className="match-result-summary">
                  {matchResult.riichiPoolAward > 0
                    ? `残った供託${formatScore(
                        matchResult.riichiPoolAward
                      )}点は、供託加算前の暫定1位が取得しました。`
                    : "残った供託点はありません。"}
                </p>

                <button
                  type="button"
                  className="primary-button win-result-next"
                  onClick={handleRestart}
                >
                  新しい対局
                </button>
              </article>
            </section>
          )}
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
