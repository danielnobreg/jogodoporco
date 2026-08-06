"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import sound from "@/lib/sound";

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onShowRules: () => void;
  onLeaveRoom: () => void;
}

export function SettingsDrawer({ isOpen, onClose, onShowRules, onLeaveRoom }: SettingsDrawerProps) {
  const [volume, setVolumeState] = useState(0.8);
  const [muted, setMutedState] = useState(false);

  useEffect(() => {
    setVolumeState(sound.getVolume());
    setMutedState(sound.isMuted());
  }, [isOpen]);

  const handleVolumeChange = (v: number) => {
    setVolumeState(v);
    sound.setVolume(v);
  };

  const handleMutedChange = (m: boolean) => {
    setMutedState(m);
    sound.setMuted(m);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 cursor-pointer"
          />

          {/* Drawer Container */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-80 bg-gradient-to-b from-[#0A2B20] to-[#051711] border-l border-[#C9A227]/25 shadow-2xl z-50 p-6 flex flex-col justify-between font-display"
          >
            <div className="flex flex-col gap-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#C9A227]/10 pb-4">
                <h2 className="text-[#C9A227] font-black tracking-wider text-lg">AJUSTES</h2>
                <button
                  onClick={onClose}
                  className="text-[#F4E9D8]/60 hover:text-[#C9A227] transition-all hover:scale-110 text-xl font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Volume Control */}
              <div className="flex flex-col gap-4 bg-[#051711]/40 border border-[#C9A227]/10 p-4 rounded-2xl">
                <h3 className="text-xs text-[#C9A227] font-black tracking-widest uppercase">Áudio</h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs text-[#F4E9D8]/70">
                    <span>Volume</span>
                    <span className="font-bold">{Math.round(volume * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm">🔊</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      disabled={muted}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-full h-1 bg-[#051711] border border-[#C9A227]/10 rounded-lg appearance-none cursor-pointer accent-[#C9A227]"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#F4E9D8]/70 mt-1">
                    <span>Silenciar</span>
                    <button
                      onClick={() => handleMutedChange(!muted)}
                      className={`w-10 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-300 border ${
                        muted ? "bg-[#C9A227] border-[#C9A227]" : "bg-[#051711] border-[#C9A227]/25"
                      }`}
                    >
                      <motion.div
                        layout
                        className={`w-4 h-4 rounded-full shadow-md ${
                          muted ? "bg-[#051711]" : "bg-[#C9A227]"
                        }`}
                        animate={{ x: muted ? 20 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Game Rules Button */}
              <div className="flex flex-col gap-4">
                <button
                  onClick={() => {
                    onClose();
                    onShowRules();
                  }}
                  className="w-full bg-transparent border border-[#C9A227]/30 text-[#C9A227] hover:bg-[#C9A227]/10 font-bold text-xs py-3.5 rounded-xl transition-all cursor-pointer uppercase tracking-wider hover:scale-[1.01] active:scale-98"
                >
                  📜 Ver Regras do Jogo
                </button>
              </div>
            </div>

            {/* Exit Room Button */}
            <div className="border-t border-[#C9A227]/10 pt-4">
              <button
                onClick={onLeaveRoom}
                className="w-full bg-[#B91C1C]/15 border border-[#B91C1C]/40 text-[#FF8A8A] hover:bg-[#B91C1C]/25 font-bold text-xs py-3.5 rounded-xl transition-all cursor-pointer uppercase tracking-wider hover:scale-[1.01] active:scale-98"
              >
                🚪 Sair da Sala
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
