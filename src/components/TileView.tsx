import type { Tile } from "../lib/mahjong/types";
import {
  getTileFace,
  getTileLabel
} from "../lib/mahjong/tiles";

interface TileViewProps {
  tile?: Tile;
  faceDown?: boolean;
  compact?: boolean;
  selected?: boolean;
  highlighted?: boolean;
  disabled?: boolean;
  onSelect?: (tileId: string) => void;
}

interface FaceProps {
  rank: number;
  red: boolean;
}

interface SymbolProps {
  x: number;
  y: number;
  color: string;
  scale?: number;
}

const RED = "#d51f35";
const BLUE = "#23689e";
const GREEN = "#218653";
const DARK = "#17251f";

const MAN_NUMERALS = [
  "",
  "一",
  "二",
  "三",
  "四",
  "五",
  "六",
  "七",
  "八",
  "九"
];

function PinDot({
  x,
  y,
  color,
  scale = 1
}: SymbolProps) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
    >
      <circle
        r="7.4"
        fill="#faf7e9"
        stroke={color}
        strokeWidth="2.1"
      />
      <circle
        r="4.4"
        fill="none"
        stroke={color}
        strokeWidth="1.2"
      />
      <circle
        r="1.8"
        fill={color}
      />
    </g>
  );
}

function getPinPositions(
  rank: number
): Array<[number, number]> {
  switch (rank) {
    case 2:
      return [
        [35, 28],
        [35, 72]
      ];

    case 3:
      return [
        [20, 24],
        [35, 50],
        [50, 76]
      ];

    case 4:
      return [
        [20, 27],
        [50, 27],
        [20, 73],
        [50, 73]
      ];

    case 5:
      return [
        [20, 25],
        [50, 25],
        [20, 75],
        [50, 75],
        [35, 50]
      ];

    case 6:
      return [
        [20, 20],
        [50, 20],
        [20, 50],
        [50, 50],
        [20, 80],
        [50, 80]
      ];

    case 7:
      return [
        [35, 14],
        [20, 38],
        [50, 38],
        [20, 61],
        [50, 61],
        [20, 84],
        [50, 84]
      ];

    case 8:
      return [
        [20, 14],
        [50, 14],
        [20, 38],
        [50, 38],
        [20, 62],
        [50, 62],
        [20, 86],
        [50, 86]
      ];

    case 9:
      return [
        [15, 17],
        [35, 17],
        [55, 17],
        [15, 50],
        [35, 50],
        [55, 50],
        [15, 83],
        [35, 83],
        [55, 83]
      ];

    default:
      return [];
  }
}

function getPinColor(
  rank: number,
  index: number,
  red: boolean
): string {
  if (red) {
    return RED;
  }

  if (
    (rank === 3 && index === 1) ||
    (rank === 5 && index === 4) ||
    (rank === 7 && index === 0)
  ) {
    return RED;
  }

  if (rank === 9) {
    return [
      RED,
      BLUE,
      GREEN
    ][index % 3];
  }

  return index % 2 === 0
    ? BLUE
    : GREEN;
}

function PinFace({
  rank,
  red
}: FaceProps) {
  if (rank === 1) {
    const mainColor = red ? RED : BLUE;

    return (
      <g>
        <circle
          cx="35"
          cy="50"
          r="23"
          fill="#f9f5e5"
          stroke={mainColor}
          strokeWidth="3"
        />

        <circle
          cx="35"
          cy="50"
          r="17"
          fill="none"
          stroke={red ? RED : GREEN}
          strokeWidth="3"
        />

        {Array.from({
          length: 8
        }).map((_, index) => (
          <ellipse
            key={index}
            cx="35"
            cy="38"
            rx="3.2"
            ry="7"
            fill={red ? RED : GREEN}
            transform={`rotate(${
              index * 45
            } 35 50)`}
          />
        ))}

        <circle
          cx="35"
          cy="50"
          r="6"
          fill={RED}
        />

        <circle
          cx="35"
          cy="50"
          r="2.3"
          fill="#f8e6a2"
        />
      </g>
    );
  }

  const positions = getPinPositions(rank);

  const scale =
    rank >= 8
      ? 0.72
      : rank >= 6
        ? 0.79
        : rank >= 4
          ? 0.9
          : 1;

  return (
    <g>
      {positions.map(([x, y], index) => (
        <PinDot
          key={`${x}-${y}`}
          x={x}
          y={y}
          scale={scale}
          color={getPinColor(
            rank,
            index,
            red
          )}
        />
      ))}
    </g>
  );
}

