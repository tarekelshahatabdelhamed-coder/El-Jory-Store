// ============================================================================
// ملف الواجهة (الترجمة، السلة، الحسابات، عرض المنتجات) - El Jory Store 2.0
// تم دمج الواجهة الصحيحة مع أوامر الحفظ السحابية (Firebase)
// ============================================================================

// ============================================================================
// أدوات التتبع التسويقي - Facebook Pixel
// ============================================================================
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '1267424028801265');
fbq('track', 'PageView');

const translations = {
    ar: {
        langBtn: "English", navHome: "الرئيسية", navCategories: "الأقسام", navCart: "السلة", navAccount: "حسابي",
        cartTitle: "سلة التسوق", thCartProd: "المنتج", thCartPrice: "السعر", thCartAction: "إجراء",
        thCartQty: "الكمية", thCartSub: "الإجمالي الفرعي", cartTotal: "الإجمالي: ", btnCheckout: "إتمام الطلب", 
        cartEmpty: "السلة فارغة", btnDelete: "حذف", addedToCart: "تمت الإضافة للسلة بنجاح!",
        loginTitle: "تسجيل الدخول", btnLoginSubmit: "دخول", noAccountText: "ليس لديك حساب؟", linkToRegister: "إنشاء حساب جديد",
        guestLabel: "ضيف", checkoutSuccess: "تم استلام طلبك بنجاح!", noOrders: "لا توجد طلبات سابقة", 
        welcomeHeader: "أهلاً،", btnLoginHeader: "تسجيل الدخول", btnLogoutHeader: "خروج",
        addToCartBtn: "أضف للسلة", outOfStockTxt: "نفدت الكمية", allProductsTitle: "كل المنتجات",
        btnApplyPromo: "تطبيق", catPageTitle: "أقسام المتجر",
        searchPlaceholder: "ابحث عن منتج...", searchBtn: "بحث",
        shippingWord: "مصاريف الشحن:", freeWord: "مجاني"
    },
    en: {
        langBtn: "العربية", navHome: "Home", navCategories: "Categories", navCart: "Cart", navAccount: "Account",
        cartTitle: "Shopping Cart", thCartProd: "Product", thCartPrice: "Price", thCartAction: "Action",
        thCartQty: "Qty", thCartSub: "Subtotal", cartTotal: "Total: ", btnCheckout: "Checkout", 
        cartEmpty: "Cart is empty", btnDelete: "Delete", addedToCart: "Added to cart successfully!",
        loginTitle: "Login", btnLoginSubmit: "Login", noAccountText: "Don't have an account?", linkToRegister: "Create Account",
        guestLabel: "Guest", checkoutSuccess: "Order received successfully!", noOrders: "No previous orders", 
        welcomeHeader: "Welcome, ", btnLoginHeader: "Login", btnLogoutHeader: "Logout",
        addToCartBtn: "Add to Cart", outOfStockTxt: "Out of Stock", allProductsTitle: "All Products",
        btnApplyPromo: "Apply", catPageTitle: "Store Categories",
        searchPlaceholder: "Search for a product...", searchBtn: "Search",
        shippingWord: "Shipping Fee:", freeWord: "Free"
    }
};

let currentLang = localStorage.getItem("eljory_lang") || "ar";

// دالة مساعدة لتوحيد أرقام الهواتف في كل الموقع ومنع أخطاء التسجيل
window.getShortPhone = function(phone) {
    if (!phone) return "";
    return String(phone).replace(/\D/g, '').slice(-10);
};

