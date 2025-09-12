import React from "react";

export default function Welcome({ onStart }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 to-blue-500 p-4">
      <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-xl text-center max-w-md w-full">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-800">Добро пожаловать!</h1>
        <p className="mb-8 text-gray-600">Быстрый учёт и анализ продаж для вашего магазина.</p>
        <button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-semibold shadow-md hover:shadow-lg transition-all"
          onClick={onStart}
        >
          Начать работу
        </button>
      </div>
    </div>
  );
}
