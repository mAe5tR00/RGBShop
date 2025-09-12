import React, { useEffect, useState, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { FaChartBar, FaRegSmile, FaFilePdf, FaSpinner, FaFileAlt, FaBrain, FaDollarSign } from "react-icons/fa";


ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Helper to get weeks for a month, starting on Monday
const getWeeksForMonth = (year, month) => {
  const weeks = [];
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  let currentDay = new Date(firstDayOfMonth);
  // Find the first Monday of the week containing the first day of the month
  const dayOfWeek = currentDay.getDay(); // 0=Sun, 1=Mon...
  const diff = currentDay.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  currentDay = new Date(currentDay.setDate(diff));

  while (currentDay <= lastDayOfMonth) {
    const endOfWeek = new Date(currentDay);
    endOfWeek.setDate(currentDay.getDate() + 6);

    // Only include weeks that overlap with the selected month
    if (currentDay.getMonth() === month || endOfWeek.getMonth() === month || (currentDay < firstDayOfMonth && endOfWeek > lastDayOfMonth)) {
       const format = (date) => `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
       weeks.push({
        start: new Date(currentDay),
        end: new Date(endOfWeek),
        label: `${format(currentDay)} - ${format(endOfWeek)}`
      });
    }
    
    currentDay.setDate(currentDay.getDate() + 7);
  }
  return weeks;
};

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
  };

  const unitLower = unit.toLowerCase();
  const unitForms = forms[unitLower];
  if (!unitForms) {
    return unit; // Возвращаем исходное, если нет в словаре
  }

  const countNum = Number(count);
  // Для дробных чисел всегда используем родительный падеж ед. числа (1.5 литра)
  if (!Number.isInteger(countNum)) {
    return unitForms[1];
  }

  const absCount = Math.abs(countNum);

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


function getPeriodDates(period, customFrom, customTo) {
  const now = new Date();
  let from;
  if (period === 'day') from = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  else if (period === 'week') from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  else if (period === 'month') from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  else if (period === 'custom' && customFrom && customTo) {
    return { dateFrom: new Date(customFrom).toISOString(), dateTo: new Date(customTo).toISOString() };
  }
  return { dateFrom: from ? from.toISOString() : '', dateTo: now.toISOString() };
}

const cardColors = [
  "bg-blue-50 border-blue-200",
  "bg-green-50 border-green-200",
  "bg-yellow-50 border-yellow-200",
  "bg-purple-50 border-purple-200"
];

export default function Statistics() {
  const [period, setPeriod] = useState('week');
  const [categoryId, setCategoryId] = useState('all');
  const [saleType, setSaleType] = useState('all'); // Новое состояние для типа продажи
  const [categories, setCategories] = useState([]);
  const [top, setTop] = useState([]);
  const [least, setLeast] = useState([]);
  const [avg, setAvg] = useState([]);
  const [byWeekday, setByWeekday] = useState([]);
  const [customPeriod, setCustomPeriod] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [financialSummary, setFinancialSummary] = useState({ totalRevenue: 0, totalCost: 0, netProfit: 0 });

  // States for new forecast component
  const [analysisType, setAnalysisType] = useState('items');
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [monthWeeks, setMonthWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(''); // Will store JSON.stringify({start, end})
  const [forecastData, setForecastData] = useState([]);
  const [forecastTitle, setForecastTitle] = useState("");

  const customFromRef = useRef(null);
  const customToRef = useRef(null);
  const topChartRef = useRef(null);
  const leastChartRef = useRef(null);
  const avgChartRef = useRef(null);
  const weekdayChartRef = useRef(null);
  const forecastChartRef = useRef(null); // Ref для нового графика

  useEffect(() => {
    window.api.getCategories().then(cats => setCategories(cats));
  }, []);

  // Effect for loading main statistics
  useEffect(() => {
    if (period === 'custom') {
      if (!dateFrom || !dateTo) return;
      const from = new Date(dateFrom);
      from.setHours(0,0,0,0);
      const to = new Date(dateTo);
      to.setHours(23,59,59,999);
      const params = { dateFrom: from.toISOString(), dateTo: to.toISOString(), categoryId, saleType };
      window.api.getTopProducts({ ...params, limit: 5 }).then(setTop);
      window.api.getLeastProducts({ ...params, limit: 5 }).then(setLeast);
      window.api.getAvgPerDay(params).then(setAvg);
      window.api.getByWeekday(params).then(setByWeekday);
      window.api.getFinancialSummary(params).then(setFinancialSummary);
    } else {
      const params = { ...getPeriodDates(period), categoryId, saleType };
      window.api.getTopProducts({ ...params, limit: 5 }).then(setTop);
      window.api.getLeastProducts({ ...params, limit: 5 }).then(setLeast);
      window.api.getAvgPerDay(params).then(setAvg);
      window.api.getByWeekday(params).then(setByWeekday);
      window.api.getFinancialSummary(params).then(setFinancialSummary);
    }
  }, [period, categoryId, dateFrom, dateTo, saleType]);

  // Effect for populating weeks dropdown
  useEffect(() => {
    const weeks = getWeeksForMonth(selectedYear, selectedMonth);
    setMonthWeeks(weeks);

    const now = new Date();
    const currentWeek = weeks.find(w => now >= w.start && now <= w.end);
    
    if (currentWeek) {
      setSelectedWeek(JSON.stringify({start: currentWeek.start, end: currentWeek.end}));
    } else if (weeks.length > 0) {
      // If month/year is not current, default to the first week
      setSelectedWeek(JSON.stringify({start: weeks[0].start, end: weeks[0].end}));
    } else {
      setSelectedWeek('');
    }
  }, [selectedYear, selectedMonth]);


  // Effect for loading data for the chart
  useEffect(() => {
    if (!selectedWeek) {
      setForecastData([]);
      return;
    };

    const { start, end } = JSON.parse(selectedWeek);
    const startOfWeek = new Date(start);
    const endOfWeek = new Date(end);
    endOfWeek.setHours(23, 59, 59, 999);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const format = (date) => `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    const formattedStart = format(startOfWeek);
    const formattedEnd = format(endOfWeek);

    const generalPeriodParams = { ...getPeriodDates(period, dateFrom, dateTo), categoryId, saleType, analysisType };

    if (startOfWeek < today) {
      setForecastTitle(`Активность за неделю (${formattedStart} - ${formattedEnd})`);
      window.api.getSalesForWeek({
        dateFrom: startOfWeek.toISOString(),
        dateTo: endOfWeek.toISOString(),
        saleType: saleType,
        analysisType: analysisType,
        categoryId: categoryId
      }).then(setForecastData);
    } else {
      setForecastTitle(`Прогноз на неделю (${formattedStart} - ${formattedEnd})`);
      window.api.getActivityForecast(generalPeriodParams).then(setForecastData);
    }
  }, [selectedWeek, period, categoryId, dateFrom, dateTo, saleType, analysisType]);


  const generateTxtReport = async () => {
    const selectedCategory = categories.find(c => c.id === Number(categoryId));
    const categoryName = selectedCategory ? selectedCategory.name : 'Все категории';
    const periodText = period === 'custom' 
      ? `с ${dateFrom} по ${dateTo}` 
      : {day: 'за день', week: 'за неделю', month: 'за месяц'}[period];
    const saleTypeText = {
      all: 'Все продажи',
      instore: 'Продажи в зале',
      delivery: 'Доставка'
    }[saleType];

    let report = `ОТЧЁТ ПО ПРОДАЖАМ\n`;
    report += `Тип продаж: ${saleTypeText}\n`;
    report += `Период: ${periodText}\n`;
    report += `Категория: ${categoryName}\n`;
    
    if (saleType === 'delivery' || saleType === 'all') {
      const { dateFrom: reportDateFrom, dateTo: reportDateTo } = period === 'custom'
        ? { dateFrom, dateTo }
        : getPeriodDates(period);
      
      if (reportDateFrom && reportDateTo) {
        const from = new Date(reportDateFrom);
        from.setHours(0,0,0,0);
        const to = new Date(reportDateTo);
        to.setHours(23,59,59,999);
        
        const deliveriesCount = await window.api.getDeliveriesCount({
          dateFrom: from.toISOString(),
          dateTo: to.toISOString(),
          categoryId
        });
        report += `🚚 Всего выездов: ${deliveriesCount}\n`;
      }
    }
    
    report += `----------------------------------------\n\n`;
    
    // ТОП товары
    report += `🔥 ТОП ПРОДАВАЕМЫХ ТОВАРОВ\n`;
    if (top.length > 0) {
      top.forEach(item => {
        const value = item.total;
        report += `- ${item.name}: ${value} ${getPluralizedUnit(value, item.unit || '')}\n`;
      });
    } else {
      report += `Нет данных.\n`;
    }
    report += `\n`;

    // Худшие товары
    report += `📉 НАИМЕНЕЕ ПОПУЛЯРНЫЕ ТОВАРЫ\n`;
    if (least.length > 0) {
      least.forEach(item => {
        const value = item.total;
        report += `- ${item.name}: ${value} ${getPluralizedUnit(value, item.unit || '')}\n`;
      });
    } else {
      report += `Нет данных.\n`;
    }
    report += `\n`;

    // Сводка по единицам
    const { dateFrom: reportDateFrom, dateTo: reportDateTo } = period === 'custom'
        ? { dateFrom, dateTo }
        : getPeriodDates(period);

    if (reportDateFrom && reportDateTo) {
      const from = new Date(reportDateFrom); from.setHours(0,0,0,0);
      const to = new Date(reportDateTo); to.setHours(23,59,59,999);
      
      const dailyParams = {
        dateFrom: from.toISOString(),
        dateTo: to.toISOString(),
        categoryId,
        saleType
      };

      const dailyBreakdown = await window.api.getDailyBreakdown(dailyParams);
      const dailyDeliveryCounts = (saleType === 'all' || saleType === 'delivery')
        ? await window.api.getDailyDeliveryCounts(dailyParams)
        : [];

      report += `📅 ДЕТАЛИЗАЦИЯ ПО ДНЯМ НЕДЕЛИ\n`;
      const weekdays = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
      const groupedByDay = dailyBreakdown.reduce((acc, item) => {
        const day = item.weekday;
        if (!acc[day]) acc[day] = [];
        acc[day].push(item);
        return acc;
      }, {});

      const deliveryCountsByDay = dailyDeliveryCounts.reduce((acc, item) => {
        acc[item.weekday] = item.total;
        return acc;
      }, {});
      
      // Сортируем дни недели, начиная с понедельника
      const sortedDays = [1, 2, 3, 4, 5, 6, 0]; 

      for (const dayIndex of sortedDays) {
        if (groupedByDay[dayIndex]) {
          report += `\n--- ${weekdays[dayIndex]} ---\n`;
          
          if (deliveryCountsByDay[dayIndex]) {
            report += `  🚚 Выездов: ${deliveryCountsByDay[dayIndex]}\n`;
          }
          
          groupedByDay[dayIndex].forEach(item => {
            const value = Number(item.total.toFixed(2));
            report += `  - ${item.name}: ${value} ${getPluralizedUnit(value, item.unit || '')}\n`;
          });
        }
      }
    }
    
    // Создание и скачивание файла
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sales-report-${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const weekdayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const forecastWeekdayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

  return (
    <div className="flex justify-center items-start min-h-screen py-8">
      <div className="max-w-7xl w-full p-4 sm:p-8">
        <div className="flex items-center gap-4 mb-8">
          <FaChartBar size={36} className="text-white" />
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-shadow-md">Статистика и отчёты</h2>
        </div>
        
        {/* Панель фильтров */}
        <div className="mb-10 p-6 bg-white border border-gray-200 rounded-2xl shadow-lg">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            <div className="lg:col-span-6 flex flex-wrap items-center gap-3">
              <button onClick={() => { setPeriod('day'); setCustomPeriod(false); }} className={`px-4 py-2 rounded-lg font-semibold text-sm shadow-sm transition-colors ${period === 'day' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>День</button>
              <button onClick={() => { setPeriod('week'); setCustomPeriod(false); }} className={`px-4 py-2 rounded-lg font-semibold text-sm shadow-sm transition-colors ${period === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>Неделя</button>
              <button onClick={() => { setPeriod('month'); setCustomPeriod(false); }} className={`px-4 py-2 rounded-lg font-semibold text-sm shadow-sm transition-colors ${period === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>Месяц</button>
              <button onClick={() => { setPeriod('custom'); setCustomPeriod(true); setTimeout(() => customFromRef.current && customFromRef.current.focus(), 100); }} className={`px-4 py-2 rounded-lg font-semibold text-sm shadow-sm transition-colors ${period === 'custom' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>Выбрать период</button>
              {customPeriod && (
                <div className="flex gap-2 items-center ml-2 border-l-2 pl-4">
                  <input
                    type="date"
                    ref={customFromRef}
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-base"
                    max={dateTo || undefined}
                  />
                  <span className="text-gray-500">—</span>
                  <input
                    type="date"
                    ref={customToRef}
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-base"
                    min={dateFrom || undefined}
                    max={new Date().toISOString().slice(0,10)}
                  />
                </div>
              )}
            </div>
            <div className="lg:col-span-2">
              <select
                value={saleType}
                onChange={e => setSaleType(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 w-full text-base focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Все продажи</option>
                <option value="instore">Продажи в зале</option>
                <option value="delivery">Доставка</option>
              </select>
            </div>
            <div className="lg:col-span-2">
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 w-full text-base focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Все категории</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
             <div className="lg:col-span-2">
              <button 
                onClick={generateTxtReport}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-base font-semibold shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:bg-gray-400"
              >
                <FaFileAlt />
                Скачать отчёт (.txt)
              </button>
            </div>
          </div>
        </div>

        {/* Финансовая сводка */}
        <div className="mb-10 p-6 bg-white border border-gray-200 rounded-2xl shadow-lg">
           <div className="flex items-center gap-3 mb-4">
            <FaDollarSign size={24} className="text-green-600" />
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800">Финансовая сводка</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 font-medium">Общая выручка</p>
              <p className="text-2xl font-bold text-blue-600">{financialSummary.totalRevenue.toFixed(2)} тг</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <p className="text-sm text-red-800 font-medium">Затраты (себестоимость)</p>
              <p className="text-2xl font-bold text-red-600">{financialSummary.totalCost.toFixed(2)} тг</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-green-800 font-medium">Чистая прибыль</p>
              <p className="text-2xl font-bold text-green-600">{financialSummary.netProfit.toFixed(2)} тг</p>
            </div>
          </div>
        </div>

        {/* Блок статистики */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* ТОП товаров */}
          <div className={`p-6 bg-white rounded-2xl shadow-lg border-t-4 border-blue-500 flex flex-col`}>
            <h3 className="font-bold mb-4 text-lg text-gray-800">🔥 ТОП продаваемых товаров</h3>
            {top.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500 h-full">
                <FaRegSmile size={40} className="mb-2" />
                Нет данных для выбранного периода
              </div>
            ) : (
              <Bar
                ref={topChartRef}
                data={{
                  labels: top.map(t => t.name),
                  datasets: [{ label: 'Продано', data: top.map(t => t.total), backgroundColor: '#3b82f6' }]
                }}
                options={{ 
                  responsive: true, 
                  plugins: { 
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          const item = top[context.dataIndex];
                          let label = context.dataset.label || '';
                          if (label) {
                            label += ': ';
                          }
                          if (context.parsed.y !== null) {
                            label += `${context.parsed.y} ${getPluralizedUnit(context.parsed.y, item.unit)}`;
                          }
                          return label;
                        }
                      }
                    }
                  } 
                }}
                height={200}
              />
            )}
          </div>
          {/* Наименее популярные */}
          <div className={`p-6 bg-white rounded-2xl shadow-lg border-t-4 border-green-500 flex flex-col`}>
            <h3 className="font-bold mb-4 text-lg text-gray-800">📉 Наименее популярные</h3>
            {least.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500 h-full">
                <FaRegSmile size={40} className="mb-2" />
                Нет данных для выбранного периода
              </div>
            ) : (
              <Bar
                ref={leastChartRef}
                data={{
                  labels: least.map(t => t.name),
                  datasets: [{ label: 'Продано', data: least.map(t => t.total), backgroundColor: '#10b981' }]
                }}
                options={{ 
                  responsive: true, 
                  plugins: { 
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          const item = least[context.dataIndex];
                          let label = context.dataset.label || '';
                          if (label) {
                            label += ': ';
                          }
                          if (context.parsed.y !== null) {
                            label += `${context.parsed.y} ${getPluralizedUnit(context.parsed.y, item.unit)}`;
                          }
                          return label;
                        }
                      }
                    }
                  } 
                }}
                height={200}
              />
            )}
          </div>
          {/* Средний расход */}
          <div className={`p-6 bg-white rounded-2xl shadow-lg border-t-4 border-yellow-500 flex flex-col`}>
            <h3 className="font-bold mb-4 text-lg text-gray-800">📊 Средние продажи в день</h3>
            {avg.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500 h-full">
                <FaRegSmile size={40} className="mb-2" />
                Нет данных для выбранного периода
              </div>
            ) : (
              <Bar
                ref={avgChartRef}
                data={{
                  labels: avg.map(a => a.name),
                  datasets: [{ label: 'Средний расход', data: avg.map(a => a.avg_per_day), backgroundColor: '#f59e42' }]
                }}
                 options={{ 
                  responsive: true, 
                  plugins: { 
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          const item = avg[context.dataIndex];
                          let label = context.dataset.label || '';
                          if (label) {
                            label += ': ';
                          }
                          if (context.parsed.y !== null) {
                            const avgValue = Number(context.parsed.y.toFixed(2));
                            label += `${avgValue} ${getPluralizedUnit(avgValue, item.unit)}`;
                          }
                          return label;
                        }
                      }
                    }
                  } 
                }}
                height={200}
              />
            )}
          </div>
          {/* По дням недели */}
          <div className={`p-6 bg-white rounded-2xl shadow-lg border-t-4 border-purple-500 flex flex-col`}>
            <h3 className="font-bold mb-4 text-lg text-gray-800">📅 Продажи по дням недели</h3>
            {byWeekday.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500 h-full">
                <FaRegSmile size={40} className="mb-2" />
                Нет данных для выбранного периода
              </div>
            ) : (
              <Bar
                ref={weekdayChartRef}
                data={{
                  labels: byWeekday.map(w => weekdayNames[Number(w.weekday)]),
                  datasets: [{ label: 'Продано', data: byWeekday.map(w => w.total), backgroundColor: '#a78bfa' }]
                }}
                options={{ responsive: true, plugins: { legend: { display: false } } }}
                height={200}
              />
            )}
          </div>
          {/* Прогноз активности - теперь он всегда будет занимать всю ширину на больших экранах */}
          <div className="md:col-span-2 p-4 sm:p-6 bg-white rounded-2xl shadow-lg border-t-4 border-red-500">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
               <div className="flex items-center gap-3">
                <FaBrain className="text-red-500" size={20} />
                <h3 className="font-bold text-lg text-gray-800">{forecastTitle}</h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select value={analysisType} onChange={e => setAnalysisType(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1 text-base">
                    <option value="items">По кол-ву товаров</option>
                    <option value="trips">По кол-ву выездов</option>
                </select>
                <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="border border-gray-300 rounded-lg px-2 py-1 text-base">
                    {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="border border-gray-300 rounded-lg px-2 py-1 text-base">
                    {['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'].map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1 text-base" disabled={!monthWeeks.length}>
                    {monthWeeks.map((w, i) => <option key={i} value={JSON.stringify({start: w.start, end: w.end})}>{w.label}</option>)}
                </select>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4 hidden sm:block">
              Выберите год, месяц и неделю, чтобы увидеть статистику или прогноз на будущее. 
              Прогноз строится на основе данных за выбранный в фильтрах выше период.
            </p>
            {(!forecastData || forecastData.every(v => v === 0)) ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500 h-full">
                <FaRegSmile size={40} className="mb-2" />
                Нет данных для выбранной недели
              </div>
            ) : (
              <Bar
                ref={forecastChartRef}
                data={{
                  labels: forecastWeekdayNames,
                  datasets: [{ 
                    label: analysisType === 'items' ? 'Кол-во проданных единиц' : 'Кол-во выездов', 
                    data: forecastData, 
                    backgroundColor: [
                      'rgba(255, 99, 132, 0.5)',
                      'rgba(54, 162, 235, 0.5)',
                      'rgba(255, 206, 86, 0.5)',
                      'rgba(75, 192, 192, 0.5)',
                      'rgba(153, 102, 255, 0.5)',
                      'rgba(255, 159, 64, 0.5)',
                      'rgba(201, 203, 207, 0.5)'
                    ],
                    borderColor: [
                      'rgb(255, 99, 132)',
                      'rgb(54, 162, 235)',
                      'rgb(255, 206, 86)',
                      'rgb(75, 192, 192)',
                      'rgb(153, 102, 255)',
                      'rgb(255, 159, 64)',
                      'rgb(201, 203, 207)'
                    ],
                    borderWidth: 1
                  }]
                }}
                options={{ 
                  responsive: true, 
                  plugins: { 
                    legend: { display: false },
                    title: {
                      display: false,
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  }
                }}
                height={150}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
