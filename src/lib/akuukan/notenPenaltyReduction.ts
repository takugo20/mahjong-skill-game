import type {
  ExhaustiveDrawSettlementResult
} from "../mahjong/drawSettlement";
import type {
  PlayerPointChange,
  RoundScorePlayer
} from "../mahjong/settlement";
import {
  getEquippedPlayerSkill
} from "./equipment";
import {
  getPlayerSkillDefinition
} from "./playerSkillCatalog";
import {
  getPlayerSkillLevelDefinition
} from "./playerSkillCatalogTypes";
import {
  isAkuukanSourceDisabled
} from "./state";
import type {
  AkuukanGameState
} from "./types";

export interface ApplyPlayerSkill3_1Input<
  TPlayer extends RoundScorePlayer =
    RoundScorePlayer
> {
  readonly akuukan: AkuukanGameState;
  readonly players: readonly TPlayer[];
  readonly playerId: string;
  readonly settlement:
    ExhaustiveDrawSettlementResult<TPlayer>;
}

function roundUpToHundred(
  points: number
): number {
  return Math.ceil(points / 100) * 100;
}

function getPaymentPercent(
  akuukan: AkuukanGameState
): number | null {
  const equippedSkill =
    getEquippedPlayerSkill(
      akuukan,
      "3-1"
    );

  if (
    !equippedSkill ||
    isAkuukanSourceDisabled(
      akuukan,
      "player-skill:3-1"
    )
  ) {
    return null;
  }

  const paymentPercent =
    getPlayerSkillLevelDefinition(
      getPlayerSkillDefinition("3-1"),
      equippedSkill.level
    ).effectValues
      .notenPenaltyPaymentPercent;

  if (
    typeof paymentPercent !== "number" ||
    !Number.isFinite(paymentPercent) ||
    paymentPercent < 0 ||
    paymentPercent > 100
  ) {
    throw new Error(
      "スキル3-1のノーテン罰符割合が不正です。"
    );
  }

  return paymentPercent;
}

function getTenpaiPlayerIdsInTurnOrder(
  players: readonly RoundScorePlayer[],
  playerId: string,
  tenpaiPlayerIds: readonly string[]
): string[] {
  const playerIndex = players.findIndex(
    (player) => player.id === playerId
  );
  const tenpaiIdSet = new Set(
    tenpaiPlayerIds
  );

  if (playerIndex < 0) {
    throw new Error(
      "スキル3-1の発動者が見つかりません。"
    );
  }

  return players
    .slice(playerIndex + 1)
    .concat(players.slice(0, playerIndex))
    .filter((player) =>
      tenpaiIdSet.has(player.id)
    )
    .map((player) => player.id);
}

function createAdjustedChanges(
  input: ApplyPlayerSkill3_1Input,
  reducedPlayerPayment: number
): Map<string, number> {
  const notenIdSet = new Set(
    input.settlement.notenPlayerIds
  );
  const changes = new Map<string, number>();
  let totalPayment = 0;

  for (const change of
    input.settlement.pointChanges) {
    if (!notenIdSet.has(change.playerId)) {
      continue;
    }

    const payment =
      change.playerId === input.playerId
        ? reducedPlayerPayment
        : Math.max(0, -change.change);

    changes.set(
      change.playerId,
      payment === 0 ? 0 : -payment
    );
    totalPayment += payment;
  }

  const orderedTenpaiIds =
    getTenpaiPlayerIdsInTurnOrder(
      input.players,
      input.playerId,
      input.settlement.tenpaiPlayerIds
    );
  const evenGain = Math.floor(
    totalPayment /
      orderedTenpaiIds.length /
      100
  ) * 100;
  let remainingPayment =
    totalPayment -
    evenGain * orderedTenpaiIds.length;

  for (const tenpaiPlayerId of
    orderedTenpaiIds) {
    const additionalGain =
      remainingPayment >= 100
        ? 100
        : 0;

    changes.set(
      tenpaiPlayerId,
      evenGain + additionalGain
    );
    remainingPayment -= additionalGain;
  }

  return changes;
}

function applyChanges<
  TPlayer extends RoundScorePlayer
>(
  input: ApplyPlayerSkill3_1Input<TPlayer>,
  changes: ReadonlyMap<string, number>
): ExhaustiveDrawSettlementResult<TPlayer> {
  const pointChanges: PlayerPointChange[] =
    input.players.map((player) => {
      const change =
        changes.get(player.id) ?? 0;

      return {
        playerId: player.id,
        pointsBefore: player.points,
        change,
        pointsAfter: player.points + change
      };
    });
  const pointsAfterById = new Map(
    pointChanges.map((change) => [
      change.playerId,
      change.pointsAfter
    ])
  );

  return {
    tenpaiPlayerIds: [
      ...input.settlement.tenpaiPlayerIds
    ],
    notenPlayerIds: [
      ...input.settlement.notenPlayerIds
    ],
    pointChanges,
    playersAfter: input.players.map(
      (player) => ({
        ...player,
        points:
          pointsAfterById.get(player.id) ??
          player.points
      })
    )
  };
}

export function applyPlayerSkill3_1ToDrawSettlement<
  TPlayer extends RoundScorePlayer
>(
  input: ApplyPlayerSkill3_1Input<TPlayer>
): ExhaustiveDrawSettlementResult<TPlayer> {
  const paymentPercent = getPaymentPercent(
    input.akuukan
  );
  const playerChange =
    input.settlement.pointChanges.find(
      (change) =>
        change.playerId === input.playerId
    );

  if (
    paymentPercent === null ||
    !input.settlement.notenPlayerIds.includes(
      input.playerId
    ) ||
    input.settlement.tenpaiPlayerIds.length ===
      0 ||
    !playerChange ||
    playerChange.change >= 0
  ) {
    return input.settlement;
  }

  const normalPayment =
    -playerChange.change;
  const reducedPlayerPayment =
    roundUpToHundred(
      normalPayment *
        (paymentPercent / 100)
    );
  const changes = createAdjustedChanges(
    input,
    reducedPlayerPayment
  );

  return applyChanges(input, changes);
}
