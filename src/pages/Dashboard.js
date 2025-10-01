import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Dashboard({ user, onLogout }) {
  const [sellers, setSellers] = useState([]);
  const [onlineSellers, setOnlineSellers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [logFilter, setLogFilter] = useState('all');
  const [sales, setSales] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [salesToday, setSalesToday] = useState(0);

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
    }
  }

  useEffect(() => {
    fetchSalesToday();
  
    const salesChannel = supabase
      .channel('public:sales')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sales' },
        (payload) => {
          // Recalculate using server time boundaries to avoid timezone drift
          fetchSalesToday();
        }
      )
      .subscribe();
  
    return () => {
      supabase.removeChannel(salesChannel);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString("ru-RU", { hour12: false });
  };

  useEffect(() => {
    let interval;
    
    const fetchSales = async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) console.error('Ошибка загрузки продаж:', error);
      else setSales(data);
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

    const handleBeforeUnload = async (event) => {
      if (user.role === 'seller') {
        await markOnline(user.id, false);
        await logAction('Вышел из системы', false);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    if (user.role === 'owner') {
      fetchSellers();
      fetchLogs();
      fetchSales();
      fetchSalesToday();
      interval = setInterval(() => {
        fetchSellers();
        fetchLogs();
        fetchSales();
        fetchSalesToday();
      }, 5000);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (interval) clearInterval(interval);
    };
  }, [user]);

  const markOnline = async (id, status) => {
    const { error } = await supabase.from('login').update({ is_online: status }).eq('id', id);
    if (error) console.error('Ошибка при обновлении статуса онлайн:', error);
  };

  const addSeller = async () => {
    const email = prompt("Email нового продавца:");
    const password = prompt("Пароль нового продавца:");
    const username = prompt("Логин нового продавца:");
    const fullname = prompt("Полное имя нового продавца:");

    if (!email || !password || !username || !fullname) return alert("Все поля обязательны!");

    const { error } = await supabase.from('login').insert([{ email, password, username, fullname, role: 'seller', is_online: false }]);
    if (error) alert('Ошибка при добавлении продавца: ' + error.message);
    else {
      alert('Продавец добавлен');
      fetchSellers();
      addLog(fullname, 'Добавлен как новый продавец');
    }
  };

  const removeSeller = async (id, fullname) => {
    if (!window.confirm('Вы точно хотите удалить продавца?')) return;

    const { error } = await supabase.from('login').delete().eq('id', id);
    if (error) alert('Ошибка при удалении продавца');
    else {
      fetchSellers();
      addLog(fullname, 'Удалён из системы');
    }
  };

  const addLog = async (fullname, action, doFetch = true) => {
    const now = new Date();
    const almatyTime = new Date(now.getTime() + 5 * 60 * 60 * 1000);
    const { error } = await supabase.from('logs').insert([{ fullname, action, created_at: almatyTime }]);
    if (error) console.error('Ошибка добавления лога:', error);
    else if (doFetch) fetchLogs();
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
    const logLogin = async () => {
      if (!user) return;
      const now = new Date();
      const almatyTime = new Date(now.getTime() + 5 * 60 * 60 * 1000);
      const { error } = await supabase.from('logs').insert([{
        fullname: user.fullname,
        action: 'Вошёл в систему',
        created_at: almatyTime
      }]);
      if (error) console.error('Ошибка при добавлении лога входа:', error);
    };

    if (!loggedOnce.current) {
      loggedOnce.current = true;
      logLogin();
    }
  }, [user]);

  const handleLogout = async () => {
    if (user.role === 'seller') {
      await markOnline(user.id, false);
      await logAction('Вышел из системы');
    }
    onLogout();
  };

  const logAction = async (action, doFetch = true) => {
    if (!user) return;
    const now = new Date();
    const almatyTime = new Date(now.getTime() + 5 * 60 * 60 * 1000);
    const { error } = await supabase.from('logs').insert([{ fullname: user.fullname, action, created_at: almatyTime }]);
    if (error) console.error('Ошибка добавления лога:', error);
    if (doFetch) fetchLogs();
  };

  const OverviewTab = () => (
    <div className="overview-content">
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-icon"><i className="fas fa-users"></i></div>
          <div className="stat-info">
            <div className="stat-number">{sellers.length}</div>
            <div className="stat-label">Всего продавцов</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><i className="fas fa-user-check"></i></div>
          <div className="stat-info">
            <div className="stat-number">{onlineSellers.length}</div>
            <div className="stat-label">В сети сейчас</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><i className="fas fa-chart-line"></i></div>
          <div className="stat-info">
            <div className="stat-number">{salesToday}</div>
            <div className="stat-label">Продаж сегодня</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><i className="fas fa-clipboard-list"></i></div>
          <div className="stat-info">
            <div className="stat-number">{logs.length}</div>
            <div className="stat-label">Записей в логе</div>
          </div>
        </div>
      </div>

      <div className="main-grid">
        <div className="activity-section">
          <div className="section-header">
            <div className="section-icon"><i className="fas fa-history"></i></div>
            <h3>Последняя активность</h3>
          </div>
          <div className="activity-list">
            {logs.slice(0, 6).map((log, idx) => (
              <div key={idx} className="activity-item">
                <div className="activity-avatar">
                  <i className={`fas ${
                    log.action.includes('Вошёл') ? 'fa-sign-in-alt' : 
                    log.action.includes('Вышел') ? 'fa-sign-out-alt' : 
                    'fa-user-plus'
                  }`}></i>
                </div>
                <div className="activity-details">
                  <div className="activity-text">
                    <strong>{log.fullname}</strong> {log.action.toLowerCase()}
                  </div>
                  <div className="activity-time">
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

        <div className="online-section">
          <div className="section-header">
            <div className="section-icon"><i className="fas fa-users-cog"></i></div>
            <h3>Продавцы в сети</h3>
          </div>
          <div className="online-list">
            {onlineSellers.map(seller => (
              <div key={seller.id} className="online-item">
                <div className="online-avatar"><i className="fas fa-user"></i></div>
                <div className="online-info">
                  <div className="online-name">{seller.fullname}</div>
                  <div className="online-username">@{seller.username}</div>
                </div>
                <div className="status-indicator online"></div>
              </div>
            ))}
            {onlineSellers.length === 0 && (
              <div className="empty-state">
                <i className="fas fa-users-slash"></i>
                <p>Нет активных продавцов</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const SellersTab = () => (
    <div className="sellers-content">
      <div className="section-header">
        <div className="section-icon">
          <i className="fas fa-users-cog"></i>
        </div>
        <h3>Управление продавцами</h3>
        <button className="btn btn-success" onClick={addSeller}>
          <i className="fas fa-plus"></i>
          Добавить продавца
        </button>
      </div>
      
      <div className="sellers-grid">
        {sellers.map(seller => (
          <div key={seller.id} className="seller-card">
            <div className="seller-header">
              <div className="seller-avatar">
                <i className="fas fa-user"></i>
              </div>
              <div className={`seller-status ${seller.is_online ? 'online' : 'offline'}`}>
                <i className="fas fa-circle"></i>
                {seller.is_online ? 'В сети' : 'Не в сети'}
              </div>
            </div>
            
            <div className="seller-info">
              <h4 className="seller-name">{seller.fullname}</h4>
              <p className="seller-username">@{seller.username}</p>
              <p className="seller-email">{seller.email}</p>
            </div>
            
            <div className="seller-actions">
              <button className="btn btn-danger" onClick={() => removeSeller(seller.id, seller.fullname)}>
                <i className="fas fa-trash"></i>
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
      <div className="logs-content">
        <div className="section-header">
          <div className="section-icon">
            <i className="fas fa-file-alt"></i>
          </div>
          <h3>Журнал активности</h3>
          <div className="filter-buttons">
            <button 
              onClick={() => setLogFilter('all')} 
              className={`filter-btn ${logFilter === 'all' ? 'active' : ''}`}
            >
              <i className="fas fa-list"></i>
              Все
            </button>
            <button 
              onClick={() => setLogFilter('login')} 
              className={`filter-btn ${logFilter === 'login' ? 'active' : ''}`}
            >
              <i className="fas fa-sign-in-alt"></i>
              Вход
            </button>
            <button 
              onClick={() => setLogFilter('logout')} 
              className={`filter-btn ${logFilter === 'logout' ? 'active' : ''}`}
            >
              <i className="fas fa-sign-out-alt"></i>
              Выход
            </button>
          </div>
        </div>
        
        <div className="logs-list">
          {filteredLogs.map((log, idx) => (
            <div key={idx} className="log-item">
              <div className="log-icon">
                <i className={`fas ${
                  log.action.includes('Вошёл') ? 'fa-sign-in-alt' : 
                  log.action.includes('Вышел') ? 'fa-sign-out-alt' : 
                  log.action.includes('продаж') ? 'fa-shopping-cart' : 
                  'fa-user-plus'
                }`}></i>
              </div>
              <div className="log-content">
                <div className="log-text">
                  <strong>{log.fullname}</strong> {log.action.toLowerCase()}
                </div>
                <div className="log-time">
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
          ))}
        </div>
      </div>
    );
  };

  const SellerDashboard = () => (
    <div className="seller-dashboard">
      <div className="welcome-section">
        <div className="section-header">
          <div className="section-icon">
            <i className="fas fa-store"></i>
          </div>
          <h3>Рабочее место продавца</h3>
        </div>
        <p className="welcome-text">Добро пожаловать в систему продаж qaraa</p>
      </div>
      
      <div className="actions-grid">
        <div className="action-card">
          <div className="action-icon">
            <i className="fas fa-plus-circle"></i>
          </div>
          <div className="action-content">
            <h4>Новая продажа</h4>
            <p>Оформить продажу товара</p>
            <button className="btn btn-dark" onClick={() => navigate('/new-sale')}>
              Начать продажу
            </button>
          </div>
        </div>
        
        <div className="action-card">
          <div className="action-icon">
            <i className="fas fa-history"></i>
          </div>
          <div className="action-content">
            <h4>История продаж</h4>
            <p>Просмотр всех продаж</p>
            <button className="btn btn-dark" onClick={() => navigate('/sales-history')}>
              Посмотреть историю
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        :root {
          --bg: #fafafa;
          --card-bg: #ffffff;
          --text: #333333;
          --muted: #888888;
          --border: #e0e0e0;
          --dark: #333333;
          --success: #2ecc71;
          --danger: #db4437;
        }

        .dashboard {
          min-height: 100vh;
          background: var(--bg);
        }

        .topbar {
          background: var(--card-bg);
          border-bottom: 1px solid var(--border);
          padding: 16px 24px;
        }

        .topbar-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .user-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #333;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .user-info h2 {
          margin: 0 0 2px 0;
          font-size: 18px;
          color: var(--text);
          font-weight: 600;
        }

        .user-info p {
          margin: 0;
          font-size: 13px;
          color: var(--muted);
        }

        .time {
          color: var(--muted);
          font-size: 14px;
          margin-right: 12px;
        }

        .btn {
          padding: 10px 16px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: var(--card-bg);
          color: var(--text);
          cursor: pointer;
          font-size: 14px;
          transition: all .2s;
        }

        .btn:hover {
          background: #f5f5f5;
          border-color: #bbb;
        }

        .btn-dark {
          background: var(--dark);
          color: #fff;
          border: none;
        }

        .btn-dark:hover {
          background: #555;
        }

        .btn-success {
          background: var(--success);
          color: #fff;
          border: none;
        }

        .btn-success:hover {
          background: #27ae60;
        }

        .btn-danger {
          background: var(--card-bg);
          color: var(--danger);
          border: 1px solid #f0c3bf;
        }

        .btn-danger:hover {
          background: #fdecea;
          border-color: #f1a199;
        }

        .dashboard-content {
          padding: 24px;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .nav-tabs {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 8px;
          display: flex;
          overflow: hidden;
          margin-bottom: 16px;
        }

        .nav-tab {
          flex: 1;
          padding: 12px 16px;
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 14px;
          color: var(--muted);
          transition: background .2s, color .2s;
        }

        .nav-tab:hover {
          background: #f5f5f5;
          color: var(--text);
        }

        .nav-tab.active {
          background: var(--dark);
          color: #fff;
        }

        .tab-content {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 24px;
        }

        .stats-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background: #f5f5f5;
          color: var(--dark);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-number {
          font-size: 22px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 2px;
        }

        .stat-label {
          font-size: 13px;
          color: var(--muted);
        }

        .main-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border);
        }

        .section-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background: #f5f5f5;
          color: var(--dark);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .section-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: var(--text);
          flex: 1;
        }

        .activity-list, .online-list, .logs-list {
          max-height: 400px;
          overflow-y: auto;
        }

        .activity-item, .online-item, .log-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid var(--border);
        }

        .activity-item:last-child, .online-item:last-child, .log-item:last-child {
          border-bottom: none;
        }

        .activity-avatar, .log-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #f5f5f5;
          color: var(--dark);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .activity-text, .log-text {
          color: var(--text);
          margin-bottom: 2px;
        }

        .activity-time, .log-time {
          color: var(--muted);
          font-size: 12px;
        }

        .online-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #333;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .online-info {
          flex: 1;
        }

        .online-name {
          font-weight: 600;
          color: var(--text);
          margin-bottom: 2px;
        }

        .online-username {
          font-size: 13px;
          color: var(--muted);
        }

        .status-indicator.online {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--success);
        }

        .empty-state {
          text-align: center;
          padding: 24px;
          color: var(--muted);
        }

        .sellers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px;
        }

        .seller-card {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px;
        }

        .seller-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .seller-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #333;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .seller-status {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 14px;
          font-size: 12px;
          border: 1px solid var(--border);
          color: var(--muted);
          background: #fff;
        }

        .seller-status.online {
          color: var(--success);
          border-color: #cfe9dc;
          background: #f3fbf6;
        }

        .seller-status.offline {
          color: var(--muted);
        }

        .seller-name {
          font-size: 16px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 4px;
        }

        .seller-username, .seller-email {
          font-size: 13px;
          color: var(--muted);
        }

        .seller-actions {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--border);
        }

        .filter-buttons {
          display: flex;
          gap: 8px;
          margin-left: auto;
        }

        .filter-btn {
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: #fff;
          color: var(--text);
          cursor: pointer;
          font-size: 13px;
          transition: all .2s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .filter-btn:hover {
          background: #f5f5f5;
        }

        .filter-btn.active {
          background: var(--dark);
          color: #fff;
          border-color: var(--dark);
        }

        .welcome-text {
          color: var(--muted);
          font-size: 14px;
          margin-top: 6px;
        }

        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
        }

        .action-card {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 20px;
          text-align: center;
        }

        .action-icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #f5f5f5;
          color: var(--dark);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 12px;
          font-size: 24px;
        }

        footer.simple {
          text-align: center;
          padding: 12px;
          font-size: 13px;
          color: #666;
          border-top: 1px solid #ddd;
          background: #f9f9f9;
          margin-top: 16px;
        }

        @media (max-width: 768px) {
          .main-grid {
            grid-template-columns: 1fr;
          }
          .nav-tabs {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="dashboard">
        <div className="topbar">
          <div className="topbar-inner">
            <div className="user-section">
              <div className="user-avatar"><i className="fas fa-user"></i></div>
              <div className="user-info">
                <h2>{user.fullname}</h2>
                <p>{user.role === 'owner' ? 'Владелец системы' : 'Продавец'} • {user.username}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className="time">{formatTime(currentTime)}</span>
              <button className="btn btn-dark" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt"></i>
                Выйти
              </button>
            </div>
          </div>
        </div>

        <div className="dashboard-content">
          <div className="container">
            {user.role === 'owner' ? (
              <>
                <div className="nav-tabs">
                  <button className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                    <i className="fas fa-chart-pie"></i> Обзор
                  </button>
                  <button className={`nav-tab ${activeTab === 'sellers' ? 'active' : ''}`} onClick={() => setActiveTab('sellers')}>
                    <i className="fas fa-users"></i> Продавцы
                  </button>
                  <button className={`nav-tab ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>
                    <i className="fas fa-file-alt"></i> Журнал
                  </button>
                  <button className={`nav-tab`} onClick={() => navigate('/adminpanel')}>
                    <i className="fas fa-crown"></i> Админ-панель
                  </button>
                </div>

                <div className="tab-content">
                  {activeTab === 'overview' && <OverviewTab />}
                  {activeTab === 'sellers' && <SellersTab />}
                  {activeTab === 'logs' && <LogsTab />}
                </div>
              </>
            ) : (
              <div className="tab-content">
                <SellerDashboard />
              </div>
            )}
          </div>

          <footer className="simple">
            © qaraa.kz | Система безопасного доступа, 2025. <br />
            Последнее обновление: 02.10.2025 | srk.
          </footer>
        </div>
      </div>
    </>
  );
}