// Configuración de colores y fuente para Tailwind
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        pastelPink: '#ffd1dc',
                        pastelPinkDark: '#f8b1c1',
                        pastelYellow: '#fdfd96',
                        pastelYellowDark: '#f7f779',
                        pastelBlue: '#aec6cf',
                        pastelBlueDark: '#8fb8c5',
                        pastelPurple: '#e2d9f3',
                        softDark: '#4a4a4a',
                    },
                    fontFamily: {
                        poppins: ['Poppins', 'sans-serif'],
                    }
                }
            }
        }


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

        // Initialize Application: escucha el catálogo en Firestore EN VIVO.
        // Cualquier producto que agregues o borres desde el panel se refleja
        // al instante para todas las personas que tengan la página abierta.
        function initApp() {
            db.collection('products').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
                products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderCategories();
                renderProducts();
                renderAdminProductsList();
            }, (err) => {
                console.error(err);
                showToast("No se pudo conectar con la base de datos del catálogo.", "error");
            });
        }

        // Carga los 6 productos de ejemplo en Firestore, solo si la base de datos
        // está vacía (útil la primera vez que conectas la base de datos).
        async function seedDefaultProductsIfEmpty() {
            const snapshot = await db.collection('products').limit(1).get();
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
            showToast("Productos de ejemplo cargados en la base de datos.", "success");
        }

        // Render Category Filter Buttons
        function renderCategories() {
            const container = document.getElementById('category-filters');
            // Extract unique categories
            const categoriesSet = new Set(products.map(p => p.category));
            const categories = ['todos', ...Array.from(categoriesSet)];

            let html = '';
            categories.forEach(cat => {
                const isActive = currentCategory === cat;
                const displayName = cat === 'todos' ? '✨ Todos los productos' : cat;
                const activeClass = isActive 
                    ? 'bg-gradient-to-r from-pink-400 to-yellow-400 text-white font-bold shadow-md transform scale-105' 
                    : 'bg-white text-gray-600 hover:bg-gray-100 font-medium border border-gray-100 shadow-sm';
                
                html += `
                    <button onclick="filterCategory('${cat}')" class="px-5 py-2 rounded-2xl text-xs sm:text-sm transition duration-300 focus:outline-none ${activeClass}">
                        ${displayName}
                    </button>
                `;
            });
            container.innerHTML = html;
        }

        // Filter by category
        function filterCategory(cat) {
            currentCategory = cat;
            renderCategories();
            renderProducts();
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

            counterEl.innerText = `${filtered.length} referencias`;
            titleEl.innerText = currentCategory === 'todos' ? 'Catálogo General' : `Categoría: ${currentCategory}`;

            if (filtered.length === 0) {
                grid.innerHTML = '';
                emptyState.classList.remove('hidden');
                return;
            }

            emptyState.classList.add('hidden');
            let html = '';

            filtered.forEach(p => {
                const mainImage = (p.images && p.images.length > 0) ? p.images[0] : 'https://placehold.co/600x600/ffd1dc/4a4a4a?text=Sin+Imagen';
                const formattedPrice = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(p.price);

                html += `
                    <div onclick="openProductModal('${p.id}')" class="bg-white rounded-3xl p-4 card-shadow hover:shadow-xl transition duration-300 cursor-pointer flex flex-col justify-between group border border-pink-50">
                        <div>
                            <!-- Image Container -->
                            <div class="relative w-full aspect-square rounded-2xl overflow-hidden bg-gray-50 mb-4">
                                <img src="${mainImage}" alt="${p.name}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" onerror="this.src='https://placehold.co/600x600/ffd1dc/4a4a4a?text=Imagen+No+Disponible'">
                                <span class="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-[11px] font-bold text-gray-700 px-3 py-1 rounded-full shadow-sm">
                                    ${p.category}
                                </span>
                            </div>
                            <!-- Product Name -->
                            <h4 class="font-bold text-gray-800 text-sm sm:text-base mb-1 line-clamp-1 group-hover:text-pink-500 transition">${p.name}</h4>
                            <p class="text-xs text-gray-400 line-clamp-2 mb-3">${p.description}</p>
                        </div>
                        <div class="flex items-center justify-between pt-3 border-t border-gray-100 mt-2">
                            <span class="font-extrabold text-pink-500 text-sm sm:text-base">${formattedPrice}</span>
                            <span class="w-8 h-8 rounded-full bg-pink-50 text-pink-500 group-hover:bg-pink-500 group-hover:text-white flex items-center justify-center transition duration-300 text-xs">
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
                    <button onclick="changeModalMainImage('${img}', this)" class="w-16 h-16 rounded-xl overflow-hidden border-2 ${index === 0 ? 'border-pink-400' : 'border-transparent'} hover:border-pink-300 transition focus:outline-none flex-shrink-0 bg-gray-50">
                        <img src="${img}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/600x600/ffd1dc/4a4a4a?text=Error'">
                    </button>
                `;
            });

            modalContent.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <!-- Gallery Area -->
                    <div class="space-y-4">
                        <div class="w-full aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">
                            <img id="modal-main-img" src="${images[0]}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/600x600/ffd1dc/4a4a4a?text=Sin+Imagen'">
                        </div>
                        ${images.length > 1 ? `
                            <div class="flex items-center gap-2 overflow-x-auto pb-2">
                                ${thumbnailsHtml}
                            </div>
                        ` : ''}
                    </div>
                    <!-- Details Area -->
                    <div class="space-y-4 flex flex-col justify-between h-full">
                        <div>
                            <span class="inline-block bg-pink-50 text-pink-500 font-bold text-xs px-3 py-1 rounded-full mb-2">
                                ${p.category}
                            </span>
                            <h2 class="text-2xl font-extrabold text-gray-800 mb-2">${p.name}</h2>
                            <div class="text-2xl font-black text-pink-500 mb-4">${formattedPrice}</div>
                            <div class="bg-gray-50 p-4 rounded-2xl mb-4">
                                <h5 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Descripción del Producto</h5>
                                <p class="text-sm text-gray-600 leading-relaxed">${p.description}</p>
                            </div>
                        </div>
                        <div class="pt-4 border-t border-gray-100">
                            <button onclick="closeProductModal()" class="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-sm">
                                Volver al Catálogo
                            </button>
                        </div>
                    </div>
                </div>
            `;

            const modal = document.getElementById('product-modal');
            modal.classList.remove('pointer-events-none', 'opacity-0');
            modal.querySelector('div > div').classList.remove('scale-95');
            modal.querySelector('div > div').classList.add('scale-100');
        }

        // Change modal main image when clicking thumbnail
        function changeModalMainImage(src, btnEl) {
            document.getElementById('modal-main-img').src = src;
            // Update borders
            const container = btnEl.parentElement;
            Array.from(container.children).forEach(child => {
                child.classList.remove('border-pink-400');
                child.classList.add('border-transparent');
            });
            btnEl.classList.remove('border-transparent');
            btnEl.classList.add('border-pink-400');
        }

        // Close Product Modal
        function closeProductModal() {
            const modal = document.getElementById('product-modal');
            modal.classList.add('pointer-events-none', 'opacity-0');
            modal.querySelector('div > div').classList.remove('scale-100');
            modal.querySelector('div > div').classList.add('scale-95');
        }

        // --- ADMIN AUTH & DASHBOARD LOGIC ---

        function openAdminLoginModal() {
            const modal = document.getElementById('admin-login-modal');
            modal.classList.remove('pointer-events-none', 'opacity-0');
            modal.querySelector('div > div').classList.remove('scale-95');
            modal.querySelector('div > div').classList.add('scale-100');
        }

        function closeAdminLoginModal() {
            const modal = document.getElementById('admin-login-modal');
            modal.classList.add('pointer-events-none', 'opacity-0');
            modal.querySelector('div > div').classList.remove('scale-100');
            modal.querySelector('div > div').classList.add('scale-95');
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
            renderAdminProductsList();
            const modal = document.getElementById('admin-dashboard-modal');
            modal.classList.remove('pointer-events-none', 'opacity-0');
            modal.querySelector('div > div').classList.remove('scale-95');
            modal.querySelector('div > div').classList.add('scale-100');
        }

        function closeAdminDashboard() {
            const modal = document.getElementById('admin-dashboard-modal');
            modal.classList.add('pointer-events-none', 'opacity-0');
            modal.querySelector('div > div').classList.remove('scale-100');
            modal.querySelector('div > div').classList.add('scale-95');
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
                preview.classList.remove('hidden');
                placeholder.classList.add('hidden');
                clearBtn.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }

        // Quita la foto seleccionada en un slot del formulario de nuevo producto
        function clearNewImage(index) {
            const input = document.getElementById(`new-img-${index}`);
            const preview = document.getElementById(`new-img-${index}-preview`);
            const placeholder = document.getElementById(`new-img-${index}-placeholder`);
            const clearBtn = document.getElementById(`new-img-${index}-clear`);
            input.value = '';
            preview.src = '';
            preview.classList.add('hidden');
            placeholder.classList.remove('hidden');
            clearBtn.classList.add('hidden');
        }

        // Add New Product (ahora con fotos reales subidas desde el dispositivo, no URLs)
        async function handleAddNewProduct(e) {
            e.preventDefault();
            const name = document.getElementById('new-name').value.trim();
            const category = document.getElementById('new-category').value.trim();
            const price = parseFloat(document.getElementById('new-price').value);
            const description = document.getElementById('new-description').value.trim();

            const fileInputs = [1, 2, 3, 4].map(i => document.getElementById(`new-img-${i}`));
            const files = fileInputs.map(inp => inp.files[0]).filter(Boolean);

            if (files.length === 0) {
                showToast("Debes subir al menos la foto principal (PNG o JPG).", "error");
                return;
            }

            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalBtnHtml = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando fotos...';

            try {
                // Convierte de verdad cada foto subida en una imagen embebida en el catálogo
                const images = await Promise.all(files.map(f => compressImage(f)));

                const newProduct = {
                    name,
                    category,
                    price,
                    description,
                    images,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                // Firestore no acepta documentos de más de ~1MB; con fotos comprimidas
                // casi nunca pasa, pero avisamos si llegara a suceder.
                const estimatedSize = new Blob([JSON.stringify(newProduct)]).size;
                if (estimatedSize > 950000) {
                    showToast("Las fotos juntas pesan demasiado. Sube menos fotos o de menor calidad.", "error");
                    return;
                }

                await db.collection('products').add(newProduct);

                // Reset form y previews (la lista se actualiza sola vía Firestore)
                e.target.reset();
                [1, 2, 3, 4].forEach(i => clearNewImage(i));

                showToast("¡Producto agregado! Ya es visible para todas las personas que visiten tu catálogo.", "success");
            } catch (err) {
                console.error(err);
                showToast("Ocurrió un error guardando el producto. Intenta de nuevo.", "error");
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnHtml;
            }
        }

        // Render Admin Products List for management/deletion
        function renderAdminProductsList() {
            const container = document.getElementById('admin-products-list');
            document.getElementById('admin-prod-count').innerText = products.length;

            if (products.length === 0) {
                container.innerHTML = `<p class="text-xs text-gray-400 text-center py-4">No hay productos registrados.</p>`;
                return;
            }

            let html = '';
            products.forEach(p => {
                const mainImage = (p.images && p.images.length > 0) ? p.images[0] : 'https://placehold.co/100x100/ffd1dc/4a4a4a?text=Img';
                const formattedPrice = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(p.price);

                html += `
                    <div class="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm gap-4">
                        <div class="flex items-center space-x-3 overflow-hidden">
                            <img src="${mainImage}" class="w-12 h-12 rounded-lg object-cover flex-shrink-0" onerror="this.src='https://placehold.co/100x100/ffd1dc/4a4a4a?text=Img'">
                            <div class="truncate">
                                <h5 class="text-xs font-bold text-gray-800 truncate">${p.name}</h5>
                                <p class="text-[11px] text-gray-400">${p.category} · <span class="text-pink-500 font-semibold">${formattedPrice}</span></p>
                            </div>
                        </div>
                        <button onclick="deleteProduct('${p.id}')" class="w-9 h-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center transition flex-shrink-0 text-xs" title="Eliminar producto">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                `;
            });
            container.innerHTML = html;
        }

        // Delete Product (elimina también sus fotos, porque van embebidas en el producto)
        function deleteProduct(id) {
            if (confirm("¿Estás segura de eliminar este producto del catálogo? Sus fotos también se borrarán.")) {
                db.collection('products').doc(id).delete()
                    .then(() => showToast("Producto y fotos eliminados definitivamente.", "success"))
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
            const bgClass = type === 'success' ? 'bg-emerald-500' : 'bg-rose-500';
            toast.className = `fixed bottom-6 right-6 z-50 ${bgClass} text-white px-5 py-3 rounded-2xl shadow-lg text-xs sm:text-sm font-bold flex items-center gap-2 transform translate-y-10 opacity-0 transition-all duration-300`;
            toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i> ${message}`;

            document.body.appendChild(toast);
            setTimeout(() => {
                toast.classList.remove('translate-y-10', 'opacity-0');
            }, 50);

            setTimeout(() => {
                toast.classList.add('translate-y-10', 'opacity-0');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }

        // Run initialization on load
        window.onload = function () {
            initApp();
        };
