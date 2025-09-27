export default function Dashboard({ user, onLogout }) {
    return (
      <div>
        <h2>Добро пожаловать, {user.fullname} ({user.role})</h2>
        <button onClick={onLogout}>Выйти</button>
  
        {/* Здесь потом будут товары, статистика и т.д. */}
      </div>
    )
  }