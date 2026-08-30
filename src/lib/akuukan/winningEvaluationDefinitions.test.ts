import {
  describe,
  expect,
  it
} from "vitest";
import {
  AKUUKAN_NORMAL_YAKU_DEFINITIONS,
  AKUUKAN_YAKUMAN_DEFINITIONS,
  getAkuukanNormalYakuDefinition,
  getAkuukanNormalYakuStandardHan,
  getAkuukanYakumanDefinition,
  isAkuukanYakumanAllowedByClosedState
} from "./winningEvaluationDefinitions";

describe("亜空間麻雀の通常役定義", () => {
  it("仕様書どおり30種類の名称と翻数を定義する", () => {
    expect(
      AKUUKAN_NORMAL_YAKU_DEFINITIONS.map(
        (definition) => [
          definition.id,
          definition.name,
          definition.closedHan,
          definition.openHan
        ]
      )
    ).toEqual([
      ["riichi", "立直", 1, null],
      [
        "doubleRiichi",
        "ダブル立直",
        2,
        null
      ],
      ["ippatsu", "一発", 1, null],
      [
        "menzenTsumo",
        "門前清自摸和",
        1,
        null
      ],
      ["tanyao", "断么九", 1, 1],
      ["pinfu", "平和", 1, null],
      ["iipeikou", "一盃口", 1, null],
      [
        "yakuhaiWhite",
        "役牌・白",
        1,
        1
      ],
      [
        "yakuhaiGreen",
        "役牌・發",
        1,
        1
      ],
      [
        "yakuhaiRed",
        "役牌・中",
        1,
        1
      ],
      ["seatWind", "自風牌", 1, 1],
      [
        "prevailingWind",
        "場風牌",
        1,
        1
      ],
      ["rinshan", "嶺上開花", 1, 1],
      ["chankan", "槍槓", 1, 1],
      ["haitei", "海底摸月", 1, 1],
      ["houtei", "河底撈魚", 1, 1],
      ["sevenPairs", "七対子", 2, null],
      ["toitoi", "対々和", 2, 2],
      ["sanankou", "三暗刻", 2, 2],
      ["sankantsu", "三槓子", 2, 2],
      [
        "sanshokuDoukou",
        "三色同刻",
        2,
        2
      ],
      ["shousangen", "小三元", 2, 2],
      ["honroutou", "混老頭", 2, 2],
      [
        "sanshokuDoujun",
        "三色同順",
        2,
        1
      ],
      ["ittsuu", "一気通貫", 2, 1],
      ["chanta", "混全帯么九", 2, 1],
      ["ryanpeikou", "二盃口", 3, null],
      ["junchan", "純全帯么九", 3, 2],
      ["honitsu", "混一色", 3, 2],
      ["chinitsu", "清一色", 6, 5]
    ]);
  });

  it("通常役IDを重複させず正の翻数を保持する", () => {
    const ids =
      AKUUKAN_NORMAL_YAKU_DEFINITIONS.map(
        (definition) => definition.id
      );

    expect(ids).toHaveLength(30);
    expect(new Set(ids).size).toBe(30);

    for (
      const definition of
        AKUUKAN_NORMAL_YAKU_DEFINITIONS
    ) {
      expect(
        Number.isInteger(
          definition.closedHan
        )
      ).toBe(true);
      expect(definition.closedHan).toBeGreaterThan(
        0
      );

      if (definition.openHan !== null) {
        expect(
          Number.isInteger(
            definition.openHan
          )
        ).toBe(true);
        expect(definition.openHan).toBeGreaterThan(
          0
        );
      }
    }
  });

  it("門前・副露状態に応じた標準翻数を返す", () => {
    expect(
      getAkuukanNormalYakuStandardHan(
        "riichi",
        true
      )
    ).toBe(1);
    expect(
      getAkuukanNormalYakuStandardHan(
        "riichi",
        false
      )
    ).toBe(0);
    expect(
      getAkuukanNormalYakuStandardHan(
        "sanshokuDoujun",
        true
      )
    ).toBe(2);
    expect(
      getAkuukanNormalYakuStandardHan(
        "sanshokuDoujun",
        false
      )
    ).toBe(1);
    expect(
      getAkuukanNormalYakuStandardHan(
        "chinitsu",
        true
      )
    ).toBe(6);
    expect(
      getAkuukanNormalYakuStandardHan(
        "chinitsu",
        false
      )
    ).toBe(5);

    expect(
      getAkuukanNormalYakuDefinition(
        "chinitsu"
      )
    ).toBe(
      AKUUKAN_NORMAL_YAKU_DEFINITIONS[29]
    );
    expect(() =>
      getAkuukanNormalYakuDefinition(
        "unknown" as never
      )
    ).toThrow(
      "未定義の通常役IDです: unknown"
    );
  });
});

