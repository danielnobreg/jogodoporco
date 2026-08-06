"use client";
 
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
 
interface ChatMessage {
  username: string;
  message: string;
  timestamp: string;
  isSystem?: boolean;
}
 
interface ChatBoxProps {
  onSendMessage: (message: string) => void;
  on: (event: string, callback: (...args: any[]) => void) => (() => void) | undefined;
  currentUser?: string | null;
}
 
export function ChatBox({ onSendMessage, on, currentUser }: ChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
 
  useEffect(() => {
    const off = on("ChatMessageReceived", (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      if (!isOpen) {
        setUnreadCount((prev) => prev + 1);
      }
    });
    return off;
  }, [on, isOpen]);
 
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);
 
  useEffect(() => {
    if (isOpen) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isOpen]);
 
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput("");
  }
 
  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div
            key="chat-open"
            initial={{ opacity: 0, scale: 0.93, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 15 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="flex flex-col w-72 h-80 bg-gradient-to-b from-[#0A2B20]/95 to-[#051711]/95 backdrop-blur-xl border border-[#C9A227]/25 rounded-2xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
          >
            {/* Header com botão de minimizar */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#051711] border-b border-[#C9A227]/10 text-[10px] font-display font-black tracking-widest text-[#C9A227]">
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                CHAT DA SALA
              </span>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-[#F4E9D8]/50 hover:text-[#C9A227] transition-all hover:scale-110 p-1 cursor-pointer"
                aria-label="Minimizar chat"
              >
                ✕
              </button>
            </div>
 
            {/* Mensagens */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 scrollbar-thin">
              {messages.length === 0 ? (
                <div className="text-center text-[#F4E9D8]/30 text-xs py-14 font-body italic">
                  Nenhuma mensagem enviada.
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={`text-xs leading-relaxed ${m.isSystem ? "text-[#C9A227]/85 italic bg-[#C9A227]/5 px-2.5 py-1.5 rounded-lg border border-[#C9A227]/10" : "text-[#F4E9D8]/90"}`}>
                    {!m.isSystem && (
                      <span className="font-bold text-[#C9A227] mr-1">
                        {m.username} {currentUser === m.username ? "(você)" : ""}:
                      </span>
                    )}
                    {m.message}
                  </div>
                ))
              )}
            </div>
 
            {/* Form de Input */}
            <form onSubmit={handleSubmit} className="flex border-t border-[#C9A227]/10 bg-[#051711]/50 p-2 gap-1.5">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Conversar..."
                maxLength={200}
                className="flex-1 bg-[#051711] border border-[#C9A227]/15 rounded-xl px-3 py-1.5 text-xs text-[#F4E9D8] placeholder:text-[#F4E9D8]/35 focus:outline-none focus:border-[#C9A227]/55 focus:ring-1 focus:ring-[#C9A227]/30 transition-all"
              />
              <button 
                type="submit" 
                className="bg-[#C9A227] text-[#051711] w-7 h-7 flex items-center justify-center rounded-xl font-bold hover:bg-[#C9A227]/90 active:scale-95 transition-all cursor-pointer text-xs"
              >
                →
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.button
            key="chat-closed"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setIsOpen(true)}
            className="relative flex items-center justify-center gap-2 w-72 py-3 bg-[#0A2B20]/95 backdrop-blur-xl border border-[#C9A227]/25 hover:border-[#C9A227]/60 text-xs font-display font-black tracking-widest text-[#C9A227] rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <span>💬 CHAT DA SALA</span>
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-2 -right-2 bg-[#B91C1C] text-[#F4E9D8] text-[9px] w-5 h-5 rounded-full flex items-center justify-center border border-[#F4E9D8]/10 font-bold shadow-md"
                >
                  {unreadCount}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}