import { useState, FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";
import { Mail, Lock, Eye, EyeOff, Loader, Sparkles, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";

interface LoginProps {
  onSuccess: () => void;
  onNavigateRegister: () => void;
}

export default function Login({ onSuccess, onNavigateRegister }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // MFA state
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (err) throw err;

      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const totpFactor = factorsData?.totp?.[0];
        if (totpFactor) {
          setMfaFactorId(totpFactor.id);
          setMfaStep(true);
          setLoading(false);
          return;
        }
      }

      onSuccess();
    } catch (err: any) {
      setError(
        err.message === "Invalid login credentials"
          ? "Email atau password salah."
          : err.message || "Login gagal."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = async (e: FormEvent) => {
    e.preventDefault();
    if (!mfaFactorId || mfaCode.trim().length !== 6 || loading) return;
    setLoading(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.id,
        code: mfaCode.trim(),
      });
      if (verifyError) throw verifyError;
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Kode verifikasi salah.");
    } finally {
      setLoading(false);
    }
  };

  if (mfaStep) {
    return (
      <div className="min-h-screen bg-[#0e1015] flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-sm w-full bg-zinc-900/60 border border-zinc-800 rounded-3xl p-8 backdrop-blur-md shadow-2xl"
        >
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20 mb-4">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100">Verifikasi 2 Langkah</h2>
            <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider mt-1">
              Masukkan kode dari aplikasi autentikator
            </span>
          </div>
          <form onSubmit={handleVerifyMfa} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="w-full bg-zinc-800 border border-zinc-700 focus:border-purple-500 rounded-xl px-4 py-3 text-center text-lg tracking-[0.5em] text-zinc-200 placeholder:text-zinc-600 outline-none transition-all"
            />
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-xs font-medium text-center">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || mfaCode.length !== 6}
              className="w-full py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-500 via-purple-600 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-xl shadow-purple-500/10 active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : "Verifikasi"}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e1015] flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-sm w-full bg-zinc-900/60 border border-zinc-800 rounded-3xl p-8 backdrop-blur-md shadow-2xl"
      >
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20 mb-4 animate-pulse">
            <span className="text-white font-black text-xl">8</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-purple-400 via-pink-400 to-pink-500 bg-clip-text text-transparent">
            Eight
          </h2>
          <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider mt-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Anime Streaming Website
          </span>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full bg-zinc-800 border border-zinc-700 focus:border-purple-500 rounded-xl pl-10 pr-4 py-3 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none transition-all focus:ring-2 focus:ring-purple-500/10"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Kata Sandi</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPass ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-zinc-800 border border-zinc-700 focus:border-purple-500 rounded-xl pl-10 pr-11 py-3 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none transition-all focus:ring-2 focus:ring-purple-500/10"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-500 via-purple-600 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-xl shadow-purple-500/10 active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer transition-all mt-2"
          >
            {loading ? (
              <><Loader className="w-4 h-4 animate-spin" /><span>Menghubungkan...</span></>
            ) : (
              <span>Masuk Sekarang</span>
            )}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-xs text-zinc-500">
            Belum punya akun?{" "}
            <button
              onClick={onNavigateRegister}
              className="text-purple-400 hover:text-purple-300 font-bold transition-colors cursor-pointer underline"
            >
              Daftar Gratis
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
