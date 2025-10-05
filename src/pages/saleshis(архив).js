import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

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

    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('seller_id', user.fullname)
      .gte('created_at', startOfDayUTC.toISOString())
      .lte('created_at', endOfDayUTC.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      alert('Ошибка при загрузке продаж: ' + error.message);
    } else {
      setSales(data);
      let sumAmount = 0;
      let sumQuantity = 0;
      data.forEach(sale => {
        sumAmount += parseFloat(sale.price) * sale.quantity;
        sumQuantity += sale.quantity;
      });
      setTotalAmount(sumAmount);
      setTotalQuantity(sumQuantity);
    }
    setLoading(false);
  }

  const printReceipt = (sale) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Чек продажи</title>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', sans-serif;
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
              font-size: 36px;
              font-weight: 700;
              color: #1a1a1a;
              margin-bottom: 8px;
              letter-spacing: -1.5px;
            }
            .title {
              font-size: 14px;
              color: #6b7280;
              font-weight: 500;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 14px 0;
              border-bottom: 1px solid #f3f4f6;
            }
            .info-label { color: #6b7280; font-size: 14px; font-weight: 500; }
            .info-value { color: #1a1a1a; font-weight: 600; font-size: 14px; }
            .product-section {
              margin: 20px 0;
              padding: 20px;
              background: #fafafa;
              border-radius: 12px;
            }
            .product-name {
              font-size: 18px;
              font-weight: 600;
              color: #1a1a1a;
              margin-bottom: 12px;
            }
            .product-details {
              display: flex;
              justify-content: space-between;
              font-size: 14px;
              color: #6b7280;
              margin-top: 8px;
            }
            .total-section { margin-top: 20px; padding-top: 20px; border-top: 2px dashed #e5e7eb; }
            .total {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 20px;
              background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
              border-radius: 12px;
              color: white;
            }
            .total-label { font-size: 16px; font-weight: 600; }
            .total-amount { font-size: 28px; font-weight: 700; }
            .footer {
              margin-top: 25px;
              padding-top: 20px;
              border-top: 2px dashed #e5e7eb;
              text-align: center;
            }
            .date { color: #6b7280; font-size: 13px; margin-bottom: 15px; }
            .website { font-size: 18px; font-weight: 700; color: #1a1a1a; margin-top: 10px; }
            .thank-you { color: #9ca3af; font-size: 12px; margin-top: 15px; }
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
              <div class="title">Чек продажи</div>
            </div>
            <div class="info-row">
              <span class="info-label">Продавец:</span>
              <span class="info-value">${sale.seller_id}</span>
            </div>
            <div class="product-section">
              <div class="product-name">${sale.product}</div>
              <div class="product-details">
                <span>Размер: ${sale.size}</span>
                <span>×${sale.quantity} шт.</span>
              </div>
              <div class="product-details" style="margin-top: 8px;">
                <span>Цена за единицу:</span>
                <span style="font-weight: 600;">${sale.price} ₸</span>
              </div>
            </div>
            <div class="total-section">
              <div class="total">
                <span class="total-label">Итого:</span>
                <span class="total-amount">${parseFloat(sale.price) * sale.quantity} ₸</span>
              </div>
            </div>
            <div class="footer">
              <div class="date">${new Date(sale.created_at).toLocaleString('ru-RU', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
              })}</div>
              <div class="website">qaraa.kz</div>
              <div class="thank-you">Спасибо за покупку!</div>
            </div>
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
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', sans-serif; }
          @keyframes spin { to { transform: rotate(360deg); } }
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
              width: '40px', 
              height: '40px', 
              border: '3px solid rgba(26,26,26,0.1)', 
              borderTopColor: '#1a1a1a', 
              borderRadius: '50%', 
              margin: '0 auto 16px', 
              animation: 'spin 1s linear infinite' 
            }}></div>
            <p style={{ color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>
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
          <div style={{ maxWidth: '800px', margin: '0 auto', animation: 'fadeIn 0.6s ease' }}>
            
            <div style={{ 
              background: '#ffffff', 
              borderRadius: '20px', 
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)', 
              overflow: 'hidden',
              backdropFilter: 'blur(10px)'
            }}>
              
              <div style={{ padding: '32px 36px', borderBottom: '1px solid #e5e7eb' }}>
                <h2 style={{ margin: '0 0 8px 0', color: '#1a1a1a', fontSize: '24px', fontWeight: '600' }}>
                  Детали продажи #{selectedSale.id}
                </h2>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                  {new Date(selectedSale.created_at).toLocaleString('ru-RU', { 
                    year: 'numeric', month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              </div>

              <div style={{ padding: '32px 36px' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ padding: '20px', background: '#fafafa', borderRadius: '12px', border: '2px solid #e5e7eb' }}>
                    <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
                      Продавец
                    </p>
                    <p style={{ margin: 0, fontSize: '16px', color: '#1a1a1a', fontWeight: '600' }}>
                      {selectedSale.seller_id}
                    </p>
                  </div>

                  <div style={{ padding: '20px', background: '#fafafa', borderRadius: '12px', border: '2px solid #e5e7eb' }}>
                    <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
                      Товар
                    </p>
                    <p style={{ margin: 0, fontSize: '16px', color: '#1a1a1a', fontWeight: '600' }}>
                      {selectedSale.product}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ padding: '20px', background: '#fafafa', borderRadius: '12px', textAlign: 'center', border: '2px solid #e5e7eb' }}>
                    <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
                      Размер
                    </p>
                    <p style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#1a1a1a' }}>
                      {selectedSale.size}
                    </p>
                  </div>

                  <div style={{ padding: '20px', background: '#fafafa', borderRadius: '12px', textAlign: 'center', border: '2px solid #e5e7eb' }}>
                    <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
                      Количество
                    </p>
                    <p style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#1a1a1a' }}>
                      {selectedSale.quantity}
                    </p>
                  </div>

                  <div style={{ padding: '20px', background: '#fafafa', borderRadius: '12px', textAlign: 'center', border: '2px solid #e5e7eb' }}>
                    <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
                      Цена
                    </p>
                    <p style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#1a1a1a' }}>
                      {selectedSale.price} ₸
                    </p>
                  </div>
                </div>

                <div style={{ 
                  padding: '28px', 
                  background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)', 
                  borderRadius: '12px', 
                  textAlign: 'center', 
                  marginBottom: '28px'
                }}>
                  <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
                    Итого к оплате
                  </p>
                  <p style={{ margin: 0, fontSize: '36px', fontWeight: '700', color: 'white' }}>
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
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      position: 'relative',
                      overflow: 'hidden'
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
                      fontSize: '16px',
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
        <div style={{ maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.6s ease' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '36px', fontWeight: '700', color: '#1a1a1a', marginBottom: '8px', letterSpacing: '-1.5px' }}>
                История продаж
              </h1>
              <p style={{ color: '#6b7280', fontSize: '14px', fontWeight: '400' }}>
                {new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                padding: '16px',
                background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s',
                position: 'relative',
                overflow: 'hidden'
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
              На главную
            </button>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '20px', 
            marginBottom: '24px' 
          }}>
            <div style={{ 
              padding: '28px', 
              background: '#ffffff', 
              borderRadius: '20px', 
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
              backdropFilter: 'blur(10px)'
            }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
                Общая сумма
              </p>
              <p style={{ margin: 0, fontSize: '36px', fontWeight: '700', color: '#1a1a1a' }}>
                {totalAmount.toLocaleString()} ₸
              </p>
            </div>

            <div style={{ 
              padding: '28px', 
              background: '#ffffff', 
              borderRadius: '20px', 
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
              backdropFilter: 'blur(10px)'
            }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
                Продано товаров
              </p>
              <p style={{ margin: 0, fontSize: '36px', fontWeight: '700', color: '#1a1a1a' }}>
                {totalQuantity}
              </p>
            </div>

            <div style={{ 
              padding: '28px', 
              background: '#ffffff', 
              borderRadius: '20px', 
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
              backdropFilter: 'blur(10px)'
            }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
                Количество продаж
              </p>
              <p style={{ margin: 0, fontSize: '36px', fontWeight: '700', color: '#1a1a1a' }}>
                {sales.length}
              </p>
            </div>
          </div>

          {sales.length === 0 ? (
            <div style={{ 
              background: '#ffffff', 
              borderRadius: '20px', 
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)', 
              padding: '64px 24px', 
              textAlign: 'center',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ 
                width: '64px', 
                height: '64px', 
                background: '#fafafa', 
                borderRadius: '50%', 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                marginBottom: '16px',
                fontSize: '32px',
                color: '#9ca3af'
              }}>
                ∅
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '24px', color: '#1a1a1a', fontWeight: '600' }}>
                Нет данных
              </h3>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                Сегодня продажи еще не зарегистрированы
              </p>
            </div>
          ) : (
            <div style={{ 
              background: '#ffffff', 
              borderRadius: '20px', 
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)', 
              overflow: 'hidden',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#fafafa', borderBottom: '1px solid #e5e7eb' }}>
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
                          borderBottom: index !== sales.length - 1 ? '1px solid #e5e7eb' : 'none', 
                          transition: 'background 0.15s' 
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#fafafa'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '20px', color: '#6b7280', fontSize: '14px' }}>
                          #{sale.id}
                        </td>
                        <td style={{ padding: '20px', color: '#1a1a1a', fontSize: '15px', fontWeight: '600' }}>
                          {sale.product}
                        </td>
                        <td style={{ padding: '20px' }}>
                          <span style={{ 
                            padding: '6px 12px', 
                            background: '#fafafa', 
                            color: '#374151', 
                            borderRadius: '8px', 
                            fontSize: '13px',
                            fontWeight: '600',
                            border: '2px solid #e5e7eb'
                          }}>
                            {sale.size}
                          </span>
                        </td>
                        <td style={{ padding: '20px', color: '#1a1a1a', fontSize: '15px', fontWeight: '600' }}>
                          {sale.quantity}
                        </td>
                        <td style={{ padding: '20px', color: '#1a1a1a', fontWeight: '600', fontSize: '15px' }}>
                          {(parseFloat(sale.price) * sale.quantity).toLocaleString()} ₸
                        </td>
                        <td style={{ padding: '20px', color: '#6b7280', fontSize: '14px' }}>
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
                              borderRadius: '8px',
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
                            