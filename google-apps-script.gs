/**
 * Freshman Birthday Party — список гостей с лимитом мест
 *
 * Лист «Guest list» — это и есть список. Одна строка = один гость.
 * Сайт выдаёт именной бейдж ТОЛЬКО после того, как этот скрипт подтвердил место.
 * Когда занято MAX_GUESTS мест, скрипт отвечает «full» и сайт закрывает регистрацию.
 *
 * Освободить место: в колонке «Статус» напишите cancelled (или «отменён»).
 * Строку можно и удалить — счётчик пересчитывается при каждой заявке.
 *
 * Установка и обновление — см. README.md, раздел «Сбор заявок».
 */
const MAX_GUESTS = 70;
const SHEET_NAME = 'Guest list';
const FOLDER_NAME = 'Freshman Birthday Party — фото гостей';
const COLS = ['№', 'Время', 'ФИО', 'Имя из ссылки (?guest=)', 'Фото', 'Статус', 'ID устройства'];
const C = { NUM: 0, TIME: 1, NAME: 2, GUEST: 3, PHOTO: 4, STATUS: 5, CLIENT: 6 };

/* GET → текущее состояние списка (сайт спрашивает при загрузке) */
function doGet() {
  return json_(status_(rows_(sheet_())));
}

/* POST → занять место (или обновить своё) */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);                       // заявки обрабатываются строго по одной
  try {
    const data = JSON.parse(e.postData.contents || '{}');
    const sh = sheet_();
    const rows = rows_(sh);
    if (data.action === 'status') return json_(status_(rows));

    const name = String(data.name || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (name.length < 2) return json_({ ok: false, error: 'name' });
    const clientId = String(data.clientId || '').slice(0, 64);
    const norm = normName_(name);

    // Тот же человек (то же устройство или то же ФИО) — не занимает второе место
    const idx = rows.findIndex(r => isActive_(r) &&
      ((clientId && r[C.CLIENT] === clientId) || normName_(r[C.NAME]) === norm));
    if (idx >= 0) {
      const rowNum = idx + 2;
      sh.getRange(rowNum, C.NAME + 1).setValue(name);
      const url = savePhoto_(data.photo, name);
      if (url) sh.getRange(rowNum, C.PHOTO + 1).setValue(url);
      if (clientId && !rows[idx][C.CLIENT]) sh.getRange(rowNum, C.CLIENT + 1).setValue(clientId);
      return json_(Object.assign(status_(rows), { ok: true, updated: true, number: rows[idx][C.NUM] }));
    }

    // Новый гость: сначала проверяем лимит
    const st = status_(rows);
    if (st.full) return json_(Object.assign(st, { ok: false, full: true }));

    const number = rows.reduce((m, r) => Math.max(m, Number(r[C.NUM]) || 0), 0) + 1;
    const url = savePhoto_(data.photo, name);
    sh.appendRow([number, new Date(), name, String(data.guest || '').slice(0, 40), url, 'confirmed', clientId]);
    const count = st.count + 1;
    return json_({ ok: true, number, count, limit: MAX_GUESTS, left: Math.max(0, MAX_GUESTS - count), full: count >= MAX_GUESTS });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- helpers ---------- */
function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME, 0);
    sh.appendRow(COLS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, COLS.length).setFontWeight('bold');
  }
  return sh;
}
function rows_(sh) {
  const n = sh.getLastRow();
  return n < 2 ? [] : sh.getRange(2, 1, n - 1, COLS.length).getValues();
}
function isActive_(r) {
  return String(r[C.NAME]).trim() !== '' && !/cancel|отмен/i.test(String(r[C.STATUS]));
}
function status_(rows) {
  const count = rows.filter(isActive_).length;
  return { ok: true, count, limit: MAX_GUESTS, left: Math.max(0, MAX_GUESTS - count), full: count >= MAX_GUESTS };
}
function normName_(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}
function savePhoto_(dataUrl, name) {
  const m = String(dataUrl || '').match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
  if (!m) return '';
  const blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], `${name} ${Date.now()}.jpg`);
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
  return folder.createFile(blob).getUrl();
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
