document.addEventListener("DOMContentLoaded", () => {
    const WHATSAPP_NUMBER = "21658302814";

    const defaultProducts = [
        {
            id: 1,
            name: "Carte Électronique Arduino Uno",
            price: 45,
            category: "Électronique",
            desc: "Microcontrôleur ATmega328P neuf avec câble USB inclus.",
            images: [
                "https://via.placeholder.com/400x250?text=Arduino+Face",
                "https://via.placeholder.com/400x250?text=Arduino+Dos"
            ]
        }
    ];

    let products = JSON.parse(localStorage.getItem("shop_products")) || defaultProducts;
    let cart = [];
    let uploadedImagesBase64 = []; // Tableau pour stocker plusieurs photos

    // Variables pour le zoom galerie
    let currentZoomImages = [];
    let currentZoomIndex = 0;
    let currentZoomTitle = "";

    const productsGrid = document.getElementById("productsGrid");
    const productCount = document.getElementById("productCount");
    const searchInput = document.getElementById("searchInput");

    const addProductModal = document.getElementById("addProductModal");
    const openAddModalBtn = document.getElementById("openAddModalBtn");
    const closeAddModal = document.getElementById("closeAddModal");
    const addProductForm = document.getElementById("addProductForm");
    const prodImageInput = document.getElementById("prodImage");
    const imagePreview = document.getElementById("imagePreview");

    const cartModal = document.getElementById("cartModal");
    const openCartBtn = document.getElementById("openCartBtn");
    const closeCartModal = document.getElementById("closeCartModal");
    const cartCount = document.getElementById("cartCount");
    const cartItemsList = document.getElementById("cartItemsList");
    const cartTotal = document.getElementById("cartTotal");
    const whatsappOrderBtn = document.getElementById("whatsappOrderBtn");

    const zoomModal = document.getElementById("zoomModal");
    const zoomedImg = document.getElementById("zoomedImg");
    const zoomCaption = document.getElementById("zoomCaption");
    const zoomThumbs = document.getElementById("zoomThumbs");
    const closeZoomModal = document.getElementById("closeZoomModal");
    const prevImgBtn = document.getElementById("prevImgBtn");
    const nextImgBtn = document.getElementById("nextImgBtn");

    // 1. Afficher les produits
    function renderProducts(filter = "") {
        productsGrid.innerHTML = "";
        const filtered = products.filter(p =>
            p.name.toLowerCase().includes(filter.toLowerCase()) ||
            p.category.toLowerCase().includes(filter.toLowerCase())
        );

        productCount.textContent = filtered.length;

        if (filtered.length === 0) {
            productsGrid.innerHTML = "<p>Aucun produit trouvé.</p>";
            return;
        }

        filtered.forEach(prod => {
            // Compatibilité avec anciens produits à 1 seule image
            const imgs = prod.images || [prod.image];
            const badgeHtml = imgs.length > 1 
                ? `<span class="photo-count-badge"><i class="fas fa-images"></i> ${imgs.length} photos</span>` 
                : "";

            const card = document.createElement("div");
            card.className = "product-card";
            card.innerHTML = `
                <button class="delete-prod-btn" title="Supprimer" onclick="deleteProduct(${prod.id})">
                    <i class="fas fa-trash"></i>
                </button>
                ${badgeHtml}
                <img src="${imgs[0]}" alt="${prod.name}" class="product-img" onclick="openZoom(${prod.id})">
                <div class="product-body">
                    <span class="product-cat">${prod.category}</span>
                    <h3 class="product-title">${prod.name}</h3>
                    <p class="product-desc">${prod.desc}</p>
                    <div class="product-footer">
                        <span class="product-price">${prod.price} TND</span>
                        <button class="btn btn-primary" onclick="addToCart(${prod.id})">
                            <i class="fas fa-cart-plus"></i> Ajouter
                        </button>
                    </div>
                </div>
            `;
            productsGrid.appendChild(card);
        });
    }

    // 2. Importation & Compression de PLUSIEURS images locales
    prodImageInput.addEventListener("change", (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        uploadedImagesBase64 = [];
        imagePreview.innerHTML = "";

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const maxWidth = 550; // Compressé pour stocker plusieurs photos sans saturer localStorage
                    const scale = maxWidth / img.width;
                    canvas.width = img.width > maxWidth ? maxWidth : img.width;
                    canvas.height = img.width > maxWidth ? img.height * scale : img.height;

                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    const base64 = canvas.toDataURL("image/jpeg", 0.75);
                    uploadedImagesBase64.push(base64);

                    // Afficher la miniature dans la zone d'aperçu
                    const thumb = document.createElement("img");
                    thumb.src = base64;
                    imagePreview.appendChild(thumb);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    });

    // 3. Enregistrer le nouveau produit avec toutes ses photos
    addProductForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const newProduct = {
            id: Date.now(),
            name: document.getElementById("prodName").value.trim(),
            price: parseFloat(document.getElementById("prodPrice").value),
            category: document.getElementById("prodCategory").value,
            desc: document.getElementById("prodDesc").value.trim(),
            images: uploadedImagesBase64.length > 0 
                ? uploadedImagesBase64 
                : ["https://via.placeholder.com/400x250?text=Produit"]
        };

        products.unshift(newProduct);
        try {
            localStorage.setItem("shop_products", JSON.stringify(products));
        } catch (err) {
            alert("Espace de stockage du navigateur plein. Essayez avec moins de photos ou des images plus légères.");
            products.shift();
            return;
        }

        addProductForm.reset();
        uploadedImagesBase64 = [];
        imagePreview.innerHTML = "<span>Aperçu des images sélectionnées</span>";
        addProductModal.classList.remove("active");
        renderProducts(searchInput.value);
    });

    // 4. Galerie Zoom multi-photos
    window.openZoom = (prodId) => {
        const prod = products.find(p => p.id === prodId);
        if (!prod) return;

        currentZoomImages = prod.images || [prod.image];
        currentZoomIndex = 0;
        currentZoomTitle = prod.name;

        updateZoomDisplay();
        zoomModal.classList.add("active");
    };

    function updateZoomDisplay() {
        zoomedImg.src = currentZoomImages[currentZoomIndex];
        zoomedImg.classList.remove("super-zoom");
        zoomCaption.textContent = `${currentZoomTitle} (${currentZoomIndex + 1} / ${currentZoomImages.length})`;

        // Afficher ou masquer les flèches s'il n'y a qu'une photo
        prevImgBtn.style.display = currentZoomImages.length > 1 ? "block" : "none";
        nextImgBtn.style.display = currentZoomImages.length > 1 ? "block" : "none";

        // Miniatures en bas de la modale
        zoomThumbs.innerHTML = "";
        if (currentZoomImages.length > 1) {
            currentZoomImages.forEach((src, idx) => {
                const t = document.createElement("img");
                t.src = src;
                if (idx === currentZoomIndex) t.classList.add("active");
                t.onclick = () => {
                    currentZoomIndex = idx;
                    updateZoomDisplay();
                };
                zoomThumbs.appendChild(t);
            });
        }
    }

    prevImgBtn.addEventListener("click", () => {
        currentZoomIndex = (currentZoomIndex - 1 + currentZoomImages.length) % currentZoomImages.length;
        updateZoomDisplay();
    });

    nextImgBtn.addEventListener("click", () => {
        currentZoomIndex = (currentZoomIndex + 1) % currentZoomImages.length;
        updateZoomDisplay();
    });

    zoomedImg.addEventListener("click", () => zoomedImg.classList.toggle("super-zoom"));
    closeZoomModal.addEventListener("click", () => zoomModal.classList.remove("active"));
    zoomModal.addEventListener("click", (e) => {
        if (e.target === zoomModal) zoomModal.classList.remove("active");
    });

    // 5. Suppression, Panier & WhatsApp
    window.deleteProduct = (id) => {
        if (confirm("Supprimer ce produit ?")) {
            products = products.filter(p => p.id !== id);
            localStorage.setItem("shop_products", JSON.stringify(products));
            renderProducts(searchInput.value);
        }
    };

    window.addToCart = (id) => {
        const product = products.find(p => p.id === id);
        if (product) {
            cart.push(product);
            updateCartUI();
        }
    };

    window.removeFromCart = (index) => {
        cart.splice(index, 1);
        updateCartUI();
    };

    function updateCartUI() {
        cartCount.textContent = cart.length;
        cartItemsList.innerHTML = "";
        let total = 0;

        if (cart.length === 0) {
            cartItemsList.innerHTML = "<p>Votre panier est vide.</p>";
        } else {
            cart.forEach((item, index) => {
                total += item.price;
                cartItemsList.innerHTML += `
                    <div class="cart-item">
                        <div><strong>${item.name}</strong><br><small>${item.price} TND</small></div>
                        <button class="btn btn-outline" style="color:#ef4444;padding:5px 10px;" onclick="removeFromCart(${index})">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
            });
        }
        cartTotal.textContent = total.toFixed(2);
    }

    whatsappOrderBtn.addEventListener("click", () => {
        if (cart.length === 0) return alert("Votre panier est vide !");
        let msg = "Bonjour, je souhaite commander :%0A%0A";
        let total = 0;
        cart.forEach(item => {
            msg += `• ${item.name} : ${item.price} TND%0A`;
            total += item.price;
        });
        msg += `%0A*Total : ${total.toFixed(2)} TND*`;
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, "_blank");
    });

    searchInput.addEventListener("input", (e) => renderProducts(e.target.value));
    openAddModalBtn.addEventListener("click", () => addProductModal.classList.add("active"));
    closeAddModal.addEventListener("click", () => addProductModal.classList.remove("active"));
    openCartBtn.addEventListener("click", () => {
        updateCartUI();
        cartModal.classList.add("active");
    });
    closeCartModal.addEventListener("click", () => cartModal.classList.remove("active"));

    renderProducts();
});