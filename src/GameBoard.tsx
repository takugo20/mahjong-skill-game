import {
  useState
} from "react";
import { TileView } from "./components/TileView";
import {
  canPlayerRiichi,
  canPlayerRon,
  canPlayerTsumo,
  createInitialGameState,
  declarePlayerMeldCall,
  declarePlayerOpenKan,
  declarePlayerRiichi,
  declarePlayerRon,
  declarePlayerTsumo,
  getDoraIndicators,
  getPlayerMeldCallOptions,
  getPlayerOpenKanCallOptions,
  getPlayerRiichiDiscardTileIds,
  getPlayerSelfKanOptions,
  getRoundLabel,
  getWindLabel,
  playPlayerDiscard,
  playPlayerSelfKan,
  skipPlayerRon,
  startNextRound
} from "./lib/mahjong/engine";
import type {
  SelfKanOption
} from "./lib/mahjong/kan";
import {
  getTileLabel
} from "./lib/mahjong/tiles";
import type {
  Meld,
  MeldCallOption,
  PlayerState,
  SeatIndex,
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

interface MeldAreaProps {
  player: PlayerState;
  position: RiverPosition;
  compact?: boolean;
}

interface GameBoardProps {
  initialState?: ReturnType<
    typeof createInitialGameState
  >;
}

function formatScore(score: number): string {
  return score.toLocaleString("ja-JP");
}

function getRiichiStatusLabel(
  player: PlayerState
): string {
  return player.doubleRiichi === true
    ? "ダブル立直"
    : "立直";
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
        <span
          key={discard.tile.id}
          className={
            discard.riichiDeclaration
              ? "discard-tile discard-tile--riichi"
              : "discard-tile"
          }
          data-riichi-declaration={
            discard.riichiDeclaration
              ? "true"
              : undefined
          }
        >
          <TileView
            tile={discard.tile}
            compact
            highlighted={
              discard.tile.id ===
              lastDiscardTileId
            }
          />
        </span>
      ))}
    </div>
  );
}

function getMeldCallHandTiles(
  option: MeldCallOption,
  player: PlayerState
): Tile[] {
  return option.handTileIds
    .map((tileId) =>
      player.hand.find(
        (tile) => tile.id === tileId
      )
    )
    .filter(
      (tile): tile is Tile =>
        tile !== undefined
    );
}

function getMeldCallDisplayKey(
  option: MeldCallOption,
  player: PlayerState
): string {
  const handTiles = getMeldCallHandTiles(
    option,
    player
  );

  if (
    handTiles.length !==
    option.handTileIds.length
  ) {
    return option.id;
  }

  const tileKeys = handTiles
    .map(
      (tile) =>
        `${tile.suit}-${tile.rank}-${
          tile.red ? "red" : "normal"
        }`
    )
    .sort();

  return `${option.kind}:${tileKeys.join("|")}`;
}

function getMeldCallOptionLabel(
  option: MeldCallOption,
  player: PlayerState,
  showHandTiles: boolean
): string {
  const actionLabel =
    option.kind === "pon"
      ? "ポン"
      : "チー";

  if (!showHandTiles) {
    return actionLabel;
  }

  const handTileLabels =
    getMeldCallHandTiles(option, player)
      .map((tile) =>
        tile.suit === "honor"
          ? getTileLabel(tile)
          : `${tile.red ? "赤" : ""}${
              tile.rank
            }`
      );

  return handTileLabels.length === 0
    ? actionLabel
    : `${actionLabel} ${
        handTileLabels.join("+")
      }`;
}

function getSelfKanOptionLabel(
  option: SelfKanOption,
  player: PlayerState
): string {
  const tileId =
    option.kind === "closedKan"
      ? option.tileIds[0]
      : option.tileId;
  const tile = player.hand.find(
    (candidate) =>
      candidate.id === tileId
  );
  const actionLabel =
    option.kind === "closedKan"
      ? "暗槓"
      : "加槓";

  return tile
    ? `${actionLabel} ${getTileLabel(tile)}`
    : actionLabel;
}

