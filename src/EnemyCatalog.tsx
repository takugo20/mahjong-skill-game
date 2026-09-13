import { EnemyGuide } from "./EnemyGuide";
import type {
  EnemyProgressState
} from "./lib/akuukan/enemyProgress";
import type {
  EnemyId
} from "./lib/akuukan/types";

interface Props {
  selectedEnemyId: EnemyId;
  progress: EnemyProgressState;
  onBack: () => void;
}

export function EnemyCatalog({
  selectedEnemyId,
  progress,
  onBack
}: Props) {
  return (
    <main className="akuukan-skill-screen">
      <h1>敵図鑑</h1>

      <button
        type="button"
        className="akuukan-skill-back"
        onClick={onBack}
      >
        タイトルに戻る
      </button>

      <EnemyGuide
        selectedEnemyId={selectedEnemyId}
        progress={progress}
      />
    </main>
  );
}
