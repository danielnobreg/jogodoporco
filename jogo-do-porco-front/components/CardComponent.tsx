"use client";
 
import { motion, useMotionValue, useTransform } from "framer-motion";
import type { Card } from "@/lib/types";
 
const NAIPE_SIMBOLO: Record<string, string> = {
  Copas: "♥",
  Ouros: "♦",
  Espadas: "♠",
  Paus: "♣",
  Especial: "🃏",
};
 
const NAIPE_COR: Record<string, string> = {
  Copas: "text-[#B91C1C]", // Vermelho premium
  Ouros: "text-[#B91C1C]",
  Espadas: "text-[#1F2937]", // Preto grafite premium
  Paus: "text-[#1F2937]",
  Especial: "text-[#D97706]", // Ouro/Cerveja premium
};
 
interface CardComponentProps {
  card: Card;
  faceDown?: boolean;
  onClick?: () => void;
  selected?: boolean;
  index?: number;
  isFrozen?: boolean;
  isForbidden?: boolean;
  drag?: boolean | "x" | "y";
  onDragStart?: (event: any, info: any) => void;
  onDrag?: (event: any, info: any) => void;
  onDragEnd?: (event: any, info: any) => void;
  customInitial?: any;
  onAnimationComplete?: () => void;
}
 
export function CardComponent({ 
  card, 
  faceDown = false, 
  onClick, 
  selected = false, 
  index = 0, 
  isFrozen = false,
  isForbidden = false,
  drag = false,
  onDragStart,
  onDrag,
  onDragEnd,
  customInitial,
  onAnimationComplete
}: CardComponentProps) {
  const isCoringa = card.value === "Coringa";

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-60, 60], [10, -10]);
  const rotateY = useTransform(x, [-40, 40], [-10, 10]);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (faceDown || isFrozen || isForbidden) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;
    x.set(mouseX);
    y.set(mouseY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const particles = isFrozen ? [
    { id: 1, x: -10, y: -15, delay: 0 },
    { id: 2, x: 25, y: -25, delay: 0.1 },
    { id: 3, x: 75, y: -10, delay: 0.2 },
    { id: 4, x: -12, y: 50, delay: 0.15 },
    { id: 5, x: 80, y: 65, delay: 0.05 },
    { id: 6, x: 30, y: 115, delay: 0.25 }
  ] : [];
 
  return (
    <motion.button
      layout
      drag={isForbidden ? false : drag}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.8}
      dragSnapToOrigin={true}
      onDragStart={onDragStart}
      onDrag={onDrag}
      onDragEnd={onDragEnd}
      onClick={isFrozen || isForbidden ? undefined : onClick}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onAnimationComplete={onAnimationComplete}
      initial={customInitial ? customInitial : { opacity: 0, y: 50, scale: 0.8, rotate: index % 2 === 0 ? -3 : 3 }}
      animate={selected 
        ? { y: -20, scale: 1.05, rotate: 0, opacity: 1, boxShadow: "0 20px 35px rgba(201,162,39,0.35)" }
        : { y: 0, scale: 1, rotate: 0, opacity: 1, boxShadow: "0 4px 10px rgba(0,0,0,0.15)" }}
      transition={{
        type: "spring",
        stiffness: 130,
        damping: 17,
        delay: index * 0.04,
        layout: { type: "spring", stiffness: 220, damping: 24 }
      }}
      whileHover={onClick && !isFrozen && !isForbidden ? { y: -14, rotate: -1.5, scale: 1.02, boxShadow: "0 10px 20px rgba(0,0,0,0.2)" } : undefined}
      whileTap={onClick && !isFrozen && !isForbidden ? { scale: 0.96 } : undefined}
      whileDrag={{ scale: 1.15, zIndex: 100, rotate: 0, boxShadow: "0 25px 50px rgba(0,0,0,0.4)" }}
      className={`
        relative w-14 h-24 md:w-20 md:h-32 rounded-xl border flex flex-col items-center justify-between
        font-display select-none transition-colors duration-300
        ${faceDown
          ? "bg-gradient-to-br from-[#0A2B20] to-[#051711] border-[#C9A227]/40 ring-1 ring-inset ring-[#C9A227]/10"
          : isFrozen
          ? "bg-gradient-to-br from-[#E0F7FA] to-[#B2EBF2] border-[#29B6F6] text-[#01579B] shadow-[0_0_20px_rgba(41,182,246,0.5)]"
          : isForbidden
          ? "bg-gradient-to-br from-[#1F2937]/90 to-[#111827] border-gray-800 text-gray-500 opacity-60 shadow-inner"
          : "bg-gradient-to-br from-[#FDFBF7] to-[#F5EFE6] border-[#1F2937]/15"}
        ${selected ? "ring-2 ring-[#C9A227] z-30" : "z-10 hover:z-20"}
        ${onClick && !isFrozen && !isForbidden ? "cursor-pointer" : "cursor-default"}
      `}
      aria-label={faceDown ? "Carta virada para baixo" : `${card.value} de ${card.suit}`}
    >
      {faceDown ? (
        // Verso da carta super luxuoso
        <div className="absolute inset-1 border border-[#C9A227]/20 rounded-[calc(0.75rem-4px)] flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(201,162,39,0.15)_0%,transparent_70%)]">
          <div className="w-full h-full rounded-[calc(0.75rem-6px)] opacity-35 bg-[repeating-linear-gradient(45deg,rgba(201,162,39,0.06)_0px,rgba(201,162,39,0.06)_3px,transparent_3px,transparent_6px),repeating-linear-gradient(-45deg,rgba(201,162,39,0.06)_0px,rgba(201,162,39,0.06)_3px,transparent_3px,transparent_6px)] flex items-center justify-center">
            <span className="text-lg md:text-2xl text-[#C9A227]">🐷</span>
          </div>
          <div className="absolute w-6 h-6 md:w-8 md:h-8 rounded-full border border-[#C9A227]/30 flex items-center justify-center bg-[#0A2B20] shadow-md">
            <span className="text-xs md:text-sm text-[#C9A227] animate-pulse">👑</span>
          </div>
        </div>
      ) : (
        // Frente da carta super refinada
        <div className="w-full h-full p-2 flex flex-col justify-between relative rounded-xl overflow-hidden">
          {/* Brilho interno para sensação tátil de papel */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.5)_0%,transparent_100%)] pointer-events-none opacity-50" />
          
          {/* Brilho dinâmico 3D (Glare) */}
          <motion.div
            className="absolute inset-0 bg-[radial-gradient(circle_at_var(--x,center),rgba(255,255,255,0.15)_0%,transparent_60%)] pointer-events-none z-10"
            style={{
              background: useTransform(
                [x, y],
                ([latestX, latestY]) =>
                  `radial-gradient(circle at ${(latestX as number) + 40}px ${(latestY as number) + 64}px, rgba(255, 255, 255, 0.22) 0%, transparent 70%)`
              )
            }}
          />
          
          {/* Índice superior esquerdo */}
          <div className="flex flex-col items-center self-start leading-none">
            <span className={`text-xs md:text-sm font-black ${isFrozen ? "text-[#0288D1]" : NAIPE_COR[card.suit]}`}>
              {isCoringa ? "🃏" : card.value}
            </span>
            {!isCoringa && (
              <span className={`text-[10px] md:text-xs ${isFrozen ? "text-[#0288D1]" : NAIPE_COR[card.suit]}`}>
                {NAIPE_SIMBOLO[card.suit]}
              </span>
            )}
          </div>
 
          {/* Símbolo central gigante */}
          <div className="flex items-center justify-center flex-1 my-1">
            {isFrozen && (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute text-5xl opacity-5 pointer-events-none select-none text-[#0288D1]"
              >
                ❄️
              </motion.span>
            )}
            <span className={`text-2xl md:text-4xl select-none leading-none filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)] ${isFrozen ? "text-[#0288D1] scale-110" : NAIPE_COR[card.suit]}`}>
              {isCoringa ? "🃏" : NAIPE_SIMBOLO[card.suit]}
            </span>
          </div>
 
          {/* Índice inferior direito */}
          <div className="flex flex-col items-center self-end leading-none transform rotate-180">
            <span className={`text-xs md:text-sm font-black ${isFrozen ? "text-[#0288D1]" : NAIPE_COR[card.suit]}`}>
              {isCoringa ? "🃏" : card.value}
            </span>
            {!isCoringa && (
              <span className={`text-[10px] md:text-xs ${isFrozen ? "text-[#0288D1]" : NAIPE_COR[card.suit]}`}>
                {NAIPE_SIMBOLO[card.suit]}
              </span>
            )}
          </div>
 
          {isFrozen && (
            <span className="absolute top-1 right-1 text-[10px] select-none filter drop-shadow-md">❄️</span>
          )}
          {isForbidden && (
            <span className="absolute top-1 right-1 text-[10px] select-none filter drop-shadow-md">🚫</span>
          )}
        </div>
      )}
      {isFrozen && (
        <div className="absolute inset-0 pointer-events-none overflow-visible">
          {particles.map(p => (
            <motion.div
              key={p.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 1.2, 0.8, 0], 
                y: [p.y, p.y - 15, p.y - 25, p.y - 30],
                opacity: [0, 0.9, 0.7, 0] 
              }}
              transition={{ 
                duration: 2.2, 
                repeat: Infinity, 
                repeatType: "loop",
                delay: p.delay,
                ease: "easeInOut" 
              }}
              style={{ left: p.x, top: p.y }}
              className="absolute w-1.5 h-1.5 bg-[#80DEEA] rounded-full shadow-[0_0_8px_#29B6F6]"
            />
          ))}
        </div>
      )}
    </motion.button>
  );
}