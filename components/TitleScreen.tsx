"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { preloadAudio, playBell } from "@/lib/audio";
import { preloadTitleAssets, ASSET_KEYS } from "@/lib/game/assetLoader";

const AUDIO_KEYS_TO_PRELOAD = [
  "backgroundStarting",
  "backgroundOverall",
  "horn",
  "cow",
  "cowPassing",
  "bell",
  "puddleSplash",
  "dogBark",
  "crash",
  "goodBiker",
  "cycleLane",
  "cowSquelch",
] as const;

export function TitleScreen() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [titleBgLoaded, setTitleBgLoaded] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [btnPlayLoaded, setBtnPlayLoaded] = useState(false);

  useEffect(() => {
    preloadTitleAssets().catch(() => {});
    preloadAudio([...AUDIO_KEYS_TO_PRELOAD]).then(() => {
      setProgress(100);
      setReady(true);
    }).catch(() => setReady(true));
  }, []);

  const onPlay = useCallback(() => {
    playBell();
    router.push("/play");
  }, [router]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-deep-brown">
      {/* Background from public/images/title/title-bg.png */}
      <img
        src={ASSET_KEYS.title.bg}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
        onLoad={() => setTitleBgLoaded(true)}
        aria-hidden
      />
      {/* Centered logo and button from public/images/title/ */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-8 px-6">
        <img
          src={ASSET_KEYS.title.logo}
          alt="VishGru"
          className="w-full max-w-md h-auto drop-shadow-lg"
          onLoad={() => setLogoLoaded(true)}
        />

        <button
          type="button"
          onClick={onPlay}
          disabled={!ready}
          className="block border-0 bg-transparent p-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.97] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-saffron"
          aria-label="Play Vishwaguru Mode"
        >
          <img
            src={ASSET_KEYS.title.btnPlay}
            alt="PLAY — VISHWAGURU MODE"
            className="h-auto w-full max-w-[320px] drop-shadow-lg"
            onLoad={() => setBtnPlayLoaded(true)}
          />
        </button>

        {!ready && (
          <div className="mt-4 w-48">
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-center text-white/80 text-xs mt-1">Loading...</p>
          </div>
        )}
      </div>
    </main>
  );
}
