import React, { useState, useMemo } from 'react';
import { User, UserRole } from '../../types';
import { StorageService } from '../../services/storageService';
import { useToast } from '../../hooks/useToast';
import { 
  Users, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  ShieldCheck, 
  UserCheck, 
  FileDown, 
  CheckCircle2, 
  RotateCcw,
  KeyRound
} from 'lucide-react';

interface MasterGuruViewProps {
  currentUser: User;
  usersList: User[];
  onRefresh: () => void;
}

export const MasterGuruView: React.FC<MasterGuruViewProps> = ({
  currentUser,
  usersList,
  onRefresh,
}) => {
  const { showSuccess, showError, showInfo } = useToast();

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nip, setNip] = useState<string>('');
  const [namaLengkap, setNamaLengkap] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [role, setRole] = useState<UserRole>('Guru');
  const [mapel, setMapel] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [telepon, setTelepon] = useState<string>('');

  // Table Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('all');

  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const matchSearch =
        u.Nama_Lengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.NIP_Username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.Mata_Pelajaran && u.Mata_Pelajaran.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchRole = filterRole === 'all' || u.Role === filterRole;
      return matchSearch && matchRole;
    });
  }, [usersList, searchQuery, filterRole]);

  const resetForm = () => {
    setEditingId(null);
    setNip('');
    setNamaLengkap('');
    setPassword('');
    setRole('Guru');
    setMapel('');
    setEmail('');
    setTelepon('');
  };

  const handleEdit = (user: User) => {
    setEditingId(user.ID_User);
    setNip(user.NIP_Username);
    setNamaLengkap(user.Nama_Lengkap);
    setPassword(user.Password);
    setRole(user.Role);
    setMapel(user.Mata_Pelajaran || '');
    setEmail(user.Email || '');
    setTelepon(user.Telepon || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showInfo('Mode Edit Guru', `Mengedit: ${user.Nama_Lengkap}`);
  };

  const handleDelete = (id: string, name: string) => {
    if (id === currentUser.ID_User) {
      showError('Aksi Ditolak', 'Anda tidak dapat menghapus akun Anda sendiri saat sedang aktif.');
      return;
    }
    if (window.confirm(`Hapus data pengguna/guru "${name}"?`)) {
      StorageService.deleteUser(id);
      showSuccess('Data Dihapus', `Akun ${name} telah dihapus.`);
      onRefresh();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nip.trim() || !namaLengkap.trim() || !password.trim()) {
      showError('Form Belum Lengkap', 'NIP, Nama Lengkap, dan Password wajib diisi.');
      return;
    }

    try {
      if (editingId) {
        const updatedUser: User = {
          ID_User: editingId,
          NIP_Username: nip.trim(),
          Nama_Lengkap: namaLengkap.trim(),
          Password: password.trim(),
          Role: role,
          Mata_Pelajaran: mapel.trim(),
          Email: email.trim(),
          Telepon: telepon.trim(),
        };
        StorageService.updateUser(updatedUser);
        showSuccess('Pengguna Diperbarui', `Data ${namaLengkap} berhasil disimpan.`);
      } else {
        // Check duplication
        const exists = usersList.some(
          (u) => u.NIP_Username.toLowerCase() === nip.trim().toLowerCase()
        );
        if (exists) {
          showError('NIP Sudah Digunakan', `NIP/Username ${nip} sudah terdaftar di sistem.`);
          return;
        }

        const newUser: User = {
          ID_User: `USR-${String(Date.now()).slice(-4)}`,
          NIP_Username: nip.trim(),
          Nama_Lengkap: namaLengkap.trim(),
          Password: password.trim(),
          Role: role,
          Mata_Pelajaran: mapel.trim(),
          Email: email.trim(),
          Telepon: telepon.trim(),
        };
        StorageService.addUser(newUser);
        showSuccess('Guru Baru Ditambahkan', `Akun ${namaLengkap} (${role}) berhasil dibuat.`);
      }

      resetForm();
      onRefresh();
    } catch (err: any) {
      showError('Gagal Menyimpan', err.message);
    }
  };

  const handleExportCSV = () => {
    const csvData = StorageService.exportToCSV('Users');
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Master_Guru_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess('Export Berhasil', 'Data Master Guru berhasil diunduh.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-700" />
            <h2 className="text-xl font-bold text-slate-900">Master Data Guru & Pengguna</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen akun pendidik dan staf administrasi sekolah (Sheet: Users).
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-700 transition cursor-pointer shadow-2xs"
        >
          <FileDown className="w-4 h-4 text-emerald-600" />
          <span>Export Master Guru</span>
        </button>
      </div>

      {/* Form Input / Edit Guru */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            {editingId ? <Edit3 className="w-4 h-4 text-blue-700" /> : <Plus className="w-4 h-4 text-blue-700" />}
            <span>{editingId ? 'Edit Data Guru / Pengguna' : 'Tambah Guru / Pengguna Baru'}</span>
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
                NIP / Username Kredensial *
              </label>
              <input
                type="text"
                required
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder="Contoh: 199208102019031008"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Lengkap & Gelar *
              </label>
              <input
                type="text"
                required
                value={namaLengkap}
                onChange={(e) => setNamaLengkap(e.target.value)}
                placeholder="Contoh: Siti Rahmawati, S.Pd"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kata Sandi (Password) *
              </label>
              <input
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password login..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Peran Akun (Role)
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="Guru">Guru (Pengajar)</option>
                <option value="Admin">Admin (Kurikulum / Tata Usaha)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mata Pelajaran yang Diampu
              </label>
              <input
                type="text"
                value={mapel}
                onChange={(e) => setMapel(e.target.value)}
                placeholder="Contoh: Matematika, IPA, Informatika"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Sekolah (@guru.smp.belajar.id)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@guru.smp.belajar.id"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor WhatsApp / HP
              </label>
              <input
                type="text"
                value={telepon}
                onChange={(e) => setTelepon(e.target.value)}
                placeholder="08123456789"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white px-5 py-2.5 text-xs font-semibold shadow-md active:scale-95 transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingId ? 'Simpan Perubahan Guru' : 'Simpan Data Guru'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Tabel Guru */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-4">
          <h3 className="text-sm font-bold text-slate-900">
            Daftar Akun Guru & Admin ({filteredUsers.length} Pengguna)
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-52">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari guru atau NIP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-hidden"
            >
              <option value="all">Semua Peran</option>
              <option value="Guru">Guru</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-y border-slate-100 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Nama & NIP</th>
                <th className="py-2.5 px-3">Mata Pelajaran</th>
                <th className="py-2.5 px-3">Kontak & Email</th>
                <th className="py-2.5 px-3 text-center">Peran</th>
                <th className="py-2.5 px-3 text-center">Password</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <tr key={u.ID_User} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900">{u.Nama_Lengkap}</div>
                    <div className="text-[11px] text-slate-500 font-mono">NIP: {u.NIP_Username}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-700 font-medium">
                    {u.Mata_Pelajaran || '-'}
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    <div>{u.Email || '-'}</div>
                    <div className="text-[11px] text-slate-400">{u.Telepon || '-'}</div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.Role === 'Admin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {u.Role}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-500">
                    ••••••••
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(u)}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                        title="Edit Guru"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(u.ID_User, u.Nama_Lengkap)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Hapus Guru"
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