describe("亜空間麻雀の役満定義", () => {
  it("仕様書どおり15種類の名称・倍数・門前条件を定義する", () => {
    expect(
      AKUUKAN_YAKUMAN_DEFINITIONS.map(
        (definition) => [
          definition.id,
          definition.name,
          definition.multiplier,
          definition.closedOnly
        ]
      )
    ).toEqual([
      ["tenhou", "天和", 1, true],
      ["chiihou", "地和", 1, true],
      [
        "thirteenOrphans",
        "国士無双",
        1,
        true
      ],
      [
        "thirteenOrphansThirteenSided",
        "国士無双十三面待ち",
        2,
        true
      ],
      [
        "fourConcealedTriplets",
        "四暗刻",
        1,
        true
      ],
      [
        "fourConcealedTripletsSingleWait",
        "四暗刻単騎",
        2,
        true
      ],
      [
        "bigThreeDragons",
        "大三元",
        1,
        false
      ],
      [
        "littleFourWinds",
        "小四喜",
        1,
        false
      ],
      [
        "bigFourWinds",
        "大四喜",
        2,
        false
      ],
      ["allHonors", "字一色", 1, false],
      ["allGreen", "緑一色", 1, false],
      [
        "allTerminals",
        "清老頭",
        1,
        false
      ],
      ["nineGates", "九蓮宝燈", 1, true],
      [
        "pureNineGates",
        "純正九蓮宝燈",
        2,
        true
      ],
      ["fourKans", "四槓子", 1, false]
    ]);
  });

  it("役満IDを重複させず正しいダブル役満を保持する", () => {
    const ids =
      AKUUKAN_YAKUMAN_DEFINITIONS.map(
        (definition) => definition.id
      );
    const doubleYakumanIds =
      AKUUKAN_YAKUMAN_DEFINITIONS.filter(
        (definition) =>
          definition.multiplier === 2
      ).map(
        (definition) => definition.id
      );

    expect(ids).toHaveLength(15);
    expect(new Set(ids).size).toBe(15);
    expect(doubleYakumanIds).toEqual([
      "thirteenOrphansThirteenSided",
      "fourConcealedTripletsSingleWait",
      "bigFourWinds",
      "pureNineGates"
    ]);
  });

  it("門前限定役満と副露可能役満を区別する", () => {
    expect(
      isAkuukanYakumanAllowedByClosedState(
        "nineGates",
        true
      )
    ).toBe(true);
    expect(
      isAkuukanYakumanAllowedByClosedState(
        "nineGates",
        false
      )
    ).toBe(false);
    expect(
      isAkuukanYakumanAllowedByClosedState(
        "bigThreeDragons",
        false
      )
    ).toBe(true);
    expect(
      getAkuukanYakumanDefinition(
        "bigFourWinds"
      ).multiplier
    ).toBe(2);
    expect(() =>
      getAkuukanYakumanDefinition(
        "unknown" as never
      )
    ).toThrow(
      "未定義の役満IDです: unknown"
    );
  });
});
