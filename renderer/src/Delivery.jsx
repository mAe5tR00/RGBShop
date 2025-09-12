import React, { useEffect, useState, useRef, useContext } from "react";
import { FaShippingFast, FaCheckCircle, FaSearch, FaPlus, FaMinus, FaHistory, FaCheck, FaShoppingCart, FaUserPlus, FaStar } from "react-icons/fa";
import Swal from 'sweetalert2';
import { ErrorContext } from "./App";

// Функция для правильного склонения единиц измерения
const getPluralizedUnit = (count, unit) => {
  if (!unit) return "";
  const forms = {
    'литр': ['литр', 'литра', 'литров'],
    'пачка': ['пачка', 'пачки', 'пачек'],
    'бутылка': ['бутылка', 'бутылки', 'бутылок'],
    'банка': ['банка', 'банки', 'банок'],
    'кг': ['кг', 'кг', 'кг'],
    'шт': ['шт', 'шт', 'шт'],
    'товар': ['товар', 'товара', 'товаров'],
  };

  const unitLower = unit.toLowerCase();
  const unitForms = forms[unitLower];
  if (!unitForms) {
    return unit; // Возвращаем исходное, если нет в словаре
  }

  // Для дробных чисел всегда используем родительный падеж ед. числа (1.5 литра)
  if (!Number.isInteger(count)) {
    return unitForms[1];
  }

  const absCount = Math.abs(count);

  // Правила для русского языка
  if (absCount % 100 >= 11 && absCount % 100 <= 19) {
    return unitForms[2];
  }
  const lastDigit = absCount % 10;
  if (lastDigit === 1) {
    return unitForms[0];
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return unitForms[1];
  }
  return unitForms[2];
};

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

