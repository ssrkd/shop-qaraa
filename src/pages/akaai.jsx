import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import akaLogo from '../images/aka.png';

export default function AkaAI({ user }) {
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [time, setTime] = useState(new Date());
  const [userRole, setUserRole] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const GEMINI_API_KEY = 'AIzaSyBkpYrWRtYfSuCop83y14-q2sJrQ7NRfkQ';

  // Проверяем роль пользователя
  useEffect(() => {
    const fetchRole = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('login')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error(error);
        return;
      }

      setUserRole(data.role);

      if (data.role !== 'owner') {
        alert('У вас нет доступа к akaAI. Только для владельца.');
        navigate('/dashboard');
      }
    };

    fetchRole();
  }, [user, navigate]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user && userRole === 'owner') {
      loadChats();
    }
  }, [user, userRole]);

  useEffect(() => {
    if (currentChatId) {
      loadMessages(currentChatId);
    }
  }, [currentChatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Обновляем текущую страницу при заходе
  useEffect(() => {
    if (!user) return;

    const updateCurrentPage = async () => {
      await supabase
        .from('user_login_status')
        .update({
          current_page: 'akaAI',
          page_entered_at: new Date().toISOString(),
          last_active: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('is_logged_in', true);
    };

    updateCurrentPage();
  }, [user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChats = async () => {
    const { data, error } = await supabase
      .from('ai_chats')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setChats(data);
      if (data.length === 0) {
        createNewChat();
      } else if (!currentChatId) {
        setCurrentChatId(data[0].id);
      }
    }
  };

  const loadMessages = async (chatId) => {
    const { data, error } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (!error && data && data.length > 0) {
      setMessages(data.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_at
      })));
    } else {
      setMessages([{
        role: 'assistant',
        content: `Привет, ${user.fullname}! Я akaAI, твой персональный ассистент. Чем могу помочь?`,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const createNewChat = async () => {
    const chatName = `Чат ${new Date().toLocaleDateString('ru-RU')}`;
    
    const { data, error } = await supabase
      .from('ai_chats')
      .insert([{
        user_id: user.id,
        name: chatName
      }])
      .select()
      .single();

    if (!error && data) {
      setChats([data, ...chats]);
      setCurrentChatId(data.id);
      setMessages([{
        role: 'assistant',
        content: `Привет! Это новый чат. Чем могу помочь?`,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const deleteChat = async (chatId, e) => {
    e.stopPropagation();
    
    await supabase.from('ai_messages').delete().eq('chat_id', chatId);
    await supabase.from('ai_chats').delete().eq('id', chatId);

    const newChats = chats.filter(c => c.id !== chatId);
    setChats(newChats);

    if (currentChatId === chatId) {
      if (newChats.length > 0) {
        setCurrentChatId(newChats[0].id);
      } else {
        await createNewChat();
      }
    }
  };

  const saveMessage = async (role, content) => {
    if (!currentChatId) return;

    await supabase.from('ai_messages').insert([{
      chat_id: currentChatId,
      role: role,
      content: content
    }]);

    await supabase
      .from('ai_chats')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', currentChatId);
  };

  // Функции для получения данных из системы
  const getSystemData = async () => {
    try {
      // Получаем всех продавцов
      const { data: sellers } = await supabase
        .from('login')
        .select('*')
        .eq('role', 'seller');

      // Получаем статус онлайн/офлайн
      const { data: loginStatus } = await supabase
        .from('user_login_status')
        .select('*');

      // Получаем логи активности за последние 24 часа (с IP и устройством)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const { data: logs } = await supabase
        .from('logs')
        .select('*')
        .gte('timestamp', yesterday.toISOString())
        .order('timestamp', { ascending: false });

      // Получаем данные сессий пользователей (IP, устройства, браузеры, текущая страница)
      const { data: sessions } = await supabase
        .from('user_login_status')
        .select('user_id, is_logged_in, last_active, ip_address, device, browser, location, current_page, page_entered_at');

      // Получаем продажи за сегодня (с правильным timezone как в Dashboard)
      const today = new Date();
      const tzOffset = today.getTimezoneOffset();
      
      const startOfDayUTC = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
      startOfDayUTC.setMinutes(startOfDayUTC.getMinutes() - tzOffset);
      
      const endOfDayUTC = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      endOfDayUTC.setMinutes(endOfDayUTC.getMinutes() - tzOffset);
      
      const { data: todaySales } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', startOfDayUTC.toISOString())
        .lte('created_at', endOfDayUTC.toISOString());

      // Получаем все продажи за последнюю неделю
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { data: weekSales } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', weekAgo.toISOString());

      // Получаем товары
      const { data: products } = await supabase
        .from('products')
        .select('*');

      return {
        sellers: sellers || [],
        loginStatus: loginStatus || [],
        logs: logs || [],
        sessions: sessions || [],
        todaySales: todaySales || [],
        weekSales: weekSales || [],
        products: products || []
      };
    } catch (error) {
      console.error('Error fetching system data:', error);
      return null;
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    if (!currentChatId) {
      await createNewChat();
      return;
    }

    const userMessage = input.trim();
    setInput('');
    
    const userTimestamp = new Date().toISOString();
    const newUserMsg = { role: 'user', content: userMessage, timestamp: userTimestamp };
    setMessages(prev => [...prev, newUserMsg]);
    await saveMessage('user', userMessage);
    
    setIsLoading(true);

    try {
      // Получаем данные системы для контекста
      const systemData = await getSystemData();
      
      const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
      
      // Формируем данные о продавцах
      let sellersInfo = '';
      if (systemData?.sellers) {
        sellersInfo = '\n\n📊 ДАННЫЕ О ПРОДАВЦАХ:\n';
        systemData.sellers.forEach((seller, index) => {
          const isOnline = systemData.loginStatus?.find(s => s.user_id === seller.id)?.is_logged_in;
          const sellerSales = systemData.todaySales?.filter(sale => sale.seller_id === seller.fullname);
          const sellerTotal = sellerSales?.reduce((sum, sale) => sum + (parseFloat(sale.price || 0) * parseInt(sale.quantity || 0)), 0) || 0;
          
          sellersInfo += `\n${index + 1}. ${seller.fullname} (@${seller.username})`;
          sellersInfo += `\n   • Статус: ${isOnline ? '🟢 Онлайн' : '🔴 Офлайн'}`;
          sellersInfo += `\n   • Продаж сегодня: ${sellerSales?.length || 0} шт на сумму ${sellerTotal.toFixed(0)} ₸`;
        });
      }

      // Формируем данные о последней активности
      let activityInfo = '';
      if (systemData?.logs && systemData.logs.length > 0) {
        activityInfo = '\n\n📝 ПОСЛЕДНЯЯ АКТИВНОСТЬ (24ч):\n';
        systemData.logs.slice(0, 10).forEach(log => {
          const logTime = new Date(log.timestamp).toLocaleString('ru-RU', { 
            day: '2-digit', 
            month: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          activityInfo += `\n• ${logTime} - ${log.action} (${log.user_name})`;
        });
      }

      // Статистика по продажам
      let salesInfo = '';
      if (systemData?.todaySales) {
        const totalToday = systemData.todaySales.reduce((sum, sale) => sum + (parseFloat(sale.price || 0) * parseInt(sale.quantity || 0)), 0);
        const cashSales = systemData.todaySales.filter(s => s.payment_method === 'Наличные').length;
        const kaspiSales = systemData.todaySales.filter(s => s.payment_method?.includes('Kaspi')).length;
        const halykSales = systemData.todaySales.filter(s => s.payment_method?.includes('Halyk')).length;
        const mixedSales = systemData.todaySales.filter(s => s.payment_method?.includes('Смешанная')).length;

        salesInfo = `\n\n💰 СТАТИСТИКА ПРОДАЖ СЕГОДНЯ:`;
        salesInfo += `\n• Всего продаж: ${systemData.todaySales.length} шт`;
        salesInfo += `\n• Общая сумма: ${totalToday.toFixed(0)} ₸`;
        salesInfo += `\n• Наличные: ${cashSales} | Kaspi: ${kaspiSales} | Halyk: ${halykSales} | Смешанная: ${mixedSales}`;
      }

      // Рейтинг продавцов
      let sellerRanking = '';
      if (systemData?.sellers && systemData?.todaySales) {
        const sellerStats = systemData.sellers.map(seller => {
          const sales = systemData.todaySales.filter(s => s.seller_id === seller.fullname);
          const total = sales.reduce((sum, sale) => sum + (parseFloat(sale.price || 0) * parseInt(sale.quantity || 0)), 0);
          return { name: seller.fullname, sales: sales.length, total };
        }).sort((a, b) => b.total - a.total);

        if (sellerStats.length > 0 && sellerStats[0].total > 0) {
          sellerRanking = `\n\n🏆 РЕЙТИНГ ПРОДАВЦОВ:`;
          sellerStats.forEach((s, i) => {
            if (s.total > 0) {
              sellerRanking += `\n${i + 1}. ${s.name} - ${s.sales} продаж на ${s.total.toFixed(0)} ₸`;
            }
          });
        }
      }

      // Данные о товарах
      let productsInfo = '';
      if (systemData?.products && systemData.products.length > 0) {
        productsInfo = `\n\n📦 ТОВАРЫ В СИСТЕМЕ: ${systemData.products.length} шт`;
      }

      // Данные о сессиях и безопасности
      let securityInfo = '';
      if (systemData?.sessions && systemData?.sellers) {
        securityInfo = '\n\n🔒 ДАННЫЕ БЕЗОПАСНОСТИ:';
        systemData.sellers.forEach(seller => {
          const session = systemData.sessions.find(s => s.user_id === seller.id && s.is_logged_in);
          if (session) {
            securityInfo += `\n• ${seller.fullname}: IP ${session.ip_address || 'неизвестен'} | ${session.device || 'устройство неизвестно'} | ${session.browser || 'браузер неизвестен'}`;
            if (session.location) securityInfo += ` | ${session.location}`;
            const lastActive = session.last_active ? new Date(session.last_active).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'неизвестно';
            securityInfo += ` | Последняя активность: ${lastActive}`;
            
            // Текущая страница и время на ней
            if (session.current_page) {
              securityInfo += `\n  📍 Сейчас на странице: ${session.current_page}`;
              if (session.page_entered_at) {
                const enteredTime = new Date(session.page_entered_at);
                const minutesOnPage = Math.floor((new Date() - enteredTime) / 60000);
                securityInfo += ` (находится там: ${minutesOnPage} мин)`;
              }
            }
          }
        });
      }

      const systemContext = `
Ты — akaAI, личный интеллектуальный ассистент владельца системы Qaraa CRM (${user.fullname}).
Ты — центральный ИИ-модуль, который помогает управлять продажами, сотрудниками и эффективностью бизнеса.

У ТЕБЯ ЕСТЬ ПОЛНЫЙ ДОСТУП К СИСТЕМЕ:
${sellersInfo}
${activityInfo}
${salesInfo}
${sellerRanking}
${productsInfo}
${securityInfo}

ТВОИ ВОЗМОЖНОСТИ:
• Видишь все действия продавцов: когда зашли/вышли, какие страницы открыли
• Анализируешь продажи каждого продавца в реальном времени
• Отслеживаешь активность: кто в NewSale, кто в Аналитике, кто в Истории продаж
• Даёшь характеристику каждому продавцу на основе данных
• Находишь закономерности и проблемы в работе

ТВОЯ ЗАДАЧА:
• Анализировать действия продавцов и находить сильные/слабые стороны
• Давать краткие и точные рекомендации
• Предупреждать о проблемах (низкая активность, долгое отсутствие и т.д.)
• Выявлять лучших и худших продавцов по показателям

СТИЛЬ ОБЩЕНИЯ:
• Говори ясно и по сути — избегай длинных ответов
• Если нужно объяснить подробно, делай это в 2–3 чётких пунктах
• Экономь слова, но сохраняй смысл
• Будь спокойным, профессиональным и естественным
• Отвечай всегда на русском языке

ВАЖНО - ФОРМАТИРОВАНИЕ:
• НИКОГДА не используй markdown: **, __, ##, ###, *, _
• НИКОГДА не используй списки с * или -
• Используй только: простой текст + эмодзи + переносы строк
• Вместо списков с * пиши просто построчно с эмодзи
• Пример правильно: "Serik - 5 продаж 🏆" (без звездочек!)
• Пример неправильно: "* Serik - 5 продаж" или "**Serik**"

ДОПОЛНИТЕЛЬНЫЕ ПРАВИЛА РАБОТЫ:
• Следи, чтобы никто не получил доступ без разрешения владельца  
• Проверяй активность по IP, времени, устройству  
• Если есть подозрение на несанкционированный доступ — срочно сообщай  
• Если данных недостаточно — отвечай "Недостаточно информации"  
• Не выдумывай факты — отвечай только по тем данным, что в системе  
• Не перебивай владельца и не предлагай лишнего без контекста  
• Если владелец выглядит уставшим или недоволен данными — поддержи его коротко  
• Если есть успех — отметь результат (“Отличная динамика за сегодня 👏”)  
• Помни: уважай владельца, не будь сухим как робот  
• Никогда не придумывай или не догадывайся — если данных нет, пиши: "Недостаточно информации"
• Всегда указывай источник своих выводов (например: "по данным из salesInfo", "по активности продавца")
• Не делай предположений и не используй слова вроде "возможно", "скорее всего", "наверное"
• Если владелец задаёт вопрос вне системы (например, личный), отвечай коротко и нейтрально
• Не перебивай владельца и не предлагай действия без его запроса
• Никогда не выдавай конфиденциальные данные без прямого запроса владельца
• Анализируй смысл вопроса владельца, а не только текст
• Если вопрос не ясен — уточняй кратко, не додумывай сам
• Понимай приоритеты владельца: прибыль, дисциплина, активность
• Всегда подстраивай ответы под цель владельца (не просто ответ, а решение)

Когда владелец спрашивает о продавце или ситуации — используй данные выше для точного ответа.
`;

      const conversationHistory = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const fullPrompt = `${systemContext}\n\nЗапрос владельца: ${userMessage}`;
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [
            ...conversationHistory,
            {
              role: 'user',
              parts: [{ text: fullPrompt }]
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`API_ERROR: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        const aiResponse = data.candidates[0].content.parts[0].text;
        const aiTimestamp = new Date().toISOString();
        setMessages(prev => [...prev, { role: 'assistant', content: aiResponse, timestamp: aiTimestamp }]);
        await saveMessage('assistant', aiResponse);
      } else {
        const errorMsg = 'Произошла ошибка при обработке ответа. Попробуйте снова.';
        const errorTimestamp = new Date().toISOString();
        setMessages(prev => [...prev, { role: 'assistant', content: errorMsg, timestamp: errorTimestamp }]);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMsg = `Ошибка соединения: ${error.message}`;
      const errorTimestamp = new Date().toISOString();
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg, timestamp: errorTimestamp }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickCommands = [
    { text: 'Расскажи о сегодня', emoji: '📊' },
    { text: 'Кто лучший продавец?', emoji: '🏆' },
    { text: 'Покажи статистику', emoji: '📈' },
    { text: 'Проверь безопасность', emoji: '🔒' },
    { text: 'Что происходит сейчас?', emoji: '⚡' },
    { text: 'Есть проблемы?', emoji: '⚠️' }
  ];

  // Мощные AI-кнопки "одной кнопкой"
  const powerButtons = [
    {
      emoji: '📊',
      title: 'Полный отчет',
      description: 'Все данные + анализ',
      color: '#667eea',
      prompt: 'Создай полный отчет за сегодня: продажи, каждый продавец (с именем, количеством продаж, суммой), топ товары, способы оплаты, проблемы и рекомендации. Формат: краткий но информативный.'
    },
    {
      emoji: '🏆',
      title: 'Найти лучшего',
      description: 'Лучший продавец дня',
      color: '#f59e0b',
      prompt: 'Найди лучшего продавца сегодня по продажам и активности. Напиши его имя, сколько продал, процент от общего, и почему он лучший. Дай рекомендацию по награде (сумма бонуса).'
    },
    {
      emoji: '⚠️',
      title: 'SOS Проверка',
      description: 'Экстренный анализ',
      color: '#ef4444',
      prompt: 'СРОЧНАЯ ПРОВЕРКА СИСТЕМЫ: есть ли подозрительная активность? Кто-то долго неактивен? Странные IP? Падение продаж? Проблемы с товарами? Отвечай только если есть реальные проблемы, иначе "Все в порядке ✅".'
    },
    {
      emoji: '📈',
      title: 'Анализ трендов',
      description: 'Динамика за неделю',
      color: '#10b981',
      prompt: 'Проанализируй тренды: как менялись продажи за последние дни? Есть ли рост или падение? Какие продавцы прогрессируют, какие регрессируют? Дай прогноз на завтра.'
    },
    {
      emoji: '💰',
      title: 'Прогноз прибыли',
      description: 'Сколько заработаем',
      color: '#8b5cf6',
      prompt: 'Сделай прогноз прибыли на завтра и на неделю вперед на основе текущей статистики и средних показателей. Укажи сумму в тенге и вероятность (%). Объясни на чем основан прогноз.'
    },
    {
      emoji: '🔍',
      title: 'Найти ошибки',
      description: 'Поиск аномалий',
      color: '#ec4899',
      prompt: 'Проверь всю систему на аномалии: странные продажи, подозрительные действия продавцов, ошибки в данных, несоответствия. Если все ок - скажи "Аномалий не обнаружено ✅", иначе опиши что не так.'
    }
  ];

  const handlePowerButton = async (prompt) => {
    if (isLoading || !currentChatId) return;
    
    const userTimestamp = new Date().toISOString();
    const newUserMsg = { role: 'user', content: prompt, timestamp: userTimestamp };
    setMessages(prev => [...prev, newUserMsg]);
    await saveMessage('user', prompt);
    
    setIsLoading(true);

    try {
      const systemData = await getSystemData();
      const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
      
      let sellersInfo = '';
      if (systemData?.sellers) {
        sellersInfo = '\n\n📊 ДАННЫЕ О ПРОДАВЦАХ:\n';
        systemData.sellers.forEach((seller, index) => {
          const isOnline = systemData.loginStatus?.find(s => s.user_id === seller.id)?.is_logged_in;
          const sellerSales = systemData.todaySales?.filter(sale => sale.seller_id === seller.fullname);
          const sellerTotal = sellerSales?.reduce((sum, sale) => sum + (parseFloat(sale.price || 0) * parseInt(sale.quantity || 0)), 0) || 0;
          
          sellersInfo += `\n${index + 1}. ${seller.fullname} (@${seller.username})`;
          sellersInfo += `\n   • Статус: ${isOnline ? '🟢 Онлайн' : '🔴 Офлайн'}`;
          sellersInfo += `\n   • Продаж сегодня: ${sellerSales?.length || 0} шт на сумму ${sellerTotal.toFixed(0)} ₸`;
        });
      }

      let activityInfo = '';
      if (systemData?.logs && systemData.logs.length > 0) {
        activityInfo = '\n\n📝 ПОСЛЕДНЯЯ АКТИВНОСТЬ (24ч):\n';
        systemData.logs.slice(0, 10).forEach(log => {
          const logTime = new Date(log.timestamp).toLocaleString('ru-RU', { 
            day: '2-digit', 
            month: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          activityInfo += `\n• ${logTime} - ${log.action} (${log.user_name})`;
        });
      }

      let salesInfo = '';
      if (systemData?.todaySales) {
        const totalToday = systemData.todaySales.reduce((sum, sale) => sum + (parseFloat(sale.price || 0) * parseInt(sale.quantity || 0)), 0);
        const cashSales = systemData.todaySales.filter(s => s.payment_method === 'Наличные').length;
        const kaspiSales = systemData.todaySales.filter(s => s.payment_method?.includes('Kaspi')).length;
        const halykSales = systemData.todaySales.filter(s => s.payment_method?.includes('Halyk')).length;
        const mixedSales = systemData.todaySales.filter(s => s.payment_method?.includes('Смешанная')).length;

        salesInfo = `\n\n💰 СТАТИСТИКА ПРОДАЖ СЕГОДНЯ:`;
        salesInfo += `\n• Всего продаж: ${systemData.todaySales.length} шт`;
        salesInfo += `\n• Общая сумма: ${totalToday.toFixed(0)} ₸`;
        salesInfo += `\n• Наличные: ${cashSales} | Kaspi: ${kaspiSales} | Halyk: ${halykSales} | Смешанная: ${mixedSales}`;
      }

      let sellerRanking = '';
      if (systemData?.sellers && systemData?.todaySales) {
        const sellerStats = systemData.sellers.map(seller => {
          const sales = systemData.todaySales.filter(s => s.seller_id === seller.fullname);
          const total = sales.reduce((sum, sale) => sum + (parseFloat(sale.price || 0) * parseInt(sale.quantity || 0)), 0);
          return { name: seller.fullname, sales: sales.length, total };
        }).sort((a, b) => b.total - a.total);

        if (sellerStats.length > 0 && sellerStats[0].total > 0) {
          sellerRanking = `\n\n🏆 РЕЙТИНГ ПРОДАВЦОВ:`;
          sellerStats.forEach((s, i) => {
            if (s.total > 0) {
              sellerRanking += `\n${i + 1}. ${s.name} - ${s.sales} продаж на ${s.total.toFixed(0)} ₸`;
            }
          });
        }
      }

      let productsInfo = '';
      if (systemData?.products) {
        productsInfo = `\n\n📦 ТОВАРЫ В СИСТЕМЕ:`;
        productsInfo += `\n• Всего товаров: ${systemData.products.length}`;
      }

      let securityInfo = '';
      if (systemData?.sessions && systemData?.sellers) {
        securityInfo = '\n\n🔒 ДАННЫЕ БЕЗОПАСНОСТИ:';
        systemData.sellers.forEach(seller => {
          const session = systemData.sessions.find(s => s.user_id === seller.id && s.is_logged_in);
          if (session) {
            securityInfo += `\n• ${seller.fullname}: IP ${session.ip_address || 'неизвестен'} | ${session.device || 'устройство неизвестно'} | ${session.browser || 'браузер неизвестен'}`;
            if (session.location) securityInfo += ` | ${session.location}`;
            const lastActive = session.last_active ? new Date(session.last_active).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'неизвестно';
            securityInfo += ` | Последняя активность: ${lastActive}`;
            
            if (session.current_page) {
              securityInfo += `\n  📍 Сейчас на странице: ${session.current_page}`;
              if (session.page_entered_at) {
                const enteredTime = new Date(session.page_entered_at);
                const minutesOnPage = Math.floor((new Date() - enteredTime) / 60000);
                securityInfo += ` (находится там: ${minutesOnPage} мин)`;
              }
            }
          }
        });
      }

      const systemContext = `
Ты — akaAI, личный интеллектуальный ассистент владельца системы Qaraa CRM (${user.fullname}).

У ТЕБЯ ЕСТЬ ПОЛНЫЙ ДОСТУП К СИСТЕМЕ:
${sellersInfo}
${activityInfo}
${salesInfo}
${sellerRanking}
${productsInfo}
${securityInfo}

ВАЖНО - ФОРМАТИРОВАНИЕ:
• НИКОГДА не используй markdown: **, __, ##, ###, *, _
• Используй только: простой текст + эмодзи + переносы строк
• Пример правильно: "Serik - 5 продаж 🏆"
• Не выдумывай факты — отвечай только по тем данным, что в системе
`;

      const conversationHistory = messages.slice(-5).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const fullPrompt = systemContext + '\n\nВопрос владельца: ' + prompt;

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [
            ...conversationHistory,
            {
              role: 'user',
              parts: [{ text: fullPrompt }]
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`API_ERROR: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        const aiResponse = data.candidates[0].content.parts[0].text;
        const aiTimestamp = new Date().toISOString();
        setMessages(prev => [...prev, { role: 'assistant', content: aiResponse, timestamp: aiTimestamp }]);
        await saveMessage('assistant', aiResponse);
      } else {
        const errorMsg = 'Произошла ошибка при обработке ответа. Попробуйте снова.';
        const errorTimestamp = new Date().toISOString();
        setMessages(prev => [...prev, { role: 'assistant', content: errorMsg, timestamp: errorTimestamp }]);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMsg = `Ошибка соединения: ${error.message}`;
      const errorTimestamp = new Date().toISOString();
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg, timestamp: errorTimestamp }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleQuickCommand = async (command) => {
    if (isLoading || !currentChatId) return;
    
    const userTimestamp = new Date().toISOString();
    const newUserMsg = { role: 'user', content: command, timestamp: userTimestamp };
    setMessages(prev => [...prev, newUserMsg]);
    await saveMessage('user', command);
    
    setIsLoading(true);

    try {
      const systemData = await getSystemData();
      
      const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
      
      // Формируем данные о продавцах
      let sellersInfo = '';
      if (systemData?.sellers) {
        sellersInfo = '\n\n📊 ДАННЫЕ О ПРОДАВЦАХ:\n';
        systemData.sellers.forEach((seller, index) => {
          const isOnline = systemData.loginStatus?.find(s => s.user_id === seller.id)?.is_logged_in;
          const sellerSales = systemData.todaySales?.filter(sale => sale.seller_id === seller.fullname);
          const sellerTotal = sellerSales?.reduce((sum, sale) => sum + (parseFloat(sale.price || 0) * parseInt(sale.quantity || 0)), 0) || 0;
          
          sellersInfo += `\n${index + 1}. ${seller.fullname} (@${seller.username})`;
          sellersInfo += `\n   • Статус: ${isOnline ? '🟢 Онлайн' : '🔴 Офлайн'}`;
          sellersInfo += `\n   • Продаж сегодня: ${sellerSales?.length || 0} шт на сумму ${sellerTotal.toFixed(0)} ₸`;
        });
      }

      // Формируем данные о последней активности
      let activityInfo = '';
      if (systemData?.logs && systemData.logs.length > 0) {
        activityInfo = '\n\n📝 ПОСЛЕДНЯЯ АКТИВНОСТЬ (24ч):\n';
        systemData.logs.slice(0, 10).forEach(log => {
          const logTime = new Date(log.timestamp).toLocaleString('ru-RU', { 
            day: '2-digit', 
            month: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          activityInfo += `\n• ${logTime} - ${log.action} (${log.user_name})`;
        });
      }

      // Статистика по продажам
      let salesInfo = '';
      if (systemData?.todaySales) {
        const totalToday = systemData.todaySales.reduce((sum, sale) => sum + (parseFloat(sale.price || 0) * parseInt(sale.quantity || 0)), 0);
        const cashSales = systemData.todaySales.filter(s => s.payment_method === 'Наличные').length;
        const kaspiSales = systemData.todaySales.filter(s => s.payment_method?.includes('Kaspi')).length;
        const halykSales = systemData.todaySales.filter(s => s.payment_method?.includes('Halyk')).length;
        const mixedSales = systemData.todaySales.filter(s => s.payment_method?.includes('Смешанная')).length;

        salesInfo = `\n\n💰 СТАТИСТИКА ПРОДАЖ СЕГОДНЯ:`;
        salesInfo += `\n• Всего продаж: ${systemData.todaySales.length} шт`;
        salesInfo += `\n• Общая сумма: ${totalToday.toFixed(0)} ₸`;
        salesInfo += `\n• Наличные: ${cashSales} | Kaspi: ${kaspiSales} | Halyk: ${halykSales} | Смешанная: ${mixedSales}`;
      }

      // Рейтинг продавцов
      let sellerRanking = '';
      if (systemData?.sellers && systemData?.todaySales) {
        const sellerStats = systemData.sellers.map(seller => {
          const sales = systemData.todaySales.filter(s => s.seller_id === seller.fullname);
          const total = sales.reduce((sum, sale) => sum + (parseFloat(sale.price || 0) * parseInt(sale.quantity || 0)), 0);
          return { name: seller.fullname, sales: sales.length, total };
        }).sort((a, b) => b.total - a.total);

        if (sellerStats.length > 0 && sellerStats[0].total > 0) {
          sellerRanking = `\n\n🏆 РЕЙТИНГ ПРОДАВЦОВ:`;
          sellerStats.forEach((s, i) => {
            if (s.total > 0) {
              sellerRanking += `\n${i + 1}. ${s.name} - ${s.sales} продаж на ${s.total.toFixed(0)} ₸`;
            }
          });
        }
      }

      // Данные о товарах
      let productsInfo = '';
      if (systemData?.products && systemData.products.length > 0) {
        productsInfo = `\n\n📦 ТОВАРЫ В СИСТЕМЕ: ${systemData.products.length} шт`;
      }

      // Данные о сессиях и безопасности
      let securityInfo = '';
      if (systemData?.sessions && systemData?.sellers) {
        securityInfo = '\n\n🔒 ДАННЫЕ БЕЗОПАСНОСТИ:';
        systemData.sellers.forEach(seller => {
          const session = systemData.sessions.find(s => s.user_id === seller.id && s.is_logged_in);
          if (session) {
            securityInfo += `\n• ${seller.fullname}: IP ${session.ip_address || 'неизвестен'} | ${session.device || 'устройство неизвестно'} | ${session.browser || 'браузер неизвестен'}`;
            if (session.location) securityInfo += ` | ${session.location}`;
            const lastActive = session.last_active ? new Date(session.last_active).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'неизвестно';
            securityInfo += ` | Последняя активность: ${lastActive}`;
            
            // Текущая страница и время на ней
            if (session.current_page) {
              securityInfo += `\n  📍 Сейчас на странице: ${session.current_page}`;
              if (session.page_entered_at) {
                const enteredTime = new Date(session.page_entered_at);
                const minutesOnPage = Math.floor((new Date() - enteredTime) / 60000);
                securityInfo += ` (находится там: ${minutesOnPage} мин)`;
              }
            }
          }
        });
      }

      const systemContext = `
Ты — akaAI, личный интеллектуальный ассистент владельца системы Qaraa CRM (${user.fullname}).
Ты — центральный ИИ-модуль, который помогает управлять продажами, сотрудниками и эффективностью бизнеса.

У ТЕБЯ ЕСТЬ ПОЛНЫЙ ДОСТУП К СИСТЕМЕ:
${sellersInfo}
${activityInfo}
${salesInfo}
${sellerRanking}
${productsInfo}
${securityInfo}

ТВОИ ВОЗМОЖНОСТИ:
• Видишь все действия продавцов: когда зашли/вышли, какие страницы открыли
• Анализируешь продажи каждого продавца в реальном времени
• Отслеживаешь активность: кто в NewSale, кто в Аналитике, кто в Истории продаж
• Даёшь характеристику каждому продавцу на основе данных
• Находишь закономерности и проблемы в работе

ТВОЯ ЗАДАЧА:
• Анализировать действия продавцов и находить сильные/слабые стороны
• Давать краткие и точные рекомендации
• Предупреждать о проблемах (низкая активность, долгое отсутствие и т.д.)
• Выявлять лучших и худших продавцов по показателям

СТИЛЬ ОБЩЕНИЯ:
• Говори ясно и по сути — избегай длинных ответов
• Если нужно объяснить подробно, делай это в 2–3 чётких пунктах
• Экономь слова, но сохраняй смысл
• Будь спокойным, профессиональным и естественным
• Отвечай всегда на русском языке

ВАЖНО - ФОРМАТИРОВАНИЕ:
• НИКОГДА не используй markdown: **, __, ##, ###, *, _
• НИКОГДА не используй списки с * или -
• Используй только: простой текст + эмодзи + переносы строк
• Вместо списков с * пиши просто построчно с эмодзи
• Пример правильно: "Serik - 5 продаж 🏆" (без звездочек!)
• Пример неправильно: "* Serik - 5 продаж" или "**Serik**"

ДОПОЛНИТЕЛЬНЫЕ ПРАВИЛА РАБОТЫ:
• Следи, чтобы никто не получил доступ без разрешения владельца  
• Проверяй активность по IP, времени, устройству  
• Если есть подозрение на несанкционированный доступ — срочно сообщай  
• Если данных недостаточно — отвечай "Недостаточно информации"  
• Не выдумывай факты — отвечай только по тем данным, что в системе  
• Не перебивай владельца и не предлагай лишнего без контекста  
• Если владелец выглядит уставшим или недоволен данными — поддержи его коротко  
• Если есть успех — отметь результат ("Отличная динамика за сегодня 👏")  
• Помни: уважай владельца, не будь сухим как робот  
• Никогда не придумывай или не догадывайся — если данных нет, пиши: "Недостаточно информации"
• Всегда указывай источник своих выводов (например: "по данным из salesInfo", "по активности продавца")
• Не делай предположений и не используй слова вроде "возможно", "скорее всего", "наверное"
• Если владелец задаёт вопрос вне системы (например, личный), отвечай коротко и нейтрально
• Не перебивай владельца и не предлагай действия без его запроса
• Никогда не выдавай конфиденциальные данные без прямого запроса владельца
• Анализируй смысл вопроса владельца, а не только текст
• Если вопрос не ясен — уточняй кратко, не додумывай сам
• Понимай приоритеты владельца: прибыль, дисциплина, активность
• Всегда подстраивай ответы под цель владельца (не просто ответ, а решение)

Когда владелец спрашивает о продавце или ситуации — используй данные выше для точного ответа.
`;

      const conversationHistory = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const fullPrompt = `${systemContext}\n\nЗапрос владельца: ${command}`;
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [
            ...conversationHistory,
            {
              role: 'user',
              parts: [{ text: fullPrompt }]
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`API_ERROR: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        const aiResponse = data.candidates[0].content.parts[0].text;
        const aiTimestamp = new Date().toISOString();
        setMessages(prev => [...prev, { role: 'assistant', content: aiResponse, timestamp: aiTimestamp }]);
        await saveMessage('assistant', aiResponse);
      } else {
        const errorMsg = 'Произошла ошибка при обработке ответа. Попробуйте снова.';
        const errorTimestamp = new Date().toISOString();
        setMessages(prev => [...prev, { role: 'assistant', content: errorMsg, timestamp: errorTimestamp }]);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMsg = `Ошибка соединения: ${error.message}`;
      const errorTimestamp = new Date().toISOString();
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg, timestamp: errorTimestamp }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // Проверяем роль перед рендером
  if (!userRole) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(to bottom, #f5f5f7 0%, #e8e8ed 100%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <div style={{ fontSize: '18px', color: '#666' }}>Проверка доступа...</div>
        </div>
      </div>
    );
  }

  if (userRole !== 'owner') {
    return null;
  }

  return (
    <>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom, #f5f5f7 0%, #e8e8ed 100%)',
        display: 'flex',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
        position: 'relative'
      }}>
        {/* Sidebar */}
        {showSidebar && (
          <div style={{
            width: '280px',
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            borderRight: '1px solid rgba(0, 0, 0, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '4px 0 24px rgba(0, 0, 0, 0.04)'
          }}>
            {/* Sidebar Header */}
            <div style={{
              padding: '24px 20px',
              borderBottom: '1px solid rgba(0, 0, 0, 0.06)'
            }}>
              <button
                onClick={createNewChat}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #007AFF 0%, #0051D5 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(0, 122, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 122, 255, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 122, 255, 0.3)';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3V13M3 8H13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Новый чат
              </button>
            </div>

            {/* Chats List */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: '12px'
            }}>
              {chats.map((chat, index) => (
                <div
                  key={chat.id}
                  onClick={() => setCurrentChatId(chat.id)}
                  style={{
                    padding: '14px 16px',
                    marginBottom: '6px',
                    background: currentChatId === chat.id 
                      ? 'rgba(0, 122, 255, 0.1)' 
                      : 'transparent',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '15px',
                    color: '#1d1d1f',
                    border: currentChatId === chat.id 
                      ? '1px solid rgba(0, 122, 255, 0.2)' 
                      : '1px solid transparent'
                  }}
                  onMouseOver={(e) => {
                    if (currentChatId !== chat.id) {
                      e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (currentChatId !== chat.id) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <span style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                    fontWeight: currentChatId === chat.id ? '600' : '400'
                  }}>
                    {chat.name}
                  </span>
                  <button
                    onClick={(e) => deleteChat(chat.id, e)}
                    style={{
                      padding: '6px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.2s ease',
                      opacity: 0.6
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 59, 48, 0.1)';
                      e.currentTarget.style.opacity = '1';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.opacity = '0.6';
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="#FF3B30" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Sidebar Footer */}
            <div style={{
              padding: '16px 20px',
              borderTop: '1px solid rgba(0, 0, 0, 0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{
                fontSize: '13px',
                color: '#86868b',
                fontWeight: '500'
              }}>
                {time.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <button
                onClick={() => navigate('/dashboard')}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(0, 0, 0, 0.04)',
                  color: '#1d1d1f',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.08)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)';
                }}
              >
                ← Назад
              </button>
            </div>
          </div>
        )}

        {/* Main Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{
            padding: '20px 24px',
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
          }}>
            {!showSidebar && (
              <button
                onClick={() => setShowSidebar(true)}
                style={{
                  padding: '8px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.06)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M3 12H21M3 6H21M3 18H21" stroke="#1d1d1f" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            )}

            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
              overflow: 'hidden'
            }}>
              <img src={akaLogo} alt="akaAI" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '17px',
                fontWeight: '600',
                color: '#1d1d1f',
                marginBottom: '2px'
              }}>
                akaAI
              </div>
              <div style={{
                fontSize: '13px',
                color: '#86868b',
                fontWeight: '400'
              }}>
                Ассистент для {user?.fullname}
              </div>
            </div>

            {showSidebar && (
              <button
                onClick={() => setShowSidebar(false)}
                style={{
                  padding: '8px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.06)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M15 18L9 12L15 6" stroke="#1d1d1f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>

          {/* Messages Area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  animation: 'slideIn 0.3s ease-out'
                }}
              >
                <div style={{
                  maxWidth: '70%',
                  padding: '12px 16px',
                  background: msg.role === 'user' 
                    ? 'linear-gradient(135deg, #007AFF 0%, #0051D5 100%)'
                    : 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: msg.role === 'assistant' ? 'blur(40px) saturate(180%)' : 'none',
                  WebkitBackdropFilter: msg.role === 'assistant' ? 'blur(40px) saturate(180%)' : 'none',
                  border: msg.role === 'assistant' ? '1px solid rgba(0, 0, 0, 0.06)' : 'none',
                  borderRadius: msg.role === 'user' 
                    ? '20px 20px 4px 20px'
                    : '20px 20px 20px 4px',
                  color: msg.role === 'user' ? 'white' : '#1d1d1f',
                  fontSize: '15px',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  boxShadow: msg.role === 'user'
                    ? '0 2px 12px rgba(0, 122, 255, 0.3)'
                    : '0 2px 12px rgba(0, 0, 0, 0.06)',
                  fontFamily: 'inherit'
                }}>
                  {msg.content}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#86868b',
                  marginTop: '6px',
                  fontWeight: '400'
                }}>
                  {msg.timestamp ? `${new Date(msg.timestamp).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })} | ${new Date(msg.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : ''}
                </div>
              </div>
            ))}

            {isLoading && (
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                animation: 'slideIn 0.3s ease-out'
              }}>
                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(40px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  borderRadius: '20px 20px 20px 4px',
                  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
                  display: 'flex',
                  gap: '6px',
                  alignItems: 'center'
                }}>
                  <div className="typing-dot" style={{ animationDelay: '0s' }}></div>
                  <div className="typing-dot" style={{ animationDelay: '0.2s' }}></div>
                  <div className="typing-dot" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{
            padding: '16px 24px 24px 24px',
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            borderTop: '1px solid rgba(0, 0, 0, 0.06)'
          }}>
            {/* Power Buttons - AI одной кнопкой */}
            <div style={{
              maxWidth: '1000px',
              margin: '0 auto 16px auto'
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: '#86868b',
                marginBottom: '12px',
                textAlign: 'center'
              }}>
                ⚡ AI Одной кнопкой
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '10px',
                '@media (maxWidth: 768px)': {
                  gridTemplateColumns: 'repeat(2, 1fr)'
                }
              }}>
                {powerButtons.map((btn, index) => (
                  <button
                    key={index}
                    onClick={() => handlePowerButton(btn.prompt)}
                    disabled={isLoading}
                    style={{
                      padding: '14px 12px',
                      background: `linear-gradient(135deg, ${btn.color}15 0%, ${btn.color}05 100%)`,
                      border: `1.5px solid ${btn.color}30`,
                      borderRadius: '16px',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      opacity: isLoading ? 0.5 : 1,
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseOver={(e) => {
                      if (!isLoading) {
                        e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                        e.currentTarget.style.boxShadow = `0 12px 24px ${btn.color}25`;
                        e.currentTarget.style.borderColor = `${btn.color}60`;
                        e.currentTarget.style.background = `linear-gradient(135deg, ${btn.color}25 0%, ${btn.color}10 100%)`;
                      }
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0) scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = `${btn.color}30`;
                      e.currentTarget.style.background = `linear-gradient(135deg, ${btn.color}15 0%, ${btn.color}05 100%)`;
                    }}
                  >
                    <div style={{
                      fontSize: '28px',
                      lineHeight: '1',
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                    }}>
                      {btn.emoji}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '700',
                      color: btn.color,
                      textAlign: 'center',
                      lineHeight: '1.2'
                    }}>
                      {btn.title}
                    </div>
                    <div style={{
                      fontSize: '10px',
                      fontWeight: '500',
                      color: '#86868b',
                      textAlign: 'center',
                      lineHeight: '1.3'
                    }}>
                      {btn.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Commands */}
            <div style={{
              maxWidth: '1000px',
              margin: '0 auto 12px auto',
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}>
              {quickCommands.map((cmd, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickCommand(cmd.text)}
                  disabled={isLoading}
                  style={{
                    padding: '8px 14px',
                    background: 'rgba(102, 126, 234, 0.1)',
                    border: '1px solid rgba(102, 126, 234, 0.2)',
                    borderRadius: '20px',
                    color: '#667eea',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: isLoading ? 0.5 : 1
                  }}
                  onMouseOver={(e) => {
                    if (!isLoading) {
                      e.currentTarget.style.background = 'rgba(102, 126, 234, 0.2)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.2)';
                    }
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <span>{cmd.emoji}</span>
                  <span>{cmd.text}</span>
                </button>
              ))}
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-end',
              maxWidth: '1000px',
              margin: '0 auto'
            }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Сообщение..."
                  disabled={isLoading}
                  rows={1}
                  style={{
                    width: '100%',
                    padding: '14px 48px 14px 16px',
                    background: 'white',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    color: '#1d1d1f',
                    fontSize: '15px',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'inherit',
                    minHeight: '48px',
                    maxHeight: '120px',
                    borderRadius: '24px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#007AFF';
                    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(0, 122, 255, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    bottom: '8px',
                    width: '32px',
                    height: '32px',
                    background: input.trim() && !isLoading 
                      ? 'linear-gradient(135deg, #007AFF 0%, #0051D5 100%)'
                      : 'rgba(0, 0, 0, 0.1)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: input.trim() && !isLoading 
                      ? '0 2px 8px rgba(0, 122, 255, 0.3)'
                      : 'none'
                  }}
                  onMouseOver={(e) => {
                    if (input.trim() && !isLoading) {
                      e.currentTarget.style.transform = 'scale(1.1)';
                    }
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M14 2L7 9M14 2L9.5 14L7 9M14 2L2 6.5L7 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes typing {
          0%, 100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          50% {
            transform: translateY(-6px);
            opacity: 1;
          }
        }

        .typing-dot {
          width: 8px;
          height: 8px;
          background: #86868b;
          borderRadius: 50%;
          animation: typing 1.4s infinite;
        }

        textarea::placeholder {
          color: #86868b;
        }

        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: transparent;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          borderRadius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.3);
        }

        * {
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
        }
      `}</style>
    </>
  );
}