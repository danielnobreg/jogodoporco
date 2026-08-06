"use client";
 
import { motion, AnimatePresence } from "framer-motion";
 
const PALAVRA = "PORCO";
 
interface LetterTrackerProps {
  username: string;
  letters: string;
  isCurrentUser?: boolean;
  isActive?: boolean;
  turnTimeLeft?: number;
}
 
export function LetterTracker({
  username,
  letters,
  isCurrentUser = false,
  isActive = false,
  turnTimeLeft,
}: LetterTrackerProps) {
  const getColor = (time: number = 20) => {
    if (time >= 10) return "#10B981";
    if (time >= 5) return "#F59E0B";
    return "#EF4444";
  };

  const progressPercent = turnTimeLeft !== undefined ? (turnTimeLeft / 20) * 100 : 0;
  const strokeDasharray = 2 * Math.PI * 12;
  const strokeDashoffset = (1 - progressPercent / 100) * strokeDasharray;

  return (
    <div 
      style={{
        borderColor: isActive ? getColor(turnTimeLeft) : undefined,
        boxShadow: isActive ? `0 0 15px ${getColor(turnTimeLeft)}25` : undefined
      }}
      className={`
        relative flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-300
        ${isActive
          ? "bg-[#0A2B20] scale-105"
          : isCurrentUser 
          ? "bg-[#0A2B20]/80 border-[#C9A227] shadow-[0_10px_25px_rgba(201,162,39,0.15)] scale-105" 
          : "bg-[#0A2B20]/40 border-[#C9A227]/10 hover:border-[#C9A227]/30 shadow-md"}
      `}
    >
      {/* Anel de Turno Circular */}
      {isActive && turnTimeLeft !== undefined && (
        <div className="absolute -top-3 -right-3 z-20 flex items-center justify-center bg-[#051711] w-8 h-8 rounded-full border border-[#C9A227]/10 shadow-lg">
          <svg className="w-8 h-8 transform -rotate-90">
            <circle
              cx="16"
              cy="16"
              r="12"
              className="stroke-[#0A2B20]/50 fill-none"
              strokeWidth="2.5"
            />
            <motion.circle
              cx="16"
              cy="16"
              r="12"
              className="fill-none transition-colors duration-300"
              stroke={getColor(turnTimeLeft)}
              strokeWidth="2.5"
              strokeDasharray={strokeDasharray}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.3, ease: "linear" }}
            />
          </svg>
          <span className="absolute text-[10px] font-black text-[#FDFBF7]">
            {turnTimeLeft}
          </span>
        </div>
      )}

      {isCurrentUser && (
        <span className="absolute -top-2 bg-[#C9A227] text-[#1A1A1A] font-display text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
          Você
        </span>
      )}
      <span className="text-xs font-body font-bold text-[#F4E9D8]/80 truncate max-w-[90px] mt-1">
        {username}
      </span>
      <div className="flex gap-1.5 bg-[#051711] px-3 py-2 rounded-xl border border-[#C9A227]/5 shadow-inner">
        {PALAVRA.split("").map((letra, i) => {
          const ganhou = letters.length > i;
          return (
            <div key={i} className="relative w-6 h-7 flex items-center justify-center">
              {/* Sombra da letra apagada */}
              <span className="font-display text-sm font-bold text-[#F4E9D8]/10 select-none">{letra}</span>
              <AnimatePresence>
                {ganhou && (
                  <motion.span
                    initial={{ scale: 3, opacity: 0, rotate: -25, filter: "blur(4px)" }}
                    animate={{ scale: 1, opacity: 1, rotate: -8, filter: "blur(0)" }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 350, damping: 15 }}
                    className="absolute font-display text-lg font-black text-[#C9A227]"
                    style={{ textShadow: "0 0 10px rgba(201,162,39,0.7), 0 0 20px rgba(201,162,39,0.3)" }}
                  >
                    {letra}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}