import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function NewSale({ user, onBack }) {
    const navigate = useNavigate();
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

  // Массив товаров в корзине
  const [cart, setCart] = useState([]);
  // Загрузка
useEffect(() => {
    try {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) setCart(JSON.parse(savedCart));
    } catch(e) {
      console.error('Ошибка при чтении корзины из localStorage', e);
      setCart([]);
    }
  }, []);
  
  // Сохранение
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  // Автоматический fetch при вводе штрихкода
  useEffect(() => {
    if (!barcode) {
      setProductName('');
      setPrice('');
      setAvailableSizes([]);
      setSize('');
      setError('');
      return;
    }
  
    // очищаем предыдущий таймаут
    if (typingTimeout) clearTimeout(typingTimeout);
  
    const timeout = setTimeout(() => {
      fetchProductByBarcode(barcode);
    }, 400);
  
    setTypingTimeout(timeout);
  
    return () => clearTimeout(timeout);
  }, [barcode]);


  // Функция для поиска товара по штрихкоду
const fetchProductByBarcode = async (code) => {
    if (!code) return;
  
    // Находим сам товар
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', code)
      .single();
  
    if (productError || !product) {
      setProductName('');
      setPrice('');
      setAvailableSizes([]);
      setSize('');
      setError('Товар с таким штрихкодом не найден');
      return;
    }
  
    // Находим все варианты (размеры) этого товара
    const { data: variants, error: variantsError } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', product.id);
  
    if (variantsError || !variants.length) {
      setProductName(product.name);
      setAvailableSizes([]);
      setSize('');
      setError('Для этого товара нет вариантов');
      return;
    }
  
    setError('');
    setProductName(product.name);
    setAvailableSizes(variants.map(v => ({ size: v.size, price: v.price, quantity: v.quantity })));
    setSize('');
  };

  // Когда выбираем размер
