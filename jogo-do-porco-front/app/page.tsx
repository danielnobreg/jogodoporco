"use client";
 
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { Room } from "@/lib/types";
 
const AVATAR_COLORS = [
  { name: "Ouro", value: "#C9A227" },
  { name: "Vinho", value: "#B91C1C" },
  { name: "Esmeralda", value: "#10B981" },
  { name: "Safira", value: "#3B82F6" },
  { name: "Ametista", value: "#8B5CF6" },
  { name: "Âmbar", value: "#D97706" }
];
 
export default function LobbyPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newRoomName, setNewRoomName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Customização de perfil
  const [profileName, setProfileName] = useState("");
  const [selectedColor, setSelectedColor] = useState("#C9A227");
 
  const { username, logout, isLoggedIn, isGuest } = useAuth();
  const router = useRouter();
 
  useEffect(() => {
    if (isGuest()) {
      logout();
      return;
    }
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    loadRooms();
    loadHistory();
    
    // Inicializar perfil a partir do localStorage
    setProfileName(localStorage.getItem("porco_username") || "");
    setSelectedColor(localStorage.getItem("porco_avatar_color") || "#C9A227");
  }, []);
 
  async function loadRooms() {
    try {
      const data = await api.getRooms();
      setRooms(data);
    } finally {
      setLoading(false);
    }
  }
 
  async function loadHistory() {
    try {
      const data = await api.getMatchHistory();
      setHistory(data);
    } catch (err) {
      console.error("Erro ao buscar histórico:", err);
    }
  }
 
  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    try {
      const room = await api.createRoom(newRoomName, maxPlayers);
      setIsCreateModalOpen(false);
      router.push(`/room/${room.id}`);
    } catch (err) {
      console.error("Erro ao criar sala:", err);
    }
  }
 
  async function handleJoinRoom(roomId: string) {
    try {
      await api.joinRoom(roomId);
      router.push(`/room/${roomId}`);
    } catch (err) {
      console.error("Erro ao entrar na sala:", err);
    }
  }
 
  function saveProfile() {
    if (!profileName.trim()) return;
    localStorage.setItem("porco_username", profileName.trim());
    localStorage.setItem("porco_avatar_color", selectedColor);
    // Recarrega para espalhar o apelido novo nos hubs e conexões
    window.location.reload();
  }
 
  return (
    <div className="min-h-screen mesa-textura p-6 overflow-x-hidden">
      {/* Header */}
      <header className="flex justify-between items-center max-w-6xl mx-auto mb-8 bg-gradient-to-b from-[#0A2B20]/90 to-[#051711]/90 border border-[#C9A227]/25 backdrop-blur-xl px-6 py-4 rounded-2xl shadow-xl">
        <div>
          <h1 className="font-display text-2xl font-black text-[#C9A227] tracking-wider select-none">PORCO</h1>
          <p className="text-[9px] font-body font-black uppercase tracking-widest text-[#FDFBF7]/40 -mt-1">Private Card Club</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedColor }} />
            <span className="text-[#FDFBF7] text-xs font-bold font-body">{username}</span>
          </div>
          <button 
            onClick={logout} 
            className="text-xs bg-[#B91C1C]/15 hover:bg-[#B91C1C]/25 border border-[#B91C1C]/35 text-[#FDFBF7] font-body px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-bold shadow-sm"
          >
            Sair
          </button>
        </div>
      </header>
 
      {/* Layout Grid de Seções */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl mx-auto items-start">
        
        {/* Coluna Esquerda: Personalizar Perfil & Criar Sala */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Seção Perfil */}
          <div className="bg-gradient-to-b from-[#0A2B20]/75 to-[#051711]/75 backdrop-blur-md p-6 rounded-2xl border border-[#C9A227]/15 shadow-xl">
            <h2 className="font-display text-xs font-black text-[#C9A227] tracking-widest uppercase mb-4 select-none">Personalizar Perfil</h2>
            
            <div className="flex items-center gap-4 mb-5">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center font-display font-black text-xl text-[#051711] shadow-md transition-all duration-300 select-none"
                style={{ backgroundColor: selectedColor }}
              >
                {profileName ? profileName.charAt(0).toUpperCase() : "?"}
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  maxLength={15}
                  className="w-full bg-[#051711] border border-[#C9A227]/15 rounded-xl px-3.5 py-2 text-xs text-[#FDFBF7] placeholder:text-[#FDFBF7]/30 focus:outline-none focus:border-[#C9A227] transition-all font-body font-bold"
                  placeholder="Seu apelido..."
                />
              </div>
            </div>
 
            {/* Seletor de Cores */}
            <div className="mb-5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#FDFBF7]/50 block mb-2">Cor do Avatar</span>
              <div className="grid grid-cols-6 gap-2">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setSelectedColor(c.value)}
                    style={{ backgroundColor: c.value }}
                    className={`w-7 h-7 rounded-full transition-all cursor-pointer ${selectedColor === c.value ? "ring-2 ring-offset-2 ring-offset-[#0A2B20] ring-white scale-110 shadow-lg" : "hover:scale-105"}`}
                    aria-label={`Selecionar cor ${c.name}`}
                  />
                ))}
              </div>
            </div>
 
            <button
              onClick={saveProfile}
              className="w-full bg-[#C9A227]/10 hover:bg-[#C9A227]/20 border border-[#C9A227]/30 text-[#C9A227] font-display font-black text-xs py-2.5 rounded-xl transition-all cursor-pointer uppercase tracking-wider"
            >
              Salvar Alterações
            </button>
          </div>
 
          {/* Botão de Criação (Abre Modal) */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full bg-gradient-to-r from-[#D97706] to-[#C9A227] hover:from-[#EAB308] hover:to-[#D97706] text-[#051711] font-display font-black text-sm py-4 rounded-2xl shadow-lg transition-all hover:scale-[1.02] active:scale-98 cursor-pointer tracking-wider text-center"
          >
            NOVA MESA DE JOGO
          </button>
        </div>
 
        {/* Coluna Central: Salas de Jogo */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex justify-between items-center mb-1">
            <h2 className="font-display text-sm font-black text-[#C9A227] tracking-widest uppercase select-none">Mesas Disponíveis</h2>
            <button
              onClick={() => {
                setLoading(true);
                loadRooms();
              }}
              className="px-3 py-1.5 bg-[#C9A227]/10 hover:bg-[#C9A227]/20 border border-[#C9A227]/30 text-[10px] font-display font-black text-[#C9A227] rounded-lg transition-all cursor-pointer hover:scale-[1.02]"
            >
              ATUALIZAR LISTA
            </button>
          </div>
 
          {loading && <p className="text-[#FDFBF7]/50 text-xs italic py-4">Buscando mesas de jogo...</p>}
 
          {!loading && rooms.length === 0 && (
            <p className="text-[#FDFBF7]/40 text-xs italic bg-[#051711]/45 p-6 rounded-2xl border border-[#FDFBF7]/5 text-center shadow-inner">
              Não há mesas ativas no momento. Abra a sua própria mesa!
            </p>
          )}
 
          <div className="flex flex-col gap-3">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="flex justify-between items-center bg-gradient-to-br from-[#0A2B20]/90 to-[#051711]/90 border border-[#C9A227]/15 rounded-2xl px-5 py-4.5 shadow-md hover:border-[#C9A227]/35 transition-all"
              >
                <div>
                  <p className="font-display font-bold text-sm text-[#FDFBF7] tracking-wide">{room.name}</p>
                  <p className="text-[9px] text-[#FDFBF7]/45 font-body font-bold mt-1 uppercase tracking-wider">{room.playerCount} de {room.maxPlayers} Jogadores</p>
                </div>
                <button
                  onClick={() => handleJoinRoom(room.id)}
                  className="text-[10px] bg-[#B91C1C]/15 hover:bg-[#B91C1C]/35 border border-[#B91C1C]/45 text-[#FDFBF7] px-4 py-2 rounded-xl font-body font-black transition-all hover:scale-[1.03] active:scale-95 cursor-pointer shadow-sm tracking-wider"
                >
                  JOGAR
                </button>
              </div>
            ))}
          </div>
        </div>
 
        {/* Coluna Direita: Histórico de Partidas */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <h2 className="font-display text-sm font-black text-[#C9A227] tracking-widest uppercase select-none mb-1">Histórico</h2>
 
          {history.length === 0 ? (
            <p className="text-[#FDFBF7]/40 text-xs italic bg-[#051711]/45 p-6 rounded-2xl border border-[#FDFBF7]/5 text-center shadow-inner select-none">
              Nenhum registro anterior.
            </p>
          ) : (
            <div className="flex flex-col gap-3 max-h-[480px] overflow-y-auto pr-1.5 scrollbar-thin">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-2.5 bg-gradient-to-br from-[#0A2B20]/75 to-[#051711]/75 backdrop-blur border border-[#C9A227]/15 rounded-2xl px-4 py-3.5 shadow-md hover:border-[#C9A227]/25 transition-all select-none"
                >
                  <div className="flex justify-between items-start gap-1">
                    <span className="font-display font-bold text-xs text-[#FDFBF7] tracking-wide truncate max-w-[110px]">{item.roomName}</span>
                    <span className="text-[8px] font-bold font-body text-[#FDFBF7]/35 uppercase tracking-wider shrink-0 mt-0.5">
                      {new Date(item.endedAt).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[8px] uppercase font-bold font-body tracking-wider text-[#FDFBF7]/40">
                    <span>Mesa:</span>
                    <span className="text-[#FDFBF7]/75 font-black">{item.players}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] pt-2 border-t border-[#C9A227]/10 mt-0.5">
                    <span className="text-[8px] uppercase font-bold font-body tracking-wider text-[#FDFBF7]/40">Perdedor:</span>
                    <span className="bg-[#B91C1C]/15 text-[#FF8A8A] font-body font-black text-[9px] px-2 py-0.5 rounded-lg border border-[#B91C1C]/35 uppercase tracking-wider">
                      {item.loserUsername}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
 
      </div>
 
      {/* Modal de Criação de Sala */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#051711]/90 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="bg-gradient-to-b from-[#0A2B20] to-[#051711] border border-[#C9A227]/25 rounded-3xl w-full max-w-md shadow-2xl p-6 relative overflow-hidden flex flex-col gap-6"
            >
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#C9A227] to-transparent" />
              
              <div>
                <h3 className="font-display font-black text-[#C9A227] text-lg tracking-wide uppercase">Nova Mesa de Jogo</h3>
                <p className="text-[10px] font-body font-medium text-[#FDFBF7]/40 mt-1 uppercase tracking-wider">Defina as configurações da sua partida</p>
              </div>
 
              <form onSubmit={handleCreateRoom} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-[#C9A227] pl-1">Nome da Mesa</label>
                  <input
                    type="text"
                    placeholder="Ex: Mesa dos Campeões"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    maxLength={30}
                    className="w-full bg-[#051711] border border-[#C9A227]/15 rounded-xl px-4 py-2.5 text-xs text-[#FDFBF7] placeholder:text-[#FDFBF7]/30 focus:outline-none focus:border-[#C9A227] transition-all font-body font-bold"
                    required
                  />
                </div>
 
                {/* Limite de Jogadores - Segmento customizado e fluido */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-[#C9A227] pl-1">Limite de Jogadores</label>
                  <div className="flex gap-1.5 bg-[#051711] p-1 rounded-xl border border-[#C9A227]/15">
                    {[2, 3, 4, 5, 6, 7, 8].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setMaxPlayers(num)}
                        className={`flex-1 py-2 rounded-lg text-xs font-display font-black transition-all cursor-pointer ${maxPlayers === num ? "bg-[#C9A227] text-[#051711] font-black shadow-md scale-105" : "text-[#FDFBF7]/60 hover:text-[#FDFBF7]"}`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
 
                <div className="flex gap-3 border-t border-[#C9A227]/10 pt-4 mt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="flex-1 py-3 bg-[#B91C1C]/10 hover:bg-[#B91C1C]/20 border border-[#B91C1C]/35 text-[#FDFBF7] font-body text-xs rounded-xl transition-all cursor-pointer font-bold"
                  >
                    CANCELAR
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-[#D97706] to-[#C9A227] hover:from-[#EAB308] hover:to-[#D97706] text-[#051711] font-display font-black text-xs rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-98 cursor-pointer"
                  >
                    ABRIR MESA
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
 
    </div>
  );
}