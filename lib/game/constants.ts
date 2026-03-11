export const LANES = 3;
export const LANE_INDEX_LEFT = 0;
export const LANE_INDEX_CENTER = 1;
export const LANE_INDEX_RIGHT = 2;

export const START_SPEED = 90;
export const BASE_SPEED = 160;
export const MAX_SPEED = 550;
/** First this many km: ramp from START_SPEED to BASE_SPEED. */
export const WARMUP_KM = 0.06;
/** After this km: speed caps at STAGNANT_SPEED (no more ramp). */
export const FAST_LEVEL_KM = 1.2;
export const STAGNANT_SPEED = 480;
/** After this km: apply varying pace (speed wave) for super hard. */
export const VARIANCE_START_KM = 2.0;
export const PACE_VARIANCE_AMPLITUDE = 0.24;
export const PACE_VARIANCE_PERIOD_MS = 3500;

export const SPEED_INCREASE_PER_KM = 10;
export const BRAKE_FACTOR = 0.82;
export const BOOST_FACTOR = 1.35;
/** Good biker hand: super sonic 10x speed for 5 seconds, no obstacles. */
export const GOOD_BIKER_SPEED_FACTOR = 10;

export const LANE_CHANGE_MS = 180;
export const OBSTACLE_SPAWN_BASE_MS = 4000;
export const OBSTACLE_SPAWN_MIN_MS = 1000;

export const COW_PASS_BRAKING_THRESHOLD = 0.5; // speed ratio below this = "braking" for cow sound

export const POWERUP_CYCLING_LANE_DURATION_MS = 7000;
export const POWERUP_GOOD_BIKER_DURATION_MS = 5000;
export const AQI_EVENT_DURATION_MS = 12000;
export const AQI_SPEED_FACTOR = 0.6;

export const MOOD_GOOD_THRESHOLD_KM = 0.15;
export const MOOD_BAD_THRESHOLD_HITS = 2;

/** Swipe distance (px) to register lane change or brake/boost. Increase for less sensitivity. */
export const SWIPE_THRESHOLD_PX = 40;

/** Pothole hits before game over (cumulative wheel damage). */
export const POTHOLE_HITS_TO_CRASH = 3;

/** Display counter: 1000 display meters per this many real seconds at reference (BASE) speed. */
export const DISPLAY_METERS_PER_MINUTE = 1000;
export const DISPLAY_REFERENCE_SECONDS_PER_1000M = 60;