function getMeldKindLabel(
  meld: Meld
): string {
  switch (meld.kind) {
    case "chi":
      return "チー";

    case "pon":
      return "ポン";

    case "openKan":
      return "大明槓";

    case "closedKan":
      return "暗槓";

    case "addedKan":
      return "加槓";
  }
}

function getCalledTileDisplayIndex(
  meld: Meld,
  callerSeat: SeatIndex
): number | null {
  if (
    !meld.calledTileId ||
    meld.calledFrom === undefined
  ) {
    return null;
  }

  if (meld.kind === "chi") {
    return 0;
  }

  const sourceDistance =
    (meld.calledFrom - callerSeat + 4) % 4;

  if (meld.kind === "pon") {
    if (sourceDistance === 3) {
      return 0;
    }

    if (sourceDistance === 2) {
      return 1;
    }

    if (sourceDistance === 1) {
      return 2;
    }
  }

  if (meld.kind === "openKan") {
    if (sourceDistance === 3) {
      return 0;
    }

    if (sourceDistance === 2) {
      return 1;
    }

    if (sourceDistance === 1) {
      return 3;
    }
  }

  return null;
}

function getMeldDisplayTiles(
  meld: Meld,
  callerSeat: SeatIndex
): Tile[] {
  const calledTile = meld.tiles.find(
    (tile) => tile.id === meld.calledTileId
  );
  const calledTileIndex =
    getCalledTileDisplayIndex(
      meld,
      callerSeat
    );

  if (
    !calledTile ||
    calledTileIndex === null
  ) {
    return meld.tiles;
  }

  const handTiles = meld.tiles.filter(
    (tile) => tile.id !== calledTile.id
  );
  const insertionIndex = Math.min(
    calledTileIndex,
    handTiles.length
  );

  return [
    ...handTiles.slice(0, insertionIndex),
    calledTile,
    ...handTiles.slice(insertionIndex)
  ];
}

interface WinResultDoraIndicatorsProps {
  doraIndicators: readonly Tile[];
  uraDoraIndicators: readonly Tile[];
}

