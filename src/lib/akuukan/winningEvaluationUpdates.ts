import type {
  NormalYakuId
} from "../mahjong/yaku";
import type {
  YakumanId
} from "../mahjong/yakuman";
import type {
  AkuukanEffectSourceId
} from "./types";
import type {
  AkuukanNormalYakuCandidate,
  AkuukanYakuHanChange,
  AkuukanYakuHanGrant,
  AkuukanYakumanCandidate,
  AkuukanYakumanGrant
} from "./winningEvaluation";

function assertPositiveInteger(
  label: string,
  value: number
): void {
  if (
    !Number.isInteger(value) ||
    value < 1
  ) {
    throw new Error(
      `${label}は1以上の整数で指定してください。`
    );
  }
}

function addUniqueSource(
  sources:
    readonly AkuukanEffectSourceId[],
  sourceId: AkuukanEffectSourceId
): readonly AkuukanEffectSourceId[] {
  return sources.includes(sourceId)
    ? sources
    : [...sources, sourceId];
}

function upsertBySource<
  TEntry extends {
    readonly sourceId:
      AkuukanEffectSourceId;
  }
>(
  entries: readonly TEntry[],
  nextEntry: TEntry,
  isSameValue: (
    current: TEntry,
    next: TEntry
  ) => boolean
): readonly TEntry[] {
  const index = entries.findIndex(
    (entry) =>
      entry.sourceId ===
      nextEntry.sourceId
  );

  if (index < 0) {
    return [...entries, nextEntry];
  }

  const current = entries[index];

  if (
    current &&
    isSameValue(current, nextEntry)
  ) {
    return entries;
  }

  return entries.map(
    (entry, entryIndex) =>
      entryIndex === index
        ? nextEntry
        : entry
  );
}

export function grantAkuukanNormalYaku(
  candidate: AkuukanNormalYakuCandidate,
  sourceId: AkuukanEffectSourceId,
  han: number
): AkuukanNormalYakuCandidate {
  assertPositiveInteger(
    "成立許可翻数",
    han
  );

  const abilityGrants = upsertBySource<
    AkuukanYakuHanGrant
  >(
    candidate.abilityGrants,
    {
      sourceId,
      han
    },
    (current, next) =>
      current.han === next.han
  );

  return abilityGrants ===
    candidate.abilityGrants
    ? candidate
    : {
        ...candidate,
        abilityGrants
      };
}

export function invalidateAkuukanNormalYaku(
  candidate: AkuukanNormalYakuCandidate,
  sourceId: AkuukanEffectSourceId
): AkuukanNormalYakuCandidate {
  const invalidatedBy = addUniqueSource(
    candidate.invalidatedBy,
    sourceId
  );

  return invalidatedBy ===
    candidate.invalidatedBy
    ? candidate
    : {
        ...candidate,
        invalidatedBy
      };
}

export function excludeAkuukanNormalYakuByOverlap(
  candidate: AkuukanNormalYakuCandidate,
  excludedBy: NormalYakuId
): AkuukanNormalYakuCandidate {
  return candidate.excludedBy === excludedBy
    ? candidate
    : {
        ...candidate,
        excludedBy
      };
}

export function cancelAkuukanNormalYakuOpenReduction(
  candidate: AkuukanNormalYakuCandidate,
  sourceId: AkuukanEffectSourceId
): AkuukanNormalYakuCandidate {
  const openReductionCancelledBy =
    addUniqueSource(
      candidate.openReductionCancelledBy,
      sourceId
    );

  return openReductionCancelledBy ===
    candidate.openReductionCancelledBy
    ? candidate
    : {
        ...candidate,
        openReductionCancelledBy
      };
}

export function setAkuukanNormalYakuFixedHan(
  candidate: AkuukanNormalYakuCandidate,
  sourceId: AkuukanEffectSourceId,
  han: number
): AkuukanNormalYakuCandidate {
  assertPositiveInteger("固定翻数", han);

  const fixedHanChanges = upsertBySource<
    AkuukanYakuHanChange
  >(
    candidate.fixedHanChanges,
    {
      sourceId,
      han
    },
    (current, next) =>
      current.han === next.han
  );

  return fixedHanChanges ===
    candidate.fixedHanChanges
    ? candidate
    : {
        ...candidate,
        fixedHanChanges
      };
}

export function addAkuukanNormalYakuHan(
  candidate: AkuukanNormalYakuCandidate,
  sourceId: AkuukanEffectSourceId,
  han: number
): AkuukanNormalYakuCandidate {
  assertPositiveInteger("加算翻数", han);

  const hanAdditions = upsertBySource<
    AkuukanYakuHanChange
  >(
    candidate.hanAdditions,
    {
      sourceId,
      han
    },
    (current, next) =>
      current.han === next.han
  );

  return hanAdditions ===
    candidate.hanAdditions
    ? candidate
    : {
        ...candidate,
        hanAdditions
      };
}

export function grantAkuukanYakuman(
  candidate: AkuukanYakumanCandidate,
  sourceId: AkuukanEffectSourceId,
  multiplier: number
): AkuukanYakumanCandidate {
  assertPositiveInteger(
    "役満倍率",
    multiplier
  );

  const abilityGrants = upsertBySource<
    AkuukanYakumanGrant
  >(
    candidate.abilityGrants,
    {
      sourceId,
      multiplier
    },
    (current, next) =>
      current.multiplier ===
      next.multiplier
  );

  return abilityGrants ===
    candidate.abilityGrants
    ? candidate
    : {
        ...candidate,
        abilityGrants
      };
}

export function invalidateAkuukanYakuman(
  candidate: AkuukanYakumanCandidate,
  sourceId: AkuukanEffectSourceId
): AkuukanYakumanCandidate {
  const invalidatedBy = addUniqueSource(
    candidate.invalidatedBy,
    sourceId
  );

  return invalidatedBy ===
    candidate.invalidatedBy
    ? candidate
    : {
        ...candidate,
        invalidatedBy
      };
}

export function excludeAkuukanYakumanByOverlap(
  candidate: AkuukanYakumanCandidate,
  excludedBy: YakumanId
): AkuukanYakumanCandidate {
  return candidate.excludedBy === excludedBy
    ? candidate
    : {
        ...candidate,
        excludedBy
      };
}