function BambooStick({
  x,
  y,
  color,
  scale = 1
}: SymbolProps) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
    >
      <rect
        x="-1.8"
        y="-12"
        width="3.6"
        height="24"
        rx="1.8"
        fill={color}
      />

      <path
        d="M-1 -9 C-8 -14 -11 -8 -4 -3 Z"
        fill={color}
      />

      <path
        d="M1 -7 C8 -12 11 -6 4 -1 Z"
        fill={color}
      />

      <path
        d="M-1 -1 C-9 -5 -10 2 -3 6 Z"
        fill={color}
      />

      <path
        d="M1 2 C9 -2 10 5 3 9 Z"
        fill={color}
      />

      <path
        d="M-4 10 L0 13 L4 10"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />

      <path
        d="M-2 -4 H2 M-2 5 H2"
        stroke="#f4f0df"
        strokeWidth="0.9"
        opacity="0.8"
      />
    </g>
  );
}

function getSouPositions(
  rank: number
): Array<[number, number]> {
  switch (rank) {
    case 2:
      return [
        [24, 50],
        [46, 50]
      ];

    case 3:
      return [
        [35, 22],
        [23, 68],
        [47, 68]
      ];

    case 4:
      return [
        [23, 29],
        [47, 29],
        [23, 71],
        [47, 71]
      ];

    case 5:
      return [
        [23, 25],
        [47, 25],
        [23, 75],
        [47, 75],
        [35, 50]
      ];

    case 6:
      return [
        [23, 19],
        [47, 19],
        [23, 50],
        [47, 50],
        [23, 81],
        [47, 81]
      ];

    case 7:
      return [
        [35, 14],
        [23, 38],
        [47, 38],
        [23, 62],
        [47, 62],
        [23, 86],
        [47, 86]
      ];

    case 8:
      return [
        [23, 14],
        [47, 14],
        [23, 38],
        [47, 38],
        [23, 62],
        [47, 62],
        [23, 86],
        [47, 86]
      ];

    case 9:
      return [
        [15, 17],
        [35, 17],
        [55, 17],
        [15, 50],
        [35, 50],
        [55, 50],
        [15, 83],
        [35, 83],
        [55, 83]
      ];

    default:
      return [];
  }
}

function getSouColor(
  rank: number,
  index: number,
  red: boolean
): string {
  if (red) {
    return RED;
  }

  if (
    (rank === 3 && index === 0) ||
    (rank === 5 && index === 4) ||
    (rank === 7 && index === 0)
  ) {
    return RED;
  }

  return index % 3 === 1
    ? BLUE
    : GREEN;
}

function SouBird({
  red
}: {
  red: boolean;
}) {
  const bodyColor = red ? RED : GREEN;
  const wingColor = red ? "#a81729" : BLUE;

  return (
    <g>
      <path
        d="M18 75 C27 63 37 59 49 62 C42 70 35 79 28 88 Z"
        fill={wingColor}
      />

      <path
        d="M29 66 C24 52 28 36 41 30 C54 33 57 45 50 55 C44 64 37 69 29 66 Z"
        fill={bodyColor}
      />

      <circle
        cx="45"
        cy="30"
        r="10"
        fill={bodyColor}
      />

      <path
        d="M54 29 L65 34 L54 38 Z"
        fill={RED}
      />

      <circle
        cx="48"
        cy="27"
        r="2"
        fill="#101814"
      />

      <path
        d="M27 51 C14 45 14 32 29 37 C37 40 39 47 37 55 Z"
        fill={wingColor}
      />

      <path
        d="M35 42 C40 46 44 51 47 57"
        fill="none"
        stroke="#f6e9b7"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <path
        d="M34 67 L30 82 M42 64 L43 80"
        stroke="#806223"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <path
        d="M25 83 H49"
        stroke="#806223"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </g>
  );
}

function SouFace({
  rank,
  red
}: FaceProps) {
  if (rank === 1) {
    return <SouBird red={red} />;
  }

  const positions = getSouPositions(rank);

  const scale =
    rank >= 8
      ? 0.7
      : rank >= 6
        ? 0.78
        : rank >= 4
          ? 0.9
          : 1;

  return (
    <g>
      {positions.map(([x, y], index) => (
        <BambooStick
          key={`${x}-${y}`}
          x={x}
          y={y}
          scale={scale}
          color={getSouColor(
            rank,
            index,
            red
          )}
        />
      ))}
    </g>
  );
}