const handleSizeChange = (selectedSize) => {
    setSize(selectedSize);
    const variant = availableSizes.find(v => v.size === selectedSize);
    if (variant) {
      setPrice(variant.price);
    }
  };

  // Добавление товара в корзину
  const addToCart = async () => {
    if (!barcode || !productName || !price || quantity < 1 || !size) {
      setError('Заполните все поля корректно');
      setSuccess('');
      return;
    }
  
    const variant = availableSizes.find(v => v.size === size);
    if (!variant) {
      setError(`Размер ${size} недоступен`);
      setSuccess('');
      return;
    }
  
    if (quantity > variant.quantity) {
      setError(`Недостаточно товара. Доступно: ${variant.quantity}`);
      setSuccess('');
      return;
    }
  
    // Добавляем в корзину
    setCart(prev => [
      ...prev,
      {
        barcode,
        productName,
        size,
        quantity: Number(quantity),
        price: Number(price)
      }
    ]);
  
    // Очистка формы
    setBarcode('');
    setProductName('');
    setSize('');
    setAvailableSizes([]);
    setQuantity(1);
    setPrice('');
    setError('');
    setSuccess('');
  };

  // Удаление товара из корзины
  const removeFromCart = (index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  // Увеличить количество
const incrementQuantity = async (index) => {
    const item = cart[index];
    
    // Проверка на доступное количество на складе
    const { data: productData } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', item.barcode)
      .single();
  
    if (!productData) return;
  
    const sizesArray = productData.size ? productData.size.split(',') : [];
    if (!sizesArray.includes(item.size)) return;
  
    // Сумма уже в корзине
    const existingInCart = cart
      .filter((i, idx) => i.barcode === item.barcode && i.size === item.size && idx !== index)
      .reduce((sum, i) => sum + i.quantity, 0);
  
    if (item.quantity + 1 + existingInCart > productData.quantity) {
      alert(`Недостаточно товара на складе. Доступно: ${productData.quantity - existingInCart}`);
      return;
    }
  
    const newCart = [...cart];
    newCart[index].quantity += 1;
    setCart(newCart);
  };
  
  // Уменьшить количество
  const decrementQuantity = (index) => {
    const newCart = [...cart];
    if (newCart[index].quantity > 1) {
      newCart[index].quantity -= 1;
      setCart(newCart);
    }
  };
  
  // Изменить размер
  const changeSize = async (index, newSize) => {
    const item = cart[index];
  
    const { data: productData } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', item.barcode)
      .single();
  
    if (!productData) return;
  
    const sizesArray = productData.size ? productData.size.split(',') : [];
    if (!sizesArray.includes(newSize)) {
      alert(`Размер ${newSize} недоступен`);
      return;
    }
  
    // Проверка доступного количества для нового размера
    const existingInCart = cart
      .filter((i, idx) => i.barcode === item.barcode && i.size === newSize && idx !== index)
      .reduce((sum, i) => sum + i.quantity, 0);
  
    if (item.quantity + existingInCart > productData.quantity) {
      alert(`Недостаточно товара на складе для размера ${newSize}. Доступно: ${productData.quantity - existingInCart}`);
      return;
    }
  
    const newCart = [...cart];
    newCart[index].size = newSize;
    setCart(newCart);
  };

  // Сумма всех товаров в корзине
  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2);

  // Сохранение продажи
  const handleSale = async () => {
    if (cart.length === 0) {
      setError('Добавьте хотя бы один товар');
      setSuccess('');
      return;
    }
  
    setIsLoading(true);
    setError('');
    setSuccess('');
  
    try {
      // Получаем текущую дату и время Алматы
      const now = new Date();
      const almatyTime = new Date(now.getTime() + 5 * 60 * 60 * 1000); // +6 часов
      const formattedTime = almatyTime.toISOString().slice(0, 19); // YYYY-MM-DDTHH:MM:SS
  
      const inserts = cart.map(item => ({
        seller_id: user.fullname,
        product: item.productName,
        barcode: item.barcode,
        size: item.size,
        quantity: Number(item.quantity),
        price: Number(item.price),
        created_at: formattedTime // вставляем без миллисекунд и UTC
      }));
  
      const { error: salesError } = await supabase.from('sales').insert(inserts);
  
      if (salesError) {
        setError(salesError.message);
        setSuccess('');
        return;
      }
  
      // Обновляем количество в products
      // Обновляем количество в product_variants
for (let item of cart) {
    // Находим вариант
    const { data: variant } = await supabase
      .from('product_variants')
      .select('*')
      .eq('size', item.size)
      .eq('product_id', 
          (await supabase.from('products').select('id').eq('barcode', item.barcode).single()).data.id
      )
      .single();
  
    if (!variant) continue;
  
    const newQuantity = variant.quantity - item.quantity;
  
    await supabase
      .from('product_variants')
      .update({ quantity: newQuantity })
      .eq('id', variant.id);
  }
  
      setSuccess('Продажа успешно добавлена!');
      setTimeout(() => setSuccess(''), 2500);
      setCart([]);
  
    } catch (err) {
      setError('Ошибка при добавлении продажи');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        :root {
          --primary-color: #0b3d91;
          --secondary-color: #112e51;
          --accent-color: #d8b365;
          --success-color: #0f9d58;
          --warning-color: #f4b400;
          --danger-color: #db4437;
          --dark-color: #202124;
          --light-bg: #f0f2f5;
          --white: #ffffff;
          --text-color: #333;
          --light-text: #757575;
          --border-color: #dadce0;
          --shadow: 0 4px 15px rgba(0,0,0,0.15);
          --shadow-lg: 0 10px 25px rgba(0,0,0,0.15);
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
          min-height: 100vh;
        }

        .new-sale-container {
          min-height: 100vh;
          background: linear-gradient(135deg, rgba(11, 61, 145, 0.05), rgba(17, 46, 81, 0.05));
          padding: 40px 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .new-sale-card {
          background: var(--white);
          border-radius: 16px;
          box-shadow: var(--shadow-lg);
          padding: 40px;
          width: 100%;
          max-width: 600px;
          position: relative;
          overflow: hidden;
        }

        .new-sale-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 5px;
          background: linear-gradient(90deg, var(--primary-color), var(--accent-color));
        }

        .header-section {
          text-align: center;
          margin-bottom: 40px;
        }

        .header-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          color: white;
          font-size: 32px;
          box-shadow: 0 8px 20px rgba(11, 61, 145, 0.3);
        }

        .page-title {
          font-size: 28px;
          font-weight: 700;
          color: var(--dark-color);
          margin-bottom: 8px;
        }

        .page-subtitle {
          color: var(--light-text);
          font-size: 16px;
        }

        .user-info {
          background: linear-gradient(135deg, rgba(11, 61, 145, 0.1), rgba(17, 46, 81, 0.1));
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 30px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-avatar {
          width: 45px;
          height: 45px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 18px;
        }

        .user-details h4 {
          font-weight: 600;
          color: var(--dark-color);
          margin-bottom: 2px;
        }

        .user-details p {
          font-size: 14px;
          color: var(--light-text);
        }

        .form-section {
          margin-bottom: 30px;
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
          font-size: 15px;
        }

        .form-label i {
          color: var(--primary-color);
          width: 16px;
        }

        .form-input {
          padding: 14px 16px;
          border: 2px solid var(--border-color);
          border-radius: 10px;
          font-size: 16px;
          transition: all 0.3s ease;
          background: var(--white);
        }

        .form-input:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 3px rgba(11, 61, 145, 0.1);
        }

        .form-input:hover {
          border-color: var(--primary-color);
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .calculation-section {
          background: linear-gradient(135deg, rgba(15, 157, 88, 0.05), rgba(15, 157, 88, 0.1));
          border-radius: 12px;
          padding: 20px;
          margin: 24px 0;
          border: 1px solid rgba(15, 157, 88, 0.2);
        }

        .calculation-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }

        .calculation-icon {
          width: 35px;
          height: 35px;
          border-radius: 8px;
          background: var(--success-color);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .calculation-title {
          font-weight: 600;
          color: var(--dark-color);
          font-size: 16px;
        }

        .calculation-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .calculation-label {
          color: var(--light-text);
        }

        .calculation-value {
          font-weight: 600;
          color: var(--dark-color);
        }

        .total-amount {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 12px;
          border-top: 1px solid rgba(15, 157, 88, 0.2);
          font-size: 18px;
          font-weight: 700;
        }

        .total-label {
          color: var(--dark-color);
        }

        .total-value {
          color: var(--success-color);
        }

        .message-section {
          margin: 20px 0;
        }

        .error-message {
          background: rgba(219, 68, 55, 0.1);
          border: 1px solid rgba(219, 68, 55, 0.2);
          color: var(--danger-color);
          padding: 14px 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
          animation: shake 0.5s ease-in-out;
        }

        .success-message {
          background: rgba(15, 157, 88, 0.1);
          border: 1px solid rgba(15, 157, 88, 0.2);
          color: var(--success-color);
          padding: 14px 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
          animation: fadeIn 0.5s ease-in-out;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .buttons-section {
          display: flex;
          gap: 12px;
          margin-top: 30px;
        }

        .btn {
          flex: 1;
          padding: 14px 20px;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          position: relative;
          overflow: hidden;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
          color: white;
          box-shadow: 0 4px 12px rgba(11, 61, 145, 0.3);
        }

        .btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, var(--secondary-color), var(--primary-color));
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(11, 61, 145, 0.4);
        }

        .btn-warning {
          background: linear-gradient(135deg, var(--warning-color), #e2a800);
          color: white;
          box-shadow: 0 4px 12px rgba(244, 180, 0, 0.3);
        }

        .btn-warning:hover {
          background: linear-gradient(135deg, #e2a800, var(--warning-color));
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(244, 180, 0, 0.4);
        }

        .btn-success {
          background: linear-gradient(135deg, var(--success-color), #0d8043);
          color: white;
          box-shadow: 0 4px 12px rgba(15, 157, 88, 0.3);
        }

        .btn-success:hover {
          background: linear-gradient(135deg, #0d8043, var(--success-color));
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(15, 157, 88, 0.4);
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s ease-in-out infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .new-sale-container {
            padding: 20px 15px;
          }

          .new-sale-card {
            padding: 24px;
          }

          .page-title {
            font-size: 24px;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .buttons-section {
            flex-direction: column;
          }

          .btn {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .header-icon {
            width: 60px;
            height: 60px;
            font-size: 24px;
          }

          .page-title {
            font-size: 20px;
          }

          .calculation-details {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }

          .total-amount {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }
        }
      `}</style>

<div className="new-sale-container">
        <div className="new-sale-card">
          <div className="header-section">
            <div className="header-icon">
              <i className="fas fa-plus-circle"></i>
            </div>
            <h1 className="page-title">Новая продажа</h1>
            <p className="page-subtitle">Оформление продажи товара</p>
          </div>

          <div className="user-info">
            <div className="user-avatar">
              <i className="fas fa-user"></i>
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
                  <i className="fas fa-barcode"></i>
                  Штрихкод товара
                </label>
                <input
  className="form-input"
  type="text"
  value={barcode}
  onChange={e => setBarcode(e.target.value)}
  placeholder="Введите штрихкод"
/>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-box"></i>
                  Название товара
                </label>
                <input
                  className="form-input"
                  type="text"
                  value={productName}
                  disabled
                  placeholder="Название подтянется автоматически"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    <i className="fas fa-sort-numeric-up"></i>
                    Количество
                  </label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <i className="fas fa-tenge-sign"></i>
                    Цена за единицу
                  </label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    disabled
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="form-group">
  <label className="form-label">
    <i className="fas fa-tshirt"></i>
    Размер
  </label>
  <select
    className="form-input"
    value={size}
    onChange={e => handleSizeChange(e.target.value)}
  >
    <option value="">Выберите размер</option>
    {availableSizes.map((s, idx) => (
      <option key={idx} value={s.size}>
        {s.size}
      </option>
    ))}
  </select>
</div>

              <button
                className="btn btn-success"
                onClick={addToCart}
                disabled={isLoading}
                style={{ marginTop: '12px' }}
              >
                <i className="fas fa-cart-plus"></i> Добавить в корзину
              </button>
            </div>
          </div>

          {/* Корзина товаров */}
          <div className="calculation-section">
            <div className="calculation-header">
              <div className="calculation-icon">
                <i className="fas fa-shopping-cart"></i>
              </div>
              <span className="calculation-title">Корзина</span>
            </div>

            {cart.length === 0 && <p>Пока нет товаров</p>}

            {cart.map((item, idx) => (
  <div className="calculation-details" key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    <span className="calculation-value" style={{ flex: 1 }}>
      {item.productName} 
      <select
        value={item.size}
        onChange={(e) => changeSize(idx, e.target.value)}
        style={{ margin: '0 5px' }}
      >
        {availableSizes.map((s, i) => (
  <option key={i} value={s.size}>{s.size}</option>
))}
      </select>
      x {item.quantity} — {item.price * item.quantity}₸
    </span>

    <button onClick={() => decrementQuantity(idx)}>➖</button>
    <button onClick={() => incrementQuantity(idx)}>➕</button>
    <button onClick={() => removeFromCart(idx)}>❌</button>
  </div>
))}

            <div className="total-amount">
              <span className="total-label">Общая сумма:</span>
              <span className="total-value">{totalAmount}₸</span>
            </div>
          </div>

          <div className="message-section">
            {error && (
              <div className="error-message">
                <i className="fas fa-exclamation-triangle"></i>
                {error}
              </div>
            )}
            
            {success && (
              <div className="success-message">
                <i className="fas fa-check-circle"></i>
                {success}
              </div>
            )}
          </div>

          <div className="buttons-section">
            <button 
              className="btn btn-primary" 
              onClick={handleSale}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="loading-spinner"></div>
                  Сохранение...
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i>
                  Сохранить продажу
                </>
              )}
            </button>
            
            {/* <button 
              className="btn btn-warning" 
              onClick={onBack || (() => {})}
              disabled={isLoading}
            >
              <i className="fas fa-times"></i>
              Отмена
            </button> */}
            
            <button 
      className="btn btn-success" 
      onClick={() => navigate('/dashboard')} // переход на главную
      disabled={isLoading}
    >
      <i className="fas fa-home"></i>
      На главную
    </button>
          </div>
        </div>
      </div>
    </>
  );
}