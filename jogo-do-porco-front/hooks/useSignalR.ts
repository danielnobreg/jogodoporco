"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as signalR from "@microsoft/signalr";
import { getToken, API_URL } from "@/lib/api";

export function useSignalR(roomId: string | null) {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!roomId) return;

    const token = getToken();
    if (!token) return;

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/hub/game?access_token=${token}`)
      .configureLogging(signalR.LogLevel.Warning)
      .withAutomaticReconnect()
      .build();

    let isStopped = false;

    async function start() {
      try {
        await conn.start();
        if (isStopped) {
          conn.stop();
          return;
        }
        setConnection(conn);
        setConnected(true);
        conn.invoke("JoinRoom", roomId).catch(() => {});
      } catch (err: any) {
        if (!isStopped) {
          console.error("Erro ao conectar SignalR:", err);
          const isAuthError = err && (err.statusCode === 401 || err.message?.includes("401") || err.message?.includes("Unauthorized"));
          if (isAuthError) {
            if (typeof window !== "undefined") {
              localStorage.removeItem("porco_token");
              localStorage.removeItem("porco_username");
              localStorage.removeItem("porco_is_guest");
              window.location.href = "/login";
            }
          }
        }
      }
    }

    start();

    return () => {
      isStopped = true;
      if (conn.state === signalR.HubConnectionState.Connected) {
        conn.invoke("LeaveRoom", roomId).catch(() => {});
      }
      conn.stop().catch(() => {});
      setConnection(null);
      setConnected(false);
    };
  }, [roomId]);
  
  const sendChatMessage = useCallback((roomId: string, message: string) => {
    if (connection && connection.state === signalR.HubConnectionState.Connected) {
      connection.invoke("SendChatMessage", roomId, message).catch((err) => console.error("Erro ao enviar mensagem:", err));
    }
  }, [connection]);
  
  // registra um listener para um evento específico do Hub
  const on = useCallback((eventName: string, callback: (...args: any[]) => void) => {
    if (!connection) return () => {};
    connection.on(eventName, callback);
    return () => connection.off(eventName, callback);
  }, [connection]);

  return { connected, connection, on, sendChatMessage };
}