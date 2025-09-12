import React, { useState, useEffect } from "react";
import { FaCog, FaDatabase, FaDownload, FaUpload, FaGift, FaCheckCircle } from "react-icons/fa";
import Swal from 'sweetalert2';

// Функция для извлечения пользовательского сообщения из ошибки
const extractUserFriendlyMessage = (error) => {
  if (!error) return "Произошла неизвестная ошибка";
  
  // Если это объект ошибки с сообщением
  if (error.message) {
    const message = error.message;
    
    // Проверяем, содержит ли сообщение префикс "Не удалось"
    if (message.startsWith("Не удалось")) {
      return message;
    }
    
    // Для других ошибок возвращаем общее сообщение
    return "Произошла ошибка при выполнении операции. Пожалуйста, попробуйте еще раз.";
  }
  
  // Если это строка
  if (typeof error === 'string') {
    // Проверяем, содержит ли строка префикс "Не удалось"
    if (error.startsWith("Не удалось")) {
      return error;
    }
    
    // Для других строк возвращаем общее сообщение
    return "Произошла ошибка при выполнении операции. Пожалуйста, попробуйте еще раз.";
  }
  
  // По умолчанию
  return "Произошла неизвестная ошибка";
};

export default function Settings() {
  const [bonusPercentage, setBonusPercentage] = useState('');
  const [premiumBonusPercentage, setPremiumBonusPercentage] = useState('');
  const [premiumThreshold, setPremiumThreshold] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      const percentage = await window.api.getSetting('bonus_percentage');
      if (percentage) setBonusPercentage(percentage);

      const premiumPercentage = await window.api.getSetting('premium_bonus_percentage');
      if (premiumPercentage) setPremiumBonusPercentage(premiumPercentage);

      const threshold = await window.api.getSetting('premium_threshold_amount');
      if (threshold) setPremiumThreshold(threshold);
      
      const maxDisc = await window.api.getSetting('max_discount');
      if (maxDisc) setMaxDiscount(maxDisc);
    }
    fetchSettings();
  }, []);

  const handleBackup = async () => {
    try {
      await window.api.backupDatabase();
    } catch (err) {
      const userFriendlyMessage = extractUserFriendlyMessage(err);
      Swal.fire({
        title: 'Ошибка резервного копирования!',
        text: userFriendlyMessage,
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  };

  const handleRestore = async () => {
    Swal.fire({
      title: 'Подтвердите восстановление',
      text: "Вы уверены, что хотите восстановить данные из резервной копии? Все текущие данные будут безвозвратно удалены. Это действие нельзя отменить.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Да, восстановить!',
      cancelButtonText: 'Отмена'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await window.api.restoreDatabase();
        } catch (err) {
          const userFriendlyMessage = extractUserFriendlyMessage(err);
          Swal.fire({
            title: 'Ошибка восстановления!',
            text: userFriendlyMessage,
            icon: 'error',
            confirmButtonText: 'OK'
          });
        }
      }
    });
  };

  const handleSaveSettings = async () => {
    const settingsToSave = [];
    // Валидация для стандартного процента кэшбэка (0-100%)
    if (bonusPercentage !== '' && !isNaN(bonusPercentage) && parseFloat(bonusPercentage) >= 0 && parseFloat(bonusPercentage) <= 100) {
      settingsToSave.push(window.api.setSetting({ key: 'bonus_percentage', value: bonusPercentage }));
    }
    // Валидация для повышенного процента кэшбэка (0-200%)
    if (premiumBonusPercentage !== '' && !isNaN(premiumBonusPercentage) && parseFloat(premiumBonusPercentage) >= 0 && parseFloat(premiumBonusPercentage) <= 200) {
      settingsToSave.push(window.api.setSetting({ key: 'premium_bonus_percentage', value: premiumBonusPercentage }));
    }
    // Валидация для пороговой суммы: проверяем, что значение не отрицательное
    if (premiumThreshold !== '' && !isNaN(premiumThreshold) && parseFloat(premiumThreshold) >= 0) {
      settingsToSave.push(window.api.setSetting({ key: 'premium_threshold_amount', value: premiumThreshold }));
    }
    // Валидация для максимальной скидки (0-100%)
    if (maxDiscount !== '' && !isNaN(maxDiscount) && parseFloat(maxDiscount) >= 0 && parseFloat(maxDiscount) <= 100) {
      settingsToSave.push(window.api.setSetting({ key: 'max_discount', value: maxDiscount }));
    }
    
    if (settingsToSave.length > 0) {
      try {
        await Promise.all(settingsToSave);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000); // Спрятать сообщение через 2 секунды
      } catch (err) {
        const userFriendlyMessage = extractUserFriendlyMessage(err);
        Swal.fire({
          title: 'Ошибка!',
          text: userFriendlyMessage,
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    }
  };

  return (
    <div className="flex justify-center items-start min-h-screen py-4 sm:py-8">
      <div className="max-w-5xl w-full p-4 sm:p-8">
        <div className="flex items-center gap-4 mb-8">
          <FaCog size={36} className="text-gray-700" />
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Настройки</h2>
        </div>

        {/* Бонусная система */}
        <div className="mb-10 p-6 bg-white border border-gray-200 rounded-2xl shadow-lg">
          <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center">
            <FaGift className="mr-3 text-indigo-500" />
            Бонусная система
          </h3>
          <p className="text-gray-600 mb-6">Настройте процент кэшбэка и условия его начисления для клиентов.</p>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="bonus-percentage" className="block text-sm font-medium text-gray-700 mb-1">
                  Стандартный кэшбэк, %
                </label>
                <input
                  type="number"
                  id="bonus-percentage"
                  value={bonusPercentage}
                  onChange={(e) => setBonusPercentage(e.target.value)}
                  className="w-full p-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  placeholder="Напр. 1"
                  min="0"
                  max="100"
                />
                {bonusPercentage !== '' && (isNaN(bonusPercentage) || parseFloat(bonusPercentage) < 0 || parseFloat(bonusPercentage) > 100) && (
                  <p className="text-xs text-red-500 mt-1">Процент кэшбэка должен быть от 0 до 100</p>
                )}
              </div>
              <div>
                <label htmlFor="premium-bonus-percentage" className="block text-sm font-medium text-gray-700 mb-1">
                  Повышенный кэшбэк, %
                </label>
                <input
                  type="number"
                  id="premium-bonus-percentage"
                  value={premiumBonusPercentage}
                  onChange={(e) => setPremiumBonusPercentage(e.target.value)}
                  className="w-full p-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  placeholder="Напр. 5"
                  min="0"
                  max="200"
                />
                {premiumBonusPercentage !== '' && (isNaN(premiumBonusPercentage) || parseFloat(premiumBonusPercentage) < 0 || parseFloat(premiumBonusPercentage) > 200) && (
                  <p className="text-xs text-red-500 mt-1">Процент кэшбэка должен быть от 0 до 200</p>
                )}
              </div>
            </div>
            <div>
              <label htmlFor="premium-threshold" className="block text-sm font-medium text-gray-700 mb-1">
                Пороговая сумма для повышенного кэшбэка, тг
              </label>
              <p className="text-xs text-gray-500 mb-1">Сумма трат клиента за месяц, после которой активируется повышенный кэшбэк.</p>
              <input
                type="number"
                id="premium-threshold"
                value={premiumThreshold}
                onChange={(e) => setPremiumThreshold(e.target.value)}
                className="w-full md:w-1/2 p-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                placeholder="Напр. 100000"
                min="0"
              />
              {premiumThreshold !== '' && (isNaN(premiumThreshold) || parseFloat(premiumThreshold) < 0) && (
                <p className="text-xs text-red-500 mt-1">Пороговая сумма должна быть неотрицательным числом</p>
              )}
            </div>
            <div>
              <label htmlFor="max-discount" className="block text-sm font-medium text-gray-700 mb-1">
                Максимальная скидка, %
              </label>
              <p className="text-xs text-gray-500 mb-1">Максимальный процент скидки, который можно применить к товару.</p>
              <input
                type="number"
                id="max-discount"
                value={maxDiscount}
                onChange={(e) => setMaxDiscount(e.target.value)}
                className="w-full md:w-1/2 p-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                placeholder="Напр. 50"
                min="0"
                max="100"
              />
              {maxDiscount !== '' && (isNaN(maxDiscount) || parseFloat(maxDiscount) < 0 || parseFloat(maxDiscount) > 100) && (
                <p className="text-xs text-red-500 mt-1">Максимальная скидка должна быть от 0 до 100</p>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
             <button 
                onClick={handleSaveSettings}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200"
              >
                Сохранить все
              </button>
            {saveSuccess && (
              <div className="flex items-center text-green-600">
                <FaCheckCircle className="mr-2" />
                <span>Настройки успешно сохранены!</span>
              </div>
            )}
          </div>
        </div>

        {/* Управление данными */}
        <div className="mb-10 p-6 bg-white border border-gray-200 rounded-2xl shadow-lg">
          <h3 className="text-xl font-bold text-gray-800 mb-2">Управление данными</h3>
          <p className="text-gray-600 mb-6">Сохраните все ваши данные в один файл или восстановите их из резервной копии.</p>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Создать резервную копию */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <FaDownload className="text-blue-600" size={20}/>
                <h4 className="font-bold text-lg text-gray-700">Создать резервную копию</h4>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Сохранить полную копию базы данных (`store.db`) в безопасное место. 
                Это позволит вам перенести данные на другой компьютер.
              </p>
              <button 
                onClick={handleBackup}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                <FaDownload /> Скачать копию
              </button>
            </div>

            {/* Восстановить из копии */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <FaUpload className="text-red-600" size={20}/>
                <h4 className="font-bold text-lg text-gray-700">Восстановить из копии</h4>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                <span className="font-bold text-red-600">Внимание:</span> все текущие данные будут полностью заменены данными из выбранного файла.
              </p>
              <button 
                onClick={handleRestore}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                <FaUpload /> Выбрать файл...
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
