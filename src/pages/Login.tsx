import { useState, FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";
import { Mail, Lock, Eye, EyeOff, Loader, Sparkles } from "lucide-react";
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
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || loading) return;
    setLoading(true);
    setError(null);
    setDebugInfo(null);

    try {
      // Step 1: Login
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (authErr) throw new Error("Auth error: " + authErr.message);

      const userId = authData.user?.id;
      setDebugInfo(`Login OK. User ID: ${userId?.slice(0,8)}...`);

      // Step 2: Fetch profile
      const { data: profileData, error: profileErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (profileErr) {
        throw new Error("Profile fetch error: " + profileErr.message);
      }
      if (!profileData) {
        throw new Error("Profile not found untuk user: " + userId?.slice(0,8));
      }

      setDebugInfo(`Profile OK: ${profileData.username}`);
      setTimeout(() => onSuccess(), 500);

    } catch (err: any) {
      setError(err.message || "Login gagal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e1015] flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-sm w-full bg-zinc-900/60 border border-zinc-800 rounded-3xl p-8 backdrop-blur-md shadow-2xl"
      >
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
                className="w-full bg-zinc-800 border border-zinc-700 focus:border-purple-500 rounded-xl pl-10 pr-4 py-3 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none transition-all"
              />
            </div>
          </div>

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
                className="w-full bg-zinc-800 border border-zinc-700 focus:border-purple-500 rounded-xl pl-10 pr-11 py-3 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none transition-all"
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 cursor-pointer">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {debugInfo && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 text-blue-400 text-xs font-mono">
              {debugInfo}
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-xs font-mono break-all">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-500 via-purple-600 to-pink-500 text-white active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer transition-all mt-2"
          >
            {loading ? <><Loader className="w-4 h-4 animate-spin" /><span>Menghubungkan...</span></> : <span>Masuk Sekarang</span>}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-xs text-zinc-500">
            Belum punya akun?{" "}
            <button onClick={onNavigateRegister} className="text-purple-400 font-bold cursor-pointer underline">
              Daftar Gratis
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
