import type { GameState, Obstacle, ObstacleType, PowerUp } from "./types";
import {
  LANES,
  START_SPEED,
  BASE_SPEED,
  MAX_SPEED,
  SPEED_INCREASE_PER_KM,
  BRAKE_FACTOR,
  BOOST_FACTOR,
  GOOD_BIKER_SPEED_FACTOR,
  WARMUP_KM,
  FAST_LEVEL_KM,
  STAGNANT_SPEED,
  VARIANCE_START_KM,
  PACE_VARIANCE_AMPLITUDE,
  PACE_VARIANCE_PERIOD_MS,
  OBSTACLE_SPAWN_BASE_MS,
  OBSTACLE_SPAWN_MIN_MS,
  AQI_EVENT_DURATION_MS,
  AQI_SPEED_FACTOR,
  MOOD_GOOD_THRESHOLD_KM,
  MOOD_BAD_THRESHOLD_HITS,
  POWERUP_CYCLING_LANE_DURATION_MS,
  POWERUP_GOOD_BIKER_DURATION_MS,
  POTHOLE_HITS_TO_CRASH,
  DISPLAY_METERS_PER_MINUTE,
  DISPLAY_REFERENCE_SECONDS_PER_1000M,
} from "./constants";
import type { LaneIndex } from "./types";

const OBSTACLE_WEIGHTS: { type: ObstacleType; weight: number }[] = [
  { type: "pothole", weight: 28 },
  { type: "puddle", weight: 18 },
  { type: "cow", weight: 8 },
  { type: "scooty", weight: 10 },
  { type: "dog", weight: 10 },
  { type: "trash", weight: 8 },
  { type: "cowpat", weight: 6 },
  { type: "suv", weight: 2 },
];

function weightedRandom<T>(items: { type: T; weight: number }[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.type;
  }
  return items[0].type;
}

export function createInitialState(): GameState {
  return {
    phase: "playing",
    lane: 1,
    speed: START_SPEED,
    distanceKm: 0,
    displayMeters: 0,
    obstacles: [],
    powerUps: [],
    nextObstacleId: 1,
    nextPowerUpId: 1,
    lastSpawnTime: 0,
    streakKm: 0,
    hitCount: 0,
    mood: "neutral",
    suvWarning: false,
    suvWarningAt: 0,
    aqiActive: false,
    aqiUntil: 0,
    cyclingLaneUntil: 0,
    goodBikerUntil: 0,
    crashObstacleType: null,
    potholeHitCount: 0,
  };
}

export function getSpeedMultiplier(state: GameState, now?: number): number {
  let m = 1;
  if (state.aqiActive) m *= AQI_SPEED_FACTOR;
  if (state.goodBikerUntil > 0) m *= GOOD_BIKER_SPEED_FACTOR;
  // Varying pace after VARIANCE_START_KM: speed oscillates for super hard
  if (
    now != null &&
    state.distanceKm >= VARIANCE_START_KM
  ) {
    const wave =
      1 +
      PACE_VARIANCE_AMPLITUDE *
        Math.sin((now / PACE_VARIANCE_PERIOD_MS) * 2 * Math.PI);
    m *= wave;
  }
  return m;
}

export function updateDistance(state: GameState, dt: number, now?: number): void {
  const mult = getSpeedMultiplier(state, now);
  const speed = Math.min(MAX_SPEED, state.speed * mult);
  state.distanceKm += (speed * dt) / 1000 / 1000; // game world distance
  state.streakKm += (speed * dt) / 1000 / 1000;
  // Display counter: ~1 min per 1000m at BASE_SPEED, varies with game speed and speedups
  const displayRate = (DISPLAY_METERS_PER_MINUTE / DISPLAY_REFERENCE_SECONDS_PER_1000M) * (speed / BASE_SPEED);
  state.displayMeters += displayRate * (dt / 1000);
}

export function updateMood(state: GameState): void {
  if (state.streakKm >= MOOD_GOOD_THRESHOLD_KM) state.mood = "good";
  else if (state.hitCount >= MOOD_BAD_THRESHOLD_HITS) state.mood = "bad";
  else state.mood = "neutral";
}

export function getSpawnIntervalMs(state: GameState): number {
  const km = state.distanceKm;
  const reduction = Math.min(km * 80, OBSTACLE_SPAWN_BASE_MS - OBSTACLE_SPAWN_MIN_MS);
  return Math.max(OBSTACLE_SPAWN_MIN_MS, OBSTACLE_SPAWN_BASE_MS - reduction);
}

