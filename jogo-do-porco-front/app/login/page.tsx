"use client";
 
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
 
export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const { login, register } = useAuth();
 
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
 
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        await register(form);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar");
      setLoading(false);
    }
  }
 
  return (
    <div className="min-h-screen flex items-center justify-center mesa-textura p-6">
      {/* Container com layout animado para se expandir fluidamente */}
      <motion.div 
        layout
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="w-full max-w-md bg-gradient-to-b from-[#0A2B20] to-[#051711] border border-[#C9A227]/25 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
      >
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#C9A227] to-transparent" />
        
        <div className="text-center mb-6 select-none">
          <h1 className="font-display text-3xl font-black text-[#C9A227] tracking-wider">
            PORCO
          </h1>
          <p className="text-[#FDFBF7]/40 text-[9px] uppercase tracking-widest font-body font-black mt-1">
            Private Card Club
          </p>
        </div>
 
        {/* Toggle de Modo (Login/Registro) */}
        <div className="flex gap-1.5 bg-[#051711] p-1 rounded-xl border border-[#C9A227]/15 mb-6">
          <button
            onClick={() => {
              setMode("login");
              setError("");
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-display font-black transition-all cursor-pointer ${mode === "login" ? "bg-[#C9A227] text-[#051711] font-black shadow-md scale-[1.02]" : "text-[#FDFBF7]/60 hover:text-[#FDFBF7]"}`}
          >
            ENTRAR
          </button>
          <button
            onClick={() => {
              setMode("register");
              setError("");
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-display font-black transition-all cursor-pointer ${mode === "register" ? "bg-[#C9A227] text-[#051711] font-black shadow-md scale-[1.02]" : "text-[#FDFBF7]/60 hover:text-[#FDFBF7]"}`}
          >
            CRIAR CONTA
          </button>
        </div>
 
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: mode === "login" ? -15 : 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === "login" ? 15 : -15 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4"
            >
              {mode === "register" && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-[#C9A227] pl-1">Nome de jogador</label>
                  <input
                    type="text"
                    placeholder="Seu apelido no jogo..."
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="bg-[#051711] border border-[#C9A227]/15 rounded-xl px-4 py-3 text-xs text-[#FDFBF7] placeholder:text-[#FDFBF7]/35 focus:outline-none focus:border-[#C9A227]/60 focus:ring-1 focus:ring-[#C9A227]/30 transition-all font-body font-bold"
                    required
                  />
                </div>
              )}
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-[#C9A227] pl-1">Email</label>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="bg-[#051711] border border-[#C9A227]/15 rounded-xl px-4 py-3 text-xs text-[#FDFBF7] placeholder:text-[#FDFBF7]/35 focus:outline-none focus:border-[#C9A227]/60 focus:ring-1 focus:ring-[#C9A227]/30 transition-all font-body font-bold"
                  required
                />
              </div>
 
              <div className="flex flex-col gap-1 relative">
                <label className="text-[10px] uppercase font-bold tracking-widest text-[#C9A227] pl-1">Senha</label>
                <div className="relative w-full">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres..."
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.getModifierState) {
                        setCapsLockActive(e.getModifierState("CapsLock"));
                      }
                    }}
                    onKeyUp={(e) => {
                      if (e.getModifierState) {
                        setCapsLockActive(e.getModifierState("CapsLock"));
                      }
                    }}
                    className="w-full bg-[#051711] border border-[#C9A227]/15 rounded-xl pl-4 pr-16 py-3 text-xs text-[#FDFBF7] placeholder:text-[#FDFBF7]/35 focus:outline-none focus:border-[#C9A227]/60 focus:ring-1 focus:ring-[#C9A227]/30 transition-all font-body font-bold"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#C9A227]/70 hover:text-[#C9A227] text-[10px] font-display font-black tracking-wider uppercase cursor-pointer select-none"
                    tabIndex={-1}
                  >
                    {showPassword ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
 
          {capsLockActive && (
            <p className="text-[#C9A227] text-[10px] uppercase tracking-wider font-bold font-body flex items-center gap-1.5 ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C9A227] animate-ping" /> Caps Lock ativo
            </p>
          )}
 
          {error && (
            <div className="bg-[#B91C1C]/10 border border-[#B91C1C]/35 text-[#FF8A8A] text-xs p-3.5 rounded-xl flex items-center gap-2 mt-1">
              <span className="font-bold">{error}</span>
            </div>
          )}
 
          <button
            type="submit"
            disabled={loading}
            className="mt-4 bg-gradient-to-r from-[#D97706] to-[#C9A227] hover:from-[#EAB308] hover:to-[#D97706] text-[#051711] font-display font-black py-3.5 rounded-xl disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-98 cursor-pointer text-xs"
          >
            {loading ? "CARREGANDO..." : mode === "login" ? "ENTRAR" : "CRIAR CONTA"}
          </button>
        </form>
 
        <div className="relative flex py-4 items-center opacity-40">
          <div className="flex-grow border-t border-[#C9A227]/20"></div>
          <span className="flex-shrink mx-4 text-[#FDFBF7] text-[10px] uppercase font-bold tracking-wider font-body">Ou</span>
          <div className="flex-grow border-t border-[#C9A227]/20"></div>
        </div>
 
        <button
          onClick={() => router.push("/join")}
          className="w-full bg-transparent border border-[#C9A227]/40 text-[#C9A227] hover:bg-[#C9A227]/10 font-display font-black text-xs py-3.5 rounded-xl transition-all cursor-pointer uppercase tracking-wider hover:scale-[1.01] active:scale-98"
        >
          JOGAR COMO CONVIDADO
        </button>
      </motion.div>
    </div>
  );
}