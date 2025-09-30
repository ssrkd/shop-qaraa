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

  // Получаем сегодняшние продажи текущего продавца
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

  // Печать чека
  const printReceipt = (sale) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Чек продажи</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 20px; max-width: 400px; margin: 0 auto; }
            h2 { text-align: center; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
            p { margin: 8px 0; }
            .total { font-weight: bold; font-size: 1.2em; margin-top: 15px; border-top: 1px solid #ddd; padding-top: 10px; }
          </style>
        </head>
        <body>
          <h2>Чек продажи</h2>
          <p><strong>Продавец:</strong> ${sale.seller_id}</p>
          <p><strong>Товар:</strong> ${sale.product}</p>
          <p><strong>Размер:</strong> ${sale.size}</p>
          <p><strong>Количество:</strong> ${sale.quantity}</p>
          <p><strong>Цена за единицу:</strong> ${sale.price} ₸</p>
          <p class="total">Итого: ${parseFloat(sale.price) * sale.quantity} ₸</p>
          <p><strong>Дата и время:</strong> ${new Date(sale.created_at).toLocaleString('ru-RU')}</p>
        </body>
      </html>
    `);
    printWindow.print();
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #e0e0e0', borderTopColor: '#666', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ color: '#666', margin: 0 }}>Загрузка данных...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // Детали конкретной продажи
  if (selectedSale) {
    return (
      <div style={{ minHeight: '100vh', background: '#fafafa', padding: '24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
            
            <div style={{ padding: '24px', borderBottom: '1px solid #e0e0e0' }}>
              <h2 style={{ margin: '0 0 8px 0', color: '#333', fontSize: '24px', fontWeight: '500' }}>
                Детали продажи #{selectedSale.id}
              </h2>
              <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>
                {new Date(selectedSale.created_at).toLocaleString('ru-RU', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div style={{ padding: '16px', background: '#f9f9f9', borderRadius: '6px' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>
                    Продавец
                  </p>
                  <p style={{ margin: 0, fontSize: '16px', color: '#333' }}>
                    {selectedSale.seller_id}
                  </p>
                </div>

                <div style={{ padding: '16px', background: '#f9f9f9', borderRadius: '6px' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>
                    Товар
                  </p>
                  <p style={{ margin: 0, fontSize: '16px', color: '#333' }}>
                    {selectedSale.product}
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div style={{ padding: '16px', background: '#f9f9f9', borderRadius: '6px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>
                    Размер
                  </p>
                  <p style={{ margin: 0, fontSize: '24px', fontWeight: '500', color: '#333' }}>
                    {selectedSale.size}
                  </p>
                </div>

                <div style={{ padding: '16px', background: '#f9f9f9', borderRadius: '6px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>
                    Количество
                  </p>
                  <p style={{ margin: 0, fontSize: '24px', fontWeight: '500', color: '#333' }}>
                    {selectedSale.quantity}
                  </p>
                </div>

                <div style={{ padding: '16px', background: '#f9f9f9', borderRadius: '6px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>
                    Цена
                  </p>
                  <p style={{ margin: 0, fontSize: '24px', fontWeight: '500', color: '#333' }}>
                    {selectedSale.price} ₸
                  </p>
                </div>
              </div>

              <div style={{ padding: '24px', background: '#f5f5f5', borderRadius: '6px', textAlign: 'center', marginBottom: '24px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>
                  Итого к оплате
                </p>
                <p style={{ margin: 0, fontSize: '32px', fontWeight: '500', color: '#333' }}>
                  {(parseFloat(selectedSale.price) * selectedSale.quantity).toLocaleString()} ₸
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => printReceipt(selectedSale)}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: '#333',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#555'}
                  onMouseOut={(e) => e.target.style.background = '#333'}
                >
                  Распечатать чек
                </button>
                <button
                  onClick={() => setSelectedSale(null)}
                  style={{
                    padding: '14px 24px',
                    background: 'white',
                    color: '#333',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = '#f5f5f5';
                    e.target.style.borderColor = '#bbb';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = 'white';
                    e.target.style.borderColor = '#ddd';
                  }}
                >
                  Назад
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Список продаж за сегодня
  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', padding: '24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Кнопка "На главную" */}
        {/* Кнопка "На главную" справа */}
<div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
  <button
    onClick={() => navigate('/dashboard')}
    style={{
      padding: '12px 24px',
      background: '#333',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'background 0.2s'
    }}
    onMouseOver={(e) => e.target.style.background = '#555'}
    onMouseOut={(e) => e.target.style.background = '#333'}
  >
    На главную
  </button>
</div>
        
        <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e0e0e0', padding: '24px', marginBottom: '24px' }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '500', color: '#333' }}>
            История продаж
          </h1>
          <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>
            {new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ padding: '24px', background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>
              Общая сумма
            </p>
            <p style={{ margin: 0, fontSize: '32px', fontWeight: '500', color: '#333' }}>
              {totalAmount.toLocaleString()} ₸
            </p>
          </div>

          <div style={{ padding: '24px', background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>
              Продано товаров
            </p>
            <p style={{ margin: 0, fontSize: '32px', fontWeight: '500', color: '#333' }}>
              {totalQuantity}
            </p>
          </div>

          <div style={{ padding: '24px', background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>
              Количество продаж
            </p>
            <p style={{ margin: 0, fontSize: '32px', fontWeight: '500', color: '#333' }}>
              {sales.length}
            </p>
          </div>
        </div>

        {sales.length === 0 ? (
          <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '64px 24px', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', background: '#f5f5f5', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', fontSize: '24px', color: '#bbb' }}>
              ∅
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#333', fontWeight: '500' }}>
              Нет данных
            </h3>
            <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>
              Сегодня продажи еще не зарегистрированы
            </p>
          </div>
        ) : (
          <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafafa', borderBottom: '1px solid #e0e0e0' }}>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#888', textTransform: 'uppercase' }}>
                      ID
                    </th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#888', textTransform: 'uppercase' }}>
                      Товар
                    </th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#888', textTransform: 'uppercase' }}>
                      Размер
                    </th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#888', textTransform: 'uppercase' }}>
                      Кол-во
                    </th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#888', textTransform: 'uppercase' }}>
                      Сумма
                    </th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#888', textTransform: 'uppercase' }}>
                      Время
                    </th>
                    <th style={{ padding: '16px', textAlign: 'right', fontSize: '12px', fontWeight: '500', color: '#888', textTransform: 'uppercase' }}>
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale, index) => (
                    <tr 
                      key={sale.id}
                      style={{ borderBottom: index !== sales.length - 1 ? '1px solid #e0e0e0' : 'none', transition: 'background 0.15s' }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#fafafa'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '16px', color: '#888', fontSize: '14px' }}>
                        #{sale.id}
                      </td>
                      <td style={{ padding: '16px', color: '#333', fontSize: '14px' }}>
                        {sale.product}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ padding: '4px 12px', background: '#f5f5f5', color: '#555', borderRadius: '4px', fontSize: '13px' }}>
                          {sale.size}
                        </span>
                      </td>
                      <td style={{ padding: '16px', color: '#333', fontSize: '14px' }}>
                        {sale.quantity}
                      </td>
                      <td style={{ padding: '16px', color: '#333', fontWeight: '500', fontSize: '14px' }}>
                        {(parseFloat(sale.price) * sale.quantity).toLocaleString()} ₸
                      </td>
                      <td style={{ padding: '16px', color: '#888', fontSize: '13px' }}>
                        {new Date(sale.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedSale(sale)}
                          style={{
                            padding: '8px 16px',
                            background: 'white',
                            color: '#333',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '13px',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.background = '#f5f5f5';
                            e.target.style.borderColor = '#bbb';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.background = 'white';
                            e.target.style.borderColor = '#ddd';
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
  );
}