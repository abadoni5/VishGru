export type LaneIndex = 0 | 1 | 2;

export type ObstacleType =
  | "pothole"
  | "puddle"
  | "cow"
  | "scooty"
  | "suv"
  | "dog"
  | "trash"
  | "cowpat"
  | "aqi";

export interface Obstacle {
  id: number;
  type: ObstacleType;
  lane: LaneIndex | "all"; // suv blocks all
  /** View depth (computed from spawnDistanceKm - distanceKm). */
  x: number;
  w: number;
  h: number;
  /** World distance (km) when spawned; only tarmac moves, obstacle is stagnant. */
  spawnDistanceKm: number;
  passed?: boolean;
  cowBraking?: boolean;
}

export interface PowerUp {
  id: number;
  type: "cycling_lane" | "good_biker";
  lane?: LaneIndex;
  /** View depth (computed from spawnDistanceKm - distanceKm). */
  x: number;
  w: number;
  h: number;
  /** World distance (km) when spawned; only tarmac moves, powerup is stagnant. */
  spawnDistanceKm: number;
  activeUntil?: number;
}

export type GamePhase = "playing" | "crashed" | "gameover";

export interface GameState {
  phase: GamePhase;
  lane: LaneIndex;
  speed: number;
  distanceKm: number;
  /** Display meters: ~1 min per 1000m at reference speed, varies with speed/speedups. */
  displayMeters: number;
  obstacles: Obstacle[];
  powerUps: PowerUp[];
  nextObstacleId: number;
  nextPowerUpId: number;
  lastSpawnTime: number;
  streakKm: number;
  hitCount: number;
  mood: "good" | "neutral" | "bad";
  suvWarning: boolean;
  suvWarningAt: number;
  aqiActive: boolean;
  aqiUntil: number;
  cyclingLaneUntil: number;
  goodBikerUntil: number;
  crashObstacleType: ObstacleType | null;
  potholeHitCount: number;
}