// توليد ملح عشوائي فريد لكل مستخدم
window.generateSalt = function() {
    let arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

// تشفير كلمة المرور بالملح باستخدام SHA-256
window.hashPassword = async function(password, salt) {
    let encoder = new TextEncoder();
    let data = encoder.encode(salt + password);
    let hashBuffer = await crypto.subtle.digest('SHA-256', data);
    let hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// دالة موحدة لاستخراج اسم المنطقة من نص العنوان (آخر جزء بعد " - ")
window.getRegionFromAddressText = function(addressText) {
    if (!addressText) return "";
    let parts = addressText.split(" - ");
    return parts.length > 1 ? parts[parts.length - 1].trim() : parts[0].trim();
};

// --- دالة البحث ---
window.performSearch = function(event) {
    if(event) event.preventDefault();
    let searchInput = document.getElementById("searchInput");
    if(!searchInput) return;
    let query = searchInput.value.trim();
    if(query) {
        window.location.href = `shop.html?search=${encodeURIComponent(query)}`;
    }
};

window.applyTranslations = function() {
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;

    let t = translations[currentLang];
    let setText = (id, text) => { let el = document.getElementById(id); if(el) el.innerText = text; };
    let setPlaceholder = (id, text) => { let el = document.getElementById(id); if(el) el.placeholder = text; };
    let navCartIcon = document.getElementById("navCartIcon");
    if(navCartIcon) navCartIcon.title = t.navCart;

    setText("langBtn", t.langBtn);
    setText("navHome", t.navHome);
    setText("navCategories", t.navCategories);
    setText("navCart", t.navCart);
    setText("navAccount", t.navAccount);
    
    setPlaceholder("searchInput", t.searchPlaceholder);
    setText("searchBtn", t.searchBtn);

    setText("catPageTitle", t.catPageTitle);

    setText("cartTitle", t.cartTitle);
    setText("thCartProd", t.thCartProd);
    setText("thCartPrice", t.thCartPrice);
    setText("thCartQty", t.thCartQty);
    setText("thCartSub", t.thCartSub);
    setText("thCartAction", t.thCartAction);
    setText("btnCheckout", t.btnCheckout);
    setPlaceholder("promoInput", currentLang === 'ar' ? "كود الخصم..." : "Promo code...");

    setText("promoLabel", currentLang === 'ar' ? "لديك كود خصم؟ (أو كود هدية من نقاطك)" : "Have a promo code? (or a gift code)");
    setText("btnApplyPromo", t.btnApplyPromo);

    setText("loginTitle", t.loginTitle);
    setText("btnLoginSubmit", t.btnLoginSubmit);
    
    setText("menuOrders", currentLang === 'ar' ? "📦 طلباتي" : "📦 My Orders");
    setText("menuSettings", currentLang === 'ar' ? "⚙️ إعدادات الحساب" : "⚙️ Account Settings");
    setText("menuRewards", currentLang === 'ar' ? "🌟 نقاطي والجوائز" : "🌟 Rewards & Points");
    
    setText("tabOrdersTitle", currentLang === 'ar' ? "📦 طلباتي السابقة" : "📦 Previous Orders");
    setText("tabSettingsTitle", currentLang === 'ar' ? "إعدادات الحساب" : "Account Settings");
    setText("personalInfoTitle", currentLang === 'ar' ? "البيانات الشخصية" : "Personal Information");
    
    setText("labelName", currentLang === 'ar' ? "الاسم" : "Name");
    setText("labelPhone", currentLang === 'ar' ? "رقم التليفون" : "Phone Number");
    setText("labelEmail", currentLang === 'ar' ? "البريد الإلكتروني" : "Email Address");
    setText("labelPassword", currentLang === 'ar' ? "تغيير كلمة المرور" : "Change Password");
    
    setPlaceholder("editPassword", currentLang === 'ar' ? "اتركه فارغاً إذا لم ترد تغييره" : "Leave empty if unchanged");
    setText("btnSaveProfile", currentLang === 'ar' ? "💾 حفظ التعديلات" : "💾 Save Changes");
    
    setText("addressesTitle", currentLang === 'ar' ? "عناويني (للتوصيل)" : "My Addresses");
    setText("addressDesc", currentLang === 'ar' ? "العنوان المحدد بـ (الأساسي) سيتم استخدامه أوتوماتيكياً في طلباتك القادمة." : "The address marked as (Primary) will be used automatically in future orders.");
    setPlaceholder("newAddressInput", currentLang === 'ar' ? "أدخل عنواناً جديداً بالتفصيل..." : "Enter new full address...");
    setText("btnAddAddress", currentLang === 'ar' ? "➕ إضافة عنوان" : "➕ Add Address");
    
    setText("rewardsTitle", currentLang === 'ar' ? "🌟 متجر المكافآت والهدايا" : "🌟 Rewards Store");
    setText("currentBalanceText", currentLang === 'ar' ? "رصيدك الحالي:" : "Current Balance:");
    setText("pointsWord", currentLang === 'ar' ? "نقطة" : "Points");
    
    setText("historyTitle", currentLang === 'ar' ? "📜 سجل حركات نقاطي" : "📜 Points History");
    setText("activeCouponsTitle", currentLang === 'ar' ? "🎟️ هداياي وكوبوناتي النشطة" : "🎟️ My Active Coupons");

    setText("ordersSectionTitle", currentLang === 'ar' ? "سجل طلباتك" : "Your Orders History");
    setText("thOrdId", currentLang === 'ar' ? "رقم الطلب" : "Order ID");
    setText("thOrdDate", currentLang === 'ar' ? "التاريخ" : "Date");
    setText("thOrdTotal", currentLang === 'ar' ? "الإجمالي" : "Total Amount");
    setText("thOrdStatus", currentLang === 'ar' ? "الحالة" : "Status");

    if(typeof renderDynamicNavbar === "function") renderDynamicNavbar();
    if(typeof renderStoreProducts === "function") renderStoreProducts();
    if(typeof renderCategoriesGrid === "function") renderCategoriesGrid();
    if(typeof updateHeaderAuth === "function") updateHeaderAuth();
    if(typeof renderCart === "function") renderCart();
    if(typeof renderOrders === "function") renderOrders();
}

window.initData = function() {
    let cats = JSON.parse(localStorage.getItem("eljory_categories"));
    if(!cats || cats.length === 0) {
        localStorage.setItem("eljory_categories", JSON.stringify([{ id: "screens", nameAr: "واقيات الشاشات", nameEn: "Screen Protectors", parentId: null, isActive: true }]));
    }
}

// === قائمة الأقسام ===
// تم نقل منطق بناء قائمة الأقسام بالكامل لـ header-loader.js
// عبر دالة joryRenderNavCategories — لا تحذف هذه الدالة عشان
// applyTranslations وأماكن تانية بتستدعيها، بس خليناها فاضية
// عشان منتعارضش مع الـ mega menu الجديد
window.renderDynamicNavbar = function() {
    return;
}
// ==============================================

window.increaseQty = function(qtyId, productId) { 
    let input = document.getElementById(qtyId); if(!input) return;
    let products = JSON.parse(localStorage.getItem("eljory_products")) || [];
    let prod = products.find(p => p.id === productId);
    let currentQty = parseInt(input.value);
    let stockMsg = currentLang === 'ar' ? `عذراً، المتاح في المخزون ${prod.stock} قطع فقط!` : `Sorry, only ${prod.stock} items left in stock!`;
    if(prod && currentQty >= prod.stock) { alert(stockMsg); return; }
    input.value = currentQty + 1; 
};
window.decreaseQty = function(qtyId) { let input = document.getElementById(qtyId); if(input && parseInt(input.value) > 1) { input.value = parseInt(input.value) - 1; } };

window.renderStoreProducts = function() {
    const container = document.getElementById("dynamicProductsContainer");
    const subBar = document.getElementById("subCategoriesFilterBar");
    if(!container) return;
    container.innerHTML = "";
    if(subBar) subBar.innerHTML = ""; 
    
    let products = JSON.parse(localStorage.getItem("eljory_products")) || [];
    let cats = JSON.parse(localStorage.getItem("eljory_categories")) || [];
    let promos = JSON.parse(localStorage.getItem("eljory_promos")) || [];
    let now = new Date();

    let activePromos = promos.filter(p => now >= new Date(p.start) && now <= new Date(p.end));

    const urlParams = new URLSearchParams(window.location.search);
    const catFilter    = urlParams.get('cat'); 
    const subFilter    = urlParams.get('sub');
    const listFilter   = urlParams.get('list');
    const searchFilter = urlParams.get('search'); 
    const currency = currentLang === 'ar' ? 'ج.م' : 'EGP';
    
    let pageTitleElem = document.getElementById("screensPageTitle");
    if(pageTitleElem) {
        if(searchFilter) {
            pageTitleElem.innerText = currentLang === 'ar' ? `نتائج البحث عن: "${searchFilter}"` : `Search results for: "${searchFilter}"`;
        }
        else if(catFilter) {
            let currentCat = cats.find(c => c.id === catFilter);
            let catName = currentCat ? (currentLang === 'ar' ? currentCat.nameAr : (currentCat.nameEn || currentCat.nameAr)) : (currentLang === 'ar' ? "قسم غير معروف" : "Unknown Category");
            pageTitleElem.innerText = catName;
        } else {
            pageTitleElem.innerText = translations[currentLang].allProductsTitle;
        }
    }
    
    let activeCatIds = cats.filter(c => c.isActive !== false).map(c => c.id);

    if(catFilter && subBar) {
        let subCategories = cats.filter(c => c.parentId === catFilter && c.isActive !== false);
        if(subCategories.length > 0) {
            let allText = currentLang === 'ar' ? 'الكل' : 'All';
            let allBtnClass = !subFilter ? 'background:#f38c18; color:#1d364a;' : 'background:#1d364a; color:white;';
            subBar.innerHTML = `<a href="shop.html?cat=${catFilter}" style="${allBtnClass} padding:10px 20px; border-radius:20px; text-decoration:none; font-weight:bold; font-size:14px; transition:0.3s;">${allText}</a>`;
            
            subCategories.forEach(sc => {
                let scName = currentLang === 'ar' ? sc.nameAr : (sc.nameEn || sc.nameAr);
                let isCurrentSub = subFilter === sc.id;
                let btnStyle = isCurrentSub ? 'background:#f38c18; color:#1d364a;' : 'background:#1d364a; color:white;';
                subBar.innerHTML += `<a href="shop.html?cat=${catFilter}&sub=${sc.id}" style="${btnStyle} padding:10px 20px; border-radius:20px; text-decoration:none; font-weight:bold; font-size:14px; transition:0.3s;">${scName}</a>`;
            });
        }
    }

    let filteredProducts = products.filter(p => {
        let isProdActive = p.isActive !== false;
        let isMainCatActive = activeCatIds.includes(p.category);
        let isSubCatActive = !p.subCategory || activeCatIds.includes(p.subCategory);
        return isProdActive && isMainCatActive && isSubCatActive;
    });
    
    if(catFilter) filteredProducts = filteredProducts.filter(p => p.category === catFilter);
    if(subFilter) filteredProducts = filteredProducts.filter(p => p.subCategory === subFilter);
    if(listFilter) {
        let customLists = JSON.parse(localStorage.getItem('eljory_custom_lists') || '[]');
        let targetList  = customLists.find(l => l.id === listFilter && l.isActive !== false);
        if(targetList && targetList.products && targetList.products.length) {
            let orderedIds = targetList.products;
            filteredProducts = orderedIds.map(id => filteredProducts.find(p => p.id === id)).filter(Boolean);
        } else {
            filteredProducts = [];
        }
    }
    
    if(searchFilter) {
        let q = searchFilter.toLowerCase();
        filteredProducts = filteredProducts.filter(p => 
            (p.titleAr && p.titleAr.toLowerCase().includes(q)) || 
            (p.titleEn && p.titleEn.toLowerCase().includes(q))
        );
    }

    if(filteredProducts.length === 0) {
        let noProductsMsg = currentLang === 'ar' ? 'لا توجد منتجات متوفرة في هذا القسم حالياً.' : 'No products available in this category currently.';
        if(searchFilter) noProductsMsg = currentLang === 'ar' ? 'لا توجد نتائج مطابقة لبحثك.' : 'No results match your search.';
        
        container.innerHTML = `<p style='text-align:center; width:100%; color:gray; font-size:16px; padding:40px 0;'>${noProductsMsg}</p>`;
        return;
    }

    filteredProducts.forEach(prod => {
        let isOutOfStock = prod.stock <= 0;
        let cardClass = isOutOfStock ? "product-card out-of-stock" : "product-card";
        let outOfStockLabel = isOutOfStock ? `<div class="out-of-stock-overlay">${translations[currentLang].outOfStockTxt}</div>` : "";
        let btnDisabled = isOutOfStock ? "disabled" : "";
        let btnAction = isOutOfStock ? "" : `onclick="addToCart('${prod.id}', ${prod.price}, 'qty_${prod.id}')"`;

        let promoOverlay = "";
        let productPromo = activePromos.find(p => p.scope === 'all' || p.products.includes(prod.id));
        
        if(productPromo && !isOutOfStock) {
            promoOverlay = `<div style="position:absolute; top:10px; left:10px; background:#d9534f; color:white; padding:5px 10px; border-radius:5px; font-weight:bold; font-size:12px; z-index:2; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">🔥 ${productPromo.label}</div>`;
        }

        let loyaltySettings = JSON.parse(localStorage.getItem("eljory_loyalty_settings")) || { system: "global", spent: 10, earn: 1 };
        let pointsBadge = "";
        let pointsMsg = currentLang === 'ar' ? `🎁 اشتري لتحصل على ${prod.points} نقطة` : `🎁 Buy to get ${prod.points} points`;
        
        if(loyaltySettings.system === "product" && prod.points > 0) {
            pointsBadge = `<p style="color:#28a745; font-size:14px; font-weight:bold; margin:0 0 15px 0;">${pointsMsg}</p>`;
        }

        let prodName = currentLang === 'ar' ? prod.titleAr : (prod.titleEn || prod.titleAr);

        container.innerHTML += `
            <div class="${cardClass}" style="position:relative;">
                <a href="product.html?id=${prod.id}" style="text-decoration: none; color: inherit; display: block; cursor: pointer;">
                    ${outOfStockLabel}
                    ${promoOverlay}
                    <img src="${prod.img}" alt="${prodName}">
                    <h3>${prodName}</h3>
                </a>
                <p class="price" style="margin-bottom: 5px;">${prod.price} ${currency}</p>
                ${pointsBadge}
                <div class="qty-container">
                    <button class="qty-btn" onclick="increaseQty('qty_${prod.id}', '${prod.id}')" ${btnDisabled}>+</button>
                    <input type="text" id="qty_${prod.id}" class="qty-input" value="1" readonly>
                    <button class="qty-btn" onclick="decreaseQty('qty_${prod.id}')" ${btnDisabled}>-</button>
                </div>
                <button class="btn-add" ${btnAction} ${btnDisabled}>${translations[currentLang].addToCartBtn}</button>
            </div>
        `;        
    });
}

let cart = JSON.parse(localStorage.getItem("eljory_cart")) || [];
function saveCart() { localStorage.setItem("eljory_cart", JSON.stringify(cart)); if(typeof updateCartBadge === "function") updateCartBadge(); }

window.addToCart = function(productId, price, qtyId) {
    let isAuth = localStorage.getItem("eljory_auth") === "true";
    let loginMsg = currentLang === 'ar' ? "يرجى تسجيل الدخول أولاً!" : "Please login first!";
    let qtyErrorMsg = currentLang === 'ar' ? "الكمية المطلوبة غير متوفرة!" : "Requested quantity not available!";
    
    if (!isAuth) { alert(loginMsg); window.location.href = "login.html"; return; }
    let qtyInput = document.getElementById(qtyId); let qty = qtyInput ? parseInt(qtyInput.value) : 1;
    let products = JSON.parse(localStorage.getItem("eljory_products")) || [];
    let prodData = products.find(p => p.id === productId);

    if(!prodData || prodData.stock < qty) { alert(qtyErrorMsg); return; }

    let existingItem = cart.find(item => item.id === productId);
    if(existingItem) { 
        let maxQtyMsg = currentLang === 'ar' ? `أقصى كمية متاحة هي ${prodData.stock}` : `Maximum available quantity is ${prodData.stock}`;
        if(existingItem.qty + qty > prodData.stock) { alert(maxQtyMsg); return; }
        existingItem.qty += qty; 
    } else { cart.push({ id: productId, price: price, qty: qty }); }
    saveCart();

    if (typeof fbq === 'function') {
        fbq('track', 'AddToCart', {
            content_ids: [productId],
            content_type: 'product',
            value: price * qty,
            currency: 'EGP'
        });
    }

    alert(translations[currentLang].addedToCart); if(qtyInput) qtyInput.value = 1; 
}

let appliedPromoObj = null; 

window.applyPromo = function() {
    let inputElem = document.getElementById("promoInput"); 
    let msgElem = document.getElementById("promoMessage"); 
    if(!inputElem || !msgElem) return;
    
    let code = inputElem.value.trim().toUpperCase();
    let promos = JSON.parse(localStorage.getItem("eljory_promos")) || [];
    let now = new Date();

    let validPromo = promos.find(p => p.code === code && now >= new Date(p.start) && now <= new Date(p.end));

    if(validPromo) {
        appliedPromoObj = validPromo;
        msgElem.innerText = currentLang === 'ar' ? "تم تطبيق الكوبون بنجاح!" : "Coupon applied successfully!";
        msgElem.style.color = "green"; 
        msgElem.style.display = "block";
    } else {
        appliedPromoObj = null;
        msgElem.innerText = currentLang === 'ar' ? "الكود غير صحيح أو منتهي الصلاحية" : "Invalid or expired code";
        msgElem.style.color = "#d9534f"; 
        msgElem.style.display = "block";
    }
    renderCart(); 
}

function renderCart() {
    const tbody = document.querySelector(".cart-section tbody"); const cartTotal = document.getElementById("cartTotal"); if(!tbody || !cartTotal) return; 
    tbody.innerHTML = ""; let grandTotal = 0;
    const currency = currentLang === 'ar' ? 'ج.م' : 'EGP';
    
    if (cart.length === 0) { 
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px;">${translations[currentLang].cartEmpty}</td></tr>`; 
        cartTotal.innerHTML = `${translations[currentLang].cartTotal} 0 ${currency}`; 
        return; 
    }
    
    let allProducts = JSON.parse(localStorage.getItem("eljory_products")) || [];
    
    cart.forEach((item, index) => {
        let subtotal = item.price * item.qty; grandTotal += subtotal;
        let pData = allProducts.find(p => p.id === item.id); 
        let productName = pData ? (currentLang === 'ar' ? pData.titleAr : (pData.titleEn || pData.titleAr)) : item.id;
        tbody.innerHTML += `<tr><td>${productName}</td><td>${item.price} ${currency}</td><td><strong>${item.qty}</strong></td><td>${subtotal} ${currency}</td><td><button onclick="removeFromCart(${index})" style="background: #d9534f; color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px; font-weight: bold;">${translations[currentLang].btnDelete}</button></td></tr>`;
    });

    let finalTotal = grandTotal;
    let discountMsg = "";

    let user = getCurrentUser();
    let shippingFee = 0;
    let hasShipping = false;
    
    if (user && user.addresses && user.addresses.length > 0) {
        let primaryAddress = user.addresses.find(a => a.isPrimary) || user.addresses[0];
        
        let regionName = getRegionFromAddressText(primaryAddress.text);
        
        let regions = JSON.parse(localStorage.getItem("eljory_regions")) || [];
        let matchedRegion = regions.find(r => r.name === regionName);
        if (matchedRegion) {
            shippingFee = parseFloat(matchedRegion.fee) || 0;
            hasShipping = true;
        }
    }

    if(appliedPromoObj) {
        let applicableTotal = 0;
        cart.forEach(item => {
            if(appliedPromoObj.scope === 'all' || appliedPromoObj.products.includes(item.id)) {
                applicableTotal += (item.price * item.qty);
            }
        });

        if(applicableTotal > 0 || appliedPromoObj.type === "shipping") {
            if(appliedPromoObj.type === "percent") {
                let discountAmount = applicableTotal * (appliedPromoObj.value / 100);
                finalTotal = grandTotal - discountAmount;
                let pctMsg = currentLang === 'ar' ? `(تم خصم ${appliedPromoObj.value}% من المنتجات المشمولة)` : `(${appliedPromoObj.value}% off applicable items)`;
                discountMsg = `<br><span style="color:#f38c18; font-size:16px;">${pctMsg}</span>`;
            } else if (appliedPromoObj.type === "fixed") {
                let discountAmount = appliedPromoObj.value;
                if(discountAmount > applicableTotal) discountAmount = applicableTotal; 
                finalTotal = grandTotal - discountAmount;
                let fixMsg = currentLang === 'ar' ? `(تم خصم ${appliedPromoObj.value} ${currency})` : `(${appliedPromoObj.value} ${currency} off)`;
                discountMsg = `<br><span style="color:#f38c18; font-size:16px;">${fixMsg}</span>`;
            } else if (appliedPromoObj.type === "shipping") {
                shippingFee = 0; 
                let shipMsg = currentLang === 'ar' ? `🎉 التوصيل مجاني بفضل البروموكود!` : `🎉 Free shipping applied!`;
                discountMsg = `<br><span style="color:#28a745; font-size:18px; font-weight:bold;">${shipMsg}</span>`;
            }
        } else {
            let noApplyMsg = currentLang === 'ar' ? '(الكوبون لا ينطبق على المنتجات الموجودة في السلة)' : '(Coupon does not apply to items in cart)';
            discountMsg = `<br><span style="color:red; font-size:14px;">${noApplyMsg}</span>`;
        }
    }

    finalTotal += shippingFee;
    
    let shipText = "";
    if (!hasShipping) {
        let loginMsg = currentLang === 'ar' ? '<span style="color:gray; font-size:14px;">(سجل الدخول لمعرفة الشحن)</span>' : '<span style="color:gray; font-size:14px;">(Login to see shipping)</span>';
        let noAddrMsg = currentLang === 'ar' ? '<span style="color:red; font-size:14px;">(يرجى إضافة المحافظة في إعدادات الحساب)</span>' : '<span style="color:red; font-size:14px;">(Please add region in account)</span>';
        shipText = user ? noAddrMsg : loginMsg;
    } else if (shippingFee === 0) {
        shipText = `<span style="color:green; font-weight:bold;">${translations[currentLang].freeWord || 'مجاني'}</span>`;
    } else {
        shipText = `${shippingFee} ${currency}`;
    }

    let beforeText = currentLang === 'ar' ? 'المجموع:' : 'Subtotal:';
    let shipLabel = translations[currentLang].shippingWord || 'مصاريف الشحن:';
    let afterText = currentLang === 'ar' ? 'الإجمالي الكلي:' : 'Grand Total:';

    cartTotal.innerHTML = `
        <div style="font-size:18px; color:#555; margin-bottom:5px;">${beforeText} <strong>${grandTotal}</strong> ${currency}</div>
        <div style="font-size:18px; color:#555; margin-bottom:15px; border-bottom:1px solid #ccc; padding-bottom:10px;">${shipLabel} <strong>${shipText}</strong></div>
        <div style="color:green; font-size:26px;">${afterText} <strong>${finalTotal}</strong> ${currency}</div>
        ${discountMsg}
    `;
    
    window.cartFinalTotal = finalTotal; 
    window.cartShippingFee = hasShipping ? shippingFee : 0; 
}

window.updateCartBadge = function() {
    let currentCart = JSON.parse(localStorage.getItem("eljory_cart")) || [];
    let totalQty = currentCart.reduce((sum, item) => sum + item.qty, 0); 
    let badge = document.getElementById("cartBadge");
    
    if(badge) {
        if(totalQty > 0) {
            badge.innerText = totalQty;
            badge.style.display = "inline-block";
        } else {
            badge.style.display = "none";
        }
    }
};

window.removeFromCart = function(index) { cart.splice(index, 1); saveCart(); renderCart(); };

window.loadUserProfile = function() {
    let user = getCurrentUser(); let isAuth = localStorage.getItem("eljory_auth") === "true";
    let greetingElem = document.getElementById("accountGreeting");
    let guestText = currentLang === 'ar' ? 'ضيف' : 'Guest';
    let welcomeText = currentLang === 'ar' ? 'أهلاً بك يا' : 'Welcome,';

    if(greetingElem) greetingElem.innerHTML = (isAuth && user) ? `${welcomeText} ${user.name}` : guestText;
    if(isAuth && user) {
        if(document.getElementById("editName")) document.getElementById("editName").value = user.name || "";
        if(document.getElementById("editPhone")) document.getElementById("editPhone").value = user.phone || "";
        if(document.getElementById("editEmail")) document.getElementById("editEmail").value = user.email || "";
        if(window.renderAddresses) renderAddresses();
    }
    
    let pointsElem = document.getElementById("loyaltyPointsDisplay");
    let settings = JSON.parse(localStorage.getItem("eljory_loyalty_settings")) || {};
    let points = user ? (user.points || 0) : 0;
    
    if(pointsElem) {
        let now = new Date();
        let expiry = settings.expiry ? new Date(settings.expiry) : null;
        
        if(expiry && now > expiry) {
            pointsElem.innerText = "0";
            let expMsg = currentLang === 'ar' ? 'انتهت صلاحية نقاطك السابقة.' : 'Your previous points have expired.';
            pointsElem.insertAdjacentHTML('afterend', `<p style="color:red; font-weight:bold; font-size:14px; margin-top:5px;">${expMsg}</p>`);
        } else {
            pointsElem.innerText = points;
            if(expiry) {
                let expiryStr = currentLang === 'ar' ? expiry.toLocaleDateString('ar-EG') : expiry.toLocaleDateString('en-US');
                let validMsg = currentLang === 'ar' ? 'النقاط صالحة حتى:' : 'Points valid until:';
                pointsElem.insertAdjacentHTML('afterend', `<p style="color:green; font-weight:bold; font-size:14px; margin-top:5px;">${validMsg} ${expiryStr}</p>`);
            }
        }
    }
}

// ==== دوال الحفظ مربوطة بـ Firebase ====
window.saveProfile = async function() {
    let user = getCurrentUser(); if(!user) return;
    let newName = document.getElementById("editName").value.trim();
    let newEmail = document.getElementById("editEmail").value.trim();
    let newPass = document.getElementById("editPassword").value.trim();
    let reqMsg = currentLang === 'ar' ? "الاسم مطلوب!" : "Name is required!";
    if(!newName) return alert(reqMsg);
    
    let phoneKey = getShortPhone(user.phone);
    let updates = { name: newName, email: newEmail };

    if (newPass) {
        let salt = window.generateSalt();
        updates.passwordHash = await window.hashPassword(newPass, salt);
        updates.passwordSalt = salt;
        updates.password = null;
    }

    db.ref('/users/' + phoneKey).update(updates).then(() => {
        let successMsg = currentLang === 'ar' ? "تم تحديث البيانات بنجاح!" : "Profile updated successfully!";
        alert(successMsg); document.getElementById("editPassword").value = "";
        updateHeaderAuth(); loadUserProfile();
    });
}

window.renderAddresses = function() {
    let user = getCurrentUser(); let list = document.getElementById("addressesList");
    if(!list || !user) return; list.innerHTML = ""; let addresses = user.addresses || [];
    let primaryText = currentLang === 'ar' ? 'الأساسي' : 'Primary';
    let setPrimaryText = currentLang === 'ar' ? 'تعيين كأساسي' : 'Set as Primary';

    addresses.forEach(addr => {
        let primaryBadge = addr.isPrimary ? `<span style="background:#28a745; color:white; font-size:11px; padding:3px 8px; border-radius:4px; font-weight:bold;">${primaryText}</span>` : `<button onclick="setPrimaryAddress(${addr.id})" style="background:none; border:1px solid #1d364a; font-size:12px; cursor:pointer; padding:3px 8px; border-radius:4px;">${setPrimaryText}</button>`;
        list.innerHTML += `<div style="background:#f9f9f9; padding:12px; border:1px solid #ddd; margin-bottom:8px; border-radius:5px; display:flex; justify-content:space-between; align-items:center;">
                <div style="flex:1;"><strong>${addr.text}</strong> <div style="margin-top:5px;">${primaryBadge}</div></div>
                <button onclick="deleteAddress(${addr.id})" style="color:red; background:none; border:none; cursor:pointer; font-weight:bold; font-size:16px;">✖</button>
            </div>`;
    });
}

window.addNewAddress = function() {
    let input = document.getElementById("newAddressInput"); let text = input.value.trim();
    let regionSelect = document.getElementById("newAddressRegion");
    let region = regionSelect ? regionSelect.value : "";
    let reqMsg = currentLang === 'ar' ? "يرجى كتابة العنوان الجديد" : "Please enter the new address";
    let reqRegionMsg = currentLang === 'ar' ? "يرجى اختيار المنطقة" : "Please select a region";
    if(!text) return alert(reqMsg);
    if(!region) return alert(reqRegionMsg);
    let user = getCurrentUser(); let phoneKey = getShortPhone(user.phone);
    let newAddrs = user.addresses || []; 
    newAddrs.push({ id: Date.now(), text: text + " - " + region, isPrimary: newAddrs.length === 0 });
    db.ref('/users/' + phoneKey + '/addresses').set(newAddrs).then(() => { 
        input.value = ""; if(regionSelect) regionSelect.value = ""; renderAddresses(); 
    });
}

window.setPrimaryAddress = function(id) {
    let user = getCurrentUser(); let phoneKey = getShortPhone(user.phone);
    let addrs = (user.addresses || []).map(a => ({ ...a, isPrimary: a.id === id }));
    db.ref('/users/' + phoneKey + '/addresses').set(addrs).then(() => renderAddresses());
}

window.deleteAddress = function(id) {
    let user = getCurrentUser(); let phoneKey = getShortPhone(user.phone); let addrs = user.addresses || [];
    let errAdd = currentLang === 'ar' ? "عفواً، يجب أن يحتفظ حسابك بعنوان واحد على الأقل!" : "Sorry, you must keep at least one address!";
    if(addrs.length <= 1) return alert(errAdd);
    let target = addrs.find(a => a.id === id); 
    addrs = addrs.filter(a => a.id !== id);
    if(target && target.isPrimary && addrs.length > 0) addrs[0].isPrimary = true;
    db.ref('/users/' + phoneKey + '/addresses').set(addrs).then(() => renderAddresses());
}

const btnCheckout = document.getElementById("btnCheckout");
if(btnCheckout) {
    btnCheckout.addEventListener("click", () => {
        let emptyMsg = currentLang === 'ar' ? "السلة فارغة" : "Cart is empty";
        let logMsg = currentLang === 'ar' ? "يرجى تسجيل الدخول أولاً!" : "Please login first!";
        
        if(cart.length === 0) { alert(emptyMsg); return; }
        let user = getCurrentUser();
        if(!user) { alert(logMsg); window.location.href="login.html"; return; }

        if (typeof fbq === 'function') {
            fbq('track', 'InitiateCheckout', {
                content_ids: cart.map(item => item.id),
                contents: cart.map(item => ({ id: item.id, quantity: item.qty })),
                value: window.cartFinalTotal || 0,
                currency: 'EGP',
                num_items: cart.reduce((sum, item) => sum + item.qty, 0)
            });
        }
        
        let shipping = 0;
        let regions = JSON.parse(localStorage.getItem("eljory_regions")) || [];
        if (user.addresses && user.addresses.length > 0) {
            let primaryAddress = user.addresses.find(a => a.isPrimary) || user.addresses[0];
            let regionName = getRegionFromAddressText(primaryAddress.text);
            let matchedRegion = regions.find(r => r.name === regionName);
            if (matchedRegion) shipping = parseFloat(matchedRegion.fee) || 0;
        }

        if(appliedPromoObj && appliedPromoObj.type === "shipping") shipping = 0;

        let total = window.cartFinalTotal; 
        let subTotal = total - shipping;   
        
        let loyaltySettings = JSON.parse(localStorage.getItem("eljory_loyalty_settings")) || { system: "global", spent: 10, earn: 1 };
        let earnedPoints = 0;
        if(loyaltySettings.system === "global") {
            earnedPoints = Math.floor(total / loyaltySettings.spent) * loyaltySettings.earn;
        } else {
            let allProds = JSON.parse(localStorage.getItem("eljory_products")) || [];
            cart.forEach(item => {
                let p = allProds.find(x => x.id === item.id);
                if(p && p.points) earnedPoints += (p.points * item.qty);
            });
        }

        let noAddr = currentLang === 'ar' ? "لم يتم تحديد عنوان" : "No address selected";
        let primaryAddr = user.addresses && user.addresses.find(a => a.isPrimary) ? user.addresses.find(a => a.isPrimary).text : noAddr;
        let checkoutCustomerData = { name: user.name, phone: user.phone, address: primaryAddr };

        // رفع الطلب لفايربيس باستخدام Transaction للرقم التسلسلي
        const counterRef = db.ref('/metadata/lastOrderId');
        counterRef.transaction((currentValue) => {
            return (currentValue || 1000) + 1;
        }, (error, committed, snapshot) => {
            if (error) { alert("حدث خطأ في النظام أثناء توليد رقم الطلب."); } 
            else if (committed) {
                let newOrderId = "ORD-" + snapshot.val();
                let newOrder = { 
                    id: newOrderId, date: new Date().toLocaleDateString(), subTotal: subTotal, shippingFee: shipping, total: total, 
                    status: "Pending", earnedPoints: earnedPoints, customer: checkoutCustomerData, items: [...cart], timestamp: firebase.database.ServerValue.TIMESTAMP 
                };
                
                db.ref('/orders/' + newOrderId).set(newOrder).then(() => {

                    // Facebook Pixel - Purchase
                    if (typeof fbq === 'function') {
                        fbq('track', 'Purchase', {
                            content_ids: cart.map(item => item.id),
                            contents: cart.map(item => ({ id: item.id, quantity: item.qty })),
                            value: total,
                            currency: 'EGP',
                            num_items: cart.reduce((sum, item) => sum + item.qty, 0)
                        });
                    }

                    // معالجة كوبون الهدية لو موجود
                    let usedLoyaltyCoupon = JSON.parse(localStorage.getItem("eljory_applied_loyalty_coupon"));
                    if (usedLoyaltyCoupon) {
                        let userPhoneKey = getShortPhone(user.phone);
                        db.ref('/users/' + userPhoneKey + '/coupons').once('value').then(snap => {
                            let coupons = snap.val() || [];
                            let idx = coupons.findIndex(c => c.code === usedLoyaltyCoupon.code);
                            if (idx > -1) {
                                coupons[idx].isUsed = true;
                                db.ref('/users/' + userPhoneKey + '/coupons').set(coupons);
                            }
                        });
                        localStorage.removeItem("eljory_applied_loyalty_coupon");
                    }

                    // ✅ الإصلاح: ننتظر كل transactions المخزون تخلص فعلاً قبل الـ redirect
                    let stockTransactions = cart.map(item =>
                        db.ref('/products/' + item.id + '/stock').transaction(
                            currentStock => Math.max(0, (currentStock || 0) - item.qty)
                        )
                    );
                    return Promise.all(stockTransactions);

                }).then(() => {
                    // ✅ دلوقتي بعد خصم المخزون فعلاً، نفرّغ السلة ونعمل redirect
                    cart = []; 
                    saveCart(); 
                    appliedPromoObj = null; 
                    alert(translations[currentLang].checkoutSuccess + "\nرقم طلبك هو: " + newOrderId); 
                    localStorage.setItem("eljory_active_acc_tab", "orders"); 
                    window.location.href = "account.html";

                }).catch(error => {
                    console.error("خطأ في خصم المخزون:", error);
                    // الطلب اتحفظ بنجاح حتى لو المخزون اتأخر
                    cart = []; 
                    saveCart(); 
                    appliedPromoObj = null;
                    alert(translations[currentLang].checkoutSuccess + "\nرقم طلبك هو: " + newOrderId);
                    localStorage.setItem("eljory_active_acc_tab", "orders"); 
                    window.location.href = "account.html";
                });
            }
        });
    });
}

window.toggleAuth = function(type) {
    let boxes = ['loginFormBox', 'registerFormBox', 'forgotFormBox'];
    boxes.forEach(id => { if(document.getElementById(id)) document.getElementById(id).style.display = 'none'; });
    if(type === 'register') document.getElementById('registerFormBox').style.display = 'block';
    else if(type === 'forgot') document.getElementById('forgotFormBox').style.display = 'block';
    else document.getElementById('loginFormBox').style.display = 'block';
}

window.doLogin = async function(event) {
    if (event) event.preventDefault();

    let phone = document.getElementById("loginPhone").value.trim();
    let password = document.getElementById("loginPassword").value;
    let cleanPhone = window.getShortPhone(phone);

    if (!cleanPhone || !password) {
        alert(currentLang === 'ar' ? "يرجى ملء جميع الحقول!" : "Please fill all fields!");
        return;
    }

    db.ref('/users/' + cleanPhone).once('value').then(async (snapshot) => {
        if (!snapshot.exists()) {
            alert(currentLang === 'ar' ? "الرقم غير مسجل! يرجى إنشاء حساب جديد." : "Phone not registered!");
            return;
        }

        let user = snapshot.val();

        // فحص الحظر
        if (user.isBlocked) {
            alert(currentLang === 'ar' ? "هذا الحساب محظور. تواصل مع الإدارة." : "Account blocked. Contact support.");
            return;
        }

        let isValid = false;

        // التحقق من كلمة المرور (هاش أو نص عادي للحسابات القديمة)
        if (user.passwordHash && user.passwordSalt) {
            let hash = await window.hashPassword(password, user.passwordSalt);
            isValid = (hash === user.passwordHash);
        } else if (user.password) {
            isValid = (password === user.password);
            if (isValid) {
                // ترقية تلقائية للتشفير للحسابات القديمة
                let salt = window.generateSalt();
                let hash = await window.hashPassword(password, salt);
                db.ref('/users/' + cleanPhone).update({ passwordHash: hash, passwordSalt: salt, password: null });
            }
        }

        if (!isValid) {
            alert(currentLang === 'ar' ? "كلمة المرور غير صحيحة!" : "Incorrect password!");
            return;
        }

        // فحص انتهاء صلاحية النقاط عند الدخول
        user = window.checkAndResetLoyaltyExpiry(user, cleanPhone);

        localStorage.setItem("eljory_auth", "true");
        localStorage.setItem("eljory_active_phone", cleanPhone);
        localStorage.setItem("eljory_active_user", JSON.stringify(user));

        window.location.href = "index.html";
    });
};

window.doForgotPassword = function(event) {
    if(event) event.preventDefault();
    let email = document.getElementById("forgotEmail").value.trim();
    let reqMsg = currentLang === 'ar' ? "يرجى إدخال البريد الإلكتروني" : "Please enter your email";
    if(!email) return alert(reqMsg);

    db.ref('/users').orderByChild('email').equalTo(email).once('value').then(snapshot => {
        if(snapshot.exists()) {
            snapshot.forEach(async child => {
                let newPass = Math.floor(100000 + Math.random() * 900000).toString();
                let salt = window.generateSalt();
                let hash = await window.hashPassword(newPass, salt);
                child.ref.update({ passwordHash: hash, passwordSalt: salt, password: null }).then(() => {
                    let succMsg = currentLang === 'ar' ? `(نجاح)\nتم إرسال كلمة مرور جديدة لبريدك!\nكلمة المرور الجديدة هي: ${newPass}` : `(Success)\nNew password sent!\nYour new password is: ${newPass}`;
                    alert(succMsg);
                    toggleAuth('login');
                });
            });
        } else {
            let notFoundMsg = currentLang === 'ar' ? "هذا البريد الإلكتروني غير مسجل لدينا." : "Email not found.";
            alert(notFoundMsg); 
        }
    });
}

window.doLogout = function() { 
    localStorage.removeItem("eljory_auth"); 
    localStorage.removeItem("eljory_active_phone"); 
    localStorage.removeItem("eljory_active_user");
    window.location.href = "index.html"; 
}

window.getCurrentUser = function() {
    let userStr = localStorage.getItem("eljory_active_user");
    return userStr ? JSON.parse(userStr) : null;
}

window.updateHeaderAuth = function() {
    let userInfoElem = document.getElementById("headerUserInfo"); if(!userInfoElem) return;
    let isAuth = localStorage.getItem("eljory_auth") === "true"; let user = getCurrentUser();
    let t = translations[currentLang];
    
    if (isAuth && user) { userInfoElem.innerHTML = `<span>${t.welcomeHeader}${user.name}</span> <button class="btn-logout-header" onclick="doLogout()">${t.btnLogoutHeader}</button>`; } 
    else { userInfoElem.innerHTML = `<span>${t.guestLabel}</span> <a href="login.html" class="btn-login-header">${t.btnLoginHeader}</a>`; }
}

window.renderOrders = function() {
    const tbody = document.getElementById("ordersTableBody"); if(!tbody) return;
    let user = getCurrentUser(); 
    let isAuth = localStorage.getItem("eljory_auth") === "true"; 
    tbody.innerHTML = ""; 
    const currency = currentLang === 'ar' ? 'ج.م' : 'EGP';
    
    let reqLogMsg = currentLang === 'ar' ? 'يرجى تسجيل الدخول لعرض طلباتك' : 'Please login to view your orders';
    if (!isAuth || !user) { 
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px;">${reqLogMsg}</td></tr>`; 
        return; 
    }

    // سحب الأوردرات من السحابة مباشرة وفلترتها برقم العميل
    db.ref('/orders').on('value', snapshot => {
        let myOrders = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                let ord = child.val();
                if (ord && ord.customer && ord.customer.phone) {
                    let ordPhone = String(ord.customer.phone).replace(/\D/g, '').slice(-10);
                    let userPhone = String(user.phone).replace(/\D/g, '').slice(-10);
                    
                    if (ordPhone === userPhone) {
                        myOrders.push(ord);
                    }
                }
            });
        }
        
        if (myOrders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px;">${translations[currentLang].noOrders}</td></tr>`; 
            return; 
        }
        
        tbody.innerHTML = "";
        myOrders.reverse().forEach((order) => {
            let statusText = ""; let statusClass = ""; let actionBtn = "";
            
            if(order.status === "Pending" || order.status === "Processing" || !order.status) {
                statusText = currentLang === 'ar' ? 'تم الطلب ⏳' : 'Pending'; statusClass = "status-badge"; 
                let cancelText = currentLang === 'ar' ? 'إلغاء الطلب' : 'Cancel Order';
                actionBtn = `<button style="background:#d9534f; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; margin-top:5px; font-weight:bold; width:100%;" onclick="cancelOrderUser('${order.id}')">${cancelText}</button>`;
            } else if(order.status === "Shipped") {
                statusText = currentLang === 'ar' ? 'تم الشحن 🚚' : 'Shipped'; statusClass = "status-badge"; 
            } else if(order.status === "Delivered") {
                statusText = currentLang === 'ar' ? 'تم التوصيل ✅' : 'Delivered'; statusClass = "status-delivered"; 
            } else if(order.status === "Cancelled") {
                statusText = currentLang === 'ar' ? 'ملغي ❌' : 'Cancelled'; statusClass = "status-badge"; 
            }

            let bgStyle = order.status === "Cancelled" ? "background-color: #d9534f;" : (order.status === "Shipped" ? "background-color: #17a2b8;" : (order.status === "Pending" || order.status === "Processing" ? "background-color: #f38c18;" : ""));

            tbody.innerHTML += `<tr>
                <td><strong>${order.id}</strong></td>
                <td>${order.date}</td>
                <td>${order.total} ${currency}</td>
                <td style="text-align:center;">
                    <span class="status-badge ${statusClass}" style="${bgStyle}; display:block; padding:5px; border-radius:4px; color:white;">${statusText}</span>
                    ${actionBtn}
                </td>
            </tr>`;
        });
    });
}

