/**
 * =============================================================
 *  Google Apps Script — бэкенд для сайта "Модель Мира"
 * =============================================================
 *
 *  ИНСТРУКЦИЯ ПО УСТАНОВКЕ:
 *
 *  1. Создай новую Google Таблицу: https://sheets.new
 *  2. Назови её "Модель Мира — Регистрации"
 *  3. Создай 2 листа (вкладки):
 *     - "Registrations" (для регистраций)
 *     - "Demos" (для демо-видео)
 *  4. Откройте меню: Расширения → Apps Script
 *  5. Удали всё содержимое и вставь этот код
 *  6. Нажми "Развернуть" → "Новое развёртывание"
 *  7. Тип: "Веб-приложение"
 *  8. Выполнять от: "Меня"
 *  9. Доступ: "Все" (Anyone)
 *  10. Нажми "Развернуть" и скопируй URL
 *  11. Вставь URL в index.html в переменную APPS_SCRIPT_URL
 *
 * =============================================================
 */

// Обработка POST-запросов (регистрация + загрузка демо)
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // === РЕГИСТРАЦИЯ ===
    if (data.type === 'registration') {
      var sheet = ss.getSheetByName('Registrations');
      if (!sheet) {
        sheet = ss.insertSheet('Registrations');
        sheet.appendRow([
          'Timestamp', 'Имя', 'Telegram', 'Событие',
          'Идея', '№ участника', 'Email', 'Опыт'
        ]);
        // Форматирование заголовков
        sheet.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#f0f0f0');
        sheet.setFrozenRows(1);
      }

      var num = sheet.getLastRow(); // Номер участника
      sheet.appendRow([
        new Date(),
        data.name || '',
        '@' + (data.telegram || '').replace('@', ''),
        data.event || '—',
        data.idea || '—',
        num,
        data.email || '—',
        data.experience || '—'
      ]);

      // Автоподгонка ширины столбцов
      sheet.autoResizeColumns(1, 8);

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        type: 'registration',
        number: num
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // === ЗАГРУЗКА ДЕМО ===
    if (data.type === 'demo') {
      var sheet = ss.getSheetByName('Demos');
      if (!sheet) {
        sheet = ss.insertSheet('Demos');
        sheet.appendRow([
          'Timestamp', 'Имя', 'Проект', 'Video URL',
          'Описание', 'Событие', 'Тип видео', '№ демо'
        ]);
        sheet.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#f0f0f0');
        sheet.setFrozenRows(1);
      }

      var num = sheet.getLastRow();

      // Определяем тип видео по URL
      var videoType = 'other';
      var url = data.videoUrl || '';
      if (url.includes('youtube.com') || url.includes('youtu.be')) videoType = 'youtube';
      else if (url.includes('loom.com')) videoType = 'loom';
      else if (url.includes('drive.google.com')) videoType = 'gdrive';
      else if (url.includes('vimeo.com')) videoType = 'vimeo';

      sheet.appendRow([
        new Date(),
        data.name || '',
        data.project || '',
        url,
        data.description || '—',
        data.event || '—',
        videoType,
        num
      ]);

      sheet.autoResizeColumns(1, 8);

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        type: 'demo',
        number: num,
        videoType: videoType
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Unknown type: ' + (data.type || 'undefined')
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// Обработка GET-запросов (получение демо / статистики)
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var action = e.parameter.action || '';

  try {
    // === ПОЛУЧЕНИЕ СПИСКА ДЕМО ===
    if (action === 'getDemos') {
      var sheet = ss.getSheetByName('Demos');
      if (!sheet || sheet.getLastRow() <= 1) {
        return ContentService.createTextOutput(JSON.stringify({ demos: [] }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();
      var demos = data.map(function(row) {
        return {
          timestamp: row[0],
          name: row[1],
          project: row[2],
          videoUrl: row[3],
          description: row[4],
          event: row[5],
          videoType: row[6],
          number: row[7]
        };
      }).reverse(); // Новые сначала

      return ContentService.createTextOutput(JSON.stringify({ demos: demos }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // === СТАТИСТИКА ===
    if (action === 'getStats') {
      var regSheet = ss.getSheetByName('Registrations');
      var demoSheet = ss.getSheetByName('Demos');
      return ContentService.createTextOutput(JSON.stringify({
        registrations: regSheet ? Math.max(0, regSheet.getLastRow() - 1) : 0,
        demos: demoSheet ? Math.max(0, demoSheet.getLastRow() - 1) : 0
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // По умолчанию — info
    return ContentService.createTextOutput(JSON.stringify({
      status: 'ok',
      message: 'Модель Мира API. Actions: getDemos, getStats'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// === АВТОМАТИЧЕСКИЕ УВЕДОМЛЕНИЯ (опционально) ===
// Установите триггер на эту функцию, чтобы получать email при новой регистрации
function sendNotificationEmail() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Registrations');
  if (!sheet || sheet.getLastRow() <= 1) return;

  var lastRow = sheet.getLastRow();
  var data = sheet.getRange(lastRow, 1, 1, 8).getValues()[0];

  var subject = '🎯 Новая регистрация #' + data[5] + ' — ' + data[1];
  var body = [
    'Новая регистрация на хакатон!',
    '',
    'Имя: ' + data[1],
    'Telegram: ' + data[2],
    'Событие: ' + data[3],
    'Идея: ' + data[4],
    'Email: ' + data[6],
    'Опыт: ' + data[7],
    '',
    'Время: ' + data[0],
    '',
    'Таблица: ' + ss.getUrl()
  ].join('\n');

  // Замените на ваш email
  // MailApp.sendEmail('your-email@gmail.com', subject, body);
}
