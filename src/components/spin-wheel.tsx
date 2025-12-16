"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { IonIcon } from "@/components/ion-icon";
import { SPIN_PRIZES, getRandomPrize, type SpinPrize } from "@/lib/loyalty";

interface SpinWheelProps {
  isAvailable: boolean;
  onSpin: (prize: SpinPrize) => Promise<void>;
  onClose?: () => void;
}

export function SpinWheel({ isAvailable, onSpin, onClose }: SpinWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [prize, setPrize] = useState<SpinPrize | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleSpin = useCallback(async () => {
    if (isSpinning || !isAvailable) return;

    setIsSpinning(true);
    setShowResult(false);
    setPrize(null);

    const selectedPrize = getRandomPrize();
    const prizeIndex = SPIN_PRIZES.findIndex((p) => p.id === selectedPrize.id);
    const segmentAngle = 360 / SPIN_PRIZES.length;
    const targetAngle = 360 - prizeIndex * segmentAngle - segmentAngle / 2;
    const spins = 5 + Math.random() * 3;
    const finalRotation = rotation + spins * 360 + targetAngle;

    setRotation(finalRotation);

    setTimeout(async () => {
      setPrize(selectedPrize);
      setShowResult(true);
      setIsSpinning(false);
      await onSpin(selectedPrize);
    }, 4000);
  }, [isSpinning, isAvailable, rotation, onSpin]);

  const segmentAngle = 360 / SPIN_PRIZES.length;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl p-6 max-w-md w-full border border-border shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
              <IonIcon name="sync" size="20px" color="#22c55e" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Daily Spin</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <IonIcon name="close" size="20px" className="text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Wheel Container */}
        <div className="relative w-72 h-72 mx-auto mb-6">
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
            <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-green-500 drop-shadow-lg" />
          </div>

          {/* Wheel */}
          <div
            className="w-full h-full rounded-full border-4 border-green-500/30 shadow-2xl shadow-green-500/10 overflow-hidden"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning
                ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)"
                : "none",
            }}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {SPIN_PRIZES.map((p, i) => {
                const startAngle = i * segmentAngle;
                const endAngle = (i + 1) * segmentAngle;
                const startRad = (startAngle - 90) * (Math.PI / 180);
                const endRad = (endAngle - 90) * (Math.PI / 180);
                const x1 = 50 + 50 * Math.cos(startRad);
                const y1 = 50 + 50 * Math.sin(startRad);
                const x2 = 50 + 50 * Math.cos(endRad);
                const y2 = 50 + 50 * Math.sin(endRad);
                const largeArc = segmentAngle > 180 ? 1 : 0;
                const midAngle = (startAngle + endAngle) / 2 - 90;
                const midRad = midAngle * (Math.PI / 180);
                const textX = 50 + 32 * Math.cos(midRad);
                const textY = 50 + 32 * Math.sin(midRad);

                return (
                  <g key={p.id}>
                    <path
                      d={`M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={p.color}
                      stroke="hsl(var(--border))"
                      strokeWidth="0.5"
                    />
                    <text
                      x={textX}
                      y={textY}
                      fill="white"
                      fontSize="4"
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                    >
                      {p.label}
                    </text>
                  </g>
                );
              })}
              <circle
                cx="50"
                cy="50"
                r="8"
                fill="hsl(var(--card))"
                stroke="#22c55e"
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>

        {/* Result */}
        {showResult && prize && (
          <div
            className={`text-center p-4 rounded-xl mb-4 ${
              prize.type === "nothing"
                ? "bg-muted"
                : "bg-green-500/10 border border-green-500/20"
            }`}
          >
            <div className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center bg-muted">
              <IonIcon
                name={prize.type === "nothing" ? "sad-outline" : "checkmark-circle"}
                size="28px"
                color={prize.type === "nothing" ? "#9ca3af" : "#22c55e"}
              />
            </div>
            <p className="text-lg font-bold text-foreground">
              {prize.type === "nothing"
                ? "Better luck tomorrow!"
                : `You won ${prize.label}!`}
            </p>
            {prize.type !== "nothing" && (
              <p className="text-sm text-muted-foreground mt-1">
                {prize.type === "points" && "Points added to your account"}
                {prize.type === "discount" && "Use on your next purchase"}
                {prize.type === "cashback" && "Applied to next transaction"}
              </p>
            )}
          </div>
        )}

        {/* Spin Button */}
        <Button
          onClick={handleSpin}
          disabled={isSpinning || !isAvailable || showResult}
          className="w-full h-12 text-base font-semibold bg-green-500 hover:bg-green-600 disabled:opacity-50"
        >
          {isSpinning ? (
            <span className="flex items-center gap-2">
              <IonIcon name="sync" size="20px" className="animate-spin" />
              Spinning...
            </span>
          ) : !isAvailable ? (
            <span className="flex items-center gap-2">
              <IonIcon name="time-outline" size="20px" />
              Come back tomorrow
            </span>
          ) : showResult ? (
            <span className="flex items-center gap-2">
              <IonIcon name="checkmark" size="20px" />
              Done
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <IonIcon name="sync" size="20px" />
              Spin the Wheel
            </span>
          )}
        </Button>

        {!isAvailable && !showResult && (
          <p className="text-center text-sm text-muted-foreground mt-3">
            You've already spun today. Come back tomorrow!
          </p>
        )}
      </div>
    </div>
  );
}
