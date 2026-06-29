import { useState } from "react";
import { motion } from "motion/react";
import { LogOut, User, Mail, Edit3, ArrowLeft, Loader, CheckCircle } from "lucide-react";
import { supabase, Profile } from "../lib/supabaseClient";

interface ProfileUserProps {
  user: any;
  profile: Profile;
  onSignOut: () => void;
  onProfileUpdate: () => void;
}

export default function ProfileUser({ user, profile, onSignOut, onProfileUpdate }: ProfileUserProps) {
  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.from("profiles").update({
        display_name: displayName.trim() || profile.username,
        bio: bio.trim(),
      }).eq("id", user.id);
      if (err) throw err;
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onProfileUpdate();
      setEditMode(false);
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.2 }}
      className="min-h-screen pb-28 pt-4 px-5"
    >
      <button onClick={() => (window.location.hash = "#/")} className="absolute top-5 left-5 p-2 rounded-full bg-[#121319] border border-white/5 text-[#a0a5b5] cursor-pointer">
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Avatar + info */}
      <div className="flex flex-col items-center pt-12 pb-8">
        <div className="w-20 h-20 rounded-full bg-[#1a1c24] border-2 border-white/10 flex items-center justify-center mb-4 overflow-hidden">
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            : <User className="w-9 h-9 text-[#535766]" />
          }
        </div>
        <h2 className="text-white font-bold text-lg">{profile.display_name || profile.username}</h2>
        <p className="text-[#535766] text-sm font-mono">@{profile.username}</p>
        {profile.bio && <p className="text-[#a0a5b5] text-xs mt-2 text-center max-w-xs">{profile.bio}</p>}
      </div>

      {/* Info card */}
      <div className="bg-[#121319] border border-white/5 rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-3 py-2">
          <Mail className="w-4 h-4 text-[#535766] flex-shrink-0" />
          <span className="text-[#a0a5b5] text-sm">{user.email}</span>
        </div>
      </div>

      {/* Edit form */}
      {editMode ? (
        <div className="bg-[#121319] border border-white/5 rounded-2xl p-4 mb-4 flex flex-col gap-3">
          <div>
            <label className="text-xs text-[#535766] font-semibold uppercase tracking-wider block mb-1.5">Display Name</label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={30}
              className="w-full bg-[#0e1015] border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/15" />
          </div>
          <div>
            <label className="text-xs text-[#535766] font-semibold uppercase tracking-wider block mb-1.5">Bio</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={100} rows={3}
              className="w-full bg-[#0e1015] border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/15 resize-none" />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-2 mt-1">
            <button onClick={() => setEditMode(false)} className="flex-1 py-3 rounded-xl bg-[#0e1015] border border-white/5 text-[#a0a5b5] text-sm font-semibold cursor-pointer">Batal</button>
            <button onClick={handleSave} disabled={loading}
              className="flex-1 py-3 rounded-xl bg-white text-[#0e1015] text-sm font-bold cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4 text-green-500" /> : "Simpan"}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setEditMode(true)}
          className="w-full py-3.5 rounded-2xl bg-[#121319] border border-white/5 text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer hover:bg-[#1a1c24] transition-colors mb-4">
          <Edit3 className="w-4 h-4" />
          Edit Profil
        </button>
      )}

      {/* Sign out */}
      <button onClick={onSignOut}
        className="w-full py-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer hover:bg-red-500/15 transition-colors">
        <LogOut className="w-4 h-4" />
        Keluar
      </button>
    </motion.div>
  );
}
