// Lógica del catálogo
// Initial Mock Data (Fallback if LocalStorage is empty, approx 115 references simulation structure ready to be extended)
const defaultProducts = [
    {
        id: 1,
        name: "Llavero Kawaii Osito Pastel",
        category: "Accesorios",
        price: 18000,
        description: "Llavero acrílico de alta durabilidad con diseño de osito tierno con gorro de cono de helado. Ideal para decorar tu bolso o llaves con un toque súper juvenil.",
        images: [
            "https://placehold.co/600x600/ffd1dc/4a4a4a?text=Osito+Principal",
            "https://placehold.co/600x600/fdfd96/4a4a4a?text=Osito+Detalle+1",
            "https://placehold.co/600x600/aec6cf/4a4a4a?text=Osito+Detalle+2",
            "https://placehold.co/600x600/e2d9f3/4a4a4a?text=Osito+Empaque"
        ]
    },
    {
        id: 2,
        name: "Agenda Pastel Estrellita Mágica",
        category: "Papelería",
        price: 35000,
        description: "Agenda argollada con hojas punteadas de 100g. Tapa dura con laminado brillante holográfico y tonos rosa y amarillo pastel. Perfecta para bullet journaling.",
        images: [
            "https://placehold.co/600x600/fdfd96/4a4a4a?text=Agenda+Principal",
            "https://placehold.co/600x600/ffd1dc/4a4a4a?text=Agenda+Interior",
            "https://placehold.co/600x600/aec6cf/4a4a4a?text=Agenda+Stickers"
        ]
    },
    {
        id: 3,
        name: "Taza Cerámica Gato Dormilón",
        category: "Hogar & Cocina",
        price: 42000,
        description: "Taza de cerámica artesanal en tonos azul pastel con orejitas en relieve y detalles dorados. Capacidad de 350ml, apta para microondas.",
        images: [
            "https://placehold.co/600x600/aec6cf/4a4a4a?text=Taza+Gato+Principal",
            "https://placehold.co/600x600/ffd1dc/4a4a4a?text=Taza+Vista+Lateral",
            "https://placehold.co/600x600/fdfd96/4a4a4a?text=Taza+Empaque+Regalo"
        ]
    },
    {
        id: 4,
        name: "Set de Marcadores Pastel x6",
        category: "Papelería",
        price: 24000,
        description: "Marcadores tipo resaltador con tonos suaves pasteles (rosa, amarillo, azul, lila, verde menta y durazno). Punta cincel para subrayado perfecto.",
        images: [
            "https://placehold.co/600x600/e2d9f3/4a4a4a?text=Marcadores+Set",
            "https://placehold.co/600x600/ffd1dc/4a4a4a?text=Swatches+Colores"
        ]
    },
    {
        id: 5,
        name: "Estuche Holográfico Estelar",
        category: "Accesorios",
        price: 29000,
        description: "Cartuchera o cosmetiquera transparente con efecto tornasol holográfico y cierre reforzado. Resistente al agua y muy espaciosa.",
        images: [
            "https://placehold.co/600x600/ffd1dc/4a4a4a?text=Estuche+Abierto",
            "https://placehold.co/600x600/aec6cf/4a4a4a?text=Estuche+Cerrado",
            "https://placehold.co/600x600/fdfd96/4a4a4a?text=Estuche+Interior"
        ]
    },
    {
        id: 6,
        name: "Vela Aromática Vainilla Pastel",
        category: "Hogar & Cocina",
        price: 32000,
        description: "Vela de cera de soya natural en frasco de vidrio decorado con cintas rosa pastel. Aroma dulce y relajante a vainilla y caramelo.",
        images: [
            "https://placehold.co/600x600/fdfd96/4a4a4a?text=Vela+Vainilla",
            "https://placehold.co/600x600/ffd1dc/4a4a4a?text=Vela+Encendida"
        ]
    }
];

