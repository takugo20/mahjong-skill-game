import {
  formatSkillEffectValues
} from "./lib/akuukan/skillEffectText";
import type {
  PlayerSkillDefinition
} from "./lib/akuukan/playerSkillCatalogTypes";
import {
  getPlayerSkillMaxLevel,
  PLAYER_SKILL_LEVELS
} from "./lib/akuukan/playerSkillCatalogTypes";
import type {
  SkillLevel
} from "./lib/akuukan/types";

interface Props {
  skill: PlayerSkillDefinition;
  currentLevel: SkillLevel | null;
}

export function SkillLevelInfo({
  skill,
  currentLevel
}: Props) {
  const maximum = getPlayerSkillMaxLevel(skill);

  return (
    <div>
      <p>
        {skill.kind === "passive"
          ? "パッシブ：条件成立時に自動発動"
          : currentLevel === null
            ? `解放時の消費MP：${skill.levels[1].mpCost}`
            : `現在の消費MP：${
                skill.levels[currentLevel].mpCost
              }`}
      </p>

      <p>
        {currentLevel === null
          ? "解放時の効果"
          : "現在レベルの効果"}
      </p>

      <ul>
        {formatSkillEffectValues(
          skill.levels[currentLevel ?? 1].effectValues
        ).map(text => (
          <li key={text}>{text}</li>
        ))}
      </ul>

      <details>
        <summary
          style={{
            minHeight: 44,
            cursor: "pointer"
          }}
        >
          レベル別の効果・MP・必要EXP
        </summary>

        <table
          style={{
            width: "100%",
            textAlign: "center",
            fontSize: 14
          }}
        >
          <caption>
            {skill.name}のレベル一覧
          </caption>

          <thead>
            <tr>
              <th scope="col">Lv.</th>
              <th scope="col">消費MP</th>
              <th scope="col">
                次のLv.までの必要EXP
              </th>
            </tr>
          </thead>

          <tbody>
            {PLAYER_SKILL_LEVELS
              .filter(level => level <= maximum)
              .map(level => (
                <tr key={level}>
                  <th scope="row">
                    {level}
                    {level === currentLevel ? "（現在）" : ""}
                  </th>

                  <td>
                    {skill.kind === "passive"
                      ? "—"
                      : skill.levels[level].mpCost}
                  </td>

                  <td>
                    {level === maximum
                      ? "最大レベル"
                      : skill.levels[level].requiredExp}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        <p>
          必要EXPは各レベルで必要な総量です。
        </p>

        {PLAYER_SKILL_LEVELS
          .filter(level => level <= maximum)
          .map(level => (
            <div key={level}>
              <h4>Lv.{level}の効果</h4>

              <ul>
                {formatSkillEffectValues(
                  skill.levels[level].effectValues
                ).map(text => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            </div>
          ))}

        <p>
          抽選重みの倍率は、その牌を引く確率そのものの
          倍率ではありません。
          適用条件はスキル説明をご確認ください。
        </p>
      </details>
    </div>
  );
}
