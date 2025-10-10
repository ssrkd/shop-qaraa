import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import kaspiLogo from '../images/kaspi.svg';
import halykLogo from '../images/halyk.svg';
import cashLogo from '../images/cash.png';

export default function SalesHistory({ user }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSales();
  }, []);

  async function fetchSales() {
    setLoading(true);
    const today = new Date();
    const tzOffset = today.getTimezoneOffset();

    const startOfDayUTC = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    startOfDayUTC.setMinutes(startOfDayUTC.getMinutes() - tzOffset);
    const endOfDayUTC = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    endOfDayUTC.setMinutes(endOfDayUTC.getMinutes() - tzOffset);

    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .eq('seller_id', user.fullname)
      .gte('created_at', startOfDayUTC.toISOString())
      .lte('created_at', endOfDayUTC.toISOString())
      .order('created_at', { ascending: false });

    if (salesError) {
      console.error(salesError);
      alert('Ошибка при загрузке продаж: ' + salesError.message);
    } else {
      setSales(salesData);

      // --- Считаем общие суммы ---
      let sumAmount = 0;
      let sumQuantity = 0;
      salesData.forEach(sale => {
        sumAmount += parseFloat(sale.price) * sale.quantity;
        sumQuantity += sale.quantity;
      });

      setTotalAmount(sumAmount);
      setTotalQuantity(sumQuantity);
    }

    setLoading(false);
  }

  function PaymentIcon({ method }) {
    if (!method) return <span>—</span>;
    const normalized = method.trim().toLowerCase();
    if (normalized.includes('смешанная')) {
      return (
        <div style={{
          width: 24,
          height: 24,
          borderRadius: '4px',
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
      );
    }
    if (normalized.includes('kaspi')) {
      return <img src={kaspiLogo} alt={method} style={{ width: 24, height: 24 }} />;
    }
    if (normalized.includes('halyk')) {
      return <img src={halykLogo} alt={method} style={{ width: 24, height: 24 }} />;
    }
    if (normalized.includes('нал')) {
      return <img src={cashLogo} alt={method} style={{ width: 34, height: 34 }} />;
    }
    return <span>{method}</span>;
  }

  const printReceipt = (sale) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Чек</title>
          <style>
            @page {
              size: 57mm auto;
              margin: 0;
            }
            body {
              width: 57mm;
              margin: 0;
              padding: 2mm;
              font-family: 'Courier New', monospace;
              font-size: 11px;
              line-height: 1.3;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-top: 1px dashed #000; margin: 4px 0; }
            .row { 
              display: flex;
              gap: 5px;
            }
            .row span:first-child {
              flex-shrink: 0;
            }
            .row span:last-child {
              text-align: right;
              flex-grow: 1;
            }
            .footer { 
              margin-top: 8px; 
              text-align: center; 
              font-size: 10px; 
            }
            @media print {
              body {
                padding: 2mm;
              }
              html, body {
                height: auto;
              }
            }
          </style>
        </head>
        <body>
          <div class="center bold">qaraa</div>
          <div class="center">Чек продажи</div>
          <div class="line"></div>
          <div>Продавец: ${sale.seller_id}</div>
          <div>Товар: ${sale.product}</div>
          <div>Размер: ${sale.size}</div>
          <div>Количество: ${sale.quantity}</div>
          <div>Цена: ${sale.price} ₸</div>
          <div class="row">
            <span>Оплата:</span>
            <span>${sale.payment_method}</span>
          </div>
          <div class="line"></div>
          <div class="row bold">
            <span>ИТОГО:</span>
            <span>${(parseFloat(sale.price) * sale.quantity).toFixed(2)} ₸</span>
          </div>
          <div class="line"></div>
          <div class="center">${new Date(sale.created_at).toLocaleString('ru-RU')}</div>
          <div class="footer">
            qaraa.kz<br>
            Спасибо за покупку!
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
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

  if (selectedSale) {
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
          <div style={{ maxWidth: '900px', margin: '0 auto', animation: 'fadeIn 0.6s ease' }}>
            
            <div style={{ 
              background: 'white', 
              borderRadius: '20px', 
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)', 
              overflow: 'hidden' 
            }}>
              
              <div style={{ 
                padding: '32px', 
                background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                color: 'white'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h2 style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-0.5px' }}>
                    Детали продажи #{selectedSale.id}
                  </h2>
                </div>
                <p style={{ opacity: 0.8, fontSize: '14px' }}>
                  {new Date(selectedSale.created_at).toLocaleString('ru-RU', { 
                    year: 'numeric', month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>

              <div style={{ padding: '32px' }}>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                  gap: '16px', 
                  marginBottom: '24px' 
                }}>
                  <div style={{ 
                    padding: '20px', 
                    background: '#fafafa', 
                    borderRadius: '12px',
                    border: '2px solid #e5e7eb',
                    transition: 'all 0.3s'
                  }}>
                    <p style={{ marginBottom: '10px', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
                      Продавец
                    </p>
                    <p style={{ fontSize: '18px', color: '#1a1a1a', fontWeight: '600' }}>
                      {selectedSale.seller_id}
                    </p>
                  </div>

                  <div style={{ 
                    padding: '20px', 
                    background: '#fafafa', 
                    borderRadius: '12px',
                    border: '2px solid #e5e7eb'
                  }}>
                    <p style={{ marginBottom: '10px', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
                      Товар
                    </p>
                    <p style={{ fontSize: '18px', color: '#1a1a1a', fontWeight: '600' }}>
                      {selectedSale.product}
                    </p>
                  </div>
                </div>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: '16px', 
                  marginBottom: '28px' 
                }}>
                  <div style={{ 
                    padding: '24px', 
                    background: '#fafafa', 
                    borderRadius: '12px', 
                    textAlign: 'center',
                    border: '2px solid #e5e7eb'
                  }}>
                    <p style={{ marginBottom: '12px', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600' }}>
                      Размер
                    </p>
                    <p style={{ fontSize: '32px', fontWeight: '700', color: '#1a1a1a' }}>
                      {selectedSale.size}
                    </p>
                  </div>

                  <div style={{ 
                    padding: '24px', 
                    background: '#fafafa', 
                    borderRadius: '12px', 
                    textAlign: 'center',
                    border: '2px solid #e5e7eb'
                  }}>
                    <p style={{ marginBottom: '12px', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600' }}>
                      Количество
                    </p>
                    <p style={{ fontSize: '32px', fontWeight: '700', color: '#1a1a1a' }}>
                      {selectedSale.quantity}
                    </p>
                  </div>

                  <div style={{ 
                    padding: '24px', 
                    background: '#fafafa', 
                    borderRadius: '12px', 
                    textAlign: 'center',
                    border: '2px solid #e5e7eb'
                  }}>
                    <p style={{ marginBottom: '12px', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600' }}>
                      Цена
                    </p>
                    <p style={{ fontSize: '32px', fontWeight: '700', color: '#1a1a1a' }}>
                      {selectedSale.price} ₸
                    </p>
                  </div>

                  <div style={{ 
  padding: '24px', 
  background: '#fafafa', 
  borderRadius: '12px', 
  textAlign: 'center',
  border: '2px solid #e5e7eb'
}}>
  <p style={{ marginBottom: '12px', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600' }}>
    Способ оплаты
  </p>
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
  <PaymentIcon method={selectedSale.payment_method} />
<span style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a' }}>
  {selectedSale.payment_method}
</span>
  </div>
</div>
                </div>

                <div style={{ 
                  padding: '32px', 
                  background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)', 
                  borderRadius: '16px', 
                  textAlign: 'center', 
                  marginBottom: '28px',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
                }}>
                  <p style={{ marginBottom: '12px', fontSize: '14px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '1px' }}>
                    Итого к оплате
                  </p>
                  <p style={{ fontSize: '48px', fontWeight: '700', color: 'white', letterSpacing: '-1px' }}>
                    {(parseFloat(selectedSale.price) * selectedSale.quantity).toLocaleString()} ₸
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => printReceipt(selectedSale)}
                    style={{
                      flex: 1,
                      minWidth: '200px',
                      padding: '16px',
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
                      justifyContent: 'center',
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Распечатать чек
                  </button>
                  <button
                    onClick={() => setSelectedSale(null)}
                    style={{
                      padding: '16px 32px',
                      background: 'white',
                      color: '#1a1a1a',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = '#fafafa';
                      e.target.style.borderColor = '#1a1a1a';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = 'white';
                      e.target.style.borderColor = '#e5e7eb';
                    }}
                  >
                    Назад
                  </button>
                </div>
              </div>
            </div>
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
        <div style={{ maxWidth: '1400px', margin: '0 auto', animation: 'fadeIn 0.6s ease' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '36px', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px', letterSpacing: '-1px' }}>
                История продаж
              </h1>
              <p style={{ color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>
                {new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}
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
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
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
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
                  Общая сумма
                </p>
              </div>
              <p style={{ fontSize: '40px', fontWeight: '700', color: '#1a1a1a', letterSpacing: '-1px' }}>
                {totalAmount.toLocaleString()} ₸
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
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="white">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <p style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
                  Продано товаров
                </p>
              </div>
              <p style={{ fontSize: '40px', fontWeight: '700', color: '#1a1a1a', letterSpacing: '-1px' }}>
                {totalQuantity}
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <p style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
                  Количество продаж
                </p>
              </div>
              <p style={{ fontSize: '40px', fontWeight: '700', color: '#1a1a1a', letterSpacing: '-1px' }}>
                {sales.length}
              </p>
            </div>
          </div>

          {sales.length === 0 ? (
            <div style={{ 
              background: 'white', 
              borderRadius: '20px', 
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)', 
              padding: '80px 24px', 
              textAlign: 'center' 
            }}>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 style={{ fontSize: '22px', color: '#1a1a1a', fontWeight: '600', marginBottom: '12px' }}>
                Нет данных
              </h3>
              <p style={{ color: '#6b7280', fontSize: '15px', fontWeight: '500' }}>
                Сегодня продажи еще не зарегистрированы
              </p>
            </div>
          ) : (
            <div style={{ 
              background: 'white', 
              borderRadius: '20px', 
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)', 
              overflow: 'hidden' 
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#fafafa', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        ID
                      </th>
                      <th style={{ padding: '20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Товар
                      </th>
                      <th style={{ padding: '20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Размер
                      </th>
                      <th style={{ padding: '20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Кол-во
                      </th>
                      <th style={{ padding: '20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Сумма
                      </th>
                      <th style={{ padding: '20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
  Оплата
</th>
                      <th style={{ padding: '20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Время
                      </th>
                      <th style={{ padding: '20px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((sale, index) => (
                      <tr 
                        key={sale.id}
                        style={{ 
                          borderBottom: index !== sales.length - 1 ? '1px solid #f3f4f6' : 'none', 
                          transition: 'background 0.2s' 
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#fafafa'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '20px', color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>
                          #{sale.id}
                        </td>
                        <td style={{ padding: '20px', color: '#1a1a1a', fontSize: '15px', fontWeight: '600' }}>
                          {sale.product}
                        </td>
                        <td style={{ padding: '20px' }}>
                          <span style={{ 
                            padding: '6px 14px', 
                            background: '#fafafa', 
                            color: '#374151', 
                            borderRadius: '8px', 
                            fontSize: '14px',
                            fontWeight: '600',
                            border: '2px solid #e5e7eb'
                          }}>
                            {sale.size}
                          </span>
                        </td>
                        <td style={{ padding: '20px', color: '#1a1a1a', fontSize: '15px', fontWeight: '600' }}>
                          {sale.quantity}
                        </td>
                        <td style={{ padding: '20px', color: '#1a1a1a', fontWeight: '700', fontSize: '16px' }}>
                          {(parseFloat(sale.price) * sale.quantity).toLocaleString()} ₸
                        </td>
                        <td style={{ padding: '20px', color: '#6b7280', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <PaymentIcon method={sale.payment_method} />
                        <span>{sale.payment_method}</span>
</td>
                        <td style={{ padding: '20px', color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>
                          {new Date(sale.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '20px', textAlign: 'right' }}>
                          <button
                            onClick={() => setSelectedSale(sale)}
                            style={{
                              padding: '10px 20px',
                              background: 'white',
                              color: '#1a1a1a',
                              border: '2px solid #e5e7eb',
                              borderRadius: '10px',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => {
                              e.target.style.background = '#fafafa';
                              e.target.style.borderColor = '#1a1a1a';
                            }}
                            onMouseOut={(e) => {
                              e.target.style.background = 'white';
                              e.target.style.borderColor = '#e5e7eb';
                            }}
                          >
                            Детали
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}