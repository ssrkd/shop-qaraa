import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import akaLogo from '../images/aka.png';

export default function Dashboard({ user, onLogout }) {
  const [sellers, setSellers] = useState([]);
  const [onlineSellers, setOnlineSellers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [logFilter, setLogFilter] = useState('all');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [salesToday, setSalesToday] = useState(0);
  const [profitToday, setProfitToday] = useState(0);
  const [editingSeller, setEditingSeller] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmCallback, setConfirmCallback] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSeller, setNewSeller] = useState({
    email: '',
    password: '',
    username: '',
    fullname: ''
  });

  const navigate = useNavigate();
  const loggedOnce = useRef(false);

  async function fetchSalesToday() {
    const today = new Date();
    const tzOffset = today.getTimezoneOffset();
  
    const startOfDayUTC = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    startOfDayUTC.setMinutes(startOfDayUTC.getMinutes() - tzOffset);
  
    const endOfDayUTC = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    endOfDayUTC.setMinutes(endOfDayUTC.getMinutes() - tzOffset);
  
    const { data, error } = await supabase
      .from('sales')
      .select('*', { count: 'exact' })
      .gte('created_at', startOfDayUTC.toISOString())
      .lte('created_at', endOfDayUTC.toISOString());
  
    if (error) {
      console.error(error);
    } else {
      setSalesToday(data.length);
      const profit = data.reduce((sum, sale) => sum + parseFloat(sale.price) * sale.quantity, 0);
      setProfitToday(profit);
    }
  }

  useEffect(() => {
    fetchSalesToday();
  
    // 🔄 Реакция на новые продажи
    const salesChannel = supabase
      .channel('realtime:sales')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'sales' },
        (payload) => {
          console.log('📦 Новая продажа:', payload.new);
          fetchSalesToday();
        }
      )
      .subscribe();
  
    // 🔄 Реакция на оплату (если у тебя есть таблица payments)
    const paymentsChannel = supabase
      .channel('realtime:payments')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'payments' },
        (payload) => {
          console.log('💳 Новая оплата:', payload.new);
          fetchSalesToday();
        }
      )
      .subscribe();
  
    // ⏱ fallback на случай, если realtime отключится
    const interval = setInterval(() => {
      fetchSalesToday();
    }, 10000);
  
    return () => {
      clearInterval(interval);
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(paymentsChannel);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // каждую секунду
  
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString("ru-RU", { hour12: false });
  };

  const fetchSellers = async () => {
    const { data, error } = await supabase.from('login').select('*').eq('role', 'seller');
    if (error) console.error('Ошибка при загрузке продавцов:', error);
    else {
      setSellers(data);
      setOnlineSellers(data.filter(s => s.is_online));
    }
  };

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) console.error('Ошибка загрузки логов:', error);
    else setLogs(data);
  };

  useEffect(() => {
    if (user.role !== 'owner') return;
  
    fetchSellers();
    fetchLogs();
    fetchSalesToday();
  
    const sellerChannel = supabase
      .channel('realtime:login')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'login' },
        (payload) => {
          console.log('👥 Изменение в login:', payload);
          fetchSellers();
        }
      )
      .subscribe();
  
    const logChannel = supabase
      .channel('realtime:logs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'logs' },
        (payload) => {
          console.log('🪵 Новый лог:', payload);
          fetchLogs();
        }
      )
      .subscribe();
  
    // fallback на случай отключения realtime
    const interval = setInterval(() => {
      fetchSellers();
      fetchLogs();
      fetchSalesToday();
    }, 10000);
  
    return () => {
      clearInterval(interval);
      supabase.removeChannel(sellerChannel);
      supabase.removeChannel(logChannel);
    };
  }, [user]);

  const markOnline = async (id, status) => {
    const { error } = await supabase.from('login').update({ is_online: status }).eq('id', id);
    if (error) console.error('Ошибка при обновлении статуса онлайн:', error);
  };

  const openAddModal = () => {
    setNewSeller({
      email: '',
      password: '',
      username: '',
      fullname: ''
    });
    setShowAddModal(true);
  };

  const addSeller = async () => {
    const { email, password, username, fullname } = newSeller;

    if (!email.trim() || !password.trim() || !username.trim() || !fullname.trim()) {
      setSuccessMessage("⚠️ Заполните все поля!");
      setShowSuccessModal(true);
      return;
    }

    const { error } = await supabase.from('login').insert([{ 
      email, password, username, fullname, role: 'seller', is_online: false 
    }]);
    
    if (error) {
      setSuccessMessage('❌ Ошибка при добавлении: ' + error.message);
      setShowSuccessModal(true);
    } else {
      setSuccessMessage('✅ Продавец успешно добавлен');
      setShowSuccessModal(true);
      setShowAddModal(false);
      fetchSellers();
      addLog(fullname, 'Добавлен как новый продавец');
    }
  };

  const removeSeller = (id, fullname) => {
    setConfirmCallback(() => async () => {
      const { error } = await supabase.from('login').delete().eq('id', id);
      if (error) {
        setSuccessMessage('❌ Ошибка при удалении продавца');
        setShowSuccessModal(true);
      } else {
        setSuccessMessage('✅ Продавец успешно удалён');
        setShowSuccessModal(true);
        fetchSellers();
        addLog(fullname, 'Удалён из системы');
      }
      setShowConfirmModal(false);
    });
    setShowConfirmModal(true);
  };

  const openEditModal = (seller) => {
    setEditingSeller({
      id: seller.id,
      fullname: seller.fullname,
      username: seller.username,
      email: seller.email,
      password: '' // Не показываем старый пароль
    });
    setShowEditModal(true);
  };

  const updateSeller = async () => {
    if (!editingSeller.fullname.trim() || !editingSeller.username.trim() || !editingSeller.email.trim()) {
      setSuccessMessage('⚠️ Заполните все обязательные поля');
      setShowSuccessModal(true);
      return;
    }

    const updateData = {
      fullname: editingSeller.fullname,
      username: editingSeller.username,
      email: editingSeller.email
    };

    // Если ввели новый пароль, обновляем его
    if (editingSeller.password.trim()) {
      updateData.password = editingSeller.password;
    }

    const { error } = await supabase
      .from('login')
      .update(updateData)
      .eq('id', editingSeller.id);

    if (error) {
      setSuccessMessage('❌ Ошибка при обновлении: ' + error.message);
      setShowSuccessModal(true);
    } else {
      setSuccessMessage('✅ Продавец успешно обновлён');
      setShowSuccessModal(true);
      setShowEditModal(false);
      setEditingSeller(null);
      fetchSellers();
      addLog(updateData.fullname, 'Данные обновлены');
    }
  };

  const addLog = async (fullname, action, doFetch = true) => {
    const now = new Date();
    const almatyTime = new Date(now.getTime() + 5 * 60 * 60 * 1000);
    const { error } = await supabase.from('logs').insert([{ 
      fullname, action, created_at: almatyTime 
    }]);
    if (error) console.error('Ошибка добавления лога:', error);
    else if (doFetch) fetchLogs();
  };

  useEffect(() => {
    const logLogin = async () => {
      if (!user) return;
      
      // Проверяем, был ли уже залогирован вход в текущей сессии
      const sessionKey = `logged_in_${user.id}`;
      const alreadyLogged = sessionStorage.getItem(sessionKey);
      
      if (alreadyLogged) return; // Уже логировали вход в этой сессии
      
      const now = new Date();
      const almatyTime = new Date(now.getTime() + 5 * 60 * 60 * 1000);
      const { error } = await supabase.from('logs').insert([{
        fullname: user.fullname,
        action: 'Вошёл в систему',
        created_at: almatyTime
      }]);
      if (error) console.error('Ошибка при добавлении лога входа:', error);
      else sessionStorage.setItem(sessionKey, 'true'); // Помечаем, что вход залогирован
    };

    if (!loggedOnce.current) {
      loggedOnce.current = true;
      logLogin();
    }
  }, [user]);

  // Обновляем текущую страницу при заходе
  useEffect(() => {
    if (!user) return;

    const updateCurrentPage = async () => {
      await supabase
        .from('user_login_status')
        .update({
          current_page: 'Dashboard',
          page_entered_at: new Date().toISOString(),
          last_active: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('is_logged_in', true);
    };

    updateCurrentPage();
  }, [user]);

  // Автообновление last_active каждые 30 секунд
  useEffect(() => {
    if (!user) return;

    const updateActivity = async () => {
      await supabase
        .from('user_login_status')
        .update({
          last_active: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('is_logged_in', true);
    };

    // Обновляем сразу
    updateActivity();

    // И каждые 30 секунд
    const interval = setInterval(updateActivity, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = async () => {
    if (user.role === 'seller') {
      await markOnline(user.id, false);
    }
    
    // Обновляем user_login_status при выходе
    await supabase
      .from('user_login_status')
      .update({
        is_logged_in: false,
        last_active: new Date().toISOString()
      })
      .eq('user_id', user.id);
    
    await logAction('Вышел из системы');
    // Очищаем метку входа из sessionStorage
    const sessionKey = `logged_in_${user.id}`;
    sessionStorage.removeItem(sessionKey);
    onLogout();
  };

  const logAction = async (action, doFetch = true) => {
    if (!user) return;
    const now = new Date();
    const almatyTime = new Date(now.getTime() + 5 * 60 * 60 * 1000);
    const { error } = await supabase.from('logs').insert([{ 
      fullname: user.fullname, action, created_at: almatyTime 
    }]);
    if (error) console.error('Ошибка добавления лога:', error);
    if (doFetch) fetchLogs();
  };

  const OverviewTab = () => (
    <div>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '20px', 
        marginBottom: '28px' 
      }}>
        <div style={{ 
          padding: '28px', 
          background: 'white', 
          borderRadius: '20px', 
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
          border: '2px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
              borderRadius: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
              Всего продавцов
            </p>
          </div>
          <p style={{ fontSize: '40px', fontWeight: '700', color: '#1a1a1a', letterSpacing: '-1px' }}>
            {sellers.length}
          </p>
        </div>

        <div style={{ 
          padding: '28px', 
          background: 'white', 
          borderRadius: '20px', 
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
          border: '2px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
              borderRadius: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
              В сети сейчас
            </p>
          </div>
          <p style={{ fontSize: '40px', fontWeight: '700', color: '#1a1a1a', letterSpacing: '-1px' }}>
            {onlineSellers.length}
          </p>
        </div>

        <div style={{ 
          padding: '28px', 
          background: 'white', 
          borderRadius: '20px', 
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
          border: '2px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', 
              borderRadius: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <p style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
              Продаж сегодня
            </p>
          </div>
          <p style={{ fontSize: '40px', fontWeight: '700', color: '#1a1a1a', letterSpacing: '-1px' }}>
            {salesToday}
          </p>
        </div>

        <div style={{ 
          padding: '28px', 
          background: 'white', 
          borderRadius: '20px', 
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
          border: '2px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
              borderRadius: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h8M8 10h8M12 10v8" />
              </svg>
            </div>
            <p style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
              Прибыль сегодня
            </p>
          </div>
          <p style={{ fontSize: '32px', fontWeight: '700', color: '#1a1a1a', letterSpacing: '-1px' }}>
            {profitToday.toLocaleString()} ₸
          </p>
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '20px' 
      }}>
        <div style={{ 
          background: 'white', 
          borderRadius: '20px', 
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)', 
          overflow: 'hidden' 
        }}>
          <div style={{ 
            padding: '20px 24px', 
            background: '#fafafa', 
            borderBottom: '2px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)', 
              borderRadius: '10px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'white'
            }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1a1a1a' }}>
              Последняя активность
            </h3>
          </div>
          <div style={{ padding: '20px 24px', maxHeight: '400px', overflowY: 'auto' }}>
            {logs.slice(0, 6).map((log, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 0',
                borderBottom: idx < 5 ? '1px solid #f3f4f6' : 'none'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  minWidth: '36px',
                  borderRadius: '50%',
                  background: log.action.includes('Вошёл') ? '#f0fdf4' : 
                              log.action.includes('Вышел') ? '#fef2f2' : '#fafafa',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: log.action.includes('Вошёл') ? '#16a34a' : 
                         log.action.includes('Вышел') ? '#dc2626' : '#6b7280'
                }}>
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {log.action.includes('Вошёл') ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    ) : log.action.includes('Вышел') ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    )}
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', color: '#1a1a1a', fontWeight: '500', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <strong>{log.fullname}</strong> {log.action.toLowerCase()}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {new Date(log.created_at).toLocaleString('ru-RU', { 
                      timeZone: 'Asia/Almaty',
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ 
          background: 'white', 
          borderRadius: '20px', 
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)', 
          overflow: 'hidden' 
        }}>
          <div style={{ 
            padding: '20px 24px', 
            background: '#fafafa', 
            borderBottom: '2px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
              borderRadius: '10px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'white'
            }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1a1a1a' }}>
              Продавцы в сети
            </h3>
          </div>
          <div style={{ padding: '20px 24px', maxHeight: '400px', overflowY: 'auto' }}>
            {onlineSellers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 24px' }}>
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  background: '#fafafa', 
                  borderRadius: '50%', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  marginBottom: '16px' 
                }}>
                  <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#9ca3af">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p style={{ color: '#6b7280', fontSize: '14px' }}>Нет активных продавцов</p>
              </div>
            ) : (
              onlineSellers.map((seller, idx) => (
                <div key={seller.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 0',
                  borderBottom: idx < onlineSellers.length - 1 ? '1px solid #f3f4f6' : 'none'
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    minWidth: '36px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    {seller.fullname[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', color: '#1a1a1a', fontWeight: '600', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {seller.fullname}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      @{seller.username}
                    </div>
                  </div>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    minWidth: '8px',
                    borderRadius: '50%',
                    background: '#10b981'
                  }}></div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const SellersTab = () => (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a', marginBottom: '4px' }}>
            Управление продавцами
          </h2>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Добавляйте и управляйте продавцами системы
          </p>
        </div>
        <button
          onClick={openAddModal}
          style={{
            padding: '14px 28px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseOver={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 10px 30px rgba(16, 185, 129, 0.3)';
          }}
          onMouseOut={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = 'none';
          }}
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Добавить продавца
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {sellers.map(seller => (
          <div key={seller.id} style={{
            background: 'white',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
            border: '2px solid #e5e7eb',
            padding: '24px',
            transition: 'all 0.3s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 30px 80px rgba(0, 0, 0, 0.12)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.08)';
          }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: '700'
              }}>
                {seller.fullname[0]?.toUpperCase()}
              </div>
              <div style={{
                padding: '6px 12px',
                background: seller.is_online ? '#f0fdf4' : '#fafafa',
                border: `2px solid ${seller.is_online ? '#bbf7d0' : '#e5e7eb'}`,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: '600',
                color: seller.is_online ? '#16a34a' : '#6b7280'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: seller.is_online ? '#16a34a' : '#9ca3af'
                }}></div>
                {seller.is_online ? 'В сети' : 'Не в сети'}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a', marginBottom: '8px' }}>
                {seller.fullname}
              </h4>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                @{seller.username}
              </p>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>
                {seller.email}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => openEditModal(seller)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'white',
                  color: '#3b82f6',
                  border: '2px solid #bfdbfe',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#eff6ff';
                  e.target.style.borderColor = '#3b82f6';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'white';
                  e.target.style.borderColor = '#bfdbfe';
                }}
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Редактировать
              </button>
              <button
                onClick={() => removeSeller(seller.id, seller.fullname)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'white',
                  color: '#dc2626',
                  border: '2px solid #fecaca',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#fef2f2';
                  e.target.style.borderColor = '#dc2626';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'white';
                  e.target.style.borderColor = '#fecaca';
                }}
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Удалить
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const LogsTab = () => {
    const filteredLogs = logs.filter(log => {
      const action = log.action.toLowerCase();
      if (logFilter === 'all') return true;
      if (logFilter === 'login') return action.includes('вошёл');
      if (logFilter === 'logout') return action.includes('вышел');
      if (logFilter === 'sale') return action.includes('продаж');
      return true;
    });

    return (
      <div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a', marginBottom: '4px' }}>
              Журнал активности
            </h2>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              Отслеживайте все действия в системе
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setLogFilter('all')}
              style={{
                padding: '10px 20px',
                background: logFilter === 'all' ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)' : 'white',
                color: logFilter === 'all' ? 'white' : '#6b7280',
                border: `2px solid ${logFilter === 'all' ? '#1a1a1a' : '#e5e7eb'}`,
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Все
            </button>
            <button
              onClick={() => setLogFilter('login')}
              style={{
                padding: '10px 20px',
                background: logFilter === 'login' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'white',
                color: logFilter === 'login' ? 'white' : '#6b7280',
                border: `2px solid ${logFilter === 'login' ? '#10b981' : '#e5e7eb'}`,
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Вход
            </button>
            <button
              onClick={() => setLogFilter('logout')}
              style={{
                padding: '10px 20px',
                background: logFilter === 'logout' ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' : 'white',
                color: logFilter === 'logout' ? 'white' : '#6b7280',
                border: `2px solid ${logFilter === 'logout' ? '#dc2626' : '#e5e7eb'}`,
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Выход
            </button>
          </div>
        </div>

        <div style={{ 
          background: 'white', 
          borderRadius: '20px', 
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '24px 32px', maxHeight: '600px', overflowY: 'auto' }}>
            {filteredLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 24px' }}>
                <div style={{ 
                  width: '80px', 
                  height: '80px', 
                  background: '#fafafa', 
                  borderRadius: '50%', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  marginBottom: '20px' 
                }}>
                  <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#9ca3af">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 style={{ fontSize: '20px', color: '#1a1a1a', fontWeight: '600', marginBottom: '8px' }}>
                  Нет записей
                </h3>
                <p style={{ color: '#6b7280', fontSize: '14px' }}>
                  Логи с выбранным фильтром отсутствуют
                </p>
              </div>
            ) : (
              filteredLogs.map((log, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '20px',
                  background: idx % 2 === 0 ? '#fafafa' : 'white',
                  borderRadius: '12px',
                  marginBottom: idx < filteredLogs.length - 1 ? '8px' : '0'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: log.action.includes('Вошёл') ? '#f0fdf4' : 
                                log.action.includes('Вышел') ? '#fef2f2' : '#fafafa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: log.action.includes('Вошёл') ? '#16a34a' : 
                           log.action.includes('Вышел') ? '#dc2626' : '#6b7280'
                  }}>
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {log.action.includes('Вошёл') ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      ) : log.action.includes('Вышел') ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      )}
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', color: '#1a1a1a', fontWeight: '500', marginBottom: '6px' }}>
                      <strong>{log.fullname}</strong> {log.action.toLowerCase()}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                      {new Date(log.created_at).toLocaleString('ru-RU', { 
                        timeZone: 'Asia/Almaty',
                        weekday: 'short',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const SellerDashboard = () => (
    <div>
      <div style={{ 
        background: 'white', 
        borderRadius: '20px', 
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
        padding: '40px',
        marginBottom: '28px',
        textAlign: 'center'
      }}>
        <div style={{ 
          width: '80px', 
          height: '80px', 
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)', 
          borderRadius: '50%', 
          display: 'inline-flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'white',
          fontSize: '32px',
          fontWeight: '700',
          marginBottom: '20px'
        }}>
          {user?.fullname?.[0]?.toUpperCase()}
        </div>
        <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px' }}>
          Добро пожаловать, {user?.fullname}!
        </h2>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>
          Рабочее место продавца qaraa.crm
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <div style={{
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
          padding: '32px',
          textAlign: 'center',
          transition: 'all 0.3s',
          border: '2px solid #e5e7eb'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 30px 80px rgba(0, 0, 0, 0.12)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.08)';
        }}
        >
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: '20px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px'
          }}>
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="white">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 style={{ fontSize: '22px', fontWeight: '600', color: '#1a1a1a', marginBottom: '12px' }}>
            Новая продажа
          </h3>
          <p style={{ color: '#6b7280', fontSize: '15px', marginBottom: '24px' }}>
            Оформить продажу товара клиенту
          </p>
          <button
            onClick={() => navigate('/new-sale')}
            style={{
              width: '100%',
              padding: '16px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 10px 30px rgba(16, 185, 129, 0.3)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            Начать продажу
          </button>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
          padding: '32px',
          textAlign: 'center',
          transition: 'all 0.3s',
          border: '2px solid #e5e7eb'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 30px 80px rgba(0, 0, 0, 0.12)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.08)';
        }}
        >
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            borderRadius: '20px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px'
          }}>
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="white">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 style={{ fontSize: '22px', fontWeight: '600', color: '#1a1a1a', marginBottom: '12px' }}>
            История продаж
          </h3>
          <p style={{ color: '#6b7280', fontSize: '15px', marginBottom: '24px' }}>
            Просмотр всех ваших продаж
          </p>
          <button
            onClick={() => navigate('/sales-history')}
            style={{
              width: '100%',
              padding: '16px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 10px 30px rgba(59, 130, 246, 0.3)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            Посмотреть историю
          </button>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
          padding: '32px',
          textAlign: 'center',
          transition: 'all 0.3s',
          border: '2px solid #e5e7eb'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 30px 80px rgba(0, 0, 0, 0.12)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.08)';
        }}
        >
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            borderRadius: '20px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px'
          }}>
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="white">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 style={{ fontSize: '22px', fontWeight: '600', color: '#1a1a1a', marginBottom: '12px' }}>
            Отчёт за день
          </h3>
          <p style={{ color: '#6b7280', fontSize: '15px', marginBottom: '24px' }}>
            Статистика и аналитика продаж
          </p>
          <button
            onClick={() => navigate('/analitika-history')}
            style={{
              width: '100%',
              padding: '16px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 10px 30px rgba(245, 158, 11, 0.3)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            Открыть отчёт
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', sans-serif; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' 
      }}>
        <div style={{ 
          background: 'white', 
          borderBottom: '2px solid #e5e7eb',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ 
            maxWidth: '1400px', 
            margin: '0 auto', 
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: '700'
              }}>
                {user?.fullname?.[0]?.toUpperCase()}
              </div>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a', marginBottom: '4px' }}>
                  {user?.fullname}
                </h2>
                <p style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
                  {user?.role === 'owner' ? 'Владелец системы' : 'Продавец'} • @{user?.username}
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ 
                fontSize: '16px', 
                color: '#6b7280', 
                fontWeight: '600',
                fontVariantNumeric: 'tabular-nums'
              }}>
                {formatTime(currentTime)}
              </span>
              <button
                onClick={handleLogout}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.2)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Выйти
              </button>
            </div>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            {user?.role === 'owner' ? (
              <>
                <div style={{ 
                  background: 'white', 
                  borderRadius: '16px', 
                  padding: '8px',
                  marginBottom: '24px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}>
                  <button
                    onClick={() => setActiveTab('overview')}
                    style={{
                      flex: 1,
                      minWidth: '120px',
                      padding: '14px 20px',
                      background: activeTab === 'overview' ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)' : 'transparent',
                      color: activeTab === 'overview' ? 'white' : '#6b7280',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Обзор
                  </button>
                  <button
                    onClick={() => setActiveTab('sellers')}
                    style={{
                      flex: 1,
                      minWidth: '120px',
                      padding: '14px 20px',
                      background: activeTab === 'sellers' ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)' : 'transparent',
                      color: activeTab === 'sellers' ? 'white' : '#6b7280',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Продавцы
                  </button>
                  <button
                    onClick={() => setActiveTab('logs')}
                    style={{
                      flex: 1,
                      minWidth: '140px',
                      padding: '14px 20px',
                      background: activeTab === 'logs' ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)' : 'transparent',
                      color: activeTab === 'logs' ? 'white' : '#6b7280',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Журнал
                  </button>
                  <button
                    onClick={() => navigate('/adminpanel')}
                    style={{
                      flex: 1,
                      minWidth: '140px',
                      padding: '14px 20px',
                      background: 'transparent',
                      color: '#6b7280',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    onMouseOver={(e) => e.target.style.background = '#f9fafb'}
                    onMouseOut={(e) => e.target.style.background = 'transparent'}
                  >
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Админ-панель
                  </button>
                  {user.role === 'owner' && (
                    <button
                      onClick={() => navigate('/akaai')}
                      style={{
                        flex: 1,
                        minWidth: '140px',
                        padding: '14px 20px',
                        background: 'transparent',
                        color: '#6b7280',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                      onMouseOver={(e) => e.target.style.background = '#f9fafb'}
                      onMouseOut={(e) => e.target.style.background = 'transparent'}
                    >
                      <img src={akaLogo} alt="akaAI" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                      akaAI
                    </button>
                  )}            
                </div>

                <div style={{ 
                  background: 'white', 
                  borderRadius: '20px', 
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
                  padding: '32px'
                }}>
                  {activeTab === 'overview' && <OverviewTab />}
                  {activeTab === 'sellers' && <SellersTab />}
                  {activeTab === 'logs' && <LogsTab />}
                </div>
              </>
            ) : (
              <div style={{ 
                background: 'white', 
                borderRadius: '20px', 
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
                padding: '32px'
              }}>
                <SellerDashboard />
              </div>
            )}

            <footer style={{
              textAlign: 'center',
              padding: '24px',
              fontSize: '14px',
              color: '#6b7280',
              marginTop: '32px'
            }}>
              © qaraa.crm | powered by aka. Система безопасного доступа, 2025.<br />
              Последнее обновление: 14.10.2025 | srk.
            </footer>
          </div>
        </div>
      </div>

      {/* Модальное окно редактирования продавца */}
      {showEditModal && editingSeller && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
          onClick={() => setShowEditModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '24px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 30px 80px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '28px 24px 20px',
              borderBottom: '1px solid #f0f0f0',
              textAlign: 'center'
            }}>
              <h2 style={{
                fontSize: '22px',
                fontWeight: '600',
                color: '#1a1a1a',
                margin: 0
              }}>
                Редактировать продавца
              </h2>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                marginTop: '8px'
              }}>
                Обновите данные продавца
              </p>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#6b7280',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Полное имя
                </label>
                <input
                  type="text"
                  value={editingSeller.fullname}
                  onChange={(e) => setEditingSeller({...editingSeller, fullname: e.target.value})}
                  placeholder="Введите полное имя"
                  style={{
                    width: '100%',
                    padding: '16px',
                    fontSize: '16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '14px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    fontWeight: '500'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#6b7280',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Логин (username)
                </label>
                <input
                  type="text"
                  value={editingSeller.username}
                  onChange={(e) => setEditingSeller({...editingSeller, username: e.target.value})}
                  placeholder="Введите логин"
                  style={{
                    width: '100%',
                    padding: '16px',
                    fontSize: '16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '14px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    fontWeight: '500'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#10b981';
                    e.target.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#6b7280',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Email
                </label>
                <input
                  type="email"
                  value={editingSeller.email}
                  onChange={(e) => setEditingSeller({...editingSeller, email: e.target.value})}
                  placeholder="Введите email"
                  style={{
                    width: '100%',
                    padding: '16px',
                    fontSize: '16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '14px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    fontWeight: '500'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#f59e0b';
                    e.target.style.boxShadow = '0 0 0 4px rgba(245, 158, 11, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#6b7280',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Новый пароль (оставьте пустым, если не хотите менять)
                </label>
                <input
                  type="password"
                  value={editingSeller.password}
                  onChange={(e) => setEditingSeller({...editingSeller, password: e.target.value})}
                  placeholder="Введите новый пароль"
                  style={{
                    width: '100%',
                    padding: '16px',
                    fontSize: '16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '14px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    fontWeight: '500'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#8b5cf6';
                    e.target.style.boxShadow = '0 0 0 4px rgba(139, 92, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowEditModal(false)}
                  style={{
                    flex: 1,
                    padding: '16px',
                    background: '#f3f4f6',
                    color: '#1a1a1a',
                    border: 'none',
                    borderRadius: '14px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#e5e7eb'}
                  onMouseOut={(e) => e.target.style.background = '#f3f4f6'}
                >
                  Отмена
                </button>
                <button
                  onClick={updateSeller}
                  style={{
                    flex: 1,
                    padding: '16px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '14px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                  }}
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно успеха */}
      {showSuccessModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: '20px',
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={() => setShowSuccessModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              maxWidth: '380px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden',
              animation: 'scaleIn 0.3s ease'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '32px 24px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                background: successMessage.includes('✅') 
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                  : successMessage.includes('❌')
                  ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                  : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: '32px'
              }}>
                {successMessage.includes('✅') ? '✅' : successMessage.includes('❌') ? '❌' : '⚠️'}
              </div>
              <p style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1a1a1a',
                margin: '0 0 24px',
                lineHeight: '1.5'
              }}>
                {successMessage}
              </p>
              <button
                onClick={() => setShowSuccessModal(false)}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                }}
              >
                ОК
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения */}
      {showConfirmModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: '20px',
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={() => setShowConfirmModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              maxWidth: '380px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden',
              animation: 'scaleIn 0.3s ease'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '32px 24px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: '32px'
              }}>
                ⚠️
              </div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#1a1a1a',
                margin: '0 0 12px'
              }}>
                Удалить продавца?
              </h3>
              <p style={{
                fontSize: '15px',
                color: '#6b7280',
                margin: '0 0 28px',
                lineHeight: '1.6'
              }}>
                Это действие нельзя отменить. Продавец будет удалён из системы.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: '#f3f4f6',
                    color: '#1a1a1a',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#e5e7eb'}
                  onMouseOut={(e) => e.target.style.background = '#f3f4f6'}
                >
                  Отмена
                </button>
                <button
                  onClick={() => confirmCallback && confirmCallback()}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 8px 20px rgba(239, 68, 68, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                  }}
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно добавления продавца */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px',
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '24px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 30px 80px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden',
              animation: 'scaleIn 0.3s ease'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '28px 24px 20px',
              borderBottom: '1px solid #f0f0f0',
              textAlign: 'center'
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h2 style={{
                fontSize: '22px',
                fontWeight: '600',
                color: '#1a1a1a',
                margin: 0
              }}>
                Добавить продавца
              </h2>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                marginTop: '8px'
              }}>
                Введите данные нового продавца
              </p>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#6b7280',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Полное имя
                </label>
                <input
                  type="text"
                  value={newSeller.fullname}
                  onChange={(e) => setNewSeller({...newSeller, fullname: e.target.value})}
                  placeholder="Введите полное имя"
                  style={{
                    width: '100%',
                    padding: '16px',
                    fontSize: '16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '14px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    fontWeight: '500'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#6b7280',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Логин (username)
                </label>
                <input
                  type="text"
                  value={newSeller.username}
                  onChange={(e) => setNewSeller({...newSeller, username: e.target.value})}
                  placeholder="Введите логин"
                  style={{
                    width: '100%',
                    padding: '16px',
                    fontSize: '16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '14px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    fontWeight: '500'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#10b981';
                    e.target.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#6b7280',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Email
                </label>
                <input
                  type="email"
                  value={newSeller.email}
                  onChange={(e) => setNewSeller({...newSeller, email: e.target.value})}
                  placeholder="Введите email"
                  style={{
                    width: '100%',
                    padding: '16px',
                    fontSize: '16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '14px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    fontWeight: '500'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#f59e0b';
                    e.target.style.boxShadow = '0 0 0 4px rgba(245, 158, 11, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#6b7280',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Пароль
                </label>
                <input
                  type="password"
                  value={newSeller.password}
                  onChange={(e) => setNewSeller({...newSeller, password: e.target.value})}
                  placeholder="Введите пароль"
                  style={{
                    width: '100%',
                    padding: '16px',
                    fontSize: '16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '14px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    fontWeight: '500'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#8b5cf6';
                    e.target.style.boxShadow = '0 0 0 4px rgba(139, 92, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowAddModal(false)}
                  style={{
                    flex: 1,
                    padding: '16px',
                    background: '#f3f4f6',
                    color: '#1a1a1a',
                    border: 'none',
                    borderRadius: '14px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#e5e7eb'}
                  onMouseOut={(e) => e.target.style.background = '#f3f4f6'}
                >
                  Отмена
                </button>
                <button
                  onClick={addSeller}
                  style={{
                    flex: 1,
                    padding: '16px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '14px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 8px 20px rgba(16, 185, 129, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                  }}
                >
                  Добавить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </>
  );
}