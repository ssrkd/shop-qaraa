const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const PRINTER_NAME = 'Xprinter_XP_365B';

app.use(cors());
app.use(express.json());

// 🖨️ Функция отправки текста на CUPS
const printTextToCUPS = async (text) => {
  return new Promise((resolve, reject) => {
    const tempFile = path.join('/tmp', `print-${Date.now()}.txt`);
    fs.writeFileSync(tempFile, text, 'utf8');

    // Используем размер бумаги 2x4" + маленький шрифт для компактности
    exec(`lp -d ${PRINTER_NAME} -o PageSize=w2h4 -o cpi=17 ${tempFile}`, (error, stdout, stderr) => {
      fs.unlinkSync(tempFile);
      
      if (error) {
        console.error(`❌ Ошибка печати:`, error);
        reject(error);
        return;
      }
      console.log(`✅ Отправлено на печать:`, stdout);
      resolve();
    });
  });
};

// 📐 Функция центрирования текста
const center = (text, width = 32) => {
  if (text.length >= width) return text.substring(0, width);
  const space = Math.floor((width - text.length) / 2);
  return ' '.repeat(space) + text;
};

// 📐 Функция выравнивания по краям
const justify = (left, right, width = 32) => {
  left = String(left || '');
  right = String(right || '');
  
  if (left.length + right.length + 1 > width) {
    const maxLeft = width - right.length - 1;
    return left.substring(0, maxLeft) + ' ' + right;
  }
  const space = width - left.length - right.length;
  return left + ' '.repeat(Math.max(1, space)) + right;
};

// 📐 Линия-разделитель
const line = (char = '-', width = 32) => char.repeat(width);

// 🖨️ Функция печати чека (классический вертикальный формат)
const printReceipt = async (data) => {
  try {
    let text = '';
    
    text += '\n';
    text += '\n';
    text += '\n';
    
    // Заголовок
    text += center('qaraa') + '\n';
    text += center('Чек продажи') + '\n';
    text += line('-') + '\n';
    
    // Продавец (выровнен по краям)
    text += justify('Продавец:', data.seller) + '\n';
    
    // Товары
    for (const item of data.items) {
      const name = item.productName.substring(0, 20);
      const itemTotal = (item.price * item.quantity).toFixed(0);
      text += justify('Товар:', name) + '\n';
      text += justify('Размер:', item.size) + '\n';
      text += justify('Количество:', item.quantity.toString()) + '\n';
      text += justify('Цена:', `${itemTotal}₸`) + '\n';
    }
    
    // Оплата
    text += justify('Оплата:', data.method) + '\n';
    text += line('-') + '\n';
    
    // Итого
    text += justify('ИТОГО:', `${data.total.toFixed(0)}₸`) + '\n';
    
    // Получено и сдача (если наличные)
    if (data.given && data.given > 0) {
      text += justify('Получено:', `${data.given.toFixed(0)}₸`) + '\n';
    }
    if (data.change > 0) {
      text += justify('Сдача:', `${data.change.toFixed(0)}₸`) + '\n';
    }
    
    text += line('-') + '\n';
    
    // Дата и время
    const now = new Date();
    const dateStr = now.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    text += center(`${dateStr}, ${timeStr}`) + '\n';
    text += '\n';
    
    // Футер с жирным шрифтом (ESC/POS команда)
    const BOLD_ON = '\x1B\x45\x01';  // Включить жирный
    const BOLD_OFF = '\x1B\x45\x00'; // Выключить жирный
    text += center('      ' + BOLD_ON + 'qaraa.kz' + BOLD_OFF) + '\n';
    text += center('Спасибо за покупку!') + '\n';
    text += '\n';

    await printTextToCUPS(text);
    return { success: true };
  } catch (error) {
    console.error('Ошибка печати чека:', error);
    throw error;
  }
};

// 🖨️ Функция печати отчета (классический вертикальный формат как чек)
const printReport = async (data) => {
  try {
    let text = '';
    
    text += '\n';
    text += '\n';
    text += '\n';
    
    // Заголовок
    text += center('qaraa') + '\n';
    text += center('Отчет за день') + '\n';
    text += line('-') + '\n';
    
    // Продавец и дата
    if (data.seller) {
      text += justify('Продавец:', data.seller) + '\n';
    }
    const now = new Date();
    const dateStr = now.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    text += justify('Дата:', dateStr) + '\n';
    text += justify('Время:', timeStr) + '\n';
    text += line('-') + '\n';
    
    // Итоги по способам оплаты
    if (data.kaspiTotal > 0) {
      text += justify('Kaspi QR:', `${data.kaspiTotal.toFixed(0)}₸`) + '\n';
    }
    if (data.halykTotal > 0) {
      text += justify('Halyk QR | Карта:', `${data.halykTotal.toFixed(0)}₸`) + '\n';
    }
    if (data.cashTotal > 0) {
      text += justify('Наличные:', `${data.cashTotal.toFixed(0)}₸`) + '\n';
    }
    
    text += line('-') + '\n';
    
    // Общий итог
    text += justify('ИТОГО:', `${data.grandTotal.toFixed(0)}₸`) + '\n';
    text += line('-') + '\n';
    
    // Дата и время
    text += center(`${dateStr}, ${timeStr}`) + '\n';
    text += '\n';
    
    // Футер с жирным шрифтом (ESC/POS команда)
    const BOLD_ON = '\x1B\x45\x01';  // Включить жирный
    const BOLD_OFF = '\x1B\x45\x00'; // Выключить жирный
    text += center('      ' + BOLD_ON + 'qaraa.kz' + BOLD_OFF) + '\n';
    text += center('Спасибо за работу!') + '\n';
    text += '\n';

    await printTextToCUPS(text);
    return { success: true };
  } catch (error) {
    console.error('Ошибка печати отчета:', error);
    throw error;
  }
};

// 🖨️ Функция печати этикетки (минималистичная версия)
const printLabel = async (data) => {
  try {
    let text = '';
    
    text += '\n';
    text += center('QARAA') + '\n';
    text += center(data.productName.substring(0, 32)) + '\n';
    text += line('-') + '\n';
    text += center(data.barcode) + '\n';
    text += line('-') + '\n';
    text += justify(`${data.size}`, `${data.price}₸`) + '\n';
    text += '\n';

    await printTextToCUPS(text);
    return { success: true };
  } catch (error) {
    console.error('Ошибка печати этикетки:', error);
    throw error;
  }
};

// 📡 API Endpoints
app.post('/api/print', async (req, res) => {
  try {
    const { type, ...data } = req.body;

    console.log('📥 Запрос на печать:', type);

    let result;
    
    switch (type) {
      case 'receipt':
        result = await printReceipt(data);
        break;
      case 'report':
        result = await printReport(data);
        break;
      case 'label':
        result = await printLabel(data);
        break;
      default:
        return res.status(400).json({ error: 'Неизвестный тип печати' });
    }

    res.json({ success: true, message: 'Печать успешна!' });
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ 
      error: 'Ошибка печати', 
      message: error.message 
    });
  }
});

// 🏥 Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    printer: PRINTER_NAME,
    timestamp: new Date().toISOString()
  });
});

// 🚀 Запуск сервера
app.listen(PORT, () => {
  console.log(`🖨️  Print Server запущен на http://localhost:${PORT}`);
  console.log(`📡 API доступен на http://localhost:${PORT}/api/print`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🖨️  Принтер: ${PRINTER_NAME}`);
});
