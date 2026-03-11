"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ASSET_KEYS } from "@/lib/game/assetLoader";

export function GameOverScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const distance = searchParams.get("distance") ?? "0.00";
  const [wheelLoaded, setWheelLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setWheelLoaded(true);
    img.src = ASSET_KEYS.gameover.wheel;
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-deep-brown px-4">
      <div className="text-center max-w-sm">
        {wheelLoaded && (
          <img
            src={ASSET_KEYS.gameover.wheel}
            alt=""
            className="mx-auto mb-6 h-32 w-32 object-contain md:h-40 md:w-40 animate-spin"
            style={{ animationDuration: "3s" }}
            aria-hidden
          />
        )}
        <p className="text-off-white text-lg mb-2">She never gives up...</p>
        <p className="text-saffron font-mono text-2xl mb-10">Distance: {distance} m</p>
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => router.push("/play")}
            className="w-full py-4 rounded-xl bg-saffron text-deep-brown font-bold text-lg"
          >
            TRY AGAIN
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="w-full py-4 rounded-xl border-2 border-teal text-teal font-bold"
          >
            HOME
          </button>
        </div>
      </div>
    </main>
  );
}
