(() => {
  // DOM Elements
  const shopView = document.getElementById('shop-view');
  const dashboardView = document.getElementById('dashboard-view');
  const aboutView = document.getElementById('about-us-view');
  const navShop = document.getElementById('nav-shop');
  const navDashboard = document.getElementById('nav-dashboard');
  const navAbout = document.getElementById('nav-about');
  const dashboardTableBody = document.getElementById('dashboard-table-body');
  const dashboardAddButton = document.getElementById('dashboard-add-button');

  const itemsContainer = document.getElementById('items-container');
  const searchInput = document.getElementById('search-input');
  const cartCountEl = document.getElementById('cart-count');

  // Modal Add Item
  const addModalOverlay = document.getElementById('modal-add-item-overlay');
  const addModalCloseBtn = document.getElementById('modal-add-item-close');
  const addModalForm = document.getElementById('modal-add-item-form');
  const addModalCancelBtn = document.getElementById('modal-add-item-cancel');
  const addNameInput = document.getElementById('add-name');
  const addDescriptionInput = document.getElementById('add-description');
  const addQuantityInput = document.getElementById('add-quantity');
  const addUnitInput = document.getElementById('add-unit');
  const addPricePhpInput = document.getElementById('add-price-php');
  const addImageInput = document.getElementById('add-image');

  // Modal Details
  const detailsModalOverlay = document.getElementById('modal-details-overlay');
  const detailsModalCloseBtn = document.getElementById('modal-details-close');
  const modalTitle = document.getElementById('modal-title');
  const modalImage = document.getElementById('modal-image');
  const modalDescription = document.getElementById('modal-description');
  const modalQuantity = document.getElementById('modal-quantity');
  const modalUnit = document.getElementById('modal-unit');
  const modalPricePhp = document.getElementById('modal-price-php');
  const modalAddCartBtn = document.getElementById('modal-add-cart');

  // Modal Login
  const loginModalOverlay = document.getElementById('modal-login-overlay');
  const loginModalCloseBtn = document.getElementById('modal-login-close');
  const loginForm = document.getElementById('login-form');
  const loginUsernameInput = document.getElementById('login-username');
  const loginPasswordInput = document.getElementById('login-password');
  const loginError = document.getElementById('login-error');

  // IndexedDB setup
  const dbName = 'SassyStringDB';
  const storeName = 'itemsStore';
  let db, items = [];

  let currentEditingItem = null;

  // Authentication state
  let isAuthenticated = false;

  // Open IndexedDB
  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        db = request.result;
        resolve(db);
      };
      request.onupgradeneeded = (e) => {
        db = e.target.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  // Add or update item in DB - fix for id handling
  function putItem(item) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      let request;
      if (item.id === undefined || item.id === null) {
        const copy = { ...item };
        delete copy.id;
        request = store.add(copy);
        request.onsuccess = e => {
          item.id = e.target.result;
          resolve(item.id);
        };
      } else {
        request = store.put(item);
        request.onsuccess = e => resolve(e.target.result);
      }
      request.onerror = e => reject(e.target.error);
    });
  }

  // Load all items from DB
  function loadItemsFromDB() {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = e => reject(e.target.error);
    });
  }

  // Delete item by id
  function deleteItem(id) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = e => reject(e.target.error);
    });
  }

  // Render shop items grid
  function renderShopItems(filter = '') {
    const search = filter.trim().toLowerCase();
    itemsContainer.innerHTML = '';

    if (items.length === 0) {
      const noItems = document.createElement('p');
      noItems.textContent = 'No items available. Please add some!';
      noItems.className = 'text-gray-500 italic text-center col-span-full';
      itemsContainer.appendChild(noItems);
      return;
    }

    const filteredItems = items.filter(item =>
      item.name && item.name.toLowerCase().includes(search)
    );

    if (filteredItems.length === 0) {
      const noFound = document.createElement('p');
      noFound.textContent = 'No matching items found.';
      noFound.className = 'text-gray-500 italic text-center col-span-full';
      itemsContainer.appendChild(noFound);
      return;
    }

    filteredItems.forEach(item => {
      itemsContainer.appendChild(renderShopItemCard(item));
    });
  }

  // Render single item card
  function renderShopItemCard(item) {
    const card = document.createElement('article');
    card.className = 'bg-white rounded-xl shadow-md flex flex-col cursor-default hover:shadow-xl focus-within:shadow-xl transition-shadow duration-300 outline-none';
    card.tabIndex = 0;

    // Defensive: Ensure pricePhp is a valid number
    const price = (typeof item.pricePhp === 'number' && !isNaN(item.pricePhp)) ? item.pricePhp : 0;

    card.setAttribute('aria-label', `Item: ${item.name || 'Unnamed'}, Price: ₱${price.toFixed(2)}`);

    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'w-full aspect-[4/3] bg-blue-50 rounded-t-xl flex items-center justify-center overflow-hidden';
    const img = document.createElement('img');
    img.src = item.imageUrl || 'https://placehold.co/400x300?text=No+Image+Available&font=roboto';
    img.alt = item.name || 'No name provided';
    img.loading = 'lazy';
    img.className = 'max-w-full max-h-full object-contain rounded-t-xl transition-transform duration-300 hover:scale-105';
    imageWrapper.appendChild(img);

    const details = document.createElement('div');
    details.className = 'p-5 flex flex-col flex-grow text-center';

    const nameEl = document.createElement('h2');
    nameEl.className = 'text-xl font-extrabold text-gray-900 mb-2';
    nameEl.textContent = item.name || 'Unnamed';

    const descEl = document.createElement('p');
    descEl.className = 'text-gray-600 text-sm mb-4 flex-grow';
    descEl.textContent = item.description || '';

    const priceEl = document.createElement('div');
    priceEl.className = 'text-green-600 font-extrabold text-lg mb-5 select-none';
    priceEl.textContent = `₱${price.toFixed(2)}`;

    const controls = document.createElement('div');
    controls.className = 'flex justify-center gap-4';

    const detailsBtn = document.createElement('button');
    detailsBtn.className = 'btn bg-blue-600 text-white font-semibold rounded-lg px-4 py-2 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-400 transition flex items-center gap-2';
    detailsBtn.type = 'button';
    detailsBtn.textContent = 'Details';
    const detailsIcon = document.createElement('i');
    detailsIcon.className = 'fas fa-search';
    detailsBtn.appendChild(detailsIcon);
    detailsBtn.setAttribute('aria-label', `View details for item ${item.name || 'Unnamed'}`);
    detailsBtn.addEventListener('click', () => openDetailsModal(item));

    const addToCartBtn = document.createElement('button');
    addToCartBtn.className = 'btn bg-yellow-400 text-gray-900 font-semibold rounded-lg px-4 py-2 hover:bg-yellow-500 focus:outline-none focus:ring-4 focus:ring-yellow-300 transition flex items-center gap-2';
    addToCartBtn.type = 'button';
    addToCartBtn.textContent = 'Add to Cart';
    const cartIcon = document.createElement('i');
    cartIcon.className = 'fas fa-shopping-cart';
    addToCartBtn.appendChild(cartIcon);
    addToCartBtn.setAttribute('aria-label', `Add item ${item.name || 'Unnamed'} to cart`);
    addToCartBtn.addEventListener('click', () => addToCart(item));

    controls.appendChild(detailsBtn);
    controls.appendChild(addToCartBtn);

    details.appendChild(nameEl);
    details.appendChild(descEl);
    details.appendChild(priceEl);
    details.appendChild(controls);

    card.appendChild(imageWrapper);
    card.appendChild(details);

    return card;
  }

  // Render dashboard items
  function renderDashboardItems() {
    dashboardTableBody.innerHTML = '';
    if (items.length === 0) {
      const emptyRow = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6;
      td.className = 'text-center text-gray-500 italic py-6';
      td.textContent = 'No items available. Please add some!';
      emptyRow.appendChild(td);
      dashboardTableBody.appendChild(emptyRow);
      return;
    }

    items.forEach(item => {
      const tr = document.createElement('tr');
      tr.className = 'bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300';

      const nameTd = document.createElement('td');
      nameTd.textContent = item.name || 'Unnamed';
      nameTd.className = 'font-semibold px-6 py-4';
      tr.appendChild(nameTd);

      const quantityTd = document.createElement('td');
      quantityTd.textContent = item.quantity ?? '0';
      quantityTd.className = 'px-6 py-4';
      tr.appendChild(quantityTd);

      const unitTd = document.createElement('td');
      unitTd.textContent = item.unit || '';
      unitTd.className = 'px-6 py-4';
      tr.appendChild(unitTd);

      // Defensive: Ensure pricePhp is a valid number
      const price = (typeof item.pricePhp === 'number' && !isNaN(item.pricePhp)) ? item.pricePhp : 0;

      const pricePhpTd = document.createElement('td');
      pricePhpTd.textContent = `₱${price.toFixed(2)}`;
      pricePhpTd.className = 'text-green-600 font-semibold px-6 py-4 select-none';
      tr.appendChild(pricePhpTd);

      const imageTd = document.createElement('td');
      imageTd.className = 'px-6 py-4';
      const img = document.createElement('img');
      img.src = item.imageUrl || 'https://placehold.co/80x60?text=No+Image&font=roboto';
      img.alt = item.name || 'Unnamed';
      img.className = 'w-20 h-15 object-contain rounded-md';
      imageTd.appendChild(img);
      tr.appendChild(imageTd);

      const actionsTd = document.createElement('td');
      actionsTd.className = 'flex gap-4 px-6 py-4';

      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit ✏️';
      editBtn.className = 'bg-blue-600 text-white font-semibold rounded-lg px-4 py-2 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-400 transition flex items-center gap-2';
      editBtn.type = 'button';
      editBtn.addEventListener('click', () => openEditModal(item));
      editBtn.setAttribute('aria-label', `Edit item ${item.name || 'Unnamed'}`);

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete 🗑️';
      deleteBtn.className = 'bg-red-600 text-white font-semibold rounded-lg px-4 py-2 hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-400 transition flex items-center gap-2';
      deleteBtn.type = 'button';
      deleteBtn.addEventListener('click', async () => {
        if (confirm(`Are you sure you want to delete "${item.name || 'Unnamed'}"?`)) {
          await deleteItem(item.id);
          items = items.filter(it => it.id !== item.id);
          renderDashboardItems();
          renderShopItems(searchInput.value);
          updateCartCount();
        }
      });
      deleteBtn.setAttribute('aria-label', `Delete item ${item.name || 'Unnamed'}`);

      const detailsBtn = document.createElement('button');
      detailsBtn.textContent = 'Details 🔍';
      detailsBtn.className = 'bg-yellow-400 text-gray-900 font-semibold rounded-lg px-4 py-2 hover:bg-yellow-500 focus:outline-none focus:ring-4 focus:ring-yellow-300 transition flex items-center gap-2';
      detailsBtn.type = 'button';
      detailsBtn.addEventListener('click', () => openDetailsModal(item));
      detailsBtn.setAttribute('aria-label', `View details for item ${item.name || 'Unnamed'}`);

      actionsTd.appendChild(editBtn);
      actionsTd.appendChild(deleteBtn);
      actionsTd.appendChild(detailsBtn);
      tr.appendChild(actionsTd);

      dashboardTableBody.appendChild(tr);
    });
  }

  // Modal Handling: Add Item
  function openAddItemModal() {
    currentEditingItem = null;
    addModalForm.reset();
    addModalOverlay.classList.remove('hidden');
    addModalOverlay.setAttribute('aria-hidden', 'false');
    addModalCloseBtn.focus();
  }

  function closeAddItemModal() {
    addModalOverlay.classList.add('hidden');
    addModalOverlay.setAttribute('aria-hidden', 'true');
  }

  function openEditModal(item) {
    currentEditingItem = item;
    addNameInput.value = item.name || '';
    addDescriptionInput.value = item.description || '';
    addQuantityInput.value = item.quantity ?? '';
    addUnitInput.value = item.unit || '';
    addPricePhpInput.value = (typeof item.pricePhp === 'number' && !isNaN(item.pricePhp)) ? item.pricePhp : '';
    addImageInput.value = item.imageUrl || '';
    addModalOverlay.classList.remove('hidden');
    addModalOverlay.setAttribute('aria-hidden', 'false');
    addModalCloseBtn.focus();
  }

  addModalCloseBtn.addEventListener('click', closeAddItemModal);
  addModalCancelBtn.addEventListener('click', closeAddItemModal);

  // Modal Handling: Details
  function openDetailsModal(item) {
    modalTitle.textContent = item.name || 'Unnamed';
    modalImage.src = item.imageUrl || 'https://placehold.co/400x300?text=No+Image+Available&font=roboto';
    modalImage.alt = item.name || 'Unnamed';

    modalDescription.textContent = item.description || 'No description available.';
    modalQuantity.textContent = `Quantity: ${item.quantity ?? 0}`;
    modalUnit.textContent = `Unit: ${item.unit || '-'}`;

    const price = (typeof item.pricePhp === 'number' && !isNaN(item.pricePhp)) ? item.pricePhp : 0;
    modalPricePhp.textContent = `Price (PHP): ₱${price.toFixed(2)}`;
    detailsModalOverlay.classList.remove('hidden');
    detailsModalOverlay.setAttribute('aria-hidden', 'false');

    modalAddCartBtn.onclick = () => {
      addToCart(item);
      closeDetailsModal();
    };
  }

  function closeDetailsModal() {
    detailsModalOverlay.classList.add('hidden');
    detailsModalOverlay.setAttribute('aria-hidden', 'true');
    modalAddCartBtn.onclick = null;
  }

  detailsModalCloseBtn.addEventListener('click', closeDetailsModal);

  // Add to cart logic
  async function addToCart(item) {
    item.cartCount = (item.cartCount || 0) + 1;
    await putItem(item);
    updateCartCount();
    alert(`Added "${item.name || 'Unnamed'}" to cart. Total items: ${item.cartCount}`);
  }

  function updateCartCount() {
    const totalCount = items.reduce((sum, item) => sum + (item.cartCount || 0), 0);
    cartCountEl.textContent = totalCount;
    cartCountEl.setAttribute('aria-label', `${totalCount} items in cart`);
  }

  // Submit handler for Add/Edit modal form
  addModalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Validate inputs
    const name = addNameInput.value.trim();
    const description = addDescriptionInput.value.trim();
    const quantity = parseInt(addQuantityInput.value);
    const unit = addUnitInput.value.trim();
    const pricePhp = parseFloat(addPricePhpInput.value);
    const imageUrl = addImageInput.value.trim();

    if (!name) {
      alert('Please enter a valid item name.');
      addNameInput.focus();
      return;
    }
    if (isNaN(quantity) || quantity < 0) {
      alert('Please enter a valid non-negative quantity.');
      addQuantityInput.focus();
      return;
    }
    if (!unit) {
      alert('Please enter a valid unit.');
      addUnitInput.focus();
      return;
    }
    if (isNaN(pricePhp) || pricePhp < 0) {
      alert('Please enter a valid non-negative price in PHP.');
      addPricePhpInput.focus();
      return;
    }
    if (!imageUrl) {
      alert('Please enter a valid image URL.');
      addImageInput.focus();
      return;
    }

    const itemData = {
      name,
      description,
      quantity,
      unit,
      pricePhp,
      imageUrl,
      id: currentEditingItem?.id,
      cartCount: currentEditingItem?.cartCount || 0,
    };

    try {
      if (currentEditingItem) {
        // Update existing item
        await putItem(itemData);
        const index = items.findIndex(i => i.id === currentEditingItem.id);
        if (index !== -1) items[index] = itemData;
      } else {
        // Add new item
        const id = await putItem(itemData);
        itemData.id = id;
        items.push(itemData);
      }
      renderShopItems(searchInput.value);
      renderDashboardItems();
      updateCartCount();
      closeAddItemModal();
      currentEditingItem = null;
    } catch (err) {
      alert('Failed to save item: ' + err.message);
    }
  });

  // Navigation event handlers
  navShop.addEventListener('click', () => activateView('shop'));
  navDashboard.addEventListener('click', () => {
    if (isAuthenticated) {
      activateView('dashboard');
    } else {
      openLoginModal();
    }
  });
  navAbout.addEventListener('click', () => activateView('about'));

  dashboardAddButton.addEventListener('click', openAddItemModal);

  function activateView(viewName) {
    if (viewName === 'shop') {
      shopView.classList.remove('hidden');
      dashboardView.classList.add('hidden');
      aboutView.classList.add('hidden');
      dashboardView.setAttribute('aria-hidden', 'true');
      aboutView.setAttribute('aria-hidden', 'true');
      shopView.setAttribute('aria-hidden', 'false');
      navShop.setAttribute('aria-current', 'page');
      navDashboard.removeAttribute('aria-current');
      navAbout.removeAttribute('aria-current');
    } else if (viewName === 'dashboard') {
      dashboardView.classList.remove('hidden');
      shopView.classList.add('hidden');
      aboutView.classList.add('hidden');
      dashboardView.setAttribute('aria-hidden', 'false');
      aboutView.setAttribute('aria-hidden', 'true');
      shopView.setAttribute('aria-hidden', 'true');
      navDashboard.setAttribute('aria-current', 'page');
      navShop.removeAttribute('aria-current');
      navAbout.removeAttribute('aria-current');
      renderDashboardItems();
    } else if (viewName === 'about') {
      dashboardView.classList.add('hidden');
      shopView.classList.add('hidden');
      aboutView.classList.remove('hidden');
      aboutView.setAttribute('aria-hidden', 'false');
      dashboardView.setAttribute('aria-hidden', 'true');
      shopView.setAttribute('aria-hidden', 'true');
      navAbout.setAttribute('aria-current', 'page');
      navShop.removeAttribute('aria-current');
      navDashboard.removeAttribute('aria-current');
    }
  }

  // Login modal functions
  function openLoginModal() {
    loginError.textContent = '';
    loginForm.reset();
    loginModalOverlay.classList.remove('hidden');
    loginModalOverlay.setAttribute('aria-hidden', 'false');
    loginUsernameInput.focus();
  }

  function closeLoginModal() {
    loginModalOverlay.classList.add('hidden');
    loginModalOverlay.setAttribute('aria-hidden', 'true');
    loginError.textContent = '';
  }

  loginModalCloseBtn.addEventListener('click', () => {
    closeLoginModal();
  });

  loginModalOverlay.addEventListener('click', (e) => {
    if (e.target === loginModalOverlay) {
      closeLoginModal();
    }
  });

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = loginUsernameInput.value.trim();
    const password = loginPasswordInput.value;

    if (username === 'Admin' && password === 'Adminsassy') {
      isAuthenticated = true;
      closeLoginModal();
      activateView('dashboard');
    } else {
      loginError.textContent = 'Invalid username or password.';
      loginPasswordInput.value = '';
      loginPasswordInput.focus();
    }
  });

  // Initialize the application
  async function init() {
    try {
      await openDB();
      items = await loadItemsFromDB();
      if (!items) items = [];
      renderShopItems();
      renderDashboardItems();
      updateCartCount();
    } catch (err) {
      alert('Failed to open database: ' + err.message);
      items = [];
      renderShopItems();
      renderDashboardItems();
      updateCartCount();
    }
  }

  searchInput.addEventListener('input', () => {
    renderShopItems(searchInput.value);
  });

  init();
})();
