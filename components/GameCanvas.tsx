"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  startBgm,
  stopBgm,
  stopAllGameSounds,
  playBell,
  playCrash,
  playCow,
  playHorn,
  playPuddleSplash,
  playDogBark,
  playGoodBiker,
  playCycleLane,
  playCowSquelch,
  setAqiMuffle,
  setBgmDuck,
  isIntroComplete,
} from "@/lib/audio";
import {
  createInitialState,
  updateDistance,
  updateMood,
  updateObstacles,
  updatePowerUps,
  trySpawnObstacle,
  trySpawnAqi,
  trySpawnPowerUp,
  checkCollision,
  increaseSpeed,
  applyBrake,
  getSpeedMultiplier,
  activateCyclingLane,
  activateGoodBiker,
} from "@/lib/game/engine";
import {
  BASE_SPEED,
  COW_PASS_BRAKING_THRESHOLD,
  LANE_CHANGE_MS,
  SWIPE_THRESHOLD_PX,
  POTHOLE_HITS_TO_CRASH,
} from "@/lib/game/constants";
import type { GameState, LaneIndex, Obstacle } from "@/lib/game/types";
import {
  preloadGameAssets,
  getImage,
  ASSET_KEYS,
  getObstacleImage,
  getPowerUpImage,
  type ObstacleType as AssetObstacleType,
} from "@/lib/game/assetLoader";

const LANE_POSITIONS: Record<LaneIndex, number> = { 0: 0.2, 1: 0.5, 2: 0.8 };
const HANDLEBAR_WIDTH_RATIO = 0.19;

/** Screen rect for precise collision (same math as obstacle draw). */
function getObstacleScreenRect(
  o: Obstacle,
  width: number,
  height: number
): { x: number; y: number; w: number; h: number } {
  const laneW = width / 3;
  const maxDepth = width * 0.6 + 150;
  const depthRatio = Math.max(0, o.x / maxDepth);
  const img = getObstacleImage(o.type as AssetObstacleType);
  const drawW = o.w;
  const drawH = img
    ? Math.round(drawW * (img.naturalHeight / img.naturalWidth))
    : o.h;
  const obLane = o.lane === "all" ? 1 : o.lane;
  const drawX = obLane * laneW + laneW / 2 - drawW / 2;
  const isGroundObstacle =
    o.type === "pothole" || o.type === "puddle" || o.type === "trash" || o.type === "cowpat";
  const drawY = isGroundObstacle
    ? height - o.x * 4 - drawH
    : height * 0.9 - depthRatio * height * 0.75 - drawH;
  return { x: drawX, y: drawY, w: drawW, h: drawH };
}

/** Handlebar screen rect (same as draw). */
function getHandlebarRect(lane: LaneIndex, width: number, height: number): { x: number; y: number; w: number; h: number } {
  const laneW = width / 3;
  const handlebarW = width * HANDLEBAR_WIDTH_RATIO;
  const handlebarImg = getImage(ASSET_KEYS.handlebars);
  const handlebarH = handlebarImg
    ? Math.round(handlebarW * (handlebarImg.naturalHeight / handlebarImg.naturalWidth))
    : 28;
  const handlebarX = laneW * lane + laneW / 2 - handlebarW / 2;
  const handlebarY = height - handlebarH * 0.65;
  return { x: handlebarX, y: handlebarY, w: handlebarW, h: handlebarH };
}

function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

const ANIMATED_OBSTACLES = new Set<AssetObstacleType>(["scooty", "suv", "cow", "dog"]);