// State variables
let products = [];
let currentCategory = 'todos';
let searchQuery = '';
let editingProductId = null; // null = modo "agregar"; con id = modo "editar"
let existingImages = [null, null, null, null]; // fotos ya guardadas del producto que se está editando

// Paginación: los productos se piden a Firestore de 20 en 20
const PAGE_SIZE = 20;
let lastVisibleDoc = null;    // último documento cargado (punto de partida de la siguiente página)
let hasMoreProducts = false;  // true si probablemente quedan más productos por cargar
let isLoadingProducts = false;
let latestLoadId = 0;         // identifica la carga más reciente (descarta respuestas viejas)
let categoryQueryUnordered = false; // true si falta el índice de Firestore y se consulta sin orden por fecha

// Documento especial (dentro de 'products') que guarda la lista completa de categorías.
// No tiene 'createdAt' ni 'category', así que nunca aparece como un producto.
const CATEGORIES_DOC_ID = '_categorias';

// Todas las categorías conocidas (se acumulan, para que los botones no desaparezcan al filtrar)
const knownCategories = new Set();

// Initialize Application: carga la primera página del catálogo
function initApp() {
    if (typeof db === 'undefined') {
        console.error('Firebase no está configurado: revisa que firebase-config.js esté en la misma carpeta que index.html.');
        showToast("No se encontró la configuración de Firebase (firebase-config.js).", "error");
        return;
    }
    loadCategoriesFromMeta();
    loadProducts(true);
}

// Arma la consulta a Firestore según la categoría activa y la página que toca
function buildProductsQuery() {
    let query = db.collection('products');
    const byCategory = currentCategory !== 'todos';

    if (byCategory) query = query.where('category', '==', currentCategory);
    if (!(byCategory && categoryQueryUnordered)) query = query.orderBy('createdAt', 'desc');
    if (lastVisibleDoc) query = query.startAfter(lastVisibleDoc);

    return query.limit(PAGE_SIZE);
}

// Carga una página de productos. reset = true empieza desde cero (primera página)
async function loadProducts(reset = false) {
    if (isLoadingProducts && !reset) return;
    const requestId = ++latestLoadId;
    isLoadingProducts = true;

    const loadMoreBtn = document.getElementById('load-more-btn');
    if (reset) {
        products = [];
        lastVisibleDoc = null;
        hasMoreProducts = false;
        document.getElementById('empty-state').classList.add('is-hidden');
        document.getElementById('products-grid').innerHTML =
            '<p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i> Cargando productos...</p>';
        document.getElementById('load-more-wrap').classList.add('is-hidden');
    } else {
        loadMoreBtn.disabled = true;
        loadMoreBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Cargando...';
    }

    try {
        let snapshot;
        try {
            snapshot = await buildProductsQuery().get();
        } catch (err) {
            // Falta el índice compuesto (categoría + fecha): se reintenta sin ordenar por fecha
            if (err.code === 'failed-precondition' && currentCategory !== 'todos' && !categoryQueryUnordered) {
                console.warn('Falta un índice en Firestore. Puedes crearlo con el enlace de este mensaje:', err.message);
                categoryQueryUnordered = true;
                snapshot = await buildProductsQuery().get();
            } else {
                throw err;
            }
        }

        if (requestId !== latestLoadId) return; // llegó una respuesta vieja: se descarta

        const newProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        products = products.concat(newProducts);
        if (snapshot.docs.length > 0) {
            lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
        }
        hasMoreProducts = snapshot.docs.length === PAGE_SIZE;
    } catch (err) {
        if (requestId !== latestLoadId) return;
        console.error(err);
        showToast("No se pudo conectar con la base de datos del catálogo.", "error");
    } finally {
        if (requestId === latestLoadId) isLoadingProducts = false;
    }

    renderCategories();
    renderProducts();
    renderAdminProductsList();
    updateLoadMoreButton();
}

// Botón "Ver más productos"
function loadMoreProducts() {
    loadProducts(false);
}

