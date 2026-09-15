export const APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * AGENDA 21 - BACKEND GOOGLE APPS SCRIPT
 * Versi: 1.0 (Relational-like Google Sheet Sync)
 * =========================================================================
 * Petunjuk Instalasi:
 * 1. Buat Google Spreadsheet baru, beri nama: "Database Agenda 21"
 * 2. Buat 5 Sheet dengan nama persis berikut:
 *    - Users      (Header: ID_User, NIP_Username, Nama_Lengkap, Password, Role)
 *    - Siswa      (Header: NISN, Nama_Siswa, Kelas)
 *    - Jadwal     (Header: ID_Jadwal, NIP_Guru, Kelas, Mata_Pelajaran, Hari, Jam_Mulai, Jam_Selesai)
 *    - Agenda     (Header: ID_Agenda, NIP_Guru, Tanggal, Jam_Ke, Kelas, Mata_Pelajaran, Materi_Pokok, Total_Hadir, Total_Siswa, Status, Catatan_Refleksi)
 *    - Penilaian  (Header: ID_Nilai, NIP_Guru, NISN, Tanggal, Mata_Pelajaran, Kategori_Asesmen, Nilai_Skor, Catatan_Evaluasi)
 * 3. Buka menu: Ekstensi > Apps Script
 * 4. Ganti seluruh isi Code.gs dengan skrip ini.
 * 5. Klik Simpan, lalu klik tombol "Terapkan" (Deploy) > "Penerapan Baru" (New Deployment).
 * 6. Pilih Jenis: "Aplikasi Web" (Web App).
 *    - Jalankan sebagai: "Saya" (Me)
 *    - Siapa yang memiliki akses: "Siapa saja" (Anyone)
 * 7. Salin URL Web App yang dihasilkan dan tempelkan ke menu "Integrasi Sheet" di aplikasi Agenda 21.
 */

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    data: readAllSheets(ss)
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  // LockService untuk mencegah tabrakan data (data overwrite / race condition)
  const lock = LockService.getScriptLock();
  const success = lock.tryLock(15000); // Tunggu lock maksimal 15 detik

  if (!success) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Server sedang sibuk memproses transaksi guru lain. Silakan coba sesaat lagi (Lock Timeout).'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action; // 'syncAll' | 'saveAgenda'
    const direction = payload.direction || 'both'; // 'both' | 'pull' | 'push'
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'syncAll') {
      const data = payload.data || {};
      const { users, siswa, jadwal, agenda, penilaian } = data;

      // Jika arah push atau both: lakukan smart upsert (gabungkan berdasarkan ID unik)
      if (direction === 'push' || direction === 'both') {
        if (users && users.length > 0) {
          upsertSheetData(ss, 'Users', users, ['ID_User', 'NIP_Username', 'Nama_Lengkap', 'Password', 'Role'], 'NIP_Username');
        }
        if (siswa && siswa.length > 0) {
          upsertSheetData(ss, 'Siswa', siswa, ['NISN', 'Nama_Siswa', 'Kelas'], 'NISN');
        }
        if (jadwal && jadwal.length > 0) {
          upsertSheetData(ss, 'Jadwal', jadwal, ['ID_Jadwal', 'NIP_Guru', 'Kelas', 'Mata_Pelajaran', 'Hari', 'Jam_Mulai', 'Jam_Selesai'], 'ID_Jadwal');
        }
        if (agenda && agenda.length > 0) {
          upsertSheetData(ss, 'Agenda', agenda, ['ID_Agenda', 'NIP_Guru', 'Tanggal', 'Jam_Ke', 'Kelas', 'Mata_Pelajaran', 'Materi_Pokok', 'Total_Hadir', 'Total_Siswa', 'Status', 'Catatan_Refleksi'], 'ID_Agenda');
        }
        if (penilaian && penilaian.length > 0) {
          upsertSheetData(ss, 'Penilaian', penilaian, ['ID_Nilai', 'NIP_Guru', 'NISN', 'Tanggal', 'Mata_Pelajaran', 'Kategori_Asesmen', 'Nilai_Skor', 'Catatan_Evaluasi'], 'ID_Nilai');
        }
      }

      // Ambil data terbaru dari Spreadsheet jika arah pull atau both
      let latestData = null;
      if (direction === 'pull' || direction === 'both') {
        latestData = readAllSheets(ss);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Sinkronisasi berhasil! Data tersimpan di Google Sheet & data perangkat diperbarui.',
        data: latestData
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'saveAgenda') {
      const item = payload.item;
      const sheet = getOrInitSheet(ss, 'Agenda', ['ID_Agenda', 'NIP_Guru', 'Tanggal', 'Jam_Ke', 'Kelas', 'Mata_Pelajaran', 'Materi_Pokok', 'Total_Hadir', 'Total_Siswa', 'Status', 'Catatan_Refleksi']);
      sheet.appendRow([
        item.ID_Agenda, item.NIP_Guru, item.Tanggal, item.Jam_Ke, item.Kelas,
        item.Mata_Pelajaran, item.Materi_Pokok, item.Total_Hadir, item.Total_Siswa, item.Status, item.Catatan_Refleksi
      ]);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Jurnal Agenda berhasil ditambahkan ke Google Sheet.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Aksi tidak dikenali.'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    // Selalu lepaskan lock eksekusi
    lock.releaseLock();
  }
}

