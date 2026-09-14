import {
  replaceEnemyNumbers
} from "./enemy-art/EnemyPortrait";
import type { PlayerSkillDefinition } from "./lib/akuukan/playerSkillCatalogTypes";
import { getPlayerSkillMaxLevel } from "./lib/akuukan/playerSkillCatalogTypes";
import type { PlayerSkillProgress } from "./lib/akuukan/playerSkillProgress";
import {
  PLAYER_SKILL_DESCRIPTIONS,
  PLAYER_SKILL_UNLOCK_TEXT
} from "./lib/akuukan/playerSkillDescriptions";

interface Props {
  skill: PlayerSkillDefinition;
  progress: PlayerSkillProgress;
  equipped?: boolean;
  disabled?: boolean;
  onToggle?: () => void;
}

export function PlayerSkillCard({
  skill,
  progress,
  equipped = false,
  disabled = false,
  onToggle
}: Props) {
  const title = (
    <>
      No.{skill.catalogNumber} {skill.name}
      {progress.isUnlocked && getPlayerSkillMaxLevel(skill) > 1 && (
        <span className="player-skill-level"> Lv.{progress.level}</span>
      )}
    </>
  );

  return (
    <article
      aria-label={skill.name}
      className={`player-skill-card${
        progress.isUnlocked ? "" : " player-skill-card--locked"
      }`}
    >
      <h2>
        {onToggle && progress.isUnlocked ? (
          <label className="player-skill-choice">
            <input
              type="checkbox"
              checked={equipped}
              disabled={disabled}
              onChange={onToggle}
            />
            <span>{title}</span>
          </label>
        ) : title}
      </h2>

      {progress.isUnlocked && (
        <p className="player-skill-description">
          {PLAYER_SKILL_DESCRIPTIONS[skill.catalogNumber]
            .split(/(\[[\d./]+\])/g)
            .map((part, index) => (
              part.startsWith("[") ? (
                <span key={index} className="player-skill-values">
                  [{part.slice(1, -1).split("/").map((value, levelIndex) => (
                    <span key={levelIndex}>
                      {levelIndex > 0 ? "/" : ""}
                      <span
                        className={
                          levelIndex + 1 === progress.level
                            ? "player-skill-value--current"
                            : "player-skill-value"
                        }
                      >
                        {value}
                      </span>
                    </span>
                  ))}]
                </span>
              ) : part
            ))}
        </p>
      )}

      <p className="player-skill-unlock">
        解放条件：{replaceEnemyNumbers(
          PLAYER_SKILL_UNLOCK_TEXT[skill.catalogNumber]
          ?? skill.unlockCondition?.description
          ?? "初期から解放"
        )}
      </p>
    </article>
  );
}
