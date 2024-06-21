const TelegramBot = require('node-telegram-bot-api');
const mysql = require('mysql2');

const token = '6796422018:AAGoHQ8z1e6uWuOPqBsM1NTicWZrvAdwwfU';

const connection = mysql.createConnection({
    host: 'server.appsturkey.com',
    user: 'appsturkey',
    password: '7eY3?i1u1',
    database: 'appsturkey'
});

const bot = new TelegramBot(token, { polling: true });

const translations = {
  en: {
    welcome: "🌟 Welcome! 🌟\n\nHello! I am iBlock Eye, your Telegram bot providing instant domain notification services from appsturkey.com. Here are some commands to get started:\n\n🔍 /id Command: Learn your personal Telegram ID.\n🌐 /gid Command: Learn your Telegram Group ID for group notifications.\n🔄 /update 'old_domain' 'new_domain' Command: Update your blocked domains quickly! (You need to provide your Telegram ID or Group ID)\n📜 /list Command: List all projects associated with your Telegram ID or Group ID.\n\nIf you have any questions or suggestions, please write to us at @talktoGT.\n\nLet's get started! 🎉",
    id: "Your user ID is: ",
    gid: "The group ID is: ",
    dbError: "Database error: ",
    updateFail: "Project not found or you do not have permission to update it.",
    updateSuccess: "Project domain updated successfully.",
    noProjectsFound: "No projects found.",
    projectList: "Project List",
    updateUsageError: "Usage: /update 'old_domain' 'new_domain'",
    invalidDomain: "Invalid domain format. Please provide a valid domain."
  },
  tr: {
    welcome: "🌟 Hoş Geldiniz! 🌟\n\nMerhaba! Ben iBlock Eye, appsturkey.com'un sunduğu anlık domain bildirim hizmetlerini sağlayan Telegram botunuzum. İşte başlamak için bazı komutlar:\n\n🔍 /id Komutu: Kişisel Telegram ID'nizi öğrenin.\n🌐 /gid Komutu: Grup bildirimleri için Telegram Grup ID'nizi öğrenin.\n🔄 /update 'eski_domain' 'yeni_domain' Komutu: Engellenen domainlerinizi hızlıca güncelleyin! (Telegram ID veya Grup ID'nizi sağlamanız gerekmektedir)\n📜 /list Komutu: Telegram ID'niz veya Grup ID'niz ile ilişkili tüm projeleri listeleyin.\n\nSorularınız veya önerileriniz varsa, lütfen bize @talktoGT hesabımız üzerinden yazabilirsiniz.\n\nHaydi başlayalım! 🎉",
    id: "Kullanıcı ID'niz: ",
    gid: "Grup ID'si: ",
    dbError: "Veritabanı hatası: ",
    updateFail: "Proje bulunamadı veya güncelleme yetkiniz yok.",
    updateSuccess: "Proje domaini başarıyla güncellendi.",
    noProjectsFound: "Proje bulunamadı.",
    projectList: "Proje Listesi",
    updateUsageError: "Kullanım: /update 'eski_domain' 'yeni_domain'",
    invalidDomain: "Geçersiz domain formatı. Lütfen geçerli bir domain sağlayın."
  }
};

const userLanguages = {};

// checkHttp fonksiyonu
function checkHttp(url) {
    const patterns = [
        /^https:\/\/www\./i,
        /^https:\/\//i,
        /^http:\/\/www\./i,
        /^http:\/\//i,
        /^www/i
    ];

    let returnUrl = url;
    for (const pattern of patterns) {
        returnUrl = returnUrl.replace(pattern, '');
    }

    const parts = returnUrl.split('/');
    let output = parts[0].replace(/\s+/g, '');

    // Eğer yeni domain başında nokta varsa, kaldır
    if (output.startsWith('.')) {
        output = output.substring(1);
    }

    return output;
}

