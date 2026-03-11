import { Suspense } from "react";
import { GameOverScreen } from "@/components/GameOverScreen";

export default function GameOverPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-deep-brown text-off-white">Loading...</div>}>
      <GameOverScreen />
    </Suspense>
  );
}
