const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development';

// === Вспомогательные функции для валидации ===
// Валидация числовых значений с проверкой диапазона
function validateNumber(value, min = -Infinity, max = Infinity, fieldName = 'Значение') {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error(`${fieldName} должно быть числом`);
  }
  if (value < min) {
    throw new Error(`${fieldName} не может быть меньше ${min}`);
  }
  if (value > max) {
    throw new Error(`${fieldName} не может быть больше ${max}`);
  }
  return true;
}

// Валидация строк с проверкой длины, содержимого и допустимых символов
function validateString(value, minLength = 1, maxLength = Infinity, fieldName = 'Значение', allowSpecialChars = true) {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} должно быть строкой`);
  }
  if (value.length < minLength) {
    throw new Error(`${fieldName} должно содержать минимум ${minLength} символ${minLength > 1 ? 'а' : ''}`);
  }
  if (value.length > maxLength) {
    throw new Error(`${fieldName} не должно превышать ${maxLength} символ${maxLength > 1 ? 'ов' : ''}`);
  }
  
  // Проверка на допустимые символы, если это требуется
  if (!allowSpecialChars) {
    // Разрешаем только буквы, цифры, пробелы и некоторые специальные символы
    const allowedChars = /^[a-zA-Zа-яА-Я0-9\s\-_.,!?@#$%^&*()+=\[\]{}|;:'"<>,./?]*$/;
    if (!allowedChars.test(value)) {
      throw new Error(`${fieldName} содержит недопустимые символы`);
    }
  }
  
  return true;
}

// Определяем путь к базе данных в зависимости от окружения
const dbPath = isDev 
  ? path.join(__dirname, '../db/store.db') 
  : path.join(app.getPath('userData'), 'store.db');

// Убедимся, что директория для БД существует в продакшене
if (!isDev) {
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

let db = new Database(dbPath);

// === Таблица миграций ===
db.exec(`CREATE TABLE IF NOT EXISTS Migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  executed_at TEXT NOT NULL
);`);

// === Функция для выполнения миграций ===
function runMigration(name, migrationFn) {
  // Проверяем, была ли уже выполнена эта миграция
  const existing = db.prepare('SELECT 1 FROM Migrations WHERE name = ?').get(name);
  if (existing) {
    return; // Миграция уже выполнена
  }
  
  try {
    migrationFn();
    // Записываем информацию о выполненной миграции
    db.prepare('INSERT INTO Migrations (name, executed_at) VALUES (?, ?)').run(name, new Date().toISOString());
    console.log(`Миграция "${name}" успешно выполнена`);
  } catch (error) {
    // Если ошибка связана с дублированием столбца, то игнорируем её
    if (error.message && error.message.includes('duplicate column name')) {
      console.log(`Миграция "${name}" уже была выполнена ранее (дублирование столбца)`);
      // Все равно записываем в историю миграций
      db.prepare('INSERT INTO Migrations (name, executed_at) VALUES (?, ?)').run(name, new Date().toISOString());
    } else {
      console.error(`Ошибка при выполнении миграции "${name}":`, error);
      throw error;
    }
  }
}

// === Таблица категорий ===
db.exec(`CREATE TABLE IF NOT EXISTS Categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  image TEXT
);`);

// Добавляем индекс для улучшения производительности поиска по названию категории
db.exec('CREATE INDEX IF NOT EXISTS idx_categories_name_lower ON Categories(LOWER(name));');

// Миграции для категорий
runMigration('categories_add_icon_column', () => {
  try {
    db.prepare('ALTER TABLE Categories ADD COLUMN icon TEXT').run();
  } catch (e) {
    // Игнорируем ошибку, если столбец уже существует
    if (!e.message.includes('duplicate column name')) {
      throw e;
    }
  }
});

ipcMain.handle('categories:get', () => {
  const stmt = db.prepare('SELECT * FROM Categories ORDER BY id DESC');
  return stmt.all();
});
ipcMain.handle('categories:add', (event, { name, icon }) => {
  try {
    // Валидация названия категории с проверкой на допустимые символы
    validateString(name, 1, 50, 'Название категории', false);
    const trimmedName = name.trim();
    
    // Проверка уникальности (без учета регистра)
    const exists = db.prepare('SELECT 1 FROM Categories WHERE LOWER(name) = LOWER(?)').get(trimmedName);
    if (exists) {
      throw new Error('Категория с таким названием уже существует');
    }
    
    const stmt = db.prepare('INSERT INTO Categories (name, icon) VALUES (?, ?)');
    const info = stmt.run(trimmedName, icon);
    return { id: info.lastInsertRowid, name: trimmedName, icon };
  } catch (error) {
    console.error('Ошибка при добавлении категории:', error);
    throw new Error(`Не удалось добавить категорию: ${error.message}`);
  }
});
ipcMain.handle('categories:delete', (event, id) => {
  const stmt = db.prepare('DELETE FROM Categories WHERE id = ?');
  stmt.run(id);
  return true;
});

// === Таблица товаров ===
db.exec(`CREATE TABLE IF NOT EXISTS Products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  unit TEXT,
  image TEXT,
  FOREIGN KEY (category_id) REFERENCES Categories(id) ON DELETE CASCADE
);`);

// Миграции для товаров
runMigration('products_add_icon_column', () => {
  try {
    db.prepare('ALTER TABLE Products ADD COLUMN icon TEXT').run();
  } catch (e) {
    // Игнорируем ошибку, если столбец уже существует
    if (!e.message.includes('duplicate column name')) {
      throw e;
    }
  }
});

runMigration('products_add_price_columns', () => {
  try {
    db.prepare('ALTER TABLE Products ADD COLUMN purchase_price REAL NOT NULL DEFAULT 0').run();
  } catch (e) {
    // Игнорируем ошибку, если столбец уже существует
    if (!e.message.includes('duplicate column name')) {
      throw e;
    }
  }
  
  try {
    db.prepare('ALTER TABLE Products ADD COLUMN selling_price REAL NOT NULL DEFAULT 0').run();
  } catch (e) {
    // Игнорируем ошибку, если столбец уже существует
    if (!e.message.includes('duplicate column name')) {
      throw e;
    }
  }
});

runMigration('products_add_stock_column', () => {
  try {
    db.prepare('ALTER TABLE Products ADD COLUMN stock REAL NOT NULL DEFAULT 0').run();
  } catch (e) {
    // Игнорируем ошибку, если столбец уже существует
    if (!e.message.includes('duplicate column name')) {
      throw e;
    }
  }
});

// Получить товары (по категории или все)
ipcMain.handle('products:get', (event, categoryId) => {
  let stmt;
  if (categoryId) {
    stmt = db.prepare('SELECT * FROM Products WHERE category_id = ? ORDER BY id DESC');
    return stmt.all(categoryId);
  } else {
    stmt = db.prepare('SELECT * FROM Products ORDER BY id DESC');
    return stmt.all();
  }
});

ipcMain.handle('products:add', (event, product) => {
  try {
    if (!product || typeof product !== 'object') throw new Error('Некорректные данные товара');
    
    // Валидация названия товара с проверкой на допустимые символы
    validateString(product.name, 1, 100, 'Название товара', false);
    const trimmedName = product.name.trim();
    
    // Валидация единицы измерения (если указана)
    if (product.unit) {
      validateString(product.unit, 1, 20, 'Единица измерения', false);
    }
    
    // Валидация цен
    validateNumber(product.purchase_price, 0, 999999999, 'Закупочная цена');
    validateNumber(product.selling_price, 0, 999999999, 'Цена продажи');
    
    // Проверка уникальности товара в категории
    const exists = db.prepare('SELECT 1 FROM Products WHERE name = ? AND category_id = ?').get(trimmedName, product.category_id);
    if (exists) {
      throw new Error('Товар с таким названием уже существует в этой категории');
    }
    
    const stmt = db.prepare('INSERT INTO Products (category_id, name, unit, icon, purchase_price, selling_price) VALUES (?, ?, ?, ?, ?, ?)');
    const info = stmt.run(product.category_id, trimmedName, product.unit, product.icon || null, product.purchase_price, product.selling_price);
    return { id: info.lastInsertRowid, ...product, name: trimmedName };
  } catch (error) {
    console.error('Ошибка при добавлении товара:', error);
    throw new Error(`Не удалось добавить товар: ${error.message}`);
  }
});

ipcMain.handle('products:delete', (event, id) => {
  const stmt = db.prepare('DELETE FROM Products WHERE id = ?');
  stmt.run(id);
  return true;
});

ipcMain.handle('products:update', (event, product) => {
  try {
    if (!product || typeof product !== 'object' || typeof product.id !== 'number') throw new Error('Некорректные данные для обновления товара');
    
    // Валидация названия товара с проверкой на допустимые символы
    validateString(product.name, 1, 100, 'Название товара', false);
    const trimmedName = product.name.trim();
    
    // Валидация единицы измерения (если указана)
    if (product.unit) {
      validateString(product.unit, 1, 20, 'Единица измерения', false);
    }
    
    // Валидация цен
    validateNumber(product.purchase_price, 0, 999999999, 'Закупочная цена');
    validateNumber(product.selling_price, 0, 999999999, 'Цена продажи');
    
    // Проверка уникальности товара в категории (кроме текущего)
    const exists = db.prepare('SELECT 1 FROM Products WHERE name = ? AND category_id = ? AND id != ?').get(trimmedName, product.category_id, product.id);
    if (exists) {
      throw new Error('Товар с таким названием уже существует в этой категории');
    }
    
    const stmt = db.prepare('UPDATE Products SET category_id = ?, name = ?, unit = ?, icon = ?, purchase_price = ?, selling_price = ? WHERE id = ?');
    stmt.run(product.category_id, trimmedName, product.unit, product.icon || null, product.purchase_price, product.selling_price, product.id);
    return true;
  } catch (error) {
    console.error('Ошибка при обновлении товара:', error);
    throw new Error(`Не удалось обновить товар: ${error.message}`);
  }
});

// Миграция: добавляем поле icon, если его нет
try { db.prepare('ALTER TABLE Products ADD COLUMN icon TEXT').run(); } catch (e) {}
// Миграция: добавляем поля цен
try { db.prepare('ALTER TABLE Products ADD COLUMN purchase_price REAL NOT NULL DEFAULT 0').run(); } catch (e) {}
try { db.prepare('ALTER TABLE Products ADD COLUMN selling_price REAL NOT NULL DEFAULT 0').run(); } catch (e) {}
// Добавить поле stock (остаток) в Products, если его нет
try { db.prepare('ALTER TABLE Products ADD COLUMN stock REAL NOT NULL DEFAULT 0').run(); } catch (e) {}

// Сохранить изображение товара
ipcMain.handle('product:save-image', (event, filePath) => {
  try {
    const imagesDir = path.join(__dirname, '../images');
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir);

    const ext = path.extname(filePath);
    const fileName = `product_${Date.now()}${ext}`;
    const destPath = path.join(imagesDir, fileName);

    fs.copyFileSync(filePath, destPath);

    return destPath; // Возвращаем только абсолютный путь
  } catch (e) {
    console.error('Ошибка при сохранении изображения товара:', e);
    return '';
  }
});

// === Таблица продаж ===
db.exec(`CREATE TABLE IF NOT EXISTS Sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  quantity REAL NOT NULL,
  date TEXT NOT NULL,
  sale_type TEXT NOT NULL DEFAULT 'instore',
  FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE CASCADE
);`);

// Миграции для продаж
runMigration('sales_add_sale_type_column', () => {
  try {
    db.prepare("ALTER TABLE Sales ADD COLUMN sale_type TEXT NOT NULL DEFAULT 'instore'").run();
  } catch (e) {
    // Игнорируем ошибку, если столбец уже существует
    if (!e.message.includes('duplicate column name')) {
      throw e;
    }
  }
});

runMigration('sales_add_delivery_id_batch_id_columns', () => {
  try {
    db.prepare('ALTER TABLE Sales ADD COLUMN delivery_id INTEGER REFERENCES Deliveries(id)').run();
  } catch (e) {
    // Игнорируем ошибку, если столбец уже существует
    if (!e.message.includes('duplicate column name')) {
      throw e;
    }
  }
  
  try {
    db.prepare('ALTER TABLE Sales ADD COLUMN batch_id TEXT').run();
  } catch (e) {
    // Игнорируем ошибку, если столбец уже существует
    if (!e.message.includes('duplicate column name')) {
      throw e;
    }
  }
});

runMigration('sales_add_discount_column', () => {
  try {
    db.prepare('ALTER TABLE Sales ADD COLUMN discount REAL NOT NULL DEFAULT 0').run();
  } catch (e) {
    // Игнорируем ошибку, если столбец уже существует
    if (!e.message.includes('duplicate column name')) {
      throw e;
    }
  }
});

// === Таблица доставок (заказов) ===
db.exec(`CREATE TABLE IF NOT EXISTS Deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL
)`);

// === Таблица клиентов (для бонусов) ===
db.exec(`CREATE TABLE IF NOT EXISTS Customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  registration_date TEXT NOT NULL,
  bonus_points REAL NOT NULL DEFAULT 0
)`);

// === Таблица транзакций по бонусам ===
db.exec(`CREATE TABLE IF NOT EXISTS BonusTransactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  purchase_amount REAL,
  date TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES Customers(id) ON DELETE CASCADE
)`);

// Миграции для бонусных транзакций
runMigration('bonus_transactions_add_delivery_id_batch_id_columns', () => {
  try {
    db.prepare('ALTER TABLE BonusTransactions ADD COLUMN delivery_id INTEGER REFERENCES Deliveries(id) ON DELETE SET NULL').run();
  } catch (e) {
    // Игнорируем ошибку, если столбец уже существует
    if (!e.message.includes('duplicate column name')) {
      throw e;
    }
  }
  
  try {
    db.prepare('ALTER TABLE BonusTransactions ADD COLUMN batch_id TEXT').run();
  } catch (e) {
    // Игнорируем ошибку, если столбец уже существует
    if (!e.message.includes('duplicate column name')) {
      throw e;
    }
  }
});

// === Таблица настроек ===
db.exec(`CREATE TABLE IF NOT EXISTS Settings (
  key TEXT PRIMARY KEY,
  value TEXT
)`);

// Инициализация настроек по умолчанию
runMigration('settings_initialize_default_bonus_percentage', () => {
  try {
    db.prepare('INSERT INTO Settings (key, value) VALUES (?, ?)').run('bonus_percentage', '1');
  } catch (e) {
    // Игнорируем ошибку, если ключ уже существует
    if (!e.message.includes('UNIQUE constraint failed')) {
      throw e;
    }
  }
});

runMigration('settings_initialize_premium_bonus_percentage', () => {
  try {
    db.prepare('INSERT INTO Settings (key, value) VALUES (?, ?)').run('premium_bonus_percentage', '5');
  } catch (e) {
    // Игнорируем ошибку, если ключ уже существует
    if (!e.message.includes('UNIQUE constraint failed')) {
      throw e;
    }
  }
});

runMigration('settings_initialize_premium_threshold_amount', () => {
  try {
    db.prepare('INSERT INTO Settings (key, value) VALUES (?, ?)').run('premium_threshold_amount', '100000');
  } catch (e) {
    // Игнорируем ошибку, если ключ уже существует
    if (!e.message.includes('UNIQUE constraint failed')) {
      throw e;
    }
  }
});


// Добавить продажу
ipcMain.handle('sales:add', (event, sale) => {
  const stmt = db.prepare('INSERT INTO Sales (product_id, quantity, date, sale_type, discount) VALUES (?, ?, ?, ?, ?)');
  const info = stmt.run(sale.product_id, sale.quantity, sale.date, sale.sale_type || 'instore', sale.discount || 0);
  return { id: info.lastInsertRowid, ...sale };
});

// Новый обработчик для создания доставки с несколькими товарами
ipcMain.handle('delivery:add', (event, { items, bonusInfo }) => {
  if (!Array.isArray(items) || items.length === 0) throw new Error('Корзина пуста');

  try {
    const result = db.transaction(() => {
      // 1. Создаем одну запись о доставке
      const deliveryStmt = db.prepare('INSERT INTO Deliveries (created_at) VALUES (?)');
      const deliveryInfo = deliveryStmt.run(new Date().toISOString());
      const deliveryId = deliveryInfo.lastInsertRowid;

      // 2. Добавляем каждую продажу, связывая ее с созданной доставкой
      const saleStmt = db.prepare('INSERT INTO Sales (product_id, quantity, date, sale_type, delivery_id, discount, batch_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
      const saleDate = new Date().toISOString();
      let totalPurchaseAmount = 0;
      // Генерируем уникальный batch_id для каждой транзакции
      const batchId = `batch-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

      for (const item of items) {
        // Валидация элемента корзины
        if (!item.product_id || typeof item.product_id !== 'number' || item.product_id <= 0) {
          throw new Error('Некорректный ID товара в корзине');
        }
        
        if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
          throw new Error('Некорректное количество товара в корзине');
        }
        
        // Учитываем скидку при сохранении в базу данных
        const discount = item.discount || 0;
        // Валидация скидки
        if (typeof discount !== 'number' || discount < 0 || discount > 100) {
          throw new Error('Скидка должна быть в диапазоне от 0 до 100');
        }
        
        saleStmt.run(item.product_id, item.quantity, saleDate, 'delivery', deliveryId, discount, batchId);
        const product = db.prepare('SELECT selling_price FROM Products WHERE id = ?').get(item.product_id);
        if(product) {
          // Учитываем скидку при расчете суммы
          totalPurchaseAmount += item.quantity * product.selling_price * (1 - discount / 100);
        }
      }

      // 3. Обработка бонусов (аналогично 'sales:process-cart')
      if (bonusInfo && bonusInfo.customerId) {
        // Валидация бонусной информации
        if (typeof bonusInfo.customerId !== 'number' || bonusInfo.customerId <= 0) {
          throw new Error('Некорректный ID клиента для бонусов');
        }
        
        let currentBonusPoints = db.prepare('SELECT bonus_points FROM Customers WHERE id = ?').get(bonusInfo.customerId).bonus_points;

        // Списание бонусов
        if (bonusInfo.debitAmount > 0) {
          // Валидация суммы списания
          if (typeof bonusInfo.debitAmount !== 'number' || bonusInfo.debitAmount <= 0) {
            throw new Error('Сумма списания бонусов должна быть положительным числом');
          }
          
          if (bonusInfo.debitAmount > currentBonusPoints) {
            throw new Error('Недостаточно бонусов для списания');
          }
          const debitStmt = db.prepare('INSERT INTO BonusTransactions (customer_id, type, amount, date, delivery_id, batch_id) VALUES (?, ?, ?, ?, ?, ?)');
          debitStmt.run(bonusInfo.customerId, 'debit', bonusInfo.debitAmount, saleDate, deliveryId, batchId);
          currentBonusPoints -= bonusInfo.debitAmount;
        }

        // Начисление бонусов (с новой логикой)
        const standardBonusPercentage = parseFloat(db.prepare('SELECT value FROM Settings WHERE key = ?').get('bonus_percentage').value || '1');
        const premiumBonusPercentage = parseFloat(db.prepare('SELECT value FROM Settings WHERE key = ?').get('premium_bonus_percentage').value || '5');
        const premiumThreshold = parseFloat(db.prepare('SELECT value FROM Settings WHERE key = ?').get('premium_threshold_amount').value || '100000');
        
        // Валидация настроек бонусов
        validateNumber(standardBonusPercentage, 0, 100, 'Стандартный процент бонусов');
        validateNumber(premiumBonusPercentage, 0, 200, 'Повышенный процент бонусов');
        validateNumber(premiumThreshold, 0, 999999999, 'Пороговая сумма');
        
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
        const monthlySpendStmt = db.prepare(
          `SELECT SUM(purchase_amount) as total FROM BonusTransactions 
           WHERE customer_id = ? AND type = 'accrual' AND date BETWEEN ? AND ?`
        );
        const monthlySpendResult = monthlySpendStmt.get(bonusInfo.customerId, monthStart, monthEnd);
        const monthlySpend = monthlySpendResult.total || 0;

        const bonusPercentage = monthlySpend >= premiumThreshold ? premiumBonusPercentage : standardBonusPercentage;
        
        // Начисляем кэшбэк на сумму с учетом списанных бонусов
        const amountForAccrual = totalPurchaseAmount - (bonusInfo.debitAmount || 0);
        if (amountForAccrual > 0) {
          const accrualAmount = (amountForAccrual * bonusPercentage) / 100;
          if(accrualAmount > 0) {
            const accrualStmt = db.prepare('INSERT INTO BonusTransactions (customer_id, type, amount, purchase_amount, date, delivery_id, batch_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
            accrualStmt.run(bonusInfo.customerId, 'accrual', accrualAmount, amountForAccrual, saleDate, deliveryId, batchId);
            currentBonusPoints += accrualAmount;
          }
        }

        // Обновление баланса клиента
        db.prepare('UPDATE Customers SET bonus_points = ? WHERE id = ?').run(currentBonusPoints, bonusInfo.customerId);
      }
      
      return { success: true, deliveryId, batchId };
    })();
    return result;
  } catch (error) {
    logErrorToFile(error, 'Ошибка при создании доставки');
    console.error("Ошибка при создании доставки:", error);
    return { success: false, message: `Не удалось создать доставку: ${error.message}` };
  }
});

  // Отмена доставки
  ipcMain.handle('delivery:cancel', (event, deliveryId) => {
    if (!deliveryId) {
      return { success: false, message: 'Не указан ID доставки' };
    }
    try {
      const result = db.transaction(() => {
        // 1. Находим все продажи, связанные с этой доставкой, чтобы получить batch_id
        const sales = db.prepare('SELECT DISTINCT batch_id FROM Sales WHERE delivery_id = ?').all(deliveryId);
        const batchIds = sales.map(s => s.batch_id).filter(id => id);
        
        // 2. Находим и откатываем бонусные транзакции по delivery_id и batch_id
        let bonusTransactions = db.prepare('SELECT * FROM BonusTransactions WHERE delivery_id = ?').all(deliveryId);
        
        // Если есть batch_id, также ищем бонусные транзакции по ним
        if (batchIds.length > 0) {
          const batchTransactions = db.prepare(
            `SELECT * FROM BonusTransactions WHERE batch_id IN (${batchIds.map(() => '?').join(',')})`
          ).all(...batchIds);
          bonusTransactions = [...bonusTransactions, ...batchTransactions];
        }
        
        if (bonusTransactions.length > 0) {
          // Удаляем дубликаты транзакций
          const uniqueTransactions = bonusTransactions.filter((transaction, index, self) => 
            index === self.findIndex(t => t.id === transaction.id)
          );
          
          const customerId = uniqueTransactions[0].customer_id;
          let pointsToReturn = 0;
          uniqueTransactions.forEach(transaction => {
            if (transaction.type === 'debit') {
              pointsToReturn += transaction.amount;
            } else if (transaction.type === 'accrual') {
              pointsToReturn -= transaction.amount;
            }
          });

          if (pointsToReturn !== 0) {
            db.prepare('UPDATE Customers SET bonus_points = bonus_points + ? WHERE id = ?').run(pointsToReturn, customerId);
          }

          // Удаляем бонусные транзакции по delivery_id
          db.prepare('DELETE FROM BonusTransactions WHERE delivery_id = ?').run(deliveryId);
          
          // Если есть batch_id, также удаляем бонусные транзакции по ним
          if (batchIds.length > 0) {
            db.prepare(
              `DELETE FROM BonusTransactions WHERE batch_id IN (${batchIds.map(() => '?').join(',')})`
            ).run(...batchIds);
          }
        }
        
        // 3. Сначала удаляем все продажи, связанные с этой доставкой
        const deleteSalesStmt = db.prepare('DELETE FROM Sales WHERE delivery_id = ?');
        deleteSalesStmt.run(deliveryId);

        // 4. Затем удаляем саму доставку
        const deleteDeliveryStmt = db.prepare('DELETE FROM Deliveries WHERE id = ?');
        const info = deleteDeliveryStmt.run(deliveryId);

        if (info.changes === 0) {
          throw new Error('Доставка не найдена');
        }

        return { success: true };
      })();
      return result;
    } catch (error) {
      console.error(`Ошибка при отмене доставки #${deliveryId}:`, error);
      return { success: false, message: `Не удалось отменить доставку: ${error.message}` };
    }
  });
  
  // Новый обработчик для оформления продажи из корзины
  ipcMain.handle('sales:process-cart', async (event, { items, bonusInfo }) => {
    if (!Array.isArray(items) || items.length === 0) throw new Error('Корзина пуста');
  
    try {
      const result = db.transaction(() => {
        const saleStmt = db.prepare('INSERT INTO Sales (product_id, quantity, date, sale_type, batch_id, discount) VALUES (?, ?, ?, ?, ?, ?)');
        const saleDate = new Date().toISOString();
        let totalPurchaseAmount = 0;
        // Генерируем уникальный batch_id для каждой транзакции
        const batchId = `batch-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
  
        // Рассчитываем общую сумму с учетом скидок
        for (const item of items) {
          // Валидация элемента корзины
          if (!item.product_id || typeof item.product_id !== 'number' || item.product_id <= 0) {
            throw new Error('Некорректный ID товара в корзине');
          }
          
          if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
            throw new Error('Некорректное количество товара в корзине');
          }
          
          // Учитываем скидку при сохранении в базу данных
          const discount = item.discount || 0;
          // Валидация скидки
          if (typeof discount !== 'number' || discount < 0 || discount > 100) {
            throw new Error('Скидка должна быть в диапазоне от 0 до 100');
          }
          
          saleStmt.run(item.product_id, item.quantity, saleDate, 'instore', batchId, discount);
          const product = db.prepare('SELECT selling_price FROM Products WHERE id = ?').get(item.product_id);
          if(product) {
            // Учитываем скидку при расчете суммы
            totalPurchaseAmount += item.quantity * product.selling_price * (1 - discount / 100);
          }
        }
  
        if (bonusInfo && bonusInfo.customerId) {
          // Валидация бонусной информации
          if (typeof bonusInfo.customerId !== 'number' || bonusInfo.customerId <= 0) {
            throw new Error('Некорректный ID клиента для бонусов');
          }
          
          let currentBonusPoints = db.prepare('SELECT bonus_points FROM Customers WHERE id = ?').get(bonusInfo.customerId).bonus_points;
  
          // 1. Списание бонусов, если они используются
          if (bonusInfo.debitAmount > 0) {
            // Валидация суммы списания
            if (typeof bonusInfo.debitAmount !== 'number' || bonusInfo.debitAmount <= 0) {
              throw new Error('Сумма списания бонусов должна быть положительным числом');
            }
            
            if (bonusInfo.debitAmount > currentBonusPoints) {
              throw new Error('Недостаточно бонусов для списания');
            }
            const debitStmt = db.prepare('INSERT INTO BonusTransactions (customer_id, type, amount, date, batch_id) VALUES (?, ?, ?, ?, ?)');
            debitStmt.run(bonusInfo.customerId, 'debit', bonusInfo.debitAmount, saleDate, batchId);
            currentBonusPoints -= bonusInfo.debitAmount;
          }
  
          // 2. Начисление бонусов (с новой логикой)
          const standardBonusPercentage = parseFloat(db.prepare('SELECT value FROM Settings WHERE key = ?').get('bonus_percentage').value || '1');
          const premiumBonusPercentage = parseFloat(db.prepare('SELECT value FROM Settings WHERE key = ?').get('premium_bonus_percentage').value || '5');
          const premiumThreshold = parseFloat(db.prepare('SELECT value FROM Settings WHERE key = ?').get('premium_threshold_amount').value || '100000');
          
          // Валидация настроек бонусов
          validateNumber(standardBonusPercentage, 0, 100, 'Стандартный процент бонусов');
          validateNumber(premiumBonusPercentage, 0, 200, 'Повышенный процент бонусов');
          validateNumber(premiumThreshold, 0, 999999999, 'Пороговая сумма');
          
          const now = new Date();
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
          const monthlySpendStmt = db.prepare(
            `SELECT SUM(purchase_amount) as total FROM BonusTransactions 
             WHERE customer_id = ? AND type = 'accrual' AND date BETWEEN ? AND ?`
          );
          const monthlySpendResult = monthlySpendStmt.get(bonusInfo.customerId, monthStart, monthEnd);
          const monthlySpend = monthlySpendResult.total || 0;
  
          const bonusPercentage = monthlySpend >= premiumThreshold ? premiumBonusPercentage : standardBonusPercentage;
  
          // Начисляем кэшбэк на сумму с учетом списанных бонусов
          const amountForAccrual = totalPurchaseAmount - (bonusInfo.debitAmount || 0);
          if (amountForAccrual > 0) {
            const accrualAmount = (amountForAccrual * bonusPercentage) / 100;
            if(accrualAmount > 0) {
              const accrualStmt = db.prepare('INSERT INTO BonusTransactions (customer_id, type, amount, purchase_amount, date, batch_id) VALUES (?, ?, ?, ?, ?, ?)');
              accrualStmt.run(bonusInfo.customerId, 'accrual', accrualAmount, amountForAccrual, saleDate, batchId);
              currentBonusPoints += accrualAmount;
            }
          }
  
          // 3. Обновление баланса клиента
          db.prepare('UPDATE Customers SET bonus_points = ? WHERE id = ?').run(currentBonusPoints, bonusInfo.customerId);
        }
        
        return { success: true, batchId };
      })();
      return result;
    } catch (error) {
      logErrorToFile(error, 'Ошибка при оформлении продажи');
      console.error("Ошибка при оформлении продажи:", error);
      return { success: false, message: `Не удалось оформить продажу: ${error.message}` };
    }
  });
  
  
  // === Клиенты и бонусы ===

// Найти клиента по номеру телефона
ipcMain.handle('customers:find-by-phone', (event, phone) => {
  const stmt = db.prepare('SELECT * FROM Customers WHERE phone = ?');
  return stmt.get(phone);
});

// Создать нового клиента
ipcMain.handle('customers:create', (event, { name, phone }) => {
  try {
    // Валидация имени клиента с проверкой на допустимые символы
    validateString(name, 1, 100, 'Имя клиента', false);
    
    // Проверка формата телефона (должен начинаться с +7 и содержать 11 цифр)
    if (!phone || typeof phone !== 'string' || !/^\+7\d{10}$/.test(phone)) {
      throw new Error('Некорректный формат номера телефона. Должен начинаться с +7 и содержать 11 цифр');
    }
    
    const date = new Date().toISOString();
    const stmt = db.prepare('INSERT INTO Customers (name, phone, registration_date) VALUES (?, ?, ?)');
    const info = stmt.run(name, phone, date);
    return { id: info.lastInsertRowid, name, phone, registration_date: date, bonus_points: 0 };
  } catch (error) {
    console.error('Ошибка при создании клиента:', error);
    throw new Error(`Не удалось создать клиента: ${error.message}`);
  }
});

// Получить детали по клиенту (включая кол-во транзакций)
ipcMain.handle('customers:get-details', (event, customerId) => {
  const customer = db.prepare('SELECT * FROM Customers WHERE id = ?').get(customerId);
  if (!customer) return null;

  const stats = db.prepare('SELECT COUNT(id) as transaction_count FROM BonusTransactions WHERE customer_id = ?').get(customerId);
  customer.transaction_count = stats.transaction_count || 0;
  
  return customer;
});

// Получить историю покупок клиента
ipcMain.handle('customers:get-purchase-history', (event, customerId) => {
  // Находим все batch_id и delivery_id, связанные с бонусными транзакциями клиента
  const transactions = db.prepare(
    'SELECT DISTINCT batch_id, delivery_id FROM BonusTransactions WHERE customer_id = ?'
  ).all(customerId);

  const batchIds = transactions.map(t => t.batch_id).filter(id => id);
  const deliveryIds = transactions.map(t => t.delivery_id).filter(id => id);
  
  if (batchIds.length === 0 && deliveryIds.length === 0) {
    return [];
  }

  // Создаем динамический SQL-запрос
  let whereClauses = [];
  const params = [];

  if (batchIds.length > 0) {
    whereClauses.push(`s.batch_id IN (${batchIds.map(() => '?').join(',')})`);
    params.push(...batchIds);
  }
  if (deliveryIds.length > 0) {
    whereClauses.push(`s.delivery_id IN (${deliveryIds.map(() => '?').join(',')})`);
    params.push(...deliveryIds);
  }

  const sql = `
    SELECT
      s.date,
      s.batch_id,
      s.delivery_id,
      p.name as product_name,
      s.quantity,
      p.selling_price
    FROM Sales s
    JOIN Products p ON s.product_id = p.id
    WHERE ${whereClauses.join(' OR ')}
    ORDER BY s.date DESC
  `;
  
  return db.prepare(sql).all(...params);
});

// Получить историю бонусов клиента
ipcMain.handle('customers:get-bonus-history', (event, customerId) => {
  const stmt = db.prepare(
    `SELECT * FROM BonusTransactions WHERE customer_id = ? ORDER BY date DESC`
  );
  return stmt.all(customerId);
});

// Новый обработчик для получения суммы трат за текущий месяц
ipcMain.handle('customers:get-monthly-spend', (event, customerId) => {
  const now = new Date();
  const dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

  // Мы суммируем `purchase_amount` из транзакций начисления,
  // так как это поле отражает сумму, на которую были начислены бонусы.
  const stmt = db.prepare(
    `SELECT SUM(purchase_amount) as total FROM BonusTransactions 
     WHERE customer_id = ? AND type = 'accrual' AND date BETWEEN ? AND ?`
  );
  
  const result = stmt.get(customerId, dateFrom, dateTo);
  return parseFloat((result.total || 0).toFixed(2));
});


// Добавить транзакцию по бонусам (начисление/списание)
ipcMain.handle('bonuses:add-transaction', (event, { customerId, type, amount, purchaseAmount }) => {
  return db.transaction(() => {
    try {
      // Валидация параметров
      if (!customerId || typeof customerId !== 'number' || customerId <= 0) {
        throw new Error('Некорректный ID клиента');
      }
      
      if (!type || typeof type !== 'string' || (type !== 'accrual' && type !== 'debit')) {
        throw new Error('Некорректный тип транзакции');
      }
      
      // Валидация сумм
      const numericAmount = parseFloat(amount);
      const numericPurchaseAmount = purchaseAmount ? parseFloat(purchaseAmount) : null;
      
      if (isNaN(numericAmount) || numericAmount <= 0) {
        throw new Error('Сумма транзакции должна быть положительным числом');
      }
      
      if (numericPurchaseAmount !== null && (isNaN(numericPurchaseAmount) || numericPurchaseAmount < 0)) {
        throw new Error('Сумма покупки должна быть неотрицательным числом');
      }
      
      // 1. Добавляем запись в историю транзакций
      const date = new Date().toISOString();
      const transactionStmt = db.prepare(
        'INSERT INTO BonusTransactions (customer_id, type, amount, purchase_amount, date) VALUES (?, ?, ?, ?, ?)'
      );
      transactionStmt.run(customerId, type, numericAmount, numericPurchaseAmount, date);

      // 2. Обновляем баланс клиента
      const updateAmount = type === 'accrual' ? numericAmount : -numericAmount;
      const customerStmt = db.prepare('UPDATE Customers SET bonus_points = bonus_points + ? WHERE id = ?');
      customerStmt.run(updateAmount, customerId);

      // 3. Возвращаем обновленного клиента
      const updatedCustomer = db.prepare('SELECT * FROM Customers WHERE id = ?').get(customerId);
      return { success: true, customer: updatedCustomer };
    } catch (error) {
      console.error('Ошибка при добавлении транзакции бонусов:', error);
      throw new Error(`Не удалось выполнить транзакцию бонусов: ${error.message}`);
    }
  })();
});


// === Настройки ===
ipcMain.handle('settings:get', (event, key) => {
  const stmt = db.prepare('SELECT value FROM Settings WHERE key = ?');
  const result = stmt.get(key);
  return result ? result.value : null;
});

ipcMain.handle('settings:set', (event, { key, value }) => {
  try {
    // Валидация ключа настроек
    validateString(key, 1, 100, 'Ключ настроек');
    
    // Валидация значения настроек в зависимости от ключа
    let validatedValue = value;
    switch (key) {
      case 'bonus_percentage':
        const bonusPercentage = parseFloat(value);
        validateNumber(bonusPercentage, 0, 100, 'Процент бонусов');
        validatedValue = bonusPercentage.toString();
        break;
      case 'premium_bonus_percentage':
        const premiumBonusPercentage = parseFloat(value);
        validateNumber(premiumBonusPercentage, 0, 200, 'Повышенный процент бонусов');
        validatedValue = premiumBonusPercentage.toString();
        break;
      case 'premium_threshold_amount':
        const premiumThreshold = parseFloat(value);
        validateNumber(premiumThreshold, 0, 999999999, 'Пороговая сумма');
        validatedValue = premiumThreshold.toString();
        break;
      case 'max_discount':
        const maxDiscount = parseFloat(value);
        validateNumber(maxDiscount, 0, 100, 'Максимальная скидка');
        validatedValue = maxDiscount.toString();
        break;
      default:
        // Для остальных настроек просто проверяем, что значение является строкой
        if (typeof value !== 'string') {
          validatedValue = String(value);
        }
        break;
    }
    
    const stmt = db.prepare('INSERT OR REPLACE INTO Settings (key, value) VALUES (?, ?)');
    stmt.run(key, validatedValue);
    return true;
  } catch (error) {
    console.error('Ошибка при сохранении настроек:', error);
    throw new Error(`Не удалось сохранить настройки: ${error.message}`);
  }
});

// Отчет по бонусам
ipcMain.handle('bonuses:get-report', (event, period) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Устанавливаем время на начало дня

  let dateFrom;
  const today = new Date(now);

  switch (period) {
    case 'week':
      const dayOfWeek = today.getDay(); // 0 = Вс, 1 = Пн
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Сдвиг к понедельнику
      dateFrom = new Date(today.setDate(diff));
      break;
    case 'month':
      dateFrom = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case 'day':
    default:
      dateFrom = today;
      break;
  }

  const dateFromISO = dateFrom.toISOString();
  const dateToISO = new Date().toISOString();

  const accruedStmt = db.prepare(
    `SELECT SUM(amount) as total FROM BonusTransactions WHERE type = 'accrual' AND date BETWEEN ? AND ?`
  );
  const accruedResult = accruedStmt.get(dateFromISO, dateToISO);

  const debitedStmt = db.prepare(
    `SELECT SUM(amount) as total FROM BonusTransactions WHERE type = 'debit' AND date BETWEEN ? AND ?`
  );
  const debitedResult = debitedStmt.get(dateFromISO, dateToISO);
  
  const totalBalanceStmt = db.prepare('SELECT SUM(bonus_points) as total FROM Customers');
  const totalBalanceResult = totalBalanceStmt.get();

  return {
    accrued: parseFloat((accruedResult.total || 0).toFixed(2)),
    debited: parseFloat((debitedResult.total || 0).toFixed(2)),
    totalBalance: parseFloat((totalBalanceResult.total || 0).toFixed(2)),
  };
});


// Получить продажи за период
ipcMain.handle('sales:get', (event, { dateFrom, dateTo, saleType }) => {
  let sql = `
    SELECT 
      Sales.*, 
      Products.name as product_name, 
      Products.unit, 
      Products.category_id,
      Products.selling_price,
      Products.purchase_price
    FROM Sales 
    JOIN Products ON Sales.product_id = Products.id 
    WHERE date BETWEEN ? AND ?`;
  const params = [dateFrom, dateTo];

  if (saleType && saleType !== 'all') {
    sql += ' AND Sales.sale_type = ?';
    params.push(saleType);
  }

  sql += ' ORDER BY date DESC';
  
  const stmt = db.prepare(sql);
  return stmt.all(...params);
});

// Отменить последнюю продажу для товара
ipcMain.handle('sales:undo-last', (event, { productId, saleType }) => {
  try {
    // Валидация параметров
    if (!productId || typeof productId !== 'number' || productId <= 0 || !Number.isInteger(productId)) {
      return { success: false, message: 'Некорректный ID товара' };
    }
    
    if (!saleType || typeof saleType !== 'string' || (saleType !== 'instore' && saleType !== 'delivery')) {
      return { success: false, message: 'Некорректный тип продажи' };
    }

    const saleToDelete = db.prepare(`
      SELECT id, batch_id FROM Sales 
      WHERE product_id = ? AND sale_type = ?
      ORDER BY date DESC 
      LIMIT 1
    `).get(productId, saleType);

    if (!saleToDelete) {
      return { success: false, message: 'Продажа не найдена' };
    }

    // Если продажа была частью "чека" (batch), отменяем весь чек.
    if (saleToDelete.batch_id) {
      try {
        const result = db.transaction(() => {
          const batchId = saleToDelete.batch_id;

          // 1. Находим и откатываем бонусные транзакции
          const bonusTransactions = db.prepare('SELECT * FROM BonusTransactions WHERE batch_id = ?').all(batchId);
          if (bonusTransactions.length > 0) {
            const customerId = bonusTransactions[0].customer_id;
            let pointsToReturn = 0;
            bonusTransactions.forEach(transaction => {
              if (transaction.type === 'debit') pointsToReturn += transaction.amount;
              else if (transaction.type === 'accrual') pointsToReturn -= transaction.amount;
            });
            if (pointsToReturn !== 0) {
              db.prepare('UPDATE Customers SET bonus_points = bonus_points + ? WHERE id = ?').run(pointsToReturn, customerId);
            }
            db.prepare('DELETE FROM BonusTransactions WHERE batch_id = ?').run(batchId);
          }

          // 2. Удаляем все продажи из этого чека
          const undoneSales = db.prepare('SELECT p.name FROM Sales s JOIN Products p ON s.product_id = p.id WHERE s.batch_id = ?').all(batchId);
          db.prepare('DELETE FROM Sales WHERE batch_id = ?').run(batchId);
          
          return { success: true, undoneBatch: true, undoneItems: undoneSales.map(i => i.name) };
        })();
        return result;
      } catch (error) {
        console.error(`Ошибка при отмене чека ${saleToDelete.batch_id}:`, error);
        return { success: false, message: `Не удалось отменить чек: ${error.message}` };
      }
    } else {
      // Обычная отмена одиночной продажи
      const stmt = db.prepare('DELETE FROM Sales WHERE id = ?');
      stmt.run(saleToDelete.id);
      return { success: true };
    }
  } catch (error) {
    console.error('Ошибка при отмене последней продажи:', error);
    return { success: false, message: `Не удалось отменить продажу: ${error.message}` };
  }
});

// === Статистика ===

// Новый обработчик для финансового отчета
ipcMain.handle('stats:get-financial-summary', (event, { dateFrom, dateTo, categoryId, saleType }) => {
  let sql = `
    SELECT 
      SUM(s.quantity * p.selling_price) as totalRevenue,
      SUM(s.quantity * p.purchase_price) as totalCost
    FROM Sales s
    JOIN Products p ON s.product_id = p.id
    WHERE s.date BETWEEN ? AND ?
  `;
  const params = [dateFrom, dateTo];

  if (categoryId && categoryId !== 'all') {
    sql += ' AND p.category_id = ?';
    params.push(categoryId);
  }
  if (saleType && saleType !== 'all') {
    sql += ' AND s.sale_type = ?';
    params.push(saleType);
  }

  const stmt = db.prepare(sql);
  const result = stmt.get(...params);
  
  const totalRevenue = result.totalRevenue || 0;
  const totalCost = result.totalCost || 0;

  return {
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    totalCost: parseFloat(totalCost.toFixed(2)),
    netProfit: parseFloat((totalRevenue - totalCost).toFixed(2)),
  };
});


// Топ товаров
ipcMain.handle('stats:top-products', (event, { dateFrom, dateTo, limit = 5, categoryId, saleType }) => {
  let sql = `
    SELECT Products.name, SUM(Sales.quantity) as total, Products.unit
    FROM Sales
    JOIN Products ON Sales.product_id = Products.id
    WHERE date BETWEEN ? AND ?`;
  const params = [dateFrom, dateTo];

  if (categoryId && categoryId !== 'all') {
    sql += ' AND Products.category_id = ?';
    params.push(categoryId);
  }
  if (saleType && saleType !== 'all') {
    sql += ' AND Sales.sale_type = ?';
    params.push(saleType);
  }

  sql += ` GROUP BY Sales.product_id ORDER BY total DESC LIMIT ?`;
  params.push(limit);
  const stmt = db.prepare(sql);
  const results = stmt.all(...params);
  // Округляем значения total до 2 знаков после запятой
  return results.map(item => ({
    ...item,
    total: parseFloat(item.total.toFixed(2))
  }));
});

// Худшие товары
ipcMain.handle('stats:least-products', (event, { dateFrom, dateTo, limit = 5, categoryId, saleType }) => {
  let sql = `
    SELECT Products.name, SUM(Sales.quantity) as total, Products.unit
    FROM Sales
    JOIN Products ON Sales.product_id = Products.id
    WHERE date BETWEEN ? AND ?`;
  const params = [dateFrom, dateTo];

  if (categoryId && categoryId !== 'all') {
    sql += ' AND Products.category_id = ?';
    params.push(categoryId);
  }
  if (saleType && saleType !== 'all') {
    sql += ' AND Sales.sale_type = ?';
    params.push(saleType);
  }

  sql += ` GROUP BY Sales.product_id ORDER BY total ASC LIMIT ?`;
  params.push(limit);
  const stmt = db.prepare(sql);
  const results = stmt.all(...params);
  // Округляем значения total до 2 знаков после запятой
  return results.map(item => ({
    ...item,
    total: parseFloat(item.total.toFixed(2))
  }));
});

// Средний расход в день
ipcMain.handle('stats:avg-per-day', (event, { dateFrom, dateTo, categoryId, saleType }) => {
  let sql = `
    SELECT Products.name, SUM(Sales.quantity) / COUNT(DISTINCT date(Sales.date)) as avg_per_day, Products.unit
    FROM Sales
    JOIN Products ON Sales.product_id = Products.id
    WHERE date BETWEEN ? AND ?`;
  const params = [dateFrom, dateTo];

  if (categoryId && categoryId !== 'all') {
    sql += ' AND Products.category_id = ?';
    params.push(categoryId);
  }
  if (saleType && saleType !== 'all') {
    sql += ' AND Sales.sale_type = ?';
    params.push(saleType);
  }

  sql += ` GROUP BY Sales.product_id ORDER BY avg_per_day DESC`;
  const stmt = db.prepare(sql);
  const results = stmt.all(...params);
  // Округляем значения avg_per_day до 2 знаков после запятой
  return results.map(item => ({
    ...item,
    avg_per_day: parseFloat(item.avg_per_day.toFixed(2))
  }));
});

// По дням недели
ipcMain.handle('stats:by-weekday', (event, { dateFrom, dateTo, categoryId, saleType }) => {
  let sql = `
    SELECT strftime('%w', date) as weekday, SUM(quantity) as total
    FROM Sales
    JOIN Products ON Sales.product_id = Products.id
    WHERE date BETWEEN ? AND ?`;
  const params = [dateFrom, dateTo];

  if (categoryId && categoryId !== 'all') {
    sql += ' AND Products.category_id = ?';
    params.push(categoryId);
  }
  if (saleType && saleType !== 'all') {
    sql += ' AND Sales.sale_type = ?';
    params.push(saleType);
  }

  sql += ` GROUP BY weekday ORDER BY weekday`;
  const stmt = db.prepare(sql);
  const results = stmt.all(...params);
  // Округляем значения total до 2 знаков после запятой
  return results.map(item => ({
    ...item,
    total: parseFloat(item.total.toFixed(2))
  }));
});

// Новый обработчик для прогноза по дням недели
ipcMain.handle('stats:activity-forecast', (event, { dateFrom, dateTo, saleType, analysisType, categoryId }) => {
  let sql;
  const params = [];

  if (analysisType === 'trips') {
    // Прогноз по выездам имеет смысл только для доставок.
    // Если выбран тип "Продажи в зале", выездов быть не может.
    if (saleType === 'instore') {
      return [0, 0, 0, 0, 0, 0, 0]; 
    }
    sql = `
      SELECT
        strftime('%w', d.created_at) as weekday,
        date(d.created_at) as sale_date,
        COUNT(DISTINCT d.id) as total_value
      FROM Deliveries d
      JOIN Sales s ON s.delivery_id = d.id
      JOIN Products p ON s.product_id = p.id
      WHERE d.created_at BETWEEN ? AND ?
    `;
    params.push(dateFrom, dateTo);
    if (categoryId && categoryId !== 'all') {
      sql += ' AND p.category_id = ?';
      params.push(categoryId);
    }
    sql += `
      GROUP BY sale_date
      ORDER BY sale_date;
    `;
  } else { // 'items'
    sql = `
      SELECT 
        strftime('%w', s.date) as weekday, 
        date(s.date) as sale_date,
        SUM(s.quantity) as total_value
      FROM Sales s
      JOIN Products p ON s.product_id = p.id
      WHERE s.date BETWEEN ? AND ?`;
    
    params.push(dateFrom, dateTo);
    if (saleType && saleType !== 'all') {
      sql += ' AND s.sale_type = ?';
      params.push(saleType);
    }

    if (categoryId && categoryId !== 'all') {
      sql += ' AND p.category_id = ?';
      params.push(categoryId);
    }

    sql += `
      GROUP BY sale_date
      ORDER BY sale_date;
    `;
  }

  const stmt = db.prepare(sql);
  const salesByDate = stmt.all(...params);

  // Обрабатываем данные, чтобы найти среднее значение для каждого дня недели
  const dailyTotals = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }; // 0: Sun, 1: Mon...
  salesByDate.forEach(row => {
    dailyTotals[row.weekday].push(row.total_value);
  });

  const avgByWeekday = [];
  for (let i = 0; i < 7; i++) {
    const totals = dailyTotals[i];
    if (totals.length === 0) {
      avgByWeekday.push(0);
    } else {
      const sum = totals.reduce((a, b) => a + b, 0);
      avgByWeekday.push(sum / totals.length);
    }
  }
  
  // Переставляем воскресенье (индекс 0) в конец массива для удобства отображения
  const sundayData = avgByWeekday.shift();
  avgByWeekday.push(sundayData);
  
  // Округляем значения до 2 знаков после запятой
  const roundedAvgByWeekday = avgByWeekday.map(value => parseFloat(value.toFixed(2)));

  return roundedAvgByWeekday; // Возвращаем массив [avgMon, avgTue, ..., avgSun]
});

// Новый обработчик для получения фактических продаж за выбранную неделю
ipcMain.handle('stats:get-sales-for-week', (event, { dateFrom, dateTo, saleType, analysisType, categoryId }) => {
  let sql;
  const params = [];

  if (analysisType === 'trips') {
    // Фактические выезды имеют смысл только для доставок.
    if (saleType === 'instore') {
      return [0, 0, 0, 0, 0, 0, 0];
    }
    sql = `
      SELECT
        strftime('%w', d.created_at) as weekday,
        COUNT(DISTINCT d.id) as total
      FROM Deliveries d
      JOIN Sales s ON s.delivery_id = d.id
      JOIN Products p ON s.product_id = p.id
      WHERE d.created_at BETWEEN ? AND ?
    `;
    params.push(dateFrom, dateTo);
    if (categoryId && categoryId !== 'all') {
      sql += ' AND p.category_id = ?';
      params.push(categoryId);
    }
    sql += ' GROUP BY weekday;';
  } else { // 'items'
    sql = `
      SELECT
        strftime('%w', s.date) as weekday,
        SUM(s.quantity) as total
      FROM Sales s
      JOIN Products p ON s.product_id = p.id
      WHERE s.date BETWEEN ? AND ?`;
    
    params.push(dateFrom, dateTo);
    if (saleType && saleType !== 'all') {
      sql += ' AND s.sale_type = ?';
      params.push(saleType);
    }
    if (categoryId && categoryId !== 'all') {
      sql += ' AND p.category_id = ?';
      params.push(categoryId);
    }
    sql += ` GROUP BY weekday`;
  }

  const stmt = db.prepare(sql);
  const salesByWeekday = stmt.all(...params);

  // Создаем массив с нулями для всех дней недели
  const weeklyTotals = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }; // 0: Sun, 1: Mon...
  
  salesByWeekday.forEach(row => {
    weeklyTotals[row.weekday] = row.total;
  });

  const result = Object.values(weeklyTotals);
  // Переставляем воскресенье (индекс 0) в конец массива
  const sundayTotal = result.shift();
  result.push(sundayTotal);
  
  // Округляем значения до 2 знаков после запятой
  const roundedResult = result.map(value => parseFloat(value.toFixed(2)));

  return roundedResult; // Возвращаем массив [totalMon, totalTue, ..., totalSun]
});

// Новый обработчик для получения количества выездов
ipcMain.handle('stats:get-deliveries-count', (event, { dateFrom, dateTo, categoryId }) => {
  let sql = `
    SELECT COUNT(DISTINCT d.id) as totalDeliveries
    FROM Deliveries d
    JOIN Sales s ON s.delivery_id = d.id
    JOIN Products p ON s.product_id = p.id
    WHERE d.created_at BETWEEN ? AND ?
  `;
  const params = [dateFrom, dateTo];

  if (categoryId && categoryId !== 'all') {
    sql += ' AND p.category_id = ?';
    params.push(categoryId);
  }

  const stmt = db.prepare(sql);
  const result = stmt.get(...params);
  return result ? result.totalDeliveries : 0;
});

// Новый обработчик для детальной статистики по дням
ipcMain.handle('stats:get-daily-breakdown', (event, { dateFrom, dateTo, categoryId, saleType }) => {
  let sql = `
    SELECT
      strftime('%w', s.date) as weekday,
      p.name,
      SUM(s.quantity) as total,
      p.unit
    FROM Sales s
    JOIN Products p ON s.product_id = p.id
    WHERE s.date BETWEEN ? AND ?
  `;
  const params = [dateFrom, dateTo];

  if (categoryId && categoryId !== 'all') {
    sql += ' AND p.category_id = ?';
    params.push(categoryId);
  }

  if (saleType && saleType !== 'all') {
    sql += ' AND s.sale_type = ?';
    params.push(saleType);
  }

  sql += ' GROUP BY weekday, p.name ORDER BY weekday, total DESC';

  const stmt = db.prepare(sql);
  return stmt.all(...params);
});

// Новый обработчик для количества выездов по дням
ipcMain.handle('stats:get-daily-delivery-counts', (event, { dateFrom, dateTo, categoryId }) => {
  let sql = `
    SELECT
      strftime('%w', d.created_at) as weekday,
      COUNT(DISTINCT d.id) as total
    FROM Deliveries d
    JOIN Sales s ON s.delivery_id = d.id
    JOIN Products p ON s.product_id = p.id
    WHERE d.created_at BETWEEN ? AND ?
  `;
  const params = [dateFrom, dateTo];

  if (categoryId && categoryId !== 'all') {
    sql += ' AND p.category_id = ?';
    params.push(categoryId);
  }

  sql += ' GROUP BY weekday ORDER BY weekday';

  const stmt = db.prepare(sql);
  return stmt.all(...params);
});

// === Работа с изображениями категорий ===
ipcMain.handle('category:save-image', (event, filePath) => {
  try {
    const imagesDir = path.join(__dirname, '../images');
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir);

    const ext = path.extname(filePath).toLowerCase();
    const fileName = `category_${Date.now()}${ext}`;
    const destPath = path.join(imagesDir, fileName);

    fs.copyFileSync(filePath, destPath);

    return destPath; // Возвращаем только абсолютный путь
  } catch (e) {
    console.error('Ошибка при сохранении изображения категории:', e);
    return '';
  }
});

// Обновить image у категории
ipcMain.handle('category:update-image', (event, { id, image }) => {
  const stmt = db.prepare('UPDATE Categories SET image = ? WHERE id = ?');
  stmt.run(image, id);
  return true;
});

// === Резервное копирование и восстановление ===

// Глобальный мьютекс для критических операций
const { Mutex } = require('async-mutex');
const salesMutex = new Mutex();
const deliveryMutex = new Mutex();

// Универсальная функция для повтора критических операций
async function retryOperation(fn, retries = 3, delay = 200) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.warn(`Попытка ${i + 1} завершена с ошибкой:`, err.message);
      if (i < retries - 1) {
        await new Promise(res => setTimeout(res, delay));
      }
    }
  }
  throw lastError;
}

// Централизованная обработка неожиданных ошибок
function handleUnexpectedError(error, context = '') {
  console.error(`Неожиданная ошибка в ${context}:`, error);
  logErrorToFile(error, `Неожиданная ошибка в ${context}`);
  
  // Отправляем уведомление в основной процесс, если это возможно
  try {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      dialog.showErrorBox(
        'Неожиданная ошибка',
        `Произошла неожиданная ошибка в ${context}. Приложение может работать нестабильно. Пожалуйста, перезапустите приложение.\n\nДетали ошибки: ${error.message}`
      );
    }
  } catch (dialogError) {
    console.error('Не удалось показать диалоговое окно ошибки:', dialogError);
  }
}

ipcMain.handle('db:backup', async () => {
  return retryOperation(async () => {
    const win = BrowserWindow.getFocusedWindow();
    const { filePath } = await dialog.showSaveDialog(win, {
      title: 'Сохранить резервную копию',
      defaultPath: `store-backup-${new Date().toISOString().slice(0, 10)}.db`,
      filters: [
        { name: 'Database Files', extensions: ['db'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (filePath) {
      try {
        // Закрываем текущее соединение с БД
        db.close();
        // Копируем файл
        fs.copyFileSync(dbPath, filePath);
        // Переоткрываем соединение
        db = new Database(dbPath);
        
        dialog.showMessageBox(win, {
          type: 'info',
          title: 'Успех',
          message: 'Резервная копия успешно создана!',
          detail: `Файл сохранён по пути: ${filePath}`
        });
        return true;
      } catch (err) {
        logErrorToFile(err, 'Ошибка резервного копирования');
        console.error('Ошибка резервного копирования:', err);
        dialog.showErrorBox('Ошибка', `Не удалось создать резервную копию: ${err.message}`);
        // Переоткрываем соединение даже в случае ошибки
        if (!db || !db.open) {
          db = new Database(dbPath);
        }
        return false;
      }
    }
    return false;
  });
});

ipcMain.handle('db:restore', async () => {
  return retryOperation(async () => {
    const win = BrowserWindow.getFocusedWindow();
    const { filePaths } = await dialog.showOpenDialog(win, {
      title: 'Восстановить из копии',
      properties: ['openFile'],
      filters: [
        { name: 'Database Files', extensions: ['db'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (filePaths && filePaths.length > 0) {
      const backupPath = filePaths[0];
      
      try {
        // Закрываем текущее соединение с БД
        db.close();
        // Заменяем файл
        fs.copyFileSync(backupPath, dbPath);
        // Переоткрываем соединение
        db = new Database(dbPath);

        await dialog.showMessageBox(win, {
          type: 'info',
          title: 'Успех',
          message: 'Данные успешно восстановлены!',
          detail: 'Для применения изменений приложение будет перезагружено.'
        });

        // Перезагружаем приложение
        app.relaunch();
        app.quit();
        
        return true;
      } catch (err) {
        logErrorToFile(err, 'Ошибка восстановления');
        console.error('Ошибка восстановления:', err);
        dialog.showErrorBox('Ошибка', `Не удалось восстановить данные: ${err.message}`);
        // Переоткрываем соединение даже в случае ошибки
        if (!db || !db.open) {
          db = new Database(dbPath);
        }
        return false;
      }
    }
    return false;
  });
});

// При оформлении продажи/доставки проверять остаток
function checkAndUpdateStock(items) {
  for (const item of items) {
    const product = db.prepare('SELECT stock FROM Products WHERE id = ?').get(item.product_id);
    if (!product) throw new Error('Товар не найден');
    if (product.stock < item.quantity) {
      throw new Error('Недостаточно товара на складе');
    }
  }
  // Если все проверки пройдены, обновляем остатки
  for (const item of items) {
    db.prepare('UPDATE Products SET stock = stock - ? WHERE id = ?').run(item.quantity, item.product_id);
  }
}

// === Auto-Update Events ===
autoUpdater.on('update-downloaded', (info) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', info);
  }
});

autoUpdater.on('error', (err) => {
  console.error('Auto-update error:', err);
  if (mainWindow) {
    mainWindow.webContents.send('update-error', err.message);
  }
});

autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
  if (mainWindow) {
    mainWindow.webContents.send('checking-for-update');
  }
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info);
  if (mainWindow) {
    mainWindow.webContents.send('update-available', info);
  }
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available:', info);
  if (mainWindow) {
    mainWindow.webContents.send('update-not-available', info);
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  if (mainWindow) {
    mainWindow.webContents.send('download-progress', progressObj);
  }
});

let mainWindow;

// === Создание окна ===
function createWindow() {
  try {
    mainWindow = new BrowserWindow({
      width: 1024,
      height: 700,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    if (process.env.NODE_ENV === 'development') {
      mainWindow.loadURL('http://localhost:3000');
    } else {
      mainWindow.loadFile(path.join(__dirname, '../public/index.html'));
    }

    // Проверка обновлений при запуске приложения
    if (app.isPackaged) {
      autoUpdater.checkForUpdatesAndNotify();
    }
  } catch (error) {
    handleUnexpectedError(error, 'createWindow');
  }
}

app.whenReady().then(() => {
  try {
    createWindow();
  } catch (error) {
    handleUnexpectedError(error, 'app.whenReady');
  }
});

app.on('window-all-closed', () => {
  try {
    if (process.platform !== 'darwin') app.quit();
  } catch (error) {
    handleUnexpectedError(error, 'app.window-all-closed');
  }
});

// Обработка необработанных ошибок
process.on('uncaughtException', (error) => {
  handleUnexpectedError(error, 'uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  handleUnexpectedError(reason, 'unhandledRejection');
});

// Централизованное логирование ошибок
function logErrorToFile(error, context = '') {
  try {
    const fs = require('fs');
    const logPath = path.join(__dirname, '../Error.txt');
    const time = new Date().toISOString();
    
    // Форматируем сообщение в зависимости от типа ошибки
    let message = `[${time}] ${context}\n`;
    
    if (error && error.stack) {
      message += `Stack trace: ${error.stack}\n`;
    } else if (error && error.message) {
      message += `Error message: ${error.message}\n`;
    } else {
      message += `Error: ${error}\n`;
    }
    
    message += '\n';
    fs.appendFileSync(logPath, message, { encoding: 'utf8' });
  } catch (logError) {
    // Если не удалось записать в лог, выводим в консоль
    console.error('Не удалось записать ошибку в лог-файл:', logError);
    console.error('Оригинальная ошибка:', error);
  }
}

// IPC handlers for auto-updater
ipcMain.handle('updater:check-for-updates', () => {
  if (app.isPackaged) {
    return autoUpdater.checkForUpdatesAndNotify();
  }
  return null;
});

ipcMain.handle('updater:quit-and-install', () => {
  autoUpdater.quitAndInstall();
});
