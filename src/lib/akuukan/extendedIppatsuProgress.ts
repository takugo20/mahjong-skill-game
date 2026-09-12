export interface AkuukanPlayerSkill5_4Progress {
  readonly completedTurnsAfterRiichi: number;
  readonly awaitingDiscardReactions: boolean;
  readonly interruptedByCallOrKan: boolean;
}

// 立直が正式に成立した時点で作成する。
export function createAkuukanPlayerSkill5_4Progress():
  AkuukanPlayerSkill5_4Progress {
  return {
    completedTurnsAfterRiichi: 0,
    awaitingDiscardReactions: false,
    interruptedByCallOrKan: false
  };
}

export function recordAkuukanPlayerSkill5_4Discard(
  progress: AkuukanPlayerSkill5_4Progress,
  isRiichiDeclaration: boolean
): AkuukanPlayerSkill5_4Progress {
  if (
    isRiichiDeclaration ||
    progress.interruptedByCallOrKan ||
    progress.awaitingDiscardReactions
  ) {
    return progress;
  }

  return {
    ...progress,
    awaitingDiscardReactions: true
  };
}

export function completeAkuukanPlayerSkill5_4DiscardReactions(
  progress: AkuukanPlayerSkill5_4Progress
): AkuukanPlayerSkill5_4Progress {
  if (
    !progress.awaitingDiscardReactions ||
    progress.interruptedByCallOrKan
  ) {
    return progress;
  }

  return {
    ...progress,
    completedTurnsAfterRiichi:
      progress.completedTurnsAfterRiichi + 1,
    awaitingDiscardReactions: false
  };
}

export function interruptAkuukanPlayerSkill5_4Progress(
  progress: AkuukanPlayerSkill5_4Progress
): AkuukanPlayerSkill5_4Progress {
  if (progress.interruptedByCallOrKan) {
    return progress;
  }

  return {
    ...progress,
    awaitingDiscardReactions: false,
    interruptedByCallOrKan: true
  };
}
