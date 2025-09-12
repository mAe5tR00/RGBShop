const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getCategories: () => ipcRenderer.invoke('categories:get'),
  addCategory: (name) => ipcRenderer.invoke('categories:add', name),
  deleteCategory: (id) => ipcRenderer.invoke('categories:delete', id),
  getProducts: (categoryId) => ipcRenderer.invoke('products:get', categoryId),
  addProduct: (product) => ipcRenderer.invoke('products:add', product),
  deleteProduct: (id) => ipcRenderer.invoke('products:delete', id),
  updateProduct: (product) => ipcRenderer.invoke('products:update', product),
  addSale: (sale) => ipcRenderer.invoke('sales:add', sale),
  processCart: (data) => ipcRenderer.invoke('sales:process-cart', data),
  getSales: (params) => ipcRenderer.invoke('sales:get', params),
  getTopProducts: (categoryId) => ipcRenderer.invoke('stats:top-products', categoryId),
  getLeastProducts: (categoryId) => ipcRenderer.invoke('stats:least-products', categoryId),
  getAvgPerDay: (categoryId) => ipcRenderer.invoke('stats:avg-per-day', categoryId),
  getByWeekday: (categoryId) => ipcRenderer.invoke('stats:by-weekday', categoryId),
  saveProductImage: (filePath) => ipcRenderer.invoke('product:save-image', filePath),
  saveCategoryImage: (filePath) => ipcRenderer.invoke('category:save-image', filePath),
  updateCategoryImage: (data) => ipcRenderer.invoke('category:update-image', data),
  getActivityForecast: (params) => ipcRenderer.invoke('stats:activity-forecast', params),
  getSalesForWeek: (params) => ipcRenderer.invoke('stats:get-sales-for-week', params),
  addDelivery: (items) => ipcRenderer.invoke('delivery:add', items),
  cancelDelivery: (deliveryId) => ipcRenderer.invoke('delivery:cancel', deliveryId),
  getDeliveriesCount: (params) => ipcRenderer.invoke('stats:get-deliveries-count', params),
  // Функции для резервного копирования и восстановления
  backupDatabase: () => ipcRenderer.invoke('db:backup'),
  restoreDatabase: () => ipcRenderer.invoke('db:restore'),
  undoSale: (params) => ipcRenderer.invoke('sales:undo-last', params),
  getDailyBreakdown: (params) => ipcRenderer.invoke('stats:get-daily-breakdown', params),
  getDailyDeliveryCounts: (params) => ipcRenderer.invoke('stats:get-daily-delivery-counts', params),

  // Клиенты и бонусы
  findCustomerByPhone: (phone) => ipcRenderer.invoke('customers:find-by-phone', phone),
  createCustomer: (customer) => ipcRenderer.invoke('customers:create', customer),
  getCustomerDetails: (customerId) => ipcRenderer.invoke('customers:get-details', customerId),
  getCustomerPurchaseHistory: (customerId) => ipcRenderer.invoke('customers:get-purchase-history', customerId),
  getCustomerBonusHistory: (customerId) => ipcRenderer.invoke('customers:get-bonus-history', customerId),
  getCustomerMonthlySpend: (customerId) => ipcRenderer.invoke('customers:get-monthly-spend', customerId),
  addBonusTransaction: (transaction) => ipcRenderer.invoke('bonuses:add-transaction', transaction),
  getBonusReport: (period) => ipcRenderer.invoke('bonuses:get-report', period),
  getFinancialSummary: (params) => ipcRenderer.invoke('stats:get-financial-summary', params),

  // Настройки
  getSetting: (key) => ipcRenderer.invoke('settings:get', key),
  setSetting: (setting) => ipcRenderer.invoke('settings:set', setting),

  // Auto-updater functions
  checkForUpdates: () => ipcRenderer.invoke('updater:check-for-updates'),
  quitAndInstallUpdate: () => ipcRenderer.invoke('updater:quit-and-install'),

  // Auto-updater events
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
  onUpdateError: (callback) => ipcRenderer.on('update-error', callback),
  onCheckingForUpdate: (callback) => ipcRenderer.on('checking-for-update', callback),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', callback),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', callback),
  removeAllUpdateListeners: () => {
    ipcRenderer.removeAllListeners('update-downloaded');
    ipcRenderer.removeAllListeners('update-error');
    ipcRenderer.removeAllListeners('checking-for-update');
    ipcRenderer.removeAllListeners('update-available');
    ipcRenderer.removeAllListeners('update-not-available');
    ipcRenderer.removeAllListeners('download-progress');
  },

  getImageAsDataUrl: (filePath) => {
    try {
      if (!filePath) return null;
      const fs = require('fs');
      const path = require('path');
      const ext = path.extname(filePath).toLowerCase();
      const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
      const data = fs.readFileSync(filePath);
      return `data:${mime};base64,${data.toString('base64')}`;
    } catch (e) {
      console.error('Ошибка при чтении изображения:', e);
      return null;
    }
  },
});
