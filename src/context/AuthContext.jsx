/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const API_BASE = "http://localhost:8000/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("hc_token") || "");
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("hc_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(Boolean(token));

  const persistSession = useCallback((nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem("hc_token", nextToken);
    localStorage.setItem("hc_user", JSON.stringify(nextUser));
  }, []);

  const clearSession = useCallback(() => {
    setToken("");
    setUser(null);
    localStorage.removeItem("hc_token");
    localStorage.removeItem("hc_user");
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }

    persistSession(data.token, data.user);
    return data.user;
  }, [persistSession]);

  const familyLogin = useCallback(
    async (patientId, phoneNumber, password) => {
      const response = await fetch(`${API_BASE}/auth/family/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, phoneNumber, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Family login failed");
      }

      persistSession(data.token, data.user);
      return data.user;
    },
    [persistSession]
  );

  const familyRegister = useCallback(
    async ({ patientId, phoneNumber, password, name, relation }) => {
      const response = await fetch(`${API_BASE}/auth/family/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          phoneNumber,
          password,
          name,
          relation,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Family registration failed");
      }

      persistSession(data.token, data.user);
      return data.user;
    },
    [persistSession]
  );

  const logout = useCallback(async () => {
    try {
      if (token) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // Ignore network/logout errors.
    } finally {
      clearSession();
    }
  }, [clearSession, token]);

  useEffect(() => {
    const loadMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          clearSession();
          setLoading(false);
          return;
        }

        const data = await response.json();
        setUser(data.user || null);
      } catch {
        clearSession();
      } finally {
        setLoading(false);
      }
    };

    loadMe();
  }, [clearSession, token]);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token && user),
      login,
      familyLogin,
      familyRegister,
      logout,
    }),
    [token, user, loading, login, familyLogin, familyRegister, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
