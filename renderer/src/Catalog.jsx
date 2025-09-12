import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaBoxOpen, FaThLarge, FaBook } from 'react-icons/fa';

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

export default function Catalog() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  // Modals states
  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
  const [isProductModalOpen, setProductModalOpen] = useState(false);
  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
  
  // Form states
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState(null);
  const [newProduct, setNewProduct] = useState({ name: '', unit: '', purchase_price: '', selling_price: '' });
  const [editingProduct, setEditingProduct] = useState(null);

  // Deletion states
  const [itemToDelete, setItemToDelete] = useState(null);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadProducts(selectedCategory.id);
    } else {
      setProducts([]);
    }
  }, [selectedCategory]);

  const loadCategories = async () => {
    const cats = await window.api.getCategories();
    setCategories(cats);
    if (!selectedCategory && cats.length > 0) {
      setSelectedCategory(cats[0]);
    } else if (cats.length === 0) {
      setSelectedCategory(null);
    }
  };

  const loadProducts = async (categoryId) => {
    const prods = await window.api.getProducts(categoryId);
    setProducts(prods);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName) return;
    try {
      await window.api.addCategory({ name: newCategoryName, icon: newCategoryIcon });
      setNewCategoryName('');
      setNewCategoryIcon(null);
      setCategoryModalOpen(false);
      loadCategories();
    } catch (err) {
      const userFriendlyMessage = extractUserFriendlyMessage(err);
      alert(userFriendlyMessage);
    }
  };
  
  const handleAddProduct = async () => {
    if (!newProduct.name) return;
    try {
      await window.api.addProduct({ ...newProduct, category_id: selectedCategory.id });
      setNewProduct({ name: '', unit: '', purchase_price: '', selling_price: '' });
      setProductModalOpen(false);
      loadProducts(selectedCategory.id);
    } catch (err) {
      const userFriendlyMessage = extractUserFriendlyMessage(err);
      alert(userFriendlyMessage);
    }
  };
  
  const handleUpdateProduct = async () => {
    if (!editingProduct.name) return;
    try {
      await window.api.updateProduct(editingProduct);
      setEditingProduct(null);
      setProductModalOpen(false);
      loadProducts(selectedCategory.id);
    } catch (err) {
      const userFriendlyMessage = extractUserFriendlyMessage(err);
      alert(userFriendlyMessage);
    }
  };

  const openDeleteConfirm = (item, type) => {
    setItemToDelete({ item, type });
    setConfirmModalOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.type === 'category') {
        await window.api.deleteCategory(itemToDelete.item.id);
        loadCategories();
      } else if (itemToDelete.type === 'product') {
        await window.api.deleteProduct(itemToDelete.item.id);
        loadProducts(selectedCategory.id);
      }
      setConfirmModalOpen(false);
      setItemToDelete(null);
    } catch (err) {
      const userFriendlyMessage = extractUserFriendlyMessage(err);
      alert(userFriendlyMessage);
      setConfirmModalOpen(false);
      setItemToDelete(null);
    }
  };
  
  // Main render
  return (
    <div className="p-4 sm:p-8 h-full">
      <div className="bg-white rounded-2xl shadow-lg border-t-4 border-green-500 h-full flex flex-col">
        {/* Page Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FaBook size={28} className="text-green-600" />
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Каталог</h2>
          </div>
        </div>

        <div className="flex flex-grow overflow-hidden">
          {/* Categories Panel */}
          <aside className="w-1/3 xl:w-1/4 bg-gray-50 p-6 border-r border-gray-200 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Категории</h2>
              <button onClick={() => setCategoryModalOpen(true)} className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition shadow">
                <FaPlus />
              </button>
            </div>
            <ul className="overflow-y-auto flex-grow -mx-6">
              {categories.map(cat => (
                <li key={cat.id}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-6 py-3 cursor-pointer flex items-center justify-between transition border-b border-gray-200 ${selectedCategory?.id === cat.id ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}>
                  <span className="font-semibold">{cat.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); openDeleteConfirm(cat, 'category'); }} className={`text-sm ${selectedCategory?.id === cat.id ? 'text-white' : 'text-gray-400 hover:text-red-500'}`}>
                    <FaTrash />
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {/* Products Panel */}
          <main className="w-2/3 xl:w-3/4 p-8 overflow-y-auto">
            {selectedCategory ? (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h1 className="text-2xl font-bold text-gray-800">{selectedCategory.name}</h1>
                  <button onClick={() => { setEditingProduct(null); setProductModalOpen(true); }} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition shadow flex items-center">
                    <FaPlus className="mr-2" /> Добавить товар
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {products.map(prod => (
                    <div key={prod.id} className="bg-white p-4 rounded-xl shadow-md border border-gray-300 flex flex-col justify-between transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
                      <div className="flex-grow mb-3">
                        <h3 className="font-bold text-gray-800">{prod.name}</h3>
                        <p className="text-sm text-gray-500">{prod.unit}</p>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-blue-600">{prod.selling_price} тг</span>
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingProduct(prod); setProductModalOpen(true); }} className="p-2 text-gray-500 hover:text-blue-600 transition"><FaEdit /></button>
                          <button onClick={() => openDeleteConfirm(prod, 'product')} className="p-2 text-gray-500 hover:text-red-600 transition"><FaTrash /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <FaThLarge size={64} className="mb-4" />
                <h2 className="text-2xl font-bold">Категории не найдены</h2>
                <p>Создайте новую категорию, чтобы начать добавлять товары.</p>
              </div>
            )}
          </main>
        </div>

        {/* Category Modal */}
        {isCategoryModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl w-1/3">
              <h2 className="text-2xl font-bold mb-6">Новая категория</h2>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Название категории"
                className="w-full p-3 border-2 border-gray-300 rounded-lg mb-4"
              />
              <div className="flex justify-end gap-4">
                <button onClick={() => setCategoryModalOpen(false)} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400">Отмена</button>
                <button onClick={handleAddCategory} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Сохранить</button>
              </div>
            </div>
          </div>
        )}

        {/* Product Modal */}
        {isProductModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl w-1/3">
              <h2 className="text-2xl font-bold mb-6">{editingProduct ? 'Редактировать товар' : 'Новый товар'}</h2>
              <input
                type="text"
                value={editingProduct ? editingProduct.name : newProduct.name}
                onChange={(e) => editingProduct ? setEditingProduct({ ...editingProduct, name: e.target.value }) : setNewProduct({ ...newProduct, name: e.target.value })}
                placeholder="Название товара"
                className="w-full p-3 border-2 border-gray-300 rounded-lg mb-4"
              />
              <input
                type="text"
                value={editingProduct ? editingProduct.unit : newProduct.unit}
                onChange={(e) => editingProduct ? setEditingProduct({ ...editingProduct, unit: e.target.value }) : setNewProduct({ ...newProduct, unit: e.target.value })}
                placeholder="Единица измерения (шт, кг, л)"
                className="w-full p-3 border-2 border-gray-300 rounded-lg mb-4"
              />

              <div className="grid grid-cols-2 gap-4 mb-4">
                <input
                  type="number"
                  value={editingProduct ? (editingProduct.purchase_price || '') : (newProduct.purchase_price || '')}
                  onChange={(e) => editingProduct ? setEditingProduct({ ...editingProduct, purchase_price: e.target.value }) : setNewProduct({ ...newProduct, purchase_price: e.target.value })}
                  placeholder="Закуп. цена"
                  className="w-full p-3 border-2 border-gray-300 rounded-lg"
                  step="0.01"
                  min="0"
                />
                <input
                  type="number"
                  value={editingProduct ? (editingProduct.selling_price || '') : (newProduct.selling_price || '')}
                  onChange={(e) => editingProduct ? setEditingProduct({ ...editingProduct, selling_price: e.target.value }) : setNewProduct({ ...newProduct, selling_price: e.target.value })}
                  placeholder="Цена продажи"
                  className="w-full p-3 border-2 border-gray-300 rounded-lg"
                  step="0.01"
                  min="0"
                />
              </div>

              <div className="flex justify-end gap-4">
                <button onClick={() => { setProductModalOpen(false); setEditingProduct(null); }} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400">Отмена</button>
                <button onClick={editingProduct ? handleUpdateProduct : handleAddProduct} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">Сохранить</button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Deletion Modal */}
        {isConfirmModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl w-1/4 text-center">
              <h2 className="text-xl font-bold mb-4">Подтвердите удаление</h2>
              <p className="text-gray-600 mb-6">Вы уверены, что хотите удалить "{itemToDelete?.item.name}"? Это действие нельзя отменить.</p>
              <div className="flex justify-center gap-4">
                <button onClick={() => setConfirmModalOpen(false)} className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400">Отмена</button>
                <button onClick={handleDelete} className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Удалить</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