window.cancelOrderUser = function(orderId) {
    let confirmMsg = currentLang === 'ar' ? "هل أنت متأكد من إلغاء هذا الطلب؟" : "Are you sure you want to cancel this order?";
    if(!confirm(confirmMsg)) return;
    
    db.ref('/orders/' + orderId).once('value').then(snapshot => {
        let order = snapshot.val();
        if(order && (order.status === "Pending" || order.status === "Processing" || !order.status)) {
            db.ref('/orders/' + orderId).update({status: "Cancelled"}).then(() => {
                if(order.items) {
                    order.items.forEach(item => { db.ref('/products/' + item.id + '/stock').transaction(currentStock => (currentStock || 0) + item.qty); });
                }
                let succMsg = currentLang === 'ar' ? "تم إلغاء الطلب بنجاح وتم استرجاع المنتجات للمخزون." : "Order cancelled successfully.";
                alert(succMsg);
            });
        } else {
            let errMsg = currentLang === 'ar' ? "عفواً، لا يمكن إلغاء الطلب بعد شحنه." : "Sorry, order cannot be cancelled after shipping.";
            alert(errMsg);
        }
    });
}

window.loadAdminRegions = function() {
    let regions = JSON.parse(localStorage.getItem("eljory_regions")) || [];
    
    if (regions.length > 0 && typeof regions[0] === 'string') {
        regions = regions.map(r => ({ name: r, fee: 0, isActive: true }));
        db.ref('/regions').set(regions);
    }
    
    let regSelect = document.getElementById("regRegion");
    if(regSelect) {
        let defOpt = currentLang === 'ar' ? '-- اختر المنطقة --' : '-- Select Region --';
        regSelect.innerHTML = `<option value="">${defOpt}</option>`;
        regions.forEach(reg => {
            let isActive = reg.isActive !== false;
            if (isActive) regSelect.innerHTML += `<option value="${reg.name}">${reg.name}</option>`;
        });
    }

    let newAddrRegSelect = document.getElementById("newAddressRegion");
    if(newAddrRegSelect) {
        let defOpt2 = currentLang === 'ar' ? '-- اختر المنطقة --' : '-- Select Region --';
        newAddrRegSelect.innerHTML = `<option value="">${defOpt2}</option>`;
        regions.forEach(reg => {
            let isActive = reg.isActive !== false;
            if (isActive) newAddrRegSelect.innerHTML += `<option value="${reg.name}">${reg.name}</option>`;
        });
    }

    let list = document.getElementById("adminRegionsList");
    if(list) {
        list.innerHTML = "";
        regions.forEach((reg, index) => {
            let feeTxt = reg.fee === 0 ? "مجاني" : `${reg.fee} ج.م`;
            list.innerHTML += `<span class="badge" style="font-size:14px; padding:8px 15px;">${reg.name} <span style="color:#f38c18;">(${feeTxt})</span> <span class="badge-remove" onclick="deleteAdminRegion(${index})">✖</span></span>`;
        });
    }
}