function WinResultDoraIndicators({
  doraIndicators,
  uraDoraIndicators
}: WinResultDoraIndicatorsProps) {
  if (
    doraIndicators.length === 0 &&
    uraDoraIndicators.length === 0
  ) {
    return null;
  }

  return (
    <div
      className="win-result-dora-indicators"
      aria-label="ドラ表示牌"
    >
      {doraIndicators.length > 0 && (
        <div className="win-result-dora-row">
          <span className="win-result-dora-label">
            ドラ表示牌
          </span>

          <div className="win-result-dora-tiles">
            {doraIndicators.map((tile) => (
              <TileView
                key={`result-dora-${tile.id}`}
                tile={tile}
                compact
              />
            ))}
          </div>
        </div>
      )}

      {uraDoraIndicators.length > 0 && (
        <div className="win-result-dora-row">
          <span className="win-result-dora-label">
            裏ドラ表示牌
          </span>

          <div className="win-result-dora-tiles">
            {uraDoraIndicators.map((tile) => (
              <TileView
                key={`result-ura-dora-${tile.id}`}
                tile={tile}
                compact
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MeldArea({
  player,
  position,
  compact = false
}: MeldAreaProps) {
  if (player.melds.length === 0) {
    return null;
  }

  return (
    <div
      className={`meld-area meld-area--${position}`}
      aria-label={`${player.name}の面子`}
    >
      {player.melds.map((meld, meldIndex) => (
        <div
          key={`${player.id}-meld-${meldIndex}`}
          className={`meld-group meld-group--${meld.kind}`}
          aria-label={getMeldKindLabel(meld)}
          data-meld-kind={meld.kind}
          data-called-from={meld.calledFrom}
        >
          {getMeldDisplayTiles(
            meld,
            player.seat
          ).map((tile) => {
            const isCalledTile =
              tile.id === meld.calledTileId;

            return (
              <span
                key={tile.id}
                className={
                  isCalledTile
                    ? "meld-tile meld-tile--called"
                    : "meld-tile"
                }
                data-called-tile={
                  isCalledTile
                    ? "true"
                    : undefined
                }
              >
                <TileView
                  tile={tile}
                  compact={compact}
                />
              </span>
            );
          })}
        </div>
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

      <MeldArea
        player={player}
        position={position}
        compact
      />

      <div className="opponent-meta">
        <div className="player-status">
          <div className="player-status__name">
            <span className="wind-badge">
              {getWindLabel(player.seatWind)}
            </span>

            <span>{player.name}</span>
            {player.riichi && (
            <span className="riichi-status-badge">
              {getRiichiStatusLabel(player)}
            </span>
            )}
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

  const riichiDiscardTileIds =
    getPlayerRiichiDiscardTileIds(
      gameState
    );

  const canRiichi =
    canPlayerRiichi(gameState);

  const selfKanOptions =
    getPlayerSelfKanOptions(gameState);

  const canClosedKan =
    selfKanOptions.some(
      (option) =>
        option.kind === "closedKan"
    );

  const canAddedKan =
    selfKanOptions.some(
      (option) =>
        option.kind === "addedKan"
    );

  const selectedTileCanDeclareRiichi =
    selectedTileId !== null &&
    riichiDiscardTileIds.includes(
      selectedTileId
    );
  
  const canRon =
    round.phase === "reaction" &&
    canPlayerRon(gameState);

  const meldCallOptions =
    getPlayerMeldCallOptions(gameState);

  const displayedMeldCallOptions =
    meldCallOptions.filter(
      (option, index, options) => {
        const displayKey =
          getMeldCallDisplayKey(
            option,
            player
          );

        return options.findIndex(
          (candidate) =>
            getMeldCallDisplayKey(
              candidate,
              player
            ) === displayKey
        ) === index;
      }
    );

  const openKanCallOptions =
    getPlayerOpenKanCallOptions(
      gameState
    );

  const displayedReactionCallOptions = [
    ...displayedMeldCallOptions.filter(
      (option) => option.kind === "pon"
    ),
    ...openKanCallOptions,
    ...displayedMeldCallOptions.filter(
      (option) => option.kind === "chi"
    )
  ];

  const canPon =
    displayedMeldCallOptions.some(
      (option) => option.kind === "pon"
    );

  const canChi =
    displayedMeldCallOptions.some(
      (option) => option.kind === "chi"
    );

  const canOpenKan =
    openKanCallOptions.length > 0;

  const reactionActionLabels: string[] = [];

  if (canPon) {
    reactionActionLabels.push("ポン");
  }

  if (canOpenKan) {
    reactionActionLabels.push("大明槓");
  }

  if (canChi) {
    reactionActionLabels.push("チー");
  }

  const reactionStatus = canRon
    ? "ロン可能"
    : reactionActionLabels.length > 0
      ? `${reactionActionLabels.join(
          "・"
        )}可能`
      : "反応を選択";
  
  const winResult =
    round.winResult ?? null;

  const doubleRonResult =
    round.doubleRonResult ?? null;

  const doubleRonDoraIndicatorTiles =
    doubleRonResult?.winResults.find(
      (result) =>
        (result.doraIndicatorTiles?.length ?? 0) > 0
    )?.doraIndicatorTiles ?? [];

  const doubleRonUraDoraIndicatorTiles =
    doubleRonResult?.winResults.find(
      (result) =>
        (result.uraDoraIndicatorTiles?.length ?? 0) > 0
    )?.uraDoraIndicatorTiles ?? [];

  const drawResult =
    round.drawResult ?? null;

  const abortiveDrawResult =
    round.abortiveDrawResult ?? null;

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

  function handleRiichi() {
    if (
      !selectedTileId ||
      !selectedTileCanDeclareRiichi
    ) {
      return;
    }

    setGameState((currentState) =>
      declarePlayerRiichi(
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

  function handleMeldCall(
    optionId: string
  ) {
    setGameState((currentState) =>
      declarePlayerMeldCall(
        currentState,
        optionId
      )
    );

    setSelectedTileId(null);
  }

    function handleOpenKan(
    optionId: string
  ) {
    setGameState((currentState) =>
      declarePlayerOpenKan(
        currentState,
        optionId
      )
    );

    setSelectedTileId(null);
  }
  
  function handleSelfKan(
    optionId: string
  ) {
    setGameState((currentState) =>
      playPlayerSelfKan(
        currentState,
        optionId
      )
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
          player.drawnTileId === tile.id ||
          (
            canRiichi &&
            riichiDiscardTileIds.includes(
              tile.id
            )
          )
        }
        disabled={
          !canDiscard ||
          (
            player.riichi &&
            player.drawnTileId !== tile.id
          )
        }
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
          aria-label="対局情報"
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
                {player.riichi && (
                  <span className="riichi-status-badge">
                    {getRiichiStatusLabel(player)}
                  </span>
                )}
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

            <MeldArea
              player={player}
              position="bottom"
            />
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
                ? reactionStatus
                : canTsumo
                  ? "ツモ和了可能"
                  : canClosedKan && canAddedKan
                    ? "暗槓・加槓可能"
                    : canClosedKan
                      ? "暗槓可能"
                      : canAddedKan
                        ? "加槓可能"
                        : player.riichi
                    ? `${getRiichiStatusLabel(
                        player
                      )}中・ツモ切り`
                    : selectedTileCanDeclareRiichi &&
                        selectedTile
                      ? `${getTileLabel(
                          selectedTile
                        )}で立直可能`
                      : selectedTile
                        ? `${getTileLabel(
                            selectedTile
                          )}を選択中`
                        : canRiichi
                          ? "青枠の牌で立直可能"
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
                {canRon && (
                  <button
                    type="button"
                    className="primary-button win-button"
                    onClick={handleRon}
                  >
                    ロン
                  </button>
                )}

                {displayedReactionCallOptions.map(
                  (option) => {
                    const sameKindCount =
                      displayedReactionCallOptions
                        .filter(
                          (candidate) =>
                            candidate.kind ===
                            option.kind
                        ).length;

                    const openKanTile =
                      option.kind === "openKan"
                        ? round.lastDiscard
                            ?.discard.tile
                        : null;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        className={
                          option.kind === "openKan"
                            ? "primary-button kan-button"
                            : "primary-button"
                        }
                        onClick={() =>
                          option.kind === "openKan"
                            ? handleOpenKan(
                                option.id
                              )
                            : handleMeldCall(
                                option.id
                              )
                        }
                      >
                        {option.kind === "openKan"
                          ? openKanTile
                            ? `大明槓 ${getTileLabel(
                                openKanTile
                              )}`
                            : "大明槓"
                          : getMeldCallOptionLabel(
                              option,
                              player,
                              sameKindCount > 1
                            )}
                      </button>
                    );
                  }
                )}

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

                {selfKanOptions.map(
                  (option) => (
                    <button
                      key={option.id}
                      type="button"
                      className="secondary-button kan-button"
                      onClick={() =>
                        handleSelfKan(
                          option.id
                        )
                      }
                    >
                      {getSelfKanOptionLabel(
                        option,
                        player
                      )}
                    </button>
                  )
                )}

                {canRiichi && (
                  <button
                    type="button"
                    className="secondary-button riichi-button"
                    disabled={
                      !selectedTileCanDeclareRiichi
                    }
                    onClick={handleRiichi}
                  >
                    立直
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

                <WinResultDoraIndicators
                  doraIndicators={
                    winResult.doraIndicatorTiles ?? []
                  }
                  uraDoraIndicators={
                    winResult.uraDoraIndicatorTiles ?? []
                  }
                />
              </header>

              <div className="win-result-yaku">
                {winResult.yakuNames.map(
                  (name) => (
                    <span key={name}>{name}</span>
                  )
                )}

                {winResult.yakumanMultiplier === 0 &&
                  (winResult.doraCount ?? 0) > 0 && (
                    <span>
                      ドラ{winResult.doraCount}
                    </span>
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
                {doubleRonResult &&
          round.phase === "roundEnd" && (
            <section
              className="win-result-overlay"
              role="dialog"
              aria-modal="true"
              aria-label="ダブロン結果"
            >
              <article className="win-result-card double-ron-result-card">
                <header className="win-result-header">
                  <div>
                    <span>ロン</span>

                    <strong>ダブロン</strong>
                  </div>

                  <div className="double-ron-header-summary">
                    <b className="draw-result-count">
                      2人和了
                    </b>

                    <WinResultDoraIndicators
                      doraIndicators={
                        doubleRonDoraIndicatorTiles
                      }
                      uraDoraIndicators={
                        doubleRonUraDoraIndicatorTiles
                      }
                    />
                  </div>
                </header>

                <div className="double-ron-winners">
                  {doubleRonResult.winResults.map(
                    (ronResult) => {
                      const winner =
                        round.players[
                          ronResult.winnerSeat
                        ];

                      const receivesRiichiPool =
                        doubleRonResult
                          .riichiPoolRecipientSeat ===
                        ronResult.winnerSeat;

                      return (
                        <section
                          key={ronResult.winnerSeat}
                          className="double-ron-winner"
                        >
                          <header className="double-ron-winner-header">
                            <div>
                              <strong>
                                {getWindLabel(
                                  winner.seatWind
                                )}
                                ・{winner.name}
                              </strong>

                              {receivesRiichiPool && (
                                <span>
                                  供託取得
                                </span>
                              )}
                            </div>
                          </header>

                          <div className="win-result-yaku">
                            {ronResult.yakuNames.map(
                              (name) => (
                                <span key={name}>
                                  {name}
                                </span>
                              )
                            )}

                            {ronResult.yakumanMultiplier ===
                              0 &&
                              (ronResult.doraCount ?? 0) >
                                0 && (
                                <span>
                                  ドラ
                                  {ronResult.doraCount}
                                </span>
                              )}
                          </div>

                          <div className="win-result-score">
                            <strong>
                              {ronResult.yakumanMultiplier >
                              0
                                ? ronResult.limitName ??
                                  "役満"
                                : `${ronResult.han}翻 ${ronResult.fu ?? 0}符`}
                            </strong>

                            {ronResult.limitName &&
                              ronResult.yakumanMultiplier ===
                                0 && (
                                <span>
                                  {
                                    ronResult.limitName
                                  }
                                </span>
                              )}

                            <b>
                              {formatScore(
                                ronResult.totalPoints
                              )}
                              点
                            </b>
                          </div>
                        </section>
                      );
                    }
                  )}
                </div>

                <div className="win-result-changes double-ron-result-changes">
                  {doubleRonResult.pointChanges.map(
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
        {abortiveDrawResult?.reason ===
          "tripleRon" &&
          round.phase === "roundEnd" && (
            <section
              className="win-result-overlay"
              role="dialog"
              aria-modal="true"
              aria-label="三家和結果"
            >
              <article className="win-result-card triple-ron-result-card">
                <header className="win-result-header">
                  <div>
                    <span>途中流局</span>

                    <strong>三家和</strong>
                  </div>

                  <b className="draw-result-count">
                    3人ロン
                  </b>
                </header>

                <div className="triple-ron-players">
                  {abortiveDrawResult.ronCandidateSeats.map(
                    (seat) => {
                      const candidate =
                        round.players[seat];

                      return (
                        <div key={seat}>
                          <span className="wind-badge">
                            {getWindLabel(
                              candidate.seatWind
                            )}
                          </span>

                          <strong>
                            {candidate.name}
                          </strong>
                        </div>
                      );
                    }
                  )}
                </div>

                <div className="draw-result-summary">
                  <span>精算</span>

                  <strong>点数移動なし</strong>
                </div>

                <p className="triple-ron-description">
                  3人の和了はすべて無効となり、
                  親は連荘します。
                  {round.riichiPool > 0
                    ? `供託${formatScore(
                        round.riichiPool
                      )}点は次局へ持ち越します。`
                    : "供託点はありません。"}
                </p>

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
