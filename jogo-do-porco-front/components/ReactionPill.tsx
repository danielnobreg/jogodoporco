"use client";

import { useEffect, useState } from "react";

interface ReactionPillProps {
  onSendReaction: (emoji: string) => void;
}

const EMOJIS = ["🐷", "😂", "😮", "😠", "👑"];

export function ReactionPill({ onSendReaction }: ReactionPillProps) {
  const [cooldown, setCooldown] = useState(0); // em ms

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 50) {
          clearInterval(interval);
          return 0;
        }
        return prev - 50;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [cooldown > 0]);

  const handleSelect = (emoji: string) => {
    if (cooldown > 0) return;
    onSendReaction(emoji);
    setCooldown(1500); // 1.5s
  };

  const progressPercent = cooldown > 0 ? (cooldown / 1500) * 100 : 0;

  return (
    <div className="relative overflow-hidden bg-[#0A2B20]/90 backdrop-blur border border-[#C9A227]/30 px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 font-display select-none">
      {/* Barra de Cooldown em Fundo */}
      {cooldown > 0 && (
        <div
          className="absolute left-0 top-0 bottom-0 bg-[#C9A227]/10 pointer-events-none"
          style={{ width: `${progressPercent}%` }}
        />
      )}

      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          disabled={cooldown > 0}
          onClick={() => handleSelect(emoji)}
          className={`text-xl p-1 rounded-full transition-all cursor-pointer select-none active:scale-90 z-10 ${
            cooldown > 0
              ? "opacity-40 cursor-not-allowed"
              : "hover:scale-125 hover:bg-[#C9A227]/15"
          }`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
