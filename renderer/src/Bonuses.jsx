import React, { useState, useEffect } from 'react';
import { FaSearch, FaUserPlus, FaCoins, FaGift, FaRedo, FaChartPie, FaHistory, FaEdit, FaStar } from 'react-icons/fa';

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

export default function Bonuses() {
  const [phone, setPhone] = useState('+7');
  const [customer, setCustomer] = useState(null);
  const [monthlySpend, setMonthlySpend] = useState(0);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [bonusHistory, setBonusHistory] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [newName, setNewName] = useState('');
  const [bonusPercentage, setBonusPercentage] = useState(1);
  const [premiumBonusPercentage, setPremiumBonusPercentage] = useState(10);
  const [premiumThreshold, setPremiumThreshold] = useState(100000);
  const [report, setReport] = useState({ accrued: 0, debited: 0, totalBalance: 0 });
  const [period, setPeriod] = useState('day');

  // State for bonus operations
  const [accrueAmount, setAccrueAmount] = useState('');
  const [debitAmount, setDebitAmount] = useState('');
  
  const [activeTab, setActiveTab] = useState('actions');


  // Получаем процент бонусов при загрузке компонента
  useEffect(() => {
    async function fetchBonusSettings() {
      const percentage = await window.api.getSetting('bonus_percentage');
      if (percentage) setBonusPercentage(parseFloat(percentage));

      const premiumPercentage = await window.api.getSetting('premium_bonus_percentage');
      if (premiumPercentage) setPremiumBonusPercentage(parseFloat(premiumPercentage));
      
      const threshold = await window.api.getSetting('premium_threshold_amount');
      if (threshold) setPremiumThreshold(parseFloat(threshold));
    }
    fetchBonusSettings();
  }, []);

  // Загружаем отчет при изменении периода
  useEffect(() => {
    async function fetchReport() {
      const data = await window.api.getBonusReport(period);
      setReport(data);
    }
    fetchReport();
  }, [period]);

  const handlePhoneChange = (e) => {
    const { value } = e.target;
    if (!value.startsWith('+7')) {
      setPhone('+7');
    } else {
      setPhone(value);
    }
  };

  const handleSearch = async () => {
    if (!phone || phone.length < 12) return; // Простая проверка длины
    const foundCustomer = await window.api.findCustomerByPhone(phone);
    if (foundCustomer) {
      const customerDetails = await window.api.getCustomerDetails(foundCustomer.id);
      setCustomer(customerDetails);
      const spend = await window.api.getCustomerMonthlySpend(foundCustomer.id);
      setMonthlySpend(spend);
      const pHistory = await window.api.getCustomerPurchaseHistory(foundCustomer.id);
      setPurchaseHistory(pHistory);
      const bHistory = await window.api.getCustomerBonusHistory(foundCustomer.id);
      setBonusHistory(bHistory);
      setNotFound(false);
    } else {
      setCustomer(null);
      setNotFound(true);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newName) return;
    const newCustomer = await window.api.createCustomer({ name: newName, phone });
    const customerDetails = await window.api.getCustomerDetails(newCustomer.id);
    setCustomer(customerDetails);
    setMonthlySpend(0); // Новый клиент, трат еще нет
    setPurchaseHistory([]);
    setBonusHistory([]);
    setNotFound(false);
    setNewName('');
  };

  const handleAccrue = async () => {
    if (!accrueAmount || accrueAmount <= 0) return;
    try {
      const result = await window.api.addBonusTransaction({
        customerId: customer.id,
        type: 'accrual',
        amount: parseFloat(accrueAmount),
        purchaseAmount: null // Manual accrual
      });
      if (result.success) {
        setCustomer(await window.api.getCustomerDetails(customer.id));
        setBonusHistory(await window.api.getCustomerBonusHistory(customer.id));
        setAccrueAmount('');
      } else {
        const userFriendlyMessage = extractUserFriendlyMessage(result.message);
        alert(userFriendlyMessage);
      }
    } catch (err) {
      const userFriendlyMessage = extractUserFriendlyMessage(err);
      alert(userFriendlyMessage);
    }
  };

  const handleDebit = async () => {
    if (!debitAmount || debitAmount <= 0) return;
    if (parseFloat(debitAmount) > customer.bonus_points) {
      alert('Недостаточно бонусов для списания!');
      return;
    }
    try {
      const result = await window.api.addBonusTransaction({
        customerId: customer.id,
        type: 'debit',
        amount: parseFloat(debitAmount),
        purchaseAmount: null
      });
      if (result.success) {
        setCustomer(await window.api.getCustomerDetails(customer.id));
        setBonusHistory(await window.api.getCustomerBonusHistory(customer.id));
        setDebitAmount('');
      } else {
        const userFriendlyMessage = extractUserFriendlyMessage(result.message);
        alert(userFriendlyMessage);
      }
    } catch (err) {
      const userFriendlyMessage = extractUserFriendlyMessage(err);
      alert(userFriendlyMessage);
    }
  };
  
  const resetSearch = () => {
    setPhone('+7');
    setCustomer(null);
    setNotFound(false);
    setNewName('');
    setAccrueAmount('');
    setDebitAmount('');
    setPurchaseHistory([]);
    setBonusHistory([]);
    setMonthlySpend(0);
  };

  const periods = [
    { key: 'day', label: 'За день' },
    { key: 'week', label: 'За неделю' },
    { key: 'month', label: 'За месяц' },
  ];


  return (
    <div className="p-4 sm:p-8">
      <div className="max-w-7xl mx-auto lg:grid lg:grid-cols-3 lg:gap-8">
        
        {/* Левая колонка - Карточка клиента или поиск */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-lg border-t-4 border-blue-500 p-6 relative">
            <div className="flex items-center gap-3 mb-6">
              <FaGift size={28} className="text-blue-600" />
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Бонусная система</h2>
            </div>
            
            {/* Search Bar */}
            {!customer && (
              <div className="max-w-md mx-auto">
                <div className="flex items-center space-x-2">
                  <input
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="+7 XXX XXX XX XX"
                    className="flex-grow p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <button
                    onClick={handleSearch}
                    className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition shadow"
                  >
                    <FaSearch size={24} />
                  </button>
                </div>
              </div>
            )}

            {/* Not Found Message */}
            {notFound && (
              <div className="max-w-md mx-auto mt-6 bg-gray-50 p-6 rounded-2xl border border-gray-200 text-center">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Клиент не найден</h2>
                <p className="text-gray-500 mb-4">Создать новую бонусную карту для номера <span className="font-bold">{phone}</span>?</p>
                <div className="flex flex-col space-y-3">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Введите имя клиента"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                  />
                  <button
                    onClick={handleCreateCustomer}
                    className="flex items-center justify-center p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition shadow"
                  >
                    <FaUserPlus className="mr-2" />
                    Создать карту
                  </button>
                </div>
              </div>
            )}

            {/* Customer Card */}
            {customer && (
              <div>
                <button onClick={resetSearch} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition" title="Искать другого клиента">
                  <FaRedo size={20} />
                </button>
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-800">{customer.name}</h2>
                    <p className="text-lg text-gray-500">{customer.phone}</p>
                    <div className="mt-2 text-xs text-gray-500">
                      <span>Карта создана: {new Date(customer.registration_date).toLocaleDateString()}</span>
                      <span className="mx-2">|</span>
                      <span>Покупок: {customer.transaction_count}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 rounded-xl text-right shadow-lg min-w-[200px]">
                      <p className="text-sm font-medium opacity-80">Бонусный баланс</p>
                      <p className="text-3xl font-extrabold tracking-tight">
                        {customer.bonus_points.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-gray-100 text-gray-800 p-3 rounded-xl text-right border">
                       <p className="text-xs font-medium text-gray-600">Потрачено в этом месяце</p>
                       <p className="text-xl font-bold">
                         {monthlySpend.toFixed(2)} тг
                       </p>
                    </div>
                    {monthlySpend >= premiumThreshold && (
                      <div className="bg-yellow-100 text-yellow-800 p-3 rounded-xl text-center border border-yellow-200 animate-pulse">
                        <p className="text-xs font-bold flex items-center justify-center gap-2">
                          <FaStar />
                          <span>Активен кэшбэк {premiumBonusPercentage}%</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button
                      onClick={() => setActiveTab('actions')}
                      className={`flex items-center gap-2 py-4 px-1 border-b-2 font-semibold text-sm transition ${
                        activeTab === 'actions'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <FaEdit />
                      Управление бонусами
                    </button>
                    <button
                      onClick={() => setActiveTab('purchaseHistory')}
                      className={`flex items-center gap-2 py-4 px-1 border-b-2 font-semibold text-sm transition ${
                        activeTab === 'purchaseHistory'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <FaHistory />
                      История покупок
                    </button>
                    <button
                      onClick={() => setActiveTab('bonusHistory')}
                      className={`flex items-center gap-2 py-4 px-1 border-b-2 font-semibold text-sm transition ${
                        activeTab === 'bonusHistory'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <FaCoins />
                      История бонусов
                    </button>
                  </nav>
                </div>
                
                {/* Tab Content */}
                <div className="py-6">
                  {activeTab === 'actions' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Accrue Bonuses */}
                      <div className="bg-gray-50 p-6 rounded-xl border">
                        <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center"><FaGift className="mr-2 text-green-500" />Начислить бонусы</h3>
                        <div className="space-y-3">
                          <input
                            type="number"
                            value={accrueAmount}
                            onChange={(e) => setAccrueAmount(e.target.value)}
                            placeholder="Количество бонусов"
                            className="w-full p-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                          />
                        </div>
                        <button
                          onClick={handleAccrue}
                          className="w-full mt-4 p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition shadow"
                        >
                          Зачислить
                        </button>
                      </div>

                      {/* Debit Bonuses */}
                      <div className="bg-gray-50 p-6 rounded-xl border">
                        <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center"><FaCoins className="mr-2 text-yellow-500" />Списать бонусы</h3>
                        <input
                          type="number"
                          value={debitAmount}
                          onChange={(e) => setDebitAmount(e.target.value)}
                          placeholder="Сумма для списания"
                          className="w-full p-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition"
                        />
                        <button
                          onClick={handleDebit}
                          className="w-full mt-4 p-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition shadow"
                        >
                          Списать
                        </button>
                      </div>
                    </div>
                  )}
                  {activeTab === 'purchaseHistory' && (
                     purchaseHistory.length > 0 ? (
                      <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
                        {Object.entries(
                          purchaseHistory.reduce((acc, item) => {
                            const key = item.batch_id || `delivery-${item.delivery_id}`;
                            if (!acc[key]) {
                              acc[key] = {
                                date: item.date,
                                type: item.delivery_id ? 'Доставка' : 'Покупка',
                                id: item.delivery_id || item.batch_id.split('-')[1],
                                items: []
                              };
                            }
                            acc[key].items.push(item);
                            return acc;
                          }, {})
                        ).map(([key, group]) => (
                          <div key={key} className="bg-white p-4 rounded-lg border shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-bold text-gray-800">
                                {group.type} от {new Date(group.date).toLocaleDateString()}
                              </span>
                              <span className="text-sm text-gray-500">
                                {new Date(group.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <ul className="divide-y divide-gray-200">
                              {group.items.map((item, index) => (
                                <li key={index} className="py-2 flex justify-between items-center text-sm">
                                  <span>{item.product_name} <span className="text-gray-500">x{item.quantity}</span></span>
                                  <span className="font-semibold">{(item.quantity * item.selling_price).toFixed(2)} тг</span>
                                </li>
                              ))}
                            </ul>
                            <div className="text-right font-bold text-blue-600 mt-2 pt-2 border-t border-gray-200">
                              Итого: {group.items.reduce((sum, item) => sum + item.quantity * item.selling_price, 0).toFixed(2)} тг
                            </div>
                          </div>
                        ))}
                      </div>
                     ) : (
                       <p className="text-center text-gray-500 py-8">История покупок пуста.</p>
                     )
                  )}
                   {activeTab === 'bonusHistory' && (
                     bonusHistory.length > 0 ? (
                      <div className="max-h-96 overflow-y-auto pr-2">
                        <ul className="divide-y divide-gray-200">
                          {bonusHistory.map((transaction) => (
                            <li key={transaction.id} className="py-3 flex justify-between items-center">
                              <div>
                                <p className={`font-semibold ${transaction.type === 'accrual' ? 'text-green-600' : 'text-yellow-600'}`}>
                                  {transaction.type === 'accrual' ? 'Начисление' : 'Списание'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(transaction.date).toLocaleString()}
                                </p>
                              </div>
                              <p className={`text-lg font-bold ${transaction.type === 'accrual' ? 'text-green-600' : 'text-yellow-600'}`}>
                                {transaction.type === 'accrual' ? '+' : '-'}{transaction.amount.toFixed(2)}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                     ) : (
                       <p className="text-center text-gray-500 py-8">История бонусов пуста.</p>
                     )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Правая колонка - Отчет */}
        <div className="mt-8 lg:mt-0">
          <div className="bg-white p-6 rounded-2xl shadow-lg border-t-4 border-green-500">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
              <h3 className="text-xl font-bold text-gray-800 flex items-center"><FaChartPie className="mr-3 text-gray-600" />Сводный отчет</h3>
              <div className="flex items-center gap-2">
                {periods.map(p => (
                  <button
                    key={p.key}
                    onClick={() => setPeriod(p.key)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                      period === p.key
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4 text-center">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm text-green-700 font-medium">Начислено ({periods.find(p => p.key === period).label})</p>
                <p className="text-2xl font-bold text-green-600">{report.accrued.toFixed(2)}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-700 font-medium">Списано ({periods.find(p => p.key === period).label})</p>
                <p className="text-2xl font-bold text-yellow-600">{report.debited.toFixed(2)}</p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                <p className="text-sm text-indigo-700 font-medium">Общий баланс клиентов</p>
                <p className="text-2xl font-bold text-indigo-600">{report.totalBalance.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
