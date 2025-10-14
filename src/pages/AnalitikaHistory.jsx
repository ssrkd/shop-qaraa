import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { supabase } from "../supabaseClient";
import kaspiLogo from '../images/kaspi.svg';
import halykLogo from '../images/halyk.svg';
import cashLogo from '../images/cash.png';
import Numpad from '../components/Numpad';

// 🖨️ URL Print Server через Cloudflare Tunnel
const PRINT_SERVER_URL = 'https://qaraa.vercel.app/api/print';

export default function AnalitikaHistory({ user }) {
  const navigate = useNavigate();
  const [kaspi, setKaspi] = useState(0);
  const [halyk, setHalyk] = useState(0);
  const [cash, setCash] = useState(0);
  const [mixed, setMixed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [kaspiFact, setKaspiFact] = useState('');
  const [halykFact, setHalykFact] = useState('');
  const [cashFact, setCashFact] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPrintLoading, setShowPrintLoading] = useState(false);
  const [showPrintSuccess, setShowPrintSuccess] = useState(false);
  const [showPrintError, setShowPrintError] = useState(false);
  const [printErrorMessage, setPrintErrorMessage] = useState('');
  const [showNumpad, setShowNumpad] = useState(false);
  const [numpadField, setNumpadField] = useState(''); // 'kaspi', 'halyk', 'cash'

  const BOT_TOKEN = "8458767187:AAHV6sl14LzVt1Bnk49LvoR6QYg7MAvbYhA";
  const ADMIN_ID = "996317285";

  useEffect(() => {
    if (user?.fullname) fetchTodaySales();
  }, [user]);

  // Обновляем текущую страницу при заходе
  useEffect(() => {
    if (!user) return;

    const updateCurrentPage = async () => {
      await supabase
        .from('user_login_status')
        .update({
          current_page: 'Аналитика продаж',
          page_entered_at: new Date().toISOString(),
          last_active: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('is_logged_in', true);
    };

    updateCurrentPage();
  }, [user]);

  const fetchTodaySales = async () => {
    setLoading(true);
    const today = new Date();
    const tzOffset = today.getTimezoneOffset();

    const startOfDayUTC = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    startOfDayUTC.setMinutes(startOfDayUTC.getMinutes() - tzOffset);
    const endOfDayUTC = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    endOfDayUTC.setMinutes(endOfDayUTC.getMinutes() - tzOffset);

    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .eq("seller_id", user.fullname)
      .gte("created_at", startOfDayUTC.toISOString())
      .lte("created_at", endOfDayUTC.toISOString());

    if (error) {
      console.error("Ошибка при загрузке:", error);
      setLoading(false);
      return;
    }

    let kaspiSum = 0;
    let halykSum = 0;
    let cashSum = 0;
    let mixedSum = 0;

    data.forEach((s) => {
      const method = s.payment_method?.trim() || "";
      const methodLower = method.toLowerCase();
      
      if (methodLower.includes("смешанная")) {
        // При смешанной оплате разбиваем на части
        const cashMatch = method.match(/Наличные:\s*([\d.]+)\s*₸/i);
        const kaspiMatch = method.match(/Kaspi QR:\s*([\d.]+)\s*₸/i);
        const halykMatch = method.match(/Halyk QR \| Карта:\s*([\d.]+)\s*₸/i);
        
        if (cashMatch) cashSum += parseFloat(cashMatch[1]);
        if (kaspiMatch) kaspiSum += parseFloat(kaspiMatch[1]);
        if (halykMatch) halykSum += parseFloat(halykMatch[1]);
        
        // УБРАЛИ ДВОЙНОЙ ПОДСЧЕТ! Теперь смешанная НЕ добавляется отдельно
        // mixedSum += parseFloat(s.price) * (s.quantity || 1);
      } else if (methodLower.includes("kaspi")) {
        kaspiSum += parseFloat(s.price) * (s.quantity || 1);
      } else if (methodLower.includes("halyk") || methodLower.includes("карта")) {
        halykSum += parseFloat(s.price) * (s.quantity || 1);
      } else if (methodLower.includes("нал")) {
        cashSum += parseFloat(s.price) * (s.quantity || 1);
      }
    });

    setKaspi(kaspiSum);
    setHalyk(halykSum);
    setCash(cashSum);
    setMixed(mixedSum);
    setLoading(false);
  };

  const total = kaspi + halyk + cash; // mixed убран - теперь суммы разбиты по категориям

  // 🖨️ Функция печати отчета через Print Server API
  const printReport = async () => {
    setShowPrintLoading(true);
    
    try {
      const response = await fetch(PRINT_SERVER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'report',
          date: new Date().toLocaleDateString('ru-RU'),
          seller: user?.fullname || 'Продавец',
          cashTotal: cash,
          kaspiTotal: kaspi,
          halykTotal: halyk,
          mixedTotal: 0, // Смешанная теперь разбита по категориям
          grandTotal: kaspi + halyk + cash,
          salesCount: 0
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Отчет отправлен на печать!');
        setShowPrintLoading(false);
        setShowPrintSuccess(true);
        setTimeout(() => setShowPrintSuccess(false), 2000);
      } else {
        console.error('❌ Ошибка печати:', result.message);
        setShowPrintLoading(false);
        setPrintErrorMessage('Ошибка печати отчета');
        setShowPrintError(true);
        setTimeout(() => setShowPrintError(false), 3000);
      }
    } catch (error) {
      console.error('❌ Ошибка отправки на печать:', error);
      setShowPrintLoading(false);
      setPrintErrorMessage('Не удалось отправить отчет на печать');
      setShowPrintError(true);
      setTimeout(() => setShowPrintError(false), 3000);
    }
  };

  const openSendModal = () => {
    setKaspiFact('');
    setHalykFact('');
    setCashFact('');
    setShowModal(true);
  };

  const sendReport = async () => {
    const now = new Date().toLocaleString("ru-RU");

    const text = `
📊 Отчёт за сегодня (${user.fullname})
${now}

Kaspi QR CRM: ${kaspi.toFixed(2)} ₸
Kaspi терминал: ${kaspiFact || '0'} ₸
───────────────
Halyk QR | Карта CRM: ${halyk.toFixed(2)} ₸
Halyk терминал: ${halykFact || '0'} ₸
───────────────
Наличные CRM: ${cash.toFixed(2)} ₸
Наличные по факту: ${cashFact || '0'} ₸
───────────────${mixed > 0 ? `
Смешанная оплата: ${mixed.toFixed(2)} ₸
───────────────` : ''}
Итого CRM: ${total.toFixed(2)} ₸
`;

    try {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: ADMIN_ID,
          text: text,
        }),
      });
      setShowModal(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error("Ошибка отправки:", err);
      alert("❌ Ошибка при отправке отчёта.");
    }
  };

  if (loading) {
    return (
      <>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        `}</style>
        <div style={{ 
          minHeight: '100vh', 
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '50px', 
              height: '50px', 
              border: '4px solid rgba(0,0,0,0.1)', 
              borderTopColor: '#1a1a1a', 
              borderRadius: '50%', 
              margin: '0 auto 20px', 
              animation: 'spin 1s linear infinite' 
            }}></div>
            <p style={{ color: '#6b7280', fontSize: '16px', fontWeight: '500', animation: 'pulse 1.5s ease-in-out infinite' }}>
              Загрузка данных...
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', sans-serif; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(40px) scale(0.96);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translate(-50%, -20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>

      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', 
        padding: '24px' 
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.6s ease' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '36px', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px', letterSpacing: '-1px' }}>
                Аналитика продаж
              </h1>
              <p style={{ color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>
                Отчёт за {new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                padding: '14px 28px',
                background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
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
                e.target.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.2)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              На главную
            </button>
          </div>

          <div style={{ 
            background: 'white', 
            borderRadius: '20px', 
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
            overflow: 'hidden',
            marginBottom: '24px'
          }}>
            <div style={{ 
              padding: '28px', 
              background: '#fafafa', 
              borderBottom: '2px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
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
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a' }}>
                  {user?.fullname}
                </div>
                <div style={{ color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>
                  Продавец • @{user?.username}
                </div>
              </div>
            </div>

            <div style={{ padding: '32px' }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
                gap: '20px',
                marginBottom: '28px'
              }}>
                <div style={{ 
                  padding: '24px', 
                  background: '#fef2f2', 
                  borderRadius: '16px',
                  border: '2px solid #fecaca'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      background: 'white', 
                      borderRadius: '10px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      padding: '8px'
                    }}>
                      <img src={kaspiLogo} alt="Kaspi" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <p style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
                      Kaspi QR
                    </p>
                  </div>
                  <p style={{ fontSize: '32px', fontWeight: '700', color: '#1a1a1a', letterSpacing: '-1px' }}>
                    {kaspi.toLocaleString()} ₸
                  </p>
                </div>

                <div style={{ 
                  padding: '24px', 
                  background: '#f0fdf4', 
                  borderRadius: '16px',
                  border: '2px solid #bbf7d0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      background: 'white', 
                      borderRadius: '10px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      padding: '8px'
                    }}>
                      <img src={halykLogo} alt="Halyk" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <p style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
                      Halyk QR | Карта
                    </p>
                  </div>
                  <p style={{ fontSize: '32px', fontWeight: '700', color: '#1a1a1a', letterSpacing: '-1px' }}>
                    {halyk.toLocaleString()} ₸
                  </p>
                </div>

                <div style={{ 
                  padding: '24px', 
                  background: '#fef3c7', 
                  borderRadius: '16px',
                  border: '2px solid #fde68a'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      background: 'white', 
                      borderRadius: '10px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      padding: '6px'
                    }}>
                      <img src={cashLogo} alt="Наличные" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <p style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
                      Наличные
                    </p>
                  </div>
                  <p style={{ fontSize: '32px', fontWeight: '700', color: '#1a1a1a', letterSpacing: '-1px' }}>
                    {cash.toLocaleString()} ₸
                  </p>
                </div>

                {mixed > 0 && (
                  <div style={{ 
                    padding: '24px', 
                    background: '#fffbeb', 
                    borderRadius: '16px',
                    border: '2px solid #fcd34d'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
                        borderRadius: '10px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center'
                      }}>
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <p style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
                        Смешанная оплата
                      </p>
                    </div>
                    <p style={{ fontSize: '32px', fontWeight: '700', color: '#1a1a1a', letterSpacing: '-1px' }}>
                      {mixed.toLocaleString()} ₸
                    </p>
                  </div>
                )}
              </div>

              <div style={{ 
                padding: '32px', 
                background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)', 
                borderRadius: '16px', 
                textAlign: 'center',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
              }}>
                <p style={{ marginBottom: '12px', fontSize: '14px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '1px' }}>
                  Итого касса
                </p>
                <p style={{ fontSize: '48px', fontWeight: '700', color: 'white', letterSpacing: '-1px' }}>
                  {total.toLocaleString()} ₸
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            <button
              onClick={printReport}
              style={{
                padding: '24px',
                background: 'white',
                borderRadius: '20px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
                border: '2px solid #e5e7eb',
                cursor: 'pointer',
                transition: 'all 0.3s',
                textAlign: 'left'
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
                width: '56px',
                height: '56px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="white">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a', marginBottom: '8px' }}>
                Распечатать отчёт
              </h3>
              <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.5' }}>
                Печать детального отчёта за день с разбивкой по способам оплаты
              </p>
            </button>

            <button
              onClick={openSendModal}
              style={{
                padding: '24px',
                background: 'white',
                borderRadius: '20px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
                border: '2px solid #e5e7eb',
                cursor: 'pointer',
                transition: 'all 0.3s',
                textAlign: 'left'
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
                width: '56px',
                height: '56px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="white">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a', marginBottom: '8px' }}>
                Отправить отчёт
              </h3>
              <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.5' }}>
                Отправка отчёта администратору в Telegram с данными терминалов
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Модальное окно в стиле iPhone */}
      {showModal && (
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
            zIndex: 1000,
            padding: '20px',
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={() => setShowModal(false)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '24px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 30px 80px rgba(0, 0, 0, 0.3)',
              animation: 'slideUp 0.3s ease',
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
                Отправить отчёт
              </h2>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                marginTop: '8px'
              }}>
                Введите фактические данные терминалов
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
                  Kaspi терминал (по факту)
                </label>
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <div style={{
                    position: 'absolute',
                    left: '16px',
                    width: '28px',
                    height: '28px',
                    background: 'white',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px'
                  }}>
                    <img src={kaspiLogo} alt="Kaspi" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={kaspiFact ? `${kaspiFact} ₸` : ''}
                    onClick={() => {
                      setNumpadField('kaspi');
                      setShowNumpad(true);
                    }}
                    placeholder="Нажмите для ввода суммы"
                    style={{
                      width: '100%',
                      padding: '16px 16px 16px 56px',
                      fontSize: '16px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '14px',
                      outline: 'none',
                      transition: 'all 0.2s',
                      fontWeight: '500',
                      cursor: 'pointer',
                      background: 'white'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#ef4444';
                      e.target.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
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
                  Halyk терминал (по факту)
                </label>
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <div style={{
                    position: 'absolute',
                    left: '16px',
                    width: '28px',
                    height: '28px',
                    background: 'white',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px'
                  }}>
                    <img src={halykLogo} alt="Halyk" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={halykFact ? `${halykFact} ₸` : ''}
                    onClick={() => {
                      setNumpadField('halyk');
                      setShowNumpad(true);
                    }}
                    placeholder="Нажмите для ввода суммы"
                    style={{
                      width: '100%',
                      padding: '16px 16px 16px 56px',
                      fontSize: '16px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '14px',
                      outline: 'none',
                      transition: 'all 0.2s',
                      fontWeight: '500',
                      cursor: 'pointer',
                      background: 'white'
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
                  Наличные в кассе (по факту)
                </label>
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <div style={{
                    position: 'absolute',
                    left: '16px',
                    width: '28px',
                    height: '28px',
                    background: 'white',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '3px'
                  }}>
                    <img src={cashLogo} alt="Наличные" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={cashFact ? `${cashFact} ₸` : ''}
                    onClick={() => {
                      setNumpadField('cash');
                      setShowNumpad(true);
                    }}
                    placeholder="Нажмите для ввода суммы"
                    style={{
                      width: '100%',
                      padding: '16px 16px 16px 56px',
                      fontSize: '16px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '14px',
                      outline: 'none',
                      transition: 'all 0.2s',
                      fontWeight: '500',
                      cursor: 'pointer',
                      background: 'white'
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
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowModal(false)}
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
                  onClick={sendReport}
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
                  Отправить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Уведомление об успешной отправке */}
      {showSuccess && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            padding: '20px 32px',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(16, 185, 129, 0.4)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'slideDown 0.3s ease',
            fontWeight: '600',
            fontSize: '16px'
          }}
        >
          <div style={{
            width: '32px',
            height: '32px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          Отчёт успешно отправлен администратору!
    </div>
      )}

      {/* iPhone-style Loading Modal */}
      {showPrintLoading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '30px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            minWidth: '200px',
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #e5e7eb',
              borderTop: '3px solid #007AFF',
              borderRadius: '50%',
              margin: '0 auto 15px',
              animation: 'spin 1s linear infinite',
            }}></div>
            <div style={{ fontSize: '16px', color: '#1f2937', fontWeight: '500' }}>
              Печать...
            </div>
          </div>
        </div>
      )}

      {/* iPhone-style Success Modal */}
      {showPrintSuccess && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '30px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            minWidth: '200px',
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: '#34C759',
              margin: '0 auto 15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div style={{ fontSize: '16px', color: '#1f2937', fontWeight: '500' }}>
              Успешно!
            </div>
          </div>
        </div>
      )}

      {/* iPhone-style Error Modal */}
      {showPrintError && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '30px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            minWidth: '200px',
            maxWidth: '300px',
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: '#FF3B30',
              margin: '0 auto 15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>
            <div style={{ fontSize: '16px', color: '#1f2937', fontWeight: '500', marginBottom: '8px' }}>
              Ошибка
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              {printErrorMessage}
            </div>
          </div>
        </div>
      )}

      {/* 🔢 Виртуальная клавиатура для сенсорных экранов */}
      {showNumpad && (
        <Numpad
          value={
            numpadField === 'kaspi' ? kaspiFact :
            numpadField === 'halyk' ? halykFact :
            numpadField === 'cash' ? cashFact : ''
          }
          onChange={(newValue) => {
            if (numpadField === 'kaspi') {
              setKaspiFact(newValue);
            } else if (numpadField === 'halyk') {
              setHalykFact(newValue);
            } else if (numpadField === 'cash') {
              setCashFact(newValue);
            }
          }}
          onClose={() => setShowNumpad(false)}
        />
      )}
    </>
  );
}