import React, { useMemo } from 'react';
import { User, Agenda, Penilaian, Jadwal, Siswa, ActiveTab } from '../../types';
import { 
  BookOpen, 
  Award, 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight, 
  Sparkles,
  PlusCircle,
  FileCheck,
  ChevronRight,
  Database
} from 'lucide-react';

interface GuruDashboardProps {
  user: User;
  agendaList: Agenda[];
  penilaianList: Penilaian[];
  jadwalList: Jadwal[];
  siswaList: Siswa[];
  onNavigate: (tab: ActiveTab, prefillData?: { kelas?: string; mapel?: string; jam?: string }) => void;
  onOpenSync?: () => void;
}

export const GuruDashboard: React.FC<GuruDashboardProps> = ({
  user,
  agendaList,
  penilaianList,
  jadwalList,
  siswaList,
  onNavigate,
  onOpenSync,
}) => {
  // Filter data specifically for this logged-in teacher
  const myAgenda = useMemo(() => {
    return agendaList.filter((a) => a.NIP_Guru === user.NIP_Username);
  }, [agendaList, user.NIP_Username]);

  const myPenilaian = useMemo(() => {
    return penilaianList.filter((n) => n.NIP_Guru === user.NIP_Username);
  }, [penilaianList, user.NIP_Username]);

  const myJadwal = useMemo(() => {
    return jadwalList.filter((j) => j.NIP_Guru === user.NIP_Username);
  }, [jadwalList, user.NIP_Username]);

  // Determine current day in Indonesian (Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu)
  const currentDayName = useMemo(() => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;
    const todayIdx = new Date().getDay();
    return days[todayIdx];
  }, []);

  // Today's schedule for this teacher
  const todaySchedules = useMemo(() => {
    return myJadwal.filter((j) => j.Hari === currentDayName);
  }, [myJadwal, currentDayName]);

  // Calculate unique students taught by this teacher based on classes in schedule
  const uniqueClasses = useMemo(() => {
    return Array.from(new Set(myJadwal.map((j) => j.Kelas)));
  }, [myJadwal]);

  const totalSiswaDiajar = useMemo(() => {
    return siswaList.filter((s) => uniqueClasses.includes(s.Kelas)).length;
  }, [siswaList, uniqueClasses]);

  // Calculate average attendance percentage in this teacher's journals
  const avgAttendance = useMemo(() => {
    if (myAgenda.length === 0) return 100;
    const totalPresent = myAgenda.reduce((acc, curr) => acc + (curr.Total_Hadir || 0), 0);
    const totalMax = myAgenda.reduce((acc, curr) => acc + (curr.Total_Siswa || 0), 0);
    if (totalMax === 0) return 100;
    return Math.round((totalPresent / totalMax) * 100);
  }, [myAgenda]);

  return (
    <div className="space-y-6">
      {/* Welcome & Profile Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 p-6 text-white shadow-xl shadow-blue-900/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-200 border border-blue-400/20 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              <span>Portal Guru Pembelajar & Kurikulum Merdeka</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Selamat Bertugas, {user.Nama_Lengkap}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-blue-200">
              NIP: <span className="font-mono text-white">{user.NIP_Username}</span> • Guru Mata Pelajaran:{' '}
              <span className="font-semibold text-white">{user.Mata_Pelajaran || 'Umum'}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigate('agenda')}
              className="flex items-center gap-2 rounded-xl bg-white text-blue-900 px-4 py-2.5 text-xs font-semibold shadow-md hover:bg-blue-50 active:scale-95 transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-blue-700" />
              <span>+ Isi Jurnal Mengajar</span>
            </button>
            <button
              onClick={() => onNavigate('penilaian')}
              className="flex items-center gap-2 rounded-xl bg-blue-700/80 hover:bg-blue-700 text-white px-4 py-2.5 text-xs font-semibold border border-blue-500/40 shadow-md active:scale-95 transition cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>Rekam Nilai Siswa</span>
            </button>
            {onOpenSync && (
              <button
                onClick={onOpenSync}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2.5 text-xs font-semibold shadow-md active:scale-95 transition cursor-pointer"
                title="Kirim Jurnal & Nilai ke Google Sheet Sekolah"
              >
                <Database className="w-4 h-4" />
                <span>Sinkronkan ke Sheet</span>
              </button>
            )}
          </div>
        </div>

        {/* Decorative background glows */}
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 -mb-10 h-40 w-40 rounded-full bg-sky-400/10 blur-2xl" />
      </div>

      {/* 4 Statistics Cards (Tailwind Clean Look) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Jurnal Agenda */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Jurnal Terisi</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{myAgenda.length}</div>
            <p className="mt-0.5 text-xs text-slate-500">Total sesi pembelajaran</p>
          </div>
        </div>

        {/* Card 2: Nilai Tersimpan */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Penilaian Siswa</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{myPenilaian.length}</div>
            <p className="mt-0.5 text-xs text-slate-500">Skor terinput di sistem</p>
          </div>
        </div>

        {/* Card 3: Kehadiran Siswa */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Presensi Mengajar</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-700">{avgAttendance}%</div>
            <p className="mt-0.5 text-xs text-slate-500">Rata-rata kehadiran murid</p>
          </div>
        </div>

        {/* Card 4: Kelas & Siswa */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Siswa Binaan</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{totalSiswaDiajar}</div>
            <p className="mt-0.5 text-xs text-slate-500">{uniqueClasses.length} Rombel Terjadwal</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Jadwal Hari Ini & Riwayat Jurnal Terakhir */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1 & 2: Jadwal Mengajar Hari Ini */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-700" />
                <h3 className="text-base font-bold text-slate-900">Jadwal Mengajar Hari Ini</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Hari aktif: <span className="font-semibold text-blue-700">{currentDayName}</span> •{' '}
                {todaySchedules.length} sesi tatap muka terdaftar
              </p>
            </div>

            <button
              onClick={() => onNavigate('agenda')}
              className="text-xs font-medium text-blue-700 hover:text-blue-800 flex items-center gap-1 transition"
            >
              Lihat Agenda Lengkap <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {todaySchedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
              <Clock className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">Tidak Ada Jadwal Mengajar Hari {currentDayName}</p>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Anda tidak memiliki jam tatap muka terjadwal hari ini. Gunakan waktu untuk persiapan materi atau penilaian.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {todaySchedules.map((jdw) => {
                // Check if agenda for this schedule today is already recorded
                const todayISO = new Date().toISOString().split('T')[0];
                const alreadyFilled = myAgenda.some(
                  (a) => a.Tanggal === todayISO && a.Kelas === jdw.Kelas
                );

                return (
                  <div
                    key={jdw.ID_Jadwal}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-800 font-bold text-sm">
                        {jdw.Kelas}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{jdw.Mata_Pelajaran}</h4>
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700">
                            Kelas {jdw.Kelas}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {jdw.Jam_Mulai} - {jdw.Jam_Selesai} WIB
                          </span>
                          <span>•</span>
                          <span>Kode: {jdw.ID_Jadwal}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {alreadyFilled ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Jurnal Terisi</span>
                        </span>
                      ) : (
                        <button
                          onClick={() =>
                            onNavigate('agenda', {
                              kelas: jdw.Kelas,
                              mapel: jdw.Mata_Pelajaran,
                              jam: `${jdw.Jam_Mulai} - ${jdw.Jam_Selesai}`,
                            })
                          }
                          className="flex items-center gap-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs transition cursor-pointer"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Isi Jurnal Sekarang</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Teacher's All Schedules Accordion / Preview */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Semua Jadwal Mengajar Guru ({myJadwal.length} Sesi Mingguan)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {myJadwal.map((j) => (
                <div key={j.ID_Jadwal} className="p-2.5 rounded-xl border border-slate-200 bg-white">
                  <div className="font-bold text-slate-800">{j.Hari}</div>
                  <div className="text-blue-700 font-semibold">{j.Kelas} - {j.Mata_Pelajaran}</div>
                  <div className="text-[11px] text-slate-500">{j.Jam_Mulai} - {j.Jam_Selesai}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Col 3: Riwayat Jurnal Terakhir & Akses Cepat */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-600" /> Jurnal Terakhir
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">{myAgenda.length} Sesi</span>
            </div>

            {myAgenda.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Belum ada catatan agenda.</p>
            ) : (
              <div className="space-y-3">
                {myAgenda.slice(0, 4).map((agd) => (
                  <div key={agd.ID_Agenda} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-blue-900">Kelas {agd.Kelas}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{agd.Tanggal}</span>
                    </div>
                    <p className="text-slate-700 line-clamp-2 font-medium">{agd.Materi_Pokok}</p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-200/60">
                      <span>Kehadiran: <strong>{agd.Total_Hadir}/{agd.Total_Siswa}</strong></span>
                      <span className="px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                        {agd.Status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={() => onNavigate('laporan')}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 py-2 text-xs font-semibold transition cursor-pointer"
            >
              <span>Lihat Laporan Lengkap</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
