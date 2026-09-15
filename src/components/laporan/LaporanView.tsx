import React, { useState, useMemo, useEffect } from 'react';
import { User, Agenda, Penilaian, Siswa, Jadwal, KopSuratConfig, ActiveTab } from '../../types';
import { StorageService } from '../../services/storageService';
import { useToast } from '../../hooks/useToast';
import { 
  FileText, 
  Printer, 
  FileDown, 
  Search, 
  Calendar, 
  Award, 
  CheckCircle2, 
  GraduationCap, 
  Building2,
  School,
  Filter,
  Settings
} from 'lucide-react';

interface LaporanViewProps {
  currentUser: User;
  agendaList: Agenda[];
  penilaianList: Penilaian[];
  siswaList: Siswa[];
  usersList: User[];
  onNavigate?: (tab: ActiveTab) => void;
}

export const LaporanView: React.FC<LaporanViewProps> = ({
  currentUser,
  agendaList,
  penilaianList,
  siswaList,
  usersList,
  onNavigate,
}) => {
  const { showSuccess } = useToast();
  const isAdmin = currentUser?.Role === 'Admin';

  // Dynamic Kop Surat from Storage
  const [kopSurat, setKopSurat] = useState<KopSuratConfig>(() => StorageService.getKopSurat());

  // Reload Kop Surat if changed
  useEffect(() => {
    setKopSurat(StorageService.getKopSurat());
  }, []);

  // Sub-tabs: 'agenda' or 'nilai'
  const [reportType, setReportType] = useState<'agenda' | 'nilai'>('agenda');

  // Filter States
  const [selectedGuruNip, setSelectedGuruNip] = useState<string>(
    isAdmin ? 'all' : (currentUser?.NIP_Username || 'all')
  );
  const [selectedKelas, setSelectedKelas] = useState<string>('all');
  const [selectedMapel, setSelectedMapel] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('2026-08-01');
  const [endDate, setEndDate] = useState<string>('2026-12-31');

  const teachers = useMemo(() => usersList.filter((u) => u.Role === 'Guru'), [usersList]);
  const availableClasses = useMemo(() => {
    return Array.from(new Set(siswaList.map((s) => s.Kelas))).sort();
  }, [siswaList]);

  const availableMapels = useMemo(() => {
    const fromPenilaian = penilaianList.map((p) => p.Mata_Pelajaran).filter(Boolean);
    const fromUsers = usersList.map((u) => u.Mata_Pelajaran).filter(Boolean) as string[];
    return Array.from(new Set([...fromPenilaian, ...fromUsers])).sort();
  }, [penilaianList, usersList]);

  // Active teacher name for report
  const selectedTeacherObj = useMemo(() => {
    if (selectedGuruNip === 'all') return null;
    return usersList.find((u) => u.NIP_Username === selectedGuruNip) || null;
  }, [selectedGuruNip, usersList]);

  // Filtered Agendas
  const filteredAgendas = useMemo(() => {
    return agendaList.filter((a) => {
      const matchGuru = selectedGuruNip === 'all' || a.NIP_Guru === selectedGuruNip;
      const matchKelas = selectedKelas === 'all' || a.Kelas === selectedKelas;
      const matchDate = (!startDate || a.Tanggal >= startDate) && (!endDate || a.Tanggal <= endDate);
      return matchGuru && matchKelas && matchDate;
    }).sort((a, b) => a.Tanggal.localeCompare(b.Tanggal));
  }, [agendaList, selectedGuruNip, selectedKelas, startDate, endDate]);

  // Calculated stats for agenda report
  const agendaStats = useMemo(() => {
    const totalSesi = filteredAgendas.length;
    const totalHadir = filteredAgendas.reduce((acc, curr) => acc + curr.Total_Hadir, 0);
    const totalMax = filteredAgendas.reduce((acc, curr) => acc + curr.Total_Siswa, 0);
    const rate = totalMax > 0 ? Math.round((totalHadir / totalMax) * 100) : 100;
    return { totalSesi, totalHadir, totalMax, rate };
  }, [filteredAgendas]);

  // Filtered Penilaians for Leger Nilai
  const filteredPenilaians = useMemo(() => {
    return penilaianList.filter((p) => {
      const matchGuru = selectedGuruNip === 'all' || p.NIP_Guru === selectedGuruNip;
      const matchMapel =
        selectedMapel === 'all' || p.Mata_Pelajaran.toLowerCase() === selectedMapel.toLowerCase();
      return matchGuru && matchMapel;
    });
  }, [penilaianList, selectedGuruNip, selectedMapel]);

  // Target rombel / kelas untuk leger
  const targetKelas = useMemo(() => {
    return selectedKelas === 'all' ? availableClasses[0] : selectedKelas;
  }, [selectedKelas, availableClasses]);

  // Siswa pada kelas yang dipilih
  const currentStudentsInKelas = useMemo(() => {
    return siswaList.filter((s) => s.Kelas === targetKelas);
  }, [siswaList, targetKelas]);

  // Kolom Formatif Dinamis untuk Leger:
  // Menghitung berapa kali penginputan formatif yang telah dilakukan untuk kelas ini (minimal F1 s/d F4)
  const maxFormatifCount = useMemo(() => {
    if (currentStudentsInKelas.length === 0) return 4;
    const counts = currentStudentsInKelas.map((s) => {
      return filteredPenilaians.filter(
        (p) =>
          p.NISN === s.NISN &&
          p.Kategori_Asesmen &&
          p.Kategori_Asesmen.toLowerCase().includes('formatif')
      ).length;
    });
    const maxInClass = Math.max(...counts, 0);
    return Math.max(4, maxInClass);
  }, [currentStudentsInKelas, filteredPenilaians]);

  const formatifColumns = useMemo(() => {
    return Array.from({ length: maxFormatifCount }, (_, i) => ({
      index: i,
      label: `Formatif ${i + 1}`,
      shortLabel: `F${i + 1}`,
    }));
  }, [maxFormatifCount]);

  // Kolom Sumatif Lingkup Materi Dinamis untuk Leger:
  // Menghitung berapa kali penginputan Sumatif LM yang telah dilakukan (minimal LM 1 s/d LM 3)
  const maxSumatifLMCount = useMemo(() => {
    if (currentStudentsInKelas.length === 0) return 3;
    const counts = currentStudentsInKelas.map((s) => {
      return filteredPenilaians.filter(
        (p) =>
          p.NISN === s.NISN &&
          p.Kategori_Asesmen &&
          p.Kategori_Asesmen.toLowerCase().includes('lingkup materi')
      ).length;
    });
    const maxInClass = Math.max(...counts, 0);
    return Math.max(3, maxInClass);
  }, [currentStudentsInKelas, filteredPenilaians]);

  const sumatifLMColumns = useMemo(() => {
    return Array.from({ length: maxSumatifLMCount }, (_, i) => ({
      index: i,
      label: `Sumatif Lingkup Materi ${i + 1}`,
      shortLabel: `LM ${i + 1}`,
    }));
  }, [maxSumatifLMCount]);

  // Build Leger Nilai Matrix per Student for selected class
  const legerData = useMemo(() => {
    return currentStudentsInKelas.map((s) => {
      const studentScores = filteredPenilaians.filter((p) => p.NISN === s.NISN);

      // Ambil seluruh asesmen formatif siswa secara urut kronologis
      const studentFormatifs = studentScores
        .filter((p) => p.Kategori_Asesmen && p.Kategori_Asesmen.toLowerCase().includes('formatif'))
        .sort((a, b) => {
          const cmpTanggal = (a.Tanggal || '').localeCompare(b.Tanggal || '');
          if (cmpTanggal !== 0) return cmpTanggal;
          return (a.CreatedAt || a.ID_Nilai || '').localeCompare(b.CreatedAt || b.ID_Nilai || '');
        });

      // Nilai per kolom Formatif (F1, F2, F3, dst.)
      const formatifValues: (number | null)[] = [];
      const formatifRecords: (Penilaian | null)[] = [];
      for (let i = 0; i < maxFormatifCount; i++) {
        const item = studentFormatifs[i];
        if (item && typeof item.Nilai_Skor === 'number') {
          formatifValues.push(item.Nilai_Skor);
          formatifRecords.push(item);
        } else {
          formatifValues.push(null);
          formatifRecords.push(null);
        }
      }

      // Rata-rata Formatif yang valid
      const validFormatifScores = studentFormatifs
        .map((f) => f.Nilai_Skor)
        .filter((val): val is number => typeof val === 'number' && !isNaN(val));

      const rataFormatif =
        validFormatifScores.length > 0
          ? Math.round(validFormatifScores.reduce((a, b) => a + b, 0) / validFormatifScores.length)
          : null;

      // Ambil seluruh asesmen Sumatif Lingkup Materi siswa (dapat diinput berulang kali)
      const studentSumatifLMs = studentScores
        .filter(
          (p) => p.Kategori_Asesmen && p.Kategori_Asesmen.toLowerCase().includes('lingkup materi')
        )
        .sort((a, b) => {
          const extractLMNum = (cat: string) => {
            const match = cat.match(/(?:LM|Lingkup\s*Materi)\s*(\d+)/i);
            return match ? parseInt(match[1], 10) : null;
          };
          const numA = extractLMNum(a.Kategori_Asesmen);
          const numB = extractLMNum(b.Kategori_Asesmen);
          if (numA !== null && numB !== null && numA !== numB) return numA - numB;
          if (numA !== null && numB === null) return -1;
          if (numA === null && numB !== null) return 1;

          const cmpTanggal = (a.Tanggal || '').localeCompare(b.Tanggal || '');
          if (cmpTanggal !== 0) return cmpTanggal;
          return (a.CreatedAt || a.ID_Nilai || '').localeCompare(b.CreatedAt || b.ID_Nilai || '');
        });

      // Tempatkan skor pada slot kolom LM 1, LM 2, LM 3, dst.
      const sumatifLMValues: (number | null)[] = Array(maxSumatifLMCount).fill(null);
      const sumatifLMRecords: (Penilaian | null)[] = Array(maxSumatifLMCount).fill(null);

      // Prioritas 1: Asesmen dengan penamaan eksplisit LM ke- (contoh: LM 1, LM 2, dst.)
      const unassignedLMs: Penilaian[] = [];
      studentSumatifLMs.forEach((item) => {
        const match = item.Kategori_Asesmen.match(/(?:LM|Lingkup\s*Materi)\s*(\d+)/i);
        if (match) {
          const slot = parseInt(match[1], 10) - 1;
          if (slot >= 0 && slot < maxSumatifLMCount && sumatifLMValues[slot] === null) {
            sumatifLMValues[slot] = item.Nilai_Skor;
            sumatifLMRecords[slot] = item;
            return;
          }
        }
        unassignedLMs.push(item);
      });

      // Prioritas 2: Asesmen tanpa penomoran eksplisit ditempatkan ke slot kosong berurutan
      let nextEmpty = 0;
      unassignedLMs.forEach((item) => {
        while (nextEmpty < maxSumatifLMCount && sumatifLMValues[nextEmpty] !== null) {
          nextEmpty++;
        }
        if (nextEmpty < maxSumatifLMCount) {
          sumatifLMValues[nextEmpty] = item.Nilai_Skor;
          sumatifLMRecords[nextEmpty] = item;
          nextEmpty++;
        }
      });

      // Rata-rata dari seluruh Sumatif LM yang valid
      const validSumatifLMScores = studentSumatifLMs
        .map((lm) => lm.Nilai_Skor)
        .filter((val): val is number => typeof val === 'number' && !isNaN(val));

      const rataSumatifLM =
        validSumatifLMScores.length > 0
          ? Math.round(validSumatifLMScores.reduce((a, b) => a + b, 0) / validSumatifLMScores.length)
          : null;

      // Sumatif Akhir Semester / STS / SAS
      const sumAS =
        studentScores.find(
          (p) =>
            p.Kategori_Asesmen &&
            (p.Kategori_Asesmen.toLowerCase().includes('akhir semester') ||
              p.Kategori_Asesmen.toLowerCase().includes('tengah semester') ||
              p.Kategori_Asesmen.toLowerCase().includes('sas') ||
              p.Kategori_Asesmen.toLowerCase().includes('sts'))
        )?.Nilai_Skor ?? null;

      // Nilai Akhir (NA): Rata-rata dari komponen valid (Rata Formatif + Rata Sumatif LM + Sumatif AS)
      const validComponents: number[] = [];
      if (rataFormatif !== null) validComponents.push(rataFormatif);
      if (rataSumatifLM !== null) validComponents.push(rataSumatifLM);
      if (sumAS !== null) validComponents.push(sumAS);

      const na =
        validComponents.length > 0
          ? Math.round(validComponents.reduce((a, b) => a + b, 0) / validComponents.length)
          : null;

      let predikat = '-';
      let status = 'Belum Lengkap';
      if (na !== null) {
        if (na >= 90) predikat = 'A (Sangat Baik)';
        else if (na >= 80) predikat = 'B (Baik)';
        else if (na >= 70) predikat = 'C (Cukup)';
        else predikat = 'D (Perlu Bimbingan)';

        status = na >= 75 ? 'Tuntas' : 'Perlu Remedial';
      }

      return {
        ...s,
        studentFormatifs,
        formatifValues,
        formatifRecords,
        rataFormatif,
        studentSumatifLMs,
        sumatifLMValues,
        sumatifLMRecords,
        rataSumatifLM,
        sumAS,
        na,
        predikat,
        status,
      };
    });
  }, [currentStudentsInKelas, filteredPenilaians, maxFormatifCount, maxSumatifLMCount]);

  // Statistik Kelas untuk Leger Nilai
  const legerStats = useMemo(() => {
    const totalSiswa = legerData.length;
    const scoredStudents = legerData.filter((s) => s.na !== null);
    const avgNilai =
      scoredStudents.length > 0
        ? Math.round((scoredStudents.reduce((acc, curr) => acc + (curr.na || 0), 0) / scoredStudents.length) * 10) / 10
        : 0;
    const tuntasCount = legerData.filter((s) => s.status === 'Tuntas').length;
    const remedialCount = legerData.filter((s) => s.status === 'Perlu Remedial').length;
    const passRate = totalSiswa > 0 ? Math.round((tuntasCount / totalSiswa) * 100) : 0;

    return { totalSiswa, avgNilai, tuntasCount, remedialCount, passRate };
  }, [legerData]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (reportType === 'agenda') {
      const csv = StorageService.exportToCSV('Agenda');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rekap_Agenda_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess('Export Berhasil', 'Data rekapitulasi agenda berhasil diunduh.');
      return;
    }

    // Export format Buku Leger Nilai Lengkap
    const headers = [
      'No',
      'NISN',
      'Nama Siswa',
      'Kelas',
      ...formatifColumns.map((c) => c.label),
      'Rata-rata Formatif',
      ...sumatifLMColumns.map((c) => c.label),
      'Rata-rata Sumatif LM',
      'Sumatif AS',
      'Nilai Akhir',
      'Predikat',
      'Ketuntasan',
    ];

    const rows = legerData.map((s, idx) => {
      return [
        idx + 1,
        `"${s.NISN}"`,
        `"${s.Nama_Siswa.replace(/"/g, '""')}"`,
        `"${s.Kelas}"`,
        ...formatifColumns.map((c) => (s.formatifValues[c.index] !== null ? s.formatifValues[c.index] : '')),
        s.rataFormatif !== null ? s.rataFormatif : '',
        ...sumatifLMColumns.map((c) => (s.sumatifLMValues[c.index] !== null ? s.sumatifLMValues[c.index] : '')),
        s.rataSumatifLM !== null ? s.rataSumatifLM : '',
        s.sumAS !== null ? s.sumAS : '',
        s.na !== null ? s.na : '',
        `"${s.predikat}"`,
        `"${s.status}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Leger_Nilai_Kelas_${targetKelas}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess('Export Berhasil', `Buku Leger Nilai kelas ${targetKelas} berhasil diunduh.`);
  };

  return (
    <div className="space-y-6">
      {/* Non-Printable Header & Controls */}
      <div className="print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-700" />
              <h2 className="text-xl font-bold text-slate-900">Rekapitulasi & Cetak Dokumen Resmi</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Cetak laporan rekap agenda mengajar harian dan buku nilai / leger siswa berformat kop resmi sekolah.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && onNavigate && (
              <button
                onClick={() => onNavigate('pengaturan-kop')}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-700 transition cursor-pointer shadow-2xs"
                title="Sesuaikan identitas kop surat sekolah"
              >
                <Settings className="w-4 h-4 text-blue-600" />
                <span>Ubah Kop Surat</span>
              </button>
            )}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            >
              <FileDown className="w-4 h-4 text-emerald-600" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 text-xs font-semibold shadow-md active:scale-95 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Cetak PDF</span>
            </button>
          </div>
        </div>

        {/* Filters Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex flex-wrap items-center gap-4">
            {/* Report Type Selector */}
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setReportType('agenda')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  reportType === 'agenda' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Rekap Jurnal Mengajar
              </button>
              <button
                onClick={() => setReportType('nilai')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  reportType === 'nilai' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Buku Leger Nilai Siswa
              </button>
            </div>

            {/* Teacher Filter (For Admin) */}
            {isAdmin && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Guru Pengampu</label>
                <select
                  value={selectedGuruNip}
                  onChange={(e) => setSelectedGuruNip(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden"
                >
                  <option value="all">Semua Guru</option>
                  {teachers.map((t) => (
                    <option key={t.ID_User} value={t.NIP_Username}>
                      {t.Nama_Lengkap} ({t.Mata_Pelajaran || 'Guru'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Class Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Rombel / Kelas</label>
              <select
                value={selectedKelas}
                onChange={(e) => setSelectedKelas(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 font-semibold text-blue-900 focus:outline-hidden"
              >
                {reportType === 'agenda' && <option value="all">Semua Kelas</option>}
                {availableClasses.map((k) => (
                  <option key={k} value={k}>
                    Kelas {k}
                  </option>
                ))}
              </select>
            </div>

            {/* Mata Pelajaran Filter for Leger Nilai */}
            {reportType === 'nilai' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Mata Pelajaran</label>
                <select
                  value={selectedMapel}
                  onChange={(e) => setSelectedMapel(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden"
                >
                  <option value="all">Semua Mata Pelajaran</option>
                  {availableMapels.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Range for Agenda */}
            {reportType === 'agenda' && (
              <>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Dari Tanggal</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Sampai Tanggal</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* DOCUMENT TO PRINT: OFFICIAL SCHOOL REPORT FORMAT */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-10 shadow-sm print:border-none print:p-0 print:shadow-none font-serif text-slate-900">
        {/* Kop Surat Resmi */}
        <div className="flex items-center justify-between border-b-4 border-double border-slate-900 pb-4 mb-6">
          {/* Logo Pemda (Kiri) */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center p-1 text-center shrink-0">
            {kopSurat.logoPemdaUrl ? (
              <img
                src={kopSurat.logoPemdaUrl}
                alt="Logo Pemda"
                className="max-h-full max-w-full object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-14 h-14 rounded-full border-2 border-slate-800 flex items-center justify-center p-2 text-center text-xs font-bold font-sans">
                <Building2 className="w-8 h-8 text-slate-800" />
              </div>
            )}
          </div>

          <div className="text-center flex-1 px-4">
            <h4 className="text-xs sm:text-sm uppercase tracking-widest font-sans font-bold text-slate-700">
              {kopSurat.pemerintahDaerah}
            </h4>
            <h3 className="text-xs sm:text-sm uppercase tracking-widest font-sans font-bold text-slate-700">
              {kopSurat.dinasPendidikan}
            </h3>
            <h1 className="text-lg sm:text-xl font-black uppercase tracking-wider text-slate-900 font-sans">
              {kopSurat.namaSekolah}
            </h1>
            <p className="text-[11px] font-sans text-slate-600 mt-0.5">
              {kopSurat.alamatLengkap} • {kopSurat.kontakInfo} • NPSN: {kopSurat.npsn}
            </p>
          </div>

          {/* Logo Sekolah (Kanan) */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center p-1 text-center shrink-0">
            {kopSurat.logoSekolahUrl ? (
              <img
                src={kopSurat.logoSekolahUrl}
                alt="Logo Sekolah"
                className="max-h-full max-w-full object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl border border-dashed border-slate-400 flex flex-col items-center justify-center text-[9px] text-slate-400 font-sans text-center">
                <School className="w-6 h-6 text-slate-400 mb-0.5" />
                <span>Sekolah</span>
              </div>
            )}
          </div>
        </div>

        {/* Title of Document */}
        <div className="text-center my-6">
          <h2 className="text-base sm:text-lg font-bold uppercase underline tracking-wide font-sans">
            {reportType === 'agenda'
              ? 'Laporan Rekapitulasi Jurnal Mengajar & Presensi Guru'
              : 'Buku Leger Nilai Hasil Belajar Siswa (Kurikulum Merdeka)'}
          </h2>
          <p className="text-xs text-slate-600 mt-1 font-sans">
            Tahun Ajaran {kopSurat.tahunAjaran} — Semester {kopSurat.semester}
          </p>
        </div>

        {/* Metadata Guru / Kelas */}
        <div className="grid grid-cols-2 gap-4 text-xs font-sans mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="space-y-1">
            <div>
              <span className="text-slate-500">Guru Pengampu: </span>
              <strong className="text-slate-900">
                {selectedTeacherObj ? selectedTeacherObj.Nama_Lengkap : (isAdmin ? 'Semua Guru Terdata' : currentUser.Nama_Lengkap)}
              </strong>
            </div>
            <div>
              <span className="text-slate-500">NIP / ID: </span>
              <span className="font-mono text-slate-800">
                {selectedTeacherObj ? selectedTeacherObj.NIP_Username : (isAdmin ? '-' : currentUser.NIP_Username)}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Mata Pelajaran: </span>
              <span className="text-slate-800 font-semibold">
                {selectedTeacherObj?.Mata_Pelajaran || currentUser.Mata_Pelajaran || 'Semua Mata Pelajaran'}
              </span>
            </div>
          </div>

          <div className="space-y-1 text-right sm:text-left">
            <div>
              <span className="text-slate-500">Rombongan Belajar: </span>
              <strong className="text-slate-900">
                {selectedKelas === 'all' ? 'Seluruh Kelas' : `Kelas ${selectedKelas}`}
              </strong>
            </div>
            {reportType === 'agenda' ? (
              <div>
                <span className="text-slate-500">Periode: </span>
                <span className="text-slate-800">
                  {startDate} s/d {endDate}
                </span>
              </div>
            ) : (
              <div>
                <span className="text-slate-500">Kriteria Ketercapaian: </span>
                <strong className="text-emerald-700">KKTP ≥ 75</strong>
              </div>
            )}
            <div>
              <span className="text-slate-500">Dicetak Pada: </span>
              <span className="text-slate-800">{new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</span>
            </div>
          </div>
        </div>

        {/* DOCUMENT CONTENT 1: Agenda Mengajar Report */}
        {reportType === 'agenda' && (
          <div className="space-y-4">
            {/* Quick Summary Badges in Printout */}
            <div className="flex items-center justify-between text-xs font-sans p-3 bg-blue-50/60 rounded-lg border border-blue-200">
              <span>Total Tatap Muka: <strong>{agendaStats.totalSesi} Sesi</strong></span>
              <span>Total Siswa Hadir: <strong>{agendaStats.totalHadir} / {agendaStats.totalMax}</strong></span>
              <span>Persentase Kehadiran Rata-Rata: <strong className="text-blue-900">{agendaStats.rate}%</strong></span>
            </div>

            <table className="w-full text-left text-xs font-sans border-collapse border border-slate-300">
              <thead className="bg-slate-100 text-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="border border-slate-300 p-2 text-center w-8">No</th>
                  <th className="border border-slate-300 p-2 w-24">Tanggal</th>
                  <th className="border border-slate-300 p-2 text-center w-16">Jam</th>
                  <th className="border border-slate-300 p-2 text-center w-14">Kelas</th>
                  <th className="border border-slate-300 p-2">Materi Pokok Pembelajaran</th>
                  <th className="border border-slate-300 p-2 text-center w-20">Kehadiran</th>
                  <th className="border border-slate-300 p-2 text-center w-24">Status</th>
                  <th className="border border-slate-300 p-2">Catatan Refleksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgendas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="border border-slate-300 p-4 text-center text-slate-400">
                      Tidak ada rekaman agenda mengajar pada filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredAgendas.map((item, idx) => (
                    <tr key={item.ID_Agenda} className="hover:bg-slate-50">
                      <td className="border border-slate-300 p-2 text-center font-mono">{idx + 1}</td>
                      <td className="border border-slate-300 p-2 font-mono whitespace-nowrap">{item.Tanggal}</td>
                      <td className="border border-slate-300 p-2 text-center font-mono">{item.Jam_Ke}</td>
                      <td className="border border-slate-300 p-2 text-center font-bold">{item.Kelas}</td>
                      <td className="border border-slate-300 p-2 font-medium">{item.Materi_Pokok}</td>
                      <td className="border border-slate-300 p-2 text-center whitespace-nowrap font-mono">
                        {item.Total_Hadir}/{item.Total_Siswa}
                      </td>
                      <td className="border border-slate-300 p-2 text-center">
                        <span className="font-semibold text-slate-800">{item.Status}</span>
                      </td>
                      <td className="border border-slate-300 p-2 italic text-slate-600">
                        {item.Catatan_Refleksi || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* DOCUMENT CONTENT 2: Leger Nilai Siswa Report */}
        {reportType === 'nilai' && (
          <div className="space-y-4">
            {/* Quick Summary Badges in Printout */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-sans p-3 bg-emerald-50/70 rounded-lg border border-emerald-200 text-emerald-950">
              <span>
                Total Rombel: <strong>{legerStats.totalSiswa} Siswa</strong>
              </span>
              <span>
                Rata-rata Kelas: <strong className="text-emerald-900">{legerStats.avgNilai}</strong>
              </span>
              <span>
                Tercapai (KKTP):{' '}
                <strong className="text-emerald-700">
                  {legerStats.tuntasCount} Siswa ({legerStats.passRate}%)
                </strong>
              </span>
              <span>
                Perlu Pengayaan/Remedial:{' '}
                <strong className={legerStats.remedialCount > 0 ? 'text-rose-700' : 'text-slate-600'}>
                  {legerStats.remedialCount} Siswa
                </strong>
              </span>
              <span>
                Asesmen LM: <strong className="text-emerald-800">{maxSumatifLMCount} Kolom LM Terpantau</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans border-collapse border border-slate-300">
                <thead className="bg-slate-100 text-slate-800 text-[11px]">
                  <tr>
                    <th rowSpan={2} className="border border-slate-300 p-2 text-center w-8">
                      No
                    </th>
                    <th rowSpan={2} className="border border-slate-300 p-2 w-24">
                      NISN
                    </th>
                    <th rowSpan={2} className="border border-slate-300 p-2 min-w-36">
                      Nama Lengkap Siswa
                    </th>
                    <th
                      colSpan={formatifColumns.length + 1}
                      className="border border-slate-300 p-1.5 text-center bg-indigo-50/80 text-indigo-950 font-bold uppercase tracking-wider"
                    >
                      Asesmen Formatif (F)
                    </th>
                    <th
                      colSpan={sumatifLMColumns.length + 1}
                      className="border border-slate-300 p-1.5 text-center bg-emerald-50/80 text-emerald-950 font-bold uppercase tracking-wider"
                    >
                      Sumatif Lingkup Materi (LM)
                    </th>
                    <th rowSpan={2} className="border border-slate-300 p-2 text-center whitespace-nowrap px-2.5">
                      Sumatif AS
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-slate-300 p-2 text-center whitespace-nowrap bg-blue-50 text-blue-900 font-bold px-3"
                    >
                      Nilai Akhir
                    </th>
                    <th rowSpan={2} className="border border-slate-300 p-2 text-center w-24 whitespace-nowrap">
                      Predikat
                    </th>
                    <th rowSpan={2} className="border border-slate-300 p-2 text-center w-24 whitespace-nowrap">
                      Ketuntasan
                    </th>
                  </tr>
                  <tr>
                    {formatifColumns.map((col) => (
                      <th
                        key={col.index}
                        className="border border-slate-300 p-1.5 text-center whitespace-nowrap px-2 font-semibold text-slate-700"
                        title={col.label}
                      >
                        {col.shortLabel}
                      </th>
                    ))}
                    <th className="border border-slate-300 p-1.5 text-center whitespace-nowrap bg-indigo-100/70 text-indigo-950 font-bold px-2">
                      Rata F
                    </th>
                    {sumatifLMColumns.map((col) => (
                      <th
                        key={col.index}
                        className="border border-slate-300 p-1.5 text-center whitespace-nowrap px-2 font-semibold text-slate-700"
                        title={col.label}
                      >
                        {col.shortLabel}
                      </th>
                    ))}
                    <th className="border border-slate-300 p-1.5 text-center whitespace-nowrap bg-emerald-100/70 text-emerald-950 font-bold px-2">
                      Rata LM
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {legerData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8 + formatifColumns.length + sumatifLMColumns.length}
                        className="border border-slate-300 p-4 text-center text-slate-400"
                      >
                        Tidak ada data siswa untuk rombel ini.
                      </td>
                    </tr>
                  ) : (
                    legerData.map((s, idx) => (
                      <tr key={s.NISN} className="hover:bg-slate-50">
                        <td className="border border-slate-300 p-2 text-center font-mono">{idx + 1}</td>
                        <td className="border border-slate-300 p-2 font-mono whitespace-nowrap">{s.NISN}</td>
                        <td className="border border-slate-300 p-2 font-bold">{s.Nama_Siswa}</td>
                        {formatifColumns.map((col) => {
                          const val = s.formatifValues[col.index];
                          const rec = s.formatifRecords[col.index];
                          return (
                            <td
                              key={col.index}
                              className="border border-slate-300 p-2 text-center font-mono"
                              title={
                                rec ? `Tgl: ${rec.Tanggal} - ${rec.Catatan_Evaluasi || 'Asesmen Formatif'}` : ''
                              }
                            >
                              {val ?? '-'}
                            </td>
                          );
                        })}
                        <td className="border border-slate-300 p-2 text-center font-mono font-bold bg-indigo-50/40 text-indigo-900">
                          {s.rataFormatif ?? '-'}
                        </td>
                        {sumatifLMColumns.map((col) => {
                          const val = s.sumatifLMValues[col.index];
                          const rec = s.sumatifLMRecords[col.index];
                          return (
                            <td
                              key={col.index}
                              className="border border-slate-300 p-2 text-center font-mono"
                              title={
                                rec
                                  ? `Tgl: ${rec.Tanggal} - ${rec.Catatan_Evaluasi || rec.Kategori_Asesmen}`
                                  : ''
                              }
                            >
                              {val ?? '-'}
                            </td>
                          );
                        })}
                        <td className="border border-slate-300 p-2 text-center font-mono font-bold bg-emerald-50/40 text-emerald-900">
                          {s.rataSumatifLM ?? '-'}
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-mono">{s.sumAS ?? '-'}</td>
                        <td className="border border-slate-300 p-2 text-center font-bold font-mono bg-blue-50/60 text-slate-900">
                          {s.na ?? '-'}
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-medium whitespace-nowrap">
                          {s.predikat}
                        </td>
                        <td className="border border-slate-300 p-2 text-center whitespace-nowrap">
                          <span
                            className={`font-semibold ${
                              s.status === 'Tuntas' ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tanda Tangan Resmi Pengesahan Dokumen */}
        <div className="grid grid-cols-2 gap-8 text-xs font-sans mt-12 pt-8 border-t border-slate-200">
          <div className="text-center">
            <p>Mengetahui,</p>
            <p className="font-semibold">Kepala {kopSurat.namaSekolah}</p>
            <div className="h-20" />
            <p className="font-bold underline uppercase">{kopSurat.namaKepalaSekolah}</p>
            <p className="text-slate-600 font-mono">NIP. {kopSurat.nipKepalaSekolah}</p>
          </div>

          <div className="text-center">
            <p>{kopSurat.kotaTandaTangan}, {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
            <p className="font-semibold">Guru Mata Pelajaran</p>
            <div className="h-20" />
            <p className="font-bold underline uppercase">
              {selectedTeacherObj ? selectedTeacherObj.Nama_Lengkap : currentUser.Nama_Lengkap}
            </p>
            <p className="text-slate-600 font-mono">
              NIP. {selectedTeacherObj ? selectedTeacherObj.NIP_Username : currentUser.NIP_Username}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
