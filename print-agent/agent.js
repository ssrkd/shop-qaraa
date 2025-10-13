#!/usr/bin/env node

// 🖨️ Print Agent - проверяет очередь Supabase и печатает

const { createClient } = require('@supabase/supabase-js');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Supabase credentials (прямо в коде)
const supabaseUrl = 'https://jkzaykobcywanvfgbvci.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpremF5a29iY3l3YW52ZmdidmNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5ODQ5ODQsImV4cCI6MjA3NDU2MDk4NH0.YhrscD_zAgVQCysWcr_P94mZbabJkxasxIITlnatwIs';

const supabase = createClient(supabaseUrl, supabaseKey);

// Настройки принтера
const PRINTER_NAME = 'Xprinter_XP_365B';
const CHECK_INTERVAL = 5000; // 5 секунд
const MAX_JOBS_PER_BATCH = 10; // Максимум заданий за раз

console.log('🖨️  Print Agent запущен');
console.log(`📡 Подключение к Supabase: ${supabaseUrl}`);
console.log(`🖨️  Принтер: ${PRINTER_NAME}`);
console.log(`⏱️  Интервал проверки: ${CHECK_INTERVAL/1000} сек`);
console.log('');

// 🖨️ Функция печати через CUPS
const printTextToCUPS = async (text) => {
  return new Promise((resolve, reject) => {
    const tempFile = path.join('/tmp', `print-${Date.now()}.txt`);
    fs.writeFileSync(tempFile, text, 'utf8');

    exec(`lp -d ${PRINTER_NAME} -o PageSize=w2h4 -o cpi=17 ${tempFile}`, (error, stdout, stderr) => {
      fs.unlinkSync(tempFile);
      
      if (error) {
        console.error(`❌ Ошибка CUPS:`, error.message);
        reject(error);
        return;
      }
      console.log(`✅ CUPS: ${stdout.trim()}`);
      resolve();
    });
  });
};

// 📐 Вспомогательные функции форматирования
const center = (text, width = 32) => {
  if (text.length >= width) return text.substring(0, width);
  const space = Math.floor((width - text.length) / 2);
  return ' '.repeat(space) + text;
};

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

const line = (char = '-', width = 32) => char.repeat(width);

// 🖨️ Функция печати чека
const printReceipt = async (data) => {
  let text = '\n\n\n';
  
  text += center('qaraa') + '\n';
  text += center('Чек продажи') + '\n';
  text += line('-') + '\n';
  text += justify('Продавец:', data.seller) + '\n';
  
  for (const item of data.items) {
    const name = item.productName.substring(0, 20);
    const itemTotal = (item.price * item.quantity).toFixed(0);
    text += justify('Товар:', name) + '\n';
    text += justify('Размер:', item.size) + '\n';
    text += justify('Количество:', item.quantity.toString()) + '\n';
    text += justify('Цена:', `${itemTotal}₸`) + '\n';
  }
  
  text += justify('Оплата:', data.method) + '\n';
  text += line('-') + '\n';
  text += justify('ИТОГО:', `${data.total.toFixed(0)}₸`) + '\n';
  
  if (data.given && data.given > 0) {
    text += justify('Получено:', `${data.given.toFixed(0)}₸`) + '\n';
  }
  if (data.change > 0) {
    text += justify('Сдача:', `${data.change.toFixed(0)}₸`) + '\n';
  }
  
  text += line('-') + '\n';
  
  const now = new Date();
  const dateStr = now.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  text += center(`${dateStr}, ${timeStr}`) + '\n\n';
  
  const BOLD_ON = '\x1B\x45\x01';
  const BOLD_OFF = '\x1B\x45\x00';
  text += center('      ' + BOLD_ON + 'qaraa.kz' + BOLD_OFF) + '\n';
  text += center('Спасибо за покупку!') + '\n\n';

  await printTextToCUPS(text);
};

// 🖨️ Функция печати отчета
const printReport = async (data) => {
  let text = '\n\n\n';
  
  text += center('qaraa') + '\n';
  text += center('Отчет за день') + '\n';
  text += line('-') + '\n';
  
  if (data.seller) {
    text += justify('Продавец:', data.seller) + '\n';
  }
  
  const now = new Date();
  const dateStr = now.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  text += justify('Дата:', dateStr) + '\n';
  text += justify('Время:', timeStr) + '\n';
  text += line('-') + '\n';
  
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
  text += justify('ИТОГО:', `${data.grandTotal.toFixed(0)}₸`) + '\n';
  text += line('-') + '\n';
  text += center(`${dateStr}, ${timeStr}`) + '\n\n';
  
  const BOLD_ON = '\x1B\x45\x01';
  const BOLD_OFF = '\x1B\x45\x00';
  text += center('      ' + BOLD_ON + 'qaraa.kz' + BOLD_OFF) + '\n';
  text += center('Спасибо за работу!') + '\n\n';

  await printTextToCUPS(text);
};

// 🖨️ Функция печати этикетки
const printLabel = async (data) => {
  let text = '\n';
  text += center('QARAA') + '\n';
  text += center(data.productName.substring(0, 32)) + '\n';
  text += line('-') + '\n';
  text += center(data.barcode) + '\n';
  text += line('-') + '\n';
  text += justify(`${data.size}`, `${data.price}₸`) + '\n\n';

  await printTextToCUPS(text);
};

// 🔄 Обработка одного задания
const processJob = async (job) => {
  console.log(`📄 Обрабатываю задание ${job.id} (${job.type})...`);

  try {
    // Обновляем статус на "printing"
    await supabase
      .from('print_queue')
      .update({ status: 'printing' })
      .eq('id', job.id);

    // Печатаем в зависимости от типа
    switch (job.type) {
      case 'receipt':
        await printReceipt(job.data);
        break;
      case 'report':
        await printReport(job.data);
        break;
      case 'label':
        await printLabel(job.data);
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }

    // Обновляем статус на "completed"
    await supabase
      .from('print_queue')
      .update({ 
        status: 'completed',
        printed_at: new Date().toISOString()
      })
      .eq('id', job.id);

    console.log(`✅ Задание ${job.id} выполнено!`);

  } catch (error) {
    console.error(`❌ Ошибка при печати задания ${job.id}:`, error.message);

    // Обновляем статус на "failed"
    await supabase
      .from('print_queue')
      .update({ 
        status: 'failed',
        error: error.message
      })
      .eq('id', job.id);
  }
};

// 🔍 Проверка очереди
const checkQueue = async () => {
  try {
    // Получаем задания со статусом "pending"
    const { data: jobs, error } = await supabase
      .from('print_queue')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(MAX_JOBS_PER_BATCH);

    if (error) {
      console.error('❌ Ошибка получения очереди:', error.message);
      return;
    }

    if (jobs.length === 0) {
      // Нет заданий - ничего не делаем
      return;
    }

    console.log(`\n📋 Найдено заданий: ${jobs.length}`);

    // Обрабатываем каждое задание
    for (const job of jobs) {
      await processJob(job);
    }

  } catch (error) {
    console.error('❌ Ошибка проверки очереди:', error.message);
  }
};

// 🚀 Запуск агента
console.log('🚀 Агент готов к работе!\n');

// Первая проверка сразу
checkQueue();

// Проверяем очередь каждые N секунд
setInterval(checkQueue, CHECK_INTERVAL);

// Обработка завершения
process.on('SIGINT', () => {
  console.log('\n\n👋 Агент остановлен');
  process.exit(0);
});

