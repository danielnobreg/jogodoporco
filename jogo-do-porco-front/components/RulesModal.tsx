"use client";
 
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CardComponent } from "./CardComponent";
 
interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}
 
export function RulesModal({ isOpen, onClose }: RulesModalProps) {
  const [step, setStep] = useState(0);
 
  const steps = [
    {
      title: "Objetivo do Jogo",
      content: (
        <div className="flex flex-col gap-4 text-xs text-[#FDFBF7]/90 font-body leading-relaxed">
          <p>
            O <strong>Jogo do Porco</strong> é um jogo clássico de baralho que une agilidade e inteligência.
            Seu objetivo principal é organizar suas cartas e formar <strong>3 trios</strong> válidos na sua mão.
          </p>
          <div className="bg-[#051711] p-4 rounded-xl border border-[#C9A227]/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#C9A227]/10 border border-[#C9A227]/30 flex items-center justify-center font-display font-black text-[#C9A227] text-lg select-none">
              A
            </div>
            <div>
              <h4 className="font-display font-bold text-[#C9A227] text-[10px] uppercase tracking-wider">A Distribuição</h4>
              <p className="text-[11px] text-[#FDFBF7]/70">Cada jogador recebe 9 cartas da mesa. O jogador da vez inicia a rodada com 10 cartas.</p>
            </div>
          </div>
          <p className="text-[11px] text-[#FDFBF7]/50 italic">
            Assim que fechar os seus 3 trios, a rodada se encerra. Em partidas de 3 ou mais jogadores, você precisa bater na mesa antes que os outros façam o mesmo para não levar penalidades!
          </p>
        </div>
      )
    },
    {
      title: "Como Formar Trios",
      content: (
        <div className="flex flex-col gap-4 text-xs text-[#FDFBF7]/90 font-body leading-relaxed">
          <p>Os trios de cartas válidos podem ser constituídos de duas maneiras distintas:</p>
 
          <div className="space-y-3">
            <div className="bg-[#051711] p-3.5 rounded-xl border border-[#C9A227]/10">
              <h4 className="font-display font-bold text-[#C9A227] text-[10px] uppercase tracking-wider mb-2">1. Sequência do mesmo naipe</h4>
              <p className="text-[11px] text-[#FDFBF7]/70 mb-3">Três cartas seguidas com valores em ordem crescente pertencentes ao mesmo naipe.</p>
              <div className="flex gap-2 justify-center scale-90 origin-center">
                <CardComponent card={{ suit: "Copas", value: "7" }} />
                <CardComponent card={{ suit: "Copas", value: "8" }} />
                <CardComponent card={{ suit: "Copas", value: "9" }} />
              </div>
            </div>
 
            <div className="bg-[#051711] p-3.5 rounded-xl border border-[#C9A227]/10">
              <h4 className="font-display font-bold text-[#C9A227] text-[10px] uppercase tracking-wider mb-2">2. Valores idênticos</h4>
              <p className="text-[11px] text-[#FDFBF7]/70 mb-3">Três cartas com o mesmo valor facial, porém com naipes diferentes.</p>
              <div className="flex gap-2 justify-center scale-90 origin-center">
                <CardComponent card={{ suit: "Copas", value: "Q" }} />
                <CardComponent card={{ suit: "Espadas", value: "Q" }} />
                <CardComponent card={{ suit: "Ouros", value: "Q" }} />
              </div>
            </div>
          </div>
          <p className="text-[11px] text-[#29B6F6] italic font-semibold">
            Importante: Quando você forma um trio válido, essas cartas são congeladas! Elas adquirem o visual azul cristalizado, movem-se para o início da mão e não podem ser descartadas.
          </p>
        </div>
      )
    },
    {
      title: "Como Jogar o Turno",
      content: (
        <div className="flex flex-col gap-4 text-xs text-[#FDFBF7]/90 font-body leading-relaxed">
          <p>O fluxo de cada jogada é composto por duas ações obrigatórias no seu turno:</p>
          <div className="relative border-l border-[#C9A227]/30 pl-4 ml-2 space-y-4">
            <div className="relative">
              <div className="absolute -left-[21px] top-1 w-2 h-2 rounded-full bg-[#C9A227]" />
              <h4 className="font-display font-bold text-[#C9A227] text-[10px] uppercase tracking-wider">1. Comprar (9 para 10 cartas)</h4>
              <p className="text-[11px] text-[#FDFBF7]/70">Escolha comprar a carta superior do baralho fechado ou pegar a última descartada na mesa.</p>
            </div>
            <div className="relative">
              <div className="absolute -left-[21px] top-1 w-2 h-2 rounded-full bg-[#C9A227]" />
              <h4 className="font-display font-bold text-[#C9A227] text-[10px] uppercase tracking-wider">2. Passar (10 para 9 cartas)</h4>
              <p className="text-[11px] text-[#FDFBF7]/70">Escolha uma carta livre da sua mão e clique em passar para descartá-la no centro e passar a vez.</p>
            </div>
          </div>
          <div className="bg-[#B91C1C]/10 border border-[#B91C1C]/35 p-3 rounded-xl text-[11px] text-[#FF8A8A]">
            Você tem total liberdade para passar a carta que acabou de comprar caso ela não encaixe nos seus planos.
          </div>
        </div>
      )
    },
    {
      title: "Pontuação & Coringa",
      content: (
        <div className="flex flex-col gap-4 text-xs text-[#FDFBF7]/90 font-body leading-relaxed">
          <p>
            Ao término de cada rodada, o perdedor recebe uma letra da palavra <strong>PORCO</strong>.
            Aquele que preencher a palavra inteira perde o jogo!
          </p>
          <div className="bg-[#051711] p-3.5 rounded-xl border border-[#C9A227]/10 space-y-2">
            <h4 className="font-display font-bold text-[#C9A227] text-[10px] uppercase tracking-wider">O Perigo do Coringa</h4>
            <p className="text-[11px] text-[#FDFBF7]/70">
              O Coringa é uma carta rara de baralho. Ele não pode ser utilizado para fechar trios. 
              Ficar com o Coringa na mão ao fim da rodada gera uma penalidade de letra dupla!
            </p>
          </div>
          <div className="bg-[#B91C1C]/10 border border-[#B91C1C]/25 p-3.5 rounded-xl text-[11px] text-[#FDFBF7]/80 flex items-center gap-3">
            <span className="font-display font-black text-[#B91C1C] text-sm select-none">!</span>
            <p><strong>Partida Dupla:</strong> Em partidas com exatamente 2 jogadores, a rodada se encerra no exato instante em que um deles congela os 3 trios. O outro perde a rodada sem a fase de bater.</p>
          </div>
        </div>
      )
    }
  ];
 
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#051711]/90 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            className="bg-gradient-to-b from-[#0A2B20] to-[#051711] border border-[#C9A227]/25 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col h-[520px] relative"
          >
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#C9A227] to-transparent" />
            
            {/* Header */}
            <div className="flex items-center justify-between bg-[#051711] p-4 border-b border-[#C9A227]/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#C9A227]/10 border border-[#C9A227]/30 flex items-center justify-center font-display font-black text-[#C9A227]">
                  {step + 1}
                </div>
                <div>
                  <h3 className="font-display font-bold text-[#C9A227] text-sm uppercase tracking-wide">{steps[step].title}</h3>
                  <p className="text-[9px] text-[#FDFBF7]/40 uppercase tracking-widest font-body font-bold">Instruções • Passo {step + 1} de {steps.length}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-xs bg-[#B91C1C]/15 hover:bg-[#B91C1C]/25 border border-[#B91C1C]/35 text-[#FDFBF7] font-body px-3 py-1.5 rounded-xl transition-all cursor-pointer font-bold shadow-sm"
              >
                Fechar
              </button>
            </div>
 
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-[radial-gradient(ellipse_at_center,rgba(15,61,46,0.15)_0%,transparent_100%)] scrollbar-thin">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                >
                  {steps[step].content}
                </motion.div>
              </AnimatePresence>
            </div>
 
            {/* Footer */}
            <div className="bg-[#051711] p-4 border-t border-[#C9A227]/10 flex justify-between items-center">
              <div className="flex gap-2">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className={`w-2.5 h-1.5 rounded-full transition-all cursor-pointer ${i === step ? "bg-[#C9A227] w-6" : "bg-[#FDFBF7]/20"}`}
                    aria-label={`Ir para passo ${i + 1}`}
                  />
                ))}
              </div>
 
              <div className="flex gap-2">
                {step > 0 && (
                  <button
                    onClick={() => setStep(prev => prev - 1)}
                    className="px-4 py-2 border border-[#C9A227]/30 text-[#C9A227] hover:bg-[#C9A227]/10 font-display font-black text-[10px] uppercase rounded-xl transition-colors cursor-pointer"
                  >
                    Anterior
                  </button>
                )}
                {step < steps.length - 1 ? (
                  <button
                    onClick={() => setStep(prev => prev + 1)}
                    className="px-4 py-2 bg-[#C9A227] text-[#051711] font-display font-black text-[10px] uppercase rounded-xl hover:bg-[#C9A227]/90 transition-colors cursor-pointer shadow-md"
                  >
                    Próximo
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gradient-to-r from-[#D97706] to-[#C9A227] text-[#051711] font-display font-black text-[10px] uppercase rounded-xl hover:scale-[1.02] active:scale-95 transition-all cursor-pointer shadow-md"
                  >
                    Entendido
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