// Muestra u oculta el botón según queden o no productos por cargar
function updateLoadMoreButton() {
    const wrap = document.getElementById('load-more-wrap');
    const btn = document.getElementById('load-more-btn');
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-chevron-down"></i> Ver más productos';
    wrap.classList.toggle('is-hidden', !hasMoreProducts);
}

// --- Lista de categorías (guardada en el documento products/_categorias) ---

// Lee la lista completa de categorías sin tener que descargar todos los productos
async function loadCategoriesFromMeta() {
    try {
        const doc = await db.collection('products').doc(CATEGORIES_DOC_ID).get();
        if (doc.exists && Array.isArray(doc.data().list)) {
            doc.data().list.forEach(c => knownCategories.add(c));
            renderCategories();
        }
    } catch (err) {
        console.warn('No se pudo leer la lista de categorías:', err.message);
    }
}

// Guarda una categoría en la lista (se usa al agregar o editar un producto)
function saveCategoryToMeta(category) {
    knownCategories.add(category);
    db.collection('products').doc(CATEGORIES_DOC_ID)
        .set({ list: firebase.firestore.FieldValue.arrayUnion(category) }, { merge: true })
        .catch(err => console.warn('No se pudo guardar la categoría en la lista:', err.message));
}

// Reconstruye la lista leyendo TODOS los productos (úsalo pocas veces: descarga todo el catálogo)
async function syncCategoriesFromAllProducts() {
    try {
        const snapshot = await db.collection('products').get();
        const list = Array.from(new Set(snapshot.docs.filter(d => d.id !== CATEGORIES_DOC_ID).map(d => d.data().category).filter(Boolean)));
        await db.collection('products').doc(CATEGORIES_DOC_ID).set({ list });
        knownCategories.clear();
        list.forEach(c => knownCategories.add(c));
        renderCategories();
        showToast(`Lista de categorías actualizada (${list.length}).`, "success");
    } catch (err) {
        console.error(err);
        showToast("No se pudo actualizar la lista de categorías. Intenta de nuevo.", "error");
    }
}

