import React, { useState, useMemo, useEffect } from 'react';
import { User, Agenda, Siswa, Jadwal, AgendaStatus, KehadiranStatus, PresensiSiswaItem } from '../../types';
import { StorageService } from '../../services/storageService';
import { useToast } from '../../hooks/useToast';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Users, 
  Filter, 
  FileDown, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Lock,
  RotateCcw,
  Printer,
  Database,
  Check,
  UserCheck,
  UserX,
  AlertCircle
} from 'lucide-react';

interface AgendaHarianViewProps {
  user: User;
  agendaList: Agenda[];
  siswaList: Siswa[];
  jadwalList: Jadwal[];
  onRefresh: () => void;
  prefillData?: { kelas?: string; mapel?: string; jam?: string };
  onOpenSync?: () => void;
}

export const AgendaHarianView: React.FC<AgendaHarianViewProps> = ({
  user,
  agendaList,
  siswaList,
  jadwalList,
  onRefresh,
  prefillData,
  onOpenSync,
}) => {
  const { showSuccess, showError, showInfo } = useToast();
  const isAdmin = user?.Role === 'Admin';

  // Filter agenda by teacher if role is Guru, or all if Admin
  const relevantAgendas = useMemo(() => {
    if (isAdmin) return agendaList;
    return agendaList.filter((a) => a.NIP_Guru === user?.NIP_Username);
  }, [agendaList, isAdmin, user?.NIP_Username]);

  // Available classes from student data
  const availableClasses = useMemo(() => {
    return Array.from(new Set(siswaList.map((s) => s.Kelas))).sort();
  }, [siswaList]);

  // Today's date YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tanggal, setTanggal] = useState<string>(todayStr);
  const [jamKe, setJamKe] = useState<string>('1 - 2');
  const [kelas, setKelas] = useState<string>(availableClasses[0] || '7A');
  const [mataPelajaran, setMataPelajaran] = useState<string>(user.Mata_Pelajaran || 'Informatika');
  const [materiPokok, setMateriPokok] = useState<string>('');
  const [status, setStatus] = useState<AgendaStatus>('Terlaksana');
  const [catatanRefleksi, setCatatanRefleksi] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Student Attendance State
  const [attendanceMap, setAttendanceMap] = useState<Record<string, KehadiranStatus>>({});
  const [studentSearch, setStudentSearch] = useState<string>('');

  // Apply prefill data from dashboard quick links if provided
  useEffect(() => {
    if (prefillData) {
      if (prefillData.kelas) setKelas(prefillData.kelas);
      if (prefillData.mapel) setMataPelajaran(prefillData.mapel);
      if (prefillData.jam) setJamKe(prefillData.jam);
    }
  }, [prefillData]);

  // Students in currently selected class
  const currentClassStudents = useMemo(() => {
    return siswaList
      .filter((s) => s.Kelas === kelas)
      .sort((a, b) => a.Nama_Siswa.localeCompare(b.Nama_Siswa));
  }, [siswaList, kelas]);

  // Auto-calculate total students in selected class
  const totalSiswaDiKelas = currentClassStudents.length;

  // Sync attendance map whenever currentClassStudents changes (preserve existing choices)
  useEffect(() => {
    setAttendanceMap((prev) => {
      const nextMap: Record<string, KehadiranStatus> = {};
      currentClassStudents.forEach((s) => {
        nextMap[s.NISN] = prev[s.NISN] || 'Hadir';
      });
      return nextMap;
    });
  }, [currentClassStudents]);

  // Filtered students for in-form search
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return currentClassStudents;
    const q = studentSearch.toLowerCase();
    return currentClassStudents.filter(
      (s) => s.Nama_Siswa.toLowerCase().includes(q) || s.NISN.includes(q)
    );
  }, [currentClassStudents, studentSearch]);

  // Attendance statistics counter
  const attendanceCounts = useMemo(() => {
    let hadir = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;

    currentClassStudents.forEach((s) => {
      const st = attendanceMap[s.NISN] || 'Hadir';
      if (st === 'Hadir') hadir++;
      else if (st === 'Sakit') sakit++;
      else if (st === 'Izin') izin++;
      else if (st === 'Alpa') alpa++;
    });

    return { hadir, sakit, izin, alpa, total: currentClassStudents.length };
  }, [currentClassStudents, attendanceMap]);

  // Set all students to a specific status
  const setAllAttendance = (st: KehadiranStatus) => {
    const nextMap: Record<string, KehadiranStatus> = {};
    currentClassStudents.forEach((s) => {
      nextMap[s.NISN] = st;
    });
    setAttendanceMap(nextMap);
  };

  // Change individual student attendance status
  const handleStudentStatusChange = (nisn: string, st: KehadiranStatus) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [nisn]: st,
    }));
  };

  // Local Table Filter & Pagination States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterKelas, setFilterKelas] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Filtered and searched data
  const filteredData = useMemo(() => {
    return relevantAgendas.filter((item) => {
      const matchQuery =
        item.Materi_Pokok.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.Kelas.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.Mata_Pelajaran.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.Tanggal.includes(searchQuery);

      const matchKelas = filterKelas === 'all' || item.Kelas === filterKelas;
      const matchStatus = filterStatus === 'all' || item.Status === filterStatus;

      return matchQuery && matchKelas && matchStatus;
    });
  }, [relevantAgendas, searchQuery, filterKelas, filterStatus]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Reset Form
  const resetForm = () => {
    setEditingId(null);
    setTanggal(todayStr);
    setJamKe('1 - 2');
    const defaultClass = availableClasses[0] || '7A';
    setKelas(defaultClass);
    setMataPelajaran(user.Mata_Pelajaran || 'Informatika');
    setMateriPokok('');
    setStatus('Terlaksana');
    setCatatanRefleksi('');
    setStudentSearch('');

    const defaultStudents = siswaList.filter((s) => s.Kelas === defaultClass);
    const nextMap: Record<string, KehadiranStatus> = {};
    defaultStudents.forEach((s) => {
      nextMap[s.NISN] = 'Hadir';
    });
    setAttendanceMap(nextMap);
  };

  // Populate form for editing
  const handleEdit = (item: Agenda) => {
    setEditingId(item.ID_Agenda);
    setTanggal(item.Tanggal);
    setJamKe(item.Jam_Ke);
    setKelas(item.Kelas);
    setMataPelajaran(item.Mata_Pelajaran);
    setMateriPokok(item.Materi_Pokok);
    setStatus(item.Status);
    setCatatanRefleksi(item.Catatan_Refleksi || '');
    setStudentSearch('');

    // Restore student attendance if present
    const nextMap: Record<string, KehadiranStatus> = {};
    if (item.Daftar_Presensi && item.Daftar_Presensi.length > 0) {
      item.Daftar_Presensi.forEach((p) => {
        nextMap[p.NISN] = p.Status;
      });
    } else {
      const studs = siswaList.filter((s) => s.Kelas === item.Kelas);
      studs.forEach((s) => {
        nextMap[s.NISN] = 'Hadir';
      });
    }
    setAttendanceMap(nextMap);

    window.scrollTo({ top: 0, behavior: 'smooth' });
    showInfo('Mode Edit Aktif', `Mengedit Jurnal ID: ${item.ID_Agenda}`);
  };

  // Delete Agenda
  const handleDelete = (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus jurnal agenda mengajar ini?')) {
      StorageService.deleteAgenda(id);
      showSuccess('Jurnal Dihapus', 'Data agenda berhasil dihapus dari database.');
      onRefresh();
    }
  };

  // Submit Handler with simulated LockService lock
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materiPokok.trim()) {
      showError('Form Belum Lengkap', 'Silakan masukkan Materi Pokok pembelajaran.');
      return;
    }

    setIsSubmitting(true);

    try {
      const idAgenda = editingId || `AGD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      const daftarPresensi: PresensiSiswaItem[] = currentClassStudents.map((s) => ({
        NISN: s.NISN,
        Nama_Siswa: s.Nama_Siswa,
        Status: attendanceMap[s.NISN] || 'Hadir',
      }));

      const newAgenda: Agenda = {
        ID_Agenda: idAgenda,
        NIP_Guru: editingId
          ? relevantAgendas.find((a) => a.ID_Agenda === editingId)?.NIP_Guru || user.NIP_Username
          : user.NIP_Username,
        Tanggal: tanggal,
        Jam_Ke: jamKe,
        Kelas: kelas,
        Mata_Pelajaran: mataPelajaran,
        Materi_Pokok: materiPokok.trim(),
        Total_Hadir: attendanceCounts.hadir,
        Total_Siswa: currentClassStudents.length || totalSiswaDiKelas,
        Sakit: attendanceCounts.sakit,
        Izin: attendanceCounts.izin,
        Alpa: attendanceCounts.alpa,
        Daftar_Presensi: daftarPresensi,
        Status: status,
        Catatan_Refleksi: catatanRefleksi.trim(),
        CreatedAt: new Date().toISOString(),
      };

      await StorageService.saveAgendaItem(newAgenda);

      showSuccess(
        editingId ? 'Jurnal Diperbarui' : 'Jurnal Tersimpan',
        `Data agenda mengajar kelas ${kelas} berhasil disimpan via LockService.`
      );
      resetForm();
      onRefresh();
    } catch (err: any) {
      showError('Gagal Menyimpan', err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    const csvData = StorageService.exportToCSV('Agenda');
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Agenda_Mengajar_${user.NIP_Username}_${todayStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess('Export Berhasil', 'File CSV Agenda Mengajar telah diunduh.');
  };

  return (
    <div className="space-y-6">
      {/* Header View */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-700" />
            <h2 className="text-xl font-bold text-slate-900">Agenda Harian & Jurnal Mengajar</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Perekaman aktivitas tatap muka kelas, materi pokok, presensi siswa, dan refleksi pembelajaran.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-700 transition cursor-pointer shadow-2xs"
          >
            <FileDown className="w-4 h-4 text-emerald-600" />
            <span>Export ke CSV</span>
          </button>
        </div>
      </div>

      {/* Interactive Form (Grid Layout) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-800 text-xs font-bold">
              {editingId ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              {editingId ? 'Edit Jurnal Agenda' : 'Formulir Input Jurnal Mengajar Baru'}
            </h3>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Batal Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Tanggal, Jam Ke, Kelas, Mapel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Pembelajaran
              </label>
              <input
                type="date"
                required
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 transition focus:border-blue-600 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jam Pelajaran Ke-
              </label>
              <select
                value={jamKe}
                onChange={(e) => setJamKe(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 transition focus:border-blue-600 focus:bg-white focus:outline-hidden"
              >
                <option value="1 - 2">Jam ke 1 - 2 (07:30 - 09:00)</option>
                <option value="3 - 4">Jam ke 3 - 4 (09:30 - 11:00)</option>
                <option value="5 - 6">Jam ke 5 - 6 (11:15 - 12:45)</option>
                <option value="7 - 8">Jam ke 7 - 8 (13:15 - 14:45)</option>
                <option value="1 - 3">Jam ke 1 - 3 (Blok 3 Jam)</option>
                <option value="4 - 6">Jam ke 4 - 6 (Blok 3 Jam)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rombel / Kelas
              </label>
              <select
                value={kelas}
                onChange={(e) => setKelas(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 font-semibold text-blue-900 transition focus:border-blue-600 focus:bg-white focus:outline-hidden"
              >
                {availableClasses.map((k) => (
                  <option key={k} value={k}>
                    Kelas {k}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mata Pelajaran
              </label>
              <input
                type="text"
                required
                value={mataPelajaran}
                onChange={(e) => setMataPelajaran(e.target.value)}
                placeholder="Contoh: Informatika"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 transition focus:border-blue-600 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          {/* Row 2: Materi Pokok & Status Pelaksanaan */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Materi Pokok / Capaian Pembelajaran (CP / TP) *
              </label>
              <textarea
                required
                rows={2}
                value={materiPokok}
                onChange={(e) => setMateriPokok(e.target.value)}
                placeholder="Deskripsikan judul materi dan aktivitas inti pembelajaran yang dilakukan..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 transition focus:border-blue-600 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Pelaksanaan Pembelajaran
              </label>
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {(['Terlaksana', 'Diganti', 'Tugas Mandiri'] as AgendaStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatus(st)}
                    className={`py-2 px-1 text-center rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                      status === st
                        ? st === 'Terlaksana'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : st === 'Diganti'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 3: Catatan Refleksi Pembelajaran */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan Refleksi Guru / Kendala Pembelajaran / Keterangan Tambahan
            </label>
            <input
              type="text"
              value={catatanRefleksi}
              onChange={(e) => setCatatanRefleksi(e.target.value)}
              placeholder="Contoh: Pembelajaran berjalan tertib. Siswa aktif berdiskusi. Perlu pengulangan materi logika minggu depan."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 transition focus:border-blue-600 focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Row 4: Daftar Siswa & Presensi Kehadiran Interaktif */}
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/40 to-slate-50/70 p-4 space-y-3">
            {/* Presensi Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-100/70">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white text-xs">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Presensi Kehadiran Siswa Kelas {kelas}</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      ({currentClassStudents.length} Siswa)
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Pilih status kehadiran setiap siswa: Hadir (H), Sakit (S), Izin (I), atau Alpa (A).
                  </p>
                </div>
              </div>

              {/* Summary Badges & Quick Action */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  H: {attendanceCounts.hadir}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 text-amber-800 text-[11px] font-bold">
                  S: {attendanceCounts.sakit}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-100 text-blue-800 text-[11px] font-bold">
                  I: {attendanceCounts.izin}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-100 text-rose-800 text-[11px] font-bold">
                  A: {attendanceCounts.alpa}
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded-lg bg-slate-200/80 text-slate-700 text-[11px] font-bold ml-1">
                  {Math.round((attendanceCounts.hadir / (currentClassStudents.length || 1)) * 100)}%
                </span>

                <button
                  type="button"
                  onClick={() => setAllAttendance('Hadir')}
                  className="inline-flex items-center gap-1 ml-2 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition cursor-pointer shadow-2xs"
                  title="Tandai semua siswa di kelas ini hadir"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Semua Hadir</span>
                </button>
              </div>
            </div>

            {/* In-form Mini Search if students exist */}
            {currentClassStudents.length > 5 && (
              <div className="relative max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama atau NISN siswa..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-1 pl-7 pr-2.5 text-[11px] text-slate-800 focus:border-blue-600 focus:outline-hidden"
                />
              </div>
            )}

            {/* Student List Container */}
            {currentClassStudents.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-white text-center">
                <AlertCircle className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <p className="text-xs font-semibold text-slate-700">
                  Belum ada data siswa untuk Kelas {kelas} di Master Siswa.
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tambahkan siswa melalui menu <strong>Master Siswa</strong> agar daftar presensi otomatis terisi.
                </p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
                Tidak ada siswa yang cocok dengan pencarian "{studentSearch}".
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-2xs">
                {filteredStudents.map((siswa, idx) => {
                  const currentStatus = attendanceMap[siswa.NISN] || 'Hadir';

                  return (
                    <div
                      key={siswa.NISN}
                      className="flex flex-col sm:flex-row sm:items-center justify-between px-3 py-2 gap-2 hover:bg-slate-50/70 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[11px] font-mono text-slate-400 w-5 text-right">
                          {idx + 1}.
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800 truncate">
                              {siswa.Nama_Siswa}
                            </span>
                            {siswa.Jenis_Kelamin && (
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  siswa.Jenis_Kelamin === 'L'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-rose-100 text-rose-700'
                                }`}
                              >
                                {siswa.Jenis_Kelamin}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            NISN: {siswa.NISN}
                          </div>
                        </div>
                      </div>

                      {/* Pill buttons for H, S, I, A */}
                      <div className="flex items-center gap-1 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleStudentStatusChange(siswa.NISN, 'Hadir')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                            currentStatus === 'Hadir'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                          title="Hadir"
                        >
                          H
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStudentStatusChange(siswa.NISN, 'Sakit')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                            currentStatus === 'Sakit'
                              ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700'
                          }`}
                          title="Sakit"
                        >
                          S
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStudentStatusChange(siswa.NISN, 'Izin')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                            currentStatus === 'Izin'
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700'
                          }`}
                          title="Izin"
                        >
                          I
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStudentStatusChange(siswa.NISN, 'Alpa')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                            currentStatus === 'Alpa'
                              ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-700'
                          }`}
                          title="Alpa / Tanpa Keterangan"
                        >
                          A
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Submit Actions with LockService simulation */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Lock className="w-3.5 h-3.5 text-blue-500" />
              <span>Diproteksi LockService anti-tabrakan data</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white px-5 py-2.5 text-xs font-semibold shadow-md shadow-blue-700/20 active:scale-95 transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menyimpan via LockService...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{editingId ? 'Simpan Perubahan' : 'Simpan Jurnal Mengajar'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Tabel Data (DataTables-like) with Local Search & Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Riwayat Jurnal Agenda Mengajar ({filteredData.length} Catatan)
            </h3>
            <p className="text-xs text-slate-500">
              Daftar rekam jejak jurnal mengajar harian yang tersimpan di sistem.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari materi / kelas..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-hidden"
              />
            </div>

            {/* Filter Kelas */}
            <select
              value={filterKelas}
              onChange={(e) => {
                setFilterKelas(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-600 focus:outline-hidden"
            >
              <option value="all">Semua Kelas</option>
              {availableClasses.map((k) => (
                <option key={k} value={k}>
                  Kelas {k}
                </option>
              ))}
            </select>

            {/* Filter Status */}
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-blue-600 focus:outline-hidden"
            >
              <option value="all">Semua Status</option>
              <option value="Terlaksana">Terlaksana</option>
              <option value="Diganti">Diganti</option>
              <option value="Tugas Mandiri">Tugas Mandiri</option>
            </select>
          </div>
        </div>

        {/* Responsive Table / Card List */}
        {paginatedData.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Tidak ditemukan data jurnal yang sesuai dengan pencarian atau filter.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-y border-slate-100 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Tanggal & Jam</th>
                    <th className="py-2.5 px-3">Kelas & Mapel</th>
                    <th className="py-2.5 px-3">Materi Pokok & Refleksi</th>
                    <th className="py-2.5 px-3 text-center">Presensi</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedData.map((item) => (
                    <tr key={item.ID_Agenda} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{item.Tanggal}</div>
                        <div className="text-[11px] text-slate-500 font-medium">Jam {item.Jam_Ke}</div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                          {item.Kelas}
                        </span>
                        <div className="text-[11px] text-slate-600 mt-1">{item.Mata_Pelajaran}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800 line-clamp-1">
                          {item.Materi_Pokok}
                        </div>
                        {item.Catatan_Refleksi && (
                          <div className="text-[11px] text-slate-500 italic line-clamp-1 mt-0.5">
                            "{item.Catatan_Refleksi}"
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="font-bold text-slate-800">
                          {item.Total_Hadir}/{item.Total_Siswa}
                        </span>
                        <div className="text-[10px] text-emerald-600 font-semibold">
                          {Math.round((item.Total_Hadir / (item.Total_Siswa || 1)) * 100)}%
                        </div>
                        {(Boolean(item.Sakit) || Boolean(item.Izin) || Boolean(item.Alpa)) && (
                          <div className="flex items-center justify-center gap-1 mt-1 text-[9px] font-bold">
                            {Boolean(item.Sakit) && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800" title={`Sakit: ${item.Sakit}`}>
                                S: {item.Sakit}
                              </span>
                            )}
                            {Boolean(item.Izin) && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800" title={`Izin: ${item.Izin}`}>
                                I: {item.Izin}
                              </span>
                            )}
                            {Boolean(item.Alpa) && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800" title={`Alpa: ${item.Alpa}`}>
                                A: {item.Alpa}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.Status === 'Terlaksana'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.Status === 'Diganti'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {item.Status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            title="Edit Jurnal"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.ID_Agenda)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Hapus Jurnal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="block md:hidden space-y-3">
              {paginatedData.map((item) => (
                <div
                  key={item.ID_Agenda}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded-md">
                        {item.Kelas}
                      </span>
                      <span className="font-semibold text-slate-800">{item.Mata_Pelajaran}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.Status === 'Terlaksana'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.Status}
                    </span>
                  </div>

                  <p className="font-medium text-slate-900">{item.Materi_Pokok}</p>
                  {item.Catatan_Refleksi && (
                    <p className="text-[11px] text-slate-500 italic">"{item.Catatan_Refleksi}"</p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 text-[11px] text-slate-500">
                    <span>
                      {item.Tanggal} • Jam {item.Jam_Ke}
                    </span>
                    <div className="text-right">
                      <div>
                        Hadir: <strong>{item.Total_Hadir}/{item.Total_Siswa}</strong>
                      </div>
                      {(Boolean(item.Sakit) || Boolean(item.Izin) || Boolean(item.Alpa)) && (
                        <div className="text-[10px] space-x-1 font-semibold text-slate-500">
                          {Boolean(item.Sakit) && <span className="text-amber-700">S:{item.Sakit}</span>}
                          {Boolean(item.Izin) && <span className="text-blue-700">I:{item.Izin}</span>}
                          {Boolean(item.Alpa) && <span className="text-rose-700">A:{item.Alpa}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleEdit(item)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold text-[11px]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.ID_Agenda)}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-semibold text-[11px]"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 mt-4 text-xs text-slate-500">
              <div>
                Menampilkan {(currentPage - 1) * pageSize + 1} -{' '}
                {Math.min(currentPage * pageSize, filteredData.length)} dari {filteredData.length} jurnal
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
                </button>
                <span className="font-medium text-slate-800">
                  Halaman {currentPage} dari {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
                >
                  Berikutnya <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