window.addAdminRegion = function() {
    let name = document.getElementById("newRegionName").value.trim();
    let feeInput = document.getElementById("newRegionFee") ? document.getElementById("newRegionFee").value : "0";
    let fee = feeInput === "" ? 0 : parseFloat(feeInput);
    
    if(!name) return alert("اكتب اسم المنطقة أولاً");
    let regions = JSON.parse(localStorage.getItem("eljory_regions")) || [];
    if(regions.find(r => r.name === name)) return alert("المنطقة موجودة مسبقاً");
    
    regions.push({name: name, fee: fee, isActive: true});
    db.ref('/regions').set(regions).then(() => {
        document.getElementById("newRegionName").value = "";
        if(document.getElementById("newRegionFee")) document.getElementById("newRegionFee").value = "";
    });
}

window.deleteAdminRegion = function(index) {
    if(!confirm("حذف هذه المنطقة؟")) return;
    let regions = JSON.parse(localStorage.getItem("eljory_regions")) || [];
    regions.splice(index, 1);
    db.ref('/regions').set(regions);
}

// === إعدادات الإدمن المربوطة بالسحابة ===
window.renderAdminCustomers = function() {
    let tbody = document.getElementById("adminCustomersBody");
    if(!tbody) return;
    tbody.innerHTML = "";

    let usersDB = JSON.parse(localStorage.getItem("eljory_users_db")) || [];
    let ordersDB = JSON.parse(localStorage.getItem("eljory_orders")) || [];

    usersDB.reverse().forEach((u, index) => {
        let actualIndex = usersDB.length - 1 - index;
        let userOrders = ordersDB.filter(o => o.customer && getShortPhone(o.customer.phone) === getShortPhone(u.phone));
        let totalOrders = userOrders.length;
        let deliveredOrders = userOrders.filter(o => o.status === "Delivered").length;
        let cancelledOrders = userOrders.filter(o => o.status === "Cancelled").length;
        let totalSpent = userOrders.filter(o => o.status === "Delivered").reduce((sum, order) => sum + order.total, 0);
        let primaryAddr = u.addresses && u.addresses.find(a => a.isPrimary) ? u.addresses.find(a => a.isPrimary).text : "غير محدد";
        let blockStatus = u.isBlocked ? `<span style="color:red; font-weight:bold;">محظور ❌</span>` : `<span style="color:green; font-weight:bold;">نشط ✅</span>`;
        let historyCount = u.pointsHistory ? u.pointsHistory.length : 0;

        tbody.innerHTML += `
            <tr style="${u.isBlocked ? 'background-color: #ffeaea;' : ''}">
                <td><strong>${u.id || 'قديم'}</strong></td>
                <td><strong>${u.name}</strong><br><small>📞 ${u.phone}</small><br><small style="color:gray;">✉️ ${u.email}</small></td>
                <td><small>${primaryAddr}</small></td>
                <td><small>${u.joinDate || 'غير مسجل'}</small></td>
                <td style="text-align:center;"><strong>${totalOrders}</strong></td>
                <td style="text-align:center;"><span style="color:green;" title="تم التوصيل">${deliveredOrders}</span> / <span style="color:red;" title="ملغي">${cancelledOrders}</span></td>
                <td style="color:#f38c18; font-weight:bold;">${totalSpent} ج.م</td>
                <td>${blockStatus}</td>
                <td>
                    <button class="btn" style="background:#17a2b8; margin-bottom:5px; padding: 5px 10px;" onclick="editCustomerFull(${actualIndex})">⚙️ تعديل</button>
                    <button class="btn" style="background:#f38c18; margin-bottom:5px; padding: 5px 10px;" onclick="viewCustomerPointsHistory(${actualIndex})">📜 السجل (${historyCount})</button>
                    <button class="btn btn-red" style="margin-bottom:5px; padding: 5px 10px;" onclick="deleteCustomerFull(${actualIndex})">🗑️ حذف</button>
                    <button class="btn ${u.isBlocked ? 'btn-green' : 'btn-red'}" style="padding: 5px 10px;" onclick="toggleBlockUser(${actualIndex})">${u.isBlocked ? 'فك الحظر' : 'حظر'}</button>
                </td>
            </tr>
        `;
    });
}

