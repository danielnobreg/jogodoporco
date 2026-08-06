"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export function useAuth() {
  const [username, setUsername] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setUsername(localStorage.getItem("porco_username"));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login({ email, password });
    localStorage.setItem("porco_token", res.token);
    localStorage.setItem("porco_username", res.username);
    setUsername(res.username);
    router.push("/");
  }, [router]);

  const register = useCallback(async (data: { username: string; email: string; password: string }) => {
    const res = await api.register(data);
    localStorage.setItem("porco_token", res.token);
    localStorage.setItem("porco_username", res.username);
    setUsername(res.username);
    router.push("/");
  }, [router]);

  const logout = useCallback(() => {
    localStorage.removeItem("porco_token");
    localStorage.removeItem("porco_username");
    localStorage.removeItem("porco_is_guest");
    setUsername(null);
    router.push("/login");
  }, [router]);

  const isLoggedIn = useCallback(() => {
    return typeof window !== "undefined" && !!localStorage.getItem("porco_token");
  }, []);

  const isGuest = useCallback(() => {
    return typeof window !== "undefined" && localStorage.getItem("porco_is_guest") === "true";
  }, []);

  return { username, login, register, logout, isLoggedIn, isGuest };
}