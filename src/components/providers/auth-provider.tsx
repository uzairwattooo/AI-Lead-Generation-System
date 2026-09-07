"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured, publicEnv } from "@/lib/public-env";

export interface AuthState {
  user: { email: string; id: string } | null;
  loading: boolean;
  /** True when Supabase is not configured and the demo identity is in use. */
  demo: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  /** Creates an account and returns true when Supabase also starts a session. */
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const DEMO_USER = { email: "demo@codenativex.com", id: "demo-user" };

const AuthContext = React.createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const demo = !isSupabaseConfigured || publicEnv.demoMode;
  const [client] = React.useState(() => (isSupabaseConfigured ? createSupabaseBrowserClient() : null));
  const [user, setUser] = React.useState<AuthState["user"]>(demo ? DEMO_USER : null);
  const [loading, setLoading] = React.useState(!demo);

  React.useEffect(() => {
    if (demo || !client) return;
    let active = true;

    const applySession = (session: Session | null) => {
      if (!active) return;
      const nextUser: User | null = session?.user ?? null;
      setUser(nextUser ? { email: nextUser.email ?? "", id: nextUser.id } : null);
      setLoading(false);
    };

    void client.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => applySession(session));

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [client, demo]);

  const signIn = React.useCallback(
    async (email: string, password: string) => {
      if (demo || !client) {
        setUser(DEMO_USER);
        return;
      }
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
    },
    [client, demo],
  );

  const signUp = React.useCallback(
    async (email: string, password: string) => {
      if (demo || !client) {
        setUser(DEMO_USER);
        return true;
      }
      const { data, error } = await client.auth.signUp({ email, password });
      if (error) throw new Error(error.message);
      return Boolean(data.session);
    },
    [client, demo],
  );

  const signOut = React.useCallback(async () => {
    if (client) await client.auth.signOut();
    setUser(demo ? DEMO_USER : null);
    router.replace("/login");
  }, [client, demo, router]);

  const value = React.useMemo<AuthState>(
    () => ({ user, loading, demo, signIn, signUp, signOut }),
    [user, loading, demo, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside an AuthProvider");
  return context;
}
