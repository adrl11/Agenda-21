import React, { useState, useMemo } from 'react';
import { Jadwal, User, Hari, Siswa } from '../../types';
import { StorageService } from '../../services/storageService';
import { useToast } from '../../hooks/useToast';
import { 
  CalendarDays, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  FileDown, 
  CheckCircle2, 
  RotateCcw,
  Clock
} from 'lucide-react';

interface MasterJadwalViewProps {
  jadwalList: Jadwal[];
  usersList: User[];
  siswaList: Siswa[];
  onRefresh: () => void;
}

const HARI_OPTIONS: Hari[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const MasterJadwalView: React.FC<MasterJadwalViewProps> = ({
  jadwalList,
  usersList,
  siswaList,
  onRefresh,
}) => {
  const { showSuccess, showError, showInfo } = useToast();

  const teachers = useMemo(() => usersList.filter((u) => u.Role === 'Guru'), [usersList]);

  // Extract unique classes from Master Siswa, with fallback if none yet
  const availableClasses = useMemo(() => {
    const fromSiswa = Array.from(new Set(siswaList.map((s) => s.Kelas).filter(Boolean))).sort();
    if (fromSiswa.length > 0) return fromSiswa;
    const fromJadwal = Array.from(new Set(jadwalList.map((j) => j.Kelas).filter(Boolean))).sort();
    return fromJadwal.length > 0 ? fromJadwal : ['7A', '7B', '8A', '8B', '9A', '9B'];
  }, [siswaList, jadwalList]);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nipGuru, setNipGuru] = useState<string>(teachers[0]?.NIP_Username || '');
  const [kelas, setKelas] = useState<string>(() => availableClasses[0] || '7A');
  const [mapel, setMapel] = useState<string>('Informatika');
  const [hari, setHari] = useState<Hari>('Senin');
  const [jamMulai, setJamMulai] = useState<string>('07:30');
  const [jamSelesai, setJamSelesai] = useState<string>('09:00');

  // Table filter states
  const [filterHari, setFilterHari] = useState<string>('all');
  const [filterGuru, setFilterGuru] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const enrichedJadwal = useMemo(() => {
    const teacherMap = new Map(usersList.map((u) => [u.NIP_Username, u.Nama_Lengkap]));
    return jadwalList.map((j) => ({
      ...j,
      Nama_Guru: teacherMap.get(j.NIP_Guru) || j.NIP_Guru,
    }));
  }, [jadwalList, usersList]);

  const filteredJadwal = useMemo(() => {
    return enrichedJadwal.filter((j) => {
      const matchSearch =
        j.Mata_Pelajaran.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.Kelas.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.Nama_Guru.toLowerCase().includes(searchQuery.toLowerCase());
      const matchHari = filterHari === 'all' || j.Hari === filterHari;
      const matchGuru = filterGuru === 'all' || j.NIP_Guru === filterGuru;

      return matchSearch && matchHari && matchGuru;
    });
  }, [enrichedJadwal, searchQuery, filterHari, filterGuru]);

  const resetForm = () => {
    setEditingId(null);
    setNipGuru(teachers[0]?.NIP_Username || '');
    setKelas(availableClasses[0] || '7A');
    setMapel('Informatika');
    setHari('Senin');
    setJamMulai('07:30');
    setJamSelesai('09:00');
  };

  const handleEdit = (item: Jadwal) => {
    setEditingId(item.ID_Jadwal);
    setNipGuru(item.NIP_Guru);
    setKelas(item.Kelas);
    setMapel(item.Mata_Pelajaran);
    setHari(item.Hari);
    setJamMulai(item.Jam_Mulai);
    setJamSelesai(item.Jam_Selesai);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showInfo('Mode Edit Jadwal', `Mengedit: ${item.ID_Jadwal}`);
  };

  const handleDelete = (id: string, detail: string) => {
    if (window.confirm(`Hapus jadwal mengajar "${detail}"?`)) {
      StorageService.deleteJadwal(id);
      showSuccess('Jadwal Dihapus', 'Jadwal berhasil dihapus.');
      onRefresh();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nipGuru || !kelas.trim() || !mapel.trim()) {
      showError('Form Belum Lengkap', 'Guru, Kelas, dan Mapel wajib ditentukan.');
      return;
    }

    try {
      if (editingId) {
        const updated: Jadwal = {
          ID_Jadwal: editingId,
          NIP_Guru: nipGuru,
          Kelas: kelas.trim(),
          Mata_Pelajaran: mapel.trim(),
          Hari: hari,
          Jam_Mulai: jamMulai,
          Jam_Selesai: jamSelesai,
        };
        StorageService.updateJadwal(updated);
        showSuccess('Jadwal Diperbarui', `Jadwal kelas ${kelas} berhasil disimpan.`);
      } else {
        const newJadwal: Jadwal = {
          ID_Jadwal: `JDW-${String(Date.now()).slice(-4)}`,
          NIP_Guru: nipGuru,
          Kelas: kelas.trim(),
          Mata_Pelajaran: mapel.trim(),
          Hari: hari,
          Jam_Mulai: jamMulai,
          Jam_Selesai: jamSelesai,
        };
        StorageService.addJadwal(newJadwal);
        showSuccess('Jadwal Ditambahkan', `Jadwal baru hari ${hari} berhasil dibuat.`);
      }

      resetForm();
      onRefresh();
    } catch (err: any) {
      showError('Gagal Menyimpan', err.message);
    }
  };

  const handleExportCSV = () => {
    const csvData = StorageService.exportToCSV('Jadwal');
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Master_Jadwal_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess('Export Berhasil', 'Data Master Jadwal berhasil diunduh.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-amber-700" />
            <h2 className="text-xl font-bold text-slate-900">Master Data Jadwal Pelajaran</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengaturan sesi belajar mingguan, guru pengampu rombel, dan jam tatap muka (Sheet: Jadwal).
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-amber-700 transition cursor-pointer shadow-2xs"
        >
          <FileDown className="w-4 h-4 text-emerald-600" />
          <span>Export Master Jadwal</span>
        </button>
      </div>

      {/* Form Input Jadwal */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            {editingId ? <Edit3 className="w-4 h-4 text-amber-700" /> : <Plus className="w-4 h-4 text-amber-700" />}
            <span>{editingId ? 'Edit Jadwal Pelajaran' : 'Tambah Jadwal Mengajar Baru'}</span>
          </h3>

          {editingId && (
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
                Guru Pengampu *
              </label>
              <select
                value={nipGuru}
                onChange={(e) => {
                  setNipGuru(e.target.value);
                  const selectedTeacher = teachers.find((t) => t.NIP_Username === e.target.value);
                  if (selectedTeacher && selectedTeacher.Mata_Pelajaran) {
                    setMapel(selectedTeacher.Mata_Pelajaran);
                  }
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 font-medium focus:border-amber-600 focus:bg-white focus:outline-hidden"
              >
                {teachers.map((t) => (
                  <option key={t.ID_User} value={t.NIP_Username}>
                    {t.Nama_Lengkap} ({t.Mata_Pelajaran || 'Guru'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Rombel / Kelas *
                </label>
                <span className="text-[10px] text-amber-700 font-medium">
                  {availableClasses.length} kelas terdaftar
                </span>
              </div>
              <select
                required
                value={kelas}
                onChange={(e) => setKelas(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-amber-900 focus:border-amber-600 focus:bg-white focus:outline-hidden"
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
                Mata Pelajaran *
              </label>
              <input
                type="text"
                required
                value={mapel}
                onChange={(e) => setMapel(e.target.value)}
                placeholder="Contoh: Informatika"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-amber-600 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hari Pelajaran
              </label>
              <select
                value={hari}
                onChange={(e) => setHari(e.target.value as Hari)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-amber-600 focus:outline-hidden"
              >
                {HARI_OPTIONS.map((h) => (
                  <option key={h} value={h}>
                    Hari {h}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jam Mulai (WIB)
              </label>
              <input
                type="time"
                required
                value={jamMulai}
                onChange={(e) => setJamMulai(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-800 focus:border-amber-600 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jam Selesai (WIB)
              </label>
              <input
                type="time"
                required
                value={jamSelesai}
                onChange={(e) => setJamSelesai(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-800 focus:border-amber-600 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white px-5 py-2.5 text-xs font-semibold shadow-md active:scale-95 transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingId ? 'Simpan Perubahan Jadwal' : 'Simpan Jadwal Baru'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Tabel Jadwal */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-4">
          <h3 className="text-sm font-bold text-slate-900">
            Daftar Jadwal Mengajar Terdaftar ({filteredJadwal.length} Sesi)
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari mapel / kelas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 focus:border-amber-600 focus:outline-hidden"
              />
            </div>

            <select
              value={filterHari}
              onChange={(e) => setFilterHari(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-hidden"
            >
              <option value="all">Semua Hari</option>
              {HARI_OPTIONS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>

            <select
              value={filterGuru}
              onChange={(e) => setFilterGuru(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-hidden"
            >
              <option value="all">Semua Guru</option>
              {teachers.map((t) => (
                <option key={t.ID_User} value={t.NIP_Username}>
                  {t.Nama_Lengkap}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-y border-slate-100 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Hari & Waktu</th>
                <th className="py-2.5 px-3 text-center">Kelas</th>
                <th className="py-2.5 px-3">Mata Pelajaran</th>
                <th className="py-2.5 px-3">Guru Pengampu</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredJadwal.map((j) => (
                <tr key={j.ID_Jadwal} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900">{j.Hari}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-amber-600" />
                      <span>{j.Jam_Mulai} - {j.Jam_Selesai} WIB</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold border border-amber-200">
                      {j.Kelas}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-900">
                    {j.Mata_Pelajaran}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-medium text-slate-800">{j.Nama_Guru}</div>
                    <div className="text-[10px] text-slate-400 font-mono">NIP: {j.NIP_Guru}</div>
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(j)}
                        className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                        title="Edit Jadwal"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(j.ID_Jadwal, `${j.Hari} - Kelas ${j.Kelas} (${j.Mata_Pelajaran})`)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Hapus Jadwal"
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
    </div>
  );
};
