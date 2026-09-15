import React, { useState, useMemo } from 'react';
import { User, Penilaian, Siswa, KategoriAsesmen } from '../../types';
import { StorageService } from '../../services/storageService';
import { useToast } from '../../hooks/useToast';
import { 
  Award, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Filter, 
  FileDown, 
  Users, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Lock,
  Layers,
  UserCheck,
  Database
} from 'lucide-react';

interface PenilaianViewProps {
  user: User;
  penilaianList: Penilaian[];
  siswaList: Siswa[];
  onRefresh: () => void;
  onOpenSync?: () => void;
}

const KATEGORI_OPTIONS: KategoriAsesmen[] = [
  'Formatif',
  'Sumatif Lingkup Materi',
  'Sumatif Tengah Semester (STS)',
  'Sumatif Akhir Semester (SAS)',
];

export const PenilaianView: React.FC<PenilaianViewProps> = ({
  user,
  penilaianList,
  siswaList,
  onRefresh,
  onOpenSync,
}) => {
  const { showSuccess, showError, showInfo } = useToast();
  const isAdmin = user?.Role === 'Admin';

  const myPenilaians = useMemo(() => {
    if (isAdmin) return penilaianList;
    return penilaianList.filter((n) => n.NIP_Guru === user?.NIP_Username);
  }, [penilaianList, isAdmin, user?.NIP_Username]);

  // Available classes
  const availableClasses = useMemo(() => {
    return Array.from(new Set(siswaList.map((s) => s.Kelas))).sort();
  }, [siswaList]);

  // View / Input Mode: 'single' or 'batch'
  const [inputMode, setInputMode] = useState<'single' | 'batch'>('single');

  // Single Input Form States
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedKelas, setSelectedKelas] = useState<string>(availableClasses[0] || '7A');
  const [selectedNisn, setSelectedNisn] = useState<string>('');
  const [tanggal, setTanggal] = useState<string>(todayStr);
  const [mataPelajaran, setMataPelajaran] = useState<string>(user.Mata_Pelajaran || 'Informatika');
  const [kategori, setKategori] = useState<KategoriAsesmen>('Formatif');
  const [nilaiSkor, setNilaiSkor] = useState<number>(85);
  const [catatan, setCatatan] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filter siswa based on selectedKelas
  const siswaInKelas = useMemo(() => {
    return siswaList.filter((s) => s.Kelas === selectedKelas);
  }, [siswaList, selectedKelas]);

  // Auto-select first student when class changes
  React.useEffect(() => {
    if (siswaInKelas.length > 0 && !selectedNisn) {
      setSelectedNisn(siswaInKelas[0].NISN);
    }
  }, [siswaInKelas, selectedNisn]);

  // Batch Form State: Map of NISN -> { score: number, catatan: string }
  const [batchScores, setBatchScores] = useState<Record<string, { score: number; note: string }>>({});

  // Initialize batch scores when class changes
  React.useEffect(() => {
    const initial: Record<string, { score: number; note: string }> = {};
    siswaInKelas.forEach((s) => {
      initial[s.NISN] = { score: 85, note: '' };
    });
    setBatchScores(initial);
  }, [siswaInKelas]);

  // Table Search and Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterKelas, setFilterKelas] = useState<string>('all');
  const [filterKategori, setFilterKategori] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Joined with student name for table
  const enrichedPenilaians = useMemo(() => {
    const studentMap = new Map<string, Siswa>(siswaList.map((s) => [s.NISN, s]));
    return myPenilaians.map((p) => {
      const siswa = studentMap.get(p.NISN);
      return {
        ...p,
        Nama_Siswa: siswa ? siswa.Nama_Siswa : 'Siswa Tidak Ditemukan',
        Kelas: siswa ? siswa.Kelas : '-',
      };
    });
  }, [myPenilaians, siswaList]);

  const filteredData = useMemo(() => {
    return enrichedPenilaians.filter((item) => {
      const matchSearch =
        item.Nama_Siswa.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.NISN.includes(searchQuery) ||
        item.Mata_Pelajaran.toLowerCase().includes(searchQuery.toLowerCase());

      const matchKelas = filterKelas === 'all' || item.Kelas === filterKelas;
      const matchKategori =
        filterKategori === 'all' ||
        (filterKategori === 'Formatif'
          ? item.Kategori_Asesmen.toLowerCase().includes('formatif')
          : filterKategori === 'Sumatif Lingkup Materi'
          ? item.Kategori_Asesmen.toLowerCase().includes('lingkup materi')
          : item.Kategori_Asesmen.toLowerCase() === filterKategori.toLowerCase());

      return matchSearch && matchKelas && matchKategori;
    });
  }, [enrichedPenilaians, searchQuery, filterKelas, filterKategori]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Average score
  const avgScore = useMemo(() => {
    if (filteredData.length === 0) return 0;
    const total = filteredData.reduce((acc, curr) => acc + curr.Nilai_Skor, 0);
    return Math.round((total / filteredData.length) * 10) / 10;
  }, [filteredData]);

  // Helper Predikat
  const getPredikat = (score: number) => {
    if (score >= 90) return { label: 'A (Sangat Baik)', color: 'bg-emerald-100 text-emerald-800' };
    if (score >= 80) return { label: 'B (Baik)', color: 'bg-blue-100 text-blue-800' };
    if (score >= 70) return { label: 'C (Cukup)', color: 'bg-amber-100 text-amber-800' };
    return { label: 'D (Perlu Bimbingan)', color: 'bg-rose-100 text-rose-800' };
  };

  // Submit Single Score
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNisn) {
      showError('Pilih Siswa', 'Silakan tentukan siswa yang dinilai.');
      return;
    }

    setIsSubmitting(true);
    try {
      const idNilai = editingId || `NIL-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      const newScore: Penilaian = {
        ID_Nilai: idNilai,
        NIP_Guru: editingId
          ? myPenilaians.find((n) => n.ID_Nilai === editingId)?.NIP_Guru || user.NIP_Username
          : user.NIP_Username,
        NISN: selectedNisn,
        Tanggal: tanggal,
        Mata_Pelajaran: mataPelajaran.trim(),
        Kategori_Asesmen: kategori,
        Nilai_Skor: Math.max(0, Math.min(100, Number(nilaiSkor))),
        Catatan_Evaluasi: catatan.trim(),
        CreatedAt: new Date().toISOString(),
      };

      await StorageService.savePenilaianItem(newScore);

      showSuccess(
        editingId ? 'Nilai Diperbarui' : 'Nilai Tersimpan',
        `Nilai skor ${nilaiSkor} berhasil disimpan via LockService.`
      );

      // Reset
      setEditingId(null);
      setCatatan('');
      onRefresh();
    } catch (err: any) {
      showError('Gagal Menyimpan', err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Batch Class Scores
  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (siswaInKelas.length === 0) {
      showError('Kelas Kosong', 'Tidak ada data siswa pada kelas ini.');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const items: Penilaian[] = siswaInKelas.map((s, idx) => {
        const itemData = batchScores[s.NISN] || { score: 80, note: '' };
        return {
          ID_Nilai: `NIL-${new Date().getFullYear()}-${String(Date.now() + idx).slice(-6)}`,
          NIP_Guru: user.NIP_Username,
          NISN: s.NISN,
          Tanggal: tanggal,
          Mata_Pelajaran: mataPelajaran.trim(),
          Kategori_Asesmen: kategori,
          Nilai_Skor: Math.max(0, Math.min(100, Number(itemData.score))),
          Catatan_Evaluasi: itemData.note.trim() || 'Tercapai dengan baik',
          CreatedAt: now,
        };
      });

      await StorageService.saveBatchPenilaian(items);

      showSuccess(
        'Penilaian Kolektif Berhasil',
        `${items.length} data nilai siswa kelas ${selectedKelas} berhasil disimpan sekaligus.`
      );
      onRefresh();
      setInputMode('single');
    } catch (err: any) {
      showError('Gagal Menyimpan Batch', err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item: Penilaian & { Kelas?: string }) => {
    setEditingId(item.ID_Nilai);
    if (item.Kelas) setSelectedKelas(item.Kelas);
    setSelectedNisn(item.NISN);
    setTanggal(item.Tanggal);
    setMataPelajaran(item.Mata_Pelajaran);
    setKategori(item.Kategori_Asesmen);
    setNilaiSkor(item.Nilai_Skor);
    setCatatan(item.Catatan_Evaluasi);
    setInputMode('single');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showInfo('Mode Edit Aktif', `Mengedit Nilai ID: ${item.ID_Nilai}`);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Hapus rekaman nilai ini dari database?')) {
      StorageService.deletePenilaian(id);
      showSuccess('Nilai Dihapus', 'Data penilaian berhasil dihapus.');
      onRefresh();
    }
  };

  const handleExportCSV = () => {
    const csvData = StorageService.exportToCSV('Penilaian');
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Penilaian_${user.NIP_Username}_${todayStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess('Export Berhasil', 'File CSV Penilaian telah diunduh.');
  };

  return (
    <div className="space-y-6">
      {/* Header View */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-700" />
            <h2 className="text-xl font-bold text-slate-900">Input & Rekam Penilaian Siswa</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan asesmen formatif dan sumatif, pemantauan ketuntasan belajar, dan buku nilai guru.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => setInputMode('single')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                inputMode === 'single'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Input Tunggal
            </button>
            <button
              onClick={() => setInputMode('batch')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                inputMode === 'batch'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mode Sekelas (Batch)
            </button>
          </div>

          {onOpenSync && (
            <button
              onClick={onOpenSync}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition cursor-pointer shadow-2xs"
              title="Kirim Nilai ke Google Spreadsheet Sekolah"
            >
              <Database className="w-4 h-4 text-emerald-700" />
              <span>Sinkronkan ke Sheet</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-700 transition cursor-pointer shadow-2xs"
          >
            <FileDown className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">CSV Nilai</span>
          </button>
        </div>
      </div>

      {/* FORM: Single Mode vs Batch Mode */}
      {inputMode === 'single' ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-800 text-xs font-bold">
                {editingId ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                {editingId ? 'Edit Skor Penilaian' : 'Form Rekam Nilai Perorangan Siswa'}
              </h3>
            </div>

            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setCatatan('');
                }}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium"
              >
                Batal Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSingleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rombel / Kelas</label>
                <select
                  value={selectedKelas}
                  onChange={(e) => {
                    setSelectedKelas(e.target.value);
                    setSelectedNisn('');
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 font-semibold transition focus:border-indigo-600 focus:bg-white focus:outline-hidden"
                >
                  {availableClasses.map((k) => (
                    <option key={k} value={k}>
                      Kelas {k}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Siswa & NISN</label>
                <select
                  required
                  value={selectedNisn}
                  onChange={(e) => setSelectedNisn(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 font-medium transition focus:border-indigo-600 focus:bg-white focus:outline-hidden"
                >
                  {siswaInKelas.map((s) => (
                    <option key={s.NISN} value={s.NISN}>
                      {s.Nama_Siswa} ({s.NISN})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Asesmen</label>
                <input
                  type="date"
                  required
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 transition focus:border-indigo-600 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mata Pelajaran</label>
                <input
                  type="text"
                  required
                  value={mataPelajaran}
                  onChange={(e) => setMataPelajaran(e.target.value)}
                  placeholder="Informatika"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 transition focus:border-indigo-600 focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kategori Asesmen
                </label>
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value as KategoriAsesmen)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 transition focus:border-indigo-600 focus:bg-white focus:outline-hidden"
                >
                  {KATEGORI_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Kategori Sumatif LM dapat diinput berulang kali untuk tiap lingkup materi (otomatis menjadi LM 1, LM 2, dst. di laporan)
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Nilai Skor (0 - 100)</label>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${getPredikat(nilaiSkor).color}`}>
                    {getPredikat(nilaiSkor).label}
                  </span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={nilaiSkor}
                  onChange={(e) => setNilaiSkor(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 transition focus:border-indigo-600 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Evaluasi / Rekomendasi
                </label>
                <input
                  type="text"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Contoh: Menguasai materi dengan sangat baik."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 transition focus:border-indigo-600 focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Lock className="w-3.5 h-3.5 text-indigo-500" />
                <span>Simpan aman dengan LockService</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white px-5 py-2.5 text-xs font-semibold shadow-md shadow-indigo-700/20 active:scale-95 transition disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menyimpan Nilai...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{editingId ? 'Perbarui Nilai' : 'Simpan Nilai Siswa'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* BATCH MODE: Grade the whole class at once! */
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/30 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-indigo-100 mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-700" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Mode Input Penilaian Rombel (Batch)</h3>
                <p className="text-xs text-slate-500">
                  Isi nilai seluruh siswa di kelas {selectedKelas} sekaligus dalam satu kali simpan.
                </p>
              </div>
            </div>

            <button
              onClick={() => setInputMode('single')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Tutup Mode Batch
            </button>
          </div>

          <form onSubmit={handleBatchSubmit} className="space-y-4">
            {/* Batch Headers */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-white border border-indigo-100">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Rombel / Kelas</label>
                <select
                  value={selectedKelas}
                  onChange={(e) => setSelectedKelas(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-indigo-900"
                >
                  {availableClasses.map((k) => (
                    <option key={k} value={k}>
                      Kelas {k}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tanggal</label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mata Pelajaran</label>
                <input
                  type="text"
                  value={mataPelajaran}
                  onChange={(e) => setMataPelajaran(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Kategori Asesmen
                </label>
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value as KategoriAsesmen)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800"
                >
                  {KATEGORI_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Kategori Sumatif LM dapat diinput berkala per bab/materi tanpa batasan
                </p>
              </div>
            </div>

            {/* Students Table in Batch */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">No</th>
                    <th className="py-2.5 px-3">NISN & Nama Siswa</th>
                    <th className="py-2.5 px-3 w-32">Skor (0-100)</th>
                    <th className="py-2.5 px-3">Catatan / Umpan Balik Siswa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {siswaInKelas.map((s, idx) => (
                    <tr key={s.NISN} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900">{s.Nama_Siswa}</div>
                        <div className="text-[10px] text-slate-500 font-mono">NISN: {s.NISN}</div>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          required
                          value={batchScores[s.NISN]?.score ?? 80}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setBatchScores((prev) => ({
                              ...prev,
                              [s.NISN]: { ...prev[s.NISN], score: val },
                            }));
                          }}
                          className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:outline-hidden"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          placeholder="Catatan capaian siswa..."
                          value={batchScores[s.NISN]?.note ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBatchScores((prev) => ({
                              ...prev,
                              [s.NISN]: { ...prev[s.NISN], note: val },
                            }));
                          }}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-800 focus:border-indigo-600 focus:outline-hidden"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                Total {siswaInKelas.length} siswa akan direkam nilainya ke database.
              </span>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white px-5 py-2.5 text-xs font-semibold shadow-md active:scale-95 transition cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Menyimpan Batch Nilai via LockService...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Simpan Nilai Seluruh Kelas Sekaligus</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabel Riwayat Penilaian Siswa */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Daftar Penilaian Siswa ({filteredData.length} Data)
              </h3>
              {filteredData.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold text-[11px]">
                  Rata-rata: {avgScore}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Rekapitulasi skor evaluasi formatif dan sumatif siswa yang tersimpan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari siswa / mapel..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 focus:border-indigo-600 focus:bg-white focus:outline-hidden"
              />
            </div>

            {/* Filter Kelas */}
            <select
              value={filterKelas}
              onChange={(e) => {
                setFilterKelas(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-indigo-600 focus:outline-hidden"
            >
              <option value="all">Semua Kelas</option>
              {availableClasses.map((k) => (
                <option key={k} value={k}>
                  Kelas {k}
                </option>
              ))}
            </select>

            {/* Filter Kategori */}
            <select
              value={filterKategori}
              onChange={(e) => {
                setFilterKategori(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:border-indigo-600 focus:outline-hidden"
            >
              <option value="all">Semua Kategori Asesmen</option>
              {KATEGORI_OPTIONS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
        </div>

        {paginatedData.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Tidak ditemukan rekaman nilai siswa yang cocok.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-y border-slate-100 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Siswa & NISN</th>
                    <th className="py-2.5 px-3 text-center">Kelas</th>
                    <th className="py-2.5 px-3">Mata Pelajaran</th>
                    <th className="py-2.5 px-3">Kategori Asesmen</th>
                    <th className="py-2.5 px-3 text-center">Skor Nilai</th>
                    <th className="py-2.5 px-3">Evaluasi / Umpan Balik</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedData.map((item) => {
                    const predikat = getPredikat(item.Nilai_Skor);
                    return (
                      <tr key={item.ID_Nilai} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{item.Nama_Siswa}</div>
                          <div className="text-[11px] text-slate-500 font-mono">NISN: {item.NISN}</div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                            {item.Kelas}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-medium">
                          {item.Mata_Pelajaran}
                          <div className="text-[10px] text-slate-400">{item.Tanggal}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                            {item.Kategori_Asesmen}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="text-base font-extrabold text-slate-900">{item.Nilai_Skor}</div>
                          <span className={`px-1.5 py-0.2 rounded-xs text-[10px] font-bold ${predikat.color}`}>
                            {predikat.label.split(' ')[0]}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                          {item.Catatan_Evaluasi || '-'}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                              title="Edit Nilai"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.ID_Nilai)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Hapus Nilai"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="block md:hidden space-y-3">
              {paginatedData.map((item) => {
                const predikat = getPredikat(item.Nilai_Skor);
                return (
                  <div
                    key={item.ID_Nilai}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{item.Nama_Siswa}</div>
                        <div className="text-[11px] text-slate-500">Kelas {item.Kelas} • NISN: {item.NISN}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-black text-indigo-800">{item.Nilai_Skor}</div>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${predikat.color}`}>
                          {predikat.label}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600">
                      <strong>{item.Mata_Pelajaran}</strong> — {item.Kategori_Asesmen}
                    </div>

                    {item.Catatan_Evaluasi && (
                      <p className="text-[11px] text-slate-500 italic bg-white p-2 rounded-lg border border-slate-100">
                        "{item.Catatan_Evaluasi}"
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 text-[11px] text-slate-400">
                      <span>{item.Tanggal}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-indigo-600 font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.ID_Nilai)}
                          className="text-rose-600 font-semibold"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 mt-4 text-xs text-slate-500">
              <div>
                Menampilkan {(currentPage - 1) * pageSize + 1} -{' '}
                {Math.min(currentPage * pageSize, filteredData.length)} dari {filteredData.length} data
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
