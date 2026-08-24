import type {
  PlayerPointChange,
  RoundScorePlayer
} from "./settlement";

export interface ExhaustiveDrawSettlementInput<
  TPlayer extends RoundScorePlayer =
    RoundScorePlayer
> {
  players: readonly TPlayer[];
  tenpaiPlayerIds: readonly string[];
}

export interface ExhaustiveDrawSettlementResult<
  TPlayer extends RoundScorePlayer =
    RoundScorePlayer
> {
  tenpaiPlayerIds: string[];
  notenPlayerIds: string[];
  pointChanges: PlayerPointChange[];
  playersAfter: TPlayer[];
}

const NOTEN_PAYMENT_TOTAL = 3000;

function validatePlayers(
  players: readonly RoundScorePlayer[]
): void {
  if (players.length !== 4) {
    throw new Error(
      "流局精算には4人のプレイヤーが必要です"
    );
  }

  const playerIds = new Set(
    players.map((player) => player.id)
  );

  if (
    playerIds.size !== players.length ||
    players.some(
      (player) => player.id.length === 0
    )
  ) {
    throw new Error(
      "プレイヤーIDは空でない一意の値にしてください"
    );
  }

  if (
    players.some(
      (player) =>
        !Number.isInteger(player.points)
    )
  ) {
    throw new Error(
      "持ち点は整数で指定してください"
    );
  }
}

function validateTenpaiPlayerIds(
  players: readonly RoundScorePlayer[],
  tenpaiPlayerIds: readonly string[]
): void {
  const uniqueTenpaiIds = new Set(
    tenpaiPlayerIds
  );

  if (
    uniqueTenpaiIds.size !==
    tenpaiPlayerIds.length
  ) {
    throw new Error(
      "聴牌者IDは重複させないでください"
    );
  }

  const playerIds = new Set(
    players.map((player) => player.id)
  );

  if (
    tenpaiPlayerIds.some(
      (playerId) =>
        !playerIds.has(playerId)
    )
  ) {
    throw new Error(
      "聴牌者に存在しないプレイヤーが指定されています"
    );
  }
}

function createChangeMap(
  players: readonly RoundScorePlayer[],
  tenpaiPlayerIds: readonly string[]
): Map<string, number> {
  const changes = new Map(
    players.map(
      (player) => [player.id, 0]
    )
  );

  const tenpaiCount =
    tenpaiPlayerIds.length;
  const notenCount =
    players.length - tenpaiCount;

  if (
    tenpaiCount === 0 ||
    notenCount === 0
  ) {
    return changes;
  }

  const tenpaiGain =
    NOTEN_PAYMENT_TOTAL / tenpaiCount;
  const notenPayment =
    NOTEN_PAYMENT_TOTAL / notenCount;
  const tenpaiIdSet = new Set(
    tenpaiPlayerIds
  );

  for (const player of players) {
    changes.set(
      player.id,
      tenpaiIdSet.has(player.id)
        ? tenpaiGain
        : -notenPayment
    );
  }

  return changes;
}

function applyChanges<
  TPlayer extends RoundScorePlayer
>(
  players: readonly TPlayer[],
  changes: ReadonlyMap<string, number>
): {
  pointChanges: PlayerPointChange[];
  playersAfter: TPlayer[];
} {
  const pointChanges = players.map(
    (player) => {
      const change =
        changes.get(player.id) ?? 0;

      return {
        playerId: player.id,
        pointsBefore: player.points,
        change,
        pointsAfter:
          player.points + change
      };
    }
  );

  const pointsAfterById = new Map(
    pointChanges.map(
      (change) => [
        change.playerId,
        change.pointsAfter
      ]
    )
  );

  const playersAfter = players.map(
    (player) => ({
      ...player,
      points:
        pointsAfterById.get(player.id) ??
        player.points
    })
  );

  return {
    pointChanges,
    playersAfter
  };
}

export function resolveExhaustiveDrawSettlement<
  TPlayer extends RoundScorePlayer
>(
  input:
    ExhaustiveDrawSettlementInput<TPlayer>
): ExhaustiveDrawSettlementResult<TPlayer> {
  validatePlayers(input.players);
  validateTenpaiPlayerIds(
    input.players,
    input.tenpaiPlayerIds
  );

  const tenpaiIdSet = new Set(
    input.tenpaiPlayerIds
  );

  const tenpaiPlayerIds =
    input.players
      .filter((player) =>
        tenpaiIdSet.has(player.id)
      )
      .map((player) => player.id);

  const notenPlayerIds =
    input.players
      .filter((player) =>
        !tenpaiIdSet.has(player.id)
      )
      .map((player) => player.id);

  const changes = createChangeMap(
    input.players,
    tenpaiPlayerIds
  );

  const applied = applyChanges(
    input.players,
    changes
  );

  return {
    tenpaiPlayerIds,
    notenPlayerIds,
    pointChanges:
      applied.pointChanges,
    playersAfter:
      applied.playersAfter
  };
}
