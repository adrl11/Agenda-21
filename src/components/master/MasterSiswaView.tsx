import React, { useState, useMemo } from 'react';
import { Siswa } from '../../types';
import { StorageService } from '../../services/storageService';
import { useToast } from '../../hooks/useToast';
import { ImportSiswaExcelModal } from './ImportSiswaExcelModal';
import { 
  GraduationCap, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  FileDown, 
  CheckCircle2, 
  RotateCcw,
  UserCheck,
  FileSpreadsheet,
  ArrowRight
} from 'lucide-react';

interface MasterSiswaViewProps {
  siswaList: Siswa[];
  onRefresh: () => void;
}

export const MasterSiswaView: React.FC<MasterSiswaViewProps> = ({
  siswaList,
  onRefresh,
}) => {
  const { showSuccess, showError, showInfo } = useToast();

  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [editingNisn, setEditingNisn] = useState<string | null>(null);
  const [nisn, setNisn] = useState<string>('');
  const [namaSiswa, setNamaSiswa] = useState<string>('');
  const [kelas, setKelas] = useState<string>('7A');
  const [jk, setJk] = useState<'L' | 'P'>('L');

  // Table states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterKelas, setFilterKelas] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 12;

  const availableClasses = useMemo(() => {
    const list = Array.from(new Set(siswaList.map((s) => s.Kelas))).sort();
    return list.length > 0 ? list : ['7A', '7B', '8A', '8B', '9A'];
  }, [siswaList]);

  const filteredSiswa = useMemo(() => {
    return siswaList.filter((s) => {
      const matchSearch =
        s.Nama_Siswa.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.NISN.includes(searchQuery);
      const matchKelas = filterKelas === 'all' || s.Kelas === filterKelas;
      return matchSearch && matchKelas;
    });
  }, [siswaList, searchQuery, filterKelas]);

  const totalPages = Math.ceil(filteredSiswa.length / pageSize) || 1;
  const paginatedSiswa = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSiswa.slice(start, start + pageSize);
  }, [filteredSiswa, currentPage, pageSize]);

  const resetForm = () => {
    setEditingNisn(null);
    setNisn('');
    setNamaSiswa('');
    setKelas('7A');
    setJk('L');
  };

  const handleEdit = (s: Siswa) => {
    setEditingNisn(s.NISN);
    setNisn(s.NISN);
    setNamaSiswa(s.Nama_Siswa);
    setKelas(s.Kelas);
    setJk(s.Jenis_Kelamin || 'L');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showInfo('Mode Edit Siswa', `Mengedit: ${s.Nama_Siswa}`);
  };

  const handleDelete = (sNisn: string, name: string) => {
    if (window.confirm(`Hapus data siswa "${name}" (${sNisn})?`)) {
      StorageService.deleteSiswa(sNisn);
      showSuccess('Data Siswa Dihapus', `${name} telah dihapus.`);
      onRefresh();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nisn.trim() || !namaSiswa.trim()) {
      showError('Form Belum Lengkap', 'NISN dan Nama Siswa wajib diisi.');
      return;
    }

    try {
      if (editingNisn) {
        const updated: Siswa = {
          NISN: editingNisn,
          Nama_Siswa: namaSiswa.trim(),
          Kelas: kelas.trim(),
          Jenis_Kelamin: jk,
        };
        StorageService.updateSiswa(updated);
        showSuccess('Siswa Diperbarui', `Data ${namaSiswa} berhasil disimpan.`);
      } else {
        const newSiswa: Siswa = {
          NISN: nisn.trim(),
          Nama_Siswa: namaSiswa.trim(),
          Kelas: kelas.trim(),
          Jenis_Kelamin: jk,
        };
        StorageService.addSiswa(newSiswa);
        showSuccess('Siswa Ditambahkan', `${namaSiswa} berhasil didaftarkan di kelas ${kelas}.`);
      }

      resetForm();
      onRefresh();
    } catch (err: any) {
      showError('Gagal Menyimpan', err.message);
    }
  };

  const handleExportCSV = () => {
    const csvData = StorageService.exportToCSV('Siswa');
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Master_Siswa_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess('Export Berhasil', 'Data Master Siswa berhasil diunduh.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-sky-700" />
            <h2 className="text-xl font-bold text-slate-900">Master Data Siswa</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Database siswa terdaftar, NISN resmi, dan pembagian rombongan belajar (Sheet: Siswa).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-semibold shadow-xs active:scale-95 transition cursor-pointer"
            title="Update dan import data siswa secara massal menggunakan file Excel (.xlsx, .xls) atau CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Update / Import dari Excel</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-sky-700 transition cursor-pointer shadow-2xs"
          >
            <FileDown className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Excel Quick Info Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/70 to-emerald-50 border border-emerald-200/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shrink-0 shadow-xs">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <span>Pembaruan Data Siswa Massal via Excel</span>
              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                Fitur Baru
              </span>
            </div>
            <p className="text-slate-600 mt-0.5">
              Ingin memperbarui kenaikan kelas, mutasi, atau mengunggah data siswa satu sekolah sekaligus? Gunakan fitur import file Excel (.xlsx/.xls/csv) dengan pencocokan otomatis NISN.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsImportModalOpen(true)}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold transition shrink-0 cursor-pointer shadow-xs active:scale-95"
        >
          <span>Buka Import Excel</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Form Input Siswa */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            {editingNisn ? <Edit3 className="w-4 h-4 text-sky-700" /> : <Plus className="w-4 h-4 text-sky-700" />}
            <span>{editingNisn ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}</span>
          </h3>

          {editingNisn && (
            <button
              onClick={resetForm}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Batal Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NISN Siswa *
              </label>
              <input
                type="text"
                required
                disabled={!!editingNisn}
                value={nisn}
                onChange={(e) => setNisn(e.target.value)}
                placeholder="Contoh: 0091827361"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-800 focus:border-sky-600 focus:bg-white focus:outline-hidden disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Lengkap Siswa *
              </label>
              <input
                type="text"
                required
                value={namaSiswa}
                onChange={(e) => setNamaSiswa(e.target.value)}
                placeholder="Contoh: Aisyah Putri Azzahra"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-sky-600 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rombel / Kelas *
              </label>
              <input
                type="text"
                required
                value={kelas}
                onChange={(e) => setKelas(e.target.value)}
                placeholder="Contoh: 7A, 8B, 9C"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-sky-900 focus:border-sky-600 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jenis Kelamin
              </label>
              <select
                value={jk}
                onChange={(e) => setJk(e.target.value as 'L' | 'P')}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-sky-600 focus:outline-hidden"
              >
                <option value="L">Laki-laki (L)</option>
                <option value="P">Perempuan (P)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white px-5 py-2.5 text-xs font-semibold shadow-md active:scale-95 transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingNisn ? 'Simpan Perubahan Siswa' : 'Daftarkan Siswa'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Tabel Siswa */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-4">
          <h3 className="text-sm font-bold text-slate-900">
            Daftar Siswa Terdaftar ({filteredSiswa.length} Siswa)
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-52">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari siswa atau NISN..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 focus:border-sky-600 focus:outline-hidden"
              />
            </div>

            <select
              value={filterKelas}
              onChange={(e) => {
                setFilterKelas(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-hidden"
            >
              <option value="all">Semua Kelas</option>
              {availableClasses.map((k) => (
                <option key={k} value={k}>
                  Kelas {k}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-y border-slate-100 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">No</th>
                <th className="py-2.5 px-3">NISN</th>
                <th className="py-2.5 px-3">Nama Lengkap Siswa</th>
                <th className="py-2.5 px-3 text-center">Rombel</th>
                <th className="py-2.5 px-3 text-center">L/P</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedSiswa.map((s, idx) => (
                <tr key={s.NISN} className="hover:bg-slate-50/70 transition">
                  <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                    {(currentPage - 1) * pageSize + idx + 1}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">{s.NISN}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">{s.Nama_Siswa}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 font-bold border border-sky-200">
                      {s.Kelas}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-600 font-bold">
                    {s.Jenis_Kelamin || '-'}
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(s)}
                        className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-50 transition cursor-pointer"
                        title="Edit Siswa"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.NISN, s.Nama_Siswa)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Hapus Siswa"
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
      </div>

      {/* Modal Update & Import Data Siswa dari Excel */}
      <ImportSiswaExcelModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        currentSiswaList={siswaList}
        onSuccess={onRefresh}
      />
    </div>
  );
};
