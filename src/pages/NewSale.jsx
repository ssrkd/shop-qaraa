import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import kaspiLogo from '../images/kaspi.svg';
import halykLogo from '../images/halyk.svg';
import cashLogo from '../images/cash.png';

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
  const [showPayment, setShowPayment] = useState(false);
  const [givenAmount, setGivenAmount] = useState('');
  const [method, setMethod] = useState('');
  const [cart, setCart] = useState([]);
  const [mixedCashAmount, setMixedCashAmount] = useState('');
  const [mixedSecondMethod, setMixedSecondMethod] = useState('');

  const localDate = new Date();
  const offsetMs = localDate.getTimezoneOffset() * 60 * 1000;
  const localISO = new Date(localDate.getTime() - offsetMs).toISOString().slice(0, 19).replace('T', ' ');

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) setCart(JSON.parse(savedCart));
    } catch (e) {
      console.error('Ошибка при чтении корзины из localStorage', e);
      setCart([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  // Обновляем текущую страницу при заходе
  useEffect(() => {
    if (!user) return;

    const updateCurrentPage = async () => {
      await supabase
        .from('user_login_status')
        .update({
          current_page: 'Новая продажа',
          page_entered_at: new Date().toISOString(),
          last_active: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('is_logged_in', true);
    };

    updateCurrentPage();
  }, [user]);

  useEffect(() => {
    if (!barcode) {
      setProductName('');
      setPrice('');
      setAvailableSizes([]);
      setSize('');
      setError('');
      return;
    }

    if (typingTimeout) clearTimeout(typingTimeout);

    const timeout = setTimeout(() => {
      fetchProductByBarcode(barcode);
    }, 400);

    setTypingTimeout(timeout);

    return () => clearTimeout(timeout);
  }, [barcode]);

  const fetchProductByBarcode = async (code) => {
    if (!code) return;

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, barcode')
      .eq('barcode', code)
      .maybeSingle();

    if (productError) {
      console.error('Ошибка при поиске товара:', productError.message);
      setError('Ошибка при поиске товара');
      return;
    }

    if (!product) {
      setProductName('');
      setPrice('');
      setAvailableSizes([]);
      setSize('');
      setError('Товар с таким штрихкодом не найден');
      return;
    }

    setProductName(product.name || '');
    setError(product.name ? '' : 'У товара нет названия');

    const { data: variants, error: variantsError } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', product.id);

    if (variantsError || !variants.length) {
      setAvailableSizes([]);
      setSize('');
      setError('Для этого товара нет вариантов');
      return;
    }

    setAvailableSizes(
      variants.map((v) => ({ size: v.size, price: v.price, quantity: v.quantity }))
    );
    setSize('');
    setPrice('');
  };

  const handleSizeChange = (selectedSize) => {
    setSize(selectedSize);
    const variant = availableSizes.find((v) => v.size === selectedSize);
    if (variant) setPrice(variant.price);
  };

  const addToCart = async () => {
    if (!barcode || !productName || !price || quantity < 1 || !size) {
      setError('Заполните все поля корректно');
      setSuccess('');
      return;
    }

    const variant = availableSizes.find((v) => v.size === size);
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

    setCart((prev) => [
      ...prev,
      {
        barcode,
        productName,
        size,
        quantity: Number(quantity),
        price: Number(price),
      },
    ]);

    setBarcode('');
    setProductName('');
    setSize('');
    setAvailableSizes([]);
    setQuantity(1);
    setPrice('');
    setError('');
    setSuccess('Товар добавлен в корзину');
    setTimeout(() => setSuccess(''), 2000);
  };

  const removeFromCart = (index) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const incrementQuantity = async (index) => {
    const item = cart[index];

    const { data: productData } = await supabase
      .from('products')
      .select('id')
      .eq('barcode', item.barcode)
      .single();

    if (!productData) return;

    const { data: variant } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', productData.id)
      .eq('size', item.size)
      .single();

    if (!variant) return;

    const existingInCart = cart
      .filter((i, idx) => i.barcode === item.barcode && i.size === item.size && idx !== index)
      .reduce((sum, i) => sum + i.quantity, 0);

    if (item.quantity + 1 + existingInCart > variant.quantity) {
      alert(`Недостаточно товара на складе. Доступно: ${variant.quantity - existingInCart}`);
      return;
    }

    const newCart = [...cart];
    newCart[index].quantity += 1;
    setCart(newCart);
  };

  const decrementQuantity = (index) => {
    const newCart = [...cart];
    if (newCart[index].quantity > 1) {
      newCart[index].quantity -= 1;
      setCart(newCart);
    }
  };

  const totalAmount = Number(
    cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)
  );

  const handleSale = () => {
    if (cart.length === 0) {
      setError('Добавьте хотя бы один товар');
      return;
    }
    setShowPayment(true);
  };

  const handlePayment = async (paymentMethod) => {
    if (cart.length === 0) return;

    if (paymentMethod === 'cash' && (!givenAmount || Number(givenAmount) < totalAmount)) {
      setError('Введите корректную сумму от клиента');
      return;
    }

    if (paymentMethod === 'mixed') {
      if (!mixedCashAmount || Number(mixedCashAmount) <= 0 || Number(mixedCashAmount) >= totalAmount) {
        setError('Введите корректную сумму наличных (меньше общей суммы)');
        return;
      }
      if (!mixedSecondMethod) {
        setError('Выберите способ оплаты для остатка');
        return;
      }
    }

    try {
      setIsLoading(true);

      const inserts = cart.map((item) => ({
        seller_id: user.fullname,
        product: item.productName,
        barcode: item.barcode,
        size: item.size,
        quantity: Number(item.quantity),
        price: Number(item.price),
        created_at: localISO,
      }));

      const { data: insertedSales, error: salesError } = await supabase
        .from('sales')
        .insert(inserts)
        .select('id');

      if (salesError) throw salesError;

      const saleIds = insertedSales.map((s) => s.id);
      const change = paymentMethod === 'cash' ? Number(givenAmount) - totalAmount : null;

      const methodMapping = {
        cash: 'Наличные',
        kaspi: 'Kaspi QR',
        halyk: 'Halyk QR | Карта',
      };

      let finalPaymentMethod = '';
      if (paymentMethod === 'mixed') {
        const secondMethodName = methodMapping[mixedSecondMethod] || mixedSecondMethod;
        finalPaymentMethod = `Смешанная (Наличные: ${Number(mixedCashAmount).toFixed(2)} ₸ + ${secondMethodName}: ${(totalAmount - Number(mixedCashAmount)).toFixed(2)} ₸)`;
      } else {
        finalPaymentMethod = methodMapping[paymentMethod] || paymentMethod;
      }

      // ✅ Обновляем метод оплаты во всех sales, которые входят в эту продажу
const { error: updateError } = await supabase
.from('sales')
.update({ payment_method: finalPaymentMethod })
.in('id', saleIds);

if (updateError) throw updateError;

      for (let item of cart) {
        const { data: productIdData } = await supabase
          .from('products')
          .select('id')
          .eq('barcode', item.barcode)
          .single();

        const { data: variant } = await supabase
          .from('product_variants')
          .select('*')
          .eq('size', item.size)
          .eq('product_id', productIdData?.id)
          .single();

        if (!variant) continue;

        const newQuantity = variant.quantity - item.quantity;
        await supabase.from('product_variants').update({ quantity: newQuantity }).eq('id', variant.id);
      }

      setSuccess(
        paymentMethod === 'cash'
          ? `Продажа успешно проведена! Сдача: ${change.toFixed(2)} ₸`
          : paymentMethod === 'mixed'
          ? `Продажа успешно проведена! Наличные: ${Number(mixedCashAmount).toFixed(2)} ₸, ${methodMapping[mixedSecondMethod]}: ${(totalAmount - Number(mixedCashAmount)).toFixed(2)} ₸`
          : 'Продажа успешно проведена!'
      );
      setCart([]);
      setShowPayment(false);
      setMethod('');
      setGivenAmount('');
      setMixedCashAmount('');
      setMixedSecondMethod('');
      setError('');
    } catch (err) {
      console.error('Ошибка при оплате:', err.message);
      setError('Ошибка при оплате: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', sans-serif; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
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
                Новая продажа
              </h1>
              <p style={{ color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>
                Оформление продажи товара
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
                {user?.fullname?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a' }}>
                  {user?.fullname || 'Тестовый пользователь'}
                </div>
                <div style={{ color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>
                  Продавец • @{user?.username || 'testuser'}
                </div>
              </div>
            </div>

            <div style={{ padding: '32px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '10px', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
                    Штрихкод товара
                  </label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Введите штрихкод"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      fontSize: '15px',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#1a1a1a'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '10px', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
                    Название товара
                  </label>
                  <input
                    type="text"
                    value={productName}
                    disabled
                    placeholder="Название подтянется автоматически"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      fontSize: '15px',
                      background: '#fafafa',
                      color: '#666'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '24px' }}>
  <div>
    <label style={{ display: 'block', marginBottom: '10px', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
      Размер
    </label>
    <select
      value={size}
      onChange={(e) => handleSizeChange(e.target.value)}
      disabled={availableSizes.length === 0}
      style={{
        width: '100%',
        padding: '14px 16px',
        border: '2px solid #e5e7eb',
        borderRadius: '12px',
        fontSize: '15px',
        background: availableSizes.length === 0 ? '#fafafa' : 'white',
        cursor: availableSizes.length === 0 ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        color: availableSizes.length === 0 ? '#9ca3af' : '#1a1a1a'
      }}
      onFocus={(e) => {
        if (availableSizes.length > 0) e.target.style.borderColor = '#1a1a1a';
      }}
      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
    >
      <option value="">
        {availableSizes.length === 0 ? 'Нет доступных размеров' : 'Выберите размер'}
      </option>
      {availableSizes.map((s, idx) => (
        <option key={idx} value={s.size} disabled={s.quantity === 0}>
          {s.size} {s.quantity > 0 ? `(в наличии: ${s.quantity})` : '(нет в наличии)'}
        </option>
      ))}
    </select>
    {size && availableSizes.find(s => s.size === size) && (
      <div style={{ 
        marginTop: '8px', 
        fontSize: '12px', 
        color: availableSizes.find(s => s.size === size).quantity > 5 ? '#10b981' : '#f59e0b',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        На складе: {availableSizes.find(s => s.size === size).quantity} шт.
      </div>
    )}
  </div>

  <div>
    <label style={{ display: 'block', marginBottom: '10px', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
      Количество
    </label>
    <input
      type="number"
      min="1"
      max={size ? availableSizes.find(s => s.size === size)?.quantity || 1 : 999}
      value={quantity}
      onChange={(e) => setQuantity(e.target.value)}
      disabled={!size}
      style={{
        width: '100%',
        padding: '14px 16px',
        border: '2px solid #e5e7eb',
        borderRadius: '12px',
        fontSize: '15px',
        background: !size ? '#fafafa' : 'white',
        cursor: !size ? 'not-allowed' : 'text',
        transition: 'all 0.2s',
        color: !size ? '#9ca3af' : '#1a1a1a'
      }}
      onFocus={(e) => {
        if (size) e.target.style.borderColor = '#1a1a1a';
      }}
      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
    />
  </div>

  <div>
    <label style={{ display: 'block', marginBottom: '10px', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
      Цена за единицу
    </label>
    <input
      type="number"
      min="0"
      step="0.01"
      value={price}
      disabled
      placeholder="0.00"
      style={{
        width: '100%',
        padding: '14px 16px',
        border: '2px solid #e5e7eb',
        borderRadius: '12px',
        fontSize: '15px',
        background: '#fafafa',
        color: '#666',
        fontWeight: price ? '600' : '400'
      }}
    />
  </div>
</div>

              <button
                onClick={addToCart}
                disabled={isLoading}
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
                  transition: 'all 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
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
                Добавить в корзину
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              background: '#fef2f2',
              border: '2px solid #fecaca',
              color: '#dc2626',
              padding: '16px 20px',
              borderRadius: '12px',
              marginBottom: '24px',
              fontWeight: '600',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              background: '#f0fdf4',
              border: '2px solid #bbf7d0',
              color: '#16a34a',
              padding: '16px 20px',
              borderRadius: '12px',
              marginBottom: '24px',
              fontWeight: '600',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {success}
            </div>
          )}

          <div style={{ 
            background: 'white', 
            borderRadius: '20px', 
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)', 
            overflow: 'hidden',
            marginBottom: '24px'
          }}>
            <div style={{ 
              padding: '24px 32px', 
              background: '#fafafa', 
              borderBottom: '2px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a' }}>
                Корзина
              </div>
              <div style={{ 
                padding: '6px 14px', 
                background: '#e5e7eb', 
                borderRadius: '8px', 
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151'
              }}>
                {cart.length} {cart.length === 1 ? 'товар' : cart.length < 5 ? 'товара' : 'товаров'}
              </div>
            </div>

            <div style={{ padding: '32px' }}>
              {cart.length === 0 ? (
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <h3 style={{ fontSize: '20px', color: '#1a1a1a', fontWeight: '600', marginBottom: '8px' }}>
                    Корзина пуста
                  </h3>
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>
                    Добавьте товары для оформления продажи
                  </p>
                </div>
              ) : (
                <>
                  {cart.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '20px',
                        background: '#fafafa',
                        borderRadius: '12px',
                        marginBottom: idx < cart.length - 1 ? '16px' : '0',
                        border: '2px solid #e5e7eb'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a1a', marginBottom: '8px' }}>
                            {item.productName}
                          </div>
                          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ 
                              padding: '6px 12px', 
                              background: 'white', 
                              borderRadius: '8px', 
                              fontSize: '14px',
                              fontWeight: '600',
                              color: '#374151',
                              border: '2px solid #e5e7eb'
                            }}>
                              Размер: {item.size}
                            </span>
                            <span style={{ color: '#6b7280', fontSize: '14px' }}>
                              {item.price} ₸ × {item.quantity}
                            </span>
                            <span style={{ color: '#1a1a1a', fontWeight: '700', fontSize: '16px' }}>
                              = {(item.price * item.quantity).toLocaleString()} ₸
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromCart(idx)}
                          style={{
                            padding: '8px',
                            background: 'white',
                            border: '2px solid #fecaca',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
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
                          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#dc2626">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => decrementQuantity(idx)}
                          style={{
                            padding: '10px 16px',
                            background: 'white',
                            color: '#1a1a1a',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.background = '#f9fafb';
                            e.target.style.borderColor = '#1a1a1a';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.background = 'white';
                            e.target.style.borderColor = '#e5e7eb';
                          }}
                        >
                          −
                        </button>
                        <button
                          onClick={() => incrementQuantity(idx)}
                          style={{
                            padding: '10px 16px',
                            background: 'white',
                            color: '#1a1a1a',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.background = '#f9fafb';
                            e.target.style.borderColor = '#1a1a1a';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.background = 'white';
                            e.target.style.borderColor = '#e5e7eb';
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}

                  <div style={{
                    marginTop: '28px',
                    paddingTop: '28px',
                    borderTop: '2px dashed #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '18px', fontWeight: '600', color: '#6b7280' }}>
                      Итого:
                    </span>
                    <span style={{ fontSize: '36px', fontWeight: '700', color: '#1a1a1a', letterSpacing: '-1px' }}>
                      {totalAmount.toLocaleString()} ₸
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {cart.length > 0 && (
            <div style={{ display: 'flex', gap: '16px' }}>
              <button
                onClick={handleSale}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '18px',
                  background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px'
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
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {isLoading ? 'Обработка...' : 'Продолжить к оплате'}
              </button>
            </div>
          )}
        </div>
      </div>

      {showPayment && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            animation: 'slideIn 0.4s ease'
          }}>
            <div style={{
              padding: '32px',
              background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
              color: 'white',
              borderRadius: '20px 20px 0 0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', letterSpacing: '-0.5px' }}>
                    Оплата
                  </h2>
                  <p style={{ opacity: 0.8, fontSize: '14px' }}>
                    Выберите способ оплаты
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowPayment(false);
                    setMethod('');
                    setGivenAmount('');
                    setMixedCashAmount('');
                    setMixedSecondMethod('');
                  }}
                  style={{
                    width: '40px',
                    height: '40px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
                  onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
                >
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div style={{ padding: '32px' }}>
              <div style={{
                padding: '24px',
                background: '#fafafa',
                borderRadius: '12px',
                marginBottom: '28px',
                border: '2px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '16px', color: '#6b7280', fontWeight: '600' }}>
                    Сумма к оплате:
                  </span>
                  <span style={{ fontSize: '32px', fontWeight: '700', color: '#1a1a1a', letterSpacing: '-1px' }}>
                    {totalAmount.toLocaleString()} ₸
                  </span>
                </div>
              </div>

              {!method ? (
                <div style={{ display: 'grid', gap: '16px' }}>
                  <button
                    onClick={() => setMethod('cash')}
                    style={{
                      padding: '24px',
                      background: 'white',
                      border: '2px solid #e5e7eb',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.borderColor = '#10b981';
                      e.target.style.background = '#f0fdf4';
                      e.target.style.transform = 'translateY(-2px)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.background = 'white';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    <img src={cashLogo} alt="Cash" style={{ width: 48, height: 48 }} />
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a', marginBottom: '4px' }}>
                        Наличные
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        Оплата наличными средствами
                      </div>
                    </div>
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#9ca3af">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  <button
                    onClick={() => setMethod('kaspi')}
                    style={{
                      padding: '24px',
                      background: 'white',
                      border: '2px solid #e5e7eb',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.borderColor = '#f14635';
                      e.target.style.background = '#fef2f2';
                      e.target.style.transform = 'translateY(-2px)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.background = 'white';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    <img src={kaspiLogo} alt="Kaspi" style={{ width: 48, height: 48 }} />
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a', marginBottom: '4px' }}>
                        Kaspi QR
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        Оплата через Kaspi QR код
                      </div>
                    </div>
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#9ca3af">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  <button
                    onClick={() => setMethod('halyk')}
                    style={{
                      padding: '24px',
                      background: 'white',
                      border: '2px solid #e5e7eb',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.borderColor = '#00a651';
                      e.target.style.background = '#f0fdf4';
                      e.target.style.transform = 'translateY(-2px)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.background = 'white';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    <img src={halykLogo} alt="Halyk" style={{ width: 48, height: 48 }} />
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a', marginBottom: '4px' }}>
                        Halyk QR | Карта
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        Оплата через Halyk Bank
                      </div>
                    </div>
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#9ca3af">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  <button
                    onClick={() => setMethod('mixed')}
                    style={{
                      padding: '24px',
                      background: 'white',
                      border: '2px solid #e5e7eb',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = '#f59e0b';
                      e.currentTarget.style.background = '#fffbeb';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="white">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a', marginBottom: '4px' }}>
                        Смешанная оплата
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        Наличные + Kaspi/Halyk
                      </div>
                    </div>
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#9ca3af">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              ) : method === 'cash' ? (
                <div>
                  <button
                    onClick={() => setMethod('')}
                    style={{
                      padding: '10px 16px',
                      background: 'white',
                      border: '2px solid #e5e7eb',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#6b7280',
                      cursor: 'pointer',
                      marginBottom: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Назад
                  </button>

                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px', color: '#6b7280', fontWeight: '600' }}>
                      Сумма от клиента
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={givenAmount}
                      onChange={(e) => setGivenAmount(e.target.value)}
                      placeholder="Введите сумму"
                      style={{
                        width: '100%',
                        padding: '16px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        fontSize: '18px',
                        fontWeight: '600'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#1a1a1a'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>

                  {givenAmount && Number(givenAmount) >= totalAmount && (
                    <div style={{
                      padding: '20px',
                      background: '#f0fdf4',
                      border: '2px solid #bbf7d0',
                      borderRadius: '12px',
                      marginBottom: '24px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '16px', color: '#16a34a', fontWeight: '600' }}>
                          Сдача:
                        </span>
                        <span style={{ fontSize: '28px', fontWeight: '700', color: '#16a34a', letterSpacing: '-0.5px' }}>
                          {(Number(givenAmount) - totalAmount).toFixed(2)} ₸
                        </span>
                      </div>
                    </div>
                  )}

                  {givenAmount && Number(givenAmount) < totalAmount && (
                    <div style={{
                      padding: '16px',
                      background: '#fef2f2',
                      border: '2px solid #fecaca',
                      borderRadius: '12px',
                      marginBottom: '24px',
                      color: '#dc2626',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      Недостаточно средств. Необходимо еще {(totalAmount - Number(givenAmount)).toFixed(2)} ₸
                    </div>
                  )}

                  <button
                    onClick={() => handlePayment('cash')}
                    disabled={isLoading || !givenAmount || Number(givenAmount) < totalAmount}
                    style={{
                      width: '100%',
                      padding: '18px',
                      background: isLoading || !givenAmount || Number(givenAmount) < totalAmount
                        ? '#e5e7eb'
                        : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: isLoading || !givenAmount || Number(givenAmount) < totalAmount ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px'
                    }}
                    onMouseOver={(e) => {
                      if (!isLoading && givenAmount && Number(givenAmount) >= totalAmount) {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 10px 30px rgba(16, 185, 129, 0.3)';
                      }
                    }}
                    onMouseOut={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    {isLoading ? 'Обработка...' : 'Завершить оплату'}
                  </button>
                </div>
              ) : method === 'mixed' ? (
                <div>
                  <button
                    onClick={() => setMethod('')}
                    style={{
                      padding: '10px 16px',
                      background: 'white',
                      border: '2px solid #e5e7eb',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#6b7280',
                      cursor: 'pointer',
                      marginBottom: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Назад
                  </button>

                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px', color: '#6b7280', fontWeight: '600' }}>
                      Сумма наличных
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      max={totalAmount - 1}
                      value={mixedCashAmount}
                      onChange={(e) => setMixedCashAmount(e.target.value)}
                      placeholder="Введите сумму наличных"
                      style={{
                        width: '100%',
                        padding: '16px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        fontSize: '18px',
                        fontWeight: '600'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#1a1a1a'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>

                  {mixedCashAmount && Number(mixedCashAmount) > 0 && Number(mixedCashAmount) < totalAmount && (
                    <div style={{
                      padding: '20px',
                      background: '#fffbeb',
                      border: '2px solid #fcd34d',
                      borderRadius: '12px',
                      marginBottom: '24px'
                    }}>
                      <div style={{ fontSize: '14px', color: '#92400e', marginBottom: '12px', fontWeight: '600' }}>
                        Оставшаяся сумма к оплате:
                      </div>
                      <div style={{ fontSize: '28px', fontWeight: '700', color: '#f59e0b', letterSpacing: '-0.5px' }}>
                        {(totalAmount - Number(mixedCashAmount)).toFixed(2)} ₸
                      </div>
                    </div>
                  )}

                  {mixedCashAmount && Number(mixedCashAmount) > 0 && Number(mixedCashAmount) < totalAmount && (
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', color: '#6b7280', fontWeight: '600' }}>
                        Выберите способ оплаты для остатка
                      </label>
                      <div style={{ display: 'grid', gap: '12px' }}>
                        <button
                          onClick={() => setMixedSecondMethod('kaspi')}
                          style={{
                            padding: '16px',
                            background: mixedSecondMethod === 'kaspi' ? '#fef2f2' : 'white',
                            border: mixedSecondMethod === 'kaspi' ? '2px solid #f14635' : '2px solid #e5e7eb',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                          }}
                        >
                          <img src={kaspiLogo} alt="Kaspi" style={{ width: 40, height: 40 }} />
                          <div style={{ flex: 1, textAlign: 'left' }}>
                            <div style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a1a' }}>
                              Kaspi QR
                            </div>
                          </div>
                          {mixedSecondMethod === 'kaspi' && (
                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#f14635">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>

                        <button
                          onClick={() => setMixedSecondMethod('halyk')}
                          style={{
                            padding: '16px',
                            background: mixedSecondMethod === 'halyk' ? '#f0fdf4' : 'white',
                            border: mixedSecondMethod === 'halyk' ? '2px solid #00a651' : '2px solid #e5e7eb',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                          }}
                        >
                          <img src={halykLogo} alt="Halyk" style={{ width: 40, height: 40 }} />
                          <div style={{ flex: 1, textAlign: 'left' }}>
                            <div style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a1a' }}>
                              Halyk QR | Карта
                            </div>
                          </div>
                          {mixedSecondMethod === 'halyk' && (
                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#00a651">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {mixedCashAmount && Number(mixedCashAmount) >= totalAmount && (
                    <div style={{
                      padding: '16px',
                      background: '#fef2f2',
                      border: '2px solid #fecaca',
                      borderRadius: '12px',
                      marginBottom: '24px',
                      color: '#dc2626',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      Сумма наличных должна быть меньше общей суммы
                    </div>
                  )}

                  <button
                    onClick={() => handlePayment('mixed')}
                    disabled={isLoading || !mixedCashAmount || Number(mixedCashAmount) <= 0 || Number(mixedCashAmount) >= totalAmount || !mixedSecondMethod}
                    style={{
                      width: '100%',
                      padding: '18px',
                      background: isLoading || !mixedCashAmount || Number(mixedCashAmount) <= 0 || Number(mixedCashAmount) >= totalAmount || !mixedSecondMethod
                        ? '#e5e7eb'
                        : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: isLoading || !mixedCashAmount || Number(mixedCashAmount) <= 0 || Number(mixedCashAmount) >= totalAmount || !mixedSecondMethod ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px'
                    }}
                    onMouseOver={(e) => {
                      if (!isLoading && mixedCashAmount && Number(mixedCashAmount) > 0 && Number(mixedCashAmount) < totalAmount && mixedSecondMethod) {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 10px 30px rgba(245, 158, 11, 0.3)';
                      }
                    }}
                    onMouseOut={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    {isLoading ? 'Обработка...' : 'Завершить оплату'}
                  </button>
                </div>
              ) : (
                <div>
                  <button
                    onClick={() => setMethod('')}
                    style={{
                      padding: '10px 16px',
                      background: 'white',
                      border: '2px solid #e5e7eb',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#6b7280',
                      cursor: 'pointer',
                      marginBottom: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Назад
                  </button>

                  <div style={{
                    padding: '24px',
                    background: '#fafafa',
                    borderRadius: '12px',
                    marginBottom: '24px',
                    textAlign: 'center'
                  }}>
                    <img 
                      src={method === 'kaspi' ? kaspiLogo : halykLogo} 
                      alt={method === 'kaspi' ? 'Kaspi' : 'Halyk'} 
                      style={{ width: 64, height: 64, margin: '0 auto 16px' }} 
                    />
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a', marginBottom: '8px' }}>
                      {method === 'kaspi' ? 'Kaspi QR' : 'Halyk QR | Карта'}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      После подтверждения оплаты нажмите кнопку ниже
                    </div>
                  </div>

                  <button
                    onClick={() => handlePayment(method)}
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '18px',
                      background: isLoading 
                        ? '#e5e7eb' 
                        : method === 'kaspi' 
                          ? 'linear-gradient(135deg, #f14635 0%, #d13427 100%)'
                          : 'linear-gradient(135deg, #00a651 0%, #008542 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px'
                    }}
                    onMouseOver={(e) => {
                      if (!isLoading) {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = method === 'kaspi'
                          ? '0 10px 30px rgba(241, 70, 53, 0.3)'
                          : '0 10px 30px rgba(0, 166, 81, 0.3)';
                      }
                    }}
                    onMouseOut={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {isLoading ? 'Обработка...' : 'Подтвердить оплату'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}