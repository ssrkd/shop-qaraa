import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';


export default function NewSale({ user, onBack }) {
  const [barcode, setBarcode] = useState('');
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [productName, setProductName] = useState('');
  const [size, setSize] = useState('');
  const [availableSizes, setAvailableSizes] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cart, setCart] = useState([]);

  // Имитируем supabase для демонстрации
  const supabase = {
    from: (table) => ({
      select: (fields) => ({
        eq: (field, value) => ({
          single: async () => {
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Имитируем данные продуктов
            const mockProducts = {
              '123456789': { 
                name: 'Футболка Nike', 
                price: 5000, 
                size: 'S,M,L,XL', 
                quantity: 10,
                barcode: '123456789'
              },
              '987654321': { 
                name: 'Кроссовки Adidas', 
                price: 15000, 
                size: '40,41,42,43,44', 
                quantity: 5,
                barcode: '987654321'
              }
            };
            
            if (table === 'products' && mockProducts[value]) {
              return { data: mockProducts[value], error: null };
            }
            
            return { data: null, error: { message: 'Товар не найден' } };
          }
        })
      }),
      insert: async (data) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { data, error: null };
      }
    })
  };

  // Автоматический поиск товара при вводе штрихкода
  useEffect(() => {
    if (!barcode.trim()) {
      setProductName('');
      setPrice('');
      setAvailableSizes([]);
      setSize('');
      setError('');
      return;
    }

    if (typingTimeout) clearTimeout(typingTimeout);

    const timeout = setTimeout(() => {
      fetchProductByBarcode(barcode.trim());
    }, 400);

    setTypingTimeout(timeout);

    return () => clearTimeout(timeout);
  }, [barcode]);

  // Функция для поиска товара по штрихкоду
  const fetchProductByBarcode = async (code) => {
    if (!code) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', code)
        .single();

      if (error || !data) {
        setProductName('');
        setPrice('');
        setAvailableSizes([]);
        setSize('');
        setError('Товар с таким штрихкодом не найден');
        return;
      }

      setError('');
      setProductName(data.name);
      setPrice(data.price || '');
      setAvailableSizes(data.size ? data.size.split(',') : []);
      setSize('');
    } catch (err) {
      setError('Ошибка при поиске товара');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Добавление товара в корзину
  const addToCart = async () => {
    if (!barcode.trim() || !productName || !price || quantity < 1 || !size) {
      setError('Заполните все поля корректно');
      setSuccess('');
      return;
    }

    const numericPrice = Number(price);
    const numericQuantity = Number(quantity);

    if (isNaN(numericPrice) || numericPrice <= 0) {
      setError('Некорректная цена товара');
      return;
    }

    if (isNaN(numericQuantity) || numericQuantity < 1) {
      setError('Количество должно быть больше 0');
      return;
    }

    setIsLoading(true);
    try {
      // Проверяем наличие товара в БД
      const { data: productData } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', barcode)
        .single();

      if (!productData) {
        setError('Товар не найден в базе данных');
        return;
      }

      const sizesArray = productData.size ? productData.size.split(',') : [];
      if (!sizesArray.includes(size)) {
        setError(`Размер ${size} недоступен для данного товара`);
        return;
      }

      // Проверяем количество уже добавленных товаров
      const existingInCart = cart
        .filter(item => item.barcode === barcode && item.size === size)
        .reduce((sum, item) => sum + item.quantity, 0);

      if (numericQuantity + existingInCart > productData.quantity) {
        setError(`Недостаточно товара на складе. Доступно: ${productData.quantity - existingInCart} шт.`);
        return;
      }

      // Добавляем товар в корзину
      const newItem = {
        id: Date.now(), // Уникальный ID для каждого элемента корзины
        barcode,
        productName,
        size,
        quantity: numericQuantity,
        price: numericPrice,
        availableSizes: sizesArray
      };

      setCart(prev => [...prev, newItem]);

      // Очистка формы после добавления
      setBarcode('');
      setProductName('');
      setSize('');
      setAvailableSizes([]);
      setQuantity(1);
      setPrice('');
      setError('');
      setSuccess(`Товар "${productName}" добавлен в корзину`);

      // Убираем сообщение об успехе через 3 секунды
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      setError('Ошибка при добавлении товара в корзину');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Удаление товара из корзины
  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  // Увеличить количество товара
  const incrementQuantity = async (itemId) => {
    const item = cart.find(item => item.id === itemId);
    if (!item) return;

    try {
      const { data: productData } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', item.barcode)
        .single();

      if (!productData) return;

      const existingInCart = cart
        .filter(i => i.barcode === item.barcode && i.size === item.size && i.id !== itemId)
        .reduce((sum, i) => sum + i.quantity, 0);

      if (item.quantity + 1 + existingInCart > productData.quantity) {
        setError(`Недостаточно товара на складе. Доступно: ${productData.quantity - existingInCart} шт.`);
        return;
      }

      setCart(prev => prev.map(i => 
        i.id === itemId ? { ...i, quantity: i.quantity + 1 } : i
      ));
      setError('');
    } catch (err) {
      setError('Ошибка при обновлении количества');
    }
  };

  // Уменьшить количество товара
  const decrementQuantity = (itemId) => {
    setCart(prev => prev.map(item => 
      item.id === itemId && item.quantity > 1 
        ? { ...item, quantity: item.quantity - 1 }
        : item
    ));
  };

  // Изменить размер товара
  const changeSize = async (itemId, newSize) => {
    const item = cart.find(item => item.id === itemId);
    if (!item) return;

    try {
      const { data: productData } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', item.barcode)
        .single();

      if (!productData) return;

      const sizesArray = productData.size ? productData.size.split(',') : [];
      if (!sizesArray.includes(newSize)) {
        setError(`Размер ${newSize} недоступен`);
        return;
      }

      const existingInCart = cart
        .filter(i => i.barcode === item.barcode && i.size === newSize && i.id !== itemId)
        .reduce((sum, i) => sum + i.quantity, 0);

      if (item.quantity + existingInCart > productData.quantity) {
        setError(`Недостаточно товара размера ${newSize}. Доступно: ${productData.quantity - existingInCart} шт.`);
        return;
      }

      setCart(prev => prev.map(i => 
        i.id === itemId ? { ...i, size: newSize } : i
      ));
      setError('');
    } catch (err) {
      setError('Ошибка при изменении размера');
    }
  };

  // Подсчет общей суммы
  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Сохранение продажи
  const handleSale = async () => {
    if (cart.length === 0) {
      setError('Добавьте хотя бы один товар в корзину');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const inserts = cart.map(item => ({
        seller_id: user?.id || 1,
        product: item.productName,
        barcode: item.barcode,
        size: item.size,
        quantity: item.quantity,
        price: item.price,
        created_at: new Date()
      }));

      const { error } = await supabase.from('sales').insert(inserts);

      if (error) {
        setError(error.message);
      } else {
        setSuccess('Продажа успешно оформлена!');
        setCart([]);

        // Логирование продажи
        for (let item of inserts) {
          await supabase
            .from('logs')
            .insert([{
              user_id: user?.id || 1,
              action: `${user?.username || 'user'} добавил продажу: ${item.product} (${item.size}) x${item.quantity}`,
              created_at: new Date()
            }]);
        }

        setTimeout(() => {
          setSuccess('');
          if (onBack) onBack();
        }, 2000);
      }
    } catch (err) {
      setError('Ошибка при сохранении продажи');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        :root {
          --primary-color: #2563eb;
          --secondary-color: #1e40af;
          --accent-color: #f59e0b;
          --success-color: #10b981;
          --warning-color: #f59e0b;
          --danger-color: #ef4444;
          --dark-color: #1f2937;
          --light-bg: #f8fafc;
          --white: #ffffff;
          --text-color: #374151;
          --light-text: #6b7280;
          --border-color: #e5e7eb;
          --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: var(--light-bg);
          color: var(--text-color);
          line-height: 1.6;
        }

        .new-sale-container {
          min-height: 100vh;
          padding: 24px;
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.05), rgba(16, 185, 129, 0.05));
        }

        .new-sale-card {
          max-width: 800px;
          margin: 0 auto;
          background: var(--white);
          border-radius: 16px;
          box-shadow: var(--shadow-lg);
          overflow: hidden;
        }

        .card-header {
          background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
          color: white;
          padding: 32px;
          text-align: center;
        }

        .header-icon {
          width: 64px;
          height: 64px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          font-size: 28px;
        }

        .page-title {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .page-subtitle {
          opacity: 0.9;
          font-size: 16px;
        }

        .card-body {
          padding: 32px;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(16, 185, 129, 0.1));
          border-radius: 12px;
          margin-bottom: 32px;
        }

        .user-avatar {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, var(--primary-color), var(--success-color));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 20px;
        }

        .user-details h4 {
          font-weight: 600;
          color: var(--dark-color);
          margin-bottom: 4px;
        }

        .user-details p {
          color: var(--light-text);
          font-size: 14px;
        }

        .form-section {
          margin-bottom: 32px;
        }

        .form-grid {
          display: grid;
          gap: 24px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-label {
          font-weight: 600;
          color: var(--dark-color);
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .form-input, .form-select {
          padding: 12px 16px;
          border: 2px solid var(--border-color);
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.2s;
          background: var(--white);
        }

        .form-input:focus, .form-select:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .form-input:disabled {
          background: #f9fafb;
          color: var(--light-text);
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .cart-section {
          background: var(--white);
          border: 2px solid var(--border-color);
          border-radius: 12px;
          margin: 24px 0;
        }

        .cart-header {
          padding: 20px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          gap: 12px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(16, 185, 129, 0.1));
        }

        .cart-icon {
          width: 40px;
          height: 40px;
          background: var(--success-color);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .cart-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--dark-color);
        }

        .cart-count {
          background: var(--primary-color);
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
        }

        .cart-body {
          padding: 20px;
        }

        .cart-empty {
          text-align: center;
          color: var(--light-text);
          padding: 40px 20px;
        }

        .cart-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
          margin-bottom: 12px;
        }

        .cart-item:last-child {
          margin-bottom: 0;
        }

        .item-info {
          flex: 1;
        }

        .item-name {
          font-weight: 600;
          color: var(--dark-color);
          margin-bottom: 4px;
        }

        .item-details {
          font-size: 14px;
          color: var(--light-text);
        }

        .item-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .quantity-controls {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .quantity-btn {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 6px;
          background: var(--primary-color);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s;
        }

        .quantity-btn:hover {
          background: var(--secondary-color);
        }

        .quantity-display {
          min-width: 40px;
          text-align: center;
          font-weight: 600;
          padding: 0 8px;
        }

        .size-select {
          padding: 6px 8px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          font-size: 14px;
        }

        .remove-btn {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 6px;
          background: var(--danger-color);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s;
        }

        .remove-btn:hover {
          background: #dc2626;
        }

        .cart-total {
          border-top: 2px solid var(--border-color);
          padding: 20px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(16, 185, 129, 0.1));
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .total-label {
          font-weight: 600;
          color: var(--dark-color);
        }

        .total-value {
          font-weight: 700;
          color: var(--success-color);
          font-size: 18px;
        }

        .message {
          padding: 16px;
          border-radius: 8px;
          margin: 16px 0;
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 500;
        }

        .message-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: var(--danger-color);
        }

        .message-success {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: var(--success-color);
        }

        .buttons-section {
          display: flex;
          gap: 12px;
          margin-top: 32px;
        }

        .btn {
          flex: 1;
          padding: 16px 24px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
          color: white;
          box-shadow: var(--shadow);
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .btn-success {
          background: linear-gradient(135deg, var(--success-color), #059669);
          color: white;
          box-shadow: var(--shadow);
        }

        .btn-success:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .btn-warning {
          background: linear-gradient(135deg, var(--warning-color), #d97706);
          color: white;
          box-shadow: var(--shadow);
        }

        .btn-warning:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .new-sale-container {
            padding: 16px;
          }

          .card-body {
            padding: 24px;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .cart-item {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .item-controls {
            justify-content: space-between;
          }

          .buttons-section {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="new-sale-container">
        <div className="new-sale-card">
          <div className="card-header">
            <div className="header-icon">
              🛒
            </div>
            <h1 className="page-title">Новая продажа</h1>
            <p className="page-subtitle">Сканируйте товары и оформляйте продажу</p>
          </div>

          <div className="card-body">
            <div className="user-info">
              <div className="user-avatar">
                👤
              </div>
              <div className="user-details">
                <h4>{user?.fullname || 'Тестовый пользователь'}</h4>
                <p>Продавец • @{user?.username || 'testuser'}</p>
              </div>
            </div>

            <div className="form-section">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">
                    📊 Штрихкод товара
                  </label>
                  <input
                    className="form-input"
                    type="text"
                    value={barcode}
                    onChange={e => setBarcode(e.target.value)}
                    placeholder="Введите или отсканируйте штрихкод"
                    disabled={isLoading}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    📦 Название товара
                  </label>
                  <input
                    className="form-input"
                    type="text"
                    value={productName}
                    disabled
                    placeholder="Название загрузится автоматически"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">
                      📝 Количество
                    </label>
                    <input
                      className="form-input"
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      disabled={!productName}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      💰 Цена за единицу
                    </label>
                    <input
                      className="form-input"
                      type="text"
                      value={price ? `${price} ₸` : ''}
                      disabled
                      placeholder="0 ₸"
                    />
                  </div>
                </div>

                {availableSizes.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">
                      👕 Размер
                    </label>
                    <select
                      className="form-select"
                      value={size}
                      onChange={e => setSize(e.target.value)}
                      disabled={!productName}
                    >
                      <option value="">Выберите размер</option>
                      {availableSizes.map((s, idx) => (
                        <option key={idx} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  className="btn btn-success"
                  onClick={addToCart}
                  disabled={isLoading || !productName || !size || !price}
                >
                  {isLoading ? (
                    <>
                      <div className="loading-spinner"></div>
                      Загрузка...
                    </>
                  ) : (
                    <>
                      ➕ Добавить в корзину
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="cart-section">
              <div className="cart-header">
                <div className="cart-icon">
                  🛒
                </div>
                <div className="cart-title">Корзина</div>
                {cart.length > 0 && (
                  <div className="cart-count">{totalItems} товар(ов)</div>
                )}
              </div>

              <div className="cart-body">
                {cart.length === 0 ? (
                  <div className="cart-empty">
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛒</div>
                    <p>Корзина пуста</p>
                    <p style={{ fontSize: '14px', opacity: 0.7 }}>Добавьте товары для оформления продажи</p>
                  </div>
                ) : (
                  <>
                    {cart.map((item) => (
                      <div key={item.id} className="cart-item">
                        <div className="item-info">
                          <div className="item-name">{item.productName}</div>
                          <div className="item-details">
                            Штрихкод: {item.barcode} • {item.price} ₸ за единицу
                          </div>
                        </div>
                        
                        <div className="item-controls">
                          <select
                            className="size-select"
                            value={item.size}
                            onChange={e => changeSize(item.id, e.target.value)}
                          >
                            {item.availableSizes.map((s, i) => (
                              <option key={i} value={s}>{s}</option>
                            ))}
                          </select>
                          
                          <div className="quantity-controls">
                            <button
                              className="quantity-btn"
                              onClick={() => decrementQuantity(item.id)}
                              disabled={item.quantity <= 1}
                            >
                              -
                            </button>
                            <span className="quantity-display">{item.quantity}</span>
                            <button
                              className="quantity-btn"
                              onClick={() => incrementQuantity(item.id)}
                            >
                              +
                            </button>
                          </div>
                          
                          <div style={{ fontWeight: '600', minWidth: '80px', textAlign: 'right' }}>
                            {(item.price * item.quantity).toLocaleString()} ₸
                          </div>
                          
                          <button
                            className="remove-btn"
                            onClick={() => removeFromCart(item.id)}
                            title="Удалить товар"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    <div className="cart-total">
                      <div className="total-row">
                        <span className="total-label">Товаров:</span>
                        <span>{totalItems} шт.</span>
                      </div>
                      <div className="total-row">
                        <span className="total-label">Общая сумма:</span>
                        <span className="total-value">{totalAmount.toLocaleString()} ₸</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {error && (
              <div className="message message-error">
                ⚠️ {error}
              </div>
            )}
            
            {success && (
              <div className="message message-success">
                ✅ {success}
              </div>
            )}

            <div className="buttons-section">
              <button 
                className="btn btn-primary" 
                onClick={handleSale}
                disabled={isLoading || cart.length === 0}
              >
                {isLoading ? (
                  <>
                    <div className="loading-spinner"></div>
                    Сохранение...
                  </>
                ) : (
                  <>
                    💾 Оформить продажу ({totalAmount.toLocaleString()} ₸)
                  </>
                )}
              </button>
              
              <button 
                className="btn btn-warning" 
                onClick={onBack || (() => {})}
                disabled={isLoading}
              >
                ← Назад
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}