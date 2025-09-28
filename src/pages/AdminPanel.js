import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function AdminPanel({ onBack }) {
  const [activeTab, setActiveTab] = useState("sales");
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [barcode, setBarcode] = useState("");
  const [newProduct, setNewProduct] = useState({ name: "", price: "" });

  // состояние для вкладки "добавить"
  const [step, setStep] = useState("barcode");
  const [foundProduct, setFoundProduct] = useState(null);
  const [form, setForm] = useState({
    barcode: "",
    name: "",
    price: "",
    sizes: { S: "", M: "", L: "" },
  });

  // загружаем данные при переключении вкладки
  useEffect(() => {
    if (activeTab === "sales") fetchSales();
    if (activeTab === "products") fetchProducts();
    if (activeTab === "добавить") resetForm(); // сбрасываем форму
  }, [activeTab]);

  async function fetchNew() {
    if (!barcode.trim()) {
      // Если штрих-код пустой → сразу форма добавления
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
      setNewProduct({ name: "", price: "" }); // сброс формы нового товара
    } else {
      // если не найден → форма нового товара
      setFoundProduct(null);
    }
  }
  
  async function saveNewProduct() {
    if (!barcode.trim() || !newProduct.name.trim() || !newProduct.price.trim()) {
      alert("Заполните все поля");
      return;
    }
  
    // создаём товар
    const { data, error } = await supabase
      .from("products")
      .insert([{ name: newProduct.name, barcode }])
      .select()
      .single();
  
    if (error) {
      console.error(error);
      return;
    }
  
    // создаём первый вариант (например, без размера)
    await supabase.from("product_variants").insert([
      {
        product_id: data.id,
        size: "—", // можно оставить прочерк, если размер не нужен
        quantity: 0,
        price: parseFloat(newProduct.price),
      },
    ]);
  
    setNewProduct({ name: "", price: "" });
    setBarcode("");
    fetchProducts(); // обновляем список
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

  // шаги "добавить"
  async function checkBarcode() {
    if (!form.barcode.trim()) {
      alert("Введите штрих-код");
      return;
    }
  
    const { data, error } = await supabase
      .from("products")
      .select("id, name, barcode")
      .eq("barcode", form.barcode)
      .maybeSingle();
  
    if (error) {
      console.error(error);
      return;
    }
  
    if (data) {
      setFoundProduct(data);
      setStep("stock");
    } else {
      setStep("details");
    }
  }

  async function registerProduct() {
    // создаём товар только с name и barcode
    const { data, error } = await supabase
      .from("products")
      .insert([
        {
          name: form.name,
          barcode: form.barcode,
        },
      ])
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
        // Проверяем, есть ли уже вариант
        const { data: existing } = await supabase
          .from("product_variants")
          .select("*")
          .eq("product_id", foundProduct.id)
          .eq("size", size)
          .maybeSingle();
  
        if (existing) {
          // Обновляем количество
          await supabase
            .from("product_variants")
            .update({
              quantity: existing.quantity + quantity,
              price: parseFloat(form.price),
            })
            .eq("id", existing.id);
        } else {
          // Добавляем новый вариант
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
    <div className="admin-panel">
      <div className="admin-header">
        <button
          onClick={() => setActiveTab("sales")}
          className={activeTab === "sales" ? "active" : ""}
        >
          Sales
        </button>
        <button
          onClick={() => setActiveTab("products")}
          className={activeTab === "products" ? "active" : ""}
        >
          Products
        </button>
        <button
          onClick={() => setActiveTab("добавить")}
          className={activeTab === "добавить" ? "active" : ""}
        >
          ➕ Добавить
        </button>
        <button onClick={onBack}>⬅ Назад</button>
      </div>

      <div className="admin-content">
        {activeTab === "sales" && (
          <div>
            <h2>📊 Sales</h2>
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
                    <td>{s.product}</td>
                    <td>{s.barcode}</td>
                    <td>{s.size}</td>
                    <td>{s.quantity}</td>
                    <td>{s.price} ₸</td>
                    <td>{new Date(s.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

{activeTab === "products" && (
  <div>
    <h2>📦 Список товаров</h2>
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
              <td>{p.name}</td>
              <td>{p.barcode}</td>
              <td>{v.size}</td>
              <td>{v.quantity}</td>
              <td>{v.price} ₸</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
)}

{activeTab === "добавить" && (
  <div>
    <h2>➕ Добавить товар</h2>

    {step === "barcode" && (
      <div>
        <input
          type="text"
          placeholder="Введите штрих-код"
          value={form.barcode}
          onChange={(e) => setForm({ ...form, barcode: e.target.value })}
        />
        <button onClick={checkBarcode}>Проверить</button>
      </div>
    )}

    {step === "details" && (
      <div>
        <h3>Новый товар</h3>
        <input
          type="text"
          placeholder="Название"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          type="number"
          placeholder="Цена"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
        />
        <button onClick={registerProduct}>Сохранить товар</button>
        <button onClick={resetForm}>Отмена</button>
      </div>
    )}

    {step === "stock" && (
      <div>
        <h3>{foundProduct?.name}</h3>
        <p>Штрих-код: {form.barcode}</p>
        <p>
          Цена:{" "}
          <input
            type="number"
            value={form.price}
            onChange={(e) =>
              setForm({ ...form, price: e.target.value })
            }
          />{" "}
          ₸
        </p>

        <h4>Количество по размерам:</h4>
        <div>
          <label>S: </label>
          <input
            type="number"
            value={form.sizes.S}
            onChange={(e) =>
              setForm({
                ...form,
                sizes: { ...form.sizes, S: e.target.value },
              })
            }
          />
        </div>
        <div>
          <label>M: </label>
          <input
            type="number"
            value={form.sizes.M}
            onChange={(e) =>
              setForm({
                ...form,
                sizes: { ...form.sizes, M: e.target.value },
              })
            }
          />
        </div>
        <div>
          <label>L: </label>
          <input
            type="number"
            value={form.sizes.L}
            onChange={(e) =>
              setForm({
                ...form,
                sizes: { ...form.sizes, L: e.target.value },
              })
            }
          />
        </div>

        <button onClick={addStock}>Добавить на склад</button>
        <button onClick={resetForm}>Отмена</button>
      </div>
    )}
  </div>
)}
      </div>
    </div>
  );
}