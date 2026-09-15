import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Siswa } from '../../types';
import { StorageService } from '../../services/storageService';
import { FirestoreService } from '../../services/firestoreService';
import { useToast } from '../../hooks/useToast';
import {
  FileSpreadsheet,
  Upload,
  Download,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileCheck,
  Users,
  UserPlus,
  HelpCircle,
  Database,
  ArrowRight
} from 'lucide-react';

interface ImportSiswaExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSiswaList: Siswa[];
  onSuccess: () => void;
}

interface ParsedStudentRow {
  NISN: string;
  Nama_Siswa: string;
  Kelas: string;
  Jenis_Kelamin?: 'L' | 'P';
  status: 'new' | 'update' | 'invalid';
  existingData?: Siswa;
  errorMessage?: string;
}

type ImportMode = 'upsert' | 'skipExisting' | 'replace';

export const ImportSiswaExcelModal: React.FC<ImportSiswaExcelModalProps> = ({
  isOpen,
  onClose,
  currentSiswaList,
  onSuccess,
}) => {
  const { showSuccess, showError, showInfo } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('upsert');
  const [syncToCloud, setSyncToCloud] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'update' | 'new' | 'invalid'>('all');

  // Existing NISN lookup map
  const existingMap = useMemo(() => {
    return new Map<string, Siswa>(currentSiswaList.map((s) => [s.NISN.trim(), s]));
  }, [currentSiswaList]);

  // Calculations for summary
  const summary = useMemo(() => {
    const newCount = parsedRows.filter((r) => r.status === 'new').length;
    const updateCount = parsedRows.filter((r) => r.status === 'update').length;
    const invalidCount = parsedRows.filter((r) => r.status === 'invalid').length;
    const validCount = parsedRows.length - invalidCount;
    return {
      total: parsedRows.length,
      newCount,
      updateCount,
      invalidCount,
      validCount,
    };
  }, [parsedRows]);

  // Filtered rows for preview
  const displayRows = useMemo(() => {
    if (previewFilter === 'all') return parsedRows;
    return parsedRows.filter((r) => r.status === previewFilter);
  }, [parsedRows, previewFilter]);

  // Generate and download template Excel
  const handleDownloadTemplate = () => {
    try {
      const sampleData = [
        {
          NISN: '0091827301',
          Nama_Siswa: 'Ahmad Fauzi Rahman',
          Kelas: '7A',
          Jenis_Kelamin: 'L',
        },
        {
          NISN: '0091827302',
          Nama_Siswa: 'Aisyah Putri Azzahra',
          Kelas: '7A',
          Jenis_Kelamin: 'P',
        },
        {
          NISN: '0091827303',
          Nama_Siswa: 'Budi Santoso',
          Kelas: '7B',
          Jenis_Kelamin: 'L',
        },
        {
          NISN: '0091827304',
          Nama_Siswa: 'Cantika Dewi Lestari',
          Kelas: '8A',
          Jenis_Kelamin: 'P',
        },
        {
          NISN: '0091827305',
          Nama_Siswa: 'Dimas Prasetyo',
          Kelas: '9B',
          Jenis_Kelamin: 'L',
        },
      ];

      const ws = XLSX.utils.json_to_sheet(sampleData);
      ws['!cols'] = [
        { wch: 18 }, // NISN
        { wch: 32 }, // Nama_Siswa
        { wch: 12 }, // Kelas
        { wch: 16 }, // Jenis_Kelamin
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data_Siswa');
      XLSX.writeFile(wb, 'Format_Import_Data_Siswa.xlsx');

      showSuccess('Template Berhasil Diunduh', 'File Format_Import_Data_Siswa.xlsx siap digunakan.');
    } catch (err: any) {
      showError('Gagal Mengunduh Template', err.message);
    }
  };

  // Helper to find header key
  const findColumnValue = (row: Record<string, any>, candidateKeys: string[]): string => {
    const keys = Object.keys(row);
    for (const candidate of candidateKeys) {
      const lowerCandidate = candidate.toLowerCase().replace(/[\s_-]/g, '');
      const matchedKey = keys.find(
        (k) => k.toLowerCase().replace(/[\s_-]/g, '') === lowerCandidate
      );
      if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
        return String(row[matchedKey]).trim();
      }
    }
    return '';
  };

  // Parse excel file
  const processExcelFile = async (file: File) => {
    setSelectedFile(file);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error('File Excel tidak memiliki lembar kerja (sheet).');
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

      if (rawJson.length === 0) {
        throw new Error('Lembar kerja kosong atau tidak ada data yang terbaca.');
      }

      const parsed: ParsedStudentRow[] = [];

      rawJson.forEach((row, idx) => {
        // Look for NISN column
        const nisnVal = findColumnValue(row, [
          'NISN',
          'nisn',
          'No_Induk_Siswa_Nasional',
          'Nomor Induk Siswa Nasional',
          'No Induk',
          'NIS',
          'ID_Siswa',
          'ID',
        ]);

        // Look for Nama column
        const namaVal = findColumnValue(row, [
          'Nama_Siswa',
          'Nama Siswa',
          'Nama_Lengkap',
          'Nama Lengkap',
          'Nama',
          'NAMA',
          'Nama Peserta Didik',
          'Nama Murid',
        ]);

        // Look for Kelas column
        const kelasVal = findColumnValue(row, [
          'Kelas',
          'Rombel',
          'Rombongan Belajar',
          'Tingkat',
          'KELAS',
          'Kelas/Rombel',
        ]) || '7A';

        // Look for Jenis Kelamin column
        const jkValRaw = findColumnValue(row, [
          'Jenis_Kelamin',
          'Jenis Kelamin',
          'JK',
          'L/P',
          'Gender',
          'Sex',
        ]);

        // Normalize Jenis Kelamin
        let jkVal: 'L' | 'P' = 'L';
        const lowerJk = jkValRaw.toLowerCase();
        if (lowerJk.startsWith('p') || lowerJk.includes('perempuan') || lowerJk === 'wanita') {
          jkVal = 'P';
        } else if (lowerJk.startsWith('l') || lowerJk.includes('laki') || lowerJk === 'pria') {
          jkVal = 'L';
        }

        // If completely blank row, skip
        if (!nisnVal && !namaVal) {
          return;
        }

        if (!nisnVal || !namaVal) {
          parsed.push({
            NISN: nisnVal || `(Baris ${idx + 2} kosong)`,
            Nama_Siswa: namaVal || '(Nama belum diisi)',
            Kelas: kelasVal,
            Jenis_Kelamin: jkVal,
            status: 'invalid',
            errorMessage: !nisnVal ? 'NISN wajib diisi' : 'Nama siswa wajib diisi',
          });
          return;
        }

        const existing = existingMap.get(nisnVal);
        if (existing) {
          parsed.push({
            NISN: nisnVal,
            Nama_Siswa: namaVal,
            Kelas: kelasVal,
            Jenis_Kelamin: jkVal,
            status: 'update',
            existingData: existing,
          });
        } else {
          parsed.push({
            NISN: nisnVal,
            Nama_Siswa: namaVal,
            Kelas: kelasVal,
            Jenis_Kelamin: jkVal,
            status: 'new',
          });
        }
      });

      setParsedRows(parsed);
      showInfo('File Berhasil Dibaca', `Terdeteksi ${parsed.length} baris data siswa.`);
    } catch (err: any) {
      showError('Gagal Membaca File Excel', err.message);
      setSelectedFile(null);
      setParsedRows([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processExcelFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processExcelFile(file);
    }
  };

  const resetSelection = () => {
    setSelectedFile(null);
    setParsedRows([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit and execute import
  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter((r) => r.status !== 'invalid');
    if (validRows.length === 0) {
      showError('Tidak Ada Data Valid', 'Tidak ada data siswa yang valid untuk diimpor.');
      return;
    }

    if (importMode === 'replace') {
      const confirmReplace = window.confirm(
        `PERINGATAN: Anda memilih mode "Timpa Seluruh Data". Semua ${currentSiswaList.length} data siswa lama akan digantikan oleh ${validRows.length} data baru dari Excel. Lanjutkan?`
      );
      if (!confirmReplace) return;
    }

    setIsProcessing(true);

    try {
      const studentsToSave: Siswa[] = validRows.map((r) => ({
        NISN: r.NISN,
        Nama_Siswa: r.Nama_Siswa,
        Kelas: r.Kelas,
        Jenis_Kelamin: r.Jenis_Kelamin || 'L',
      }));

      // 1. Update in local storage
      const result = StorageService.importSiswaBatch(studentsToSave, importMode);

      // 2. Optionally sync directly to Firestore
      let cloudSynced = false;
      if (syncToCloud) {
        try {
          if (importMode === 'replace') {
            // Push complete updated list to firestore
            const allCurrent = StorageService.getSiswa();
            await FirestoreService.saveSiswaBatch(allCurrent);
          } else {
            // Save newly imported/updated batch
            await FirestoreService.saveSiswaBatch(studentsToSave);
          }
          cloudSynced = true;
        } catch (cloudErr) {
          console.warn('Gagal sinkronisasi cloud langsung:', cloudErr);
        }
      }

      const msg =
        importMode === 'replace'
          ? `Berhasil mengganti seluruh data siswa dengan ${result.total} siswa dari Excel.`
          : `Berhasil memproses ${result.total} siswa: ${result.updated} diperbarui, ${result.added} siswa baru ditambahkan${result.skipped > 0 ? `, ${result.skipped} dilewati` : ''}.`;

      showSuccess(
        'Update Siswa Berhasil',
        `${msg}${cloudSynced ? ' (Tersimpan di Cloud Firestore)' : ''}`
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      showError('Gagal Memperbarui Siswa', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Update & Import Data Siswa dari Excel</h3>
              <p className="text-xs text-slate-300">
                Mendukung file Excel (.xlsx, .xls) dan CSV untuk pembaruan data rombel massal
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Quick Action: Download Template & Help */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div className="flex items-start gap-2.5">
              <HelpCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800">Kolom yang dikenali secara otomatis: </span>
                <span className="text-slate-600">
                  <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px] font-mono">NISN</code>,{' '}
                  <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px] font-mono">Nama_Siswa</code>,{' '}
                  <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px] font-mono">Kelas</code>, dan{' '}
                  <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px] font-mono">Jenis_Kelamin (L/P)</code>.
                </span>
              </div>
            </div>

            <button
              onClick={handleDownloadTemplate}
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100 hover:text-emerald-700 transition shrink-0 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Unduh Contoh Format Excel</span>
            </button>
          </div>

          {/* Upload Drop Zone */}
          {!selectedFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/50'
                  : 'border-slate-300 bg-slate-50/60 hover:bg-slate-50 hover:border-sky-400'
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Klik untuk memilih file atau seret file Excel ke sini
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Format yang didukung: <span className="font-semibold text-slate-700">.xlsx, .xls, .csv</span>
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shrink-0">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-900 truncate max-w-xs sm:max-w-sm">
                      {selectedFile.name}
                    </p>
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {summary.total} baris terdeteksi ({summary.validCount} baris valid)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                >
                  Ganti File
                </button>
                <button
                  type="button"
                  onClick={resetSelection}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                  title="Batalkan File"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}

          {/* Import Modes & Settings */}
          {parsedRows.length > 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Metode Pembaruan Data Siswa
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                      importMode === 'upsert'
                        ? 'border-sky-500 bg-sky-50/60 ring-1 ring-sky-500'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'upsert'}
                      onChange={() => setImportMode('upsert')}
                      className="mt-0.5 text-sky-600 focus:ring-sky-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Perbarui & Tambah (Upsert)</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Update data jika NISN cocok, dan tambah jika belum ada.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                      importMode === 'skipExisting'
                        ? 'border-sky-500 bg-sky-50/60 ring-1 ring-sky-500'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'skipExisting'}
                      onChange={() => setImportMode('skipExisting')}
                      className="mt-0.5 text-sky-600 focus:ring-sky-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Hanya Tambah Baru</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Lewati siswa yang NISN-nya sudah terdaftar di sistem.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                      importMode === 'replace'
                        ? 'border-rose-500 bg-rose-50/50 ring-1 ring-rose-500'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-rose-900">Timpa Seluruh Data</div>
                      <div className="text-[11px] text-rose-600 mt-0.5">
                        Hapus data lama dan ganti seutuhnya dengan file Excel.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Cloud Sync Option */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <input
                  type="checkbox"
                  id="syncToCloud"
                  checked={syncToCloud}
                  onChange={(e) => setSyncToCloud(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="syncToCloud" className="text-xs text-slate-700 cursor-pointer flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-sky-700" />
                  <span className="font-semibold text-slate-800">Sinkronkan juga ke Cloud Firestore</span>
                  <span className="text-slate-500">(Memastikan data langsung tersimpan secara terpusat)</span>
                </label>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div
                  onClick={() => setPreviewFilter('all')}
                  className={`p-3 rounded-xl border transition cursor-pointer ${
                    previewFilter === 'all'
                      ? 'bg-slate-100 border-slate-400'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-[11px] font-semibold text-slate-500">Total Baris</div>
                  <div className="text-lg font-bold text-slate-900">{summary.total}</div>
                </div>

                <div
                  onClick={() => setPreviewFilter('update')}
                  className={`p-3 rounded-xl border transition cursor-pointer ${
                    previewFilter === 'update'
                      ? 'bg-sky-100 border-sky-400'
                      : 'bg-sky-50/50 border-sky-200 hover:bg-sky-50'
                  }`}
                >
                  <div className="text-[11px] font-semibold text-sky-700 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> Akan Diupdate
                  </div>
                  <div className="text-lg font-bold text-sky-900">{summary.updateCount}</div>
                </div>

                <div
                  onClick={() => setPreviewFilter('new')}
                  className={`p-3 rounded-xl border transition cursor-pointer ${
                    previewFilter === 'new'
                      ? 'bg-emerald-100 border-emerald-400'
                      : 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50'
                  }`}
                >
                  <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                    <UserPlus className="w-3 h-3" /> Siswa Baru
                  </div>
                  <div className="text-lg font-bold text-emerald-900">{summary.newCount}</div>
                </div>

                <div
                  onClick={() => setPreviewFilter('invalid')}
                  className={`p-3 rounded-xl border transition cursor-pointer ${
                    previewFilter === 'invalid'
                      ? 'bg-rose-100 border-rose-400'
                      : 'bg-rose-50/50 border-rose-200 hover:bg-rose-50'
                  }`}
                >
                  <div className="text-[11px] font-semibold text-rose-700 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Tidak Valid
                  </div>
                  <div className="text-lg font-bold text-rose-900">{summary.invalidCount}</div>
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-100 px-3.5 py-2 flex items-center justify-between border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-800">
                    Preview Data Siswa ({displayRows.length} baris ditampilkan)
                  </span>
                  {previewFilter !== 'all' && (
                    <button
                      onClick={() => setPreviewFilter('all')}
                      className="text-[11px] text-sky-700 hover:underline font-semibold"
                    >
                      Tampilkan Semua
                    </button>
                  )}
                </div>

                <div className="max-h-56 overflow-y-auto overflow-x-auto text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider text-[10px] sticky top-0">
                      <tr>
                        <th className="py-2 px-3 text-center w-10">No</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">NISN</th>
                        <th className="py-2 px-3">Nama Siswa</th>
                        <th className="py-2 px-3 text-center">Kelas</th>
                        <th className="py-2 px-3 text-center">L/P</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayRows.slice(0, 50).map((row, idx) => (
                        <tr key={`${row.NISN}-${idx}`} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            {row.status === 'update' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                                <RefreshCw className="w-2.5 h-2.5" />
                                Update
                                {row.existingData && row.existingData.Kelas !== row.Kelas && (
                                  <span className="text-[9px] text-sky-600 font-normal">
                                    ({row.existingData.Kelas}→{row.Kelas})
                                  </span>
                                )}
                              </span>
                            )}
                            {row.status === 'new' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <UserPlus className="w-2.5 h-2.5" />
                                Baru
                              </span>
                            )}
                            {row.status === 'invalid' && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200"
                                title={row.errorMessage}
                              >
                                <AlertCircle className="w-2.5 h-2.5" />
                                Tidak Valid
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono font-semibold text-slate-800">
                            {row.NISN}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-900">
                            {row.Nama_Siswa}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 font-bold text-slate-700">
                              {row.Kelas}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-slate-600">
                            {row.Jenis_Kelamin || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {displayRows.length > 50 && (
                    <div className="py-2 text-center text-xs text-slate-400 bg-slate-50 border-t border-slate-100">
                      Dan {displayRows.length - 50} data siswa lainnya...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            {parsedRows.length > 0 ? (
              <span>
                Siap memproses <strong className="text-slate-800">{summary.validCount}</strong> data siswa ke dalam sistem.
              </span>
            ) : (
              <span>Pilih atau seret file Excel untuk memulai pembaruan.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={parsedRows.length === 0 || summary.validCount === 0 || isProcessing}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-5 py-2 text-xs font-semibold shadow-md active:scale-95 transition cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menyimpan Data...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {importMode === 'replace'
                      ? 'Timpa & Simpan Data Siswa'
                      : 'Terapkan & Update Data Siswa'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
