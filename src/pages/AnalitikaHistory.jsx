import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { supabase } from "../supabaseClient";

export default function AnalitikaHistory({ user }) {
  const navigate = useNavigate();
  const [kaspi, setKaspi] = useState(0);
  const [halyk, setHalyk] = useState(0);
  const [cash, setCash] = useState(0);
  const [mixed, setMixed] = useState(0);
  const [loading, setLoading] = useState(false);

  const BOT_TOKEN = "8458767187:AAHV6sl14LzVt1Bnk49LvoR6QYg7MAvbYhA";
  const ADMIN_ID = "996317285";

  useEffect(() => {
    if (user?.fullname) fetchTodaySales();
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
        const cashMatch = method.match(/Наличные:\s*([\d.]+)\s*₸/i);
        const kaspiMatch = method.match(/Kaspi QR:\s*([\d.]+)\s*₸/i);
        const halykMatch = method.match(/Halyk QR \| Карта:\s*([\d.]+)\s*₸/i);
        
        if (cashMatch) cashSum += parseFloat(cashMatch[1]);
        if (kaspiMatch) kaspiSum += parseFloat(kaspiMatch[1]);
        if (halykMatch) halykSum += parseFloat(halykMatch[1]);
        
        mixedSum += parseFloat(s.price) * (s.quantity || 1);
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

  const total = kaspi + halyk + cash;

  const printReport = () => {
    const now = new Date().toLocaleString("ru-RU");
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Отчёт за день</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              padding: 30px 20px;
              max-width: 400px;
              margin: 0 auto;
              background: #f5f7fa;
            }
            .receipt {
              background: white;
              padding: 30px;
              border-radius: 20px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.08);
            }
            .header {
              text-align: center;
              margin-bottom: 25px;
              padding-bottom: 20px;
              border-bottom: 2px dashed #e5e7eb;
            }
            .logo {
              font-size: 28px;
              font-weight: 700;
              color: #1a1a1a;
              margin-bottom: 5px;
              letter-spacing: -1px;
            }
            .title {
              font-size: 14px;
              color: #6b7280;
              font-weight: 500;
            }
            .seller-info {
              text-align: center;
              padding: 16px;
              background: #fafafa;
              border-radius: 12px;
              margin-bottom: 20px;
            }
            .seller-name {
              font-size: 18px;
              font-weight: 600;
              color: #1a1a1a;
              margin-bottom: 4px;
            }
            .date-time {
              font-size: 13px;
              color: #6b7280;
            }
            .payment-section {
              margin: 20px 0;
            }
            .payment-row {
              display: flex;
              justify-content: space-between;
              padding: 14px 0;
              border-bottom: 1px solid #f3f4f6;
            }
            .payment-label {
              color: #6b7280;
              font-size: 14px;
              font-weight: 500;
            }
            .payment-value {
              color: #1a1a1a;
              font-weight: 600;
              font-size: 14px;
            }
            .total-section {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 2px dashed #e5e7eb;
            }
            .total {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 20px;
              background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
              border-radius: 12px;
              color: white;
            }
            .total-label {
              font-size: 16px;
              font-weight: 600;
            }
            .total-amount {
              font-size: 28px;
              font-weight: 700;
            }
            .footer {
              margin-top: 25px;
              padding-top: 20px;
              border-top: 2px dashed #e5e7eb;
              text-align: center;
            }
            .website {
              font-size: 18px;
              font-weight: 700;
              color: #1a1a1a;
            }
            @media print {
              body { background: white; padding: 0; }
              .receipt { box-shadow: none; border-radius: 0; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="logo">qaraa</div>
              <div class="title">Отчёт за день</div>
            </div>
            
            <div class="seller-info">
              <div class="seller-name">${user.fullname}</div>
              <div class="date-time">${now}</div>
            </div>

            <div class="payment-section">
              <div class="payment-row">
                <span class="payment-label">Kaspi QR:</span>
                <span class="payment-value">${kaspi.toFixed(2)} ₸</span>
              </div>
              <div class="payment-row">
                <span class="payment-label">Halyk QR | Карта:</span>
                <span class="payment-value">${halyk.toFixed(2)} ₸</span>
              </div>
              <div class="payment-row">
                <span class="payment-label">Наличные:</span>
                <span class="payment-value">${cash.toFixed(2)} ₸</span>
              </div>
              ${mixed > 0 ? `
              <div class="payment-row">
                <span class="payment-label">Смешанная оплата:</span>
                <span class="payment-value">${mixed.toFixed(2)} ₸</span>
              </div>
              ` : ''}
            </div>

            <div class="total-section">
              <div class="total">
                <span class="total-label">Итого касса:</span>
                <span class="total-amount">${total.toFixed(2)} ₸</span>
              </div>
            </div>

            <div class="footer">
              <div class="website">qaraa.kz</div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const sendReport = async () => {
    const kaspiFact = prompt("Kaspi терминал (по факту):", "0");
    if (kaspiFact === null) return;
    const halykFact = prompt("Halyk терминал (по факту):", "0");
    if (halykFact === null) return;
    const cashFact = prompt("Наличные по факту:", "0");
    if (cashFact === null) return;

    const now = new Date().toLocaleString("ru-RU");

    const text = `
📊 Отчёт за сегодня (${user.fullname})
${now}

Kaspi QR CRM: ${kaspi.toFixed(2)} ₸
Kaspi терминал: ${kaspiFact} ₸
───────────────
Halyk QR | Карта CRM: ${halyk.toFixed(2)} ₸
Halyk терминал: ${halykFact} ₸
───────────────
Наличные CRM: ${cash.toFixed(2)} ₸
Наличные по факту: ${cashFact} ₸
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
      alert("✅ Отчёт отправлен администратору");
    } catch (err) {
      console.error("Ошибка отправки:", err);
      alert("Ошибка при отправке отчёта.");
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
                      width: '40px', 
                      height: '40px', 
                      background: 'linear-gradient(135deg, #f14635 0%, #d13427 100%)', 
                      borderRadius: '10px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '20px',
                      fontWeight: '700'
                    }}>
                      K
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
                      width: '40px', 
                      height: '40px', 
                      background: 'linear-gradient(135deg, #00a651 0%, #008542 100%)', 
                      borderRadius: '10px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '20px',
                      fontWeight: '700'
                    }}>
                      H
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
                      width: '40px', 
                      height: '40px', 
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
                      borderRadius: '10px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: 'white'
                    }}>
                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
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
                    background: '#f3e8ff', 
                    borderRadius: '16px',
                    border: '2px solid #e9d5ff'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', 
                        borderRadius: '10px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: 'white'
                      }}>
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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
              onClick={sendReport}
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
    </>
  );
}