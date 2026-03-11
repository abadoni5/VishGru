import { GameCanvas } from "@/components/GameCanvas";

export default function PlayPage() {
  return (
    <main className="relative h-screen w-full overflow-hidden bg-road-tarmac">
      <GameCanvas />
    </main>
  );
}
