import React from 'react';
import { User, ActiveTab } from '../../types';
import { 
  LayoutDashboard, 
  BookOpen, 
  Award, 
  FileText, 
  Users, 
  GraduationCap, 
  CalendarDays, 
  Database, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Building2,
  X
} from 'lucide-react';

interface SidebarProps {
  user?: User | null;
  userRole?: 'Guru' | 'Admin';
  activeTab: ActiveTab;
  setActiveTab?: (tab: ActiveTab) => void;
  onSelectTab?: (tab: ActiveTab) => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen?: (open: boolean) => void;
  onCloseMobile?: () => void;
  onOpenSync?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  userRole,
  activeTab,
  setActiveTab,
  onSelectTab,
  isCollapsed = false,
  setIsCollapsed,
  mobileOpen,
  setMobileOpen,
  onCloseMobile,
  onOpenSync,
}) => {
  const role = user?.Role || userRole || 'Guru';
  const isAdmin = role === 'Admin';

  const navItems = isAdmin
    ? [
        {
          id: 'dashboard' as ActiveTab,
          label: 'Dashboard Rekap',
          icon: LayoutDashboard,
          category: 'Utama',
        },
        {
          id: 'master-guru' as ActiveTab,
          label: 'Master Guru',
          icon: Users,
          category: 'Master Data',
        },
        {
          id: 'master-siswa' as ActiveTab,
          label: 'Master Siswa',
          icon: GraduationCap,
          category: 'Master Data',
        },
        {
          id: 'master-jadwal' as ActiveTab,
          label: 'Master Jadwal',
          icon: CalendarDays,
          category: 'Master Data',
        },
        {
          id: 'pengaturan-kop' as ActiveTab,
          label: 'Kop & Profil Sekolah',
          icon: Building2,
          category: 'Master Data',
        },
        {
          id: 'laporan' as ActiveTab,
          label: 'Rekap & Laporan',
          icon: FileText,
          category: 'Laporan',
        },
        {
          id: 'integrasi-sheet' as ActiveTab,
          label: 'Integrasi Google Sheet',
          icon: Database,
          category: 'Sistem',
        },
      ]
    : [
        {
          id: 'dashboard' as ActiveTab,
          label: 'Dashboard Guru',
          icon: LayoutDashboard,
          category: 'Utama',
        },
        {
          id: 'agenda' as ActiveTab,
          label: 'Agenda Harian',
          icon: BookOpen,
          category: 'Aktivitas',
        },
        {
          id: 'penilaian' as ActiveTab,
          label: 'Input Penilaian',
          icon: Award,
          category: 'Aktivitas',
        },
        {
          id: 'laporan' as ActiveTab,
          label: 'Rekap & Laporan',
          icon: FileText,
          category: 'Laporan',
        },
      ];

  const handleSelect = (tab: ActiveTab) => {
    if (tab === 'integrasi-sheet') {
      onOpenSync?.();
    } else {
      setActiveTab?.(tab);
      onSelectTab?.(tab);
    }
    setMobileOpen?.(false);
    onCloseMobile?.();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => {
            setMobileOpen?.(false);
            onCloseMobile?.();
          }}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r border-slate-800 bg-[#0f172a] text-slate-200 transition-all duration-300 ease-in-out lg:static ${
          mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-700 to-sky-500 shadow-md shadow-blue-500/20 font-bold text-white tracking-wider text-base">
              21
            </div>
            {(!isCollapsed || mobileOpen) && (
              <div className="truncate">
                <h1 className="text-sm font-bold tracking-tight text-white leading-tight">
                  Agenda 21
                </h1>
                <p className="text-[11px] text-blue-400 font-medium truncate">
                  Manajemen Guru
                </p>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          {setIsCollapsed && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
              aria-label={isCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}

          {/* Mobile Close Button */}
          <button
            onClick={() => {
              setMobileOpen?.(false);
              onCloseMobile?.();
            }}
            className="flex lg:hidden h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
            aria-label="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Identity Pill (In Sidebar) */}
        {(!isCollapsed || mobileOpen) && user && (
          <div className="mx-3 my-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">
                {isAdmin ? <ShieldCheck className="w-5 h-5" /> : (user.Nama_Lengkap?.charAt(0) || 'G')}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-white truncate">{user.Nama_Lengkap}</div>
                <div className="text-[11px] text-slate-400 truncate">
                  {isAdmin ? 'Administrator Utama' : user.Mata_Pelajaran || 'Guru Pengampu'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
                }`}
                title={item.label}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'}`} />
                {(!isCollapsed || mobileOpen) && (
                  <span className="truncate">{item.label}</span>
                )}
                {isActive && (!isCollapsed || mobileOpen) && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer info & PWA Badge */}
        <div className="border-t border-slate-800 p-3">
          {(!isCollapsed || mobileOpen) ? (
            <div className="rounded-xl bg-slate-800/40 p-2.5 text-center text-[10px] text-slate-500 border border-slate-800">
              <div className="flex items-center justify-center gap-1 font-semibold text-slate-400 mb-0.5">
                <Sparkles className="w-3 h-3 text-blue-400" />
                <span>PWA Agenda 21 v1.0</span>
              </div>
              <span>{isAdmin ? 'Google Sheet & Apps Script Ready' : 'Buku Agenda & Jurnal Digital'}</span>
            </div>
          ) : (
            <div className="flex justify-center text-[10px] font-bold text-slate-500">
              v1.0
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