// Carga los 6 productos de ejemplo en Firestore, solo si la base de datos
// está vacía (útil la primera vez que conectas la base de datos).
async function seedDefaultProductsIfEmpty() {
    const snapshot = await db.collection('products').orderBy('createdAt', 'desc').limit(1).get();
    if (!snapshot.empty) {
        showToast("Ya hay productos en la base de datos, no se cargaron los de ejemplo.", "error");
        return;
    }
    const batch = db.batch();
    defaultProducts.forEach(p => {
        const { id, ...rest } = p;
        const ref = db.collection('products').doc();
        batch.set(ref, { ...rest, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    });
    await batch.commit();
    loadProducts(true);
    showToast("Productos de ejemplo cargados en la base de datos.", "success");
}

// Render Category Filter Buttons
function renderCategories() {
    const container = document.getElementById('category-filters');
    // Extract unique categories
    products.forEach(p => { if (p.category) knownCategories.add(p.category); });
    const categories = ['todos', ...Array.from(knownCategories).sort((a, b) => a.localeCompare(b, 'es'))];

    let html = '';
    categories.forEach(cat => {
        const isActive = currentCategory === cat;
        const displayName = cat === 'todos' ? '✨ Todos los productos' : cat;
        const activeClass = isActive ? 'chip--active' : '';

        html += `
            <button onclick="filterCategory('${cat}')" class="chip ${activeClass}">
                ${displayName}
            </button>
        `;
    });
    container.innerHTML = html;
}

// Filter by category
function filterCategory(cat) {
    if (cat === currentCategory) return;
    currentCategory = cat;
    renderCategories();   // marca el botón activo al instante
    loadProducts(true);   // trae de la base de datos solo los productos de esa categoría
}

// Handle Search input
function handleSearch() {
    searchQuery = document.getElementById('search-input').value.toLowerCase().trim();
    renderProducts();
}

// Render Products Grid
function renderProducts() {
    const grid = document.getElementById('products-grid');
    const emptyState = document.getElementById('empty-state');
    const counterEl = document.getElementById('product-counter');
    const titleEl = document.getElementById('product-count-title');

    // Filter logic
    let filtered = products.filter(p => {
        const matchesCategory = currentCategory === 'todos' || p.category.toLowerCase() === currentCategory.toLowerCase();
        const matchesSearch = p.name.toLowerCase().includes(searchQuery) || p.description.toLowerCase().includes(searchQuery) || p.category.toLowerCase().includes(searchQuery);
        return matchesCategory && matchesSearch;
    });

    counterEl.innerText = `${filtered.length}${hasMoreProducts ? '+' : ''} referencias`;
    titleEl.innerText = currentCategory === 'todos' ? 'Catálogo General' : `Categoría: ${currentCategory}`;

    if (filtered.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('is-hidden');
        return;
    }

    emptyState.classList.add('is-hidden');
    let html = '';

    filtered.forEach(p => {
        const mainImage = (p.images && p.images.length > 0) ? p.images[0] : 'https://placehold.co/600x600/ffd1dc/4a4a4a?text=Sin+Imagen';
        const formattedPrice = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(p.price);

        html += `
            <div onclick="openProductModal('${p.id}')" class="product-card">
                <div>
                    <!-- Image Container -->
                    <div class="product-card__image">
                        <img src="${mainImage}" alt="${p.name}" onerror="this.src='https://placehold.co/600x600/ffd1dc/4a4a4a?text=Imagen+No+Disponible'">
                        <span class="product-card__badge">${p.category}</span>
                    </div>
                    <!-- Product Name -->
                    <h4 class="product-card__name">${p.name}</h4>
                    <p class="product-card__desc">${p.description}</p>
                </div>
                <div class="product-card__footer">
                    <span class="product-card__price">${formattedPrice}</span>
                    <span class="product-card__eye">
                        <i class="fa-solid fa-eye"></i>
                    </span>
                </div>
            </div>
        `;
    });

    grid.innerHTML = html;
}

// Open Product Modal with Multiple Images Gallery
function openProductModal(id) {
    const p = products.find(prod => prod.id === id);
    if (!p) return;

    const formattedPrice = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(p.price);
    const images = p.images && p.images.length > 0 ? p.images : ['https://placehold.co/600x600/ffd1dc/4a4a4a?text=Sin+Imagen'];

    const modalContent = document.getElementById('modal-content');
            
    let thumbnailsHtml = '';
    images.forEach((img, index) => {
        thumbnailsHtml += `
            <button onclick="changeModalMainImage('${img}', this)" class="thumb ${index === 0 ? 'thumb--active' : ''}">
                <img src="${img}" onerror="this.src='https://placehold.co/600x600/ffd1dc/4a4a4a?text=Error'">
            </button>
        `;
    });

    modalContent.innerHTML = `
        <div class="detail">
            <!-- Gallery Area -->
            <div class="detail__gallery">
                <div class="detail__main-image">
                    <img id="modal-main-img" src="${images[0]}" onerror="this.src='https://placehold.co/600x600/ffd1dc/4a4a4a?text=Sin+Imagen'">
                </div>
                ${images.length > 1 ? `
                    <div class="detail__thumbs">
                        ${thumbnailsHtml}
                    </div>
                ` : ''}
            </div>
            <!-- Details Area -->
            <div class="detail__info">
                <div>
                    <span class="detail__category">${p.category}</span>
                    <h2 class="detail__name">${p.name}</h2>
                    <div class="detail__price">${formattedPrice}</div>
                    <div class="detail__description">
                        <h5 class="detail__description-title">Descripción del Producto</h5>
                        <p class="detail__description-text">${p.description}</p>
                    </div>
                </div>
                <div class="detail__footer">
                    <button onclick="closeProductModal()" class="btn-back">
                        Volver al Catálogo
                    </button>
                </div>
            </div>
        </div>
    `;

    const modal = document.getElementById('product-modal');
    modal.classList.add('is-open');
}

// Change modal main image when clicking thumbnail
function changeModalMainImage(src, btnEl) {
    document.getElementById('modal-main-img').src = src;
    // Update borders
    const container = btnEl.parentElement;
    Array.from(container.children).forEach(child => child.classList.remove('thumb--active'));
    btnEl.classList.add('thumb--active');
}

// Close Product Modal
function closeProductModal() {
    const modal = document.getElementById('product-modal');
    modal.classList.remove('is-open');
}

// --- ADMIN AUTH & DASHBOARD LOGIC ---

function openAdminLoginModal() {
    const modal = document.getElementById('admin-login-modal');
    modal.classList.add('is-open');
}

function closeAdminLoginModal() {
    const modal = document.getElementById('admin-login-modal');
    modal.classList.remove('is-open');
}

function handleAdminLogin(e) {
    e.preventDefault();
    const email = document.getElementById('admin-email').value.trim();
    const pass = document.getElementById('admin-password').value.trim();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verificando...';

    auth.signInWithEmailAndPassword(email, pass)
        .then(() => {
            closeAdminLoginModal();
            openAdminDashboard();
            document.getElementById('admin-email').value = '';
            document.getElementById('admin-password').value = '';
        })
        .catch((err) => {
            console.error(err);
            showToast("Correo o contraseña incorrectos.", "error");
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
        });
}

function openAdminDashboard() {
    cancelEditProduct(); // siempre abre en modo "agregar", sin edición a medias
    renderAdminProductsList();
    const modal = document.getElementById('admin-dashboard-modal');
    modal.classList.add('is-open');
}

function closeAdminDashboard() {
    const modal = document.getElementById('admin-dashboard-modal');
    modal.classList.remove('is-open');
    // Refresh main view
    renderCategories();
    renderProducts();
}

function logoutAdmin() {
    auth.signOut();
    closeAdminDashboard();
    showToast("Sesión de administrador cerrada correctamente.", "success");
}

// --- Helpers para subir fotos reales (PNG/JPG) desde el administrador ---

// Comprime y convierte una foto (File) en una imagen real embebida (data URL),
// redimensionándola para que no ocupe demasiado espacio en el catálogo.
function compressImage(file, maxDim = 800, quality = 0.75) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round(height * (maxDim / width));
                        width = maxDim;
                    } else {
                        width = Math.round(width * (maxDim / height));
                        height = maxDim;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
        reader.readAsDataURL(file);
    });
}

