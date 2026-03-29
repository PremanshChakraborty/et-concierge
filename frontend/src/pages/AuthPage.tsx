import { useState } from "react";
import { signIn, signUp, confirmSignUp } from "../lib/auth";

type AuthView = "sign-in" | "sign-up" | "confirm";

interface Props {
  onAuthenticated: () => void;
}

export default function AuthPage({ onAuthenticated }: Props) {
  const [view, setView]       = useState<AuthView>("sign-in");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode]       = useState("");
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      await signIn(email, password);
      onAuthenticated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally { setLoading(false); }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      await signUp(email, password);
      setView("confirm");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign-up failed.");
    } finally { setLoading(false); }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      await confirmSignUp(email, code);
      setView("sign-in");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Confirmation failed.");
    } finally { setLoading(false); }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-sm p-8">
        {/* Logo */}
        <h1
          className="text-3xl font-black tracking-tighter text-gradient text-center mb-2"
        >
          ET Concierge
        </h1>
        <p className="text-xs text-center text-neutral-400 uppercase tracking-widest font-medium mb-10">
          {view === "confirm" ? "Check your email" : "Your ET Ecosystem Assistant"}
        </p>

        {/* Sign In */}
        {view === "sign-in" && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <Input label="Email" type="email" value={email} onChange={setEmail} />
            <Input label="Password" type="password" value={password} onChange={setPassword} />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <GradientButton loading={loading}>Sign In</GradientButton>
            <p className="text-center text-xs text-neutral-400">
              No account?{" "}
              <button type="button" className="font-bold text-black underline" onClick={() => { setView("sign-up"); setError(null); }}>
                Sign Up
              </button>
            </p>
          </form>
        )}

        {/* Sign Up */}
        {view === "sign-up" && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <Input label="Email" type="email" value={email} onChange={setEmail} />
            <Input label="Password" type="password" value={password} onChange={setPassword} />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <GradientButton loading={loading}>Create Account</GradientButton>
            <p className="text-center text-xs text-neutral-400">
              Have an account?{" "}
              <button type="button" className="font-bold text-black underline" onClick={() => { setView("sign-in"); setError(null); }}>
                Sign In
              </button>
            </p>
          </form>
        )}

        {/* Confirm OTP */}
        {view === "confirm" && (
          <form onSubmit={handleConfirm} className="space-y-4">
            <p className="text-sm text-neutral-600 text-center mb-2">
              We sent a verification code to <strong>{email}</strong>
            </p>
            <Input label="Verification Code" type="text" value={code} onChange={setCode} />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <GradientButton loading={loading}>Verify</GradientButton>
          </form>
        )}

        {/* <p className="text-[10px] text-center text-neutral-300 mt-10 uppercase tracking-widest font-medium">
          Powered by Retail AI Premium Engine
        </p> */}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Input({ label, type, value, onChange }: {
  label: string; type: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        required
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-border-light focus:border-black outline-none text-sm transition-colors bg-surface-light"
      />
    </div>
  );
}

function GradientButton({ children, loading }: { children: React.ReactNode; loading?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full premium-gradient-horizontal text-white font-bold py-3 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 text-sm"
    >
      {loading ? "Please wait..." : children}
    </button>
  );
}
