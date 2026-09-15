import React, { useState, useEffect, useCallback } from 'react';
import { User, ActiveTab, Agenda, Penilaian, Siswa, Jadwal } from './types';
import { StorageService } from './services/storageService';
import { FirestoreService } from './services/firestoreService';
import { LoginView } from './components/auth/LoginView';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { GuruDashboard } from './components/dashboard/GuruDashboard';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { AgendaHarianView } from './components/agenda/AgendaHarianView';
import { PenilaianView } from './components/penilaian/PenilaianView';
import { MasterGuruView } from './components/master/MasterGuruView';
import { MasterSiswaView } from './components/master/MasterSiswaView';
import { MasterJadwalView } from './components/master/MasterJadwalView';
import { PengaturanKopView } from './components/master/PengaturanKopView';
import { LaporanView } from './components/laporan/LaporanView';
import { SyncModal } from './components/sync/SyncModal';
import { ToastContainer } from './components/common/ToastContainer';
import { useToast } from './hooks/useToast';

export default function App() {
  const { showSuccess, showInfo } = useToast();

  // Session & Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    return StorageService.getSession();
  });

  // Navigation State
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);

  // Prefill data for Agenda Form when clicked from Dashboard schedule
  const [prefillAgenda, setPrefillAgenda] = useState<{
    kelas?: string;
    mapel?: string;
    jam?: string;
  } | undefined>(undefined);

  // Application Datasets
  const [agendaList, setAgendaList] = useState<Agenda[]>([]);
  const [penilaianList, setPenilaianList] = useState<Penilaian[]>([]);
  const [siswaList, setSiswaList] = useState<Siswa[]>([]);
  const [jadwalList, setJadwalList] = useState<Jadwal[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);

  // Reload data from StorageService
  const refreshAllData = useCallback(() => {
    setAgendaList(StorageService.getAgenda());
    setPenilaianList(StorageService.getPenilaian());
    setSiswaList(StorageService.getSiswa());
    setJadwalList(StorageService.getJadwal());
    setUsersList(StorageService.getUsers());
  }, []);

  // Initialize data on mount and keep synced with Firestore
  useEffect(() => {
    refreshAllData();

    // Silently pull latest cloud data on mount
    FirestoreService.pullAllFromFirestore()
      .then(() => {
        refreshAllData();
      })
      .catch((err) => {
        console.warn('Silent cloud pull skipped or offline:', err);
      });

    // Real-time listener for Agenda
    const unsubAgenda = FirestoreService.subscribeToAgenda((agendas) => {
      StorageService.saveAgenda(agendas);
      setAgendaList(agendas);
    });

    // Real-time listener for Penilaian
    const unsubPenilaian = FirestoreService.subscribeToPenilaian((penilaian) => {
      StorageService.savePenilaian(penilaian);
      setPenilaianList(penilaian);
    });

    // Real-time listener for Siswa
    const unsubSiswa = FirestoreService.subscribeToSiswa((siswa) => {
      StorageService.saveSiswa(siswa);
      setSiswaList(siswa);
    });

    // Real-time listener for Jadwal
    const unsubJadwal = FirestoreService.subscribeToJadwal((jadwal) => {
      StorageService.saveJadwal(jadwal);
      setJadwalList(jadwal);
    });

    // Real-time listener for Users
    const unsubUsers = FirestoreService.subscribeToUsers((users) => {
      StorageService.saveUsers(users);
      setUsersList(users);
    });

    // Real-time listener for Kop Surat
    const unsubKop = FirestoreService.subscribeToKopSurat((kop) => {
      StorageService.saveKopSurat(kop);
    });

    return () => {
      unsubAgenda();
      unsubPenilaian();
      unsubSiswa();
      unsubJadwal();
      unsubUsers();
      unsubKop();
    };
  }, [refreshAllData]);

  // Handle Login
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
    refreshAllData();
    FirestoreService.pullAllFromFirestore().then(() => refreshAllData()).catch(() => {});
    showSuccess(
      'Autentikasi Berhasil',
      `Selamat datang kembali di Agenda 21, ${user.Nama_Lengkap} (${user.Role}).`
    );
  };

  // Handle Logout
  const handleLogout = () => {
    StorageService.clearSession();
    setCurrentUser(null);
    setActiveTab('dashboard');
    showInfo('Sesi Berakhir', 'Anda telah berhasil keluar dari sistem.');
  };

  // Navigation with optional prefill
  const handleNavigate = (
    tab: ActiveTab,
    prefill?: { kelas?: string; mapel?: string; jam?: string }
  ) => {
    if (prefill) {
      setPrefillAgenda(prefill);
    }
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  // If user is not logged in, show Login Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 antialiased font-sans text-slate-900">
        <LoginView onLoginSuccess={handleLoginSuccess} />
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col antialiased font-sans text-slate-900">
      {/* Toast Notification Container */}
      <ToastContainer />

      {/* Top Header Bar */}
      <TopBar
        user={currentUser}
        onLogout={handleLogout}
        onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
        onOpenSync={() => setIsSyncModalOpen(true)}
      />

      {/* Main Container */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Responsive Sidebar */}
        <Sidebar
          user={currentUser}
          userRole={currentUser.Role}
          activeTab={activeTab}
          setActiveTab={(tab) => {
            if (tab === 'integrasi-sheet') {
              if (currentUser?.Role === 'Admin') {
                setIsSyncModalOpen(true);
              }
            } else {
              setActiveTab(tab);
            }
            setMobileMenuOpen(false);
          }}
          onSelectTab={(tab) => {
            if (tab === 'integrasi-sheet') {
              if (currentUser?.Role === 'Admin') {
                setIsSyncModalOpen(true);
              }
            } else {
              setActiveTab(tab);
            }
            setMobileMenuOpen(false);
          }}
          mobileOpen={mobileMenuOpen}
          setMobileOpen={setMobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          onOpenSync={() => setIsSyncModalOpen(true)}
        />

        {/* Content Area */}
        <main className="flex-1 min-w-0">
          {activeTab === 'dashboard' && (
            currentUser.Role === 'Guru' ? (
              <GuruDashboard
                user={currentUser}
                agendaList={agendaList}
                penilaianList={penilaianList}
                jadwalList={jadwalList}
                siswaList={siswaList}
                onNavigate={handleNavigate}
                onOpenSync={() => setIsSyncModalOpen(true)}
              />
            ) : (
              <AdminDashboard
                users={usersList}
                siswa={siswaList}
                jadwal={jadwalList}
                agenda={agendaList}
                penilaian={penilaianList}
                onNavigate={handleNavigate}
                onOpenSync={() => setIsSyncModalOpen(true)}
              />
            )
          )}

          {activeTab === 'agenda' && (
            <AgendaHarianView
              user={currentUser}
              agendaList={agendaList}
              siswaList={siswaList}
              jadwalList={jadwalList}
              onRefresh={refreshAllData}
              prefillData={prefillAgenda}
              onOpenSync={() => setIsSyncModalOpen(true)}
            />
          )}

          {activeTab === 'penilaian' && (
            <PenilaianView
              user={currentUser}
              penilaianList={penilaianList}
              siswaList={siswaList}
              onRefresh={refreshAllData}
              onOpenSync={() => setIsSyncModalOpen(true)}
            />
          )}

          {activeTab === 'laporan' && (
            <LaporanView
              currentUser={currentUser}
              agendaList={agendaList}
              penilaianList={penilaianList}
              siswaList={siswaList}
              usersList={usersList}
              onNavigate={handleNavigate}
            />
          )}

          {activeTab === 'master-guru' && (
            <MasterGuruView
              currentUser={currentUser}
              usersList={usersList}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'master-siswa' && (
            <MasterSiswaView
              siswaList={siswaList}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'master-jadwal' && (
            <MasterJadwalView
              jadwalList={jadwalList}
              usersList={usersList}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'pengaturan-kop' && (
            <PengaturanKopView
              onRefresh={refreshAllData}
            />
          )}
        </main>
      </div>

      {/* Sync & Google Apps Script Setup Modal */}
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onDataChanged={refreshAllData}
        currentUser={currentUser}
      />
    </div>
  );
}
