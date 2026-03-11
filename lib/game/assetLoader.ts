/**
 * Loads and caches image assets. Missing or failed loads return null; draw code falls back to shapes.
 */

const IMAGE_BASE = "/images";

export const ASSET_KEYS = {
  handlebars: `${IMAGE_BASE}/handlebars.png`,
  roadLane: `${IMAGE_BASE}/road-lane.png`,
  roadStripe: `${IMAGE_BASE}/road-stripe.png`,
  obstacles: {
    pothole: `${IMAGE_BASE}/obstacles/pothole.png`,
    puddle: `${IMAGE_BASE}/obstacles/puddle.png`,
    cow: `${IMAGE_BASE}/obstacles/cow.png`,
    scooty: `${IMAGE_BASE}/obstacles/scooty.png`,
    suv: `${IMAGE_BASE}/obstacles/suv.png`,
    dog: `${IMAGE_BASE}/obstacles/dog.png`,
    trash: `${IMAGE_BASE}/obstacles/trash.png`,
    cowpat: `${IMAGE_BASE}/obstacles/cowpat.png`,
  },
  powerups: {
    cyclingLane: `${IMAGE_BASE}/powerups/cycling-lane.png`,
    goodBikerHand: `${IMAGE_BASE}/powerups/good-biker-hand.png`,
  },
  title: {
    bg: `${IMAGE_BASE}/title/title-bg.png`,
    logo: `${IMAGE_BASE}/title/logo.png`,
    btnPlay: `${IMAGE_BASE}/title/btn-play.png`,
  },
  gameover: {
    wheel: `${IMAGE_BASE}/gameover/gameover-wheel.png`,
  },
} as const;

const cache = new Map<string, HTMLImageElement>();

function loadOne(src: string): Promise<HTMLImageElement | null> {
  if (cache.has(src)) {
    const img = cache.get(src)!;
    return Promise.resolve(img.complete && img.naturalWidth > 0 ? img : null);
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.addEventListener("load", () => {
      cache.set(src, img);
      resolve(img);
    });
    img.addEventListener("error", () => resolve(null));
    img.src = src;
  });
}

export function getImage(src: string): HTMLImageElement | null {
  const img = cache.get(src);
  return img && img.complete && img.naturalWidth > 0 ? img : null;
}

/** Preload all gameplay assets (road, handlebars, obstacles, power-ups). */
export function preloadGameAssets(): Promise<void> {
  const urls = [
    ASSET_KEYS.handlebars,
    ASSET_KEYS.roadLane,
    ASSET_KEYS.roadStripe,
    ...Object.values(ASSET_KEYS.obstacles),
    ...Object.values(ASSET_KEYS.powerups),
  ];
  return Promise.all(urls.map((src) => loadOne(src))).then(() => {});
}

/** Preload title screen assets. */
export function preloadTitleAssets(): Promise<void> {
  const urls = Object.values(ASSET_KEYS.title);
  return Promise.all(urls.map((src) => loadOne(src))).then(() => {});
}

/** Preload game over assets. */
export function preloadGameOverAssets(): Promise<void> {
  const urls = Object.values(ASSET_KEYS.gameover);
  return Promise.all(urls.map((src) => loadOne(src))).then(() => {});
}

export type ObstacleType =
  | "pothole"
  | "puddle"
  | "cow"
  | "scooty"
  | "suv"
  | "dog"
  | "trash"
  | "cowpat";

export function getObstacleImage(type: ObstacleType): HTMLImageElement | null {
  return getImage(ASSET_KEYS.obstacles[type]);
}

export function getPowerUpImage(type: "cycling_lane" | "good_biker"): HTMLImageElement | null {
  return getImage(
    type === "cycling_lane"
      ? ASSET_KEYS.powerups.cyclingLane
      : ASSET_KEYS.powerups.goodBikerHand
  );
}
