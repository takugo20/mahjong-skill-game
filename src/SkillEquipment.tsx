import { PlayerSkillCard } from "./PlayerSkillCard";
import { useState } from "react";
import type { AkuukanSaveData } from "./lib/akuukan/saveData";
import type { PlayerSkillId } from "./lib/akuukan/types";
import { PLAYER_SKILL_CATALOG } from "./lib/akuukan/playerSkillCatalog";
import { AKUUKAN_MAX_EQUIPPED_SKILLS as MAX } from "./lib/akuukan/setupValidation";
import {
  tryEquipPlayerSkillInSaveData,
  tryUnequipPlayerSkillFromSaveData
} from "./lib/akuukan/saveDataEquipment";
import { saveAkuukanSaveDataToBrowser } from "./lib/akuukan/browserSaveData";

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
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const visibleSkills = PLAYER_SKILL_CATALOG.filter(skill => {
    if (!draft.playerSkillGrowth.skills[skill.id].isUnlocked) {
      return false;
    }

    const equipped = draft.equippedSkills.some(
      item => item.id === skill.id
    );

    return (
      (filter === "all" || equipped)
      && `${skill.catalogNumber} ${skill.name}`.includes(query.trim())
    );
  });

  function toggle(id: PlayerSkillId, equipped: boolean) {
    const result = equipped
      ? tryUnequipPlayerSkillFromSaveData(draft, id)
      : tryEquipPlayerSkillInSaveData(draft, id);

    if (result.succeeded) {
      setDraft(result.saveData);
      setMessage("");
    } else {
      setMessage("装備を変更できません。解放状態と装備数を確認してください。");
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
    <main className="akuukan-skill-screen">
      <h1>装備スキル変更</h1>
      <p>装備数：{draft.equippedSkills.length} / {MAX}</p>
      <p>
        解放済みスキルを選択してください。保存すると次の対局に反映されます。
      </p>

      <div className="akuukan-skill-toolbar">
        <div className="akuukan-skill-actions">
          <button
            type="button"
            className="akuukan-skill-save"
            onClick={save}
          >
            装備を保存
          </button>
          <button type="button" onClick={onCancel}>
            変更を破棄して戻る
          </button>
        </div>

        <p className="akuukan-skill-count" aria-live="polite">
          選択中：{draft.equippedSkills.length} / {MAX}
        </p>

        {message && <p role="alert">{message}</p>}
      </div>

      <label>
        装備スキル検索
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="番号・スキル名"
        />
      </label>

      <label>
        装備一覧の表示対象
        <select
          value={filter}
          onChange={event => setFilter(event.target.value)}
        >
          <option value="all">解放済みすべて</option>
          <option value="equipped">装備中だけ</option>
        </select>
      </label>

      <p aria-live="polite">表示件数：{visibleSkills.length}</p>

      {visibleSkills.length === 0 && (
        <p>
          該当するスキルはありません。検索内容や表示対象を変更してください。
        </p>
      )}

      <div className="skill-card-grid">
        {visibleSkills.map(skill => {
          const progress = draft.playerSkillGrowth.skills[skill.id];
          if (!progress.isUnlocked) return null;

          const equipped = draft.equippedSkills.some(
            item => item.id === skill.id
          );

          return (
            <PlayerSkillCard
              key={skill.id}
              skill={skill}
              progress={progress}
              showExperience
              equipped={equipped}
              disabled={!equipped && draft.equippedSkills.length >= MAX}
              onToggle={() => toggle(skill.id, equipped)}
            />
          );
        })}
      </div>
    </main>
  );
}