export default function Delivery() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ category_id: "", product_id: "", quantity: "1" });
  const [salesToday, setSalesToday] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [showProductList, setShowProductList] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [quickSaleSuccess, setQuickSaleSuccess] = useState(null);
  const productInputRef = useRef(null);

  // Состояние для корзины
  const [cart, setCart] = useState([]);
  
  // Состояния для модального окна скидки
  const [isDiscountModalOpen, setDiscountModalOpen] = useState(false);
  const [discountValue, setDiscountValue] = useState('');
  const [discountItemIndex, setDiscountItemIndex] = useState(null);
  const [discountError, setDiscountError] = useState('');
  
  // Состояния для бонусов, скопированные из Sales.jsx
  const [isBonusClient, setIsBonusClient] = useState(false);
  const [bonusClientPhone, setBonusClientPhone] = useState('+7');
  const [bonusClient, setBonusClient] = useState(null);
  const [bonusClientNotFound, setBonusClientNotFound] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [bonusesToDebit, setBonusesToDebit] = useState('');
  const [bonusPercentage, setBonusPercentage] = useState(1);
  const [premiumBonusPercentage, setPremiumBonusPercentage] = useState(5);
  const [premiumThreshold, setPremiumThreshold] = useState(100000);
  const [maxDiscount, setMaxDiscount] = useState(100);
  const [effectiveBonusPercentage, setEffectiveBonusPercentage] = useState(1);

  const { setError: setGlobalError } = useContext(ErrorContext);

  const fetchTodaysSales = async (saleType) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const todaysSales = await window.api.getSales({ 
      dateFrom: todayStart.toISOString(), 
      dateTo: todayEnd.toISOString(),
      saleType
    });

    // Новая логика группировки по delivery_id
    const groupedByDelivery = todaysSales.reduce((acc, sale) => {
      if (!sale.delivery_id) return acc; // Пропускаем продажи без доставки
      if (!acc[sale.delivery_id]) {
        acc[sale.delivery_id] = {
          delivery_id: sale.delivery_id,
          items: [],
          totalItems: 0,
          lastTime: new Date(sale.date).getTime()
        };
      }
      acc[sale.delivery_id].items.push(sale);
      acc[sale.delivery_id].totalItems += 1;
      if (new Date(sale.date).getTime() > acc[sale.delivery_id].lastTime) {
        acc[sale.delivery_id].lastTime = new Date(sale.date).getTime();
      }
      return acc;
    }, {});

    const sortedDeliveries = Object.values(groupedByDelivery).sort((a, b) => b.lastTime - a.lastTime);
    setSalesToday(sortedDeliveries);
  };

  useEffect(() => {
    (async () => {
      const cats = await window.api.getCategories();
      setCategories(cats);
      if (cats.length) setForm(f => ({ ...f, category_id: cats[0].id }));
      
      const bonusPerc = await window.api.getSetting('bonus_percentage');
      const premiumBonusPerc = await window.api.getSetting('premium_bonus_percentage');
      const threshold = await window.api.getSetting('premium_threshold_amount');
      const maxDisc = await window.api.getSetting('max_discount');

      const standardPerc = parseFloat(bonusPerc) || 1;
      const premiumPerc = parseFloat(premiumBonusPerc) || 5;
      const premiumThresh = parseFloat(threshold) || 100000;
      const maxDiscValue = parseFloat(maxDisc) || 100;

      setBonusPercentage(standardPerc);
      setPremiumBonusPercentage(premiumPerc);
      setPremiumThreshold(premiumThresh);
      setMaxDiscount(maxDiscValue);
      setEffectiveBonusPercentage(standardPerc);
    })();
  }, []);

  useEffect(() => {
    if (form.category_id) {
      (async () => {
        const prods = await window.api.getProducts(form.category_id);
        setProducts(prods);
        if (prods.length) setForm(f => ({ ...f, product_id: prods[0].id }));
      })();
    }
  }, [form.category_id]);

  useEffect(() => {
    // Загружаем все товары для глобального поиска
    window.api.getProducts().then(setAllProducts);
    // Загружаем продажи за сегодня при первой загрузке
    fetchTodaysSales('delivery');
  }, []);

  const handleChange = e => {
    const { name, value } = e.target;
    // Валидация для поля количества
    if (name === 'quantity') {
      // Проверяем, что введено положительное число или пустая строка
      if (value === '' || (parseFloat(value) >= 0)) {
        setForm(f => ({ ...f, [name]: value }));
      }
      return;
    }
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSale = async (eOrParams) => {
    // Теперь эта функция добавляет в корзину
    try {
      eOrParams.preventDefault();
      setError("");
      const { product_id, category_id, quantity } = form;
      if (!product_id || !category_id || !quantity) return setError("Заполните все поля");
      
      // Валидация количества
      const quantityNum = parseFloat(quantity);
      if (isNaN(quantityNum) || quantityNum <= 0) {
        return setError("Количество должно быть положительным числом");
      }
      
      const product = allProducts.find(p => p.id === Number(product_id));
      if (!product) return setError("Товар не найден");
      
      // Проверка цены товара
      if (product.selling_price < 0) {
        return setError("Цена товара не может быть отрицательной");
      }

      // Добавляем в корзину
      setCart(currentCart => {
        const existingItem = currentCart.find(item => item.product_id === product.id);
        if (existingItem) {
          // Если товар уже есть, увеличиваем количество
          return currentCart.map(item => 
            item.product_id === product.id 
              ? { ...item, quantity: item.quantity + quantityNum } 
              : item
          );
        } else {
          // Иначе, добавляем новый товар
          return [...currentCart, {
            product_id: product.id,
            name: product.name,
            unit: product.unit,
            quantity: quantityNum,
            selling_price: product.selling_price,
            discount: 0 // Добавляем поле скидки по умолчанию
          }];
        }
      });
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 1000);
      setForm(f => ({ ...f, quantity: "1" })); // Сброс количества к 1
    } catch(e) {
      setError("Ошибка при добавлении товара: " + e.message);
      console.error("Ошибка при добавлении товара:", e);
    }
  };

  const handleCreateDelivery = async () => {
    if (cart.length === 0) {
      setError("Корзина пуста");
      return;
    }
    setError("");
    
    let bonusInfo = null;
    if (isBonusClient && bonusClient) {
      const debitAmount = parseFloat(bonusesToDebit) || 0;
      if (debitAmount > bonusClient.bonus_points) {
        return setError("Недостаточно бонусов для списания");
      }
      bonusInfo = {
        customerId: bonusClient.id,
        debitAmount: debitAmount
      };
    }
    
    try {
      const result = await window.api.addDelivery({ items: cart, bonusInfo });
      if (result.success) {
        setCart([]); // Очищаем корзину
        setIsBonusClient(false);
        setBonusClient(null);
        setBonusClientPhone('+7');
        setBonusesToDebit('');
        fetchTodaysSales('delivery'); // Обновляем список доставок
      } else {
        const userFriendlyMessage = extractUserFriendlyMessage(result.message);
        setError(userFriendlyMessage);
        console.error("Ошибка при создании доставки:", result);
      }
    } catch(err) {
      const userFriendlyMessage = extractUserFriendlyMessage(err);
      setError(userFriendlyMessage);
      console.error("Критическая ошибка при создании доставки:", err);
    }
  };

  const handleUndoSale = async (product_id) => {
    try {
      await window.api.undoSale({ productId: product_id, saleType: 'delivery' });
      // обновить список продаж
      fetchTodaysSales('delivery');
    } catch (err) {
      setError("Ошибка при отмене продажи");
    }
  };
  
  const handleCancelDelivery = async (deliveryId) => {
    setError("");
    
    Swal.fire({
      title: 'Подтвердите отмену',
      text: `Вы уверены, что хотите отменить доставку #${deliveryId}? Все связанные продажи будут удалены. Это действие необратимо.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Да, отменить!',
      cancelButtonText: 'Нет'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await window.api.cancelDelivery(deliveryId);
          if (res.success) {
            Swal.fire(
              'Отменено!',
              `Доставка #${deliveryId} была успешно отменена.`,
              'success'
            );
            fetchTodaysSales('delivery'); // Обновляем список доставок
          } else {
            const userFriendlyMessage = extractUserFriendlyMessage(res.message);
            setError(userFriendlyMessage);
            Swal.fire(
              'Ошибка!',
              userFriendlyMessage,
              'error'
            );
          }
        } catch (err) {
          const userFriendlyMessage = extractUserFriendlyMessage(err);
          setError(userFriendlyMessage);
          Swal.fire(
            'Ошибка!',
            userFriendlyMessage,
            'error'
          );
        }
      }
    });
  };

  // --- Bonus Client Logic ---
  const handleBonusClientSearch = async () => {
    if (!bonusClientPhone || bonusClientPhone.length < 12) return;
    const foundClient = await window.api.findCustomerByPhone(bonusClientPhone);
    if (foundClient) {
      const clientDetails = await window.api.getCustomerDetails(foundClient.id);
      setBonusClient(clientDetails);
      const monthlySpend = await window.api.getCustomerMonthlySpend(foundClient.id);
      if (monthlySpend >= premiumThreshold) {
        setEffectiveBonusPercentage(premiumBonusPercentage);
      } else {
        setEffectiveBonusPercentage(bonusPercentage);
      }
      setBonusClientNotFound(false);
    } else {
      setBonusClient(null);
      setEffectiveBonusPercentage(bonusPercentage);
      setBonusClientNotFound(true);
    }
  };
  
  const handleCreateBonusClient = async () => {
    if (!newClientName) return;
    const newClient = await window.api.createCustomer({ name: newClientName, phone: bonusClientPhone });
    const clientDetails = await window.api.getCustomerDetails(newClient.id);
    setBonusClient(clientDetails);
    setEffectiveBonusPercentage(bonusPercentage);
    setBonusClientNotFound(false);
    setNewClientName('');
  };
  
  const handleBonusPhoneChange = (e) => {
    const { value } = e.target;
    if (!value.startsWith('+7')) {
      setBonusClientPhone('+7');
    } else {
      setBonusClientPhone(value);
    }
  };
  
  // --- End Bonus Client Logic ---
  
  // --- Discount Logic ---
  const handleApplyDiscount = () => {
    if (discountItemIndex !== null) {
      // Убираем символ % если он есть и преобразуем в число
      const cleanValue = discountValue.replace('%', '');
      const newDiscount = parseFloat(cleanValue);
      // Проверяем, что значение является числом и находится в допустимом диапазоне
      if (!isNaN(newDiscount) && newDiscount >= 0 && newDiscount <= maxDiscount) {
        // Округляем до 2 знаков после запятой
        const roundedDiscount = Math.round(newDiscount * 100) / 100;
        setCart(cart.map((cartItem, i) => 
          i === discountItemIndex ? {...cartItem, discount: roundedDiscount} : cartItem
        ));
        // Сбрасываем ошибку
        setDiscountError('');
        // Закрываем модальное окно и сбрасываем значения только при успешном вводе
        setDiscountModalOpen(false);
        setDiscountValue('');
        setDiscountItemIndex(null);
      } else if (discountValue !== '') {
        // Если введено некорректное значение, показываем ошибку, но не закрываем модальное окно
        setDiscountError(`Пожалуйста, введите корректное значение скидки (от 0 до ${maxDiscount})`);
        // Фокусируемся на поле ввода, чтобы пользователь мог сразу исправить значение
        setTimeout(() => {
          const input = document.querySelector('#discount-input');
          if (input) input.focus();
        }, 100);
      } else {
        // Если значение пустое, сбрасываем ошибку и закрываем модальное окно
        setDiscountError('');
        setDiscountModalOpen(false);
        setDiscountValue('');
        setDiscountItemIndex(null);
      }
    } else {
      // Если нет выбранного элемента, сбрасываем ошибку и закрываем модальное окно
      setDiscountError('');
      setDiscountModalOpen(false);
      setDiscountValue('');
      setDiscountItemIndex(null);
    }
  };
  // --- End Discount Logic ---

  const deliveriesList = salesToday;
  
  // Вычисляем дополнительные метрики
  const totalDeliveries = deliveriesList.length;
  const totalItemsInDeliveries = deliveriesList.reduce((sum, delivery) => sum + delivery.totalItems, 0);
  const averageItemsPerDelivery = totalDeliveries > 0 ? totalItemsInDeliveries / totalDeliveries : 0;
  
  // Вычисляем общую выручку по всем доставкам
  const totalRevenue = deliveriesList.reduce((sum, delivery) => {
    const deliveryRevenue = delivery.items.reduce((itemSum, item) => {
      return itemSum + (item.quantity * item.selling_price);
    }, 0);
    return sum + deliveryRevenue;
  }, 0);
  
  // Добавляем выручку к каждой доставке для отображения в списке
  const deliveriesListWithRevenue = deliveriesList.map(delivery => {
    const revenue = delivery.items.reduce((sum, item) => {
      return sum + (item.quantity * item.selling_price);
    }, 0);
    return {
      ...delivery,
      revenue: parseFloat(revenue.toFixed(2))
    };
  });
  
  // Рассчитываем общую сумму без скидок
  const cartTotalWithoutDiscount = cart.reduce((sum, item) => sum + (item.quantity * item.selling_price), 0);
  
  // Рассчитываем сумму со скидками с округлением
  const cartTotalWithDiscount = cart.reduce((sum, item) => {
    const itemTotal = item.quantity * item.selling_price * (1 - item.discount / 100);
    return sum + parseFloat(itemTotal.toFixed(2));
  }, 0);
  
  // Итоговая сумма с учетом бонусов
  const finalTotal = cartTotalWithDiscount - (parseFloat(bonusesToDebit) || 0);
  
  // Сумма для начисления бонусов (с учетом скидок и списанных бонусов)
  const amountForAccrual = finalTotal;
  const bonusAccrual = amountForAccrual > 0 ? (amountForAccrual * effectiveBonusPercentage) / 100 : 0;
  
  // Общая сумма скидок
  const totalDiscount = cartTotalWithoutDiscount - cartTotalWithDiscount;

  return (
    <div className="flex justify-center items-start min-h-screen py-4 sm:py-8">
      <div className="max-w-7xl w-full p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Левая колонка - Быстрая продажа */}
        <div className="lg:col-span-2 p-6 bg-white rounded-2xl shadow-lg border-t-4 border-blue-500">
          <div className="flex items-center gap-3 mb-6">
            <FaShippingFast size={32} className="text-blue-600" />
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Быстрая продажа (Доставка)</h2>
          </div>

          {/* Поиск */}
          <div className="relative mb-6">
            <FaSearch className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400 z-10" />
            <input
              type="text"
              value={productSearch}
              onChange={e => {
                setProductSearch(e.target.value);
                setShowProductList(true);
              }}
              onFocus={() => setShowProductList(true)}
              onBlur={() => setTimeout(() => setShowProductList(false), 200)}
              placeholder="Найти товар..."
              className="border border-gray-300 rounded-lg pl-10 pr-3 py-2 w-full text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              ref={productInputRef}
            />
            {showProductList && productSearch && (
            <div className="absolute top-full z-20 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto w-full">
              {allProducts.filter(prod => prod.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 ? (
                <div className="p-3 text-gray-500">Нет совпадений</div>
              ) : (
                allProducts.filter(prod => prod.name.toLowerCase().includes(productSearch.toLowerCase())).map(prod => (
                  <div
                    key={prod.id}
                    className="p-3 hover:bg-blue-50 cursor-pointer"
                    onMouseDown={() => {
                      setForm(f => ({ ...f, product_id: prod.id, category_id: prod.category_id }));
                      setProductSearch(prod.name);
                      setShowProductList(false);
                    }}
                  >
                    {prod.name}
                  </div>
                ))
              )}
            </div>
          )}
          </div>

          {/* Форма продажи */}
          <form onSubmit={handleSale} className="grid grid-cols-1 sm:grid-cols-12 gap-4 mb-10 p-6 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="sm:col-span-12 lg:col-span-4">
              <label className="block mb-1 text-sm font-semibold text-gray-600">Категория</label>
              <select
                name="category_id"
                value={form.category_id}
                onChange={handleChange}
                className="border border-gray-300 rounded-lg px-3 py-2 w-full text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-12 lg:col-span-4">
              <label className="block mb-1 text-sm font-semibold text-gray-600">Товар</label>
              <select
                name="product_id"
                value={form.product_id}
                onChange={handleChange}
                className="border border-gray-300 rounded-lg px-3 py-2 w-full text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              >
                {products.map(prod => (
                  <option key={prod.id} value={prod.id}>{prod.name}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-6 lg:col-span-2">
              <label className="block mb-1 text-sm font-semibold text-gray-600">Кол-во</label>
              <input
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
                className="border border-gray-300 rounded-lg px-3 py-2 w-full text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="1"
                type="number"
                min="0.01"
                step="any"
              />
            </div>
             <div className="sm:col-span-6 lg:col-span-2 flex items-end">
              <button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-base font-semibold shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:bg-blue-300" 
                type="submit"
                disabled={success}
              >
                {success ? <FaCheckCircle /> : 'Добавить в корзину'}
              </button>
            </div>
          </form>

          {error && <div className="text-red-500 mb-6 bg-red-50 p-3 rounded-lg text-center">{error}</div>}

          {/* Быстрая продажа */}
          {products.length > 0 && (
            <div className="mb-12 p-6 bg-blue-50 border-2 border-blue-200 rounded-2xl shadow-inner">
              <div className="flex items-center gap-3 mb-4">
                <FaShippingFast className="text-yellow-500" size={24}/>
                <h3 className="text-xl font-bold text-blue-800">Быстрая продажа</h3>
              </div>
              <p className="text-gray-600 mb-5 -mt-2 ml-10">Самый быстрый способ добавить продажу в 1 клик.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.slice(0, 8).map(prod => (
                  <div key={prod.id} className="flex flex-col justify-between bg-white border border-gray-300 rounded-xl p-4 transition-all duration-200 hover:shadow-lg hover:border-blue-400 transform hover:-translate-y-1 h-28">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="font-bold text-base text-gray-800 truncate" title={prod.name}>
                          {prod.name}
                        </div>
                        <div className="text-gray-500 text-sm font-medium">{prod.unit || ''}</div>
                      </div>
                      <button
                        className={`flex-shrink-0 transition-all duration-300 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold shadow-lg transform active:scale-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${quickSaleSuccess === prod.id ? 'bg-green-500 rotate-180' : 'bg-blue-500 hover:bg-blue-600'}`}
                        title={`Добавить 1 ${prod.unit || ''} в корзину`}
                        onClick={async () => {
                          setError("");
                          try {
                            const product = allProducts.find(p => p.id === prod.id);
                            if (!product) return;
                            
                            setCart(currentCart => {
                              const existingItem = currentCart.find(item => item.product_id === product.id);
                              if (existingItem) {
                                return currentCart.map(item => item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
                              } else {
                                return [...currentCart, { product_id: product.id, name: product.name, unit: product.unit, quantity: 1, selling_price: product.selling_price, discount: 0 }];
                              }
                            });

                            setQuickSaleSuccess(prod.id);
                            setTimeout(() => setQuickSaleSuccess(null), 500);
                          } catch (e) {
                            setError("Ошибка при быстрой продаже");
                          }
                        }}
                      >
                        {quickSaleSuccess === prod.id ? (
                          <FaCheck />
                        ) : (
                          <FaPlus />
                        )}
                      </button>
                    </div>
                    <div>
                      <div className="font-bold text-blue-600 mt-1">{prod.selling_price} тг</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Правая колонка */}
        <div>
          {/* Корзина */}
          <div className="mb-8 p-6 bg-white rounded-2xl shadow-lg border-t-4 border-yellow-500">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-xl font-bold text-gray-800 flex items-center"><FaShoppingCart className="mr-3 text-yellow-600"/>Корзина доставки</h3>
               <div className="flex items-center">
                 <input type="checkbox" id="bonus-toggle" checked={isBonusClient} onChange={(e) => setIsBonusClient(e.target.checked)} className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"/>
                 <label htmlFor="bonus-toggle" className="ml-2 text-sm font-medium text-gray-700">Бонусный клиент</label>
               </div>
            </div>
            
            {cart.length === 0 ? (
              <p className="text-gray-600">Корзина пуста.</p>
            ) : (
              <div>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2 mb-4">
                  {cart.map((item, index) => (
                    <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
                      <div>
                        <span className="font-semibold">{item.name}</span>
                        <span className="text-gray-500 ml-2 text-sm">({item.quantity} {item.unit})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setDiscountItemIndex(index);
                            setDiscountValue(item.discount || 0);
                            setDiscountModalOpen(true);
                          }}
                          className="text-blue-500 hover:text-blue-700 text-xs font-bold"
                        >
                          {item.discount > 0 ? `${item.discount}%` : '%'}
                        </button>
                        <span className="font-bold text-blue-600">{(item.quantity * item.selling_price * (1 - (item.discount || 0) / 100)).toFixed(2)} тг</span>
                        <button 
                          onClick={() => {
                            if (item.quantity > 1) {
                              // Если количество больше 1, уменьшаем на 1
                              setCart(cart.map((cartItem, i) => 
                                i === index ? {...cartItem, quantity: cartItem.quantity - 1} : cartItem
                              ));
                            } else {
                              // Если количество 1, удаляем элемент
                              setCart(cart.filter((_, i) => i !== index));
                            }
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <FaMinus />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Bonus Client Section */}
                {isBonusClient && (
                 <div className="my-4 pt-4 border-t border-dashed">
                   {!bonusClient ? (
                     <div>
                       <div className="flex items-center space-x-2">
                         <input 
                           type="tel" 
                           value={bonusClientPhone} 
                           onChange={handleBonusPhoneChange} 
                           placeholder="+7..." 
                           className="flex-grow p-2 border-2 border-gray-300 rounded-lg text-sm" 
                           onKeyPress={(e) => e.key === 'Enter' && handleBonusClientSearch()}
                         />
                         <button type="button" onClick={handleBonusClientSearch} className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"><FaSearch /></button>
                       </div>
                       {bonusClientNotFound && (
                         <div className="mt-3 text-center bg-yellow-50 p-3 rounded-lg">
                           <p className="text-sm text-yellow-800 mb-2">Клиент не найден. Создать нового?</p>
                           <div className="flex items-center gap-2">
                             <input type="text" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="Имя клиента" className="flex-grow p-2 border-2 border-gray-300 rounded-lg text-sm" />
                             <button type="button" onClick={handleCreateBonusClient} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"><FaUserPlus /></button>
                           </div>
                         </div>
                       )}
                     </div>
                   ) : (
                     <div className="bg-green-50 p-3 rounded-lg text-green-800">
                       <div className="flex justify-between items-center">
                         <p className="font-bold">{bonusClient.name}</p>
                         <button onClick={() => { setBonusClient(null); setBonusClientPhone('+7'); setEffectiveBonusPercentage(bonusPercentage); }} className="text-xs text-gray-500">Сменить</button>
                       </div>
                       <p>Баланс: <span className="font-bold">{bonusClient.bonus_points.toFixed(2)}</span></p>
                       {effectiveBonusPercentage > bonusPercentage && (
                        <div className="my-2 text-xs font-bold flex items-center justify-center gap-2 bg-yellow-100 text-yellow-800 p-2 rounded-lg border border-yellow-200">
                          <FaStar />
                          <span>Активен повышенный кэшбэк {effectiveBonusPercentage}%!</span>
                        </div>
                       )}
                       <p className="text-sm mt-1">Будет начислено: <span className="font-bold text-green-700">+{bonusAccrual.toFixed(2)}</span></p>
                        <input type="number" value={bonusesToDebit} onChange={(e) => setBonusesToDebit(e.target.value)} placeholder="Списать бонусы" className="mt-2 w-full p-2 border-2 border-gray-300 rounded-lg text-sm" max={bonusClient.bonus_points} />
                     </div>
                   )}
                 </div>
                )}

                <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-300">
                  <div className="flex justify-between items-center mb-2">
                   <span className="text-gray-600 font-semibold">Сумма:</span>
                   <span className="font-bold text-gray-800">{cartTotalWithoutDiscount.toFixed(2)} тг</span>
                 </div>
                 {totalDiscount > 0 && (
                    <div className="flex justify-between items-center mb-2 text-red-600">
                     <span className="font-semibold">Скидка:</span>
                     <span className="font-bold">- {totalDiscount.toFixed(2)} тг</span>
                   </div>
                 )}
                 <div className="flex justify-between items-center mb-2">
                   <span className="text-gray-600 font-semibold">Сумма со скидкой:</span>
                   <span className="font-bold text-gray-800">{cartTotalWithDiscount.toFixed(2)} тг</span>
                 </div>
                 {bonusesToDebit > 0 && (
                    <div className="flex justify-between items-center mb-2 text-red-600">
                     <span className="font-semibold">Списано бонусов:</span>
                     <span className="font-bold">- {parseFloat(bonusesToDebit).toFixed(2)} тг</span>
                   </div>
                 )}
                 <div className="flex justify-between items-center mb-4">
                   <span className="text-gray-600 font-bold text-lg">Итого к оплате:</span>
                   <span className="text-xl font-bold text-green-600">{finalTotal.toFixed(2)} тг</span>
                 </div>
                  <button
                    onClick={handleCreateDelivery}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg text-lg font-semibold shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <FaShippingFast /> Оформить доставку ({cart.length} поз.)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Продажи за сегодня */}
          <div className="p-6 bg-white rounded-2xl shadow-lg border-t-4 border-green-500">
            <div className="flex items-center gap-3 mb-4">
              <FaHistory size={24} className="text-green-600" />
              <h3 className="font-bold text-xl text-gray-800">Доставки за сегодня</h3>
            </div>
            
            <div className="max-h-[calc(100vh-30rem)] overflow-y-auto pr-2">
              {deliveriesListWithRevenue.length > 0 ? (
                <>
                  <ul className="space-y-3 mb-4">
                    {deliveriesListWithRevenue.map((delivery) => (
                        <li key={delivery.delivery_id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-700">Доставка #{delivery.delivery_id}</div>
                            <div className="text-xs text-gray-500 flex justify-between">
                              <span>
                                {new Date(delivery.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span>
                                {delivery.totalItems} {getPluralizedUnit(delivery.totalItems, 'товар')}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 ml-2">
                            <div className="text-right">
                              <div className="font-bold text-gray-800">
                                {delivery.revenue.toFixed(2)} тг
                              </div>
                            </div>
                            <button 
                              onClick={() => handleCancelDelivery(delivery.delivery_id)}
                              className="bg-red-100 hover:bg-red-200 text-red-600 font-bold p-2 rounded-full leading-none flex items-center justify-center w-8 h-8 transition-colors"
                              title="Отменить доставку"
                            >
                              <FaMinus size={12} />
                            </button>
                          </div>
                        </li>
                      ))}
                  </ul>
                  
                  {/* Ключевые метрики */}
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t-2 border-dashed border-gray-300">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500">Доставок</div>
                      <div className="text-lg font-bold text-blue-700">{totalDeliveries}</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500">Товаров доставлено</div>
                      <div className="text-lg font-bold text-green-700">{totalItemsInDeliveries}</div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500">Товаров/доставку</div>
                      <div className="text-lg font-bold text-purple-700">{averageItemsPerDelivery.toFixed(1)}</div>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-500">Выручка</div>
                      <div className="text-lg font-bold text-yellow-700">{totalRevenue.toFixed(2)} тг</div>
                    </div>
                  </div>
                </>
              ) : (
              <p className="text-gray-500 text-center py-8">Сегодня еще не было доставок.</p>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Discount Modal */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-lg font-bold mb-4">Введите скидку</h3>
            <div className="mb-4">
              <input
                id="discount-input"
                type="text"
                value={discountValue}
                onChange={(e) => {
                  // Разрешаем ввод только чисел, точки и знака процента
                  const value = e.target.value;
                  // Убираем все символы кроме цифр и точки
                  const cleanValue = value.replace(/[^0-9.]/g, '');
                  setDiscountValue(cleanValue);
                  // Сбрасываем ошибку при изменении значения
                  if (discountError) setDiscountError('');
                }}
                onBlur={(e) => {
                  // При потере фокуса добавляем символ % если введено число
                  const value = e.target.value;
                  if (value && !isNaN(parseFloat(value))) {
                    setDiscountValue(value + '%');
                  }
                }}
                onKeyDown={(e) => {
                  // Применяем скидку при нажатии Enter
                  if (e.key === 'Enter') {
                    handleApplyDiscount();
                  }
                }}
                className={`w-full p-2 border-2 rounded-lg ${discountError ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Процент скидки (0-100), например: 5"
              />
              <div className="text-sm text-gray-500 mt-1">Например: 5 для скидки 5%</div>
              {discountError && (
                <div className="text-sm text-red-500 mt-2">{discountError}</div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setDiscountModalOpen(false);
                  setDiscountValue('');
                  setDiscountItemIndex(null);
                  setDiscountError('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
              >
                Отмена
              </button>
              <button
                onClick={handleApplyDiscount}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
