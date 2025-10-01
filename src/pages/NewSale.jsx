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

  const [cart, setCart] = useState([]);

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
    setAvailableSizes(
      variants.map((v) => ({ size: v.size, price: v.price, quantity: v.quantity }))
    );
    setSize('');
  };

  const handleSizeChange = (selectedSize) => {
    setSize(selectedSize);
    const variant = availableSizes.find((v) => v.size === selectedSize);
    if (variant) {
      setPrice(variant.price);
    }
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
    setSuccess('');
  };

  const removeFromCart = (index) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const incrementQuantity = async (index) => {
    const item = cart[index];

    const { data: productData } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', item.barcode)
      .single();

    if (!productData) return;

    const sizesArray = productData.size ? productData.size.split(',') : [];
    if (!sizesArray.includes(item.size)) return;

    const existingInCart = cart
      .filter((i, idx) => i.barcode === item.barcode && i.size === item.size && idx !== index)
      .reduce((sum, i) => sum + i.quantity, 0);

    if (item.quantity + 1 + existingInCart > productData.quantity) {
      alert(
        `Недостаточно товара на складе. Доступно: ${productData.quantity - existingInCart}`
      );
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

    const existingInCart = cart
      .filter((i, idx) => i.barcode === item.barcode && i.size === newSize && idx !== index)
      .reduce((sum, i) => sum + i.quantity, 0);

    if (item.quantity + existingInCart > productData.quantity) {
      alert(
        `Недостаточно товара на складе для размера ${newSize}. Доступно: ${
          productData.quantity - existingInCart
        }`
      );
      return;
    }

    const newCart = [...cart];
    newCart[index].size = newSize;
    setCart(newCart);
  };

  const totalAmount = cart
    .reduce((sum, item) => sum + item.price * item.quantity, 0)
    .toFixed(2);

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
      const now = new Date();
      const almatyTime = new Date(now.getTime() + 5 * 60 * 60 * 1000);
      const formattedTime = almatyTime.toISOString().slice(0, 19);

      const inserts = cart.map((item) => ({
        seller_id: user.fullname,
        product: item.productName,
        barcode: item.barcode,
        size: item.size,
        quantity: Number(item.quantity),
        price: Number(item.price),
        created_at: formattedTime,
      }));

      const { error: salesError } = await supabase.from('sales').insert(inserts);

      if (salesError) {
        setError(salesError.message);
        setSuccess('');
        return;
      }

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
      <div
        style={{
          minHeight: '100vh',
          background: '#fafafa',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
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
                transition: 'background 0.2s',
              }}
              onMouseOver={(e) => (e.target.style.background = '#555')}
              onMouseOut={(e) => (e.target.style.background = '#333')}
            >
              На главную
            </button>
          </div>

          <div
            style={{
              background: 'white',
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '24px', borderBottom: '1px solid #e0e0e0' }}>
              <h1
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '28px',
                  fontWeight: '500',
                  color: '#333',
                }}
              >
                Новая продажа
              </h1>
              <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>
                Оформление продажи товара
              </p>
            </div>

            <div style={{ padding: '24px' }}>
              <div
                style={{
                  background: '#f9f9f9',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: '#333',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                  }}
                >
                  {user?.fullname?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#333' }}>
                    {user?.fullname || 'Тестовый пользователь'}
                  </div>
                  <div style={{ color: '#888', fontSize: '13px' }}>
                    Продавец • @{user?.username || 'testuser'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label
                    style={{
                      marginBottom: '8px',
                      fontSize: '12px',
                      color: '#888',
                      textTransform: 'uppercase',
                    }}
                  >
                    Штрихкод товара
                  </label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Введите штрихкод"
                    style={{
                      padding: '12px 14px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label
                    style={{
                      marginBottom: '8px',
                      fontSize: '12px',
                      color: '#888',
                      textTransform: 'uppercase',
                    }}
                  >
                    Название товара
                  </label>
                  <input
                    type="text"
                    value={productName}
                    disabled
                    placeholder="Название подтянется автоматически"
                    style={{
                      padding: '12px 14px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '6px',
                      fontSize: '14px',
                      background: '#fafafa',
                      color: '#666',
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label
                      style={{
                        marginBottom: '8px',
                        fontSize: '12px',
                        color: '#888',
                        textTransform: 'uppercase',
                      }}
                    >
                      Количество
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      style={{
                        padding: '12px 14px',
                        border: '1px solid #e0e0e0',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label
                      style={{
                        marginBottom: '8px',
                        fontSize: '12px',
                        color: '#888',
                        textTransform: 'uppercase',
                      }}
                    >
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
                        padding: '12px 14px',
                        border: '1px solid #e0e0e0',
                        borderRadius: '6px',
                        fontSize: '14px',
                        background: '#fafafa',
                        color: '#666',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label
                    style={{
                      marginBottom: '8px',
                      fontSize: '12px',
                      color: '#888',
                      textTransform: 'uppercase',
                    }}
                  >
                    Размер
                  </label>
                  <select
                    value={size}
                    onChange={(e) => handleSizeChange(e.target.value)}
                    style={{
                      padding: '12px 14px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '6px',
                      fontSize: '14px',
                      background: 'white',
                    }}
                  >
                    <option value="">Выберите размер</option>
                    {availableSizes.map((s, idx) => (
                      <option key={idx} value={s.size}>
                        {s.size}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <button
                    onClick={addToCart}
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: '#2ecc71',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onMouseOver={(e) => (e.target.style.background = '#27ae60')}
                    onMouseOut={(e) => (e.target.style.background = '#2ecc71')}
                  >
                    Добавить в корзину
                  </button>
                </div>
              </div>

              <div
                style={{
                  marginTop: '8px',
                  padding: '16px',
                  background: '#f9f9f9',
                  borderRadius: '6px',
                  border: '1px solid #e0e0e0',
                }}
              >
                <div
                  style={{
                    marginBottom: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontWeight: 600, color: '#333' }}>Корзина</div>
                  <div style={{ color: '#888', fontSize: '13px' }}>
                    {cart.length ? `${cart.length} поз.` : 'Пока нет товаров'}
                  </div>
                </div>

                {cart.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto auto',
                      gap: '8px',
                      alignItems: 'center',
                      padding: '12px 0',
                      borderTop: idx === 0 ? 'none' : '1px solid #eee',
                    }}
                  >
                    <div style={{ color: '#333', fontSize: '14px' }}>
                      <div style={{ fontWeight: 600 }}>{item.productName}</div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
                        <span style={{ color: '#888', fontSize: '13px' }}>Размер:</span>
                        <select
                          value={item.size}
                          onChange={(e) => changeSize(idx, e.target.value)}
                          style={{
                            padding: '6px 8px',
                            border: '1px solid #e0e0e0',
                            borderRadius: '6px',
                            fontSize: '13px',
                            background: 'white',
                          }}
                        >
                          {availableSizes.map((s, i) => (
                            <option key={i} value={s.size}>
                              {s.size}
                            </option>
                          ))}
                        </select>
                        <span style={{ color: '#888', fontSize: '13px' }}>
                          ×{item.quantity} шт.
                        </span>
                        <span style={{ color: '#333', fontWeight: 600, fontSize: '13px' }}>
                          {item.price * item.quantity} ₸
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => decrementQuantity(idx)}
                        style={{
                          padding: '8px 10px',
                          background: 'white',
                          color: '#333',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '14px',
                          cursor: 'pointer',
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
                        −
                      </button>
                      <button
                        onClick={() => incrementQuantity(idx)}
                        style={{
                          padding: '8px 10px',
                          background: 'white',
                          color: '#333',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '14px',
                          cursor: 'pointer',
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
                        +
                      </button>
                    </div>

                    <div>
                      <button
                        onClick={() => removeFromCart(idx)}
                        style={{
                          padding: '8px 12px',
                          background: '#fff',
                          color: '#db4437',
                          border: '1px solid #f0c3bf',
                          borderRadius: '6px',
                          fontSize: '14px',
                          cursor: 'pointer',
                        }}
                        onMouseOver={(e) => {
                          e.target.style.background = '#fdecea';
                          e.target.style.borderColor = '#f1a199';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.background = '#fff';
                          e.target.style.borderColor = '#f0c3bf';
                        }}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}

                <div
                  style={{
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '2px dashed #e0e0e0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: '#333', fontWeight: 600, fontSize: '16px' }}>
                    Итого:
                  </span>
                  <span style={{ color: '#2ecc71', fontWeight: 700, fontSize: '22px' }}>
                    {totalAmount} ₸
                  </span>
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                {error && (
                  <div
                    style={{
                      background: '#fdecea',
                      border: '1px solid #f1a199',
                      color: '#b72b22',
                      padding: '12px 14px',
                      borderRadius: '6px',
                      marginBottom: '12px',
                      fontWeight: 600,
                      fontSize: '14px',
                    }}
                  >
                    {error}
                  </div>
                )}

                {success && (
                  <div
                    style={{
                      background: '#e9f7ef',
                      border: '1px solid #bfe5cd',
                      color: '#1e7e34',
                      padding: '12px 14px',
                      borderRadius: '6px',
                      marginBottom: '12px',
                      fontWeight: 600,
                      fontSize: '14px',
                    }}
                  >
                    {success}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                  onClick={handleSale}
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    background: '#333',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={(e) => (e.target.style.background = '#555')}
                  onMouseOut={(e) => (e.target.style.background = '#333')}
                >
                  {isLoading ? 'Сохранение...' : 'Сохранить продажу'}
                </button>

                {onBack && (
                  <button
                    onClick={onBack}
                    disabled={isLoading}
                    style={{
                      padding: '12px 16px',
                      background: 'white',
                      color: '#333',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
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
                    Отмена
                  </button>
                )}

                <button
                  onClick={() => navigate('/dashboard')}
                  disabled={isLoading}
                  style={{
                    padding: '12px 16px',
                    background: 'white',
                    color: '#333',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
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
                  На главную
                </button>
              </div>
            </div>
          </div>

          <footer
            style={{
              textAlign: 'center',
              padding: '12px',
              fontSize: '13px',
              color: '#666',
              borderTop: '1px solid #ddd',
              background: '#f9f9f9',
              marginTop: '16px',
              borderRadius: '6px',
            }}
          >
            © qaraa.kz | Система безопасного доступа, 2025. <br />
            Последнее обновление: 02.10.2025 | srk.
          </footer>
        </div>
      </div>
    </>
  );
}