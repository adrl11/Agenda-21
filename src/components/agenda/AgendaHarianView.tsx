import React, { useState, useMemo, useEffect } from 'react';
import { User, Agenda, Siswa, Jadwal, AgendaStatus } from '../../types';
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
  Database
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
  const [totalHadir, setTotalHadir] = useState<number>(10);
  const [status, setStatus] = useState<AgendaStatus>('Terlaksana');
  const [catatanRefleksi, setCatatanRefleksi] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Apply prefill data from dashboard quick links if provided
  useEffect(() => {
    if (prefillData) {
      if (prefillData.kelas) setKelas(prefillData.kelas);
      if (prefillData.mapel) setMataPelajaran(prefillData.mapel);
      if (prefillData.jam) setJamKe(prefillData.jam);
    }
  }, [prefillData]);

  // Auto-calculate total students in selected class
  const totalSiswaDiKelas = useMemo(() => {
    return siswaList.filter((s) => s.Kelas === kelas).length || 10;
  }, [siswaList, kelas]);

  // Adjust totalHadir when class changes
  useEffect(() => {
    setTotalHadir(totalSiswaDiKelas);
  }, [totalSiswaDiKelas]);

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
    setKelas(availableClasses[0] || '7A');
    setMataPelajaran(user.Mata_Pelajaran || 'Informatika');
    setMateriPokok('');
    setTotalHadir(totalSiswaDiKelas);
    setStatus('Terlaksana');
    setCatatanRefleksi('');
  };

  // Populate form for editing
  const handleEdit = (item: Agenda) => {
    setEditingId(item.ID_Agenda);
    setTanggal(item.Tanggal);
    setJamKe(item.Jam_Ke);
    setKelas(item.Kelas);
    setMataPelajaran(item.Mata_Pelajaran);
    setMateriPokok(item.Materi_Pokok);
    setTotalHadir(item.Total_Hadir);
    setStatus(item.Status);
    setCatatanRefleksi(item.Catatan_Refleksi);
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
        Total_Hadir: Number(totalHadir),
        Total_Siswa: totalSiswaDiKelas,
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

          {/* Row 2: Materi Pokok & Presensi Kehadiran */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Materi Pokok / Capaian Pembelajaran (CP / TP)
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Presensi Siswa ({totalHadir} / {totalSiswaDiKelas} Hadir)
                </label>
                <button
                  type="button"
                  onClick={() => setTotalHadir(totalSiswaDiKelas)}
                  className="text-[10px] font-semibold text-blue-700 hover:text-blue-800 underline"
                >
                  Hadir Semua
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={totalSiswaDiKelas}
                  value={totalHadir}
                  onChange={(e) => setTotalHadir(Number(e.target.value))}
                  className="w-24 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 transition focus:border-blue-600 focus:bg-white focus:outline-hidden"
                />
                <span className="text-xs text-slate-500">dari {totalSiswaDiKelas} Siswa</span>
                <span className="ml-auto text-xs font-bold text-emerald-700 px-2 py-1 rounded-md bg-emerald-50 border border-emerald-100">
                  {Math.round((totalHadir / (totalSiswaDiKelas || 1)) * 100)}%
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status Pelaksanaan
                </label>
                <div className="flex gap-2">
                  {(['Terlaksana', 'Diganti', 'Tugas Mandiri'] as AgendaStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatus(st)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        status === st
                          ? st === 'Terlaksana'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : st === 'Diganti'
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Catatan Refleksi Pembelajaran */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan Refleksi Guru / Kendala Pembelajaran / Keterangan
            </label>
            <input
              type="text"
              value={catatanRefleksi}
              onChange={(e) => setCatatanRefleksi(e.target.value)}
              placeholder="Contoh: Pembelajaran berjalan tertib. 1 siswa izin (Ihsan). Perlu pengulangan materi logika minggu depan."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 transition focus:border-blue-600 focus:bg-white focus:outline-hidden"
            />
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
                    <span>
                      Hadir: <strong>{item.Total_Hadir}/{item.Total_Siswa}</strong>
                    </span>
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
