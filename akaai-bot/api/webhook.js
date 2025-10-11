const fetch = require('node-fetch');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '8363449094:AAHpdTNzz4mdtG49_2ldhx_uT3WTzeoz7xA';
const OWNER_CHAT_ID = process.env.OWNER_CHAT_ID || '996317285';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Отправка сообщения через Telegram Bot API
async function sendTelegramMessage(chatId, text, options = {}) {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      ...options
    })
  });

  return response.json();
}

// Сохранение сообщения в Supabase
async function saveMessage(fromUserId, fromUsername, toUserId, message) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/telegram_messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      from_user_id: fromUserId,
      from_username: fromUsername,
      to_user_id: toUserId,
      message: message,
      read: false
    })
  });

  return response.ok;
}

// Получение username продавца по chat_id
async function getSellerUsername(chatId) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/login?telegram_chat_id=eq.${chatId}&select=username,fullname`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });

  const data = await response.json();
  return data && data.length > 0 ? data[0] : null;
}

// Главный обработчик webhook
module.exports = async (req, res) => {
  // Только POST запросы
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true });
  }

  try {
    const update = req.body;
    
    // Проверка наличия сообщения
    if (!update.message || !update.message.text) {
      return res.status(200).json({ ok: true });
    }

    const message = update.message;
    const chatId = message.chat.id.toString();
    const text = message.text;
    const username = message.from.username || 'unknown';

    console.log(`Получено сообщение от ${username} (${chatId}): ${text}`);

    // Команда /start
    if (text === '/start') {
      const seller = await getSellerUsername(chatId);
      
      if (seller) {
        await sendTelegramMessage(chatId, 
          `👋 Привет, ${seller.fullname}!\n\n` +
          `Теперь ты можешь отправлять сообщения владельцу через этого бота.\n\n` +
          `Просто напиши сообщение, и оно будет доставлено!`
        );
      } else {
        await sendTelegramMessage(chatId,
          `👋 Привет!\n\n` +
          `Твой chat_id: <code>${chatId}</code>\n\n` +
          `Передай этот ID владельцу, чтобы он добавил его в систему.`
        );
      }
      
      return res.status(200).json({ ok: true });
    }

    // Если это ответ владельца (reply на сообщение)
    if (chatId === OWNER_CHAT_ID && message.reply_to_message) {
      const replyToText = message.reply_to_message.text;
      
      // Извлекаем chat_id продавца из текста уведомления
      const match = replyToText.match(/chat_id: (\d+)/);
      if (match) {
        const sellerChatId = match[1];
        
        // Отправляем сообщение продавцу
        await sendTelegramMessage(sellerChatId, 
          `💬 <b>Ответ от владельца:</b>\n\n${text}`
        );
        
        // Сохраняем в базу
        await saveMessage(OWNER_CHAT_ID, 'owner', sellerChatId, text);
        
        // Подтверждение владельцу
        await sendTelegramMessage(OWNER_CHAT_ID, 
          `✅ Ответ отправлен продавцу!`
        );
        
        return res.status(200).json({ ok: true });
      }
    }

    // Если сообщение от продавца
    if (chatId !== OWNER_CHAT_ID) {
      const seller = await getSellerUsername(chatId);
      
      if (!seller) {
        await sendTelegramMessage(chatId,
          `❌ Твой chat_id не найден в системе.\n\n` +
          `Твой chat_id: <code>${chatId}</code>\n\n` +
          `Передай его владельцу для добавления в систему.`
        );
        return res.status(200).json({ ok: true });
      }

      // Сохраняем сообщение в базу
      await saveMessage(chatId, seller.username, OWNER_CHAT_ID, text);

      // Отправляем уведомление владельцу
      await sendTelegramMessage(OWNER_CHAT_ID,
        `📨 <b>Новое сообщение от продавца!</b>\n\n` +
        `👤 <b>${seller.fullname}</b> (@${seller.username})\n` +
        `💬 ${text}\n\n` +
        `<i>chat_id: ${chatId}</i>\n\n` +
        `<i>Нажми "Ответить" чтобы ответить продавцу</i>`
      );

      // Подтверждение продавцу
      await sendTelegramMessage(chatId,
        `✅ Сообщение отправлено владельцу!`
      );

      return res.status(200).json({ ok: true });
    }

    // Если сообщение от владельца без reply (обычное сообщение)
    if (chatId === OWNER_CHAT_ID) {
      await sendTelegramMessage(OWNER_CHAT_ID,
        `💡 Чтобы ответить продавцу, нажми "Ответить" на его сообщении.`
      );
      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error('Ошибка обработки webhook:', error);
    return res.status(200).json({ ok: true, error: error.message });
  }
};

