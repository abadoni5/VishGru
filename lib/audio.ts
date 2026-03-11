"use client";

const AUDIO_BASE = "/audio";

export const AUDIO_KEYS = {
  backgroundStarting: `${AUDIO_BASE}/backgroundStarting.mp3`,
  backgroundOverall: `${AUDIO_BASE}/backgroundOverall.mp3`,
  horn: `${AUDIO_BASE}/horn.mp3`,
  cow: `${AUDIO_BASE}/cow.mp3`,
  cowPassing: `${AUDIO_BASE}/cowPassing.m4a`,
  bell: `${AUDIO_BASE}/bell.mp3`,
  puddleSplash: `${AUDIO_BASE}/puddleSplash.mp3`,
  dogBark: `${AUDIO_BASE}/dogBark.mp3`,
  crash: `${AUDIO_BASE}/crash.mp3`,
  goodBiker: `${AUDIO_BASE}/goodBiker.mp3`,
  cycleLane: `${AUDIO_BASE}/cycleLane.mp3`,
  cowSquelch: `${AUDIO_BASE}/cowSquelch.mp3`,
} as const;

type AudioKey = keyof typeof AUDIO_KEYS;

const cache: Partial<Record<AudioKey, HTMLAudioElement>> = {};
let introComplete = false;
export function isIntroComplete(): boolean { return introComplete; }
let bgmContext: AudioContext | null = null;
let bgmSource: MediaElementAudioSourceNode | null = null;
let bgmGain: GainNode | null = null;
let bgmFilter: BiquadFilterNode | null = null;
let currentBgm: HTMLAudioElement | null = null;
/** The element we already created a MediaElementSource for (can only be connected once per element). */
let loopElementConnected: HTMLAudioElement | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!bgmContext) bgmContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  return bgmContext;
}

function getCachedAudio(key: AudioKey): HTMLAudioElement | null {
  return cache[key] ?? null;
}

function loadOne(key: AudioKey): Promise<HTMLAudioElement> {
  const url = AUDIO_KEYS[key];
  const audio = new Audio(url);
  audio.preload = "auto";
  cache[key] = audio;
  return new Promise((resolve, reject) => {
    audio.addEventListener("canplaythrough", () => resolve(audio), { once: true });
    audio.addEventListener("error", () => reject(new Error(`Failed to load ${url}`)), { once: true });
    audio.load();
  });
}

export async function preloadAudio(keys: AudioKey[]): Promise<void> {
  await Promise.all(keys.map((k) => loadOne(k).catch(() => {})));
}

export function playSfx(key: AudioKey, volume = 1): void {
  const audio = getCachedAudio(key);
  if (audio) {
    const c = audio.cloneNode() as HTMLAudioElement;
    c.volume = volume;
    c.play().catch(() => {});
  }
}

export function playBell(): void {
  playSfx("bell");
}

export function playCrash(): void {
  playSfx("crash");
}

export function playHorn(): void {
  playSfx("horn");
}

export function playCow(wasBraking: boolean): void {
  playSfx(wasBraking ? "cowPassing" : "cow");
}

export function playPuddleSplash(): void {
  playSfx("puddleSplash");
}

export function playDogBark(): void {
  playSfx("dogBark");
}

export function playGoodBiker(): void {
  playSfx("goodBiker");
}

export function playCycleLane(): void {
  playSfx("cycleLane", 0.7);
}

export function playCowSquelch(): void {
  playSfx("cowSquelch");
}

/** Start BGM: play starting track once, then loop overall (through Web Audio so AQI muffle works). */
export function startBgm(): void {
  const start = getCachedAudio("backgroundStarting");
  const loop = getCachedAudio("backgroundOverall");
  if (!start || !loop) return;
  currentBgm = start;
  start.play().catch(() => {});
  start.addEventListener(
    "ended",
    () => {
      introComplete = true;
      currentBgm = loop;
      loop.loop = true; // loop backgroundOverall.mp3 indefinitely
      const ctx = getAudioContext();
      if (ctx) {
        // An HTMLMediaElement can only be connected to one MediaElementSourceNode ever.
        if (loopElementConnected === loop && bgmSource && bgmGain && bgmFilter) {
          // Reuse existing Web Audio graph (e.g. after stopBgm + startBgm again)
          bgmGain.gain.value = 1;
          bgmFilter.frequency.value = 22050;
        } else if (loopElementConnected !== loop) {
          bgmSource = ctx.createMediaElementSource(loop);
          bgmGain = ctx.createGain();
          bgmFilter = ctx.createBiquadFilter();
          bgmFilter.type = "lowpass";
          bgmFilter.frequency.value = 22050;
          bgmGain.gain.value = 1;
          bgmSource.connect(bgmFilter);
          bgmFilter.connect(bgmGain);
          bgmGain.connect(ctx.destination);
          loopElementConnected = loop;
        }
      }
      loop.play().catch(() => {});
    },
    { once: true }
  );
}

/** Stop BGM. */
export function stopBgm(): void {
  if (currentBgm) {
    currentBgm.pause();
    currentBgm.currentTime = 0;
    currentBgm = null;
  }
  introComplete = false;
  // Do not null bgmSource/bgmGain/bgmFilter/loopElementConnected: the loop element
  // can only be connected to one MediaElementSourceNode ever, so we reuse the graph
  // when startBgm runs again and the intro ends.
}

/** Stop all game sounds (BGM and any ducking). Call when game is over. */
export function stopAllGameSounds(): void {
  stopBgm();
}

/** Apply muffled AQI effect to BGM (low-pass + gain). */
export function setAqiMuffle(enabled: boolean): void {
  const ctx = getAudioContext();
  const bgm = currentBgm;
  if (!ctx || !bgm) return;

  if (enabled) {
    if (!bgmSource) {
      bgmSource = ctx.createMediaElementSource(bgm);
      bgmGain = ctx.createGain();
      bgmFilter = ctx.createBiquadFilter();
      bgmFilter.type = "lowpass";
      bgmFilter.frequency.value = 400;
      bgmGain.gain.value = 0.35;
      bgmSource.connect(bgmFilter);
      bgmFilter.connect(bgmGain);
      bgmGain.connect(ctx.destination);
      loopElementConnected = bgm;
    }
    if (bgmGain) bgmGain.gain.value = 0.35;
    if (bgmFilter) bgmFilter.frequency.value = 400;
  } else {
    if (bgmGain) bgmGain.gain.value = 1;
    if (bgmFilter) bgmFilter.frequency.value = 22050;
  }
}

/** Lower BGM volume (e.g. during cycling lane / good biker). */
export function setBgmDuck(volume: number): void {
  if (bgmGain) bgmGain.gain.value = volume;
  else if (currentBgm) currentBgm.volume = volume;
}
