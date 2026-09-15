import { User, Siswa, Jadwal, Agenda, Penilaian, KopSuratConfig } from '../types';
import { INITIAL_USERS, INITIAL_SISWA, INITIAL_JADWAL, INITIAL_AGENDA, INITIAL_PENILAIAN } from '../data/initialData';
import { FirestoreService } from './firestoreService';

const DEFAULT_KOP_SURAT: KopSuratConfig = {
  pemerintahDaerah: 'Pemerintah Daerah Provinsi Jawa Barat',
  dinasPendidikan: 'Dinas Pendidikan & Kebudayaan',
  namaSekolah: 'UPTD SMP NEGERI 21 KOTA CERDAS',
  alamatLengkap: 'Jalan Pendidikan No. 21 Telepon (022) 7123456',
  kontakInfo: 'Email: smpn21@kotacerdas.sch.id',
  npsn: '20210021',
  tahunAjaran: '2025/2026',
  semester: 'Ganjil',
  kotaTandaTangan: 'Kota Cerdas',
  namaKepalaSekolah: 'Drs. H. Rahmat Hidayat, M.M.Pd.',
  nipKepalaSekolah: '197001011995031002',
};

const STORAGE_KEYS = {
  USERS: 'agenda21_users',
  SISWA: 'agenda21_siswa',
  JADWAL: 'agenda21_jadwal',
  AGENDA: 'agenda21_agenda',
  PENILAIAN: 'agenda21_penilaian',
  SESSION: 'agenda21_active_session',
  SCRIPT_URL: 'agenda21_apps_script_url',
  LAST_SYNC: 'agenda21_last_sync_timestamp',
  KOP_SURAT: 'agenda21_kop_surat_config',
  SHOW_DEMO_ACCOUNTS: 'agenda21_show_demo_accounts',
};

// Concurrency mutex lock simulation
let isLocked = false;

