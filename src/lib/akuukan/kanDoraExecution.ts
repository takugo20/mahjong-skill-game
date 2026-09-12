import {
  executeKan,
  type KanExecutionInput,
  type KanExecutionResult
} from "../mahjong/kanExecution";
import {
  exchangeAkuukanPlayerSkill5_3KanDoraIndicator
} from "./kanDoraIndicatorExchange";
import { getEquippedPlayerSkill } from "./equipment";
import { isAkuukanSourceDisabled } from "./state";
import type { AkuukanGameState } from "./types";

export function executeKanWithAkuukanPlayerSkill5_3(
  input: KanExecutionInput,
  akuukan: AkuukanGameState | null | undefined,
  random: () => number = Math.random
): KanExecutionResult {
  // executeKanは元の状態を変更しない。
  // まず合法性と成立する槓子を確認する。
  const ordinary = executeKan(input);

  if (
    !akuukan ||
    ordinary.declarerSeat !== 0 ||
    !getEquippedPlayerSkill(akuukan, "5-3") ||
    isAkuukanSourceDisabled(
      akuukan,
      "player-skill:5-3"
    ) ||
    ordinary.round.doraIndicatorCount <=
      input.round.doraIndicatorCount
  ) {
    return ordinary;
  }

  const previousMelds = input.round.players[0].melds;

  const kanMeld = ordinary.round.players[0].melds.find(
    meld =>
      ["openKan", "closedKan", "addedKan"].includes(
        meld.kind
      ) &&
      !previousMelds.includes(meld)
  );

  if (!kanMeld) {
    throw new Error(
      "今回成立した槓子が見つかりません。"
    );
  }

  const walls =
    exchangeAkuukanPlayerSkill5_3KanDoraIndicator({
      akuukan,
      kanOwnerIsPlayer: true,
      kanEstablished: true,
      addsNewIndicator: true,
      kanMeld,
      liveWall: input.round.liveWall,
      deadWall: input.round.deadWall,
      doraIndicatorCount: input.round.doraIndicatorCount,
      rinshanDrawCount: input.round.rinshanDrawCount,
      random
    });

  // 槓前の状態に交換結果を反映して実行するため、
  // 槓回数は1回だけ増える。
  return executeKan({
    ...input,
    round: {
      ...input.round,
      ...walls
    }
  });
}
