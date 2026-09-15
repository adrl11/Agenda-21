import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { useOnlineStatus } from '../../hooks/usePWAInstall';
import { 
  Calendar, 
  Clock, 
  Search, 
  LogOut, 
  User as UserIcon, 
  Database,
  Menu,
  CheckCircle2,
  AlertCircle,
  Cloud,
  RefreshCw
} from 'lucide-react';

interface TopBarProps {
  user: User;
  onLogout: () => void;
  onOpenSync: () => void;
  onQuickCloudSync?: () => void;
  isCloudSyncing?: boolean;
  onToggleSidebar?: () => void;
  onToggleMobileMenu?: () => void;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  onOpenProfile?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  user,
  onLogout,
  onOpenSync,
  onQuickCloudSync,
  isCloudSyncing = false,
  onToggleSidebar,
  onToggleMobileMenu,
  searchQuery = '',
  setSearchQuery,
  onOpenProfile,
}) => {
  const isOnline = useOnlineStatus();
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [mobileDayStr, setMobileDayStr] = useState<string>('');
  const [mobileDateStr, setMobileDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Indonesian Date Format
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      setDateStr(now.toLocaleDateString('id-ID', options));
      setTimeStr(
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB'
      );
      setMobileDayStr(now.toLocaleDateString('id-ID', { weekday: 'long' }));
      setMobileDateStr(now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-[#0f172a] px-3 sm:px-6 shadow-sm transition-all">
      {/* Left: Mobile Menu Toggle, Date & Search */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onToggleSidebar || onToggleMobileMenu}
          className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 hover:text-white transition focus:outline-hidden lg:hidden cursor-pointer"
          aria-label="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile: Day & Date Widget */}
        <div className="flex sm:hidden flex-col justify-center leading-tight">
          <div className="flex items-center gap-1 text-xs font-bold text-slate-100">
            <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>{mobileDayStr || 'Hari ini'}</span>
          </div>
          <span className="text-[10px] text-slate-400 pl-4.5 font-medium">
            {mobileDateStr}
          </span>
        </div>

        {/* Desktop: Date & Time Widget */}
        <div className="hidden sm:flex items-center gap-3 text-xs border-r border-slate-800 pr-4">
          <div className="flex items-center gap-1.5 font-medium text-slate-200">
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            <span>{dateStr || 'Memuat...'}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400 font-mono">
            <Clock className="w-3 h-3 text-slate-500" />
            <span className="text-slate-300">{timeStr}</span>
          </div>
        </div>

        {/* Global Local Search */}
        <div className="relative hidden md:block w-52 lg:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kelas, siswa, atau mapel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery?.(e.target.value)}
            className="w-full rounded-xl border border-slate-700/70 bg-slate-800/80 py-1.5 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-400 transition focus:border-blue-500 focus:bg-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Right: Connectivity, PWA, Sync & User info */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Connectivity status pill */}
        <div 
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            isOnline 
              ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30' 
              : 'bg-rose-950/70 text-rose-300 border border-rose-500/30'
          }`}
          title={isOnline ? 'Cloud Firestore Terhubung & Aktif' : 'Sedang Bekerja Offline'}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
          <Cloud className={`w-3.5 h-3.5 ${isOnline ? 'text-emerald-400' : 'text-rose-400'}`} />
          <span>{isOnline ? 'Cloud Aktif' : 'Offline'}</span>
        </div>

        {/* Quick Cloud Sync Button */}
        {onQuickCloudSync && (
          <button
            type="button"
            onClick={onQuickCloudSync}
            disabled={isCloudSyncing}
            className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/15 px-2.5 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/25 hover:border-amber-400/60 transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
            title="Sinkronkan data instan antar-perangkat via Cloud Firestore"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-300 shrink-0 ${isCloudSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isCloudSyncing ? 'Sinkron...' : 'Sinkron Cloud'}</span>
          </button>
        )}

        {/* PWA Install Button */}
        <PWAInstallButton />

        {/* User Card & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2.5 rounded-xl p-1.5 text-left hover:bg-slate-800/80 border border-transparent hover:border-slate-700/60 transition cursor-pointer"
            title="Klik untuk melihat profil"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-sky-500 font-bold text-white text-xs shadow-xs">
              {user.Nama_Lengkap.charAt(0)}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-slate-100 leading-tight truncate max-w-[140px]">
                {user.Nama_Lengkap}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className={`px-1.5 py-0.2 rounded font-bold ${user.Role === 'Admin' ? 'bg-purple-900/60 text-purple-300 border border-purple-500/30' : 'bg-blue-900/60 text-blue-300 border border-blue-500/30'}`}>
                  {user.Role}
                </span>
                <span className="truncate max-w-[90px]">{user.NIP_Username}</span>
              </div>
            </div>
          </button>

          <button
            onClick={onLogout}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-950/60 hover:text-rose-400 transition cursor-pointer"
            title="Keluar (Logout)"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
