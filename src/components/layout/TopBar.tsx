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
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 backdrop-blur-md transition-all">
      {/* Left: Mobile Menu Toggle & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar || onToggleMobileMenu}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition focus:outline-hidden lg:hidden cursor-pointer"
          aria-label="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Date & Time Widget (Clean look) */}
        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-600 border-r border-slate-200 pr-4">
          <div className="flex items-center gap-1.5 font-medium text-slate-800">
            <Calendar className="w-3.5 h-3.5 text-blue-700" />
            <span>{dateStr || 'Memuat...'}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-500 font-mono">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{timeStr}</span>
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
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 transition focus:border-blue-600 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Right: Connectivity, PWA, Sync & User info */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Connectivity status pill */}
        <div 
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}
          title={isOnline ? 'Cloud Firestore Terhubung & Aktif' : 'Sedang Bekerja Offline'}
        >
          <Cloud className={`w-3.5 h-3.5 ${isOnline ? 'text-emerald-600' : 'text-amber-600'}`} />
          <span>{isOnline ? 'Cloud Aktif' : 'Offline'}</span>
        </div>

        {/* Quick Cloud Sync Button */}
        {onQuickCloudSync && (
          <button
            type="button"
            onClick={onQuickCloudSync}
            disabled={isCloudSyncing}
            className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/80 px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition cursor-pointer shadow-2xs disabled:opacity-50"
            title="Sinkronkan data instan antar-perangkat via Cloud Firestore"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-700 shrink-0 ${isCloudSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isCloudSyncing ? 'Sinkron...' : 'Sinkron Cloud'}</span>
          </button>
        )}

        {/* PWA Install Button */}
        <PWAInstallButton />

        {/* User Card & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2.5 rounded-xl p-1.5 text-left hover:bg-slate-50 transition cursor-pointer"
            title="Klik untuk melihat profil"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 font-semibold text-white text-xs shadow-xs">
              {user.Nama_Lengkap.charAt(0)}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-slate-900 leading-tight truncate max-w-[140px]">
                {user.Nama_Lengkap}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className={`px-1.5 py-0.2 rounded font-bold ${user.Role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                  {user.Role}
                </span>
                <span className="truncate max-w-[90px]">{user.NIP_Username}</span>
              </div>
            </div>
          </button>

          <button
            onClick={onLogout}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
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
