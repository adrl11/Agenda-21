import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { StorageService } from '../../services/storageService';
import { FirestoreService } from '../../services/firestoreService';
import { useToast } from '../../hooks/useToast';
import { Lock, UserCheck, KeyRound, School, ArrowRight, Eye, EyeOff } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { showSuccess, showError } = useToast();
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Pull users from Firestore on mount so accounts created on other devices are available immediately
  useEffect(() => {
    FirestoreService.pullAllFromFirestore().catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nip.trim() || !password.trim()) {
      showError('Form Belum Lengkap', 'Silakan masukkan NIP/Username dan Password Anda.');
      return;
    }

    setLoading(true);

    let users = StorageService.getUsers();
    let found = users.find(
      (u) =>
        u.NIP_Username.toLowerCase() === nip.trim().toLowerCase() &&
        u.Password === password.trim()
    );

    // If not found locally, try pulling latest from Cloud Firestore once
    if (!found) {
      try {
        await FirestoreService.pullAllFromFirestore();
        users = StorageService.getUsers();
        found = users.find(
          (u) =>
            u.NIP_Username.toLowerCase() === nip.trim().toLowerCase() &&
            u.Password === password.trim()
        );
      } catch (err) {
        // ignore network error
      }
    }

    setLoading(false);

    if (found) {
      StorageService.setSession(found);
      showSuccess(
        'Login Berhasil',
        `Selamat datang kembali, ${found.Nama_Lengkap} (${found.Role})`
      );
      onLoginSuccess(found);
    } else {
      showError(
        'Autentikasi Gagal',
        'NIP/Username atau Password tidak cocok. Silakan periksa kembali.'
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4 sm:p-6 text-slate-800">
      <div className="w-full max-w-md">
        {/* Top Brand Card */}
        <div className="mb-6 text-center text-white">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 shadow-xl shadow-blue-500/30 text-white font-black text-2xl tracking-wider">
            21
          </div>
          <h1 className="text-2xl font-black tracking-tight">Agenda 21</h1>
          <p className="mt-1 text-sm text-blue-200">
            Sistem Manajemen Guru, Jurnal Agenda & Penilaian Siswa
          </p>
        </div>

        {/* Login Form Container */}
        <div className="rounded-2xl border border-slate-700/60 bg-white/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-6 pb-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Masuk ke Sistem</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Gunakan kredensial NIP / Username resmi Anda
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                NIP atau Username
              </label>
              <div className="relative">
                <UserCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  placeholder="Masukkan NIP atau Username"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 transition focus:border-blue-600 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kata Sandi (Password)
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-xs sm:text-sm text-slate-900 placeholder-slate-400 transition focus:border-blue-600 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-700/25 hover:bg-blue-800 active:scale-[0.99] transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Memverifikasi Sesi...</span>
                </div>
              ) : (
                <>
                  <span>Masuk Sekarang</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security & Offline Badge */}
        <div className="mt-4 flex items-center justify-center gap-4 text-center text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-blue-400" /> Sesi Aman & Terenkripsi
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <School className="w-3.5 h-3.5 text-sky-400" /> PWA Standalone Ready
          </span>
        </div>
      </div>
    </div>
  );
};
