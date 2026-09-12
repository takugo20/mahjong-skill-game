import type {
  EnemyProgressState
} from "./lib/akuukan/enemyProgress";
import type {
  EnemyId
} from "./lib/akuukan/types";
import {
  ENEMY_CATALOG,
  getEnemyDefinition
} from "./lib/akuukan/enemyCatalog";
import {
  calculatePlayerSkillMatchExperience
} from "./lib/akuukan/playerSkillMatchExperience";

interface Props {
  selectedEnemyId: EnemyId;
  progress: EnemyProgressState;
}

export function EnemyGuide({
  selectedEnemyId,
  progress
}: Props) {
  return (
    <section
      aria-label="対戦相手の情報"
      style={{ margin: "16px 0" }}
    >
      <h2>対戦相手の情報</h2>

      <p>
        敵の名前を押すと、能力と解放条件を確認できます。
      </p>

      {ENEMY_CATALOG.map(enemy => {
        const record = progress.enemies[enemy.id];
        const condition = enemy.unlockCondition;

        return (
          <details
            key={`${selectedEnemyId}:${enemy.id}`}
            open={enemy.id === selectedEnemyId}
            style={{
              border: "1px solid #777",
              borderRadius: 8,
              padding: 12,
              marginBottom: 8
            }}
          >
            <summary
              style={{
                minHeight: 44,
                cursor: "pointer"
              }}
            >
              {enemy.displayName}
              （{record.isUnlocked ? "挑戦可能" : "未解放"}）
              {enemy.id === selectedEnemyId ? "・選択中" : ""}
            </summary>

            <p>
              この敵との対局で1位になった回数：
              {record.firstPlaceCount}回
            </p>

            {condition ? (
              <>
                <p>
                  解放条件：{condition.description}
                </p>

                <p>
                  {
                    getEnemyDefinition(
                      condition.requiredEnemyId
                    ).displayName
                  }
                  での1位回数：
                  {
                    progress.enemies[
                      condition.requiredEnemyId
                    ].firstPlaceCount
                  }
                  {" / "}
                  {condition.requiredFirstPlaceCount}回
                </p>
              </>
            ) : (
              <p>最初から挑戦できます。</p>
            )}

            <p>基本EXP：{enemy.baseExperience}</p>

            <p>
              順位別EXP（装備スキル1個あたり・最大レベルを除く）
            </p>

            <table
              style={{
                width: "100%",
                textAlign: "center"
              }}
            >
              <thead>
                <tr>
                  {([1, 2, 3, 4] as const).map(rank => (
                    <th key={rank} scope="col">
                      {rank}位
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                <tr>
                  {([1, 2, 3, 4] as const).map(rank => (
                    <td key={rank}>
                      {
                        calculatePlayerSkillMatchExperience(
                          enemy.baseExperience,
                          rank
                        )
                      }
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>

            <h3>特殊能力</h3>

            <ul>
              {enemy.abilities.map(ability => (
                <li key={ability.id}>
                  {ability.description}
                </li>
              ))}
            </ul>

            <h3>
              打ち方の傾向：{enemy.strategy.archetype}
            </h3>

            <p>{enemy.strategy.description}</p>
          </details>
        );
      })}
    </section>
  );
}
