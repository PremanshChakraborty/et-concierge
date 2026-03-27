import { useEffect, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import AuthPage from "./pages/AuthPage";
import ChatPage from "./pages/ChatPage";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export default function App() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    fetchAuthSession()
      .then((session) => {
        const hasToken = !!session.tokens?.accessToken;
        setAuthStatus(hasToken ? "authenticated" : "unauthenticated");
      })
      .catch(() => setAuthStatus("unauthenticated"));
  }, []);

  if (authStatus === "loading") {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <p className="text-sm text-neutral-400 animate-pulse">Loading...</p>
      </div>
    );
  }

  if (authStatus === "unauthenticated") {
    return <AuthPage onAuthenticated={() => setAuthStatus("authenticated")} />;
  }

  return <ChatPage onSignOut={() => setAuthStatus("unauthenticated")} />;
}
