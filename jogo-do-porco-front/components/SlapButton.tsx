"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface SlapButtonProps {
  active: boolean;   // true quando fase = "Slapping"
  onSlap: () => void;
  disabled?: boolean;
}

export function SlapButton({ active, onSlap, disabled = false }: SlapButtonProps) {
  const [ripples, setRipples] = useState<{ id: number; scale: number }[]>([]);

  const handleClick = () => {
    if (disabled) return;
    const newRipple = { id: Date.now() + Math.random(), scale: 3.5 };
    setRipples((prev) => [...prev, newRipple]);
    onSlap();
  };

  return (
    <div className="relative p-1.5 rounded-full bg-[#051711] border border-[#C9A227]/15 shadow-inner">
      {ripples.map((ripple) => (
        <motion.div
          key={ripple.id}
          initial={{ scale: 1, opacity: 0.8 }}
          animate={{ scale: ripple.scale, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          onAnimationComplete={() => {
            setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
          }}
          className="absolute inset-0 rounded-full border-2 border-[#C9A227] bg-[#C9A227]/20 pointer-events-none z-0"
        />
      ))}
      <motion.button
        onClick={handleClick}
        disabled={disabled}
        animate={active && !disabled ? {
          scale: [1, 1.05, 1],
          boxShadow: [
            "0 10px 25px rgba(0,0,0,0.4), 0 0 0px rgba(201,162,39,0)",
            "0 15px 35px rgba(0,0,0,0.5), 0 0 30px rgba(201,162,39,0.7)",
            "0 10px 25px rgba(0,0,0,0.4), 0 0 0px rgba(201,162,39,0)"
          ]
        } : { scale: 1, boxShadow: "0 4px 10px rgba(0,0,0,0.3)" }}
        transition={active && !disabled ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : undefined}
        whileHover={!disabled ? { scale: 1.04, y: -2, boxShadow: "0 15px 30px rgba(201,162,39,0.25)" } : undefined}
        whileTap={!disabled ? { scale: 0.94, y: 1 } : undefined}
        className={`
          relative font-display font-black text-xl px-12 py-5 rounded-full
          border transition-all duration-300 select-none overflow-hidden tracking-wider cursor-pointer z-10
          ${active && !disabled
            ? "bg-gradient-to-r from-[#D97706] to-[#C9A227] border-[#FDFBF7] text-[#051711] cursor-pointer font-extrabold"
            : "bg-[#0A2B20]/60 border-[#C9A227]/25 text-[#C9A227]/50"}
          ${disabled ? "opacity-35 cursor-not-allowed" : ""}
        `}
      >
        {/* Glow interno se ativo */}
        {active && !disabled && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.45)_0%,transparent_80%)] pointer-events-none" />
        )}
        <span className="relative z-10 flex items-center justify-center gap-2">
          {active && !disabled ? "💥 BATER MESA! 💥" : "BATER!"}
        </span>
      </motion.button>
    </div>
  );
}