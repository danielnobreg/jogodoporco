"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSignalR } from "@/hooks/useSignalR";
import { useAuth } from "@/hooks/useAuth";
import { api, API_URL } from "@/lib/api";
import { CardComponent } from "@/components/CardComponent";
import { LetterTracker } from "@/components/LetterTracker";
import { SlapButton } from "@/components/SlapButton";
import { ChatBox } from "@/components/ChatBox";
import { RoomQrCode } from "@/components/RoomQrCode";
import { RulesModal } from "@/components/RulesModal";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { ReactionPill } from "@/components/ReactionPill";
import type { GameStateUpdate, RoundCompletedEvent, Room, Card, SlapInfo } from "@/lib/types";
import sound from "@/lib/sound";

function getUserIdFromToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("porco_token");
  if (!token) return null;
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const parsed = JSON.parse(jsonPayload);
    return (
      parsed.nameid ||
      parsed.sub ||
      parsed["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ||
      null
    );
  } catch (err) {
    console.error("Erro ao decodificar token JWT:", err);
    return null;
  }
}

const CARD_VALUES_MAP: Record<string, number> = {
  "A": 1, "2": 2, "3": 3, "4": 4, "5": 5,
  "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
  "J": 11, "Q": 12, "K": 13
};

function isTrioValido(c1: Card, c2: Card, c3: Card): boolean {
  if (c1.value === "Coringa" || c2.value === "Coringa" || c3.value === "Coringa") return false;
  // Tipo A: Mesmo valor
  if (c1.value === c2.value && c2.value === c3.value) return true;

  // Tipo B: Sequência crescente do mesmo naipe
  if (c1.suit === c2.suit && c2.suit === c3.suit) {
    const v1 = CARD_VALUES_MAP[c1.value];
    const v2 = CARD_VALUES_MAP[c2.value];
    const v3 = CARD_VALUES_MAP[c3.value];
    if (v1 && v2 && v3) {
      const list = [v1, v2, v3].sort((a, b) => a - b);
      if (list[1] === list[0] + 1 && list[2] === list[1] + 1) return true;
    }
  }
  return false;
}

