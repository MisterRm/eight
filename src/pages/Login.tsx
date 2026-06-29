import { useState, FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";
import { Mail, Lock, Eye, EyeOff, Loader, ArrowLeft } from "lucide-react";
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
      onSuccess();
    } catch (err: any) {
      setError(err.message === "Invalid login credentials"
        ? "Email atau password salah."
        : err.message || "Login gagal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.2 }}
      className="min-h-screen bg-[#0e1015] flex flex-col px-6 pt-14 pb-10"
    >
      {/* Back */}
      <button onClick={() => (window.location.hash = "#/")} className="absolute top-5 left-5 p-2 rounded-full bg-[#121319] border border-white/5 text-[#a0a5b5] cursor-pointer">
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Logo */}
      <div className="mb-10 mt-4">
        <h1 className="text-3xl font-black text-white tracking-tight">Masuk</h1>
        <p className="text-[#535766] text-sm mt-1">Selamat datang kembali di Eight 👋</p>
      </div>

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        {/* Email */}
        <div className="relative">
          <Mail className="w-4 h-4 text-[#535766] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-[#121319] border border-white/5 rounded-2xl py-4 pl-11 pr-4 text-white text-sm placeholder-[#535766] focus:outline-none focus:border-white/15"
          />
        </div>

        {/* Password */}
        <div className="relative">
          <Lock className="w-4 h-4 text-[#535766] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type={showPass ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-[#121319] border border-white/5 rounded-2xl py-4 pl-11 pr-12 text-white text-sm placeholder-[#535766] focus:outline-none focus:border-white/15"
          />
          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#535766] cursor-pointer">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-white text-[#0e1015] font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer hover:bg-white/90 transition-colors mt-2"
        >
          {loading ? <Loader className="w-4 h-4 animate-spin" /> : "Masuk"}
        </button>
      </form>

      {/* Footer */}
      <div className="mt-8 text-center">
        <span className="text-[#535766] text-sm">Belum punya akun? </span>
        <button onClick={onNavigateRegister} className="text-white font-semibold text-sm cursor-pointer hover:underline">
          Daftar
        </button>
      </div>
    </motion.div>
  );
}
