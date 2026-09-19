import type { Product } from "../types";

const img = (seed: string) => `https://picsum.photos/seed/${seed}/1400/1750`;

const now = "2026-01-15T09:00:00.000Z";

interface SeedInput {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  inr: number;
  usd: number;
  compareInr?: number;
  compareUsd?: number;
  inventory: number | null;
  video?: boolean;
}

const SEED: SeedInput[] = [
  {
    slug: "brass-desk-lamp-no-4",
    title: "Brass Desk Lamp No. 4",
    subtitle: "Solid brass, hand-polished",
    description:
      "A weighted desk lamp turned from solid brass and finished by hand, so it darkens gently with use rather than flaking. The arm holds position without a knob, and the shade throws a warm, contained pool of light — enough for a desk, not enough to light the whole room.",
    highlights: ["Solid brass, unlacquered", "Dimmable warm LED, 2700K", "Weighted base — no clamp needed", "Two-year repair guarantee"],
    inr: 1299000,
    usd: 14800,
    compareInr: 1599000,
    inventory: 12,
    video: true,
  },
  {
    slug: "linen-throw-ash",
    title: "Linen Throw — Ash",
    subtitle: "Stonewashed European flax",
    description:
      "Woven from European flax and stonewashed twice, this throw arrives already soft instead of asking you to break it in. Generous enough for a double bed, light enough to keep out through summer.",
    highlights: ["100% European flax linen", "220 × 150 cm", "Stonewashed, pre-shrunk", "Machine washable at 30°C"],
    inr: 649000,
    usd: 7400,
    inventory: 30,
  },
  {
    slug: "walnut-valet-tray",
    title: "Walnut Valet Tray",
    subtitle: "Single piece, oil finish",
    description:
      "Cut from a single piece of American black walnut and hollowed rather than joined, so there is no seam to catch. Finished with hardwax oil — re-oil it once a year and it will outlast the desk it sits on.",
    highlights: ["American black walnut", "24 × 16 × 3 cm", "Hardwax oil finish", "Felt base"],
    inr: 349000,
    usd: 3900,
    inventory: 45,
  },
  {
    slug: "ceramic-pour-over-set",
    title: "Ceramic Pour-Over Set",
    subtitle: "Dripper, carafe and two cups",
    description:
      "A complete pour-over set in unglazed stoneware with a glazed interior. The dripper's ribbing is cut deeper than most, which keeps the bed even and the brew clean. Carafe holds 600ml — two generous cups.",
    highlights: ["Stoneware, glazed interior", "600ml carafe", "Fits standard #02 filters", "Dishwasher safe"],
    inr: 529000,
    usd: 5900,
    compareInr: 649000,
    compareUsd: 7200,
    inventory: 18,
  },
  {
    slug: "waxed-canvas-weekender",
    title: "Waxed Canvas Weekender",
    subtitle: "18oz canvas, bridle leather",
    description:
      "An overnight bag in 18oz waxed canvas with bridle leather handles and solid brass hardware. Unlined on purpose — fewer seams to fail. It will scuff and mark, which is the point.",
    highlights: ["18oz British waxed canvas", "42L capacity", "Bridle leather handles", "Solid brass zip and feet"],
    inr: 1899000,
    usd: 21500,
    inventory: 8,
    video: true,
  },
  {
    slug: "marble-bookends-pair",
    title: "Marble Bookends",
    subtitle: "Pair, honed Makrana",
    description:
      "A pair of honed Makrana marble bookends, heavy enough to hold a full shelf of hardbacks without creeping. Every pair differs in veining — yours will not look exactly like the photograph.",
    highlights: ["Honed Makrana marble", "2.4kg per bookend", "Cork base", "Sold as a pair"],
    inr: 449000,
    usd: 5200,
    inventory: 22,
  },
  {
    slug: "copper-watering-can",
    title: "Copper Watering Can",
    subtitle: "Seamed and soldered by hand",
    description:
      "A 1.5L watering can raised from sheet copper, seamed and soldered by hand. The long spout reaches the back of a crowded windowsill, and the rose lifts off for a directed pour.",
    highlights: ["Raised sheet copper", "1.5L capacity", "Removable brass rose", "Develops a natural patina"],
    inr: 779000,
    usd: 8800,
    inventory: null,
  },
  {
    slug: "merino-travel-blanket",
    title: "Merino Travel Blanket",
    subtitle: "Woven in Himachal",
    description:
      "Fine merino woven on traditional looms in Himachal Pradesh, finished with a hand-knotted fringe. Warm out of proportion to its weight, and small enough to live in a carry-on.",
    highlights: ["100% extra-fine merino", "180 × 120 cm", "Hand-knotted fringe", "Naturally dyed"],
    inr: 899000,
    usd: 10200,
    inventory: 15,
  },
];

export function seedProducts(): Product[] {
  return SEED.map((item, index) => ({
    id: `seed-${String(index + 1).padStart(3, "0")}`,
    slug: item.slug,
    title: item.title,
    subtitle: item.subtitle,
    description: item.description,
    highlights: item.highlights,
    media: [
      { id: `${item.slug}-1`, kind: "image" as const, url: img(`${item.slug}-a`), alt: `${item.title}, front view` },
      { id: `${item.slug}-2`, kind: "image" as const, url: img(`${item.slug}-b`), alt: `${item.title}, detail` },
      { id: `${item.slug}-3`, kind: "image" as const, url: img(`${item.slug}-c`), alt: `${item.title}, in use` },
      ...(item.video
        ? [
            {
              id: `${item.slug}-video`,
              kind: "video" as const,
              url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
              posterUrl: img(`${item.slug}-poster`),
              alt: `${item.title}, product film`,
            },
          ]
        : []),
    ],
    price: { INR: item.inr, USD: item.usd },
    compareAtPrice:
      item.compareInr || item.compareUsd
        ? { ...(item.compareInr ? { INR: item.compareInr } : {}), ...(item.compareUsd ? { USD: item.compareUsd } : {}) }
        : undefined,
    inventory: item.inventory,
    status: "published" as const,
    category: null,
    createdAt: now,
    updatedAt: now,
  }));
}
