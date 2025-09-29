import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { supabase } from "../supabaseClient";

export default function AdminPanel({ onBack, user }) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState(null);

  const [activeTab, setActiveTab] = useState("sales");
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [barcode, setBarcode] = useState("");
  const [newProduct, setNewProduct] = useState({ name: "", price: "" });
  const [step, setStep] = useState("barcode");
  const [foundProduct, setFoundProduct] = useState(null);
  const [form, setForm] = useState({
    barcode: "",
    name: "",
    price: "",
    sizes: { S: "", M: "", L: "" },
  });

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("login")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error(error);
        return;
      }

      setUserRole(data.role);

      if (data.role !== "owner") {
        alert("У вас нет доступа к админ-панели");
        navigate("/dashboard");
      }
    };

    fetchRole();
  }, [user, navigate]);

  useEffect(() => {
    if (activeTab === "sales") fetchSales();
    if (activeTab === "products") fetchProducts();
    if (activeTab === "добавить") resetForm();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "добавить" && step === "barcode" && form.barcode.trim()) {
      const timeout = setTimeout(() => {
        checkBarcode();
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [form.barcode, activeTab, step]);

  async function fetchNew() {
    if (!barcode.trim()) {
      setFoundProduct(null);
      return;
    }

    const { data, error } = await supabase
      .from("products")
      .select("id, name, barcode, product_variants(size, quantity, price)")
      .eq("barcode", barcode)
      .maybeSingle();

    if (data) {
      setFoundProduct(data);
      setNewProduct({ name: "", price: "" });
    } else {
      setFoundProduct(null);
    }
  }

  async function saveNewProduct() {
    if (!barcode.trim() || !newProduct.name.trim() || !newProduct.price.trim()) {
      alert("Заполните все поля");
      return;
    }

    const { data, error } = await supabase
      .from("products")
      .insert([{ name: newProduct.name, barcode }])
      .select()
      .single();

    if (error) {
      console.error(error);
      return;
    }

    await supabase.from("product_variants").insert([
      {
        product_id: data.id,
        size: "—",
        quantity: 0,
        price: parseFloat(newProduct.price),
      },
    ]);

    setNewProduct({ name: "", price: "" });
    setBarcode("");
    fetchProducts();
  }

  async function fetchSales() {
    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setSales(data);
  }

  async function fetchProducts() {
    const { data: products, error } = await supabase
      .from("products")
      .select("id, name, barcode, product_variants(id, size, quantity, price)")
      .order("id");

    if (!error) setProducts(products);
  }

  async function checkBarcode() {
    const barcodeTrim = form.barcode.trim();
    if (!barcodeTrim) {
      alert("Введите штрих-код");
      return;
    }

    const { data, error } = await supabase
      .from("products")
      .select("id, name, barcode, product_variants(price)")
      .eq("barcode", barcodeTrim)
      .maybeSingle();

    if (error) {
      console.error(error);
      return;
    }

    if (!data) {
      setStep("details");
      setFoundProduct(null);
      setForm((prev) => ({ ...prev, price: "" }));
    } else {
      setFoundProduct(data);
      setStep("stock");
      setForm((prev) => ({
        ...prev,
        barcode: data.barcode,
        price: data.product_variants?.[0]?.price || "",
      }));
    }
  }

  async function registerProduct() {
    const { data, error } = await supabase
      .from("products")
      .insert([{ name: form.name, barcode: form.barcode }])
      .select()
      .single();

    if (!error) {
      setFoundProduct(data);
      setStep("stock");
      fetchProducts();
    } else {
      console.error(error);
    }
  }

  async function addStock() {
    for (const [size, qty] of Object.entries(form.sizes)) {
      const quantity = parseInt(qty) || 0;
      if (quantity > 0) {
        const { data: existing } = await supabase
          .from("product_variants")
          .select("*")
          .eq("product_id", foundProduct.id)
          .eq("size", size)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("product_variants")
            .update({
              quantity: existing.quantity + quantity,
              price: parseFloat(form.price),
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("product_variants").insert([
            {
              product_id: foundProduct.id,
              size,
              quantity,
              price: parseFloat(form.price),
            },
          ]);
        }
      }
    }

    resetForm();
    fetchProducts();
  }

  function resetForm() {
    setForm({ barcode: "", name: "", price: "", sizes: { S: "", M: "", L: "" } });
    setStep("barcode");
    setFoundProduct(null);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #f8fafc, #e2e8f0)',
      padding: '1.5rem'
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          background: 'white',
          borderRadius: '1rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <h1 style={{
              fontSize: '1.875rem',
              fontWeight: 'bold',
              background: 'linear-gradient(to right, #2563eb, #9333ea)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Админ-панель
            </h1>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                onClick={onBack}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#f3f4f6',
                  color: '#374151',
                  borderRadius: '0.5rem',
                  border: 'none',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = '#e5e7eb'}
                onMouseOut={(e) => e.target.style.background = '#f3f4f6'}
              >
                ← Назад
              </button>
              <button 
                onClick={() => navigate('/dashboard')} 
                disabled={isLoading}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'linear-gradient(to right, #3b82f6, #2563eb)',
                  color: 'white',
                  borderRadius: '0.5rem',
                  border: 'none',
                  fontWeight: '500',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.5 : 1,
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  if (!isLoading) {
                    e.target.style.background = 'linear-gradient(to right, #2563eb, #1d4ed8)';
                    e.target.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                  }
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'linear-gradient(to right, #3b82f6, #2563eb)';
                  e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                }}
              >
                🏠 На главную
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginTop: '1.5rem',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <button
              onClick={() => setActiveTab("sales")}
              style={{
                padding: '0.75rem 1.5rem',
                fontWeight: '500',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === "sales" ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === "sales" ? '#2563eb' : '#6b7280',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              📊 Продажи
            </button>
            <button
              onClick={() => setActiveTab("products")}
              style={{
                padding: '0.75rem 1.5rem',
                fontWeight: '500',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === "products" ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === "products" ? '#2563eb' : '#6b7280',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              📦 Товары
            </button>
            <button
              onClick={() => setActiveTab("добавить")}
              style={{
                padding: '0.75rem 1.5rem',
                fontWeight: '500',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === "добавить" ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === "добавить" ? '#2563eb' : '#6b7280',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              ➕ Добавить
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{
          background: 'white',
          borderRadius: '1rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          padding: '1.5rem'
        }}>
          {activeTab === "sales" && (
            <div>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#1f2937',
                marginBottom: '1.5rem'
              }}>
                📊 История продаж
              </h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'linear-gradient(to right, #eff6ff, #faf5ff)' }}>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>ID</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Продавец</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Товар</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Штрих-код</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Размер</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Кол-во</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Цена</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Дата</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((s) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#4b5563' }}>{s.id}</td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1f2937' }}>{s.seller_id}</td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1f2937', fontWeight: '500' }}>{s.product}</td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#4b5563', fontFamily: 'monospace' }}>{s.barcode}</td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            background: '#dbeafe',
                            color: '#1e40af',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: '500'
                          }}>
                            {s.size}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1f2937' }}>{s.quantity}</td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: '600', color: '#059669' }}>{s.price} ₸</td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#4b5563' }}>
                          {new Date(s.created_at).toLocaleString('ru-RU')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "products" && (
            <div>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#1f2937',
                marginBottom: '1.5rem'
              }}>
                📦 Список товаров
              </h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'linear-gradient(to right, #eff6ff, #faf5ff)' }}>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>ID</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Название</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Штрих-код</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Размер</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Остаток</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Цена</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) =>
                      p.product_variants.map((v) => (
                        <tr key={v.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#4b5563' }}>{p.id}</td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1f2937', fontWeight: '500' }}>{p.name}</td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#4b5563', fontFamily: 'monospace' }}>{p.barcode}</td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              background: '#f3e8ff',
                              color: '#6b21a8',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              fontWeight: '500'
                            }}>
                              {v.size}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem' }}>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              background: v.quantity > 10 ? '#d1fae5' : v.quantity > 0 ? '#fef3c7' : '#fee2e2',
                              color: v.quantity > 10 ? '#065f46' : v.quantity > 0 ? '#92400e' : '#991b1b',
                              borderRadius: '0.375rem',
                              fontSize: '0.75rem',
                              fontWeight: '500'
                            }}>
                              {v.quantity} шт
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: '600', color: '#059669' }}>{v.price} ₸</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "добавить" && (
            <div>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#1f2937',
                marginBottom: '1.5rem'
              }}>
                ➕ Добавить товар
              </h2>

              {step === "barcode" && (
                <div style={{ maxWidth: '28rem', margin: '0 auto' }}>
                  <div style={{
                    background: 'linear-gradient(to bottom right, #eff6ff, #faf5ff)',
                    borderRadius: '0.75rem',
                    padding: '2rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}>
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '4rem',
                        height: '4rem',
                        background: '#dbeafe',
                        borderRadius: '9999px',
                        marginBottom: '1rem'
                      }}>
                        <span style={{ fontSize: '1.875rem' }}>🔍</span>
                      </div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>
                        Сканируйте товар
                      </h3>
                      <p style={{ color: '#4b5563', marginTop: '0.5rem' }}>
                        Введите или отсканируйте штрих-код
                      </p>
                    </div>
                    <input
                      type="text"
                      placeholder="Штрих-код товара"
                      value={form.barcode}
                      onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        border: '2px solid #d1d5db',
                        borderRadius: '0.5rem',
                        textAlign: 'center',
                        fontSize: '1.125rem',
                        fontFamily: 'monospace',
                        marginBottom: '1rem',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                      onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    />
                    <button 
                      onClick={checkBarcode}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1.5rem',
                        background: 'linear-gradient(to right, #3b82f6, #2563eb)',
                        color: 'white',
                        borderRadius: '0.5rem',
                        border: 'none',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = 'linear-gradient(to right, #2563eb, #1d4ed8)';
                        e.target.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = 'linear-gradient(to right, #3b82f6, #2563eb)';
                        e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                      }}
                    >
                      Проверить наличие
                    </button>
                  </div>
                </div>
              )}

              {step === "details" && (
                <div style={{ maxWidth: '28rem', margin: '0 auto' }}>
                  <div style={{
                    background: 'linear-gradient(to bottom right, #d1fae5, #a7f3d0)',
                    borderRadius: '0.75rem',
                    padding: '2rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}>
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '4rem',
                        height: '4rem',
                        background: '#d1fae5',
                        borderRadius: '9999px',
                        marginBottom: '1rem'
                      }}>
                        <span style={{ fontSize: '1.875rem' }}>📝</span>
                      </div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>
                        Новый товар
                      </h3>
                      <p style={{ color: '#4b5563', marginTop: '0.5rem' }}>
                        Товар не найден, добавьте информацию
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: '#374151',
                          marginBottom: '0.5rem'
                        }}>
                          Название товара
                        </label>
                        <input
                          type="text"
                          placeholder="Например: Футболка Nike"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: '2px solid #d1d5db',
                            borderRadius: '0.5rem',
                            boxSizing: 'border-box'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#10b981'}
                          onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                        />
                      </div>
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: '#374151',
                          marginBottom: '0.5rem'
                        }}>
                          Цена (₸)
                        </label>
                        <input
                          type="number"
                          placeholder="0"
                          value={form.price}
                          onChange={(e) => setForm({ ...form, price: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: '2px solid #d1d5db',
                            borderRadius: '0.5rem',
                            boxSizing: 'border-box'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#10b981'}
                          onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '1rem' }}>
                        <button 
                          onClick={registerProduct}
                          style={{
                            flex: 1,
                            padding: '0.75rem 1.5rem',
                            background: 'linear-gradient(to right, #10b981, #059669)',
                            color: 'white',
                            borderRadius: '0.5rem',
                            border: 'none',
                            fontWeight: '600',
                            cursor: 'pointer',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.background = 'linear-gradient(to right, #059669, #047857)';
                            e.target.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.background = 'linear-gradient(to right, #10b981, #059669)';
                            e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                          }}
                        >
                          Сохранить
                        </button>
                        <button 
                          onClick={resetForm}
                          style={{
                            padding: '0.75rem 1.5rem',
                            background: '#e5e7eb',
                            color: '#374151',
                            borderRadius: '0.5rem',
                            border: 'none',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => e.target.style.background = '#d1d5db'}
                          onMouseOut={(e) => e.target.style.background = '#e5e7eb'}
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === "stock" && (
                <div style={{ maxWidth: '28rem', margin: '0 auto' }}>
                  <div style={{
                    background: 'linear-gradient(to bottom right, #faf5ff, #fce7f3)',
                    borderRadius: '0.75rem',
                    padding: '2rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}>
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '4rem',
                        height: '4rem',
                        background: '#f3e8ff',
                        borderRadius: '9999px',
                        marginBottom: '1rem'
                      }}>
                        <span style={{ fontSize: '1.875rem' }}>📦</span>
                      </div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>
                        {foundProduct?.name}
                      </h3>
                      <p style={{ color: '#4b5563', marginTop: '0.5rem', fontFamily: 'monospace' }}>
                        {form.barcode}
                      </p>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: '#374151',
                          marginBottom: '0.5rem'
                        }}>
                          Цена (₸)
                        </label>
                        <input
                          type="number"
                          value={form.price}
                          onChange={(e) => setForm({ ...form, price: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: '2px solid #d1d5db',
                            borderRadius: '0.5rem',
                            boxSizing: 'border-box'
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#a855f7'}
                          onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                        />
                      </div>

                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: '#374151',
                          marginBottom: '0.75rem'
                        }}>
                          Количество по размерам
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{
                              width: '3rem',
                              height: '3rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: '#f3e8ff',
                              color: '#6b21a8',
                              borderRadius: '0.5rem',
                              fontWeight: 'bold'
                            }}>
                              S
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={form.sizes.S}
                              onChange={(e) => setForm({ ...form, sizes: { ...form.sizes, S: e.target.value } })}
                              style={{
                                flex: 1,
                                padding: '0.75rem 1rem',
                                border: '2px solid #d1d5db',
                                borderRadius: '0.5rem',
                                boxSizing: 'border-box'
                              }}
                              placeholder="0"
                              onFocus={(e) => e.target.style.borderColor = '#a855f7'}
                              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{
                              width: '3rem',
                              height: '3rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: '#f3e8ff',
                              color: '#6b21a8',
                              borderRadius: '0.5rem',
                              fontWeight: 'bold'
                            }}>
                              M
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={form.sizes.M}
                              onChange={(e) => setForm({ ...form, sizes: { ...form.sizes, M: e.target.value } })}
                              style={{
                                flex: 1,
                                padding: '0.75rem 1rem',
                                border: '2px solid #d1d5db',
                                borderRadius: '0.5rem',
                                boxSizing: 'border-box'
                              }}
                              placeholder="0"
                              onFocus={(e) => e.target.style.borderColor = '#a855f7'}
                              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{
                              width: '3rem',
                              height: '3rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: '#f3e8ff',
                              color: '#6b21a8',
                              borderRadius: '0.5rem',
                              fontWeight: 'bold'
                            }}>
                              L
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={form.sizes.L}
                              onChange={(e) => setForm({ ...form, sizes: { ...form.sizes, L: e.target.value } })}
                              style={{
                                flex: 1,
                                padding: '0.75rem 1rem',
                                border: '2px solid #d1d5db',
                                borderRadius: '0.5rem',
                                boxSizing: 'border-box'
                              }}
                              placeholder="0"
                              onFocus={(e) => e.target.style.borderColor = '#a855f7'}
                              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                            />
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '1rem' }}>
                        <button 
                          onClick={addStock}
                          style={{
                            flex: 1,
                            padding: '0.75rem 1.5rem',
                            background: 'linear-gradient(to right, #a855f7, #9333ea)',
                            color: 'white',
                            borderRadius: '0.5rem',
                            border: 'none',
                            fontWeight: '600',
                            cursor: 'pointer',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.background = 'linear-gradient(to right, #9333ea, #7e22ce)';
                            e.target.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.background = 'linear-gradient(to right, #a855f7, #9333ea)';
                            e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                          }}
                        >
                          Добавить на склад
                        </button>
                        <button 
                          onClick={resetForm}
                          style={{
                            padding: '0.75rem 1.5rem',
                            background: '#e5e7eb',
                            color: '#374151',
                            borderRadius: '0.5rem',
                            border: 'none',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => e.target.style.background = '#d1d5db'}
                          onMouseOut={(e) => e.target.style.background = '#e5e7eb'}
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}