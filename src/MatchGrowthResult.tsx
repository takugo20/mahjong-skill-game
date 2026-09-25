import type {
  AkuukanMatchProgressSettlement
} from "./lib/akuukan/matchProgressSettlement";
import {
  getPlayerSkillDefinition
} from "./lib/akuukan/playerSkillCatalog";
import {
  getPlayerSkillMaxLevel
} from "./lib/akuukan/playerSkillCatalogTypes";
import { ENEMY_NAMES } from "./enemy-art/EnemyPortrait";
import "./SkillExperience.css";
import "./MatchGrowthResult.css";

interface Props {
  settlement?: AkuukanMatchProgressSettlement | null;
}

export function MatchGrowthResult({
  settlement
}: Props) {
  if (!settlement) return null;

  return (
    <section aria-label="装備スキル獲得EXP">
      <h3>装備スキル獲得EXP</h3>

      {settlement.awards.length === 0 ? (
        <p>
          装備スキルがないため、経験値の付与はありません。
        </p>
      ) : (
        <ul>
          {settlement.awards.map(award => {
            const skill = getPlayerSkillDefinition(
              award.skillId
            );
            const progress =
              settlement.growth.skills[award.skillId];

            if (!progress.isUnlocked) return null;

            const maximum =
              progress.level >= getPlayerSkillMaxLevel(skill);

            return (
              <li key={award.skillId}>
                <div className="match-growth-skill-heading">
                  <strong>{skill.name}</strong>
                  <span className="player-skill-level">Lv.{progress.level}</span>
                </div>

                {award.levelsGained > 0 && (
                  <p className="match-growth-level-up">
                    レベルアップ！ Lv.{progress.level - award.levelsGained} → Lv.{progress.level}
                  </p>
                )}

                <p>
                  {award.failureReason === "maximumLevel"
                    ? "最大レベルのためEXP加算なし"
                    : `獲得EXP：+${award.experienceApplied}`}
                </p>

                <div className={`skill-experience${maximum ? " skill-experience--max" : ""}`}>
                  <div className="skill-experience-label">
                    <span>{maximum ? "最高レベル" : `Lv.${progress.level + 1}まで`}</span>
                    <span>{maximum ? "MAX" : `${progress.currentExp} / ${skill.levels[progress.level].requiredExp} EXP`}</span>
                  </div>
                  <progress
                    aria-label={`${skill.name}の経験値`}
                    aria-valuetext={maximum ? "最高レベル" : `${progress.currentExp} / ${skill.levels[progress.level].requiredExp} EXP`}
                    max={maximum ? 1 : skill.levels[progress.level].requiredExp}
                    value={maximum ? 1 : progress.currentExp}
                  />
                </div>

              </li>
            );
          })}
        </ul>
      )}

      {settlement.unlockedSkillIds.length > 0 && (
        <>
          <h4 className="match-growth-unlock">新しく解放したスキル</h4>

          <ul>
            {settlement.unlockedSkillIds.map(id => (
              <li key={id} className="match-growth-unlock">
                {getPlayerSkillDefinition(id).name}（Lv.1）
              </li>
            ))}
          </ul>

          <p>
            次の対局前に「スキル装備を変更」から装備できます。
          </p>
        </>
      )}

      {settlement.unlockedEnemyId && (
        <p className="match-growth-unlock">
          新しい対戦相手：
          {ENEMY_NAMES[settlement.unlockedEnemyId]}
          {" を解放しました！"}
        </p>
      )}
    </section>
  );
}
