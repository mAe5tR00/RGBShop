import React, { useState, useEffect, createContext, useContext } from "react";
import Catalog from "./Catalog";
import Sales from "./Sales";
import Statistics from "./Statistics";
import Welcome from "./Welcome";
import MainMenu from "./MainMenu";
import Settings from "./Settings"; // Импортируем новый компонент
import Delivery from "./Delivery"; // Импортируем новый компонент
import Bonuses from "./Bonuses"; // Импортируем компонент бонусов
import Help from "./Help"; // Импортируем компонент помощи
import { useNavigate, useLocation, Routes, Route, Navigate } from "react-router-dom";
import { FaHome, FaBook, FaCashRegister, FaChartLine, FaCog, FaShippingFast, FaGift, FaQuestionCircle } from "react-icons/fa";

// Глобальный контекст ошибок
export const ErrorContext = createContext({ setError: () => {} });

function GlobalError({ error, onClose }) {
  if (!error) return null;
  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999 }}>
      <div style={{ background: '#fee', color: '#900', padding: 16, borderRadius: 8, boxShadow: '0 2px 8px #0002' }}>
        <strong>Ошибка:</strong> {error}
        <button style={{ marginLeft: 16 }} onClick={onClose}>Закрыть</button>
      </div>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [started, setStarted] = useState(false);
  const [globalError, setGlobalError] = useState("");

  // Welcome screen logic
  useEffect(() => {
    if (!started && location.pathname !== "/welcome") {
      navigate("/welcome", { replace: true });
    }
  }, [started, location.pathname, navigate]);

  // После старта сразу переходим на /menu
  useEffect(() => {
    if (started && location.pathname === "/welcome") {
      navigate("/menu", { replace: true });
    }
  }, [started, location.pathname, navigate]);

  const showSidebar = started && location.pathname !== "/menu" && location.pathname !== "/welcome";

  const menuItems = [
    { text: 'Главный экран', icon: FaHome, route: '/menu' },
    { text: 'Продажи', icon: FaCashRegister, route: '/sales' },
    { text: 'Доставка', icon: FaShippingFast, route: '/delivery' },
    { text: 'Бонусы', icon: FaGift, route: '/bonuses' },
    { text: 'Каталог', icon: FaBook, route: '/catalog' },
    { text: 'Статистика', icon: FaChartLine, route: '/statistics' },
    { text: 'Настройки', icon: FaCog, route: '/settings' },
    { text: 'Помощь', icon: FaQuestionCircle, route: '/help' },
  ];

  return (
    <ErrorContext.Provider value={{ setError: setGlobalError }}>
      <GlobalError error={globalError} onClose={() => setGlobalError("")} />
      <div className="flex min-h-screen bg-gradient-to-br from-gray-100 to-blue-200">
        {showSidebar && (
          <aside className="group w-16 hover:w-56 bg-white/90 backdrop-blur-sm shadow-lg flex flex-col transition-all duration-300 ease-in-out">
            <nav className="flex-grow pt-8 space-y-2">
              {menuItems.map(item => {
                const isActive = location.pathname === item.route;
                return (
                  <button
                    key={item.route}
                    onClick={() => navigate(item.route)}
                    title={item.text}
                    className={`w-full flex items-center h-12 px-4 transition-colors duration-200 ${
                      isActive
                        ? "bg-blue-500 text-white"
                        : "text-gray-600 hover:bg-blue-100"
                    }`}
                  >
                    <item.icon size={24} className="flex-shrink-0" />
                    <span className="ml-4 text-lg font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      {item.text}
                    </span>
                  </button>
                )
              })}
            </nav>
          </aside>
        )}
        <main className="flex-grow">
          <Routes>
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/delivery" element={<Delivery />} />
            <Route path="/bonuses" element={<Bonuses />} />
            <Route path="/help" element={<Help />} />
            <Route path="/menu" element={<MainMenu onSelect={route => navigate(route)} />} />
            <Route path="/welcome" element={
              !started ? <Welcome onStart={() => setStarted(true)} /> : <Navigate to="/menu" replace />
            } />
            <Route path="*" element={<Navigate to="/welcome" replace />} />
          </Routes>
        </main>
      </div>
    </ErrorContext.Provider>
  );
}
