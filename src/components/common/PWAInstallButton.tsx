import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Share, PlusSquare, X, Check } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  if (isInstalled) {
    return (
      <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/70 text-emerald-300 border border-emerald-500/30 text-xs font-medium">
        <Check className="w-3.5 h-3.5 text-emerald-400" />
        <span>PWA Aktif</span>
      </div>
    );
  }

  const handleInstallClick = async () => {
    setIsInstalling(true);
    try {
      await install();
    } finally {
      setIsInstalling(false);
    }
  };

  if (isInstallable) {
    return (
      <button
        onClick={handleInstallClick}
        disabled={isInstalling}
        className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer border border-blue-400/30"
        title="Instal aplikasi ke perangkat Anda"
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Pasang Aplikasi</span>
        <span className="sm:hidden">Install</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg border border-blue-500/40 bg-blue-900/40 text-blue-200 px-3 py-1.5 text-xs font-medium hover:bg-blue-900/60 transition cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Pasang di iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-sm">
                    21
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">Pasang di iPhone / iPad</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-slate-600">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 text-xs">
                    1
                  </span>
                  <p>
                    Buka aplikasi di browser <strong>Safari</strong>, lalu tekan tombol{' '}
                    <span className="inline-flex items-center font-semibold text-blue-700">
                      <Share className="w-3.5 h-3.5 inline mx-1" /> Bagikan (Share)
                    </span>{' '}
                    di bilah navigasi bawah Safari.
                  </p>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 text-xs">
                    2
                  </span>
                  <p>
                    Gulir menu ke bawah dan pilih opsi{' '}
                    <span className="inline-flex items-center font-semibold text-slate-900">
                      <PlusSquare className="w-3.5 h-3.5 inline mx-1" /> Tambahkan ke Layar Utama
                    </span>{' '}
                    (Add to Home Screen).
                  </p>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 text-xs">
                    3
                  </span>
                  <p>Tekan <strong>Tambah</strong> di sudut kanan atas. Ikon Agenda 21 akan muncul di layar utama.</p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-blue-700 py-2.5 text-xs font-semibold text-white hover:bg-blue-800 transition"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
