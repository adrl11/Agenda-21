export type UserRole = 'Admin' | 'Guru';

export interface KopSuratConfig {
  pemerintahDaerah: string;
  dinasPendidikan: string;
  namaSekolah: string;
  alamatLengkap: string;
  kontakInfo: string;
  npsn: string;
  tahunAjaran: string;
  semester: string;
  kotaTandaTangan: string;
  namaKepalaSekolah: string;
  nipKepalaSekolah: string;
  logoPemdaUrl?: string;
  logoSekolahUrl?: string;
  logoUrl?: string;
}

export interface User {
  ID_User: string;
  NIP_Username: string;
  Nama_Lengkap: string;
  Password: string;
  Role: UserRole;
  Mata_Pelajaran?: string;
  Email?: string;
  Telepon?: string;
}

export interface Siswa {
  NISN: string;
  Nama_Siswa: string;
  Kelas: string;
  Jenis_Kelamin?: 'L' | 'P';
}

export type Hari = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu';

export interface Jadwal {
  ID_Jadwal: string;
  NIP_Guru: string;
  Kelas: string;
  Mata_Pelajaran: string;
  Hari: Hari;
  Jam_Mulai: string; // e.g. "07:30"
  Jam_Selesai: string; // e.g. "09:00"
}

export type AgendaStatus = 'Terlaksana' | 'Diganti' | 'Tugas Mandiri';

export interface Agenda {
  ID_Agenda: string;
  NIP_Guru: string;
  Tanggal: string; // YYYY-MM-DD
  Jam_Ke: string; // e.g. "1 - 2"
  Kelas: string;
  Mata_Pelajaran: string;
  Materi_Pokok: string;
  Total_Hadir: number;
  Total_Siswa: number;
  Status: AgendaStatus;
  Catatan_Refleksi: string;
  CreatedAt?: string;
}

export type KategoriAsesmen = 
  | 'Formatif' 
  | 'Sumatif Lingkup Materi' 
  | 'Sumatif Tengah Semester (STS)' 
  | 'Sumatif Akhir Semester (SAS)'
  | string;

export interface Penilaian {
  ID_Nilai: string;
  NIP_Guru: string;
  NISN: string;
  Tanggal: string; // YYYY-MM-DD
  Mata_Pelajaran: string;
  Kategori_Asesmen: KategoriAsesmen;
  Nilai_Skor: number; // 0 - 100
  Catatan_Evaluasi: string;
  CreatedAt?: string;
}

export type ActiveTab = 
  | 'dashboard' 
  | 'agenda' 
  | 'penilaian' 
  | 'laporan' 
  | 'master-guru' 
  | 'master-siswa' 
  | 'master-jadwal' 
  | 'pengaturan-kop'
  | 'integrasi-sheet';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}
