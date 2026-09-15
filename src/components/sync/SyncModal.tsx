import React, { useState } from 'react';
import { StorageService } from '../../services/storageService';
import { FirestoreService } from '../../services/firestoreService';
import { APPS_SCRIPT_CODE } from '../../services/appsScriptCode';
import { useToast } from '../../hooks/useToast';
import { User } from '../../types';
import { 
  FileSpreadsheet, 
  X, 
  Copy, 
  Check, 
  RefreshCw, 
  RotateCcw, 
  Download, 
  Upload, 
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Code,
  UserCheck,
  Clock,
  Flame,
  Cloud,
  Layers
} from 'lucide-react';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
  currentUser?: User;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
  currentUser,
}) => {
  const { showSuccess, showError, showInfo } = useToast();
  const [activeTab, setActiveTab] = useState<'firebase' | 'sync' | 'script' | 'backup'>('firebase');

  // Apps Script Endpoint URL
  const [scriptUrl, setScriptUrl] = useState<string>(StorageService.getAppsScriptUrl());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncDirection, setSyncDirection] = useState<'both' | 'pull' | 'push'>('both');
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const lastSync = StorageService.getLastSyncTimestamp();

  if (!isOpen) return null;

  const handleFirestoreSync = async (direction: 'both' | 'pull' | 'push' = 'both') => {
    setIsSyncing(true);
    showInfo('Sinkronisasi Cloud', 'Menghubungkan ke Google Firebase Firestore...');

    try {
      if (direction === 'both') {
        const res = await FirestoreService.syncBothWithFirestore();
        showSuccess('Cloud Sinkron Berhasil', res.message);
      } else if (direction === 'push') {
        const res = await FirestoreService.pushAllToFirestore();
        showSuccess('Unggah ke Cloud Berhasil', res.message);
      } else if (direction === 'pull') {
        const res = await FirestoreService.pullAllFromFirestore();
        showSuccess('Unduh dari Cloud Berhasil', res.message);
      }
      onDataChanged();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Gagal menghubungi database Firebase';
      showError('Gagal Sinkronisasi Cloud', errorMsg);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveUrl = () => {
    StorageService.setAppsScriptUrl(scriptUrl.trim());
    showSuccess('URL Tersimpan', 'Endpoint Google Apps Script berhasil diperbarui.');
  };

  const handleExecuteSync = async () => {
    if (!scriptUrl.trim()) {
      showError('URL Kosong', 'Silakan masukkan URL Web App Google Apps Script Anda terlebih dahulu.');
      return;
    }

    setIsSyncing(true);
    showInfo('Sinkronisasi Berjalan', 'Menghubungkan ke Google Spreadsheet...');

    try {
      const result = await StorageService.syncWithAppsScript(scriptUrl.trim(), syncDirection);
      if (result.success) {
        showSuccess('Sinkronisasi Sukses', result.message);
        onDataChanged();
      } else {
        showError('Sinkronisasi Gagal', result.message);
      }
    } catch (err: any) {
      showError('Koneksi Gagal', err.message || 'Tidak dapat menghubungi Apps Script.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopiedScript(true);
    showSuccess('Kode Disalin', 'Skrip Google Apps Script siap ditempel di Extensions > Apps Script.');
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleResetData = () => {
    if (window.confirm('Reset semua data lokal ke data awal (mock data)? Perubahan yang belum disinkronkan akan hilang.')) {
      StorageService.resetToInitialData();
      showSuccess('Data Direset', 'Database lokal dikembalikan ke konfigurasi awal.');
      onDataChanged();
    }
  };

  const handleExportJSON = () => {
    const data = StorageService.exportAllJSON();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_Agenda21_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess('Backup Disimpan', 'File JSON database lokal berhasil diunduh.');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const res = StorageService.importFromJSON(content);
        if (res.success) {
          showSuccess('Restore Berhasil', 'Database berhasil dipulihkan dari file JSON.');
          onDataChanged();
        } else {
          showError('Gagal Restore', res.message);
        }
      } catch (err: any) {
        showError('File Rusak', 'Format file JSON tidak valid.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Integrasi Backend Google Spreadsheet
              </h3>
              <p className="text-[11px] text-slate-500">
                Google Apps Script (Web App) • LockService Concurrency Shield
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-white text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('firebase')}
            className={`py-3 px-4 border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'firebase'
                ? 'border-amber-600 text-amber-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-500" />
            <span>Firebase Cloud (HP & Laptop)</span>
          </button>
          <button
            onClick={() => setActiveTab('sync')}
            className={`py-3 px-4 border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'sync'
                ? 'border-emerald-600 text-emerald-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Google Spreadsheet</span>
          </button>
          <button
            onClick={() => setActiveTab('script')}
            className={`py-3 px-4 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'script'
                ? 'border-emerald-600 text-emerald-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Kode Apps Script
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`py-3 px-4 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'backup'
                ? 'border-emerald-600 text-emerald-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Backup & Reset
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Tab Firebase Cloud Firestore */}
          {activeTab === 'firebase' && (
            <div className="space-y-4">
              {/* Firebase Status Card */}
              <div className="rounded-xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100/50 p-4 border border-amber-200/80 text-xs text-amber-950 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white font-bold shadow-xs">
                      <Flame className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-amber-950 flex items-center gap-1.5 text-sm">
                        <span>Google Firebase Firestore</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-bold">
                          ONLINE & AKTIF
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800">
                        Database cloud multi-device untuk sinkronisasi instan smartphone & laptop.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-amber-900 bg-white/80 px-2.5 py-1.5 rounded-lg border border-amber-200 font-medium">
                    <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>
                      {lastSync 
                        ? `Terakhir sinkron: ${new Date(lastSync).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}`
                        : 'Belum sinkron'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-amber-200/60 text-[11px]">
                  <div className="bg-white/70 p-2.5 rounded-lg border border-amber-200/70">
                    <div className="font-bold text-amber-900 flex items-center gap-1">
                      <Cloud className="w-3.5 h-3.5 text-amber-600" />
                      <span>Koneksi Cloud Firestore</span>
                    </div>
                    <p className="text-slate-600 text-[10px] mt-0.5">
                      Terkoneksi langsung ke server Google Cloud dengan Security Rules resmi.
                    </p>
                  </div>
                  <div className="bg-white/70 p-2.5 rounded-lg border border-amber-200/70">
                    <div className="font-bold text-amber-900 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Offline Persistence</span>
                    </div>
                    <p className="text-slate-600 text-[10px] mt-0.5">
                      Tetap dapat mencatat saat sinyal internet putus, lalu otomatis terunggah saat online kembali.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Firebase */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => handleFirestoreSync('both')}
                  disabled={isSyncing}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white py-3.5 text-xs font-bold shadow-md shadow-amber-600/20 active:scale-98 transition disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Menghubungkan ke Firebase...' : 'Sinkronisasi Dua Arah ke Cloud Firebase (Rekomendasi)'}</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleFirestoreSync('pull')}
                    disabled={isSyncing}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 py-2.5 text-xs font-semibold shadow-2xs transition disabled:opacity-50 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-indigo-600" />
                    <span>Tarik dari Cloud (Pull)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFirestoreSync('push')}
                    disabled={isSyncing}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 py-2.5 text-xs font-semibold shadow-2xs transition disabled:opacity-50 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-emerald-600" />
                    <span>Unggah ke Cloud (Push)</span>
                  </button>
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 text-[11px] text-slate-600">
                <p className="font-semibold text-slate-800 mb-1">
                  💡 Tips Pemakaian Smartphone & Laptop:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[10px] text-slate-600">
                  <li>Isi jurnal atau nilai di smartphone Anda seperti biasa.</li>
                  <li>Klik tombol <strong>"Sinkronisasi Dua Arah"</strong> agar data terunggah ke Cloud Firebase.</li>
                  <li>Buka aplikasi di laptop Anda, klik tombol yang sama untuk menarik data terbaru.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'sync' && (
            <div className="space-y-4">
              {/* User Context & Sync Status Banner */}
              <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 p-4 border border-emerald-200 text-xs text-emerald-950 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-xs">
                      {currentUser?.Role === 'Admin' ? 'ADM' : 'GRU'}
                    </div>
                    <div>
                      <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{currentUser?.Nama_Lengkap || 'Pengguna'}</span>
                        <span className="text-[10px] bg-emerald-200/80 text-emerald-800 px-1.5 py-0.5 rounded font-medium">
                          {currentUser?.Role === 'Admin' ? 'Admin Sekolah' : 'Guru Pengampu'}
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-700 font-mono">
                        NIP: {currentUser?.NIP_Username || '-'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-white/70 px-2.5 py-1.5 rounded-lg border border-emerald-200/70 font-medium">
                    <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      {lastSync 
                        ? `Terakhir sinkron: ${new Date(lastSync).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}`
                        : 'Belum pernah sinkronisasi di perangkat ini'}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-emerald-800 pt-1 border-t border-emerald-200/50">
                  {currentUser?.Role === 'Admin'
                    ? 'Sinkronisasi mengirimkan seluruh data master dan aktivitas ke Google Spreadsheet, serta memperbarui data lokal perangkat ini.'
                    : 'Gunakan tombol di bawah untuk mengirimkan jurnal harian dan nilai siswa yang Anda input dari HP ini ke Google Spreadsheet sekolah, sekaligus mengunduh jadwal & siswa terbaru.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  URL Web App Google Apps Script (Exec)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={scriptUrl}
                    onChange={(e) => setScriptUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-hidden"
                  />
                  <button
                    onClick={handleSaveUrl}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer"
                  >
                    Simpan URL
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {currentUser?.Role === 'Admin'
                    ? 'Didapatkan setelah melakukan Deploy > New deployment > Web app (Anyone) pada Google Apps Script.'
                    : 'Minta URL Web App Google Spreadsheet sekolah dari Admin/Operator sekolah, lalu simpan 1x di perangkat ini.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Arah Sinkronisasi Data
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSyncDirection('both')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                      syncDirection === 'both'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Dua Arah (Pull & Push)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSyncDirection('pull')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                      syncDirection === 'pull'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Tarik dari Sheet (Pull)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSyncDirection('push')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                      syncDirection === 'push'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Kirim ke Sheet (Push)
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleExecuteSync}
                  disabled={isSyncing}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white py-3 text-xs font-bold shadow-md shadow-emerald-700/20 active:scale-98 transition disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Sedang Sinkronisasi Data...' : 'Mulai Sinkronisasi Sekarang'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'script' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Petunjuk Pemasangan di Google Spreadsheet</h4>
                  <p className="text-[11px] text-slate-500">
                    Buka Spreadsheet &gt; Menu Extensions &gt; Apps Script &gt; Hapus isi & Tempel kode berikut:
                  </p>
                </div>
                <button
                  onClick={handleCopyScript}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 text-xs font-semibold transition cursor-pointer"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript ? 'Tersalin!' : 'Salin Skrip'}</span>
                </button>
              </div>

              <div className="relative rounded-xl border border-slate-200 bg-slate-900 p-3 max-h-72 overflow-y-auto">
                <pre className="text-[11px] font-mono text-emerald-300 whitespace-pre leading-relaxed">
                  {APPS_SCRIPT_CODE}
                </pre>
              </div>

              <div className="text-[11px] text-slate-500 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-700">Langkah Terakhir:</div>
                <p>1. Klik tombol <strong>Save</strong> (ikon disket).</p>
                <p>2. Klik <strong>Deploy &gt; New deployment</strong>.</p>
                <p>3. Pilih jenis: <strong>Web app</strong>.</p>
                <p>4. Set "Execute as": <strong>Me</strong> dan "Who has access": <strong>Anyone</strong>.</p>
                <p>5. Salin Web App URL dan tempelkan di tab "Sinkronisasi Data" aplikasi ini.</p>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50 space-y-3">
                <div className="font-bold text-xs text-slate-900">Backup & Restore File JSON</div>
                <p className="text-[11px] text-slate-500">
                  Simpan cadangan database lokal Anda dalam format JSON untuk dipindahkan ke komputer lain atau disimpan offline.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleExportJSON}
                    className="flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-blue-600" />
                    <span>Unduh Cadangan JSON</span>
                  </button>

                  <label className="flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    <span>Pulihkan dari File JSON</span>
                    <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Reset Database ke Setelan Awal</span>
                </div>
                <p className="text-[11px] text-rose-700">
                  Aksi ini akan menghapus data di peramban ini dan mengisi kembali akun contoh, rombel, jadwal, serta jurnal bawaan.
                </p>
                <button
                  onClick={handleResetData}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 text-xs font-semibold transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset ke Data Demo Awal</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
