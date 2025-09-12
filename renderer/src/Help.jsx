import React from "react";
import { FaQuestionCircle, FaCashRegister, FaShippingFast, FaGift, FaBook, FaChartLine, FaCog, FaList, FaSearch } from "react-icons/fa";

export default function Help() {
  return (
    <div className="p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <FaQuestionCircle size={36} className="text-blue-600" />
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Помощь</h2>
        </div>

        {/* Оглавление */}
        <div className="mb-10 p-6 bg-white border border-gray-200 rounded-2xl shadow-lg">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FaBook className="text-blue-600" />
            Оглавление
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <a href="#sales" className="flex items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              <FaCashRegister className="text-blue-600 mr-2" />
              <span className="font-medium">Продажи</span>
            </a>
            <a href="#delivery" className="flex items-center p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
              <FaShippingFast className="text-green-600 mr-2" />
              <span className="font-medium">Доставка</span>
            </a>
            <a href="#bonuses" className="flex items-center p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
              <FaGift className="text-yellow-600 mr-2" />
              <span className="font-medium">Бонусы</span>
            </a>
            <a href="#catalog" className="flex items-center p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
              <FaBook className="text-purple-600 mr-2" />
              <span className="font-medium">Каталог</span>
            </a>
            <a href="#statistics" className="flex items-center p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
              <FaChartLine className="text-red-600 mr-2" />
              <span className="font-medium">Статистика</span>
            </a>
            <a href="#settings" className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <FaCog className="text-gray-600 mr-2" />
              <span className="font-medium">Настройки</span>
            </a>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border-t-4 border-blue-500 p-6 mb-8">
          <p className="text-gray-600 mb-6">
            Добро пожаловать в руководство пользователя программы "Shop Helper"! 
            В этом разделе вы найдете подробное описание всех функций и возможностей приложения.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-bold text-blue-800 mb-2">Как использовать эту справку</h4>
            <ul className="list-disc pl-5 space-y-1 text-gray-700">
              <li>Используйте оглавление выше для быстрого перехода к нужному разделу</li>
              <li>Каждый раздел содержит подробное описание функций и рекомендации по использованию</li>
              <li>Обратите особое внимание на разделы с советами и ограничениями системы</li>
            </ul>
          </div>
        </div>

        {/* Продажи */}
        <div id="sales" className="mb-10 p-6 bg-white border border-gray-200 rounded-2xl shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <FaCashRegister size={24} className="text-blue-600" />
            <h3 className="text-xl font-bold text-gray-800">Продажи</h3>
          </div>
          
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-bold text-blue-800 mb-2">Основная функциональность</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Добавление товаров в корзину через форму или быструю продажу</li>
                <li>Оформление продажи из корзины с возможностью применения бонусов</li>
                <li>Просмотр истории продаж за текущий день с ключевыми метриками</li>
                <li>Отмена последней продажи товара (если продажа была частью чека, отменяется весь чек)</li>
              </ul>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-bold text-green-800 mb-2">Бонусная система</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Поиск клиента по номеру телефона (нажмите Enter для быстрого поиска)</li>
                <li>Создание новой бонусной карты для клиента</li>
                <li>Списание бонусов при покупке (введите сумму в поле "Списать бонусы")</li>
                <li>Автоматическое начисление бонусов (1% от суммы покупки со скидками и списанными бонусами)</li>
                <li>Повышенный кэшбэк (5%) при достижении пороговой суммы трат за месяц (100,000 тг по умолчанию)</li>
                <li>Отображение текущего баланса бонусов клиента</li>
              </ul>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h4 className="font-bold text-yellow-800 mb-2">Быстрая продажа</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Кнопки для мгновенного добавления популярных товаров в корзину</li>
                <li>Автоматическое добавление 1 единицы товара при нажатии</li>
                <li>Визуальное подтверждение добавления товара</li>
              </ul>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h4 className="font-bold text-purple-800 mb-2">Работа с корзиной</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Увеличение/уменьшение количества товаров в корзине</li>
                <li>Полное удаление товара из корзины при уменьшении количества до 0</li>
                <li>Применение скидок к отдельным товарам (нажмите на процент в строке товара)</li>
                <li>Отображение промежуточных итогов (сумма, скидки, итого к оплате)</li>
              </ul>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h4 className="font-bold text-red-800 mb-2">Система скидок</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Возможность применения скидки к отдельным товарам в корзине</li>
                <li>Скидка указывается в процентах (по умолчанию максимум 100%)</li>
                <li>Скидка автоматически применяется к цене товара при расчете итоговой суммы</li>
                <li>Скидки учитываются при начислении бонусов</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Доставка */}
        <div id="delivery" className="mb-10 p-6 bg-white border border-gray-200 rounded-2xl shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <FaShippingFast size={24} className="text-blue-600" />
            <h3 className="text-xl font-bold text-gray-800">Доставка</h3>
          </div>
          
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-bold text-blue-800 mb-2">Основная функциональность</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Добавление товаров в корзину доставки через форму или быструю продажу</li>
                <li>Оформление доставки из корзины с возможностью применения бонусов</li>
                <li>Просмотр истории доставок за текущий день с ключевыми метриками</li>
                <li>Отмена доставки со всеми связанными продажами и бонусными операциями</li>
              </ul>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-bold text-green-800 mb-2">Бонусная система</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Поиск клиента по номеру телефона (нажмите Enter для быстрого поиска)</li>
                <li>Создание новой бонусной карты для клиента</li>
                <li>Списание бонусов при оформлении доставки</li>
                <li>Автоматическое начисление бонусов (1% от суммы покупки со скидками и списанными бонусами)</li>
                <li>Повышенный кэшбэк (5%) при достижении пороговой суммы трат за месяц</li>
                <li>Отображение текущего баланса бонусов клиента</li>
              </ul>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h4 className="font-bold text-yellow-800 mb-2">Быстрая продажа</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Кнопки для мгновенного добавления популярных товаров в корзину доставки</li>
                <li>Автоматическое добавление 1 единицы товара при нажатии</li>
                <li>Визуальное подтверждение добавления товара</li>
              </ul>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h4 className="font-bold text-purple-800 mb-2">Отмена доставки</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>При отмене доставки автоматически откатываются все связанные бонусные операции</li>
                <li>Восстанавливаются списанные бонусы клиенту</li>
                <li>Отменяются начисленные бонусы за доставку</li>
                <li>Отмена доставки необратима и требует подтверждения</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Бонусы */}
        <div id="bonuses" className="mb-10 p-6 bg-white border border-gray-200 rounded-2xl shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <FaGift size={24} className="text-blue-600" />
            <h3 className="text-xl font-bold text-gray-800">Бонусы</h3>
          </div>
          
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-bold text-blue-800 mb-2">Управление бонусами клиентов</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Поиск клиента по номеру телефона (нажмите Enter для быстрого поиска)</li>
                <li>Создание новой бонусной карты для клиента</li>
                <li>Просмотр истории покупок клиента с детализацией по датам и товарам</li>
                <li>Просмотр истории бонусных операций (начисления/списания) с датами и суммами</li>
                <li>Ручное начисление бонусов клиенту (указание суммы и основания)</li>
                <li>Ручное списание бонусов у клиента (с проверкой достаточности баланса)</li>
              </ul>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-bold text-green-800 mb-2">Сводный отчет</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Просмотр начисленных бонусов за день/неделю/месяц</li>
                <li>Просмотр списанных бонусов за день/неделю/месяц</li>
                <li>Общий баланс бонусов всех клиентов</li>
                <li>Отображение периода отчета с возможностью выбора</li>
              </ul>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h4 className="font-bold text-yellow-800 mb-2">Система повышенного кэшбэка</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Стандартный кэшбэк: 1% от суммы покупки (настраивается в разделе Настройки)</li>
                <li>Повышенный кэшбэк: 5% при достижении пороговой суммы трат за календарный месяц</li>
                <li>Пороговая сумма: 100,000 тг по умолчанию (настраивается в разделе Настройки)</li>
                <li>Система отслеживает траты клиента за текущий месяц для определения уровня кэшбэка</li>
                <li>Повышенный кэшбэк применяется автоматически при оформлении покупки</li>
              </ul>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h4 className="font-bold text-purple-800 mb-2">Ограничения системы</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Нельзя списать больше бонусов, чем есть на балансе клиента</li>
                <li>Бонусы начисляются только после успешного оформления покупки</li>
                <li>При отмене покупки/доставки бонусные операции автоматически откатываются</li>
                <li>Бонусы не могут уходить в отрицательный баланс</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Каталог */}
        <div id="catalog" className="mb-10 p-6 bg-white border border-gray-200 rounded-2xl shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <FaBook size={24} className="text-blue-600" />
            <h3 className="text-xl font-bold text-gray-800">Каталог</h3>
          </div>
          
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-bold text-blue-800 mb-2">Управление категориями</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Создание новых категорий товаров с названием и возможностью добавления изображения</li>
                <li>Удаление существующих категорий (удаляются все товары в категории)</li>
                <li>Автоматический переход к первой категории при создании</li>
                <li>Поддержка изображений категорий (JPG, PNG)</li>
              </ul>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-bold text-green-800 mb-2">Управление товарами</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Добавление новых товаров в выбранную категорию</li>
                <li>Редактирование существующих товаров (название, цены, единица измерения)</li>
                <li>Удаление товаров</li>
                <li>Указание единицы измерения (шт, кг, л и т.д.)</li>
                <li>Установка закупочной и продажной цены (с валидацией на отрицательные значения)</li>
                <li>Поддержка изображений товаров (JPG, PNG)</li>
                <li>Проверка уникальности названия товара в категории</li>
              </ul>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h4 className="font-bold text-yellow-800 mb-2">Валидация данных</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Проверка корректности названий категорий и товаров (без специальных символов)</li>
                <li>Валидация числовых значений цен (неотрицательные числа)</li>
                <li>Ограничение длины названий (до 50 символов для категорий, до 100 для товаров)</li>
                <li>Проверка формата изображений при загрузке</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Статистика */}
        <div id="statistics" className="mb-10 p-6 bg-white border border-gray-200 rounded-2xl shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <FaChartLine size={24} className="text-blue-600" />
            <h3 className="text-xl font-bold text-gray-800">Статистика</h3>
          </div>
          
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-bold text-blue-800 mb-2">Фильтры</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Выбор периода (день, неделя, месяц, произвольный период)</li>
                <li>Фильтрация по типу продаж (все продажи, продажи в зале, доставка)</li>
                <li>Фильтрация по категориям товаров</li>
                <li>Возможность комбинирования фильтров для детального анализа</li>
              </ul>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-bold text-green-800 mb-2">Графики и отчеты</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>ТОП продаваемых товаров (по количеству) с возможностью выбора лимита</li>
                <li>Наименее популярные товары (по количеству)</li>
                <li>Средние продажи в день по каждому товару</li>
                <li>Продажи по дням недели (понедельник-воскресенье)</li>
                <li>Финансовая сводка (выручка, затраты, прибыль) с детализацией</li>
                <li>Прогноз активности на основе исторических данных (по дням недели)</li>
                <li>Скачивание отчета в формате .txt с полной информацией</li>
              </ul>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h4 className="font-bold text-yellow-800 mb-2">Интерпретация данных</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Графики обновляются в реальном времени при изменении фильтров</li>
                <li>Данные в графиках сортируются по убыванию/возрастанию в зависимости от типа отчета</li>
                <li>Прогнозы основаны на средних значениях за предыдущие периоды</li>
                <li>Финансовая сводка учитывает закупочные цены товаров</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Настройки */}
        <div id="settings" className="mb-10 p-6 bg-white border border-gray-200 rounded-2xl shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <FaCog size={24} className="text-blue-600" />
            <h3 className="text-xl font-bold text-gray-800">Настройки</h3>
          </div>
          
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-bold text-blue-800 mb-2">Бонусная система</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Настройка процента стандартного кэшбэка (по умолчанию 1%)</li>
                <li>Настройка процента повышенного кэшбэка (по умолчанию 5%)</li>
                <li>Настройка пороговой суммы для активации повышенного кэшбэка (по умолчанию 100,000 тг)</li>
                <li>Настройка максимальной скидки (по умолчанию 100%)</li>
                <li>Все значения автоматически валидируются при сохранении</li>
              </ul>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-bold text-green-800 mb-2">Управление данными</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Создание резервной копии базы данных (файл .db)</li>
                <li>Восстановление данных из резервной копии (замена текущей базы)</li>
                <li>При восстановлении из резервной копии приложение автоматически перезапускается</li>
                <li>Рекомендуется регулярно создавать резервные копии для предотвращения потери данных</li>
              </ul>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h4 className="font-bold text-yellow-800 mb-2">Рекомендации по безопасности</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Храните резервные копии в безопасном месте, отдельно от основного компьютера</li>
                <li>Создавайте резервные копии перед внесением значительных изменений в каталог</li>
                <li>Проверяйте работоспособность резервных копий периодически</li>
                <li>Не изменяйте файлы базы данных вручную вне приложения</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Общая информация */}
        <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-lg">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Общая информация</h3>
          
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-bold text-blue-800 mb-2">Глобальный поиск товаров</h4>
              <p className="text-gray-700">
                В разделах "Продажи" и "Доставка" доступен глобальный поиск товаров по названию. 
                При вводе текста в поле поиска отображается список подходящих товаров, при клике на который 
                автоматически выбирается категория и товар.
              </p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-bold text-green-800 mb-2">Горячие клавиши</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Enter в поле поиска клиента - выполнить поиск</li>
                <li>Enter в форме добавления товара - добавить товар в корзину</li>
                <li>Tab для перехода между полями ввода</li>
              </ul>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h4 className="font-bold text-yellow-800 mb-2">Советы по использованию</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Регулярно создавайте резервные копии данных в разделе "Настройки"</li>
                <li>Используйте быструю продажу для часто продаваемых товаров</li>
                <li>Проверяйте корректность введенных данных перед оформлением продажи</li>
                <li>Следите за балансом бонусов клиентов в разделе "Бонусы"</li>
                <li>Используйте фильтры в статистике для детального анализа продаж</li>
                <li>Обновляйте информацию о товарах при изменении цен или условий поставки</li>
              </ul>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h4 className="font-bold text-purple-800 mb-2">Валидация данных</h4>
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li>Все числовые поля проверяются на корректность ввода</li>
                <li>Текстовые поля имеют ограничения по длине и допустимым символам</li>
                <li>Номера телефонов клиентов проверяются на соответствие формату (+7 и 11 цифр)</li>
                <li>Цены не могут быть отрицательными</li>
                <li>Названия товаров и категорий проверяются на уникальность в рамках допустимых условий</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}