import { useState } from "react";
import type { AkuukanSaveData } from "./lib/akuukan/saveData";
import type { PlayerSkillId } from "./lib/akuukan/types";
import { PLAYER_SKILL_CATALOG } from "./lib/akuukan/playerSkillCatalog";
import {
  AKUUKAN_MAX_EQUIPPED_SKILLS as MAX
} from "./lib/akuukan/setupValidation";
import {
  tryEquipPlayerSkillInSaveData,
  tryUnequipPlayerSkillFromSaveData
} from "./lib/akuukan/saveDataEquipment";
import {
  saveAkuukanSaveDataToBrowser
} from "./lib/akuukan/browserSaveData";

interface Props {
  saveData: AkuukanSaveData;
  onSaved: (saveData: AkuukanSaveData) => void;
  onCancel: () => void;
}

export function SkillEquipment({
  saveData,
  onSaved,
  onCancel
}: Props) {
  const [draft, setDraft] = useState(saveData);
  const [message, setMessage] = useState("");

  function toggle(id: PlayerSkillId, equipped: boolean) {
    const result = equipped
      ? tryUnequipPlayerSkillFromSaveData(draft, id)
      : tryEquipPlayerSkillInSaveData(draft, id);

    if (result.succeeded) {
      setDraft(result.saveData);
      setMessage("");
    } else {
      setMessage(
        "装備を変更できません。解放状態と装備数を確認してください。"
      );
    }
  }

  function save() {
    const result = saveAkuukanSaveDataToBrowser(draft);

    if (result.succeeded) {
      onSaved(draft);
    } else {
      setMessage(
        "保存できませんでした。選択は保持しています。「装備を保存」を押して再試行してください。"
      );
    }
  }

  return (
    <main
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: 24
      }}
    >
      <h1>スキル装備</h1>

      <p>装備数：{draft.equippedSkills.length} / {MAX}</p>

      <p>
        解放済みスキルを選択してください。
        保存すると次の対局に反映されます。
      </p>

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap"
        }}
      >
        <button
          type="button"
          onClick={save}
          style={{ minHeight: 44 }}
        >
          装備を保存
        </button>

        <button
          type="button"
          onClick={onCancel}
          style={{ minHeight: 44 }}
        >
          変更を破棄して戻る
        </button>
      </div>

      {message && <p role="alert">{message}</p>}

      <div
        style={{
          display: "grid",
          gap: 12,
          marginTop: 16
        }}
      >
        {PLAYER_SKILL_CATALOG.map(skill => {
          const progress =
            draft.playerSkillGrowth.skills[skill.id];

          if (!progress.isUnlocked) return null;

          const equipped = draft.equippedSkills.some(
            item => item.id === skill.id
          );

          return (
            <article
              key={skill.id}
              style={{
                border: "1px solid #777",
                borderRadius: 8,
                padding: 12
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  minHeight: 44
                }}
              >
                <input
                  type="checkbox"
                  checked={equipped}
                  disabled={
                    !equipped &&
                    draft.equippedSkills.length >= MAX
                  }
                  onChange={() =>
                    toggle(skill.id, equipped)
                  }
                />
                No.{skill.catalogNumber}{" "}
                {skill.name} Lv.{progress.level}
              </label>

              <p>
                {skill.kind === "active"
                  ? "アクティブ"
                  : "パッシブ"}
                {" ／ "}評価：{skill.evaluation}
              </p>

              <p>{skill.description}</p>
            </article>
          );
        })}
      </div>
    </main>
  );
}
