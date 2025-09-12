const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'store.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS Categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    image TEXT
  );

  CREATE TABLE IF NOT EXISTS Products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    unit TEXT,
    image TEXT,
    FOREIGN KEY (category_id) REFERENCES Categories(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS Sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    quantity REAL NOT NULL,
    date TEXT NOT NULL,
    sale_type TEXT NOT NULL DEFAULT 'instore',
    delivery_id INTEGER REFERENCES Deliveries(id),
    batch_id TEXT,
    discount REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES Products(id) ON DELETE CASCADE
  );
`);

// Миграция: если поле image отсутствует, добавить его
try {
  db.prepare('ALTER TABLE Categories ADD COLUMN image TEXT').run();
} catch (e) {}

// Миграция: добавляем поля в таблицу Sales
try {
  db.prepare("ALTER TABLE Sales ADD COLUMN sale_type TEXT NOT NULL DEFAULT 'instore'").run();
} catch (e) {}

try {
  db.prepare('ALTER TABLE Sales ADD COLUMN delivery_id INTEGER REFERENCES Deliveries(id)').run();
} catch (e) {}

try {
  db.prepare('ALTER TABLE Sales ADD COLUMN batch_id TEXT').run();
} catch (e) {}

try {
  db.prepare('ALTER TABLE Sales ADD COLUMN discount REAL NOT NULL DEFAULT 0').run();
} catch (e) {}

console.log('Таблицы Categories, Products и Sales созданы или уже существуют.');
