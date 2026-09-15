import React, { useMemo } from 'react';
import { User, Siswa, Jadwal, Agenda, Penilaian, ActiveTab } from '../../types';
import { 
  Users, 
  GraduationCap, 
  CalendarDays, 
  BookOpen, 
  Award, 
  ShieldCheck, 
  Plus, 
  ArrowUpRight,
  TrendingUp,
  FileSpreadsheet,
  Building2
} from 'lucide-react';

interface AdminDashboardProps {
  users: User[];
  siswa: Siswa[];
  jadwal: Jadwal[];
  agenda: Agenda[];
  penilaian: Penilaian[];
  onNavigate: (tab: ActiveTab) => void;
  onOpenSync: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  users,
  siswa,
  jadwal,
  agenda,
  penilaian,
  onNavigate,
  onOpenSync,
}) => {
  const teachers = useMemo(() => users.filter((u) => u.Role === 'Guru'), [users]);

  // Group students by class
  const classBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    siswa.forEach((s) => {
      map[s.Kelas] = (map[s.Kelas] || 0) + 1;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [siswa]);

  // Calculate teacher journal submissions
  const teacherSubmissions = useMemo(() => {
    return teachers.map((teacher) => {
      const teacherAgendas = agenda.filter((a) => a.NIP_Guru === teacher.NIP_Username);
      const teacherPenilaians = penilaian.filter((p) => p.NIP_Guru === teacher.NIP_Username);
      const teacherJadwals = jadwal.filter((j) => j.NIP_Guru === teacher.NIP_Username);

      return {
        ...teacher,
        totalAgenda: teacherAgendas.length,
        totalPenilaian: teacherPenilaians.length,
        totalJadwal: teacherJadwals.length,
        lastAgenda: teacherAgendas.sort((a, b) => b.Tanggal.localeCompare(a.Tanggal))[0],
      };
    });
  }, [teachers, agenda, penilaian, jadwal]);

  return (
    <div className="space-y-6">
      {/* Admin Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 text-white shadow-xl shadow-slate-950/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 px-3 py-1 text-xs font-semibold text-purple-300 border border-purple-400/20 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Pusat Kendali Administrasi & Kurikulum Sekolah</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Rekapitulasi Sistem Agenda 21
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-300">
              Pengelolaan Master Data Guru, Siswa, Jadwal Mengajar, serta Monitoring Jurnal dan Penilaian.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigate('master-guru')}
              className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-xs font-semibold shadow-md active:scale-95 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Kelola Master Data</span>
            </button>
            <button
              onClick={() => onNavigate('pengaturan-kop')}
              className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 text-xs font-semibold border border-slate-700 shadow-md active:scale-95 transition cursor-pointer"
              title="Sesuaikan Kop Surat Laporan Resmi"
            >
              <Building2 className="w-4 h-4 text-sky-400" />
              <span>Modifikasi Kop Surat</span>
            </button>
            <button
              onClick={onOpenSync}
              className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 text-xs font-semibold border border-slate-700 shadow-md active:scale-95 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Sinkron Google Sheet</span>
            </button>
          </div>
        </div>

        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      {/* 5 Master Statistic Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Guru */}
        <div 
          onClick={() => onNavigate('master-guru')}
          className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:shadow-md hover:border-blue-300 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Guru</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{teachers.length}</div>
          <p className="mt-0.5 text-[11px] text-blue-600 font-medium">Buka Master Guru →</p>
        </div>

        {/* Total Siswa */}
        <div 
          onClick={() => onNavigate('master-siswa')}
          className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:shadow-md hover:border-blue-300 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Siswa</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{siswa.length}</div>
          <p className="mt-0.5 text-[11px] text-sky-600 font-medium flex items-center justify-between">
            <span>Buka Master Siswa →</span>
            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-emerald-200/60">
              Import Excel
            </span>
          </p>
        </div>

        {/* Total Jadwal */}
        <div 
          onClick={() => onNavigate('master-jadwal')}
          className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:shadow-md hover:border-blue-300 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Jadwal Aktif</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{jadwal.length}</div>
          <p className="mt-0.5 text-[11px] text-amber-600 font-medium">Buka Master Jadwal →</p>
        </div>

        {/* Total Jurnal Agenda */}
        <div 
          onClick={() => onNavigate('laporan')}
          className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:shadow-md hover:border-blue-300 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Jurnal Masuk</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{agenda.length}</div>
          <p className="mt-0.5 text-[11px] text-emerald-600 font-medium">Rekapitulasi Jurnal →</p>
        </div>

        {/* Total Nilai Terinput */}
        <div 
          onClick={() => onNavigate('laporan')}
          className="col-span-2 lg:col-span-1 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:shadow-md hover:border-blue-300 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Data Nilai</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{penilaian.length}</div>
          <p className="mt-0.5 text-[11px] text-indigo-600 font-medium">Buku Nilai Sekolah →</p>
        </div>
      </div>

      {/* Monitoring Jurnal Guru & Distribusi Kelas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1 & 2: Monitoring Aktivitas Guru */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-700" />
                Monitoring Keaktifan Jurnal & Penilaian Guru
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pemantauan kedisiplinan pengisian jurnal mengajar dan penilaian per guru pengampu.
              </p>
            </div>
            <button
              onClick={() => onNavigate('laporan')}
              className="text-xs font-medium text-blue-700 hover:text-blue-800 flex items-center gap-1"
            >
              Rekap Cetak <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-y border-slate-100 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Guru & NIP</th>
                  <th className="py-2.5 px-3">Mata Pelajaran</th>
                  <th className="py-2.5 px-3 text-center">Jadwal</th>
                  <th className="py-2.5 px-3 text-center">Jurnal</th>
                  <th className="py-2.5 px-3 text-center">Nilai</th>
                  <th className="py-2.5 px-3">Jurnal Terakhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teacherSubmissions.map((t) => (
                  <tr key={t.ID_User} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{t.Nama_Lengkap}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{t.NIP_Username}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-medium">
                      {t.Mata_Pelajaran || '-'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                        {t.totalJadwal} JP
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                        {t.totalAgenda} Sesi
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold">
                        {t.totalPenilaian} Skor
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {t.lastAgenda ? (
                        <div className="text-[11px]">
                          <div className="font-semibold text-slate-800">{t.lastAgenda.Tanggal}</div>
                          <div className="text-slate-400 truncate max-w-[120px]">
                            {t.lastAgenda.Materi_Pokok}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-amber-600 font-medium">Belum ada jurnal</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Col 3: Distribusi Siswa per Kelas */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-blue-700" /> Distribusi Rombel & Siswa
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">{siswa.length} Siswa</span>
            </div>

            <div className="space-y-3">
              {classBreakdown.map(([kelasName, count]) => {
                const percentage = Math.round((count / (siswa.length || 1)) * 100);
                return (
                  <div key={kelasName} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-900">Kelas {kelasName}</span>
                      <span className="font-semibold text-blue-700">{count} Siswa ({percentage}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 rounded-full transition-all duration-500" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
            <button
              onClick={() => onNavigate('master-siswa')}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white py-2 text-xs font-semibold transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Kelola Data Siswa</span>
            </button>
            <button
              onClick={() => onNavigate('master-jadwal')}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 py-2 text-xs font-semibold transition cursor-pointer"
            >
              <span>Atur Jadwal Mengajar</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
