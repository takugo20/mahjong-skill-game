import {
  calculateShanten,
  getTileTypeFromIndex,
  getTileTypeIndex,
  getWinningTileTypes
} from "../mahjong/hand";
import { isDora } from "../mahjong/tiles";
import { evaluateWinningHand } from "../mahjong/winning";
import type {
  PlayerState, Tile, Wind
} from "../mahjong/types";
import type {
  AkuukanE28RiverDrawCandidate
} from "./riverDraw";

export interface SelectAkuukanE28RiverDrawCandidateInput {
  readonly drawer: PlayerState;
  readonly players?: readonly PlayerState[];
  readonly candidates:
    readonly AkuukanE28RiverDrawCandidate[];
  readonly visibleTiles?: readonly Tile[];
  readonly prevailingWind?: Wind;
  readonly doraIndicators?: readonly Tile[];

  // 旧呼び出しとの互換用。山の中身は判断に使わない。
  readonly liveWall?: readonly Tile[];
}

function same(
  a: Pick<Tile, "suit" | "rank">,
  b: Pick<Tile, "suit" | "rank">
) {
  return a.suit === b.suit && a.rank === b.rank;
}

export function selectAkuukanE28RiverDrawCandidate(
  input: SelectAkuukanE28RiverDrawCandidateInput
): AkuukanE28RiverDrawCandidate | null {
  const { drawer } = input;
  const candidates = input.candidates.filter(
    c => !c.faceDown
  );

  if (!candidates.length) return null;

  const indicators = input.doraIndicators ?? [];
  const known = new Map<string, Tile>();

  const publicTiles = (input.players ?? []).flatMap(p => [
    ...p.melds.flatMap(m => m.tiles),
    ...p.discards
      .filter(d => p.seat === drawer.seat || !d.faceDown)
      .map(d => d.tile)
  ]);

  for (const tile of [
    ...drawer.hand,
    ...drawer.melds.flatMap(m => m.tiles),
    ...drawer.discards.map(d => d.tile),
    ...publicTiles,
    ...(input.visibleTiles ?? []),
    ...indicators,
    ...candidates.map(c => c.tile)
  ]) {
    known.set(tile.id, tile);
  }

  const remaining = Array<number>(34).fill(4);

  for (const tile of known.values()) {
    remaining[getTileTypeIndex(tile)]--;
  }

  const bonus = (hand: readonly Tile[]) =>
    hand.reduce(
      (sum, t) =>
        sum + Number(t.red)
        + indicators.filter(d => isDora(t, d)).length,
      0
    );

  const baselineBonus = bonus(drawer.hand);
  const acceptanceCache = new Map<string, number>();

  const handKey = (hand: readonly Tile[]) =>
    hand.map(getTileTypeIndex)
      .sort((a, b) => a - b)
      .join(",");

  const acceptance = (
    hand: readonly Tile[],
    shanten: number
  ): number => {
    const key = handKey(hand);
    const cached = acceptanceCache.get(key);

    if (cached !== undefined) return cached;

    let total = 0;

    for (let i = 0; i < 34; i++) {
      if (remaining[i] <= 0) continue;

      const tile: Tile = {
        ...getTileTypeFromIndex(i),
        id: `e28-estimate-${i}`,
        red: false
      };

      if (
        calculateShanten(
          [...hand, tile],
          drawer.melds
        ).minimum < shanten
      ) {
        total += remaining[i];
      }
    }

    acceptanceCache.set(key, total);
    return total;
  };

  const currentShanten = calculateShanten(
    drawer.hand,
    drawer.melds
  ).minimum;

  const currentAcceptance = acceptance(
    drawer.hand,
    currentShanten
  );

  const shapeCache = new Map<
    string,
    {
      winPoints: number;
      shanten: number;
      hands: Tile[][];
    }
  >();

  const evaluations = candidates.map(candidate => {
    const key =
      `${getTileTypeIndex(candidate.tile)}-${candidate.tile.red}`;

    let shape = shapeCache.get(key);

    if (!shape) {
      const hand = [...drawer.hand, candidate.tile];

      const win = evaluateWinningHand({
        concealedTiles: hand,
        melds: drawer.melds,
        winningTile: candidate.tile,
        winMethod: "tsumo",
        seatWind: drawer.seatWind,
        prevailingWind: input.prevailingWind ?? "east",
        doraIndicators: indicators,
        riichi: drawer.riichi,
        doubleRiichi: drawer.doubleRiichi,
        ippatsu: drawer.ippatsu
      });

      // 立直後は、和了しなければ取得牌をツモ切りする。
      const choices = (
        drawer.riichi ? [candidate.tile] : hand
      ).map(discard => {
        const after = hand.filter(
          t => t.id !== discard.id
        );

        return {
          hand: after,
          shanten: calculateShanten(
            after,
            drawer.melds
          ).minimum
        };
      });

      const minimum = Math.min(
        ...choices.map(c => c.shanten)
      );

      shape = {
        winPoints: win.valid
          ? win.best.score.totalPoints
          : 0,
        shanten: minimum,
        hands: choices
          .filter(c => c.shanten === minimum)
          .map(c => c.hand)
      };

      shapeCache.set(key, shape);
    }

    // 他家の手牌を参照せず、公開情報から警戒する。
    const owner = input.players?.find(
      p => p.seat === candidate.riverOwnerSeat
    );

    const risky = !!owner
      && owner.seat !== drawer.seat
      && (owner.riichi || owner.melds.length >= 2)
      && !owner.discards.some(
        (d, i) =>
          i !== candidate.discardIndex
          && !d.faceDown
          && same(d.tile, candidate.tile)
      );

    return {
      candidate,
      ...shape,
      risky
    };
  });

  const winning = evaluations
    .filter(e => e.winPoints > 0)
    .sort((a, b) => b.winPoints - a.winPoints);

  if (winning.length) return winning[0].candidate;

  const scored = evaluations
    .filter(e => e.shanten <= currentShanten)
    .map(e => {
      const options = e.hands.map(hand => ({
        acceptance: acceptance(hand, e.shanten),
        bonus: bonus(hand) - baselineBonus
      })).sort(
        (a, b) =>
          b.acceptance - a.acceptance
          || b.bonus - a.bonus
      );

      return {
        ...e,
        acceptance: options[0]?.acceptance ?? 0,
        bonus: Math.max(0, ...options.map(o => o.bonus))
      };
    });

  const improved = scored
    .filter(e => e.shanten < currentShanten)
    .sort(
      (a, b) =>
        a.shanten - b.shanten
        || b.acceptance - a.acceptance
        || Number(a.risky) - Number(b.risky)
        || b.bonus - a.bonus
    );

  if (improved.length) return improved[0].candidate;

  const lowRisk = scored.filter(e => !e.risky);

  const wider = lowRisk
    .filter(e => e.acceptance > currentAcceptance)
    .sort(
      (a, b) =>
        b.acceptance - a.acceptance
        || b.bonus - a.bonus
    );

  if (wider.length) return wider[0].candidate;

  const valuable = lowRisk
    .filter(e => e.bonus > 0)
    .sort((a, b) => b.bonus - a.bonus);

  if (valuable.length) return valuable[0].candidate;

  const waits = getWinningTileTypes(
    drawer.hand,
    drawer.melds
  );

  const ownRecovery = lowRisk.find(
    e =>
      e.candidate.riverOwnerSeat === drawer.seat
      && waits.some(w => same(w, e.candidate.tile))
      && !drawer.discards.some(
        (d, i) =>
          i !== e.candidate.discardIndex
          && waits.some(w => same(w, d.tile))
      )
  );

  return ownRecovery?.candidate ?? null;
}
