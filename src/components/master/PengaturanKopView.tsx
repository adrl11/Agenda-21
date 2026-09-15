import React, { useState, useRef } from 'react';
import { KopSuratConfig } from '../../types';
import { StorageService } from '../../services/storageService';
import { 
  processLogoFile, 
  ProcessedLogoResult, 
  estimateBase64Size, 
  formatBytes 
} from '../../services/imageUtils';
import { useToast } from '../../hooks/useToast';
import { 
  Building2, 
  Save, 
  RotateCcw, 
  Eye, 
  CheckCircle2, 
  School,
  FileCheck,
  Upload,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface PengaturanKopViewProps {
  onRefresh?: () => void;
}

export const PengaturanKopView: React.FC<PengaturanKopViewProps> = ({ onRefresh }) => {
  const { showSuccess, showError, showInfo } = useToast();
  const [config, setConfig] = useState<KopSuratConfig>(() => StorageService.getKopSurat());
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isUploadingPemda, setIsUploadingPemda] = useState<boolean>(false);
  const [isUploadingSekolah, setIsUploadingSekolah] = useState<boolean>(false);
  const [logoStats, setLogoStats] = useState<{
    logoPemdaUrl?: ProcessedLogoResult;
    logoSekolahUrl?: ProcessedLogoResult;
  }>({});

  const pemdaInputRef = useRef<HTMLInputElement | null>(null);
  const sekolahInputRef = useRef<HTMLInputElement | null>(null);

  const handleChange = (field: keyof KopSuratConfig, value: string) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
    setIsSaved(false);
  };

  const handleLogoFile = async (field: 'logoPemdaUrl' | 'logoSekolahUrl', file: File) => {
    const isPemda = field === 'logoPemdaUrl';
    if (isPemda) setIsUploadingPemda(true);
    else setIsUploadingSekolah(true);

    try {
      const result = await processLogoFile(file);
      setConfig((prev) => ({
        ...prev,
        [field]: result.dataUrl,
      }));
      setLogoStats((prev) => ({
        ...prev,
        [field]: result,
      }));
      setIsSaved(false);
      showSuccess(
        'Logo Berhasil Dioptimasi',
        `${isPemda ? 'Logo Pemda' : 'Logo Sekolah'} berhasil dikompresi: ${result.originalSizeFormatted} ➔ ${result.compressedSizeFormatted} (-${result.reductionPercent}%, ${result.width}×${result.height}px).`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses file gambar.';
      showError('Gagal Unggah Logo', msg);
    } finally {
      if (isPemda) setIsUploadingPemda(false);
      else setIsUploadingSekolah(false);
    }
  };

  const handleRemoveLogo = (field: 'logoPemdaUrl' | 'logoSekolahUrl') => {
    setConfig((prev) => ({
      ...prev,
      [field]: undefined,
    }));
    setLogoStats((prev) => ({
      ...prev,
      [field]: undefined,
    }));
    setIsSaved(false);
    showInfo(
      'Logo Dihapus',
      `${field === 'logoPemdaUrl' ? 'Logo Pemda' : 'Logo Sekolah'} telah dihapus dari kop surat.`
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveKopSurat(config);
    setIsSaved(true);
    showSuccess('Kop Laporan Disimpan', 'Format Kop Surat, Logo Resmi, dan Tanda Tangan berhasil diperbarui.');
    onRefresh?.();
  };

  const handleReset = () => {
    if (window.confirm('Kembalikan format kop surat ke pengaturan awal (default)?')) {
      const def = StorageService.resetKopSurat();
      setConfig(def);
      setIsSaved(true);
      showInfo('Format Direset', 'Kop surat dikembalikan ke bawaan standar sekolah.');
      onRefresh?.();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-200 border border-blue-400/20 mb-2">
              <Building2 className="w-3.5 h-3.5" />
              <span>Pengaturan Administrasi Sekolah</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Modifikasi Kop Surat, Logo & Laporan Resmi
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-blue-200 max-w-2xl">
              Unggah Logo Pemda (kiri) & Logo Sekolah (kanan), sesuaikan nama dinas, identitas sekolah, NPSN, tahun ajaran, hingga pengesahan Kepala Sekolah.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Bawaan</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Editor (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSave} className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <School className="w-4 h-4 text-blue-700" />
                Formulir Identitas & Logo Kop Sekolah
              </h3>
              {isSaved && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Tersimpan
                </span>
              )}
            </div>

            {/* SEKSI UPLOAD LOGO (PEMDA & SEKOLAH) */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  Logo Resmi Kop Surat (Kiri & Kanan)
                </span>
                <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md font-medium inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  Auto-Kompresi Aktif (Maks 240px)
                </span>
              </div>

              {/* Informational Banner */}
              <div className="rounded-lg bg-blue-50/70 border border-blue-200/70 p-2.5 text-[11px] text-blue-800 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Aman untuk file besar:</strong> Foto resolusi tinggi dari kamera HP maupun scan (hingga 15 MB) akan <em>otomatis di-resize dan dikompresi</em> menjadi ~20–40 KB agar penyimpanan ringan dan cetak PDF rekapitulasi tetap sangat tajam.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. LOGO PEMDA (SISI KIRI) */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-600" />
                        Logo Pemda (Kiri)
                      </span>
                      {config.logoPemdaUrl && (
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                          Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Logo Pemprov / Pemkab / Pemkot / Kemenag
                    </p>
                  </div>

                  {/* Logo Preview or Placeholder */}
                  <div className="flex items-center gap-3 py-1">
                    <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-xs">
                      {config.logoPemdaUrl ? (
                        <img
                          src={config.logoPemdaUrl}
                          alt="Logo Pemda"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Building2 className="w-8 h-8 text-slate-400" />
                      )}
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <input
                        type="file"
                        ref={pemdaInputRef}
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleLogoFile('logoPemdaUrl', file);
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => pemdaInputRef.current?.click()}
                        disabled={isUploadingPemda}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-blue-600 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isUploadingPemda ? 'Mengompresi...' : config.logoPemdaUrl ? 'Ganti Logo' : 'Unggah Logo'}</span>
                      </button>

                      {config.logoPemdaUrl && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLogo('logoPemdaUrl')}
                          className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Compression Stats for Pemda Logo */}
                  {logoStats.logoPemdaUrl ? (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200/80 p-2 text-[10px] space-y-0.5 text-emerald-900">
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Dikompresi & Dioptimalkan
                        </span>
                        <span className="text-emerald-700 font-mono">-{logoStats.logoPemdaUrl.reductionPercent}%</span>
                      </div>
                      <div className="flex justify-between text-emerald-700">
                        <span>Awal ➔ Hasil:</span>
                        <span className="font-semibold">{logoStats.logoPemdaUrl.originalSizeFormatted} ➔ {logoStats.logoPemdaUrl.compressedSizeFormatted}</span>
                      </div>
                      <div className="flex justify-between text-emerald-700">
                        <span>Dimensi Cetak:</span>
                        <span className="font-mono">{logoStats.logoPemdaUrl.width} × {logoStats.logoPemdaUrl.height} px</span>
                      </div>
                    </div>
                  ) : config.logoPemdaUrl ? (
                    <div className="rounded-lg bg-slate-100 border border-slate-200 p-1.5 text-[10px] text-slate-600 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Ukuran Logo:
                      </span>
                      <span className="font-semibold text-slate-800">
                        ~{formatBytes(estimateBase64Size(config.logoPemdaUrl))} (Optimal)
                      </span>
                    </div>
                  ) : null}
                </div>

                {/* 2. LOGO SEKOLAH (SISI KANAN) */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        <School className="w-3.5 h-3.5 text-slate-600" />
                        Logo Sekolah (Kanan)
                      </span>
                      {config.logoSekolahUrl && (
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                          Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Logo Resmi Sekolah / Tut Wuri Handayani
                    </p>
                  </div>

                  {/* Logo Preview or Placeholder */}
                  <div className="flex items-center gap-3 py-1">
                    <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-xs">
                      {config.logoSekolahUrl ? (
                        <img
                          src={config.logoSekolahUrl}
                          alt="Logo Sekolah"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <School className="w-8 h-8 text-slate-400" />
                      )}
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <input
                        type="file"
                        ref={sekolahInputRef}
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleLogoFile('logoSekolahUrl', file);
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => sekolahInputRef.current?.click()}
                        disabled={isUploadingSekolah}
                        className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-indigo-600 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isUploadingSekolah ? 'Mengompresi...' : config.logoSekolahUrl ? 'Ganti Logo' : 'Unggah Logo'}</span>
                      </button>

                      {config.logoSekolahUrl && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLogo('logoSekolahUrl')}
                          className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Compression Stats for Sekolah Logo */}
                  {logoStats.logoSekolahUrl ? (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200/80 p-2 text-[10px] space-y-0.5 text-emerald-900">
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Dikompresi & Dioptimalkan
                        </span>
                        <span className="text-emerald-700 font-mono">-{logoStats.logoSekolahUrl.reductionPercent}%</span>
                      </div>
                      <div className="flex justify-between text-emerald-700">
                        <span>Awal ➔ Hasil:</span>
                        <span className="font-semibold">{logoStats.logoSekolahUrl.originalSizeFormatted} ➔ {logoStats.logoSekolahUrl.compressedSizeFormatted}</span>
                      </div>
                      <div className="flex justify-between text-emerald-700">
                        <span>Dimensi Cetak:</span>
                        <span className="font-mono">{logoStats.logoSekolahUrl.width} × {logoStats.logoSekolahUrl.height} px</span>
                      </div>
                    </div>
                  ) : config.logoSekolahUrl ? (
                    <div className="rounded-lg bg-slate-100 border border-slate-200 p-1.5 text-[10px] text-slate-600 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Ukuran Logo:
                      </span>
                      <span className="font-semibold text-slate-800">
                        ~{formatBytes(estimateBase64Size(config.logoSekolahUrl))} (Optimal)
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Pemerintah Daerah */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Pemerintah Daerah (Tingkat Provinsi / Kab / Kota)
                </label>
                <input
                  type="text"
                  value={config.pemerintahDaerah}
                  onChange={(e) => handleChange('pemerintahDaerah', e.target.value)}
                  placeholder="Contoh: PEMERINTAH DAERAH PROVINSI JAWA BARAT"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              {/* Dinas Pendidikan */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Dinas Pendidikan & Kebudayaan
                </label>
                <input
                  type="text"
                  value={config.dinasPendidikan}
                  onChange={(e) => handleChange('dinasPendidikan', e.target.value)}
                  placeholder="Contoh: DINAS PENDIDIKAN & KEBUDAYAAN"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              {/* Nama Satuan Pendidikan */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Resmi Satuan Pendidikan (Sekolah)
                </label>
                <input
                  type="text"
                  value={config.namaSekolah}
                  onChange={(e) => handleChange('namaSekolah', e.target.value)}
                  placeholder="Contoh: UPTD SMP NEGERI 21 KOTA CERDAS"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-bold text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              {/* Alamat & Kontak */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Alamat Lengkap & Nomor Telepon
                  </label>
                  <input
                    type="text"
                    value={config.alamatLengkap}
                    onChange={(e) => handleChange('alamatLengkap', e.target.value)}
                    placeholder="Jalan Pendidikan No. 21 Telepon (022) 7123456"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kontak / Email / Website
                  </label>
                  <input
                    type="text"
                    value={config.kontakInfo}
                    onChange={(e) => handleChange('kontakInfo', e.target.value)}
                    placeholder="Email: smpn21@kotacerdas.sch.id"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              {/* NPSN, Tahun Ajaran, Semester */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    NPSN Sekolah
                  </label>
                  <input
                    type="text"
                    value={config.npsn}
                    onChange={(e) => handleChange('npsn', e.target.value)}
                    placeholder="20210021"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-800 font-mono focus:border-blue-600 focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tahun Ajaran
                  </label>
                  <input
                    type="text"
                    value={config.tahunAjaran}
                    onChange={(e) => handleChange('tahunAjaran', e.target.value)}
                    placeholder="2025/2026"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Semester
                  </label>
                  <select
                    value={config.semester}
                    onChange={(e) => handleChange('semester', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-hidden"
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>
              </div>

              {/* Titimangsa & Pengesahan Kepala Sekolah */}
              <div className="pt-2 border-t border-slate-100">
                <span className="block font-bold text-slate-800 mb-2">
                  Pengesahan & Tanda Tangan Kepala Sekolah
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Kota Titimangsa
                    </label>
                    <input
                      type="text"
                      value={config.kotaTandaTangan}
                      onChange={(e) => handleChange('kotaTandaTangan', e.target.value)}
                      placeholder="Kota Cerdas"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-hidden"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nama Kepala Sekolah
                    </label>
                    <input
                      type="text"
                      value={config.namaKepalaSekolah}
                      onChange={(e) => handleChange('namaKepalaSekolah', e.target.value)}
                      placeholder="Drs. H. Rahmat Hidayat, M.M.Pd."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-bold text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-hidden"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      NIP Kepala Sekolah
                    </label>
                    <input
                      type="text"
                      value={config.nipKepalaSekolah}
                      onChange={(e) => handleChange('nipKepalaSekolah', e.target.value)}
                      placeholder="197001011995031002"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-mono text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-hidden"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-800 transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan Kop & Logo</span>
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview of Kop Surat (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-slate-500" />
                Pratinjau Langsung Cetakan Kop
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Format A4 Resmi</span>
            </div>

            {/* Simulated Paper */}
            <div className="rounded-xl border border-slate-300 bg-white p-4 font-serif text-slate-900 shadow-inner">
              {/* Kop Header */}
              <div className="flex items-center justify-between border-b-2 border-double border-slate-900 pb-2 mb-3">
                {/* Logo Pemda (Kiri) */}
                <div className="w-12 h-12 flex items-center justify-center p-0.5 text-center font-sans shrink-0">
                  {config.logoPemdaUrl ? (
                    <img
                      src={config.logoPemdaUrl}
                      alt="Logo Pemda"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full border border-slate-800 flex items-center justify-center p-1 text-center font-sans">
                      <Building2 className="w-6 h-6 text-slate-800" />
                    </div>
                  )}
                </div>

                <div className="text-center flex-1 px-2">
                  <h4 className="text-[9px] uppercase tracking-wider font-sans font-bold text-slate-700">
                    {config.pemerintahDaerah || 'PEMERINTAH DAERAH'}
                  </h4>
                  <h3 className="text-[9px] uppercase tracking-wider font-sans font-bold text-slate-700">
                    {config.dinasPendidikan || 'DINAS PENDIDIKAN'}
                  </h3>
                  <h1 className="text-xs font-black uppercase tracking-wide text-slate-900 font-sans">
                    {config.namaSekolah || 'NAMA SEKOLAH'}
                  </h1>
                  <p className="text-[8px] font-sans text-slate-600 mt-0.5 leading-tight">
                    {config.alamatLengkap} • {config.kontakInfo} • NPSN: {config.npsn}
                  </p>
                </div>

                {/* Logo Sekolah (Kanan) */}
                <div className="w-12 h-12 flex items-center justify-center p-0.5 text-center font-sans shrink-0">
                  {config.logoSekolahUrl ? (
                    <img
                      src={config.logoSekolahUrl}
                      alt="Logo Sekolah"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl border border-dashed border-slate-400 flex flex-col items-center justify-center text-[7px] text-slate-400 font-sans text-center">
                      <School className="w-4 h-4 text-slate-400" />
                      <span>Sekolah</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Sample Document Title */}
              <div className="text-center my-3">
                <h2 className="text-[11px] font-bold uppercase underline font-sans">
                  Laporan Rekapitulasi Pembelajaran & Asesmen
                </h2>
                <p className="text-[9px] text-slate-600 mt-0.5 font-sans">
                  Tahun Ajaran {config.tahunAjaran} — Semester {config.semester}
                </p>
              </div>

              <div className="text-[8px] font-sans text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded my-2">
                [ Isi Tabel Rekap Jurnal Agenda / Leger Nilai Siswa ]
              </div>

              {/* Signature Section Preview */}
              <div className="mt-4 pt-2 grid grid-cols-2 text-[9px] font-sans gap-2">
                <div className="text-center">
                  <p className="text-slate-500">Mengetahui,</p>
                  <p className="font-bold text-slate-800">Kepala Sekolah</p>
                  <div className="h-8" />
                  <p className="font-bold underline text-slate-900">{config.namaKepalaSekolah}</p>
                  <p className="text-[8px] font-mono text-slate-600">NIP. {config.nipKepalaSekolah}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-500">{config.kotaTandaTangan}, 2026</p>
                  <p className="font-bold text-slate-800">Guru Pengampu</p>
                  <div className="h-8" />
                  <p className="font-bold underline text-slate-900">[ Nama Guru Pengampu ]</p>
                  <p className="text-[8px] font-mono text-slate-600">NIP. [ 19xxxxxxxxxx ]</p>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mt-3 flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                Setiap kali disimpan, seluruh cetakan di menu <strong>Rekap & Laporan</strong> akan otomatis menyertakan logo resmi ini.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
