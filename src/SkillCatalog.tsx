import { SkillLevelInfo } from "./SkillLevelInfo";
import { useState } from "react";
import type {
  AkuukanSaveData
} from "./lib/akuukan/saveData";
import {
  PLAYER_SKILL_CATALOG
} from "./lib/akuukan/playerSkillCatalog";
import {
  getPlayerSkillMaxLevel
} from "./lib/akuukan/playerSkillCatalogTypes";

interface Props {
  saveData: AkuukanSaveData;
  onBack: () => void;
}

export function SkillCatalog({
  saveData,
  onBack
}: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const growth = saveData.playerSkillGrowth;

  const unlockedCount = PLAYER_SKILL_CATALOG.filter(
    skill => growth.skills[skill.id].isUnlocked
  ).length;

  const visible = PLAYER_SKILL_CATALOG.filter(skill => {
    const unlocked = growth.skills[skill.id].isUnlocked;

    return (
      (
        filter === "all" ||
        (filter === "unlocked" ? unlocked : !unlocked)
      ) &&
      `${skill.name} ${skill.id} ${skill.catalogNumber}`
        .includes(query.trim())
    );
  });

  return (
    <main className="akuukan-skill-screen">
      <h1>スキル図鑑</h1>

      <p>
        解放済み：{unlockedCount} / {PLAYER_SKILL_CATALOG.length}
      </p>

      <button
        type="button"
        className="akuukan-skill-back"
        onClick={onBack}
      >
        開始画面に戻る
      </button>

      <p>
        解放条件の達成数は、対局終了後に保存された内容です。
      </p>

      <label>
        スキル検索
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="スキル名・ID・図鑑番号"
          style={{
            minHeight: 44,
            maxWidth: "100%"
          }}
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

      <p aria-live="polite">
        表示件数：{visible.length}
      </p>

      {visible.length === 0 && (
        <p>該当するスキルはありません。</p>
      )}

      {visible.map(skill => {
        const progress = growth.skills[skill.id];
        const condition = skill.unlockCondition;
        const equipped = saveData.equippedSkills.some(
          item => item.id === skill.id
        );
        const maximum =
          progress.isUnlocked &&
          progress.level >= getPlayerSkillMaxLevel(skill);

        return (
          <article
            key={skill.id}
            aria-label={skill.name}
            style={{
              border: "1px solid #777",
              borderRadius: 8,
              padding: 12,
              marginBottom: 12
            }}
          >
            <h2>
              No.{skill.catalogNumber} {skill.name}
            </h2>

            <p>
              {progress.isUnlocked
                ? `解放済み・Lv.${progress.level}`
                : "未解放"}
              {equipped ? "・装備中" : ""}
            </p>

            <p>
              {skill.kind === "active"
                ? "アクティブ"
                : "パッシブ"}
              {" ／ "}評価：{skill.evaluation}
            </p>

            <p>{skill.description}</p>

            <SkillLevelInfo
              skill={skill}
              currentLevel={progress.level}
            />

            {progress.isUnlocked && (
              maximum ? (
                <p>最大レベル</p>
              ) : (
                <p>
                  経験値：{progress.currentExp} /{" "}
                  {skill.levels[progress.level].requiredExp}
                  {" EXP"}
                </p>
              )
            )}

            {condition ? (
              <>
                <p>解放条件：{condition.description}</p>
                <p>
                  達成数：
                  {growth.unlockProgress[condition.conditionId]}
                  {" / "}{condition.targetValue}
                </p>
              </>
            ) : (
              <p>最初から解放されています。</p>
            )}
          </article>
        );
      })}
    </main>
  );
}