export function trySpawnObstacle(
  state: GameState,
  now: number,
  viewWidth: number
): void {
  if (state.phase !== "playing" || state.aqiActive) return;
  // No new obstacles while any powerup is active
  if (state.cyclingLaneUntil > now || state.goodBikerUntil > now) return;
  const interval = getSpawnIntervalMs(state);
  if (now - state.lastSpawnTime < interval) return;

  const type = weightedRandom(OBSTACLE_WEIGHTS);
  const lane = type === "suv" ? "all" : (Math.floor(Math.random() * LANES) as LaneIndex);
  const id = state.nextObstacleId++;
  state.lastSpawnTime = now;

  const laneW = viewWidth / 3;
  // Width as fraction of lane width; height uses actual image aspect ratios
  // Cow 30% bigger; dog, trash, pothole 30% smaller
  const wFrac: Record<ObstacleType, number> = {
    pothole: 0.62 * 0.7,
    puddle:  0.34,
    cow:     0.22 * 1.3,
    scooty:  0.32, // 2x size
    suv:     0.88,
    dog:     0.18 * 0.7,
    trash:   0.58 * 0.7,
    cowpat:  0.46,
  };
  const hAspect: Record<ObstacleType, number> = {
    pothole: 0.73,
    puddle:  0.74,
    cow:     1.59,
    scooty:  2.16,
    suv:     1.80,
    dog:     2.08,
    trash:   0.90,
    cowpat:  0.97,
  };
  const w = Math.round(laneW * wFrac[type]);
  const h = Math.round(w * hAspect[type]);
  const spawnX = viewWidth * 0.5 + 150;
  const spawnDistanceKm = state.distanceKm + spawnX / 1000;
  const obstacle: Obstacle = {
    id,
    type,
    lane,
    x: spawnX,
    w,
    h,
    spawnDistanceKm,
  };
  state.obstacles.push(obstacle);
  if (type === "suv") {
    state.suvWarning = true;
    state.suvWarningAt = now;
  }
}

export function trySpawnAqi(state: GameState, now: number): void {
  if (state.aqiActive || state.phase !== "playing") return;
  if (state.distanceKm < 0.1) return;
  if (Math.random() > 0.0008) return; // rare
  state.aqiActive = true;
  state.aqiUntil = now + AQI_EVENT_DURATION_MS;
}

export function trySpawnPowerUp(
  state: GameState,
  now: number,
  viewWidth: number
): void {
  if (state.phase !== "playing") return;
  if (Math.random() > 0.002) return;
  const type: "cycling_lane" | "good_biker" = Math.random() < 0.6 ? "cycling_lane" : "good_biker";
  // Only one of each type at a time: no duplicate on screen or currently active
  const hasGoodBiker = state.goodBikerUntil > now || state.powerUps.some((p) => p.type === "good_biker");
  const hasCyclingLane = state.cyclingLaneUntil > now || state.powerUps.some((p) => p.type === "cycling_lane");
  if (type === "good_biker" && hasGoodBiker) return;
  if (type === "cycling_lane" && hasCyclingLane) return;
  const spawnX = viewWidth + 80;
  const spawnDistanceKm = state.distanceKm + spawnX / 1000;
  state.powerUps.push({
    id: state.nextPowerUpId++,
    type,
    lane: 0,
    x: spawnX,
    w: 80,
    h: 40,
    spawnDistanceKm,
  });
}

export function updateObstacles(state: GameState, _dt: number, _now?: number): void {
  // Obstacles are stagnant in world; only tarmac moves. x = (spawnDistanceKm - distanceKm) * 1000.
  for (const o of state.obstacles) {
    o.x = (o.spawnDistanceKm - state.distanceKm) * 1000;
  }
  state.obstacles = state.obstacles.filter((o) => o.x + o.w > -20);
}

export function updatePowerUps(state: GameState, _dt: number, _now?: number): void {
  // Powerups are stagnant in world; only tarmac moves. x = (spawnDistanceKm - distanceKm) * 1000.
  for (const p of state.powerUps) {
    p.x = (p.spawnDistanceKm - state.distanceKm) * 1000;
  }
  state.powerUps = state.powerUps.filter((p) => p.x + (p.w ?? 0) > -50);
}

const COLLISION_DEPTH_NEAR = -30;
const COLLISION_DEPTH_FAR = 20;

export function checkCollision(
  state: GameState,
  _handlebarX: number,
  _handlebarW: number
): { hit: Obstacle | null; passed: Obstacle[] } {
  const passed: Obstacle[] = [];
  let hit: Obstacle | null = null;

  for (const o of state.obstacles) {
    if (o.x + o.w < COLLISION_DEPTH_NEAR) {
      if (!o.passed) {
        o.passed = true;
        passed.push(o);
      }
      continue;
    }
    if (o.x > COLLISION_DEPTH_FAR) continue;

    const laneMatch = o.lane === "all" || o.lane === state.lane;
    if (laneMatch && !hit) hit = o;
  }
  return { hit, passed };
}

export function increaseSpeed(state: GameState): void {
  const km = state.distanceKm;
  if (km < WARMUP_KM) {
    // Slow start: ramp from START_SPEED to BASE_SPEED over first WARMUP_KM
    const t = km / WARMUP_KM;
    state.speed = START_SPEED + t * (BASE_SPEED - START_SPEED);
    return;
  }
  if (km < FAST_LEVEL_KM) {
    // Dynamically get faster with distance, capped at STAGNANT_SPEED
    state.speed = Math.min(
      STAGNANT_SPEED,
      state.speed + (SPEED_INCREASE_PER_KM * km) / 10
    );
    return;
  }
  // Fast level: stagnant (constant high speed). Varying pace is applied in getSpeedMultiplier.
  state.speed = Math.min(MAX_SPEED, Math.max(state.speed, STAGNANT_SPEED));
}

export function applyBrake(state: GameState): void {
  state.speed *= BRAKE_FACTOR;
}

export function isInCyclingLane(state: GameState): boolean {
  return state.lane === 0 && state.cyclingLaneUntil > 0;
}

export function activateCyclingLane(state: GameState, now: number): void {
  state.cyclingLaneUntil = now + POWERUP_CYCLING_LANE_DURATION_MS;
}

export function activateGoodBiker(state: GameState, now: number): void {
  state.goodBikerUntil = now + POWERUP_GOOD_BIKER_DURATION_MS;
}
