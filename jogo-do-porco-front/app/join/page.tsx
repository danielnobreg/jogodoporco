"use client";
 
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
 
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5235";
 
function JoinForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [code, setCode] = useState(searchParams.get("code") || "");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
 
  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
 
    try {
      const res = await fetch(`${API_URL}/guest/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode: code.toUpperCase(), displayName }),
      });
 
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao entrar na sala");
      }
 
      const data = await res.json();
 
      // guarda como sessão de convidado
      localStorage.setItem("porco_token", data.guestToken);
      localStorage.setItem("porco_username", displayName);
      localStorage.setItem("porco_is_guest", "true");
 
      router.push(`/room/${data.roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }
 
  return (
    <div className="w-full max-w-md bg-gradient-to-b from-[#0A2B20] to-[#051711] border border-[#C9A227]/25 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#C9A227] to-transparent" />
      <h1 className="font-display text-3xl font-black text-[#C9A227] text-center mb-1.5 select-none tracking-wide">
        ENTRAR NA SALA
      </h1>
      <p className="text-center text-[#FDFBF7]/60 text-xs mb-8 select-none font-body font-medium">
        Digite o código de acesso e seu nome para participar
      </p>
 
      <form onSubmit={handleJoin} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold tracking-widest text-[#C9A227] mb-1 pl-1">Código da Sala</label>
          <input
            type="text"
            placeholder="EX: ABCDEF"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="text-center font-display text-2xl font-black tracking-widest bg-[#051711] border border-[#C9A227]/15 rounded-xl px-4 py-3 text-[#FDFBF7] focus:outline-none focus:border-[#C9A227]/60 focus:ring-1 focus:ring-[#C9A227]/30 transition-all uppercase"
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold tracking-widest text-[#C9A227] mb-1 pl-1">Seu Nome / Apelido</label>
          <input
            type="text"
            placeholder="Digite como deseja ser chamado..."
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={20}
            className="bg-[#051711] border border-[#C9A227]/15 rounded-xl px-4 py-3 text-xs text-[#FDFBF7] placeholder:text-[#FDFBF7]/35 focus:outline-none focus:border-[#C9A227]/60 focus:ring-1 focus:ring-[#C9A227]/30 transition-all font-body font-medium"
            required
          />
        </div>
 
        {error && (
          <div className="bg-[#B91C1C]/10 border border-[#B91C1C]/35 text-[#FF8A8A] text-xs p-3.5 rounded-xl flex items-center gap-2 mt-1">
            <span>⚠️</span>
            <span className="font-body font-bold">{error}</span>
          </div>
        )}
 
        <button
          type="submit"
          disabled={loading}
          className="mt-4 bg-gradient-to-r from-[#D97706] to-[#C9A227] hover:from-[#EAB308] hover:to-[#D97706] text-[#051711] font-display font-black py-3.5 rounded-xl disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-98 cursor-pointer text-xs"
        >
          {loading ? "ENTRANDO..." : "ENTRAR NO JOGO"}
        </button>
      </form>
    </div>
  );
}
 
export default function JoinPage() {
  return (
    <div className="min-h-screen flex items-center justify-center mesa-textura p-6">
      <Suspense fallback={
        <div className="text-center text-[#FDFBF7]/50 text-xs italic bg-[#051711]/45 p-6 rounded-2xl border border-[#FDFBF7]/5">
          Carregando informações da sala...
        </div>
      }>
        <JoinForm />
      </Suspense>
    </div>
  );
}