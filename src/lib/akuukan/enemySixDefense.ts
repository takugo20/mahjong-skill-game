import {
  getHighValueReadyDiscardIds,
  getEnemyFifteenForbiddenTileIds
} from "./enemyPushDefense";
import type {
  GameState,
  PlayerState,
  Tile,
  Discard
} from "../mahjong/types";
import { getFuritenStatus } from "../mahjong/furiten";
import { resolveRoundWin } from "../mahjong/roundWin";
import { isEnemyAbilityEnabled } from "./winningEvaluationEnemyAbilityAdjustments";

export interface EnemySixDiscardRisk {
  tileId: string;
  ronCount: number;
  estimatedLoss: number;
}

export function evaluateEnemySixDiscards(
  state: GameState,
  player: PlayerState,
  indicators: readonly Tile[],
  forbidden: readonly string[] = []
): EnemySixDiscardRisk[] | null {
  const a = state.akuukan;

  // 他家の能力が無効で、全手牌が見える敵6専用。
  if (
    !a
    || player.seat !== 2
    || a.setup.enemyId !== "enemy-6"
    || !isEnemyAbilityEnabled(a, "E-10")
    || !isEnemyAbilityEnabled(a, "E-18")
  ) {
    return null;
  }

  const opponents = state.round.players
    .filter(p => p.seat !== player.seat)
    .map(p => ({
      player: p,
      furiten: getFuritenStatus({
        concealedTiles: p.hand,
        melds: p.melds,
        discards: p.discards,
        temporaryFuriten: p.temporaryFuriten,
        riichiFuriten: p.riichiFuriten
      })
    }));

  const blocked = new Set(forbidden);
  const cache = new Map<
    string,
    Omit<EnemySixDiscardRisk, "tileId">
  >();

  return player.hand
    .filter(t => !blocked.has(t.id))
    .map(tile => {
      const key = `${tile.suit}-${tile.rank}-${tile.red}`;
      const cached = cache.get(key);

      if (cached) {
        return { tileId: tile.id, ...cached };
      }

      const discard: Discard = {
        tile,
        tsumogiri: tile.id === player.drawnTileId,
        riichiDeclaration: false,
        faceDown: false,
        called: false,
        drawnTileSource: player.drawnTileSource
      };

      const round = {
        ...state.round,
        phase: "reaction" as const,
        currentSeat: player.seat,
        pendingKan: null,
        lastDiscard: {
          seat: player.seat,
          discard
        },
        players: state.round.players.map(
          p => p.seat === player.seat ? {
            ...p,
            hand: p.hand.filter(t => t.id !== tile.id),
            drawnTileId: null,
            discards: [...p.discards, discard]
          } : p
        )
      };

      let ronCount = 0;
      let estimatedLoss = 0;

      for (const other of opponents) {
        if (
          other.furiten.isFuriten
          || !other.furiten.winningTileTypes.some(
            wait =>
              wait.suit === tile.suit
              && wait.rank === tile.rank
          )
        ) {
          continue;
        }

        const result = resolveRoundWin({
          round,
          winnerSeat: other.player.seat,
          winMethod: "ron",
          doraIndicators: indicators,
          uraDoraIndicators: [],
          doubleRiichi: other.player.doubleRiichi,
          ippatsu: other.player.ippatsu
        });

        if (!result.valid) continue;

        ronCount++;

        estimatedLoss += Math.max(
          0,
          -(result.pointChanges.find(
            p => p.seat === player.seat
          )?.change ?? 0)
        );
      }

      // 三家和は流局。安全牌とは区別する。
      const risk = {
        ronCount,
        estimatedLoss: ronCount === 3 ? 0 : estimatedLoss
      };

      cache.set(key, risk);

      return {
        tileId: tile.id,
        ...risk
      };
    });
}

export function getEnemySixForbiddenTileIds(
  state: GameState,
  player: PlayerState,
  indicators: readonly Tile[],
  forbidden: readonly string[] = []
): readonly string[] {
  const risks = evaluateEnemySixDiscards(
    state,
    player,
    indicators,
    forbidden
  );

  if (!risks?.length) return forbidden;

  const safe = risks.filter(r => r.ronCount === 0);

  const high = new Set(
    getHighValueReadyDiscardIds(
      state,
      player,
      indicators,
      safe.map(r => r.tileId)
    )
  );

  const preferred = high.size
    ? safe.filter(r => high.has(r.tileId))
    : safe;

  const minimum = Math.min(
    ...risks.map(r => r.estimatedLoss)
  );

  const allowed = new Set(
    (
      preferred.length
        ? preferred
        : risks.filter(r => r.estimatedLoss === minimum)
    ).map(r => r.tileId)
  );

  return [
    ...new Set([
      ...forbidden,
      ...risks.filter(r => !allowed.has(r.tileId))
        .map(r => r.tileId)
    ])
  ];
}

export function getEnemyDefenseForbiddenTileIds(
  state: GameState,
  player: PlayerState,
  indicators: readonly Tile[],
  forbidden: readonly string[] = []
): readonly string[] {
  return getEnemyFifteenForbiddenTileIds(
    state,
    player,
    indicators,
    getEnemySixForbiddenTileIds(
      state,
      player,
      indicators,
      forbidden
    )
  );
}