export function GameCanvas() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const lastTimeRef = useRef<number>(0);
  const laneTargetRef = useRef<number>(1);
  const rafRef = useRef<number>(0);
  const crashTimeRef = useRef<number>(0);
  const hornPlayedForSuvRef = useRef<number>(0);
  const hornPlayedForScootyRef = useRef<number>(0);
  const proxSoundedRef = useRef<Set<number>>(new Set());
  const [moodEmoji, setMoodEmoji] = useState<string>("😐");
  const [distanceStr, setDistanceStr] = useState("0");
  const [suvWarning, setSuvWarning] = useState(false);
  const [aqiBanner, setAqiBanner] = useState(false);
  const [goodBikerBanner, setGoodBikerBanner] = useState(false);

  const getHandlebarX = useCallback((width: number) => {
    const lane = laneTargetRef.current;
    const pos = LANE_POSITIONS[lane as LaneIndex];
    return width * pos - (width * HANDLEBAR_WIDTH_RATIO) / 2;
  }, []);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, now: number) => {
      const state = stateRef.current;
      const lane = laneTargetRef.current;

      const laneW = width / 3;
      const roadImg = getImage(ASSET_KEYS.roadLane);
      if (roadImg) {
        const tileH = Math.round(width * (roadImg.naturalHeight / roadImg.naturalWidth));
        const scrollY = (state.distanceKm * 4000) % tileH;
        for (let y = scrollY - tileH; y < height + tileH; y += tileH) {
          ctx.drawImage(roadImg, 0, y, width, tileH);
        }
      } else {
        ctx.fillStyle = "#1a1816";
        ctx.fillRect(0, 0, width, height);
      }

      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 2;
      ctx.setLineDash([20, 20]);
      for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * laneW, 0);
        ctx.lineTo(i * laneW, height);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Cycling lane overlay — tile cycling-lane.png over left lane while active
      if (state.cyclingLaneUntil > 0) {
        const clImg = getImage(ASSET_KEYS.powerups.cyclingLane);
        if (clImg) {
          const tileH = Math.round(laneW * (clImg.naturalHeight / clImg.naturalWidth));
          const scrollY = (state.distanceKm * 4000) % tileH;
          ctx.save();
          ctx.globalAlpha = 0.72;
          for (let y = scrollY - tileH; y < height + tileH; y += tileH) {
            ctx.drawImage(clImg, 0, y, laneW, tileH);
          }
          ctx.restore();
        } else {
          ctx.save();
          ctx.globalAlpha = 0.4;
          ctx.fillStyle = "#22c55e";
          ctx.fillRect(0, 0, laneW, height);
          ctx.restore();
        }
      }

      const maxDepth = width * 0.6 + 150;
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
      state.obstacles.forEach((o) => {
        const depthRatio = Math.max(0, o.x / maxDepth);
        const img = getObstacleImage(o.type as AssetObstacleType);
        let drawW = o.w;
        let drawH = img
          ? Math.round(drawW * (img.naturalHeight / img.naturalWidth))
          : o.h;
        const obLane = o.lane === "all" ? 1 : o.lane;
        let drawX = obLane * laneW + laneW / 2 - drawW / 2;
        const isGroundObstacle = o.type === "pothole" || o.type === "puddle" || o.type === "trash" || o.type === "cowpat";
        let drawY = isGroundObstacle
          ? height - o.x * 4 - drawH
          : height * 0.90 - depthRatio * height * 0.75 - drawH;

        const isAnimated = ANIMATED_OBSTACLES.has(o.type as AssetObstacleType);
        if (isAnimated) {
          const approachScale = 1 + (1 - depthRatio) * 0.2;
          drawW *= approachScale;
          drawH *= approachScale;
          drawX = obLane * laneW + laneW / 2 - drawW / 2;
          const bob = Math.sin(now * 0.004 + o.id * 0.7) * 5;
          drawY += bob;
          const wobble = Math.sin(now * 0.003 + o.id * 0.5) * 0.06;
          const centerX = drawX + drawW / 2;
          const centerY = drawY + drawH / 2;
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(wobble);
          ctx.translate(-centerX, -centerY);
        }

        if (img) {
          ctx.drawImage(img, drawX, drawY, drawW, drawH);
        } else {
          ctx.fillStyle = obstacleColor(o.type);
          ctx.fillRect(drawX, drawY, drawW, drawH);
        }

        if (isAnimated) ctx.restore();
      });

      // Good biker hand power-up — approaching icon in left lane
      state.powerUps.forEach((p) => {
        if (p.type === "cycling_lane") return; // rendered as full lane overlay above
        const baseX = 0 * laneW + laneW / 2 - (p.w ?? 80) / 2;
        const drawY = height * 0.5 - (p.x / maxDepth) * height * 0.25;
        const pw = p.w ?? 80;
        const img = getPowerUpImage(p.type);
        if (img) {
          ctx.drawImage(img, baseX, drawY, pw, pw);
        } else {
          ctx.fillStyle = "#eab308";
          ctx.fillRect(baseX, drawY, pw, pw);
        }
      });

      const handlebarW = width * HANDLEBAR_WIDTH_RATIO;
      const handlebarImg = getImage(ASSET_KEYS.handlebars);
      if (handlebarImg) {
        const aspect = handlebarImg.naturalHeight / handlebarImg.naturalWidth;
        const handlebarH = Math.round(handlebarW * aspect);
        const handlebarX = laneW * lane + laneW / 2 - handlebarW / 2;
        const handlebarY = height - handlebarH * 0.65;
        ctx.drawImage(handlebarImg, handlebarX, handlebarY, handlebarW, handlebarH);
      } else {
        const handlebarX = getHandlebarX(width);
        const handlebarH = 28;
        const handlebarY = height * 0.72;
        ctx.fillStyle = "#4a4a4a";
        ctx.fillRect(handlebarX, handlebarY, handlebarW * (0.2 / 0.9), handlebarH);
        ctx.strokeStyle = "#666";
        ctx.lineWidth = 2;
        ctx.strokeRect(handlebarX, handlebarY, handlebarW * (0.2 / 0.9), handlebarH);
      }

      if (state.aqiActive) {
        ctx.fillStyle = "rgba(180, 160, 100, 0.35)";
        ctx.fillRect(0, 0, width, height);
      }
    },
    [getHandlebarX]
  );

  const gameLoop = useCallback(
    (now: number) => {
      const state = stateRef.current;
      if (state.phase === "gameover") return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dt = Math.min(now - lastTimeRef.current, 50);
      lastTimeRef.current = now;

      const width = canvas.width;
      const height = canvas.height;
      const handlebarX = getHandlebarX(width);
      const handlebarW = width * HANDLEBAR_WIDTH_RATIO;

      if (state.phase === "playing") {
        increaseSpeed(state);
        updateDistance(state, dt, now);
        trySpawnObstacle(state, now, width);
        if (isIntroComplete()) trySpawnAqi(state, now);
        trySpawnPowerUp(state, now, width);
        updateObstacles(state, dt, now);
        updatePowerUps(state, dt, now);

        if (state.aqiActive && now >= state.aqiUntil) {
          state.aqiActive = false;
          setAqiMuffle(false);
        }
        if (state.aqiActive) setAqiMuffle(true);

        if (state.cyclingLaneUntil > 0 && now >= state.cyclingLaneUntil) {
          state.cyclingLaneUntil = 0;
          setBgmDuck(1);
        }
        if (state.cyclingLaneUntil > now && state.lane !== 0) {
          state.cyclingLaneUntil = 0;
          setBgmDuck(1);
        }
        if (state.goodBikerUntil > 0 && now >= state.goodBikerUntil) {
          state.goodBikerUntil = 0;
        }

        const suvInRange = state.obstacles.find(
          (o) => o.type === "suv" && o.x <= 120 && o.x + o.w >= 0
        );
        if (suvInRange) {
          state.suvWarning = true;
          if (hornPlayedForSuvRef.current !== suvInRange.id) {
            hornPlayedForSuvRef.current = suvInRange.id;
            playHorn();
          }
        } else {
          state.suvWarning = false;
        }

        const scootyInRange = state.obstacles.find(
          (o) => o.type === "scooty" && o.x <= 120 && o.x + o.w >= 0 && (o.lane === state.lane || o.lane === "all")
        );
        if (scootyInRange && hornPlayedForScootyRef.current !== scootyInRange.id) {
          hornPlayedForScootyRef.current = scootyInRange.id;
          playHorn();
        }

        // Proximity sounds — play once as each obstacle enters close range (scooty horn is handled above)
        const PROX_THRESHOLD = 120;
        for (const o of state.obstacles) {
          if (o.x < PROX_THRESHOLD && !proxSoundedRef.current.has(o.id)) {
            proxSoundedRef.current.add(o.id);
            if (o.lane === state.lane || o.lane === "all") {
              if (o.type === "dog") playDogBark();
              else if (o.type === "cow") playCow(false);
              else if (o.type === "pothole" || o.type === "puddle") playBell();
              else if (o.type === "trash" || o.type === "cowpat") playBell();
            }
          }
          // Clean up proxSoundedRef for old obstacles
          if (o.x < -50) proxSoundedRef.current.delete(o.id);
        }

        const { hit, passed } = checkCollision(state, handlebarX, handlebarW);
        const speedRatio = state.speed / BASE_SPEED;

        // No collision damage during powerup (cycling lane or good biker)
        const inPowerUp = state.cyclingLaneUntil > now || state.goodBikerUntil > now;

        // Precise collision: only count as hit if handlebar and obstacle screen rects overlap
        const handlebarRect = getHandlebarRect(state.lane as LaneIndex, width, height);
        const preciseHit =
          hit &&
          rectsOverlap(handlebarRect, getObstacleScreenRect(hit, width, height));

        passed.forEach((o) => {
          if (o.type === "cow") {
            const wasBraking = speedRatio <= COW_PASS_BRAKING_THRESHOLD;
            o.cowBraking = wasBraking;
            playCow(wasBraking);
          }
          if (Math.random() < 0.12) playBell();
        });

        state.powerUps = state.powerUps.filter((p) => {
          if (state.lane !== 0) return true;
          if (p.x > 100 || p.x < -20) return true;
          if (p.type === "cycling_lane") {
            activateCyclingLane(state, now);
            playCycleLane();
            setBgmDuck(0.4);
          } else {
            activateGoodBiker(state, now);
            playGoodBiker();
          }
          return false;
        });

        if (preciseHit && !inPowerUp) {
          state.streakKm = 0;
          state.hitCount++;
          if (hit!.type === "pothole") {
            state.potholeHitCount++;
            state.speed *= 0.7;
            if (state.potholeHitCount >= POTHOLE_HITS_TO_CRASH) {
              state.phase = "crashed";
              state.crashObstacleType = "pothole";
              crashTimeRef.current = now;
              playCrash();
              stopBgm();
            }
          } else if (hit!.type === "puddle") {
            playPuddleSplash();
            state.phase = "crashed";
            state.crashObstacleType = "puddle";
            crashTimeRef.current = now;
            stopBgm();
          } else {
            state.phase = "crashed";
            state.crashObstacleType = hit!.type;
            crashTimeRef.current = now;
            if (hit!.type === "dog") playDogBark();
            else if (hit!.type === "cowpat") playCowSquelch();
            else if (hit!.type !== "suv") playCrash();
            stopBgm();
          }
        }
      }

      if (state.phase === "crashed" && now - crashTimeRef.current > 600) {
        state.phase = "gameover";
        stopAllGameSounds();
        const dist = Math.round(state.displayMeters).toString();
        router.push(`/game-over?distance=${encodeURIComponent(dist)}`);
      }

      updateMood(state);
      setMoodEmoji(state.mood === "good" ? "😌" : state.mood === "bad" ? "😤" : "😐");
      setDistanceStr(Math.round(state.displayMeters).toString());
      setSuvWarning(state.suvWarning);
      setAqiBanner(state.aqiActive);
      setGoodBikerBanner(state.phase === "playing" && state.goodBikerUntil > now);

      draw(ctx, width, height, now);

      rafRef.current = requestAnimationFrame(gameLoop);
    },
    [draw, getHandlebarX, router]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      canvas.width = w;
      canvas.height = h;
    };
    resize();
    window.addEventListener("resize", resize);

    preloadGameAssets().catch(() => {});
    startBgm();
    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
      stopBgm();
    };
  }, [gameLoop]);

  useEffect(() => {
    const state = stateRef.current;
    const onKey = (e: KeyboardEvent) => {
      if (state.phase !== "playing") return;
      if (e.key === "a" || e.key === "ArrowLeft") {
        laneTargetRef.current = Math.max(0, laneTargetRef.current - 1);
        e.preventDefault();
      } else if (e.key === "d" || e.key === "ArrowRight") {
        laneTargetRef.current = Math.min(2, laneTargetRef.current + 1);
        e.preventDefault();
      } else if (e.key === "s" || e.key === "ArrowDown") {
        applyBrake(state);
        e.preventDefault();
      } else if (e.key === "w" || e.key === "ArrowUp") {
        state.speed = Math.min(state.speed * 1.1, 650);
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let touchStartX = 0;
    let touchStartY = 0;
    const state = stateRef.current;

    const onTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (state.phase !== "playing") return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx < -SWIPE_THRESHOLD_PX) laneTargetRef.current = Math.max(0, laneTargetRef.current - 1);
        else if (dx > SWIPE_THRESHOLD_PX) laneTargetRef.current = Math.min(2, laneTargetRef.current + 1);
      } else {
        if (dy > SWIPE_THRESHOLD_PX) applyBrake(state);
        else if (dy < -SWIPE_THRESHOLD_PX) state.speed = Math.min(state.speed * 1.1, 650);
      }
    };
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const syncLane = useCallback(() => {
    const state = stateRef.current;
    if (state.phase !== "playing") return;
    const current = state.lane;
    const target = laneTargetRef.current;
    if (current !== target) {
      state.lane = target as LaneIndex;
    }
  }, []);

  useEffect(() => {
    const id = setInterval(syncLane, LANE_CHANGE_MS);
    return () => clearInterval(id);
  }, [syncLane]);

  return (
    <>
      <div className="absolute left-4 top-6 z-10 text-2xl">{moodEmoji}</div>
      <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 font-mono text-2xl font-bold text-off-white drop-shadow-md">
        {distanceStr} m
      </div>
      {suvWarning && (
        <div className="absolute right-4 top-6 z-10 rounded bg-red-900/90 px-2 py-1 text-sm font-bold text-white">
          Thar wale aagye bhaago
        </div>
      )}
      {aqiBanner && (
        <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-2 bg-yellow-900/80 py-2 px-4">
          <span className="text-lg">🌫️</span>
          <span className="font-bold text-yellow-200 text-sm tracking-widest uppercase">Low AQI — Visibility Down</span>
          <span className="text-lg">🌫️</span>
        </div>
      )}
      {goodBikerBanner && (
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-3 rounded-xl bg-saffron/95 px-6 py-4 shadow-xl border-2 border-amber-200">
          <span className="text-3xl">⚡</span>
          <span className="font-bold text-deep-brown text-lg tracking-wider uppercase">Super Sonic 10x</span>
          <span className="text-3xl">⚡</span>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none"
        style={{ width: "100%", height: "100%" }}
      />
    </>
  );
}

function obstacleColor(type: Obstacle["type"]): string {
  switch (type) {
    case "pothole":
      return "#3d3528";
    case "puddle":
      return "#5c4a32";
    case "cow":
      return "#f5f5dc";
    case "scooty":
      return "#c0392b";
    case "suv":
      return "#2c3e50";
    case "dog":
      return "#8b4513";
    case "trash":
      return "#4a3728";
    case "cowpat":
      return "#5d4e37";
    default:
      return "#555";
  }
}