function ManFace({
  rank,
  red
}: FaceProps) {
  return (
    <g>
      <text
        x="35"
        y="38"
        textAnchor="middle"
        dominantBaseline="middle"
        fill={red ? RED : "#192d43"}
        stroke="#f8f2df"
        strokeWidth="0.8"
        paintOrder="stroke"
        fontFamily="Yu Mincho, Hiragino Mincho ProN, serif"
        fontSize="39"
        fontWeight="800"
      >
        {MAN_NUMERALS[rank] ?? "?"}
      </text>

      <text
        x="35"
        y="77"
        textAnchor="middle"
        dominantBaseline="middle"
        fill={RED}
        stroke="#f8f2df"
        strokeWidth="0.7"
        paintOrder="stroke"
        fontFamily="Yu Mincho, Hiragino Mincho ProN, serif"
        fontSize="35"
        fontWeight="900"
      >
        萬
      </text>
    </g>
  );
}

function HonorFace({
  tile
}: {
  tile: Tile;
}) {
  const face = getTileFace(tile);

  if (face === "白") {
    const frameColor = tile.red
      ? RED
      : BLUE;

    return (
      <g>
        <rect
          x="14"
          y="16"
          width="42"
          height="68"
          rx="2"
          fill="none"
          stroke={frameColor}
          strokeWidth="4"
        />

        <rect
          x="19"
          y="21"
          width="32"
          height="58"
          rx="1"
          fill="none"
          stroke={frameColor}
          strokeWidth="1.4"
        />
      </g>
    );
  }

  let color = DARK;

  if (
    face === "發" ||
    face === "発"
  ) {
    color = GREEN;
  }

  if (face === "中") {
    color = RED;
  }

  if (tile.red) {
    color = RED;
  }

  return (
    <text
      x="35"
      y="52"
      textAnchor="middle"
      dominantBaseline="middle"
      fill={color}
      stroke="#f8f2df"
      strokeWidth="0.9"
      paintOrder="stroke"
      fontFamily="Yu Mincho, Hiragino Mincho ProN, serif"
      fontSize="54"
      fontWeight="900"
    >
      {face}
    </text>
  );
}

function TileArtwork({
  tile
}: {
  tile: Tile;
}) {
  switch (tile.suit) {
    case "man":
      return (
        <ManFace
          rank={tile.rank}
          red={tile.red}
        />
      );

    case "pin":
      return (
        <PinFace
          rank={tile.rank}
          red={tile.red}
        />
      );

    case "sou":
      return (
        <SouFace
          rank={tile.rank}
          red={tile.red}
        />
      );

    case "honor":
      return <HonorFace tile={tile} />;

    default:
      return null;
  }
}

function TileFace({
  tile
}: {
  tile: Tile;
}) {
  return (
    <svg
      className="tile-face-svg"
      viewBox="0 0 70 100"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <TileArtwork tile={tile} />

      {tile.red && (
        <g>
          <circle
            cx="62"
            cy="8"
            r="5"
            fill={RED}
            stroke="#fff4d3"
            strokeWidth="1"
          />

          <circle
            cx="62"
            cy="8"
            r="1.5"
            fill="#fff4d3"
          />
        </g>
      )}
    </svg>
  );
}

export function TileView({
  tile,
  faceDown = false,
  compact = false,
  selected = false,
  highlighted = false,
  disabled = false,
  onSelect
}: TileViewProps) {
  const classes = [
    "mahjong-tile",
    compact && "mahjong-tile--compact",
    faceDown && "mahjong-tile--back",
    selected && "mahjong-tile--selected",
    highlighted &&
      "mahjong-tile--highlighted",
    tile?.red && "mahjong-tile--red",
    tile && `mahjong-tile--${tile.suit}`
  ]
    .filter(Boolean)
    .join(" ");

  const label = faceDown
    ? "裏向きの牌"
    : tile
      ? getTileLabel(tile)
      : "牌";

  const content = faceDown ? (
    <span
      className="tile-back-mark"
      aria-hidden="true"
    >
      ◆
    </span>
  ) : tile ? (
    <TileFace tile={tile} />
  ) : (
    <span className="tile-rank">?</span>
  );

  if (tile && onSelect) {
    return (
      <button
        type="button"
        className={classes}
        aria-label={label}
        aria-pressed={selected}
        disabled={disabled}
        onClick={() => onSelect(tile.id)}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      className={classes}
      role="img"
      aria-label={label}
    >
      {content}
    </span>
  );
}
