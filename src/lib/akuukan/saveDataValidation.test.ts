import {
  describe,
  expect,
  it
} from "vitest";
import {
  createInitialAkuukanSaveData
} from "./saveData";
import {
  isAkuukanSaveData
} from "./saveDataValidation";

type EditableRecord =
  Record<string, unknown>;

type ValuePath =
  | string
  | readonly string[];

function createEditableSaveData(): unknown {
  return structuredClone(
    createInitialAkuukanSaveData()
  );
}

function getPathSegments(
  path: ValuePath
): string[] {
  return typeof path === "string"
    ? path.split(".")
    : [...path];
}

function getParentAtPath(
  target: unknown,
  path: ValuePath
): {
  parent: EditableRecord;
  key: string;
} {
  const segments =
    getPathSegments(path);
  const key = segments.pop();
  let current = target;

  if (!key) {
    throw new Error(
      "テストデータのパスが空です。"
    );
  }

  for (const segment of segments) {
    if (
      typeof current !== "object" ||
      current === null ||
      Array.isArray(current)
    ) {
      throw new Error(
        `テストデータのパスが不正です: ${segments.join(".")}`
      );
    }

    current =
      (current as EditableRecord)[segment];
  }

  if (
    typeof current !== "object" ||
    current === null ||
    Array.isArray(current)
  ) {
    throw new Error(
      "テストデータの変更先が不正です。"
    );
  }

  return {
    parent: current as EditableRecord,
    key
  };
}

function setValueAtPath(
  target: unknown,
  path: ValuePath,
  value: unknown
): void {
  const { parent, key } =
    getParentAtPath(target, path);

  parent[key] = value;
}

function createChangedSaveData(
  path: ValuePath,
  value: unknown
): unknown {
  const saveData =
    createEditableSaveData();

  setValueAtPath(saveData, path, value);

  return saveData;
}

function createMissingSaveData(
  path: ValuePath
): unknown {
  const saveData =
    createEditableSaveData();
  const { parent, key } =
    getParentAtPath(saveData, path);

  delete parent[key];

  return saveData;
}

function expectInvalid(
  ...values: readonly unknown[]
): void {
  values.forEach((value) => {
    expect(
      isAkuukanSaveData(value)
    ).toBe(false);
  });
}

describe("亜空間麻雀のセーブデータ検証", () => {
  it("初期データとJSON復元後のデータを受理する", () => {
    const initial =
      createInitialAkuukanSaveData();
    const restored = JSON.parse(
      JSON.stringify(initial)
    ) as unknown;

    expect(
      isAkuukanSaveData(initial)
    ).toBe(true);
    expect(
      isAkuukanSaveData(restored)
    ).toBe(true);
  });

  it("正しく成長・装備したデータを受理する", () => {
    const progressed =
      createChangedSaveData(
        "playerSkillGrowth.skills.1-1",
        {
          isUnlocked: true,
          level: 2,
          currentExp: 100
        }
      );

    setValueAtPath(
      progressed,
      "equippedSkills",
      [{ id: "1-1", level: 2 }]
    );
    setValueAtPath(
      progressed,
      "enemyProgress.enemies.enemy-1.firstPlaceCount",
      3
    );

    expect(
      isAkuukanSaveData(progressed)
    ).toBe(true);
  });

  it("オブジェクト以外・版違い・全体項目の欠損や余分を拒否する", () => {
    expectInvalid(
      null,
      [],
      "save-data",
      {},
      createChangedSaveData(
        "version",
        2
      ),
      createMissingSaveData("version"),
      createChangedSaveData(
        "unexpected",
        true
      )
    );
  });

  it("スキルIDの欠損と余分なIDを拒否する", () => {
    expectInvalid(
      createMissingSaveData(
        "playerSkillGrowth.skills.5-8"
      ),
      createChangedSaveData(
        "playerSkillGrowth.skills.invalid-skill",
        {
          isUnlocked: false,
          level: null,
          currentExp: 0
        }
      )
    );
  });

  it("不正なスキル解放状態・レベル・EXPを拒否する", () => {
    expectInvalid(
      createChangedSaveData(
        "playerSkillGrowth.skills.1-1",
        {
          isUnlocked: false,
          level: null,
          currentExp: 0
        }
      ),
      createChangedSaveData(
        "playerSkillGrowth.skills.1-1.currentExp",
        -1
      ),
      createChangedSaveData(
        "playerSkillGrowth.skills.1-1.level",
        6
      ),
      createChangedSaveData(
        "playerSkillGrowth.skills.1-1",
        {
          isUnlocked: true,
          level: 5,
          currentExp: 1
        }
      )
    );
  });

  it("解放条件進捗の欠損・余分・不正値を拒否する", () => {
    const conditionId = Object.keys(
      createInitialAkuukanSaveData()
        .playerSkillGrowth.unlockProgress
    )[0];
    const progressPath = [
      "playerSkillGrowth",
      "unlockProgress",
      conditionId
    ];

    expectInvalid(
      createMissingSaveData(progressPath),
      createChangedSaveData(
        "playerSkillGrowth.unlockProgress.invalid-condition",
        0
      ),
      createChangedSaveData(
        progressPath,
        -1
      )
    );
  });

  it("装備上限超過・重複・不正IDを拒否する", () => {
    expectInvalid(
      createChangedSaveData(
        "equippedSkills",
        Array.from(
          { length: 11 },
          () => ({
            id: "1-1",
            level: 1
          })
        )
      ),
      createChangedSaveData(
        "equippedSkills",
        [
          { id: "1-1", level: 1 },
          { id: "1-1", level: 1 }
        ]
      ),
      createChangedSaveData(
        "equippedSkills",
        [
          {
            id: "invalid-skill",
            level: 1
          }
        ]
      )
    );
  });

  it("未解放スキル・不正レベル・成長状態と異なる装備を拒否する", () => {
    expectInvalid(
      createChangedSaveData(
        "equippedSkills",
        [{ id: "2-1", level: 1 }]
      ),
      createChangedSaveData(
        "equippedSkills",
        [{ id: "1-1", level: 0 }]
      ),
      createChangedSaveData(
        "equippedSkills",
        [{ id: "1-1", level: 2 }]
      )
    );
  });

  it("敵IDの欠損・余分と不正な1位回数を拒否する", () => {
    expectInvalid(
      createMissingSaveData(
        "enemyProgress.enemies.enemy-16"
      ),
      createChangedSaveData(
        "enemyProgress.enemies.enemy-17",
        {
          isUnlocked: false,
          firstPlaceCount: 0
        }
      ),
      createChangedSaveData(
        "enemyProgress.enemies.enemy-1.firstPlaceCount",
        -1
      )
    );
  });

  it("敵の初期解放・未解放・解放条件の矛盾を拒否する", () => {
    expectInvalid(
      createChangedSaveData(
        "enemyProgress.enemies.enemy-1.isUnlocked",
        false
      ),
      createChangedSaveData(
        "enemyProgress.enemies.enemy-2.firstPlaceCount",
        1
      ),
      createChangedSaveData(
        "enemyProgress.enemies.enemy-2.isUnlocked",
        true
      )
    );
  });
});
