import { 
  collection, 
  getDocs, 
  getDoc,
  doc, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';
import { StorageService } from './storageService';
import { User, Siswa, Jadwal, Agenda, Penilaian, KopSuratConfig } from '../types';

export const FirestoreService = {
  // Push all local data into Cloud Firestore
  async pushAllToFirestore(): Promise<{ success: boolean; count: number; message: string }> {
    try {
      const users = StorageService.getUsers();
      const siswa = StorageService.getSiswa();
      const jadwal = StorageService.getJadwal();
      const agenda = StorageService.getAgenda();
      const penilaian = StorageService.getPenilaian();
      const kopSurat = StorageService.getKopSurat();

      // Collect all operations to commit in safe chunks of 400
      type BatchOp = (b: ReturnType<typeof writeBatch>) => void;
      const operations: BatchOp[] = [];

      users.forEach(u => {
        operations.push(b => {
          const docRef = doc(db, 'users', u.ID_User || u.NIP_Username);
          b.set(docRef, u, { merge: true });
        });
      });

      siswa.forEach(s => {
        operations.push(b => {
          const docRef = doc(db, 'siswa', s.NISN);
          b.set(docRef, s, { merge: true });
        });
      });

      jadwal.forEach(j => {
        operations.push(b => {
          const docRef = doc(db, 'jadwal', j.ID_Jadwal);
          b.set(docRef, j, { merge: true });
        });
      });

      agenda.forEach(a => {
        operations.push(b => {
          const docRef = doc(db, 'agenda', a.ID_Agenda);
          b.set(docRef, a, { merge: true });
        });
      });

      penilaian.forEach(p => {
        operations.push(b => {
          const docRef = doc(db, 'penilaian', p.ID_Nilai);
          b.set(docRef, p, { merge: true });
        });
      });

      if (kopSurat && kopSurat.namaSekolah) {
        operations.push(b => {
          const kopRef = doc(db, 'settings', 'kop_surat');
          b.set(kopRef, kopSurat, { merge: true });
        });
      }

      // Execute in chunks of 400 to prevent Firestore's 500 limit
      const chunkSize = 400;
      for (let i = 0; i < operations.length; i += chunkSize) {
        const chunk = operations.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(op => op(batch));
        await batch.commit();
      }

      const now = new Date().toISOString();
      StorageService.setLastSyncTimestamp(now);

      return {
        success: true,
        count: operations.length,
        message: `Berhasil mengunggah ${operations.length} data lokal ke Cloud Firestore.`
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Gagal sinkronisasi ke Firestore';
      console.error('Firestore push error:', err);
      throw new Error(errorMsg);
    }
  },

  // Pull all data from Cloud Firestore with intelligent safe merge
  async pullAllFromFirestore(): Promise<{ 
    success: boolean; 
    message: string;
    counts: { users: number; siswa: number; jadwal: number; agenda: number; penilaian: number };
  }> {
    try {
      const counts = { users: 0, siswa: 0, jadwal: 0, agenda: 0, penilaian: 0 };

      // Users - Merge by ID_User / NIP_Username
      const usersSnap = await getDocs(collection(db, 'users'));
      const cloudUsers: User[] = [];
      usersSnap.forEach(d => cloudUsers.push(d.data() as User));
      if (cloudUsers.length > 0) {
        const localUsers = StorageService.getUsers();
        const userMap = new Map<string, User>();
        localUsers.forEach(u => userMap.set(u.ID_User || u.NIP_Username, u));
        cloudUsers.forEach(u => userMap.set(u.ID_User || u.NIP_Username, u));
        const mergedUsers = Array.from(userMap.values());
        StorageService.saveUsers(mergedUsers);
        counts.users = mergedUsers.length;
      }

      // Siswa - Merge by NISN (preserves local additions, takes latest cloud)
      const siswaSnap = await getDocs(collection(db, 'siswa'));
      const cloudSiswa: Siswa[] = [];
      siswaSnap.forEach(d => cloudSiswa.push(d.data() as Siswa));
      if (cloudSiswa.length > 0) {
        const localSiswa = StorageService.getSiswa();
        const siswaMap = new Map<string, Siswa>();
        localSiswa.forEach(s => siswaMap.set(s.NISN, s));
        cloudSiswa.forEach(s => siswaMap.set(s.NISN, s));
        const mergedSiswa = Array.from(siswaMap.values()).sort(
          (a, b) => a.Kelas.localeCompare(b.Kelas) || a.Nama_Siswa.localeCompare(b.Nama_Siswa)
        );
        StorageService.saveSiswa(mergedSiswa);
        counts.siswa = mergedSiswa.length;
      }

      // Jadwal - Merge by ID_Jadwal
      const jadwalSnap = await getDocs(collection(db, 'jadwal'));
      const cloudJadwal: Jadwal[] = [];
      jadwalSnap.forEach(d => cloudJadwal.push(d.data() as Jadwal));
      if (cloudJadwal.length > 0) {
        const localJadwal = StorageService.getJadwal();
        const jadwalMap = new Map<string, Jadwal>();
        localJadwal.forEach(j => jadwalMap.set(j.ID_Jadwal, j));
        cloudJadwal.forEach(j => jadwalMap.set(j.ID_Jadwal, j));
        const mergedJadwal = Array.from(jadwalMap.values());
        StorageService.saveJadwal(mergedJadwal);
        counts.jadwal = mergedJadwal.length;
      }

      // Agenda - Merge by ID_Agenda
      const agendaSnap = await getDocs(collection(db, 'agenda'));
      const cloudAgenda: Agenda[] = [];
      agendaSnap.forEach(d => cloudAgenda.push(d.data() as Agenda));
      if (cloudAgenda.length > 0) {
        const localAgenda = StorageService.getAgenda();
        const agendaMap = new Map<string, Agenda>();
        localAgenda.forEach(a => agendaMap.set(a.ID_Agenda, a));
        cloudAgenda.forEach(a => agendaMap.set(a.ID_Agenda, a));
        const mergedAgenda = Array.from(agendaMap.values()).sort(
          (a, b) => (b.Tanggal || '').localeCompare(a.Tanggal || '') || (b.CreatedAt || '').localeCompare(a.CreatedAt || '')
        );
        StorageService.saveAgenda(mergedAgenda);
        counts.agenda = mergedAgenda.length;
      }

      // Penilaian - Merge by ID_Nilai
      const penilaianSnap = await getDocs(collection(db, 'penilaian'));
      const cloudPenilaian: Penilaian[] = [];
      penilaianSnap.forEach(d => cloudPenilaian.push(d.data() as Penilaian));
      if (cloudPenilaian.length > 0) {
        const localPenilaian = StorageService.getPenilaian();
        const penilaianMap = new Map<string, Penilaian>();
        localPenilaian.forEach(p => penilaianMap.set(p.ID_Nilai, p));
        cloudPenilaian.forEach(p => penilaianMap.set(p.ID_Nilai, p));
        const mergedPenilaian = Array.from(penilaianMap.values()).sort(
          (a, b) => (b.CreatedAt || '').localeCompare(a.CreatedAt || '')
        );
        StorageService.savePenilaian(mergedPenilaian);
        counts.penilaian = mergedPenilaian.length;
      }

      // Kop Surat Settings
      try {
        const kopDoc = await getDoc(doc(db, 'settings', 'kop_surat'));
        if (kopDoc.exists()) {
          const kopData = kopDoc.data() as KopSuratConfig;
          if (kopData && kopData.namaSekolah) {
            StorageService.saveKopSurat(kopData);
          }
        }
      } catch (kopErr) {
        console.warn('Failed to pull kop_surat:', kopErr);
      }

      const now = new Date().toISOString();
      StorageService.setLastSyncTimestamp(now);

      return {
        success: true,
        counts,
        message: `Berhasil mengunduh ${counts.siswa} siswa, ${counts.agenda} agenda, ${counts.penilaian} penilaian, ${counts.jadwal} jadwal dari Cloud Firestore!`
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Gagal mengambil data dari Firestore';
      console.error('Firestore pull error:', err);
      throw new Error(errorMsg);
    }
  },

  // Two-way synchronization with Firestore (Smart Safe Merge & Sync)
  async syncBothWithFirestore(): Promise<{ success: boolean; message: string }> {
    // 1. Pull latest cloud records and safely merge into local storage
    const pullRes = await this.pullAllFromFirestore();
    // 2. Push all merged records to cloud so cloud has the complete combined set
    await this.pushAllToFirestore();
    return {
      success: true,
      message: `Sinkronisasi selesai! ${pullRes.counts.siswa} siswa, ${pullRes.counts.agenda} agenda, ${pullRes.counts.penilaian} penilaian tersinkronisasi di semua perangkat.`
    };
  },

  // Direct operations for single items (real-time responsiveness)
  async saveSiswa(siswa: Siswa): Promise<void> {
    try {
      const docRef = doc(db, 'siswa', siswa.NISN);
      await setDoc(docRef, siswa, { merge: true });
    } catch (err) {
      console.warn('Gagal menyimpan siswa ke Firestore:', err);
    }
  },

  async deleteSiswa(nisn: string): Promise<void> {
    try {
      const docRef = doc(db, 'siswa', nisn);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Gagal menghapus siswa dari Firestore:', err);
    }
  },

  async saveSiswaBatch(siswaList: Siswa[]): Promise<{ success: boolean; count: number }> {
    try {
      // Chunk batches by 450 to stay well under Firestore's 500 limit
      const chunkSize = 400;
      for (let i = 0; i < siswaList.length; i += chunkSize) {
        const chunk = siswaList.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((s) => {
          const docRef = doc(db, 'siswa', s.NISN);
          batch.set(docRef, s, { merge: true });
        });
        await batch.commit();
      }
      return { success: true, count: siswaList.length };
    } catch (err) {
      console.warn('Gagal menyimpan batch siswa ke Firestore:', err);
      throw err;
    }
  },

  async saveAgenda(agenda: Agenda): Promise<void> {
    try {
      const docRef = doc(db, 'agenda', agenda.ID_Agenda);
      await setDoc(docRef, agenda, { merge: true });
    } catch (err) {
      console.warn('Gagal menyimpan agenda ke Firestore (offline mode active):', err);
    }
  },

  async deleteAgenda(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'agenda', id);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Gagal menghapus agenda dari Firestore:', err);
    }
  },

  async savePenilaian(penilaian: Penilaian): Promise<void> {
    try {
      const docRef = doc(db, 'penilaian', penilaian.ID_Nilai);
      await setDoc(docRef, penilaian, { merge: true });
    } catch (err) {
      console.warn('Gagal menyimpan penilaian ke Firestore:', err);
    }
  },

  async deletePenilaian(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'penilaian', id);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Gagal menghapus penilaian dari Firestore:', err);
    }
  },

  async saveUser(user: User): Promise<void> {
    try {
      const docRef = doc(db, 'users', user.ID_User || user.NIP_Username);
      await setDoc(docRef, user, { merge: true });
    } catch (err) {
      console.warn('Gagal menyimpan user ke Firestore:', err);
    }
  },

  async deleteUser(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'users', id);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Gagal menghapus user dari Firestore:', err);
    }
  },

  async saveJadwal(jadwal: Jadwal): Promise<void> {
    try {
      const docRef = doc(db, 'jadwal', jadwal.ID_Jadwal);
      await setDoc(docRef, jadwal, { merge: true });
    } catch (err) {
      console.warn('Gagal menyimpan jadwal ke Firestore:', err);
    }
  },

  async deleteJadwal(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'jadwal', id);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Gagal menghapus jadwal dari Firestore:', err);
    }
  },

  // Real-time listener for Agenda and Penilaian
  subscribeToAgenda(onUpdate: (agendas: Agenda[]) => void): Unsubscribe {
    return onSnapshot(collection(db, 'agenda'), (snap) => {
      const agendas: Agenda[] = [];
      snap.forEach(d => agendas.push(d.data() as Agenda));
      if (agendas.length > 0) {
        agendas.sort((a, b) => (b.Tanggal || '').localeCompare(a.Tanggal || '') || (b.CreatedAt || '').localeCompare(a.CreatedAt || ''));
        onUpdate(agendas);
      }
    }, (err) => {
      console.warn('Agenda real-time listener error:', err);
    });
  },

  subscribeToPenilaian(onUpdate: (penilaian: Penilaian[]) => void): Unsubscribe {
    return onSnapshot(collection(db, 'penilaian'), (snap) => {
      const penilaian: Penilaian[] = [];
      snap.forEach(d => penilaian.push(d.data() as Penilaian));
      if (penilaian.length > 0) {
        penilaian.sort((a, b) => (b.CreatedAt || '').localeCompare(a.CreatedAt || ''));
        onUpdate(penilaian);
      }
    }, (err) => {
      console.warn('Penilaian real-time listener error:', err);
    });
  },

  subscribeToSiswa(onUpdate: (siswa: Siswa[]) => void): Unsubscribe {
    return onSnapshot(collection(db, 'siswa'), (snap) => {
      const list: Siswa[] = [];
      snap.forEach(d => list.push(d.data() as Siswa));
      if (list.length > 0) {
        list.sort((a, b) => a.Kelas.localeCompare(b.Kelas) || a.Nama_Siswa.localeCompare(b.Nama_Siswa));
        onUpdate(list);
      }
    }, (err) => {
      console.warn('Siswa real-time listener error:', err);
    });
  },

  subscribeToJadwal(onUpdate: (jadwal: Jadwal[]) => void): Unsubscribe {
    return onSnapshot(collection(db, 'jadwal'), (snap) => {
      const list: Jadwal[] = [];
      snap.forEach(d => list.push(d.data() as Jadwal));
      if (list.length > 0) {
        onUpdate(list);
      }
    }, (err) => {
      console.warn('Jadwal real-time listener error:', err);
    });
  },

  subscribeToUsers(onUpdate: (users: User[]) => void): Unsubscribe {
    return onSnapshot(collection(db, 'users'), (snap) => {
      const list: User[] = [];
      snap.forEach(d => list.push(d.data() as User));
      if (list.length > 0) {
        onUpdate(list);
      }
    }, (err) => {
      console.warn('Users real-time listener error:', err);
    });
  },

  async saveKopSurat(kop: KopSuratConfig): Promise<void> {
    try {
      const docRef = doc(db, 'settings', 'kop_surat');
      await setDoc(docRef, kop, { merge: true });
    } catch (err) {
      console.warn('Gagal menyimpan kop surat ke Firestore:', err);
    }
  },

  subscribeToKopSurat(onUpdate: (kop: KopSuratConfig) => void): Unsubscribe {
    return onSnapshot(doc(db, 'settings', 'kop_surat'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as KopSuratConfig;
        if (data && data.namaSekolah) {
          onUpdate(data);
        }
      }
    }, (err) => {
      console.warn('KopSurat real-time listener error:', err);
    });
  }
};