// Geçerli domain kontrolü
function isValidDomain(domain) {
    const domainPattern = /^(?!-)[A-Za-z0-9-]+(\.[A-Za-z]{2,})+$/;
    return domainPattern.test(domain);
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Please select your language / Lütfen dilinizi seçin:", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "English", callback_data: "lang_en" },
          { text: "Türkçe", callback_data: "lang_tr" }
        ]
      ]
    }
  });
});

bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const lang = query.data.split('_')[1];
  userLanguages[userId] = lang;

  bot.sendMessage(chatId, translations[lang].welcome);
});

bot.onText(/\/id/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const lang = userLanguages[userId] || 'tr'; // Varsayılan dil Türkçe
  bot.sendMessage(chatId, translations[lang].id + userId);
});

bot.onText(/\/gid/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const groupId = msg.chat.id;
  const positiveGroupId = Math.abs(groupId);
  const lang = userLanguages[userId] || 'tr'; // Varsayılan dil Türkçe
  bot.sendMessage(chatId, translations[lang].gid + positiveGroupId);
});

// /update komutu ile proje güncelleme
bot.onText(/\/update (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const args = match[1].split(' ');
  const lang = userLanguages[msg.from.id] || 'tr'; // Varsayılan dil Türkçe

  if (args.length !== 2) {
      bot.sendMessage(chatId, translations[lang].updateUsageError);
      return;
  }

  const oldProjectName = checkHttp(args[0]);
  const newProjectName = checkHttp(args[1]);

  // Domain geçerliliğini kontrol et
  if (!isValidDomain(newProjectName)) {
      bot.sendMessage(chatId, translations[lang].invalidDomain);
      return;
  }

  const query = msg.chat.type === 'private' 
      ? 'SELECT * FROM project WHERE p_web_address = ? AND telegramChatId = ?' 
      : 'SELECT * FROM project WHERE p_web_address = ? AND telegramGroupId = ?';

  connection.query(query, [oldProjectName, chatId], (error, results) => {
      if (error) {
          bot.sendMessage(chatId, translations[lang].dbError + error.message);
          return;
      }

      if (results.length === 0) {
          bot.sendMessage(chatId, translations[lang].updateFail);
          return;
      }

      const updateQuery = msg.chat.type === 'private' 
          ? 'UPDATE project SET p_web_address = ?, p_update_date = ?, p_check_date = ?, p_ban_status = ? WHERE p_web_address = ? AND telegramChatId = ?' 
          : 'UPDATE project SET p_web_address = ?, p_update_date = ?, p_check_date = ?, p_ban_status = ? WHERE p_web_address = ? AND telegramGroupId = ?';

      const currentTime = Math.floor(Date.now() / 1000); // Unix timestamp
      const banStatus = 2;

      connection.query(updateQuery, [newProjectName, currentTime, currentTime - 120, banStatus, oldProjectName, chatId], (error, results) => {
          if (error) {
              bot.sendMessage(chatId, translations[lang].dbError + error.message);
              return;
          }

          bot.sendMessage(chatId, translations[lang].updateSuccess);
      });
  });
});

// /list komutu ile projeleri listeleme
bot.onText(/\/list/, (msg) => {
    const chatId = msg.chat.id;
    const lang = userLanguages[msg.from.id] || 'tr'; // Varsayılan dil Türkçe

    const query = msg.chat.type === 'private' 
        ? 'SELECT * FROM project WHERE telegramChatId = ?' 
        : 'SELECT * FROM project WHERE telegramGroupId = ?';

    connection.query(query, [chatId], (error, results) => {
        if (error) {
            bot.sendMessage(chatId, translations[lang].dbError + error.message);
            return;
        }

        if (results.length === 0) {
            bot.sendMessage(chatId, translations[lang].noProjectsFound);
            return;
        }

        const projectList = results.map(project => `📋 ${project.p_web_address}`).join('\n');
        bot.sendMessage(chatId, `📜 ${translations[lang].projectList}:\n\n${projectList}`);
    });
});