function encontrarTodosOsTrios(hand: Card[]): Card[][] {
  let bestTrios: Card[][] = [];

  function solve(remaining: Card[], current: Card[][]) {
    if (current.length > bestTrios.length) {
      bestTrios = current.map(t => [...t]);
    }
    if (remaining.length < 3) return;

    for (let i = 0; i < remaining.length; i++) {
      for (let j = i + 1; j < remaining.length; j++) {
        for (let k = j + 1; k < remaining.length; k++) {
          const c1 = remaining[i];
          const c2 = remaining[j];
          const c3 = remaining[k];

          if (isTrioValido(c1, c2, c3)) {
            const nextRemaining = remaining.filter((_, idx) => idx !== i && idx !== j && idx !== k);
            solve(nextRemaining, [...current, [c1, c2, c3]]);
          }
        }
      }
    }
  }

  solve(hand, []);
  return bestTrios;
}

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const { username } = useAuth();
  const { connected, connection, on, sendChatMessage } = useSignalR(roomId);

  const [room, setRoom] = useState<Room | null>(null);
  const [phase, setPhase] = useState<GameStateUpdate["phase"]>("Playing");
  const [handSize, setHandSize] = useState(4);
  const [hand, setHand] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [forbiddenCard, setForbiddenCard] = useState<Card | null>(null);
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string | null>(null);
  const [letters, setLetters] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("Aguardando jogadores...");
  const [gameOver, setGameOver] = useState(false);
  const [lastRoundLoserId, setLastRoundLoserId] = useState<string | null>(null);
  const [lastPassedCard, setLastPassedCard] = useState<Card | null>(null);
  const [lastDrawnCard, setLastDrawnCard] = useState<Card | null>(null);
  const [drawPileCount, setDrawPileCount] = useState(0);
  const [isDraggingOverPile, setIsDraggingOverPile] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [bubbles, setBubbles] = useState<Record<string, string>>({});
  const [avatarReactions, setAvatarReactions] = useState<Record<string, Array<{ id: string; emoji: string }>>>({});
  const [slapOrder, setSlapOrder] = useState<SlapInfo[]>([]);

  const showBubble = useCallback((playerId: string, text: string) => {
    if (!playerId) return;
    const lowerId = playerId.toLowerCase();
    setBubbles(prev => ({ ...prev, [lowerId]: text }));
    setTimeout(() => {
      setBubbles(prev => {
        const next = { ...prev };
        if (next[lowerId] === text) {
          delete next[lowerId];
        }
        return next;
      });
    }, 4000);
  }, []);

  const myId = useMemo(() => {
    const tokenId = getUserIdFromToken()?.toLowerCase();
    if (tokenId) return tokenId;

    if (!room?.players || !username) return null;
    const me = room.players.find(p => p.username.toLowerCase() === username.toLowerCase());
    return me ? me.id.toLowerCase() : null;
  }, [room?.players, username]);

  const isMyTurn = currentTurnPlayerId?.toLowerCase() === myId;

  const isHost = useMemo(() => {
    if (!room?.players || !username) return false;
    return room.players[0]?.username?.toLowerCase() === username.toLowerCase();
  }, [room?.players, username]);

  // Não ocultamos mais a carta comprada, o jogador sempre vê suas cartas ao comprar!

  const trios = useMemo(() => encontrarTodosOsTrios(hand), [hand]);
  const triosCards = useMemo(() => trios.flat(), [trios]);
  
  const prevTriosLengthRef = useRef(0);

  useEffect(() => {
    if (trios.length > prevTriosLengthRef.current) {
      sound.playFreeze();
    }
    prevTriosLengthRef.current = trios.length;
  }, [trios.length]);

  const isCardFrozen = useCallback((card: Card) => {
    return triosCards.some(tc => tc.suit === card.suit && tc.value === card.value);
  }, [triosCards]);

  const isCardForbidden = useCallback((card: Card) => {
    return !!forbiddenCard && forbiddenCard.suit === card.suit && forbiddenCard.value === card.value;
  }, [forbiddenCard]);

  const sortedHand = useMemo(() => {
    const tCards = trios.flat();
    const remainingCards = hand.filter(c => 
      !tCards.some(tc => tc.suit === c.suit && tc.value === c.value)
    );
    return [...tCards, ...remainingCards];
  }, [hand, trios]);

  const hasQuadra = useMemo(() => {
    return trios.length >= 3; // a vitória é com 3 trios formados
  }, [trios]);

  const hasAlreadySlapped = useMemo(() => {
    if (!myId || !slapOrder) return false;
    return slapOrder.some(s => s.playerId.toLowerCase() === myId.toLowerCase());
  }, [myId, slapOrder]);

  const canSlap = phase === "Slapping" || (phase === "Playing" && hasQuadra);

  const isSelectedCardForbidden = selectedCard ? isCardForbidden(selectedCard) : false;

  const getUsernameById = useCallback((id: string) => {
    const p = room?.players?.find(pl => pl.id.toLowerCase() === id.toLowerCase());
    return p ? p.username : id.slice(0, 8);
  }, [room]);

  const [roomError, setRoomError] = useState("");

  useEffect(() => {
    if (!roomId) return;
    api.getRoom(roomId)
      .then(data => {
        setRoom(data);
        setRoomError("");
        if (data.players) {
          const init: Record<string, string> = {};
          data.players.forEach(p => {
            init[p.id.toLowerCase()] = p.letters || "";
          });
          setLetters(init);
        }
      })
      .catch(err => {
        console.error("Erro ao carregar detalhes da sala:", err);
        setRoomError(err instanceof Error ? err.message : "Sala não encontrada");
      });
  }, [roomId]);

  useEffect(() => {
    const offJoined = on("PlayerJoined", (data: { username: string }) => {
      setMessage(`${data.username} entrou na sala`);
      if (roomId) {
        api.getRoom(roomId)
          .then(res => {
            setRoom(res);
            setLetters(prev => {
              const updated = { ...prev };
              res.players.forEach(p => {
                const key = p.id.toLowerCase();
                if (updated[key] === undefined) {
                  updated[key] = p.letters || "";
                }
              });
              return updated;
            });
          })
          .catch(err => console.error(err));
      }
    });
 
    const offLeft = on("PlayerLeft", (data: { username: string, message?: string }) => {
      setMessage(data.message || `${data.username} saiu da sala`);
      if (roomId) {
        api.getRoom(roomId)
          .then(res => {
            setRoom(res);
            setLetters(prev => {
              const updated: Record<string, string> = {};
              res.players.forEach(p => {
                const key = p.id.toLowerCase();
                updated[key] = p.letters || prev[key] || "";
              });
              return updated;
            });
          })
          .catch(err => console.error(err));
      }
    });
 
    const offLeftAlone = on("LastPlayerLeftAlone", (data: { hostId: string, message: string }) => {
      setMessage(data.message);
      setIsAloneModalOpen(true);
      setHand([]);
      setDrawPileCount(0);
      setLastPassedCard(null);
      setSelectedCard(null);
      setRoom(prev => prev ? { ...prev, status: "Lobby" } : null);
    });
 
    const offRoomUpdated = on("RoomUpdated", (data: { hostId: string, players: any[], playerCount: number }) => {
      setRoom(prev => prev ? {
        ...prev,
        playerCount: data.playerCount,
        players: data.players
      } : null);
      setLetters(prev => {
        const updated: Record<string, string> = {};
        data.players.forEach(p => {
          const key = p.id.toLowerCase();
          updated[key] = p.letters || prev[key] || "";
        });
        return updated;
      });
    });
 
    const offReady = on("GameReady", (data: { message: string }) => {
      setMessage(data.message);
    });
 
    const offState = on("GameStateUpdated", (data: GameStateUpdate) => {
      setPhase(data.phase);
      setRoom(prev => prev ? { ...prev, status: data.phase === "GameOver" ? "Finished" : "Playing" } : null);
      setCurrentTurnPlayerId(data.currentTurnPlayerId);
      if (data.slapOrder) setSlapOrder(data.slapOrder);
      else setSlapOrder([]);
      if (data.lastRoundLoserId) {
        setLastRoundLoserId(data.lastRoundLoserId);
      }
      if (data.drawPileCount !== undefined) {
        setDrawPileCount(data.drawPileCount);
      }
      if (data.discardPileTop !== undefined) {
        setLastPassedCard(data.discardPileTop);
      }
 
      const myId = getUserIdFromToken();
      if (myId && data.handSizes && data.handSizes[myId] !== undefined) {
        setHandSize(data.handSizes[myId]);
      }
    });
 
    const offHand = on("PlayerHandUpdated", (data: { cards: Card[], forbiddenCard?: Card | null }) => {
      setHand(prev => {
        if (data.cards.length > prev.length) {
          const newCard = data.cards.find(c => !prev.some(pc => pc.suit === c.suit && pc.value === c.value));
          if (newCard) setLastDrawnCard(newCard);
        }
        return data.cards;
      });
      setForbiddenCard(data.forbiddenCard || null);
    });

    const offSlapped = on("PlayerSlapped", () => {
      sound.playSlap();
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
      }, 350);
    });

    const offRound = on("RoundCompleted", (data: RoundCompletedEvent) => {
      const normalized: Record<string, string> = {};
      if (data.playerLetters) {
        Object.entries(data.playerLetters).forEach(([k, v]) => {
          normalized[k.toLowerCase()] = v;
        });
      }
      setLetters(normalized);
      setGameOver(data.gameOver);
      setLastRoundLoserId(data.loserPlayerId);
      setLastPassedCard(null);
      setDrawPileCount(0);
      setMessage(data.gameOver ? "Fim de jogo!" : "Rodada encerrada!");
      if (data.gameOver) {
        setRoom(prev => prev ? { ...prev, status: "Finished" } : null);
        const currentUserId = getUserIdFromToken() || myId;
        const isLoser = currentUserId
          ? (data.loserPlayerId?.toLowerCase() === currentUserId.toLowerCase() ||
             data.playerLetters?.[currentUserId]?.toUpperCase() === "PORCO")
          : false;
        if (isLoser) {
          sound.playDefeat();
        } else {
          sound.playVictory();
        }
      } else {
        sound.playFreeze();
      }
    });

    const offChat = on("ChatMessageReceived", (data: { playerId?: string; message: string }) => {
      if (data.playerId) {
        showBubble(data.playerId, data.message);
      }
    });

    const offReaction = on("ReactionReceived", (data: { playerId?: string; emoji: string }) => {
      if (!data?.playerId) return;
      const pid = data.playerId.toLowerCase();
      const reactionId = `${Date.now()}-${Math.random().toString()}`;
      setAvatarReactions((prev) => ({
        ...prev,
        [pid]: [...(prev[pid] || []), { id: reactionId, emoji: data.emoji }]
      }));
    });

    return () => {
      offJoined?.();
      offLeft?.();
      offLeftAlone?.();
      offRoomUpdated?.();
      offReady?.();
      offState?.();
      offHand?.();
      offSlapped?.();
      offRound?.();
      offChat?.();
      offReaction?.();
    };
  }, [on, roomId, myId, showBubble]);

  const handleSlap = useCallback(async () => {
    sound.playSlap();
    await api.slap();
  }, []);

  const handleDrawCard = useCallback(async (source: "deck" | "pile") => {
    try {
      sound.playDraw();
      await api.draw(source);
    } catch (err) {
      console.error("Erro ao comprar carta:", err);
    }
  }, []);

  const handleSelectCard = useCallback((card: Card) => {
    setSelectedCard(card);
  }, []);
 
  const handlePassCard = useCallback(async () => {
    if (!selectedCard) return;
    try {
      sound.playPass();
      await api.passCard("00000000-0000-0000-0000-000000000000", selectedCard.suit, selectedCard.value);
      setSelectedCard(null);
    } catch (err) {
      console.error("Erro ao passar carta:", err);
    }
  }, [selectedCard]);
 
  const handleDragPassCard = useCallback(async (card: Card) => {
    try {
      sound.playPass();
      await api.passCard("00000000-0000-0000-0000-000000000000", card.suit, card.value);
      if (selectedCard?.suit === card.suit && selectedCard?.value === card.value) {
        setSelectedCard(null);
      }
    } catch (err) {
      console.error("Erro ao passar carta arrastada:", err);
    }
  }, [selectedCard]);

  const handleLeave = useCallback(async () => {
    try {
      await fetch(`${API_URL}/rooms/${roomId}/leave`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("porco_token")}`
        }
      });
    } catch (err) {
      console.error("Erro ao sair da sala:", err);
    } finally {
      router.push("/");
    }
  }, [roomId, router]);

  const handleStart = useCallback(async () => {
    try {
      await api.startRoom(roomId);
      setMessage("Partida iniciada!");
    } catch (err) {
      console.error("Erro ao iniciar partida:", err);
      setMessage(err instanceof Error ? err.message : "Erro ao iniciar partida");
    }
  }, [roomId]);

  const handleToggleVisibility = useCallback(async (isPrivate: boolean) => {
    try {
      const res = await fetch(`${API_URL}/rooms/${roomId}/visibility`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("porco_token")}`
        },
        body: JSON.stringify(isPrivate)
      });
      if (res.ok) {
        setRoom(prev => prev ? { ...prev, isPrivate } : null);
      }
    } catch (err) {
      console.error("Erro ao mudar visibilidade:", err);
    }
  }, [roomId]);
 
  // Estados para as Regras
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isAloneModalOpen, setIsAloneModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
 
  // Estados para os Timers
  const [matchSeconds, setMatchSeconds] = useState(0);
  const [roundSeconds, setRoundSeconds] = useState(0);
  const [lastRoundDuration, setLastRoundDuration] = useState<number | null>(null);
 
  // Estado para o Tempo do Turno (Auto-Play)
  const [turnTimeLeft, setTurnTimeLeft] = useState(20);
  const isAutoPlayingRef = useRef(false);
 
  // Reseta a trava do auto-play quando o turno muda
  useEffect(() => {
    if (!isMyTurn) {
      isAutoPlayingRef.current = false;
    }
  }, [isMyTurn]);
 
  const formatTime = useCallback((totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);
 
  // Timer de Partida e Rodada
  useEffect(() => {
    if (room?.status !== "Playing" || phase !== "Playing") return;
 
    const timer = setInterval(() => {
      setMatchSeconds(prev => prev + 1);
      setRoundSeconds(prev => prev + 1);
    }, 1000);
 
    return () => clearInterval(timer);
  }, [room?.status, phase]);
 
  // Registra tempo da rodada ao encerrar
  useEffect(() => {
    if (phase === "RoundOver" || phase === "GameOver") {
      setLastRoundDuration(roundSeconds);
    } else if (phase === "Playing") {
      setRoundSeconds(0);
    }
  }, [phase]);
 
  // Função para executar auto-play no timeout do turno
  const triggerAutoPlay = useCallback(async () => {
    if (hand.length === 9) {
      console.log("Auto-Play: Comprando do monte por timeout...");
      await handleDrawCard("deck");
    } else if (hand.length === 10) {
      const tCards = trios.flat();
      const playableCards = hand.filter(c => 
        !tCards.some(tc => tc.suit === c.suit && tc.value === c.value)
      );
 
      if (playableCards.length > 0) {
        const randomCard = playableCards[Math.floor(Math.random() * playableCards.length)];
        console.log("Auto-Play: Passando carta aleatória por timeout:", randomCard);
        try {
          await api.passCard("00000000-0000-0000-0000-000000000000", randomCard.suit, randomCard.value);
          setSelectedCard(null);
        } catch (err) {
          console.error("Erro no auto-play ao passar carta:", err);
        }
      }
    }
  }, [hand, trios, handleDrawCard]);
 
  // Estado para a Pilha de Descarte Acumulada (Pilha Real)
  const [discardHistory, setDiscardHistory] = useState<Card[]>([]);

  // Atualiza histórico da pilha de descarte
  useEffect(() => {
    if (lastPassedCard) {
      setDiscardHistory(prev => {
        const top = prev[prev.length - 1];
        if (top && top.suit === lastPassedCard.suit && top.value === lastPassedCard.value) {
          return prev;
        }
        return [...prev.slice(-4), lastPassedCard];
      });
    } else {
      setDiscardHistory([]);
    }
  }, [lastPassedCard]);

  // Handlers para Bots
  const handleAddBot = useCallback(async () => {
    try {
      await api.addBot(roomId);
    } catch (err: any) {
      console.error("Erro ao adicionar bot:", err);
      setMessage(err.message || "Erro ao adicionar bot");
    }
  }, [roomId]);

  const handleRemoveBot = useCallback(async (botId: string) => {
    try {
      await api.removeBot(roomId, botId);
    } catch (err: any) {
      console.error("Erro ao remover bot:", err);
    }
  }, [roomId]);

  // Reseta o tempo do turno quando o jogador ativo muda
  useEffect(() => {
    setTurnTimeLeft(20);
    isAutoPlayingRef.current = false;
  }, [currentTurnPlayerId]);

  // Timer de Turno (Auto-Play + Visual Countdown para todos)
  useEffect(() => {
    if (room?.status !== "Playing" || phase !== "Playing") {
      setTurnTimeLeft(20);
      return;
    }

    const interval = setInterval(() => {
      setTurnTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (isMyTurn && !isAutoPlayingRef.current) {
            isAutoPlayingRef.current = true;
            triggerAutoPlay();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [room?.status, phase, isMyTurn, triggerAutoPlay]);
 
  const renderFloatingReactions = (playerId: string) => {
    const reactions = avatarReactions[playerId.toLowerCase()] || [];
    return (
      <div className="absolute inset-x-0 bottom-full mb-12 pointer-events-none z-30 flex items-center justify-center h-0">
        <AnimatePresence>
          {reactions.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, scale: 0.3, y: 0, x: 0 }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: [0.3, 1.2, 1, 0.8],
                y: -120,
                x: [0, -12, 12, -6, 0]
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.8, ease: "easeOut" }}
              onAnimationComplete={() => {
                setAvatarReactions((prev) => ({
                  ...prev,
                  [playerId.toLowerCase()]: (prev[playerId.toLowerCase()] || []).filter((x) => x.id !== r.id)
                }));
              }}
              className="absolute text-3xl filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] font-display"
            >
              {r.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  };

  if (roomError) {
    return (
      <div className="min-h-screen flex items-center justify-center mesa-textura p-6">
        <div className="w-full max-w-md bg-gradient-to-b from-[#0A2B20] to-[#051711] border border-[#B91C1C]/40 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-center flex flex-col gap-6 items-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#B91C1C] to-transparent" />
          <span className="text-5xl select-none filter drop-shadow-[0_2px_8px_rgba(185,28,28,0.4)]">🏚️</span>
          <h1 className="font-display text-2xl font-black text-[#FDFBF7] tracking-wide">Conexão Perdida</h1>
          <p className="font-body text-[#FDFBF7]/60 text-sm leading-relaxed px-2">
            {roomError === "Falha na requisição" || roomError === "Failed to fetch"
              ? "Não foi possível conectar ao servidor. Verifique se a API está rodando localmente."
              : "Esta sala não foi encontrada. Ela pode ter sido encerrada por inatividade."}
          </p>
          <button
            onClick={() => router.push("/")}
            className="w-full bg-gradient-to-r from-[#D97706] to-[#C9A227] hover:from-[#EAB308] hover:to-[#D97706] text-[#051711] font-display font-black py-3.5 rounded-xl shadow-lg hover:scale-[1.02] active:scale-98 transition-all cursor-pointer text-sm"
          >
            Voltar ao Lobby principal
          </button>
        </div>
      </div>
    );
  }
 
  return (
    <div className={`min-h-screen mesa-textura flex flex-col items-center justify-between p-3 md:p-6 overflow-x-hidden ${isShaking ? "animate-shake" : ""} ${phase === "Slapping" ? "animate-infinite-shake" : ""}`}>
      {/* Header */}
      <div className="w-full max-w-5xl flex flex-col md:flex-row justify-between items-start md:items-center bg-gradient-to-b from-[#0A2B20]/90 to-[#051711]/90 border border-[#C9A227]/25 backdrop-blur-xl p-5 rounded-2xl mb-6 shadow-[0_15px_30px_rgba(0,0,0,0.3)] gap-4 transition-all">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-black text-[#C9A227] tracking-wide select-none">{room?.name || "Carregando..."}</h1>
          </div>
          <div className="flex gap-4 mt-2 text-[11px] text-[#FDFBF7]/60 font-body font-medium">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#C9A227]" /> Status: {room?.status === "Lobby" ? "Lobby" : room?.status === "Playing" ? "Em Jogo" : "Finalizada"}</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#C9A227]" /> Jogadores: {room?.playerCount || 0}/{room?.maxPlayers || 8}</span>
            {room?.status === "Playing" && (
              <span className="text-[#C9A227] font-bold flex items-center gap-1">Tempo: {formatTime(matchSeconds)}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-[#FDFBF7]/10 pt-3 md:pt-0">
          <span className={`text-[10px] uppercase font-body font-black tracking-widest px-3 py-1.5 rounded-full border ${connected ? "bg-[#0A2B20] text-[#C9A227] border-[#C9A227]/25" : "bg-[#B91C1C]/15 text-[#B91C1C] border-[#B91C1C]/35 animate-pulse"}`}>
            {connected ? "● Conectado" : "○ Conectando..."}
          </span>
        </div>
      </div>
 
      <p className="font-body text-[#FDFBF7]/60 text-xs tracking-wide bg-[#051711]/40 border border-[#FDFBF7]/5 px-4 py-1.5 rounded-full mb-4 shadow-sm select-none">{message}</p>
 
      {/* placar */}
      <div className="flex gap-2 md:gap-6 flex-wrap justify-center my-3 md:my-6">
        {Object.entries(letters).length === 0 ? (
          <div className="relative">
            {myId && renderFloatingReactions(myId)}
            <AnimatePresence>
              {myId && bubbles[myId] && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -10 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-30 min-w-[120px] max-w-[200px] bg-[#0A2B20]/90 backdrop-blur-md border border-[#C9A227]/40 px-3 py-2 rounded-2xl shadow-xl text-center pointer-events-none"
                >
                  <p className="font-body text-xs text-[#FDFBF7] font-medium break-words leading-tight">
                    {bubbles[myId]}
                  </p>
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#0A2B20]/90 border-r border-b border-[#C9A227]/40 rotate-45" />
                </motion.div>
              )}
            </AnimatePresence>
            <LetterTracker 
              username={username || "Você"} 
              letters="" 
              isCurrentUser 
              isActive={currentTurnPlayerId?.toLowerCase() === myId}
              turnTimeLeft={turnTimeLeft}
            />
          </div>
        ) : (
          Object.entries(letters).map(([playerId, playerLetters]) => {
            const playerIdClean = playerId.toLowerCase();
            const bubbleText = bubbles[playerIdClean];
            return (
              <div key={playerId} className="relative">
                {renderFloatingReactions(playerId)}
                <AnimatePresence>
                  {bubbleText && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: -10 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-30 min-w-[120px] max-w-[200px] bg-[#0A2B20]/90 backdrop-blur-md border border-[#C9A227]/40 px-3 py-2 rounded-2xl shadow-xl text-center pointer-events-none"
                    >
                      <p className="font-body text-xs text-[#FDFBF7] font-medium break-words leading-tight">
                        {bubbleText}
                      </p>
                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#0A2B20]/90 border-r border-b border-[#C9A227]/40 rotate-45" />
                    </motion.div>
                  )}
                </AnimatePresence>
                <LetterTracker
                  username={getUsernameById(playerId)}
                  letters={playerLetters}
                  isCurrentUser={playerIdClean === myId}
                  isActive={playerIdClean === currentTurnPlayerId?.toLowerCase()}
                  turnTimeLeft={turnTimeLeft}
                />
              </div>
            );
          })
        )}
      </div>
 
      {/* mesa central */}
      <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-8 w-full max-w-5xl">
        <div className="flex-1 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {gameOver ? (
              <motion.div
                key="gameover"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center bg-[#0A2B20]/90 backdrop-blur border border-[#C9A227]/20 p-6 rounded-2xl shadow-2xl max-w-sm mx-auto flex flex-col items-center gap-4 relative overflow-hidden"
              >
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#C9A227] to-transparent" />
                <span className="text-5xl text-[#C9A227] animate-bounce select-none">★</span>
                <h2 className="font-display text-2xl font-black text-[#C9A227] tracking-wider uppercase">FIM DE JOGO</h2>
                <p className="text-[#FDFBF7]/60 text-xs">A partida foi finalizada!</p>
 
                {/* Placar de Letras Final */}
                <div className="w-full bg-[#051711] p-4 rounded-xl border border-[#C9A227]/10 flex flex-col gap-2 text-left">
                  <h3 className="font-display font-black text-[10px] tracking-widest text-[#C9A227] border-b border-[#C9A227]/10 pb-1 uppercase">PLACAR FINAL</h3>
                  {Object.entries(letters).map(([pId, pLetters]) => {
                    const isLoser = pLetters.toUpperCase() === "PORCO";
                    return (
                      <div key={pId} className="flex justify-between font-body text-xs text-[#FDFBF7]/80">
                        <span>{getUsernameById(pId)} {pId.toLowerCase() === myId ? "(Você)" : ""}</span>
                        <span className={`font-black tracking-widest px-2 py-0.5 rounded text-[10px] ${isLoser ? "bg-[#B91C1C]/15 text-[#FF8A8A] border border-[#B91C1C]/35 animate-pulse" : "text-[#C9A227]"}`}>
                          {pLetters || "Nenhuma"}
                        </span>
                      </div>
                    );
                  })}
                </div>
 
                {/* Compartilhamento */}
                <div className="w-full border-t border-[#C9A227]/10 pt-4 space-y-2">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-[#FDFBF7]/40 font-body">Compartilhar resultado:</p>
                  <div className="flex gap-2 justify-center w-full">
                    <button
                      onClick={() => {
                        const scoreboardText = Object.entries(letters)
                          .map(([pId, pLetters], idx) => `${idx + 1}. ${getUsernameById(pId)} [${pLetters || "Nenhuma"}]`)
                          .join("\n");
                        const shareMsg = `Jogo do Porco\nPartida encerrada!\n\nPlacar Final:\n${scoreboardText}\n\nJogue agora: ${window.location.origin}`;
                        navigator.clipboard.writeText(shareMsg);
                        alert("Resultado da partida copiado para a área de transferência!");
                      }}
                      className="flex-1 py-2 bg-[#C9A227]/10 hover:bg-[#C9A227]/25 border border-[#C9A227]/30 text-[10px] font-display font-black text-[#C9A227] rounded-lg transition-all cursor-pointer uppercase tracking-wider"
                    >
                      Copiar Link
                    </button>
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                        `Jogo do Porco\nPartida encerrada!\n\nPlacar Final:\n` +
                        Object.entries(letters)
                          .map(([pId, pLetters], idx) => `${idx + 1}. ${getUsernameById(pId)} [${pLetters || "Nenhuma"}]`)
                          .join("\n") +
                        `\n\nJogue agora: ${window.location.origin}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 bg-green-600/10 hover:bg-green-600/25 border border-green-500/30 text-[10px] font-display font-black text-green-400 rounded-lg transition-all text-center flex items-center justify-center uppercase tracking-wider"
                    >
                      WhatsApp
                    </a>
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                        `Jogo do Porco\nPartida encerrada!\n\nPlacar Final:\n` +
                        Object.entries(letters)
                          .map(([pId, pLetters], idx) => `${idx + 1}. ${getUsernameById(pId)} [${pLetters || "Nenhuma"}]`)
                          .join("\n") +
                        `\n\nJogue agora: ${window.location.origin}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 bg-sky-500/10 hover:bg-sky-500/25 border border-sky-500/30 text-[10px] font-display font-black text-sky-400 rounded-lg transition-all text-center flex items-center justify-center uppercase tracking-wider"
                    >
                      Twitter/X
                    </a>
                  </div>
 
                  <button
                    onClick={() => router.push("/")}
                    className="w-full mt-2 py-3 bg-gradient-to-r from-[#D97706] to-[#C9A227] text-[#051711] font-display font-black text-xs rounded-xl hover:scale-[1.02] active:scale-98 transition-all cursor-pointer uppercase tracking-wider"
                  >
                    Voltar ao Lobby
                  </button>
                </div>
              </motion.div>
            ) : room?.status === "Lobby" ? (
              <motion.div key="lobby-waiting" className="text-center flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#C9A227]/40 flex items-center justify-center text-xs font-display font-black text-[#C9A227] animate-spin select-none">
                  PORCO
                </div>
                <p className="font-display text-sm uppercase tracking-wider text-[#FDFBF7]/50">
                  {isHost 
                    ? "Aguarde jogadores ou inicie a partida." 
                    : "Aguardando o host iniciar a partida..."}
                </p>
              </motion.div>
            ) : (
              <motion.div key="mesa" className="flex flex-col items-center gap-6 text-center">
                {/* Pilha Central de Cartas (Casino Style) */}
                <div className="relative flex justify-center items-center h-36 w-full max-w-xs mb-4 select-none gap-6 md:gap-10">
                  {/* Pilha de Compra (Draw Pile / Monte de Compra) */}
                  <div className="relative w-14 h-24 md:w-20 md:h-32">
                    {drawPileCount > 0 ? (
                      <motion.div
                        drag={isMyTurn && hand.length === 9 ? true : false}
                        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                        dragElastic={0.8}
                        dragSnapToOrigin={true}
                        onDragEnd={(e, info) => {
                          if (isMyTurn && hand.length === 9) {
                            const dist = Math.sqrt(info.offset.x * info.offset.x + info.offset.y * info.offset.y);
                            if (dist > 35) {
                              handleDrawCard("deck");
                            }
                          }
                        }}
                        onClick={() => isMyTurn && hand.length === 9 && handleDrawCard("deck")}
                        className={`relative w-full h-full ${isMyTurn && hand.length === 9 ? "cursor-grab active:cursor-grabbing hover:scale-105" : ""} transition-transform select-none`}
                        aria-label="Monte de compra"
                      >
                        {/* Cartas de Fundo da Pilha */}
                        {drawPileCount > 2 && (
                          <div className="absolute inset-0 transform -rotate-6 -translate-x-1 -translate-y-1 opacity-40 pointer-events-none">
                            <CardComponent card={{ suit: "Especial", value: "?" }} faceDown />
                          </div>
                        )}
                        {drawPileCount > 1 && (
                          <div className="absolute inset-0 transform -rotate-3 -translate-x-0.5 -translate-y-0.5 opacity-70 pointer-events-none">
                            <CardComponent card={{ suit: "Especial", value: "?" }} faceDown />
                          </div>
                        )}
                        {/* Carta do Topo */}
                        <div className="relative w-full h-full z-10">
                          <CardComponent card={{ suit: "Especial", value: "?" }} faceDown />
                          <span className="absolute -bottom-1.5 -right-1.5 bg-[#B91C1C] border border-[#FDFBF7]/20 text-[#FDFBF7] text-[10px] md:text-xs font-display font-black px-2 py-0.5 rounded-full shadow-lg z-20 pointer-events-none">
                            {drawPileCount}
                          </span>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="w-full h-full rounded-xl border border-dashed border-[#FDFBF7]/10 flex items-center justify-center text-[10px] uppercase font-bold tracking-widest text-[#FDFBF7]/30">
                        Vazio
                      </div>
                    )}
                  </div>

                  {/* Pilha de Descarte (Discard Pile Stack Realista) */}
                  <div
                    className={`relative w-14 h-24 md:w-20 md:h-32 rounded-xl transition-all duration-300 ${isDraggingOverPile ? "ring-2 ring-[#C9A227] scale-110 bg-[#C9A227]/10 shadow-[0_0_20px_rgba(201,162,39,0.5)]" : ""}`}
                  >
                    {discardHistory.length > 0 ? (
                      <div
                        className={`relative w-full h-full ${isMyTurn && hand.length === 9 ? "cursor-pointer hover:scale-105 active:scale-95 transition-transform" : ""}`}
                        onClick={() => isMyTurn && hand.length === 9 && handleDrawCard("pile")}
                        aria-label="Pilha de descarte"
                      >
                        {/* Cartas Inferiores Empilhadas no Fundo */}
                        {discardHistory.slice(0, discardHistory.length - 1).map((c, idx) => {
                          const rots = [-6, 4, -3, 5];
                          const rot = rots[idx % rots.length];
                          return (
                            <div
                              key={`discard-bg-${c.suit}-${c.value}-${idx}`}
                              className="absolute inset-0 pointer-events-none"
                              style={{ transform: `rotate(${rot}deg) translate(${idx * 2}px, ${idx * 1.5}px)`, opacity: 0.6 + idx * 0.1 }}
                            >
                              <CardComponent card={c} faceDown={false} />
                            </div>
                          );
                        })}

                        {/* Carta do Topo Animada */}
                        {(() => {
                          const topCard = discardHistory[discardHistory.length - 1];
                          return (
                            <motion.div
                              key={`discard-top-${topCard.value}-${topCard.suit}`}
                              initial={{ scale: 0.6, y: 150, opacity: 0, rotate: 12 }}
                              animate={{ scale: 1, y: 0, opacity: 1, rotate: 0 }}
                              transition={{ type: "spring", stiffness: 140, damping: 18 }}
                              className="absolute inset-0 z-10"
                            >
                              <CardComponent card={topCard} faceDown={false} />
                            </motion.div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="w-full h-full rounded-xl border border-dashed border-[#C9A227]/25 flex items-center justify-center text-[10px] uppercase font-bold tracking-widest text-[#FDFBF7]/30">
                        Vazio
                      </div>
                    )}
                  </div>
                </div>

                {/* Mensagem de Turno */}
                <div className="flex flex-col items-center gap-2">
                  <p className="font-display text-xl text-[#F4E9D8]/60 max-w-md">
                    {phase === "Slapping"
                      ? (hasAlreadySlapped
                        ? "Você já bateu na mesa! Aguardando os outros..."
                        : "🎉 3 Trios Formados! BATA NA MESA RÁPIDO!")
                      : isMyTurn
                      ? (hand.length === 9
                        ? "Seu turno! Compre do monte (deck) ou da pilha de descarte."
                        : "Sua vez! Escolha uma carta e clique em Passar.")
                      : "Aguardando jogada do oponente..."}
                  </p>
                  {isMyTurn && room?.status === "Playing" && phase === "Playing" && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[#F4E9D8]/60 font-body">Tempo restante:</span>
                      <span className={`font-display font-bold px-2.5 py-0.5 rounded-full text-xs shadow-md ${turnTimeLeft <= 5 ? "bg-[#8B1E3F] text-white animate-bounce" : "bg-[#0A2B20] text-[#C9A227] border border-[#C9A227]/20"}`}>
                        {turnTimeLeft}s
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-4 w-full md:w-72">
          {room?.status === "Lobby" && (
            <div className="flex flex-col gap-3 bg-[#0A2B20]/80 border border-[#C9A227]/20 p-4 rounded-xl shadow-xl text-center">
              {isHost ? (
                <>
                  <button
                    onClick={handleStart}
                    disabled={room.playerCount < 2}
                    className="w-full bg-[#C9A227] disabled:bg-[#C9A227]/40 text-[#1A1A1A] disabled:text-[#1A1A1A]/40 font-display font-bold py-3 rounded-lg hover:bg-[#C9A227]/90 transition-colors shadow-md cursor-pointer disabled:cursor-not-allowed"
                  >
                    {room.playerCount < 2 ? "Aguardando Jogadores (Mín. 2)" : "Iniciar Partida"}
                  </button>

                  <button
                    onClick={handleAddBot}
                    disabled={room.playerCount >= room.maxPlayers}
                    className="w-full bg-[#0A2B20] border border-[#C9A227]/40 text-[#C9A227] hover:bg-[#C9A227]/10 disabled:opacity-40 font-display font-bold py-2 rounded-lg transition-all text-xs flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    🤖 Adicionar Bot
                  </button>

                  <div className="flex items-center gap-2 mt-1 text-xs text-[#F4E9D8]/80 font-body">
                    <input
                      type="checkbox"
                      id="private-toggle"
                      checked={room?.isPrivate || false}
                      onChange={(e) => handleToggleVisibility(e.target.checked)}
                      className="accent-[#C9A227] w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="private-toggle" className="cursor-pointer select-none">
                      Ocultar da lista pública (Privada)
                    </label>
                  </div>
                </>
              ) : (
                <p className="text-sm font-body text-[#F4E9D8]/60 py-2">
                  Aguardando o host iniciar a partida...
                </p>
              )}
            </div>
          )}

          {room?.roomCode && room.status === "Lobby" && (
            <div className="bg-[#0A2B20]/80 border border-[#C9A227]/20 p-4 rounded-xl shadow-xl">
              <h3 className="font-display text-[10px] font-black text-[#C9A227] tracking-widest uppercase mb-3">Jogadores na Sala ({room.players.length}/{room.maxPlayers})</h3>
              <div className="flex flex-col gap-2">
                {room.players.map((player) => (
                  <div key={player.id} className="flex justify-between items-center bg-[#051711] p-2 rounded-lg border border-[#C9A227]/5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-body font-bold text-[#FDFBF7]">{player.username}</span>
                      {player.isBot && (
                        <span className="text-[9px] font-display font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">BOT</span>
                      )}
                    </div>
                    {room?.players && room.players[0]?.id === player.id ? (
                      <span className="text-[9px] font-display font-black text-[#C9A227] bg-[#C9A227]/10 px-2 py-0.5 rounded border border-[#C9A227]/20 uppercase tracking-wider">Host</span>
                    ) : isHost && player.isBot ? (
                      <button
                        onClick={() => handleRemoveBot(player.id)}
                        className="text-[9px] text-red-400 hover:text-red-300 font-bold bg-red-400/10 px-2 py-0.5 rounded border border-red-400/20 cursor-pointer"
                      >
                        Remover
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          {room?.roomCode && room.status === "Lobby" && (
            <RoomQrCode roomCode={room.roomCode} />
          )}
          <ChatBox onSendMessage={(msg) => sendChatMessage(roomId, msg)} on={on} currentUser={username} />
        </div>
      </div>

      {/* Ações do Turno */}
      {isMyTurn && selectedCard && room?.status === "Playing" && hand.length === 10 && (
        <div className="mb-4 animate-bounce">
          <button
            onClick={handlePassCard}
            className="bg-[#C9A227] text-[#1A1A1A] font-display font-bold px-6 py-2.5 rounded-lg shadow-lg transition-colors cursor-pointer"
          >
            {`Passar ${selectedCard.value === "Coringa" ? "o Coringa" : `o ${selectedCard.value} de ${selectedCard.suit}`}`}
          </button>
        </div>
      )}

      {/* Barra de Reações de Emojis */}
      {room?.status === "Playing" && (
        <div className="mb-4 flex justify-center">
          <ReactionPill
            onSendReaction={(emoji) => {
              connection?.invoke("SendReaction", roomId, emoji)?.catch(err => console.error(err));
            }}
          />
        </div>
      )}

      {/* mão do jogador */}
      {room?.status === "Playing" && (
        <motion.div layout className="flex justify-center -space-x-4 md:-space-x-5 mb-6 bg-[#0F3D2E]/40 p-3 md:p-4 rounded-2xl border border-[#C9A227]/10 shadow-inner max-w-full overflow-visible">
          {sortedHand.map((card, index) => (
            <CardComponent
              key={`${card.value}-${card.suit}`}
              index={index}
              card={card}
              onClick={() => handleSelectCard(card)}
              selected={selectedCard ? (selectedCard.suit === card.suit && selectedCard.value === card.value) : false}
              isFrozen={isCardFrozen(card)}
              isForbidden={isCardForbidden(card)}
              customInitial={lastDrawnCard?.value === card.value && lastDrawnCard?.suit === card.suit ? { opacity: 0, y: -300, scale: 0.5 } : undefined}
              onAnimationComplete={() => { if (card.value === lastDrawnCard?.value && card.suit === lastDrawnCard?.suit) setLastDrawnCard(null); }}
              drag={!isCardFrozen(card) && !isCardForbidden(card)}
              onDrag={(e, info) => {
                if (info.offset.y < -70 && isMyTurn && hand.length === 10) {
                  setIsDraggingOverPile(true);
                } else {
                  setIsDraggingOverPile(false);
                }
              }}
              onDragEnd={(e, info) => {
                setIsDraggingOverPile(false);
                // 1. Arrasta para cima (> 70px) -> Passa a carta se for a vez e tiver 10 cartas
                if (info.offset.y < -70 && isMyTurn && hand.length === 10) {
                  handleDragPassCard(card);
                  return;
                }
                // 2. Arrasta para os lados (> 25px) -> Reordena a carta na mão
                if (Math.abs(info.offset.x) > 25) {
                  const cardWidth = 45;
                  const deltaIndex = Math.round(info.offset.x / cardWidth);
                  if (deltaIndex !== 0) {
                    const newIndex = Math.max(0, Math.min(hand.length - 1, index + deltaIndex));
                    if (newIndex !== index) {
                      setHand(prevHand => {
                        const updated = [...prevHand];
                        const [movedCard] = updated.splice(index, 1);
                        updated.splice(newIndex, 0, movedCard);
                        return updated;
                      });
                    }
                  }
                }
              }}
            />
          ))}
        </motion.div>
      )}

      {/* botão de bater (apenas se mais de 2 jogadores) */}
      {room?.playerCount && room.playerCount > 2 && (
        <SlapButton
          active={(phase === "Slapping" || hasQuadra) && !hasAlreadySlapped}
          hasAlreadySlapped={hasAlreadySlapped}
          onSlap={handleSlap}
          disabled={!connected || !canSlap || hasAlreadySlapped}
        />
      )}

      {/* Overlay Visual e SVG Cracking para Fase Slapping ou Fim de Rodada */}
      {(phase === "Slapping" || phase === "RoundOver" || phase === "GameOver") && (
        <div className="fixed inset-0 pointer-events-none z-40 opacity-40 flex items-center justify-center mix-blend-screen">
           <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
             <path d="M50,50 L20,10 M50,50 L80,20 M50,50 L10,70 M50,50 L90,80 M50,50 L40,90 M50,50 L60,10" stroke="white" strokeWidth="0.2" fill="none" className="drop-shadow-lg" />
           </svg>
        </div>
      )}

      {/* Overlay de Fim de Rodada */}
      {phase === "RoundOver" && (
        <div className="fixed inset-0 z-50 bg-[#051711]/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[#0A2B20] border border-[#C9A227]/25 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center flex flex-col items-center gap-6 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#C9A227] to-transparent" />
            <h2 className="font-display text-3xl font-black text-[#C9A227] tracking-wider uppercase">
              Rodada Encerrada!
            </h2>
            <div className="w-16 h-16 bg-[#B91C1C]/10 border border-[#B91C1C]/30 rounded-full flex items-center justify-center text-xs font-display font-black text-[#FF8A8A] tracking-wider animate-bounce select-none">
              FIM
            </div>
            <p className="font-body text-[#FDFBF7] text-sm">
              O jogador <span className="font-black text-[#C9A227]">{lastRoundLoserId ? getUsernameById(lastRoundLoserId) : "Desconhecido"}</span> perdeu esta rodada!
            </p>
            {lastRoundDuration !== null && (
              <p className="text-[11px] font-body text-[#FDFBF7]/50 -mt-2">
                Tempo da rodada: <strong className="text-[#C9A227]">{formatTime(lastRoundDuration)}</strong>
              </p>
            )}
 
            <div className="w-full bg-[#051711] p-4 rounded-xl border border-[#C9A227]/10 flex flex-col gap-2">
              <h3 className="font-display font-black text-[10px] tracking-widest text-[#C9A227] border-b border-[#C9A227]/10 pb-1 uppercase">Placar de Letras</h3>
              {Object.entries(letters).map(([pId, pLetters]) => (
                <div key={pId} className="flex justify-between font-body text-xs text-[#FDFBF7]/80">
                  <span>{getUsernameById(pId)} {pId.toLowerCase() === myId ? "(Você)" : ""}</span>
                  <span className="font-black text-[#B91C1C] tracking-widest uppercase">{pLetters || "-"}</span>
                </div>
              ))}
            </div>
 
            {slapOrder.length > 0 && (
              <div className="w-full bg-[#051711] p-4 rounded-xl border border-[#C9A227]/10 flex flex-col gap-2 mt-2 text-left">
                <h3 className="font-display font-black text-[10px] tracking-widest text-[#C9A227] border-b border-[#C9A227]/10 pb-1 uppercase">Ranking da Batida</h3>
                {slapOrder.map((slap, index) => {
                  const rawDelay = index === 0 ? 0 : new Date(slap.timestamp).getTime() - new Date(slapOrder[0].timestamp).getTime();
                  const delayMs = isNaN(rawDelay) ? 0 : rawDelay;
                  return (
                    <div key={slap.playerId} className="flex justify-between font-body text-xs text-[#FDFBF7]/80">
                      <span>{index + 1}. {getUsernameById(slap.playerId)} {slap.playerId.toLowerCase() === myId ? "(Você)" : ""}</span>
                      <span className="font-mono text-[10px] text-[#C9A227]/80">
                        {index === 0 ? "Mais Rápido" : `+${delayMs}ms`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {isHost ? (
              <button
                onClick={async () => {
                  try {
                    await api.nextRound();
                  } catch (err) {
                    console.error("Erro ao iniciar próxima rodada:", err);
                  }
                }}
                className="w-full bg-gradient-to-r from-[#D97706] to-[#C9A227] text-[#051711] font-display font-black py-3 rounded-xl shadow-lg hover:scale-[1.02] active:scale-98 transition-all cursor-pointer uppercase text-xs tracking-wider"
              >
                Começar Próxima Rodada
              </button>
            ) : (
              <p className="text-xs font-body text-[#FDFBF7]/40 animate-pulse uppercase tracking-wider">
                Aguardando o host iniciar a próxima rodada...
              </p>
            )}
          </div>
        </div>
      )}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

      {/* Botão Flutuante de Configurações */}
      <button
        onClick={() => setIsSettingsOpen(true)}
        className="fixed top-6 right-6 z-40 bg-[#0A2B20]/85 backdrop-blur border border-[#C9A227]/30 text-[#C9A227] hover:bg-[#C9A227]/10 p-2.5 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer text-lg leading-none"
        aria-label="Configurações"
      >
        ⚙️
      </button>

      {/* Drawer de Ajustes */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onShowRules={() => setIsRulesOpen(true)}
        onLeaveRoom={handleLeave}
      />
      {isAloneModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#051711]/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[#0A2B20] border border-[#C9A227]/25 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center flex flex-col items-center gap-6 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#C9A227] to-transparent" />
            <h2 className="font-display text-3xl font-black text-[#C9A227] tracking-wider uppercase">
              Sala Vazia
            </h2>
            <div className="w-16 h-16 bg-[#B91C1C]/10 border border-[#B91C1C]/30 rounded-full flex items-center justify-center text-xs font-display font-black text-[#FF8A8A] tracking-wider animate-pulse select-none">
              VAZIO
            </div>
            <p className="font-body text-[#FDFBF7] text-sm">
              Você ficou sozinho na sala. A partida foi encerrada!
            </p>
            <p className="font-body text-[#FDFBF7]/60 text-xs leading-relaxed">
              Deseja continuar na sala como Host e convidar novos oponentes ou prefere encerrar e voltar ao lobby?
            </p>
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={() => setIsAloneModalOpen(false)}
                className="w-full bg-gradient-to-r from-[#D97706] to-[#C9A227] text-[#051711] font-display font-black py-3 rounded-xl shadow-lg hover:scale-[1.02] active:scale-98 transition-all cursor-pointer text-xs uppercase tracking-wider"
              >
                Continuar como Host
              </button>
              <button
                onClick={handleLeave}
                className="w-full bg-transparent border border-[#B91C1C]/40 text-[#FF8A8A] font-display font-black py-3 rounded-xl shadow-lg hover:bg-[#B91C1C]/10 transition-all cursor-pointer text-xs uppercase tracking-wider"
              >
                Encerrar e Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}