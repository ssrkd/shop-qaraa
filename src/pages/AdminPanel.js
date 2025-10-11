import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { supabase } from "../supabaseClient";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function AdminPanel({ onBack, user }) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState(null);

  const [activeTab, setActiveTab] = useState("sales");
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [foundProduct, setFoundProduct] = useState(null);
  const [step, setStep] = useState("barcode");
  const [profit, setProfit] = useState(0);
  const [profitPeriod, setProfitPeriod] = useState("today");
  const [profitPaymentType, setProfitPaymentType] = useState("all");

  const [form, setForm] = useState({
    barcode: "",
    name: "",
    price: "",
    sizes: { S: "", M: "", L: "", XL: "" },
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

  // Обновляем текущую страницу при заходе
  useEffect(() => {
    if (!user) return;

    const updateCurrentPage = async () => {
      await supabase
        .from('user_login_status')
        .update({
          current_page: 'Админ-панель',
          page_entered_at: new Date().toISOString(),
          last_active: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('is_logged_in', true);
    };

    updateCurrentPage();
  }, [user]);

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

  useEffect(() => {
    if (activeTab === "profit") {
      fetchProfit(profitPeriod, profitPaymentType);
    }
  }, [activeTab, profitPeriod, profitPaymentType]);

  async function fetchSales() {
    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setSales(data);
  }

  async function fetchProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, barcode, product_variants(id, size, quantity, price)")
      .order("id");
    if (!error) setProducts(data);
  }

  function printLabel(product, variant) {
    const labelWindow = window.open('', '_blank');
    
    labelWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Этикетка - ${product.name}</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <style>
          @page {
            size: 50.8mm 101.6mm portrait;
            margin: 0;
          }
          
          html, body {
            width: 50.8mm;
            height: 101.6mm;
            margin: 0;
            padding: 0;
            overflow: hidden;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            background: white;
          }
          
          .label-container {
            width: 48mm;
            height: 95mm;
            margin: 0 auto;
            padding: 2mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
          }
          
          .product-name {
            font-size: 8pt;
            font-weight: bold;
            text-align: center;
            line-height: 1.1;
            margin-bottom: 2mm;
            width: 100%;
            max-height: 12mm;
            overflow: hidden;
            word-wrap: break-word;
          }
          
          .barcode-section {
            text-align: center;
            margin: 2mm 0 3mm 0;
            width: 100%;
          }
          
          #barcode {
            max-width: 100%;
            height: auto;
          }
          
          .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            font-size: 9pt;
            font-weight: bold;
            padding-top: 2mm;
            border-top: 1px dashed #999;
          }
          
          .size {
            background: black;
            color: white;
            padding: 1.5mm 3mm;
            border-radius: 1.5mm;
            font-size: 8pt;
          }
          
          .price {
            font-size: 10pt;
            font-weight: bold;
          }
          
          @media print {
            @page {
              size: 50.8mm 101.6mm portrait;
              margin: 0;
            }
            
            html, body {
              width: 50.8mm !important;
              height: 101.6mm !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
            }
            
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="label-container">
          <div class="product-name">${product.name}</div>
          
          <div class="barcode-section">
            <svg id="barcode"></svg>
          </div>
          
          <div class="info-row">
            <span class="size">${variant.size}</span>
            <span class="price">${variant.price} ₸</span>
          </div>
        </div>
        
        <script>
          try {
            JsBarcode("#barcode", "${product.barcode}", {
              format: "CODE128",
              width: 1.6,
              height: 35,
              displayValue: true,
              fontSize: 10,
              margin: 1,
              background: "#ffffff"
            });
          } catch(e) {
            console.error("Ошибка генерации штрих-кода:", e);
          }
          
          setTimeout(() => {
            window.print();
          }, 500);
        </script>
      </body>
      </html>
    `);
    
    labelWindow.document.close();
  }

  async function fetchProfit(period, paymentType = "all") {
    let startDateUTC, endDateUTC;
    const now = new Date();
  
    switch (period) {
      case "today":
        startDateUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        endDateUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
        break;
      case "yesterday":
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        startDateUTC = new Date(Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()));
        endDateUTC = new Date(Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999));
        break;
      case "week":
        const day = now.getUTCDay();
        const diffToMonday = day === 0 ? 6 : day - 1;
        const monday = new Date(now);
        monday.setUTCDate(now.getUTCDate() - diffToMonday);
        startDateUTC = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate()));
        endDateUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
        break;
      case "month":
        startDateUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        endDateUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
        break;
      case "year":
        startDateUTC = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
        endDateUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
        break;
      case "all":
        startDateUTC = new Date(Date.UTC(2000, 0, 1));
        endDateUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
        break;
      default:
        return;
    }
  
    const methodMapping = {
      kaspi: "Kaspi QR",
      halyk: "Halyk QR | Карта",
      cash: "Наличные",
    };
  
    let query = supabase
      .from("sales")
      .select("price, quantity, payment_method, created_at")
      .gte("created_at", startDateUTC.toISOString())
      .lte("created_at", endDateUTC.toISOString());
  
    if (paymentType === "mixed") {
      query = query.like("payment_method", "Смешанная%");
    } else if (paymentType !== "all") {
      query = query.eq("payment_method", methodMapping[paymentType]);
    }
  
    const { data, error } = await query;
  
    if (error) {
      console.error("Ошибка при подсчете прибыли:", error);
      return;
    }
  
    const total = data.reduce((sum, sale) => {
      const price = parseFloat(sale.price) || 0;
      const qty = parseInt(sale.quantity) || 0;
      return sum + price * qty;
    }, 0);
  
    setProfit(total);
  }

  async function checkBarcode() {
    const barcodeTrim = form.barcode.trim();
    if (!barcodeTrim) return;

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

  function exportToExcel(data, sheetName = "Sheet1", fileName = "data.xlsx") {
    if (!data || !data.length) return;
    
    // Создаем worksheet из данных
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Определяем границы для всех ячеек
    const border = {
      top: { style: "thin", color: { rgb: "CCCCCC" } },
      bottom: { style: "thin", color: { rgb: "CCCCCC" } },
      left: { style: "thin", color: { rgb: "CCCCCC" } },
      right: { style: "thin", color: { rgb: "CCCCCC" } }
    };
    
    // Стиль для заголовков
    const headerStyle = {
      font: { bold: true, color: { rgb: "000000" } },
      fill: { fgColor: { rgb: "F5F5F5" } },
      alignment: { vertical: "center", horizontal: "left" },
      border: border
    };
    
    // Стиль для обычных ячеек
    const cellStyle = {
      alignment: { vertical: "center", horizontal: "left", wrapText: false },
      border: border
    };
    
    // Получаем диапазон ячеек
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    // Применяем стили к заголовкам (первая строка)
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellAddress]) continue;
      ws[cellAddress].s = headerStyle;
    }
    
    // Применяем стили к остальным ячейкам
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws[cellAddress]) continue;
        ws[cellAddress].s = cellStyle;
      }
    }
    
    // Автоматическая ширина колонок
    const colWidths = [];
    const keys = Object.keys(data[0]);
    keys.forEach((key, idx) => {
      let maxWidth = key.length;
      data.forEach(row => {
        const cellValue = String(row[key] || '');
        if (cellValue.length > maxWidth) {
          maxWidth = cellValue.length;
        }
      });
      colWidths.push({ wch: Math.min(maxWidth + 2, 50) }); // +2 для padding, max 50
    });
    ws['!cols'] = colWidths;
    
    // Создаем книгу и добавляем лист
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // Записываем файл с поддержкой стилей
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array", cellStyles: true });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), fileName);
  }

  function handleExportSales() {
    const salesData = sales.map(s => ({
      "ID": s.id ?? "",
      "Продавец": s.seller_id ?? "",
      "Товар": s.product ?? "",
      "Штрихкод": s.barcode ?? "",
      "Размер": s.size ?? "",
      "Количество": s.quantity ?? 0,
      "Цена": s.price ?? 0,
      "Дата": s.created_at ? new Date(s.created_at).toLocaleString("ru-RU") : ""
    }));
    exportToExcel(salesData, "Продажи", "sales.xlsx");
  }

  function handleExportProducts() {
    const productsData = [];
    products.forEach(p => {
      p.product_variants.forEach(v => {
        productsData.push({
          "ID": p.id ?? "",
          "Название": p.name ?? "",
          "Штрихкод": p.barcode ?? "",
          "Размер": v.size ?? "",
          "Остаток": v.quantity ?? 0,
          "Цена": v.price ?? 0
        });
      });
    });
    exportToExcel(productsData, "Товары", "products.xlsx");
  }

  async function registerProduct() {
    if (!form.name.trim() || !form.barcode.trim() || !form.price.trim()) {
      alert("Заполните все поля");
      return;
    }

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
            { product_id: foundProduct.id, size, quantity, price: parseFloat(form.price) }
          ]);
        }
      }
    }

    await fetchProducts();
    await fetchSales();
    resetForm();
    setActiveTab("products");
  }

  function resetForm() {
    setForm({ barcode: "", name: "", price: "", sizes: { S: "", M: "", L: "", XL: "" } });
    setStep("barcode");
    setFoundProduct(null);
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
                Админ-панель
              </h1>
              <p style={{ color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>
                Управление товарами и аналитика
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={resetForm}
                style={{
                  padding: '14px 28px',
                  background: 'white',
                  color: '#1a1a1a',
                  border: '2px solid #e5e7eb',
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
                  e.target.style.background = '#fafafa';
                  e.target.style.borderColor = '#1a1a1a';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'white';
                  e.target.style.borderColor = '#e5e7eb';
                }}
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Очистить форму
              </button>

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
          </div>

          <div style={{ 
            background: 'white', 
            borderRadius: '20px', 
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)', 
            overflow: 'hidden',
            marginBottom: '24px'
          }}>
            <div style={{ 
              padding: '20px 32px', 
              background: '#fafafa', 
              borderBottom: '2px solid #e5e7eb',
              display: 'flex',
              gap: '12px',
              overflowX: 'auto'
            }}>
              {['sales', 'products', 'profit', 'добавить'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '12px 24px',
                    background: activeTab === tab ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)' : 'transparent',
                    color: activeTab === tab ? 'white' : '#6b7280',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseOver={(e) => {
                    if (activeTab !== tab) {
                      e.target.style.background = '#f5f5f5';
                      e.target.style.color = '#1a1a1a';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (activeTab !== tab) {
                      e.target.style.background = 'transparent';
                      e.target.style.color = '#6b7280';
                    }
                  }}
                >
                  {tab === 'sales' && '📊 Продажи'}
                  {tab === 'products' && '📦 Товары'}
                  {tab === 'profit' && '💰 Прибыль'}
                  {tab === 'добавить' && '➕ Добавить'}
                </button>
              ))}
            </div>

            <div style={{ padding: '32px' }}>
              {activeTab === 'sales' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                    <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#1a1a1a' }}>
                      История продаж
                    </h2>
                    <button
                      onClick={handleExportSales}
                      style={{
                        padding: '12px 24px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        display: 'flex',
                        alignItems: 'center',
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
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Экспорт в Excel
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#fafafa', borderBottom: '2px solid #e5e7eb' }}>
                          <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>ID</th>
                          <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Продавец</th>
                          <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Товар</th>
                          <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Штрихкод</th>
                          <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Размер</th>
                          <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Кол-во</th>
                          <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Цена</th>
                          <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Дата</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sales.map((s, index) => (
                          <tr 
                            key={s.id}
                            style={{ 
                              borderBottom: index !== sales.length - 1 ? '1px solid #f3f4f6' : 'none',
                              transition: 'background 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#fafafa'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>#{s.id}</td>
                            <td style={{ padding: '16px', color: '#1a1a1a', fontSize: '14px', fontWeight: '600' }}>{s.seller_id}</td>
                            <td style={{ padding: '16px', color: '#1a1a1a', fontSize: '14px', fontWeight: '600' }}>{s.product}</td>
                            <td style={{ padding: '16px', color: '#6b7280', fontSize: '13px', fontFamily: 'monospace' }}>{s.barcode}</td>
                            <td style={{ padding: '16px' }}>
                              <span style={{ 
                                padding: '4px 12px', 
                                background: '#fafafa', 
                                borderRadius: '6px', 
                                fontSize: '13px',
                                fontWeight: '600',
                                color: '#374151'
                              }}>
                                {s.size}
                              </span>
                            </td>
                            <td style={{ padding: '16px', color: '#1a1a1a', fontSize: '14px', fontWeight: '600' }}>{s.quantity}</td>
                            <td style={{ padding: '16px', color: '#10b981', fontSize: '15px', fontWeight: '700' }}>{s.price} ₸</td>
                            <td style={{ padding: '16px', color: '#6b7280', fontSize: '13px' }}>
                              {new Date(s.created_at).toLocaleString('ru-RU')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'products' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                    <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#1a1a1a' }}>
                      Список товаров
                    </h2>
                    <button
                      onClick={handleExportProducts}
                      style={{
                        padding: '12px 24px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        display: 'flex',
                        alignItems: 'center',
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
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Экспорт в Excel
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#fafafa', borderBottom: '2px solid #e5e7eb' }}>
                          <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>ID</th>
                          <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Название</th>
                          <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Штрихкод</th>
                          <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Размер</th>
                          <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Остаток</th>
                          <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Цена</th>
                          <th style={{ padding: '16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((p) =>
                          p.product_variants.map((v, vIndex) => (
                            <tr 
                              key={v.id}
                              style={{ 
                                borderBottom: '1px solid #f3f4f6',
                                transition: 'background 0.2s'
                              }}
                              onMouseOver={(e) => e.currentTarget.style.background = '#fafafa'}
                              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>#{p.id}</td>
                              <td style={{ padding: '16px', color: '#1a1a1a', fontSize: '14px', fontWeight: '600' }}>{p.name}</td>
                              <td style={{ padding: '16px', color: '#6b7280', fontSize: '13px', fontFamily: 'monospace' }}>{p.barcode}</td>
                              <td style={{ padding: '16px' }}>
                                <span style={{ 
                                  padding: '4px 12px', 
                                  background: '#fafafa', 
                                  borderRadius: '6px', 
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  color: '#374151'
                                }}>
                                  {v.size}
                                </span>
                              </td>
                              <td style={{ padding: '16px' }}>
                                <span style={{ 
                                  padding: '4px 12px', 
                                  background: v.quantity > 10 ? '#f0fdf4' : v.quantity > 0 ? '#fef3c7' : '#fef2f2',
                                  color: v.quantity > 10 ? '#16a34a' : v.quantity > 0 ? '#92400e' : '#dc2626',
                                  borderRadius: '6px', 
                                  fontSize: '13px',
                                  fontWeight: '600'
                                }}>
                                  {v.quantity} шт
                                </span>
                              </td>
                              <td style={{ padding: '16px', color: '#10b981', fontSize: '15px', fontWeight: '700' }}>{v.price} ₸</td>
                              <td style={{ padding: '16px', textAlign: 'center' }}>
                                <button
                                  onClick={() => printLabel(p, v)}
                                  style={{
                                    padding: '8px 16px',
                                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 2px 8px rgba(139, 92, 246, 0.2)'
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(139, 92, 246, 0.2)';
                                  }}
                                >
                                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                  </svg>
                                  Этикетка
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'profit' && (
                <div>
                  <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#1a1a1a', marginBottom: '24px' }}>
                    Анализ прибыли
                  </h2>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '10px', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
                        Период
                      </label>
                      <select
                        value={profitPeriod}
                        onChange={(e) => setProfitPeriod(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '14px 16px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '12px',
                          fontSize: '15px',
                          background: 'white',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#1a1a1a'}
                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                      >
                        <option value="today">Сегодня</option>
                        <option value="yesterday">Вчера</option>
                        <option value="week">Неделя</option>
                        <option value="month">Месяц</option>
                        <option value="year">Год</option>
                        <option value="all">Все время</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '10px', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
                        Тип оплаты
                      </label>
                      <select
                        value={profitPaymentType}
                        onChange={(e) => setProfitPaymentType(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '14px 16px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '12px',
                          fontSize: '15px',
                          background: 'white',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#1a1a1a'}
                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                      >
                        <option value="all">Все оплаты</option>
                        <option value="kaspi">Kaspi QR</option>
                        <option value="halyk">Halyk QR | Карта</option>
                        <option value="cash">Наличные</option>
                        <option value="mixed">Смешанная оплата</option>
                      </select>
                    </div>
                  </div>

                  <div style={{
                    padding: '48px 32px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderRadius: '20px',
                    textAlign: 'center',
                    boxShadow: '0 20px 60px rgba(16, 185, 129, 0.3)'
                  }}>
                    <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '16px', fontWeight: '600', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Общая прибыль
                    </p>
                    <p style={{ color: 'white', fontSize: '56px', fontWeight: '700', letterSpacing: '-2px' }}>
                      {profit.toLocaleString('ru-RU')} ₸
                    </p>
                    <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', marginTop: '12px' }}>
                      За выбранный период
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'добавить' && (
                <div>
                  <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#1a1a1a', marginBottom: '24px' }}>
                    Добавить товар на склад
                  </h2>

                  {step === 'barcode' && (
                    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                      <div style={{
                        padding: '32px',
                        background: '#fafafa',
                        borderRadius: '16px',
                        textAlign: 'center',
                        marginBottom: '24px'
                      }}>
                        <div style={{
                          width: '80px',
                          height: '80px',
                          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                          borderRadius: '50%',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '20px'
                        }}>
                          <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="white">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a', marginBottom: '8px' }}>
                          Шаг 1: Сканирование товара
                        </h3>
                        <p style={{ color: '#6b7280', fontSize: '14px' }}>
                          Введите или отсканируйте штрихкод товара
                        </p>
                      </div>

                      <input
                        type="text"
                        placeholder="Штрихкод товара"
                        value={form.barcode}
                        onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '16px 20px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '12px',
                          fontSize: '16px',
                          textAlign: 'center',
                          fontFamily: 'monospace',
                          marginBottom: '16px',
                          transition: 'all 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#1a1a1a'}
                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                      />

                      <button
                        onClick={checkBarcode}
                        style={{
                          width: '100%',
                          padding: '16px',
                          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          fontSize: '15px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.3s'
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
                        Проверить наличие
                      </button>
                    </div>
                  )}

                  {step === 'details' && (
                    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                      <div style={{
                        padding: '32px',
                        background: '#fef3c7',
                        border: '2px solid #fcd34d',
                        borderRadius: '16px',
                        textAlign: 'center',
                        marginBottom: '24px'
                      }}>
                        <div style={{
                          width: '80px',
                          height: '80px',
                          background: '#fbbf24',
                          borderRadius: '50%',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '20px'
                        }}>
                          <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="white">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#92400e', marginBottom: '8px' }}>
                          Товар не найден
                        </h3>
                        <p style={{ color: '#78350f', fontSize: '14px' }}>
                          Этот товар отсутствует в базе данных. Добавьте информацию о нем
                        </p>
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '10px', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
                          Название товара
                        </label>
                        <input
                          type="text"
                          placeholder="Например: Футболка Nike"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
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

                      <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '10px', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
                          Цена (₸)
                        </label>
                        <input
                          type="number"
                          placeholder="0"
                          value={form.price}
                          onChange={(e) => setForm({ ...form, price: e.target.value })}
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

                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                          onClick={registerProduct}
                          style={{
                            flex: 1,
                            padding: '16px',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '15px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.3s'
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
                          Сохранить товар
                        </button>
                        <button
                          onClick={resetForm}
                          style={{
                            padding: '16px 32px',
                            background: 'white',
                            color: '#1a1a1a',
                            border: '2px solid #e5e7eb',
                            borderRadius: '12px',
                            fontSize: '15px',
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
                          Отмена
                        </button>
                      </div>
                    </div>
                  )}

                  {step === 'stock' && (
                    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                      <div style={{
                        padding: '32px',
                        background: '#f0fdf4',
                        border: '2px solid #bbf7d0',
                        borderRadius: '16px',
                        textAlign: 'center',
                        marginBottom: '24px'
                      }}>
                        <div style={{
                          width: '80px',
                          height: '80px',
                          background: '#10b981',
                          borderRadius: '50%',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '20px'
                        }}>
                          <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="white">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#065f46', marginBottom: '8px' }}>
                          {foundProduct?.name}
                        </h3>
                        <p style={{ color: '#047857', fontSize: '14px', fontFamily: 'monospace' }}>
                          {form.barcode}
                        </p>
                      </div>

                      <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '10px', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
                          Цена (₸)
                        </label>
                        <input
                          type="number"
                          value={form.price}
                          onChange={(e) => setForm({ ...form, price: e.target.value })}
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

                      <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '16px', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
                          Количество по размерам
                        </label>

                        {['S', 'M', 'L', 'XL'].map((size) => (
                          <div key={size} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                            <span style={{
                              width: '48px',
                              height: '48px',
                              background: '#fafafa',
                              border: '2px solid #e5e7eb',
                              borderRadius: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '16px',
                              fontWeight: '600',
                              color: '#1a1a1a'
                            }}>
                              {size}
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={form.sizes[size]}
                              onChange={(e) => setForm({ ...form, sizes: { ...form.sizes, [size]: e.target.value } })}
                              placeholder="0"
                              style={{
                                flex: 1,
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
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                          onClick={addStock}
                          style={{
                            flex: 1,
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Добавить на склад
                        </button>
                        <button
                          onClick={resetForm}
                          style={{
                            padding: '16px 32px',
                            background: 'white',
                            color: '#1a1a1a',
                            border: '2px solid #e5e7eb',
                            borderRadius: '12px',
                            fontSize: '15px',
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
                          Отмена
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}