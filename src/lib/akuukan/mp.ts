export const AKUUKAN_INITIAL_MP = 420;
export const AKUUKAN_MAX_MP = 900;
export const AKUUKAN_DRAW_MP_RECOVERY = 30;
export const AKUUKAN_ROUND_MP_RECOVERY = 390;

export interface AkuukanMpSpendResult {
  mp: number;
  succeeded: boolean;
}

function normalizeNonNegative(
  value: number
): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, value);
}

export function clampAkuukanMp(
  mp: number,
  maxMp: number = AKUUKAN_MAX_MP
): number {
  const safeMaxMp =
    normalizeNonNegative(maxMp);

  return Math.min(
    normalizeNonNegative(mp),
    safeMaxMp
  );
}

export function recoverAkuukanMp(
  mp: number,
  recovery: number,
  maxMp: number = AKUUKAN_MAX_MP
): number {
  const currentMp = clampAkuukanMp(
    mp,
    maxMp
  );
  const safeRecovery =
    normalizeNonNegative(recovery);

  return clampAkuukanMp(
    currentMp + safeRecovery,
    maxMp
  );
}

export function trySpendAkuukanMp(
  mp: number,
  cost: number,
  maxMp: number = AKUUKAN_MAX_MP
): AkuukanMpSpendResult {
  const currentMp = clampAkuukanMp(
    mp,
    maxMp
  );

  if (
    !Number.isFinite(cost) ||
    cost < 0 ||
    currentMp < cost
  ) {
    return {
      mp: currentMp,
      succeeded: false
    };
  }

  return {
    mp: currentMp - cost,
    succeeded: true
  };
}