function readAllSheets(ss) {
  const sheets = ['Users', 'Siswa', 'Jadwal', 'Agenda', 'Penilaian'];
  const result = {};
  sheets.forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      initializeHeaders(name, sheet);
    }
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      result[name.toLowerCase()] = [];
    } else {
      const headers = data[0];
      result[name.toLowerCase()] = data.slice(1).map(row => {
        const obj = {};
        headers.forEach((h, i) => {
          obj[h] = row[i];
        });
        return obj;
      });
    }
  });
  return result;
}

function upsertSheetData(ss, sheetName, rows, headers, primaryKey) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
  }
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    sheet.clear();
    sheet.appendRow(headers);
    if (rows && rows.length > 0) {
      const dataMatrix = rows.map(r => headers.map(h => r[h] !== undefined ? r[h] : ''));
      sheet.getRange(2, 1, dataMatrix.length, headers.length).setValues(dataMatrix);
    }
    return;
  }

  const existingHeaders = data[0];
  const pkIndex = existingHeaders.indexOf(primaryKey);
  const existingMap = {};

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const key = pkIndex !== -1 ? String(row[pkIndex]) : i;
    const obj = {};
    existingHeaders.forEach((h, idx) => {
      obj[h] = row[idx];
    });
    existingMap[key] = obj;
  }

  if (rows && rows.length > 0) {
    rows.forEach(incoming => {
      const key = String(incoming[primaryKey]);
      if (existingMap[key]) {
        existingMap[key] = Object.assign({}, existingMap[key], incoming);
      } else {
        existingMap[key] = incoming;
      }
    });
  }

  const mergedList = Object.values(existingMap);
  sheet.clear();
  sheet.appendRow(headers);
  if (mergedList.length > 0) {
    const dataMatrix = mergedList.map(r => headers.map(h => r[h] !== undefined ? r[h] : ''));
    sheet.getRange(2, 1, dataMatrix.length, headers.length).setValues(dataMatrix);
  }
}

function writeSheetData(ss, sheetName, rows, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clear();
  }
  sheet.appendRow(headers);
  if (rows && rows.length > 0) {
    const dataMatrix = rows.map(r => headers.map(h => r[h] !== undefined ? r[h] : ''));
    sheet.getRange(2, 1, dataMatrix.length, headers.length).setValues(dataMatrix);
  }
}

function getOrInitSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
  }
  return sheet;
}

function initializeHeaders(sheetName, sheet) {
  const map = {
    Users: ['ID_User', 'NIP_Username', 'Nama_Lengkap', 'Password', 'Role'],
    Siswa: ['NISN', 'Nama_Siswa', 'Kelas'],
    Jadwal: ['ID_Jadwal', 'NIP_Guru', 'Kelas', 'Mata_Pelajaran', 'Hari', 'Jam_Mulai', 'Jam_Selesai'],
    Agenda: ['ID_Agenda', 'NIP_Guru', 'Tanggal', 'Jam_Ke', 'Kelas', 'Mata_Pelajaran', 'Materi_Pokok', 'Total_Hadir', 'Total_Siswa', 'Status', 'Catatan_Refleksi'],
    Penilaian: ['ID_Nilai', 'NIP_Guru', 'NISN', 'Tanggal', 'Mata_Pelajaran', 'Kategori_Asesmen', 'Nilai_Skor', 'Catatan_Evaluasi'],
  };
  if (map[sheetName]) {
    sheet.appendRow(map[sheetName]);
  }
}
`;
