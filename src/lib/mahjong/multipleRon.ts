import type {
  PlayerState,
  RoundAbortiveDrawResult,
  RoundDoubleRonResult,
  RoundPointResult,
  RoundWinResult,
  SeatIndex
} from "./types";

export interface ResolveRonDeclarationsInput {
  players: readonly PlayerState[];
  winResults: readonly RoundWinResult[];
  riichiPool: number;
}

export interface SingleRonDeclarationResult {
  kind: "singleRon";
  winResult: RoundWinResult;
  playersAfter: PlayerState[];
  riichiPoolAfter: number;
}

export interface DoubleRonDeclarationResult {
  kind: "doubleRon";
  doubleRonResult: RoundDoubleRonResult;
  playersAfter: PlayerState[];
  riichiPoolAfter: number;
}

export interface TripleRonDeclarationResult {
  kind: "tripleRon";
  abortiveDrawResult:
    RoundAbortiveDrawResult;
  playersAfter: PlayerState[];
  riichiPoolAfter: number;
}

export type RonDeclarationResult =
  | SingleRonDeclarationResult
  | DoubleRonDeclarationResult
  | TripleRonDeclarationResult;

function validatePlayers(
  players: readonly PlayerState[]
): void {
  if (players.length !== 4) {
    throw new Error(
      "ロン精算には4人のプレイヤーが必要です。"
    );
  }

  const playerIds = new Set(
    players.map((player) => player.id)
  );
  const seats = new Set(
    players.map((player) => player.seat)
  );

  if (
    playerIds.size !== 4 ||
    seats.size !== 4
  ) {
    throw new Error(
      "プレイヤーIDと座席は一意にしてください。"
    );
  }

  if (
    players.some(
      (player) =>
        !Number.isInteger(player.score)
    )
  ) {
    throw new Error(
      "持ち点は整数で指定してください。"
    );
  }
}

function validateRiichiPool(
  riichiPool: number
): void {
  if (
    !Number.isInteger(riichiPool) ||
    riichiPool < 0 ||
    riichiPool % 1000 !== 0
  ) {
    throw new Error(
      "供託点は0以上の1000点単位で指定してください。"
    );
  }
}

function validatePointChanges(
  players: readonly PlayerState[],
  winResult: RoundWinResult
): void {
  if (
    winResult.pointChanges.length !==
    players.length
  ) {
    throw new Error(
      "ロン結果には4人分の点数移動が必要です。"
    );
  }

  const playerById = new Map(
    players.map(
      (player) => [player.id, player]
    )
  );
  const changedPlayerIds = new Set<string>();

  for (
    const change of winResult.pointChanges
  ) {
    const player = playerById.get(
      change.playerId
    );

    if (
      !player ||
      changedPlayerIds.has(change.playerId) ||
      change.seat !== player.seat ||
      change.pointsBefore !== player.score ||
      change.pointsAfter !==
        change.pointsBefore + change.change
    ) {
      throw new Error(
        "ロン結果の点数移動がプレイヤー情報と一致しません。"
      );
    }

    changedPlayerIds.add(change.playerId);
  }

  const winnerChange =
    winResult.pointChanges.find(
      (change) =>
        change.seat ===
        winResult.winnerSeat
    );

  if (
    !winnerChange ||
    winnerChange.change !==
      winResult.totalPoints
  ) {
    throw new Error(
      "和了者の取得点がロン結果と一致しません。"
    );
  }
}

function getSeatDistance(
  discarderSeat: SeatIndex,
  candidateSeat: SeatIndex
): number {
  return (
    candidateSeat - discarderSeat + 4
  ) % 4;
}

function validateAndOrderWinResults(
  players: readonly PlayerState[],
  winResults: readonly RoundWinResult[]
): {
  loserSeat: SeatIndex;
  orderedWinResults: RoundWinResult[];
} {
  if (
    winResults.length < 1 ||
    winResults.length > 3
  ) {
    throw new Error(
      "ロン結果は1件から3件で指定してください。"
    );
  }

  if (
    winResults.some(
      (result) =>
        result.winMethod !== "ron" ||
        result.loserSeat === null
    )
  ) {
    throw new Error(
      "ロン以外の和了結果は複数ロン精算に使用できません。"
    );
  }

  const loserSeat =
    winResults[0].loserSeat;

  if (loserSeat === null) {
    throw new Error(
      "放銃者が指定されていません。"
    );
  }

  if (
    winResults.some(
      (result) =>
        result.loserSeat !== loserSeat
    )
  ) {
    throw new Error(
      "複数ロンの放銃者は同一にしてください。"
    );
  }

  const winnerSeats = new Set(
    winResults.map(
      (result) => result.winnerSeat
    )
  );

  if (
    winnerSeats.size !==
      winResults.length ||
    winnerSeats.has(loserSeat)
  ) {
    throw new Error(
      "和了者は放銃者以外の異なる座席にしてください。"
    );
  }

  for (const winResult of winResults) {
    validatePointChanges(
      players,
      winResult
    );
  }

  return {
    loserSeat,
    orderedWinResults: [
      ...winResults
    ].sort(
      (left, right) =>
        getSeatDistance(
          loserSeat,
          left.winnerSeat
        ) -
        getSeatDistance(
          loserSeat,
          right.winnerSeat
        )
    )
  };
}

