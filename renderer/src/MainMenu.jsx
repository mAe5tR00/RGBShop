import React from "react";
import { FaBook, FaCashRegister, FaChartLine, FaCog, FaShippingFast, FaGift } from "react-icons/fa";

export default function MainMenu({ onSelect }) {
  const menuItems = [
    { text: 'Продажи', icon: <FaCashRegister size={36} className="text-yellow-500 mb-2" />, route: '/sales', color: "from-yellow-100 to-yellow-300" },
    { text: 'Доставка', icon: <FaShippingFast size={36} className="text-blue-500 mb-2" />, route: '/delivery', color: "from-blue-100 to-blue-300" },
    { text: 'Бонусы', icon: <FaGift size={36} className="text-pink-500 mb-2" />, route: '/bonuses', color: "from-pink-100 to-pink-300" },
    { text: 'Каталог', icon: <FaBook size={36} className="text-green-500 mb-2" />, route: '/catalog', color: "from-green-100 to-green-300" },
    { text: 'Статистика', icon: <FaChartLine size={36} className="text-purple-500 mb-2" />, route: '/statistics', color: "from-purple-100 to-purple-300" },
    { text: 'Настройки', icon: <FaCog size={36} className="text-gray-500 mb-2" />, route: '/settings', color: "from-gray-100 to-gray-300" },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-200 to-blue-500 p-4 sm:py-8">
      <h1 className="text-3xl sm:text-4xl font-bold mb-8 sm:mb-10 text-white text-shadow-lg">Главное меню</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {menuItems.map(item => (
          <button
            key={item.route}
            onClick={() => onSelect(item.route)}
            className={`w-full sm:w-72 md:w-80 h-48 rounded-2xl shadow-xl p-6 sm:p-8 flex flex-col items-center justify-center bg-gradient-to-br ${item.color} hover:shadow-2xl hover:-translate-y-2 transition-all duration-300`}
          >
            {item.icon}
            <div className="text-lg sm:text-xl font-bold mb-1 text-gray-800">{item.text}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
