import type {
  AkuukanMatchProgressSettlement
} from "./lib/akuukan/matchProgressSettlement";
import {
  getPlayerSkillDefinition
} from "./lib/akuukan/playerSkillCatalog";
import {
  getPlayerSkillMaxLevel
} from "./lib/akuukan/playerSkillCatalogTypes";
import {
  getEnemyDefinition
} from "./lib/akuukan/enemyCatalog";

interface Props {
  settlement?: AkuukanMatchProgressSettlement | null;
}

export function MatchGrowthResult({
  settlement
}: Props) {
  if (!settlement) return null;

  return (
    <section aria-label="今回の成長結果">
      <h3>今回の成長結果</h3>

      <p>
        装備スキルごとの基本獲得EXP：
        {settlement.experiencePerSkill}
      </p>

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
                <strong>{skill.name}</strong>

                <p>
                  {award.levelsGained > 0
                    ? `レベルアップ！ Lv.${
                        progress.level - award.levelsGained
                      } → Lv.${progress.level}`
                    : `Lv.${progress.level}`}
                  {maximum ? "（最大）" : ""}
                </p>

                <p>
                  {award.failureReason === "maximumLevel"
                    ? "最大レベルのためEXP加算なし"
                    : `獲得EXP：+${award.experienceApplied}`}
                </p>

                {!maximum && (
                  <p>
                    次のレベルまで：あと
                    {skill.levels[progress.level].requiredExp -
                      progress.currentExp}
                    {" EXP"}
                  </p>
                )}

                {award.experienceDiscarded > 0 && (
                  <p>
                    最大レベル到達による余剰EXP：
                    {award.experienceDiscarded}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {settlement.unlockedSkillIds.length > 0 && (
        <>
          <h4>新しく解放したスキル</h4>

          <ul>
            {settlement.unlockedSkillIds.map(id => (
              <li key={id}>
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
        <p>
          新しい対戦相手：
          {
            getEnemyDefinition(
              settlement.unlockedEnemyId
            ).displayName
          }
          {" を解放しました！"}
        </p>
      )}
    </section>
  );
}
