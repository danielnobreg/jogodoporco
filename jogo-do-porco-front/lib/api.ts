const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5235";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("porco_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("porco_token");
        localStorage.removeItem("porco_username");
        localStorage.removeItem("porco_is_guest");
        window.location.href = "/login";
      }
    }
    const error = await response.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(error.error || "Falha na requisição");
  }

  // 202 Accepted não tem corpo
  if (response.status === 202) return {} as T;

  return response.json();
}

export const api = {
  register: (data: { username: string; email: string; password: string }) =>
    request<{ token: string; username: string; email: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<{ token: string; username: string; email: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getRooms: () => request<import("./types").Room[]>("/rooms"),

  getRoom: (roomId: string) =>
    request<import("./types").Room>(`/rooms/${roomId}`),

  createRoom: (name: string, maxPlayers: number = 8) =>
    request<import("./types").Room>("/rooms", {
      method: "POST",
      body: JSON.stringify({ name, maxPlayers }),
    }),

  createGuestRoom: (roomName: string, displayName: string, maxPlayers: number = 8) =>
    request<{ guestToken: string; playerId: string; roomId: string; roomCode: string }>("/guest/create", {
      method: "POST",
      body: JSON.stringify({ roomName, displayName, maxPlayers }),
    }),

  joinRoom: (roomId: string) =>
    request(`/rooms/${roomId}/join`, { method: "POST" }),

  passCard: (toPlayerId: string, cardSuit: string, cardValue: string) =>
    request("/actions/pass-card", {
      method: "POST",
      body: JSON.stringify({ toPlayerId, cardSuit, cardValue }),
    }),

  slap: () => request("/actions/slap", { method: "POST" }),
  nextRound: () => request("/actions/next-round", { method: "POST" }),
  draw: (source: "deck" | "pile") =>
    request("/actions/draw", {
      method: "POST",
      body: JSON.stringify({ source }),
    }),
  startRoom: (roomId: string) =>
    request<void>(`/rooms/${roomId}/start`, { method: "POST" }),
  addBot: (roomId: string) =>
    request<import("./types").PlayerDto>(`/rooms/${roomId}/bot`, { method: "POST" }),
  removeBot: (roomId: string, botId: string) =>
    request<void>(`/rooms/${roomId}/bot/${botId}`, { method: "DELETE" }),
  getMatchHistory: () =>
    request<any[]>("/rooms/history"),
};

export { API_URL, getToken };