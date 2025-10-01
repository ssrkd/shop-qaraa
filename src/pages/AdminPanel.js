import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { supabase } from "../supabaseClient";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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

    const ws = XLSX.utils.json_to_sheet(data);

    const cols = Object.keys(data[0]).map((key) => {
      const maxLength = data.reduce((max, row) => {
        const value = row[key] ? row[key].toString() : "";
        return Math.max(max, value.length);
      }, key.length);
      return { wch: maxLength + 2 };
    });
    ws["!cols"] = cols;

    const colKeys = Object.keys(data[0]);
    const sizeColIndex = colKeys.indexOf("Размер");
    const qtyColIndex = colKeys.indexOf("Количество");

    Object.keys(ws).forEach((cell) => {
      if (cell[0] === "!") return;
      const col = XLSX.utils.decode_cell(cell).c;
      if (col === sizeColIndex || col === qtyColIndex) {
        ws[cell].s = { alignment: { horizontal: "center", vertical: "center" } };
      }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
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

  function handleExportSalesPDF() {
    const doc = new jsPDF({ orientation: 'landscape' });
    const tableColumn = ["ID", "Продавец", "Товар", "Штрихкод", "Размер", "Кол-во", "Цена", "Дата"];
    const tableRows = sales.map((s) => [
      s.id ?? "",
      s.seller_id ?? "",
      s.product ?? "",
      s.barcode ?? "",
      s.size ?? "",
      s.quantity ?? 0,
      s.price ?? 0,
      s.created_at ? new Date(s.created_at).toLocaleString("ru-RU") : ""
    ]);

    doc.setFontSize(14);
    doc.text("Отчет по продажам", 14, 16);
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [51, 51, 51] }
    });
    doc.save("sales.pdf");
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

  function handleExportProductsPDF() {
    const doc = new jsPDF({ orientation: 'landscape' });
    const tableColumn = ["ID", "Название", "Штрихкод", "Размер", "Остаток", "Цена"];
    const tableRows = [];
    products.forEach((p) => {
      p.product_variants.forEach((v) => {
        tableRows.push([
          p.id ?? "",
          p.name ?? "",
          p.barcode ?? "",
          v.size ?? "",
          v.quantity ?? 0,
          v.price ?? 0,
        ]);
      });
    });

    doc.setFontSize(14);
    doc.text("Список товаров", 14, 16);
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [51, 51, 51] }
    });
    doc.save("products.pdf");
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
        *, *::before, *::after { box-sizing: border-box; }
        :root {
          --bg: #fafafa;
          --card: #ffffff;
          --text: #333;
          --muted: #888;
          --border: #e0e0e0;
          --dark: #333;
          --success: #2ecc71;
          --danger: #db4437;
          --accent: #555;
        }

        .admin-root {
          min-height: 100vh;
          background: var(--bg);
          padding: 24px;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }

        .header-card, .content-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 8px;
        }

        .header-card {
          padding: 16px;
          margin-bottom: 16px;
        }

        .header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .title {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          color: var(--text);
        }

        .btn {
          padding: 10px 16px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: #fff;
          color: var(--text);
          cursor: pointer;
          font-size: 14px;
          transition: all .2s;
        }

        .btn:hover {
          background: #f5f5f5;
          border-color: #bbb;
        }

        .btn-dark {
          background: var(--dark);
          color: #fff;
          border: none;
        }
        .btn-dark:hover { background: var(--accent); }

        .btn-success {
          background: var(--success);
          color: #fff;
          border: none;
        }
        .btn-success:hover { background: #27ae60; }

        .btn-danger {
          background: #fff;
          color: var(--danger);
          border: 1px solid #f0c3bf;
        }
        .btn-danger:hover {
          background: #fdecea;
          border-color: #f1a199;
        }

        .tabs {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 8px;
        }

        .tab {
          padding: 10px 16px;
          border: none;
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          border-radius: 6px;
          transition: all .2s;
        }

        .tab:hover { background: #f5f5f5; color: var(--text); }

        .tab.active {
          background: var(--dark);
          color: #fff;
        }

        .content-card {
          padding: 16px;
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--text);
          margin: 0 0 16px 0;
        }

        .toolbar {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }
        thead th {
          padding: 12px 14px;
          text-align: left;
          font-size: 12px;
          color: var(--muted);
          text-transform: uppercase;
          border-bottom: 1px solid var(--border);
          background: #fafafa;
        }
        tbody td {
          padding: 12px 14px;
          font-size: 14px;
          color: var(--text);
          border-bottom: 1px solid var(--border);
        }

        .badge {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          display: inline-block;
        }

        .input, .select {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 14px;
          background: #fff;
          color: var(--text);
          max-width: 100%;
        }

        .flow-card {
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px;
          width: 100%;
          max-width: 480px;
          margin-left: auto;
          margin-right: auto;
        }

        .flow-step {
          text-align: center;
          margin-bottom: 16px;
          color: var(--muted);
        }

        .row { display: flex; gap: 12px; }
        .col { flex: 1; }

        footer.simple {
          text-align: center;
          padding: 12px;
          font-size: 13px;
          color: #666;
          border-top: 1px solid #ddd;
          background: #f9f9f9;
          margin-top: 16px;
          border-radius: 6px;
        }

        @media (max-width: 600px) {
          .admin-root { padding: 12px; }
          .header-card { padding: 12px; }
          .content-card { padding: 12px; }
          .title { font-size: 20px; }
          .toolbar { flex-direction: column; }
          .btn { width: 100%; }
          .row { flex-direction: column; }
          .flow-step div[style] { margin-bottom: 6px; }
          thead th { font-size: 11px; padding: 10px; }
          tbody td { font-size: 13px; padding: 10px; }
          .flow-card { padding: 12px; max-width: 100%; }
          .tabs { gap: 6px; }
          .tab { padding: 8px 12px; }
        }
      `}</style>

      <div className="admin-root">
        <div className="container">
          <div className="header-card">
            <div className="header-row">
              <h1 className="title">Админ-панель</h1>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={resetForm}
                  className="btn"
                >
                  ← Очистить форму
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  disabled={isLoading}
                  className="btn btn-dark"
                >
                  🏠 На главную
                </button>
              </div>
            </div>

            <div className="tabs">
              <button
                className={`tab ${activeTab === "sales" ? "active" : ""}`}
                onClick={() => setActiveTab("sales")}
              >
                📊 Продажи
              </button>
              <button
                className={`tab ${activeTab === "products" ? "active" : ""}`}
                onClick={() => setActiveTab("products")}
              >
                📦 Товары
              </button>
              <button
                className={`tab ${activeTab === "добавить" ? "active" : ""}`}
                onClick={() => setActiveTab("добавить")}
              >
                ➕ Добавить
              </button>
            </div>
          </div>

          <div className="content-card">
            <div className="toolbar">
              {activeTab === "sales" && (
                <>
                  <button onClick={handleExportSales} className="btn btn-dark">💾 Excel (Продажи)</button>
                </>
              )}
              {activeTab === "products" && (
                <>
                  <button onClick={handleExportProducts} className="btn btn-dark">💾 Excel (Товары)</button>
                </>
              )}
            </div>

            {activeTab === "sales" && (
              <div>
                <h2 className="section-title">📊 История продаж</h2>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Продавец</th>
                        <th>Товар</th>
                        <th>Штрих-код</th>
                        <th>Размер</th>
                        <th>Кол-во</th>
                        <th>Цена</th>
                        <th>Дата</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.map((s) => (
                        <tr key={s.id}>
                          <td>{s.id}</td>
                          <td>{s.seller_id}</td>
                          <td style={{ fontWeight: 500 }}>{s.product}</td>
                          <td style={{ fontFamily: 'monospace' }}>{s.barcode}</td>
                          <td>
                            <span className="badge" style={{ background: '#f5f5f5', color: '#555' }}>{s.size}</span>
                          </td>
                          <td>{s.quantity}</td>
                          <td style={{ color: '#059669', fontWeight: 600 }}>{s.price} ₸</td>
                          <td>{new Date(s.created_at).toLocaleString('ru-RU')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "products" && (
              <div>
                <h2 className="section-title">📦 Список товаров</h2>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Название</th>
                        <th>Штрих-код</th>
                        <th>Размер</th>
                        <th>Остаток</th>
                        <th>Цена</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) =>
                        p.product_variants.map((v) => (
                          <tr key={v.id}>
                            <td>{p.id}</td>
                            <td style={{ fontWeight: 500 }}>{p.name}</td>
                            <td style={{ fontFamily: 'monospace' }}>{p.barcode}</td>
                            <td>
                              <span className="badge" style={{ background: '#f5f5f5', color: '#555' }}>{v.size}</span>
                            </td>
                            <td>
                              <span
                                className="badge"
                                style={{
                                  background: v.quantity > 10 ? '#eaf7f0' : v.quantity > 0 ? '#fff7e6' : '#fdecea',
                                  color: v.quantity > 10 ? '#1e7e34' : v.quantity > 0 ? '#8a5a00' : '#b72b22'
                                }}
                              >
                                {v.quantity} шт
                              </span>
                            </td>
                            <td style={{ color: '#059669', fontWeight: 600 }}>{v.price} ₸</td>
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
                <h2 className="section-title">➕ Добавить товар</h2>

                {step === "barcode" && (
                  <div className="flow-card" style={{ maxWidth: 480, margin: '0 auto' }}>
                    <div className="flow-step">
                      <div style={{
                        width: 48, height: 48, borderRadius: 8,
                        background: '#f5f5f5', display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center', marginBottom: 8
                      }}>
                        <span>🔍</span>
                      </div>
                      <div style={{ fontWeight: 600, color: '#333' }}>Сканируйте товар</div>
                      <div style={{ color: '#888', fontSize: 13 }}>Введите или отсканируйте штрих-код</div>
                    </div>

                    <input
                      type="text"
                      placeholder="Штрих-код товара"
                      value={form.barcode}
                      onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                      className="input"
                      style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: 16, marginBottom: 8 }}
                    />
                    <button onClick={checkBarcode} className="btn btn-dark" style={{ width: '100%' }}>
                      Проверить наличие
                    </button>
                  </div>
                )}

                {step === "details" && (
                  <div className="flow-card" style={{ maxWidth: 480, margin: '0 auto' }}>
                    <div className="flow-step">
                      <div style={{
                        width: 48, height: 48, borderRadius: 8,
                        background: '#f5f5f5', display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center', marginBottom: 8
                      }}>
                        <span>📝</span>
                      </div>
                      <div style={{ fontWeight: 600, color: '#333' }}>Новый товар</div>
                      <div style={{ color: '#888', fontSize: 13 }}>Товар не найден, добавьте информацию</div>
                    </div>

                    <div className="col" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 6 }}>
                          Название товара
                        </label>
                        <input
                          type="text"
                          placeholder="Например: Футболка Nike"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          className="input"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 6 }}>
                          Цена (₸)
                        </label>
                        <input
                          type="number"
                          placeholder="0"
                          value={form.price}
                          onChange={(e) => setForm({ ...form, price: e.target.value })}
                          className="input"
                        />
                      </div>
                      <div className="row" style={{ gap: 8 }}>
                        <button onClick={registerProduct} className="btn btn-success" style={{ flex: 1 }}>
                          Сохранить
                        </button>
                        <button onClick={resetForm} className="btn">Отмена</button>
                      </div>
                    </div>
                  </div>
                )}

                {step === "stock" && (
                  <div className="flow-card" style={{ maxWidth: 480, margin: '0 auto' }}>
                    <div className="flow-step">
                      <div style={{
                        width: 48, height: 48, borderRadius: 8,
                        background: '#f5f5f5', display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center', marginBottom: 8
                      }}>
                        <span>📦</span>
                      </div>
                      <div style={{ fontWeight: 600, color: '#333' }}>{foundProduct?.name}</div>
                      <div style={{ color: '#888', fontSize: 13, fontFamily: 'monospace' }}>{form.barcode}</div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 6 }}>
                          Цена (₸)
                        </label>
                        <input
                          type="number"
                          value={form.price}
                          onChange={(e) => setForm({ ...form, price: e.target.value })}
                          className="input"
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: 13, color: '#666', marginBottom: 8 }}>
                          Количество по размерам
                        </label>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <span className="badge" style={{ background: '#f5f5f5', color: '#555', width: 32, textAlign: 'center' }}>S</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={form.sizes.S}
                            onChange={(e) => setForm({ ...form, sizes: { ...form.sizes, S: e.target.value } })}
                            className="input"
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <span className="badge" style={{ background: '#f5f5f5', color: '#555', width: 32, textAlign: 'center' }}>M</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={form.sizes.M}
                            onChange={(e) => setForm({ ...form, sizes: { ...form.sizes, M: e.target.value } })}
                            className="input"
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                          <span className="badge" style={{ background: '#f5f5f5', color: '#555', width: 32, textAlign: 'center' }}>L</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={form.sizes.L}
                            onChange={(e) => setForm({ ...form, sizes: { ...form.sizes, L: e.target.value } })}
                            className="input"
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
  <span className="badge" style={{ background: '#f5f5f5', color: '#555', width: 32, textAlign: 'center' }}>XL</span>
  <input
    type="number"
    min="0"
    step="1"
    value={form.sizes.XL}
    onChange={(e) => setForm({ ...form, sizes: { ...form.sizes, XL: e.target.value } })}
    className="input"
  />
</div>
                      </div>

                      <div className="row" style={{ paddingTop: 8 }}>
                        <button onClick={addStock} className="btn btn-dark" style={{ flex: 1 }}>
                          Добавить на склад
                        </button>
                        <button onClick={resetForm} className="btn">Отмена</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <footer className="simple">
            © qaraa.kz | Система безопасного доступа, 2025. <br />
            Последнее обновление: 02.10.2025 | srk.
          </footer>
        </div>
      </div>
    </>
  );
}