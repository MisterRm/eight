import { useState, FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";
import { Mail, Lock, Eye, EyeOff, Loader, User, ArrowLeft, CheckCircle } from "lucide-react";
import { motion } from "motion/react";

interface RegisterProps {
  onSuccess: () => void;
  onNavigateLogin: () => void;
}

export default function Register({ onSuccess, onNavigateLogin }: RegisterProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needConfirm, setNeedConfirm] = useState(false);

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!cleanUsername || !email.trim() || !password.trim() || loading) return;
    if (cleanUsername.length < 3) { setError("Username minimal 3 karakter."); return; }
    if (password.length < 6) { setError("Password minimal 6 karakter."); return; }

    setLoading(true);
    setError(null);
    try {
      // 1. Cek username duplikat
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", cleanUsername)
        .maybeSingle();
      if (existing) { setError("Username sudah dipakai, pilih yang lain."); setLoading(false); return; }

      // 2. Daftar via Supabase Auth
      // Username disimpan di user_metadata supaya useAuth bisa auto-create
      // profile saat login pertama (kalau konfirmasi email diaktifkan)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            username: cleanUsername,
            display_name: cleanUsername,
          },
        },
      });
      if (authError) throw authError;

      // 3. Kalau langsung dapat session (konfirmasi email OFF),
      // insert profile sekarang. Kalau tidak (perlu konfirmasi),
      // useAuth.ensureProfile yang handle otomatis saat login nanti.
      if (authData.session) {
        await supabase.from("profiles").insert({
          id: authData.user!.id,
          username: cleanUsername,
          display_name: cleanUsername,
          avatar_url: null,
          bio: "Penggemar anime 🎌",
        });
        onSuccess();
      } else {
        // Perlu konfirmasi email dulu
        setNeedConfirm(true);
      }
    } catch (err: any) {
      setError(err.message || "Registrasi gagal.");
    } finally {
      setLoading(false);
    }
  };

  // Tampilan sukses — minta user cek email
  if (needConfirm) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen bg-[#0e1015] flex flex-col items-center justify-center px-6 text-center"
      >
        <div className="p-5 bg-green-500/10 rounded-full border border-green-500/20 mb-6">
          <CheckCircle className="w-12 h-12 text-green-400" />
        </div>
        <h2 className="text-white text-xl font-bold mb-2">Akun Dibuat!</h2>
        <p className="text-[#535766] text-sm mb-8 max-w-xs">
          Cek email kamu untuk konfirmasi, lalu login.
        </p>
        <button
          onClick={onNavigateLogin}
          className="px-8 py-3.5 rounded-2xl bg-white text-[#0e1015] font-bold text-sm cursor-pointer hover:bg-white/90 transition-colors"
        >
          Ke Halaman Login
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.2 }}
      className="min-h-screen bg-[#0e1015] flex flex-col px-6 pt-14 pb-10"
    >
      <button
        onClick={() => (window.location.hash = "#/")}
        className="absolute top-5 left-5 p-2 rounded-full bg-[#121319] border border-white/5 text-[#a0a5b5] cursor-pointer"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="mb-10 mt-4">
        <h1 className="text-3xl font-black text-white tracking-tight">Daftar</h1>
        <p className="text-[#535766] text-sm mt-1">Buat akun Eight kamu sekarang 🎌</p>
      </div>

      <form onSubmit={handleRegister} className="flex flex-col gap-4">
        <div className="relative">
          <User className="w-4 h-4 text-[#535766] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            maxLength={20}
            className="w-full bg-[#121319] border border-white/5 rounded-2xl py-4 pl-11 pr-4 text-white text-sm placeholder-[#535766] focus:outline-none focus:border-white/15"
          />
        </div>

        <div className="relative">
          <Mail className="w-4 h-4 text-[#535766] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#121319] border border-white/5 rounded-2xl py-4 pl-11 pr-4 text-white text-sm placeholder-[#535766] focus:outline-none focus:border-white/15"
          />
        </div>

        <div className="relative">
          <Lock className="w-4 h-4 text-[#535766] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type={showPass ? "text" : "password"}
            placeholder="Password (min. 6 karakter)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#121319] border border-white/5 rounded-2xl py-4 pl-11 pr-12 text-white text-sm placeholder-[#535766] focus:outline-none focus:border-white/15"
          />
          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#535766] cursor-pointer">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-white text-[#0e1015] font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer hover:bg-white/90 transition-colors mt-2"
        >
          {loading ? <Loader className="w-4 h-4 animate-spin" /> : "Buat Akun"}
        </button>
      </form>

      <div className="mt-8 text-center">
        <span className="text-[#535766] text-sm">Sudah punya akun? </span>
        <button onClick={onNavigateLogin} className="text-white font-semibold text-sm cursor-pointer hover:underline">
          Masuk
        </button>
      </div>
    </motion.div>
  );
}