export const StorageService = {
  // Initialization
  initStorage(): void {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SISWA)) {
      localStorage.setItem(STORAGE_KEYS.SISWA, JSON.stringify(INITIAL_SISWA));
    }
    if (!localStorage.getItem(STORAGE_KEYS.JADWAL)) {
      localStorage.setItem(STORAGE_KEYS.JADWAL, JSON.stringify(INITIAL_JADWAL));
    }
    if (!localStorage.getItem(STORAGE_KEYS.AGENDA)) {
      localStorage.setItem(STORAGE_KEYS.AGENDA, JSON.stringify(INITIAL_AGENDA));
    }
    const existingPenilaian = localStorage.getItem(STORAGE_KEYS.PENILAIAN);
    if (!existingPenilaian) {
      localStorage.setItem(STORAGE_KEYS.PENILAIAN, JSON.stringify(INITIAL_PENILAIAN));
    } else {
      try {
        const parsed = JSON.parse(existingPenilaian);
        if (Array.isArray(parsed) && parsed.length <= 5) {
          localStorage.setItem(STORAGE_KEYS.PENILAIAN, JSON.stringify(INITIAL_PENILAIAN));
        }
      } catch {
        // ignore
      }
    }
  },

  // Users
  getUsers(): User[] {
    this.initStorage();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      return data ? JSON.parse(data) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  },

  saveUsers(users: User[]): void {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  addUser(user: User): void {
    const users = this.getUsers();
    users.push(user);
    this.saveUsers(users);
    FirestoreService.saveUser(user).catch(console.warn);
  },

  updateUser(user: User): void {
    const users = this.getUsers().map(u => u.ID_User === user.ID_User ? user : u);
    this.saveUsers(users);
    FirestoreService.saveUser(user).catch(console.warn);
  },

  deleteUser(id: string): void {
    const users = this.getUsers().filter(u => u.ID_User !== id);
    this.saveUsers(users);
    FirestoreService.deleteUser(id).catch(console.warn);
  },

  // Siswa
  getSiswa(): Siswa[] {
    this.initStorage();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SISWA);
      return data ? JSON.parse(data) : INITIAL_SISWA;
    } catch {
      return INITIAL_SISWA;
    }
  },

  saveSiswa(siswaList: Siswa[]): void {
    localStorage.setItem(STORAGE_KEYS.SISWA, JSON.stringify(siswaList));
  },

  addSiswa(siswa: Siswa): void {
    const list = this.getSiswa();
    // Check if NISN already exists
    const exists = list.some(s => s.NISN === siswa.NISN);
    if (exists) {
      throw new Error(`Siswa dengan NISN ${siswa.NISN} sudah terdaftar.`);
    }
    list.push(siswa);
    this.saveSiswa(list);
    FirestoreService.saveSiswa(siswa).catch(console.warn);
  },

  updateSiswa(siswa: Siswa): void {
    const list = this.getSiswa().map(s => s.NISN === siswa.NISN ? siswa : s);
    this.saveSiswa(list);
    FirestoreService.saveSiswa(siswa).catch(console.warn);
  },

  deleteSiswa(nisn: string): void {
    const list = this.getSiswa().filter(s => s.NISN !== nisn);
    this.saveSiswa(list);
    FirestoreService.deleteSiswa(nisn).catch(console.warn);
  },

  importSiswaBatch(
    newStudents: Siswa[],
    mode: 'upsert' | 'replace' | 'skipExisting' = 'upsert'
  ): {
    total: number;
    added: number;
    updated: number;
    skipped: number;
  } {
    const currentList = this.getSiswa();
    let updatedCount = 0;
    let addedCount = 0;
    let skippedCount = 0;

    if (mode === 'replace') {
      this.saveSiswa(newStudents);
      FirestoreService.saveSiswaBatch(newStudents).catch(console.warn);
      return {
        total: newStudents.length,
        added: newStudents.length,
        updated: 0,
        skipped: 0,
      };
    }

    const siswaMap = new Map<string, Siswa>(currentList.map(s => [s.NISN, s]));

    newStudents.forEach(item => {
      if (siswaMap.has(item.NISN)) {
        if (mode === 'upsert') {
          siswaMap.set(item.NISN, item);
          updatedCount++;
        } else {
          skippedCount++;
        }
      } else {
        siswaMap.set(item.NISN, item);
        addedCount++;
      }
    });

    const finalList = Array.from(siswaMap.values());
    this.saveSiswa(finalList);
    FirestoreService.saveSiswaBatch(finalList).catch(console.warn);

    return {
      total: newStudents.length,
      added: addedCount,
      updated: updatedCount,
      skipped: skippedCount,
    };
  },

  // Jadwal
  getJadwal(): Jadwal[] {
    this.initStorage();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.JADWAL);
      return data ? JSON.parse(data) : INITIAL_JADWAL;
    } catch {
      return INITIAL_JADWAL;
    }
  },

  saveJadwal(jadwalList: Jadwal[]): void {
    localStorage.setItem(STORAGE_KEYS.JADWAL, JSON.stringify(jadwalList));
  },

  addJadwal(jadwal: Jadwal): void {
    const list = this.getJadwal();
    list.push(jadwal);
    this.saveJadwal(list);
    FirestoreService.saveJadwal(jadwal).catch(console.warn);
  },

  updateJadwal(jadwal: Jadwal): void {
    const list = this.getJadwal().map(j => j.ID_Jadwal === jadwal.ID_Jadwal ? jadwal : j);
    this.saveJadwal(list);
    FirestoreService.saveJadwal(jadwal).catch(console.warn);
  },

  deleteJadwal(id: string): void {
    const list = this.getJadwal().filter(j => j.ID_Jadwal !== id);
    this.saveJadwal(list);
    FirestoreService.deleteJadwal(id).catch(console.warn);
  },

  // Agenda (with simulated LockService lock)
  getAgenda(): Agenda[] {
    this.initStorage();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AGENDA);
      return data ? JSON.parse(data) : INITIAL_AGENDA;
    } catch {
      return INITIAL_AGENDA;
    }
  },

  async saveAgendaItem(agenda: Agenda): Promise<void> {
    if (isLocked) {
      throw new Error('LockService Active: Server database sedang dikunci oleh transaksi guru lain. Harap tunggu sesaat.');
    }
    isLocked = true;
    try {
      // Simulate LockService latency
      await new Promise(res => setTimeout(res, 400));
      const list = this.getAgenda();
      const existingIdx = list.findIndex(a => a.ID_Agenda === agenda.ID_Agenda);
      if (existingIdx >= 0) {
        list[existingIdx] = agenda;
      } else {
        list.unshift(agenda);
      }
      localStorage.setItem(STORAGE_KEYS.AGENDA, JSON.stringify(list));
      FirestoreService.saveAgenda(agenda).catch(console.warn);
    } finally {
      isLocked = false;
    }
  },

  saveAgenda(list: Agenda[]): void {
    localStorage.setItem(STORAGE_KEYS.AGENDA, JSON.stringify(list));
  },

  deleteAgenda(id: string): void {
    const list = this.getAgenda().filter(a => a.ID_Agenda !== id);
    localStorage.setItem(STORAGE_KEYS.AGENDA, JSON.stringify(list));
    FirestoreService.deleteAgenda(id).catch(console.warn);
  },

  // Penilaian (with simulated LockService lock)
  getPenilaian(): Penilaian[] {
    this.initStorage();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PENILAIAN);
      return data ? JSON.parse(data) : INITIAL_PENILAIAN;
    } catch {
      return INITIAL_PENILAIAN;
    }
  },

  async savePenilaianItem(item: Penilaian): Promise<void> {
    if (isLocked) {
      throw new Error('LockService Active: Transaksi penyimpanan nilai sedang dikunci. Mohon tunggu.');
    }
    isLocked = true;
    try {
      await new Promise(res => setTimeout(res, 400));
      const list = this.getPenilaian();
      const existingIdx = list.findIndex(n => n.ID_Nilai === item.ID_Nilai);
      if (existingIdx >= 0) {
        list[existingIdx] = item;
      } else {
        list.unshift(item);
      }
      localStorage.setItem(STORAGE_KEYS.PENILAIAN, JSON.stringify(list));
      FirestoreService.savePenilaian(item).catch(console.warn);
    } finally {
      isLocked = false;
    }
  },

  async saveBatchPenilaian(items: Penilaian[]): Promise<void> {
    if (isLocked) {
      throw new Error('LockService Active: Transaksi batch nilai sedang dikunci.');
    }
    isLocked = true;
    try {
      await new Promise(res => setTimeout(res, 600));
      const list = this.getPenilaian();
      const map = new Map<string, Penilaian>(list.map(n => [n.ID_Nilai, n]));
      items.forEach(it => map.set(it.ID_Nilai, it));
      const updated = Array.from(map.values()).sort((a, b) => (b.CreatedAt || '').localeCompare(a.CreatedAt || ''));
      localStorage.setItem(STORAGE_KEYS.PENILAIAN, JSON.stringify(updated));
      items.forEach(it => FirestoreService.savePenilaian(it).catch(console.warn));
    } finally {
      isLocked = false;
    }
  },

  savePenilaian(list: Penilaian[]): void {
    localStorage.setItem(STORAGE_KEYS.PENILAIAN, JSON.stringify(list));
  },

  deletePenilaian(id: string): void {
    const list = this.getPenilaian().filter(n => n.ID_Nilai !== id);
    localStorage.setItem(STORAGE_KEYS.PENILAIAN, JSON.stringify(list));
    FirestoreService.deletePenilaian(id).catch(console.warn);
  },

  // Kop Surat Configuration
  getKopSurat(): KopSuratConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.KOP_SURAT);
      return data ? { ...DEFAULT_KOP_SURAT, ...JSON.parse(data) } : DEFAULT_KOP_SURAT;
    } catch {
      return DEFAULT_KOP_SURAT;
    }
  },

  saveKopSurat(config: KopSuratConfig): void {
    localStorage.setItem(STORAGE_KEYS.KOP_SURAT, JSON.stringify(config));
    FirestoreService.saveKopSurat(config).catch(console.warn);
  },

  resetKopSurat(): KopSuratConfig {
    localStorage.removeItem(STORAGE_KEYS.KOP_SURAT);
    FirestoreService.saveKopSurat(DEFAULT_KOP_SURAT).catch(console.warn);
    return DEFAULT_KOP_SURAT;
  },

  // Demo Accounts Visibility (Bisa disembunyikan untuk keperluan live production)
  getShowDemoAccounts(): boolean {
    const val = localStorage.getItem(STORAGE_KEYS.SHOW_DEMO_ACCOUNTS);
    // Default false jika sudah diakses online / production agar tidak bocor, atau bisa ditoggle user
    return val !== null ? val === 'true' : false;
  },

  setShowDemoAccounts(show: boolean): void {
    localStorage.setItem(STORAGE_KEYS.SHOW_DEMO_ACCOUNTS, String(show));
  },

  // Session
  getSession(): User | null {
    try {
      const s = localStorage.getItem(STORAGE_KEYS.SESSION);
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  },

  setSession(user: User): void {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
  },

  clearSession(): void {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  },

  // Apps Script Webhook URL & Sync
  getAppsScriptUrl(): string {
    return localStorage.getItem(STORAGE_KEYS.SCRIPT_URL) || '';
  },

  setAppsScriptUrl(url: string): void {
    localStorage.setItem(STORAGE_KEYS.SCRIPT_URL, url.trim());
  },

  getLastSync(): string | null {
    return localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  },

  getLastSyncTimestamp(): string | null {
    return this.getLastSync();
  },

  setLastSyncTimestamp(timestamp: string): void {
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, timestamp);
  },

  async syncWithAppsScript(
    customUrl?: string,
    direction: 'both' | 'pull' | 'push' = 'both'
  ): Promise<{ success: boolean; message: string }> {
    const url = customUrl || this.getAppsScriptUrl();
    if (!url) {
      throw new Error('URL Web App Google Apps Script belum dikonfigurasi.');
    }

    const payload = {
      action: 'syncAll',
      direction,
      data: {
        users: this.getUsers(),
        siswa: this.getSiswa(),
        jadwal: this.getJadwal(),
        agenda: this.getAgenda(),
        penilaian: this.getPenilaian(),
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (result.status === 'success') {
      const now = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, now);

      // If data was returned (pull or both), update local state
      if (result.data) {
        const d = result.data;
        const incomingUsers = d.users || d.Users;
        const incomingSiswa = d.siswa || d.Siswa;
        const incomingJadwal = d.jadwal || d.Jadwal;
        const incomingAgenda = d.agenda || d.Agenda;
        const incomingPenilaian = d.penilaian || d.Penilaian;

        if (Array.isArray(incomingUsers) && incomingUsers.length > 0) this.saveUsers(incomingUsers);
        if (Array.isArray(incomingSiswa) && incomingSiswa.length > 0) this.saveSiswa(incomingSiswa);
        if (Array.isArray(incomingJadwal) && incomingJadwal.length > 0) this.saveJadwal(incomingJadwal);
        if (Array.isArray(incomingAgenda) && incomingAgenda.length > 0) this.saveAgenda(incomingAgenda);
        if (Array.isArray(incomingPenilaian) && incomingPenilaian.length > 0) this.savePenilaian(incomingPenilaian);
      }

      return { success: true, message: result.message || 'Sinkronisasi berhasil!' };
    } else {
      throw new Error(result.message || 'Gagal melakukan sinkronisasi dengan Google Sheet.');
    }
  },

  // Reset to Factory Default
  resetToDefaults(): void {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.SISWA, JSON.stringify(INITIAL_SISWA));
    localStorage.setItem(STORAGE_KEYS.JADWAL, JSON.stringify(INITIAL_JADWAL));
    localStorage.setItem(STORAGE_KEYS.AGENDA, JSON.stringify(INITIAL_AGENDA));
    localStorage.setItem(STORAGE_KEYS.PENILAIAN, JSON.stringify(INITIAL_PENILAIAN));
  },

  resetToInitialData(): void {
    this.resetToDefaults();
  },

  // Backup and Restore JSON
  exportAllJSON(): string {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      users: this.getUsers(),
      siswa: this.getSiswa(),
      jadwal: this.getJadwal(),
      agenda: this.getAgenda(),
      penilaian: this.getPenilaian(),
    };
    return JSON.stringify(backup, null, 2);
  },

  importFromJSON(jsonString: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.users && Array.isArray(parsed.users)) this.saveUsers(parsed.users);
      if (parsed.siswa && Array.isArray(parsed.siswa)) this.saveSiswa(parsed.siswa);
      if (parsed.jadwal && Array.isArray(parsed.jadwal)) this.saveJadwal(parsed.jadwal);
      if (parsed.agenda && Array.isArray(parsed.agenda)) this.saveAgenda(parsed.agenda);
      if (parsed.penilaian && Array.isArray(parsed.penilaian)) this.savePenilaian(parsed.penilaian);
      return { success: true, message: 'Data berhasil dipulihkan.' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Format JSON tidak valid.' };
    }
  },

  // Export Data to CSV
  exportToCSV(sheetName: 'Agenda' | 'Penilaian' | 'Siswa' | 'Jadwal' | 'Users'): string {
    let headers: string[] = [];
    let rows: any[] = [];

    switch (sheetName) {
      case 'Agenda':
        headers = ['ID_Agenda', 'NIP_Guru', 'Tanggal', 'Jam_Ke', 'Kelas', 'Mata_Pelajaran', 'Materi_Pokok', 'Total_Hadir', 'Total_Siswa', 'Status', 'Catatan_Refleksi'];
        rows = this.getAgenda();
        break;
      case 'Penilaian':
        headers = ['ID_Nilai', 'NIP_Guru', 'NISN', 'Tanggal', 'Mata_Pelajaran', 'Kategori_Asesmen', 'Nilai_Skor', 'Catatan_Evaluasi'];
        rows = this.getPenilaian();
        break;
      case 'Siswa':
        headers = ['NISN', 'Nama_Siswa', 'Kelas'];
        rows = this.getSiswa();
        break;
      case 'Jadwal':
        headers = ['ID_Jadwal', 'NIP_Guru', 'Kelas', 'Mata_Pelajaran', 'Hari', 'Jam_Mulai', 'Jam_Selesai'];
        rows = this.getJadwal();
        break;
      case 'Users':
        headers = ['ID_User', 'NIP_Username', 'Nama_Lengkap', 'Role', 'Mata_Pelajaran', 'Email'];
        rows = this.getUsers();
        break;
    }

    const csvLines = [headers.join(',')];
    rows.forEach(r => {
      const line = headers.map(h => {
        const val = r[h] !== undefined ? String(r[h]).replace(/"/g, '""') : '';
        return `"${val}"`;
      }).join(',');
      csvLines.push(line);
    });

    return csvLines.join('\n');
  },
};