// Muestra la vista previa apenas se selecciona una foto en el panel de administración
function previewNewImage(index, inputEl) {
    const file = inputEl.files[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        showToast("Solo se permiten imágenes en formato PNG o JPG.", "error");
        inputEl.value = '';
        return;
    }
    if (file.size > 15 * 1024 * 1024) {
        showToast("Esa foto pesa demasiado (máx. 15MB). Usa una más liviana.", "error");
        inputEl.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById(`new-img-${index}-preview`);
        const placeholder = document.getElementById(`new-img-${index}-placeholder`);
        const clearBtn = document.getElementById(`new-img-${index}-clear`);
        preview.src = e.target.result;
        preview.classList.remove('is-hidden');
        placeholder.classList.add('is-hidden');
        clearBtn.classList.remove('is-hidden');
    };
    reader.readAsDataURL(file);
}

// Quita la foto seleccionada (o existente) en un slot del formulario
function clearNewImage(index) {
    const input = document.getElementById(`new-img-${index}`);
    const preview = document.getElementById(`new-img-${index}-preview`);
    const placeholder = document.getElementById(`new-img-${index}-placeholder`);
    const clearBtn = document.getElementById(`new-img-${index}-clear`);
    input.value = '';
    preview.src = '';
    preview.classList.add('is-hidden');
    placeholder.classList.remove('is-hidden');
    clearBtn.classList.add('is-hidden');
    existingImages[index - 1] = null;
}

