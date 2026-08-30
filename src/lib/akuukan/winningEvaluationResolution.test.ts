import {
  describe,
  expect,
  it
} from "vitest";
import {
  createAkuukanNormalYakuCandidate,
  createAkuukanYakumanCandidate
} from "./winningEvaluation";
import {
  resolveAkuukanWinningYaku
} from "./winningEvaluationResolution";
import {
  addAkuukanNormalYakuHan,
  cancelAkuukanNormalYakuOpenReduction,
  grantAkuukanNormalYaku,
  grantAkuukanYakuman,
  invalidateAkuukanNormalYaku,
  invalidateAkuukanYakuman,
  setAkuukanNormalYakuFixedHan
} from "./winningEvaluationUpdates";

describe("亜空間麻雀の有効役集計", () => {
  it("七対子が無効なら他の役が残っても七対子形を無効にする", () => {
    const menzenTsumo =
      createAkuukanNormalYakuCandidate({
        id: "menzenTsumo",
        name: "門前清自摸和",
        closedHan: 1,
        standardHan: 1,
        standardEligible: true
      });
    const sevenPairs =
      invalidateAkuukanNormalYaku(
        createAkuukanNormalYakuCandidate({
          id: "sevenPairs",
          name: "七対子",
          closedHan: 2,
          standardHan: 2,
          standardEligible: true
        }),
        "enemy-ability:E-7"
      );
    const result =
      resolveAkuukanWinningYaku({
        normalYakuCandidates: [
          menzenTsumo,
          sevenPairs
        ],
        yakumanCandidates: [],
        winningShapeKind: "sevenPairs"
      });

    expect(
      result.activeNormalYakuCandidates
    ).toEqual([menzenTsumo]);
    expect(result.hasValidWinningShape).toBe(
      false
    );
    expect(result.hasValidYaku).toBe(false);
  });

  it("国士系役満がすべて無効なら通常役が残っても国士形を無効にする", () => {
    const menzenTsumo =
      createAkuukanNormalYakuCandidate({
        id: "menzenTsumo",
        name: "門前清自摸和",
        closedHan: 1,
        standardHan: 1,
        standardEligible: true
      });
    const thirteenOrphans =
      invalidateAkuukanYakuman(
        createAkuukanYakumanCandidate({
          id: "thirteenOrphans",
          name: "国士無双",
          standardMultiplier: 1,
          standardEligible: true
        }),
        "enemy-ability:E-7"
      );
    const thirteenSided =
      invalidateAkuukanYakuman(
        createAkuukanYakumanCandidate({
          id:
            "thirteenOrphansThirteenSided",
          name: "国士無双十三面待ち",
          standardMultiplier: 2,
          standardEligible: true
        }),
        "enemy-ability:E-7"
      );
    const result =
      resolveAkuukanWinningYaku({
        normalYakuCandidates: [
          menzenTsumo
        ],
        yakumanCandidates: [
          thirteenSided,
          thirteenOrphans
        ],
        winningShapeKind:
          "thirteenOrphans"
      });

    expect(
      result.activeNormalYakuCandidates
    ).toEqual([menzenTsumo]);
    expect(result.hasValidWinningShape).toBe(
      false
    );
    expect(result.hasValidYaku).toBe(false);
  });

  it("国士十三面だけが無効でも通常の国士が残れば国士形を有効にする", () => {
    const thirteenOrphans =
      createAkuukanYakumanCandidate({
        id: "thirteenOrphans",
        name: "国士無双",
        standardMultiplier: 1,
        standardEligible: true
      });
    const thirteenSided =
      invalidateAkuukanYakuman(
        createAkuukanYakumanCandidate({
          id:
            "thirteenOrphansThirteenSided",
          name: "国士無双十三面待ち",
          standardMultiplier: 2,
          standardEligible: true
        }),
        "enemy-ability:E-7"
      );
    const result =
      resolveAkuukanWinningYaku({
        normalYakuCandidates: [],
        yakumanCandidates: [
          thirteenSided,
          thirteenOrphans
        ],
        winningShapeKind:
          "thirteenOrphans"
      });

    expect(
      result.activeYakumanCandidates
    ).toEqual([thirteenOrphans]);
    expect(result.hasValidWinningShape).toBe(
      true
    );
    expect(result.hasValidYaku).toBe(true);
  });

  it("通常形では七対子候補の無効化を和了形へ波及させない", () => {
    const ryanpeikou =
      createAkuukanNormalYakuCandidate({
        id: "ryanpeikou",
        name: "二盃口",
        closedHan: 3,
        standardHan: 3,
        standardEligible: true
      });
    const sevenPairs =
      invalidateAkuukanNormalYaku(
        createAkuukanNormalYakuCandidate({
          id: "sevenPairs",
          name: "七対子",
          closedHan: 2,
          standardHan: 2,
          standardEligible: true
        }),
        "enemy-ability:E-7"
      );
    const result =
      resolveAkuukanWinningYaku({
        normalYakuCandidates: [
          ryanpeikou,
          sevenPairs
        ],
        yakumanCandidates: [],
        winningShapeKind: "standard"
      });

    expect(result.hasValidWinningShape).toBe(
      true
    );
    expect(result.hasValidYaku).toBe(true);
  });
  
  it("候補がなければ有効役なしとして初期化する", () => {
    const normalYakuCandidates = [] as const;
    const yakumanCandidates = [] as const;
    const result = resolveAkuukanWinningYaku({
      normalYakuCandidates,
      yakumanCandidates
    });

    expect(result.normalYakuCandidates).toBe(
      normalYakuCandidates
    );
    expect(result.yakumanCandidates).toBe(
      yakumanCandidates
    );
    expect(
      result.activeNormalYakuCandidates
    ).toEqual([]);
    expect(
      result.activeYakumanCandidates
    ).toEqual([]);
    expect(result.normalYakuHan).toBe(0);
    expect(result.scoringNormalYakuHan).toBe(0);
    expect(result.yakumanMultiplier).toBe(0);
    expect(result.hasValidYaku).toBe(false);
    expect(result.usesYakumanScoring).toBe(
      false
    );
  });

  it("喰い下がり無効・固定翻・翻加算後の通常役を合計する", () => {
    const sanshoku = addAkuukanNormalYakuHan(
      cancelAkuukanNormalYakuOpenReduction(
        createAkuukanNormalYakuCandidate({
          id: "sanshokuDoujun",
          name: "三色同順",
          closedHan: 2,
          standardHan: 1,
          standardEligible: true
        }),
        "player-skill:2-1"
      ),
      "player-skill:2-8",
      2
    );
    const tanyao =
      setAkuukanNormalYakuFixedHan(
        createAkuukanNormalYakuCandidate({
          id: "tanyao",
          name: "断么九",
          closedHan: 1,
          standardHan: 1,
          standardEligible: true
        }),
        "player-skill:1-7",
        3
      );
    const result = resolveAkuukanWinningYaku({
      normalYakuCandidates: [
        sanshoku,
        tanyao
      ],
      yakumanCandidates: []
    });

    expect(
      result.activeNormalYakuCandidates.map(
        (candidate) => candidate.id
      )
    ).toEqual([
      "sanshokuDoujun",
      "tanyao"
    ]);
    expect(result.normalYakuHan).toBe(7);
    expect(result.scoringNormalYakuHan).toBe(7);
    expect(result.yakumanMultiplier).toBe(0);
    expect(result.hasValidYaku).toBe(true);
    expect(result.usesYakumanScoring).toBe(
      false
    );
  });

  it("重複整理後の上位役だけを合計する", () => {
    const riichi =
      createAkuukanNormalYakuCandidate({
        id: "riichi",
        name: "立直",
        closedHan: 1,
        standardHan: 1,
        standardEligible: true
      });
    const doubleRiichi =
      createAkuukanNormalYakuCandidate({
        id: "doubleRiichi",
        name: "ダブル立直",
        closedHan: 2,
        standardHan: 2,
        standardEligible: true
      });
    const normalYakuCandidates = [
      riichi,
      doubleRiichi
    ];
    const result = resolveAkuukanWinningYaku({
      normalYakuCandidates,
      yakumanCandidates: []
    });

    expect(
      result.normalYakuCandidates[0]
        ?.excludedBy
    ).toBe("doubleRiichi");
    expect(
      result.activeNormalYakuCandidates.map(
        (candidate) => candidate.id
      )
    ).toEqual(["doubleRiichi"]);
    expect(result.normalYakuHan).toBe(2);
    expect(riichi.excludedBy).toBeNull();
    expect(result.normalYakuCandidates).not.toBe(
      normalYakuCandidates
    );
  });

  it("能力で成立した通常役を有効役として合計する", () => {
    const granted = addAkuukanNormalYakuHan(
      grantAkuukanNormalYaku(
        createAkuukanNormalYakuCandidate({
          id: "pinfu",
          name: "平和",
          closedHan: 1,
          standardHan: 0,
          standardEligible: false
        }),
        "player-skill:2-6",
        1
      ),
      "player-skill:2-8",
      2
    );
    const result = resolveAkuukanWinningYaku({
      normalYakuCandidates: [granted],
      yakumanCandidates: []
    });

    expect(
      result.activeNormalYakuCandidates
    ).toEqual([granted]);
    expect(result.normalYakuHan).toBe(3);
    expect(result.scoringNormalYakuHan).toBe(3);
    expect(result.hasValidYaku).toBe(true);
  });

  it("役満時も通常役を記録し点数用通常役翻数だけを0にする", () => {
    const normal =
      createAkuukanNormalYakuCandidate({
        id: "yakuhaiWhite",
        name: "役牌 白",
        closedHan: 1,
        standardHan: 1,
        standardEligible: true
      });
    const standardYakuman =
      createAkuukanYakumanCandidate({
        id: "bigThreeDragons",
        name: "大三元",
        standardMultiplier: 1,
        standardEligible: true
      });
    const grantedYakuman = grantAkuukanYakuman(
      createAkuukanYakumanCandidate({
        id: "allHonors",
        name: "字一色",
        standardMultiplier: 1,
        standardEligible: false
      }),
      "player-skill:3-1",
      2
    );
    const result = resolveAkuukanWinningYaku({
      normalYakuCandidates: [normal],
      yakumanCandidates: [
        standardYakuman,
        grantedYakuman
      ]
    });

    expect(
      result.activeNormalYakuCandidates
    ).toEqual([normal]);
    expect(
      result.activeYakumanCandidates
    ).toEqual([
      standardYakuman,
      grantedYakuman
    ]);
    expect(result.normalYakuHan).toBe(1);
    expect(result.scoringNormalYakuHan).toBe(0);
    expect(result.yakumanMultiplier).toBe(3);
    expect(result.hasValidYaku).toBe(true);
    expect(result.usesYakumanScoring).toBe(
      true
    );
  });

  it("役への翻加算と無効化済み役満だけでは有効役にしない", () => {
    const inactiveNormal =
      addAkuukanNormalYakuHan(
        createAkuukanNormalYakuCandidate({
          id: "pinfu",
          name: "平和",
          closedHan: 1,
          standardHan: 0,
          standardEligible: false
        }),
        "player-skill:2-8",
        3
      );
    const inactiveYakuman =
      invalidateAkuukanYakuman(
        createAkuukanYakumanCandidate({
          id: "bigThreeDragons",
          name: "大三元",
          standardMultiplier: 1,
          standardEligible: true
        }),
        "enemy-ability:E-17"
      );
    const result = resolveAkuukanWinningYaku({
      normalYakuCandidates: [
        inactiveNormal
      ],
      yakumanCandidates: [
        inactiveYakuman
      ]
    });

    expect(
      result.activeNormalYakuCandidates
    ).toEqual([]);
    expect(
      result.activeYakumanCandidates
    ).toEqual([]);
    expect(result.normalYakuHan).toBe(0);
    expect(result.scoringNormalYakuHan).toBe(0);
    expect(result.yakumanMultiplier).toBe(0);
    expect(result.hasValidYaku).toBe(false);
    expect(result.usesYakumanScoring).toBe(
      false
    );
  });
});
