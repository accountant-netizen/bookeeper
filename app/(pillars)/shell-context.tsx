"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import type { Session } from "@supabase/supabase-js";
import { createBrowserClient } from "@/lib/supabase";

type ShellContextValue = {
  session: Session;
  companyId: string;
  setCompanyId: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  shortToken: string;
  authorizedFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

const ShellContext = createContext<ShellContextValue | null>(null);

const supabase = createBrowserClient();

type ProviderProps = {
  children: ReactNode;
};

export function ShellProvider({ children }: ProviderProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState("Idle");
  const [companyId, setCompanyIdState] = useState("");

  useEffect(() => {
    const initialCompany = window.localStorage.getItem("companyId") || "";
    setCompanyIdState(initialCompany);

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);
    };

    void loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async () => {
    setStatus("Signing in...");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus(`Sign in failed: ${error.message}`);
      return;
    }
    setStatus("Sign in successful.");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setStatus("Signed out.");
  };

  const setCompanyId = (value: string) => {
    setCompanyIdState(value);
    window.localStorage.setItem("companyId", value);
  };

  const shortToken = useMemo(() => {
    const token = session?.access_token;
    if (!token) {
      return "No session token";
    }
    return `${token.slice(0, 24)}...${token.slice(-12)}`;
  }, [session]);

  if (!session) {
    return (
      <main className="authPage">
        <section className="authCard">
          <h1>Accountant Platform</h1>
          <p>Sign in to continue.</p>
          <div className="formGrid">
            <label>
              Email
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@company.com"
                type="email"
              />
            </label>
            <label>
              Password
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                type="password"
              />
            </label>
          </div>
          <div className="row">
            <button onClick={signIn} type="button">
              Sign In
            </button>
          </div>
        </section>
      </main>
    );
  }

  const authorizedFetch = (input: RequestInfo | URL, init?: RequestInit) => {
    return fetch(input, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        Authorization: `Bearer ${session.access_token}`
      }
    });
  };

  return (
    <ShellContext.Provider
      value={{
        session,
        companyId,
        setCompanyId,
        status,
        setStatus,
        shortToken,
        authorizedFetch
      }}
    >
      {children}
      <button type="button" className="fab" aria-label="Quick Action">
        +
      </button>
    </ShellContext.Provider>
  );
}

export function useShell() {
  const value = useContext(ShellContext);
  if (!value) {
    throw new Error("useShell must be used within ShellProvider");
  }
  return value;
}

export async function shellSignOut() {
  await supabase.auth.signOut();
}