// Alterna el título y el botón del formulario entre "Agregar" y "Editar"
function syncProductFormUI() {
    const icon = document.getElementById('product-form-submit-icon');
    const text = document.getElementById('product-form-submit-text');
    const titleIcon = document.getElementById('product-form-title-icon');
    const titleText = document.getElementById('product-form-title-text');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    const img1 = document.getElementById('new-img-1');

    if (editingProductId) {
        icon.className = 'fa-solid fa-floppy-disk';
        text.innerText = 'Guardar Cambios';
        titleIcon.className = 'fa-solid fa-pen icon-blue';
        titleText.innerText = 'Editar Producto';
        cancelBtn.classList.remove('is-hidden');
        img1.removeAttribute('required');
    } else {
        icon.className = 'fa-solid fa-cloud-arrow-up';
        text.innerText = 'Guardar Producto en el Catálogo';
        titleIcon.className = 'fa-solid fa-plus-circle icon-pink';
        titleText.innerText = 'Agregar Nuevo Producto al Catálogo';
        cancelBtn.classList.add('is-hidden');
        img1.setAttribute('required', 'required');
    }
}

// Abre el formulario ya lleno con los datos de un producto para editarlo
function openEditProduct(id) {
    const p = products.find(prod => prod.id === id);
    if (!p) return;

    editingProductId = id;
    const imgs = p.images || [];
    existingImages = [imgs[0] || null, imgs[1] || null, imgs[2] || null, imgs[3] || null];

    document.getElementById('new-name').value = p.name || '';
    document.getElementById('new-category').value = p.category || '';
    document.getElementById('new-price').value = p.price || '';
    document.getElementById('new-description').value = p.description || '';

    [1, 2, 3, 4].forEach(i => {
        const input = document.getElementById(`new-img-${i}`);
        const preview = document.getElementById(`new-img-${i}-preview`);
        const placeholder = document.getElementById(`new-img-${i}-placeholder`);
        const clearBtn = document.getElementById(`new-img-${i}-clear`);
        input.value = '';
        const existing = existingImages[i - 1];
        if (existing) {
            preview.src = existing;
            preview.classList.remove('is-hidden');
            placeholder.classList.add('is-hidden');
            clearBtn.classList.remove('is-hidden');
        } else {
            preview.src = '';
            preview.classList.add('is-hidden');
            placeholder.classList.remove('is-hidden');
            clearBtn.classList.add('is-hidden');
        }
    });

    syncProductFormUI();
    document.getElementById('product-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Sale del modo edición y deja el formulario listo para agregar un producto nuevo
function cancelEditProduct() {
    editingProductId = null;
    existingImages = [null, null, null, null];
    document.getElementById('product-form').reset();
    [1, 2, 3, 4].forEach(i => clearNewImage(i));
    syncProductFormUI();
}

// Guarda el formulario: crea un producto nuevo, o actualiza uno existente si estás editando
async function handleProductFormSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('new-name').value.trim();
    const category = document.getElementById('new-category').value.trim();
    const price = parseFloat(document.getElementById('new-price').value);
    const description = document.getElementById('new-description').value.trim();

    const fileInputs = [1, 2, 3, 4].map(i => document.getElementById(`new-img-${i}`));
    const files = fileInputs.map(inp => inp.files[0] || null);

    const hasAnyImage = files.some(Boolean) || existingImages.some(Boolean);
    if (!hasAnyImage) {
        showToast("Debes tener al menos la foto principal (PNG o JPG).", "error");
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const icon = document.getElementById('product-form-submit-icon');
    const text = document.getElementById('product-form-submit-text');
    submitBtn.disabled = true;
    icon.className = 'fa-solid fa-spinner fa-spin';
    text.innerText = 'Guardando...';

    try {
        // Por cada casilla: si elegiste una foto nueva se comprime; si no,
        // se conserva la que ya tenía (o se deja vacía si la borraste con la x).
        const images = [];
        for (let i = 0; i < 4; i++) {
            if (files[i]) {
                images.push(await compressImage(files[i]));
            } else if (existingImages[i]) {
                images.push(existingImages[i]);
            }
        }

        const productData = { name, category, price, description, images };

        // Firestore no acepta documentos de más de ~1MB; con fotos comprimidas
        // casi nunca pasa, pero avisamos si llegara a suceder.
        const estimatedSize = new Blob([JSON.stringify(productData)]).size;
        if (estimatedSize > 950000) {
            showToast("Las fotos juntas pesan demasiado. Sube menos fotos o de menor calidad.", "error");
            return;
        }

        if (editingProductId) {
            await db.collection('products').doc(editingProductId).update(productData);
            showToast("¡Cambios guardados! Ya se actualizaron en el catálogo.", "success");
        } else {
            productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('products').add(productData);
            showToast("¡Producto agregado! Ya es visible para todas las personas que visiten tu catálogo.", "success");
        }

        saveCategoryToMeta(category);
            cancelEditProduct(); // limpia el formulario y vuelve a modo "agregar"
            loadProducts(true);  // recarga el catálogo con los cambios
    } catch (err) {
        console.error(err);
        showToast("Ocurrió un error guardando el producto. Intenta de nuevo.", "error");
    } finally {
        submitBtn.disabled = false;
        syncProductFormUI();
    }
}

// Render Admin Products List for management/deletion
function renderAdminProductsList() {
    const container = document.getElementById('admin-products-list');
    document.getElementById('admin-prod-count').innerText = products.length + (hasMoreProducts ? '+' : '');

    if (products.length === 0) {
        container.innerHTML = `<p class="admin-empty">No hay productos registrados.</p>`;
        return;
    }

    let html = '';
    products.forEach(p => {
        const mainImage = (p.images && p.images.length > 0) ? p.images[0] : 'https://placehold.co/100x100/ffd1dc/4a4a4a?text=Img';
        const formattedPrice = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(p.price);

        html += `
            <div class="admin-item">
                <div class="admin-item__main">
                    <img src="${mainImage}" class="admin-item__img" onerror="this.src='https://placehold.co/100x100/ffd1dc/4a4a4a?text=Img'">
                    <div class="admin-item__text">
                        <h5 class="admin-item__name">${p.name}</h5>
                        <p class="admin-item__meta">${p.category} · <span class="admin-item__price">${formattedPrice}</span></p>
                    </div>
                </div>
                <div class="admin-item__actions">
                    <button onclick="openEditProduct('${p.id}')" class="btn-square btn-square--edit" title="Editar producto">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button onclick="deleteProduct('${p.id}')" class="btn-square btn-square--delete" title="Eliminar producto">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// Delete Product (elimina también sus fotos, porque van embebidas en el producto)
function deleteProduct(id) {
    if (confirm("¿Estás segura de eliminar este producto del catálogo? Sus fotos también se borrarán.")) {
        db.collection('products').doc(id).delete()
            .then(() => {
                showToast("Producto y fotos eliminados definitivamente.", "success");
                loadProducts(true);
            })
            .catch((err) => {
                console.error(err);
                showToast("No se pudo eliminar el producto. Intenta de nuevo.", "error");
            });
    }
}

// Simple Toast notification helper (replaces alert)
function showToast(message, type = 'success') {
    const existingToast = document.getElementById('toast-notification');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className = `toast toast--${type === 'success' ? 'success' : 'error'}`;
    toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i> ${message}`;

    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('is-visible');
    }, 50);

    setTimeout(() => {
        toast.classList.remove('is-visible');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Run initialization on load
window.onload = function () {
    initApp();
};
