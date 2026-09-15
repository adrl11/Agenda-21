import { 
  collection, 
  getDocs, 
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

      const batch = writeBatch(db);
      let count = 0;

      // Users
      users.forEach(u => {
        const docRef = doc(db, 'users', u.ID_User || u.NIP_Username);
        batch.set(docRef, u, { merge: true });
        count++;
      });

      // Siswa
      siswa.forEach(s => {
        const docRef = doc(db, 'siswa', s.NISN);
        batch.set(docRef, s, { merge: true });
        count++;
      });

      // Jadwal
      jadwal.forEach(j => {
        const docRef = doc(db, 'jadwal', j.ID_Jadwal);
        batch.set(docRef, j, { merge: true });
        count++;
      });

      // Agenda
      agenda.forEach(a => {
        const docRef = doc(db, 'agenda', a.ID_Agenda);
        batch.set(docRef, a, { merge: true });
        count++;
      });

      // Penilaian
      penilaian.forEach(p => {
        const docRef = doc(db, 'penilaian', p.ID_Nilai);
        batch.set(docRef, p, { merge: true });
        count++;
      });

      // Kop Surat Settings
      if (kopSurat) {
        const kopRef = doc(db, 'settings', 'kop_surat');
        batch.set(kopRef, kopSurat, { merge: true });
        count++;
      }

      await batch.commit();

      const now = new Date().toISOString();
      StorageService.setLastSyncTimestamp(now);

      return {
        success: true,
        count,
        message: `Berhasil mengunggah ${count} data lokal ke Cloud Firestore.`
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Gagal sinkronisasi ke Firestore';
      console.error('Firestore push error:', err);
      throw new Error(errorMsg);
    }
  },

  // Pull all data from Cloud Firestore into local storage
  async pullAllFromFirestore(): Promise<{ 
    success: boolean; 
    message: string;
    counts: { users: number; siswa: number; jadwal: number; agenda: number; penilaian: number };
  }> {
    try {
      const counts = { users: 0, siswa: 0, jadwal: 0, agenda: 0, penilaian: 0 };

      // Users
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersList: User[] = [];
      usersSnap.forEach(d => usersList.push(d.data() as User));
      if (usersList.length > 0) {
        StorageService.saveUsers(usersList);
        counts.users = usersList.length;
      }

      // Siswa
      const siswaSnap = await getDocs(collection(db, 'siswa'));
      const siswaList: Siswa[] = [];
      siswaSnap.forEach(d => siswaList.push(d.data() as Siswa));
      if (siswaList.length > 0) {
        // Sort by Kelas then Nama_Siswa
        siswaList.sort((a, b) => a.Kelas.localeCompare(b.Kelas) || a.Nama_Siswa.localeCompare(b.Nama_Siswa));
        StorageService.saveSiswa(siswaList);
        counts.siswa = siswaList.length;
      }

      // Jadwal
      const jadwalSnap = await getDocs(collection(db, 'jadwal'));
      const jadwalList: Jadwal[] = [];
      jadwalSnap.forEach(d => jadwalList.push(d.data() as Jadwal));
      if (jadwalList.length > 0) {
        StorageService.saveJadwal(jadwalList);
        counts.jadwal = jadwalList.length;
      }

      // Agenda
      const agendaSnap = await getDocs(collection(db, 'agenda'));
      const agendaList: Agenda[] = [];
      agendaSnap.forEach(d => agendaList.push(d.data() as Agenda));
      if (agendaList.length > 0) {
        agendaList.sort((a, b) => (b.Tanggal || '').localeCompare(a.Tanggal || '') || (b.CreatedAt || '').localeCompare(a.CreatedAt || ''));
        StorageService.saveAgenda(agendaList);
        counts.agenda = agendaList.length;
      }

      // Penilaian
      const penilaianSnap = await getDocs(collection(db, 'penilaian'));
      const penilaianList: Penilaian[] = [];
      penilaianSnap.forEach(d => penilaianList.push(d.data() as Penilaian));
      if (penilaianList.length > 0) {
        penilaianList.sort((a, b) => (b.CreatedAt || '').localeCompare(a.CreatedAt || ''));
        StorageService.savePenilaian(penilaianList);
        counts.penilaian = penilaianList.length;
      }

      // Kop Surat Settings
      try {
        const settingsSnap = await getDocs(collection(db, 'settings'));
        settingsSnap.forEach(d => {
          if (d.id === 'kop_surat') {
            StorageService.saveKopSurat(d.data() as KopSuratConfig);
          }
        });
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

  // Two-way synchronization with Firestore (Smart Safe Merge)
  async syncBothWithFirestore(): Promise<{ success: boolean; message: string }> {
    // 1. Pull latest cloud records first into local storage
    const pullRes = await this.pullAllFromFirestore();
    // 2. Push any local additions to the cloud
    await this.pushAllToFirestore();
    return {
      success: true,
      message: `Sinkronisasi selesai! ${pullRes.message}`
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
        onUpdate(snap.data() as KopSuratConfig);
      }
    }, (err) => {
      console.warn('KopSurat real-time listener error:', err);
    });
  }
};
