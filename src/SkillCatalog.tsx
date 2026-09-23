import { PlayerSkillCard } from "./PlayerSkillCard";
import { useState } from "react";
import type { AkuukanSaveData } from "./lib/akuukan/saveData";
import { PLAYER_SKILL_CATALOG } from "./lib/akuukan/playerSkillCatalog";

interface Props {
  saveData: AkuukanSaveData;
  onBack: () => void;
}

export function SkillCatalog({ saveData, onBack }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const growth = saveData.playerSkillGrowth;

  const unlockedCount = PLAYER_SKILL_CATALOG.filter(
    skill => growth.skills[skill.id].isUnlocked
  ).length;

  const visible = PLAYER_SKILL_CATALOG.filter(skill => {
    const unlocked = growth.skills[skill.id].isUnlocked;
    return (
      (filter === "all" || (filter === "unlocked" ? unlocked : !unlocked))
      && `${skill.catalogNumber} ${skill.name}`.includes(query.trim())
    );
  });

  return (
    <main className="akuukan-skill-screen">
      <h1>スキル図鑑</h1>
      <p>解放済み：{unlockedCount} / {PLAYER_SKILL_CATALOG.length}</p>

      <button
        type="button"
        className="akuukan-skill-back akuukan-back-button"
        onClick={onBack}
      >
        戻る
      </button>

      <label>
        スキル検索
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="番号・スキル名"
          style={{ minHeight: 44, maxWidth: "100%" }}
        />
      </label>

      <label>
        表示対象
        <select
          value={filter}
          onChange={event => setFilter(event.target.value)}
          style={{ minHeight: 44 }}
        >
          <option value="all">すべて</option>
          <option value="unlocked">解放済み</option>
          <option value="locked">未解放</option>
        </select>
      </label>

      <p aria-live="polite">表示件数：{visible.length}</p>

      {visible.length === 0 && (
        <p>該当するスキルはありません。</p>
      )}

      <div className="skill-card-grid">
        {visible.map(skill => (
          <PlayerSkillCard
            key={skill.id}
            skill={skill}
            progress={growth.skills[skill.id]}
          />
        ))}
      </div>
    </main>
  );
}