window.toggleBlockUser = function(index) {
    let usersDB = JSON.parse(localStorage.getItem("eljory_users_db")) || [];
    if(usersDB[index]) {
        let phoneKey = getShortPhone(usersDB[index].phone);
        db.ref('/users/' + phoneKey).update({isBlocked: !usersDB[index].isBlocked}).then(() => {
            let msg = !usersDB[index].isBlocked ? "تم حظر العميل بنجاح. لن يتمكن من تسجيل الدخول." : "تم فك الحظر عن العميل.";
            alert(msg);
        });
    }
}

window.exportCustomersCSV = function() {
    let usersDB = JSON.parse(localStorage.getItem("eljory_users_db")) || [];
    let ordersDB = JSON.parse(localStorage.getItem("eljory_orders")) || [];
    if(usersDB.length === 0) return alert("لا يوجد عملاء لتصديرهم");
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; 
    csvContent += "كود العميل,الاسم,التليفون,البريد الالكتروني,تاريخ التسجيل,العنوان الاساسي,اجمالي الطلبات,تم التوصيل,ملغي,اجمالي المدفوعات,حالة الحساب\n";

    usersDB.forEach(u => {
        let userOrders = ordersDB.filter(o => o.customer && getShortPhone(o.customer.phone) === getShortPhone(u.phone));
        let deliveredCount = userOrders.filter(o => o.status === "Delivered").length;
        let totalSpent = userOrders.filter(o => o.status === "Delivered").reduce((sum, order) => sum + order.total, 0);
        let primaryAddr = u.addresses && u.addresses.find(a => a.isPrimary) ? u.addresses.find(a => a.isPrimary).text.replace(/,/g, " - ") : "غير محدد"; 
        let row = [u.id || "N/A", u.name, u.phone, u.email, u.joinDate || "N/A", primaryAddr, userOrders.length, deliveredCount, userOrders.filter(o => o.status === "Cancelled").length, totalSpent, u.isBlocked ? "محظور" : "نشط"];
        csvContent += row.join(",") + "\n";
    });

    let encodedUri = encodeURI(csvContent);
    let link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", `ElJory_Customers_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

window.renderLoyaltyBanner = function() {
    let oldBanner = document.getElementById("loyaltyGlobalBanner");
    if(oldBanner) oldBanner.remove();

    let settings = JSON.parse(localStorage.getItem("eljory_loyalty_settings")) || { system: "global", spent: 10, earn: 1 };
    
    if(settings.system === "global") {
        let txt1 = currentLang === 'ar' ? 'تسوق الآن بـ' : 'Shop now for';
        let txt2 = currentLang === 'ar' ? 'ج.م واحصل على' : 'EGP and get';
        let txt3 = currentLang === 'ar' ? 'نقطة تضاف لمحفظتك! 🎁' : 'points added to your wallet! 🎁';
        
        let bannerText = `${txt1} ${settings.spent} ${txt2} ${settings.earn} ${txt3}`;
        let bannerHTML = `<div id="loyaltyGlobalBanner" style="background-color: #1d364a; color: #f38c18; text-align: center; padding: 10px; font-weight: bold; font-size: 16px; border-bottom: 3px solid #f38c18;">${bannerText}</div>`;
        document.body.insertAdjacentHTML('afterbegin', bannerHTML);
    }
}

window.loadAdminLoyalty = function() {
    let settings = JSON.parse(localStorage.getItem("eljory_loyalty_settings")) || { system: "global", spent: 10, earn: 1, expiry: "" };
    if(document.getElementById("loyaltySysGlobal")) {
        document.getElementById("loyaltySysGlobal").checked = settings.system === "global";
        document.getElementById("loyaltySysProduct").checked = settings.system === "product";
        document.getElementById("loyaltyGlobalSpent").value = settings.spent;
        document.getElementById("loyaltyGlobalEarn").value = settings.earn;
        document.getElementById("loyaltyExpiry").value = settings.expiry || "";
        toggleLoyaltyView(); renderLoyaltyProductsTable();
    }
}

window.toggleLoyaltyView = function() {
    let system = document.querySelector('input[name="loyaltySystem"]:checked').value;
    document.getElementById("loyaltyGlobalSettings").style.display = system === "global" ? "block" : "none";
    document.getElementById("loyaltyProductSettings").style.display = system === "product" ? "block" : "none";
    document.getElementById("labelSysGlobal").style.borderColor = system === "global" ? "#f38c18" : "transparent";
    document.getElementById("labelSysProduct").style.borderColor = system === "product" ? "#f38c18" : "transparent";
}

window.saveLoyaltySettings = function() {
    let system = document.querySelector('input[name="loyaltySystem"]:checked').value;
    let spent = document.getElementById("loyaltyGlobalSpent").value || 10;
    let earn = document.getElementById("loyaltyGlobalEarn").value || 1;
    let expiry = document.getElementById("loyaltyExpiry").value;
    let settings = { system: system, spent: parseFloat(spent), earn: parseFloat(earn), expiry: expiry };
    
    db.ref('/settings').set(settings).then(() => {
        alert("تم حفظ إعدادات نظام الولاء بنجاح!");
    });
}

window.renderLoyaltyProductsTable = function() {
    let tbody = document.getElementById("loyaltyProductsBody");
    if(!tbody) return;
    tbody.innerHTML = "";
    let products = JSON.parse(localStorage.getItem("eljory_products")) || [];
    products.forEach((p, index) => {
        let currentPts = p.points || 0;
        tbody.innerHTML += `
            <tr>
                <td><img src="${p.img}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;"></td>
                <td><strong>${p.titleAr}</strong></td>
                <td>${p.price} ج.م</td>
                <td><input type="number" id="pts_${p.id}" class="form-control" value="${currentPts}" style="width: 100%;"></td>
                <td><button class="btn btn-green" onclick="saveProductPoints('${p.id}')">حفظ</button></td>
            </tr>
        `;
    });
}

window.saveProductPoints = function(productId) {
    let newPts = parseFloat(document.getElementById(`pts_${productId}`).value) || 0;
    db.ref('/products/' + productId + '/points').set(newPts).then(() => {
        alert("تم حفظ النقاط للمنتج بنجاح!");
    });
}

window.renderCategoriesGrid = function() {
    const container = document.getElementById("dynamicCategoriesGrid");
    if(!container) return; 
    container.innerHTML = "";

    let cats = JSON.parse(localStorage.getItem("eljory_categories")) || [];
    cats.sort((a, b) => (parseInt(a.priority) || 0) - (parseInt(b.priority) || 0));
    let activeMainCats = cats.filter(c => !c.parentId && c.isActive !== false);

    if(activeMainCats.length === 0) {
        let emptyMsg = currentLang === 'ar' ? 'لا توجد أقسام متاحة حالياً.' : 'No categories available currently.';
        container.innerHTML = `<p style='text-align:center; width:100%; color:gray; font-size:18px;'>${emptyMsg}</p>`;
        return;
    }

    activeMainCats.forEach(cat => {
        let defaultDesc = cat.id === "screens" ? 
            (currentLang === 'ar' ? "حماية فائقة من الأكريليك التركي لجميع المقاسات" : "Premium Turkish Acrylic protection for all sizes") : 
            (currentLang === 'ar' ? "تصفح أحدث المنتجات في هذا القسم بأسعار تنافسية" : "Browse the latest products in this category at competitive prices");
        
        let catImg = cat.img ? cat.img : "https://via.placeholder.com/300x200";
        let catName = currentLang === 'ar' ? cat.nameAr : (cat.nameEn || cat.nameAr);
        let btnText = currentLang === 'ar' ? 'تصفح القسم' : 'Browse Category';

        container.innerHTML += `
            <div class="category-card">
                <img src="${catImg}" alt="${catName}">
                <h3>${catName}</h3>
                <p>${defaultDesc}</p>
                <a href="shop.html?cat=${cat.id}" class="btn-browse">${btnText}</a>
            </div>
        `;
    });
}

window.onload = () => {
    let langButton = document.getElementById("langBtn");
    
    if(langButton) {
        langButton.addEventListener("click", () => {
            currentLang = currentLang === 'ar' ? 'en' : 'ar';
            localStorage.setItem("eljory_lang", currentLang);
            applyTranslations(); 
        });
    }

    initData(); 
    applyTranslations(); 
    renderCart(); 
    renderLoyaltyBanner(); 

    if(document.getElementById("ordersTableBody")) renderOrders();
    if(document.getElementById("accountGreeting")) loadUserProfile();
    
    if(window.loadAdminRegions) loadAdminRegions(); 
    if(document.getElementById("adminCustomersBody")) renderAdminCustomers(); 
    if(document.getElementById("loyaltySysGlobal")) loadAdminLoyalty(); 
    if(typeof updateCartBadge === "function") updateCartBadge();
};

// دالة موحدة لفحص انتهاء صلاحية نقاط الولاء وتصفيرها في فايربيس عند الحاجة
window.checkAndResetLoyaltyExpiry = function(user, phoneKey) {
    let settings = JSON.parse(localStorage.getItem("eljory_loyalty_settings")) || {};
    if (!settings.expiry || !user) return user;

    let expiryDate = new Date(settings.expiry);
    let currentDate = new Date();
    expiryDate.setHours(0,0,0,0);
    currentDate.setHours(0,0,0,0);

    if (currentDate >= expiryDate && (user.points || 0) > 0) {
        let oldPoints = user.points;
        let history = user.pointsHistory || [];
        history.push({
            type: "deduct",
            amount: oldPoints,
            reason: currentLang === 'ar' ? "انتهت صلاحية النقاط الدورية للمتجر 🧹" : "Points expired",
            date: new Date().toLocaleDateString('en-GB')
        });
        user.points = 0;
        user.pointsHistory = history;
        db.ref('/users/' + phoneKey).update({ points: 0, pointsHistory: history });
    }
    return user;
}

window.doRegister = async function(event) {
    if (event) event.preventDefault();

    let name = document.getElementById("regName").value.trim();
    let phone = document.getElementById("regPhone").value.trim();
    let email = document.getElementById("regEmail").value.trim();
    let region = document.getElementById("regRegion").value;
    let address = document.getElementById("regAddress").value.trim();
    let password = document.getElementById("regPassword").value;

    let cleanPhone = window.getShortPhone(phone);
    if (!name || !cleanPhone || !password || !region || !address) {
        alert(currentLang === 'ar' ? "يرجى ملء جميع الحقول المطلوبة!" : "Please fill all required fields!");
        return;
    }

    db.ref('/users/' + cleanPhone).once('value').then(async (snapshot) => {
        if (snapshot.exists()) {
            alert(currentLang === 'ar' ? "هذا الرقم مسجل بالفعل! برجاء تسجيل الدخول." : "Phone already registered! Please login.");
            toggleAuth('login');
        } else {
            let salt = window.generateSalt();
            let passwordHash = await window.hashPassword(password, salt);

            let newUser = {
                name: name,
                phone: cleanPhone,
                email: email,
                passwordHash: passwordHash,
                passwordSalt: salt,
                region: region,
                address: address + " - " + region,
                addresses: [{ id: Date.now(), text: address + " - " + region, isPrimary: true }],
                points: 0,
                joinDate: new Date().toLocaleDateString('en-GB'),
                isBlocked: false
            };

            db.ref('/users/' + cleanPhone).set(newUser).then(() => {
                alert(currentLang === 'ar' ? "تم إنشاء الحساب بنجاح! 🚀" : "Account created successfully! 🚀");
                localStorage.setItem("eljory_auth", "true");
                localStorage.setItem("eljory_active_phone", cleanPhone);
                localStorage.setItem("eljory_active_user", JSON.stringify(newUser));
                window.location.href = "account.html";
            }).catch((error) => {
                console.error("خطأ في التسجيل: ", error);
            });
        }
    });
};