function removeRiichiPoolAward(
  winResult: RoundWinResult,
  riichiPool: number
): RoundWinResult {
  if (riichiPool === 0) {
    return {
      ...winResult,
      pointChanges:
        winResult.pointChanges.map(
          (change) => ({ ...change })
        )
    };
  }

  if (winResult.totalPoints < riichiPool) {
    throw new Error(
      "和了点が供託点を下回っています。"
    );
  }

  return {
    ...winResult,
    totalPoints:
      winResult.totalPoints - riichiPool,
    pointChanges:
      winResult.pointChanges.map(
        (change) =>
          change.seat ===
          winResult.winnerSeat
            ? {
                ...change,
                change:
                  change.change -
                  riichiPool,
                pointsAfter:
                  change.pointsAfter -
                  riichiPool
              }
            : { ...change }
      )
  };
}

function combinePointChanges(
  players: readonly PlayerState[],
  winResults: readonly RoundWinResult[]
): RoundPointResult[] {
  const changesByPlayerId = new Map(
    players.map(
      (player) => [player.id, 0]
    )
  );

  for (const winResult of winResults) {
    for (
      const change of winResult.pointChanges
    ) {
      changesByPlayerId.set(
        change.playerId,
        (
          changesByPlayerId.get(
            change.playerId
          ) ?? 0
        ) + change.change
      );
    }
  }

  return players.map((player) => {
    const change =
      changesByPlayerId.get(player.id) ?? 0;

    return {
      playerId: player.id,
      seat: player.seat,
      pointsBefore: player.score,
      change,
      pointsAfter:
        player.score + change
    };
  });
}

function applyPointChanges(
  players: readonly PlayerState[],
  pointChanges:
    readonly RoundPointResult[]
): PlayerState[] {
  const pointsAfterByPlayerId = new Map(
    pointChanges.map(
      (change) => [
        change.playerId,
        change.pointsAfter
      ]
    )
  );

  return players.map((player) => ({
    ...player,
    score:
      pointsAfterByPlayerId.get(
        player.id
      ) ?? player.score
  }));
}

export function resolveRonDeclarations(
  input: ResolveRonDeclarationsInput
): RonDeclarationResult {
  validatePlayers(input.players);
  validateRiichiPool(input.riichiPool);

  const {
    loserSeat,
    orderedWinResults
  } = validateAndOrderWinResults(
    input.players,
    input.winResults
  );

  if (orderedWinResults.length === 1) {
    const winResult =
      orderedWinResults[0];
    const pointChanges =
      combinePointChanges(
        input.players,
        [winResult]
      );

    return {
      kind: "singleRon",
      winResult,
      playersAfter: applyPointChanges(
        input.players,
        pointChanges
      ),
      riichiPoolAfter: 0
    };
  }

  if (orderedWinResults.length === 2) {
    const firstWinResult = {
      ...orderedWinResults[0],
      pointChanges:
        orderedWinResults[0]
          .pointChanges.map(
            (change) => ({ ...change })
          )
    };
    const secondWinResult =
      removeRiichiPoolAward(
        orderedWinResults[1],
        input.riichiPool
      );
    const winResults: [
      RoundWinResult,
      RoundWinResult
    ] = [
      firstWinResult,
      secondWinResult
    ];
    const pointChanges =
      combinePointChanges(
        input.players,
        winResults
      );

    return {
      kind: "doubleRon",
      doubleRonResult: {
        loserSeat,
        winResults,
        pointChanges,
        riichiPoolRecipientSeat:
          input.riichiPool > 0
            ? firstWinResult.winnerSeat
            : null
      },
      playersAfter: applyPointChanges(
        input.players,
        pointChanges
      ),
      riichiPoolAfter: 0
    };
  }

  const candidateSeats =
    orderedWinResults.map(
      (result) => result.winnerSeat
    ) as [
      SeatIndex,
      SeatIndex,
      SeatIndex
    ];

  return {
    kind: "tripleRon",
    abortiveDrawResult: {
      reason: "tripleRon",
      discarderSeat: loserSeat,
      ronCandidateSeats:
        candidateSeats
    },
    playersAfter:
      input.players.map(
        (player) => ({ ...player })
      ),
    riichiPoolAfter: input.riichiPool
  };
}
