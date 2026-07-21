// ================================================================
// js/admin-dashboard.js
// التنقل بين التابات (switchTab) + المصادقة والتهيئة (Login/Auth) + محرك المزامنة الحي مع Firebase + محرر المدونة + فترات انتهاء صلاحية النقاط. لازم يتحمّل آخر واحد بعد كل الملفات التانية.
// ملحوظة: كل الدوال هنا لسه بتتسجل على window (زي الأول تمامًا) — الفصل ده
// تنظيمي بس، ومحتاج كل الملفات تتحمّل مع بعض في admin.html بالترتيب المحدد
// (utils الأول، dashboard آخر واحد).
// ================================================================

// ② التنقل والقوائم الجانبية (Navigation)
// ================================================================

// ⭐ إصلاح: toggleSubmenu كانت بتفتح/تقفل القائمة الفرعية بس، من غير ما تلمس
// شكل السهم في زرار القسم الرئيسي (has-submenu). دلوقتي بنضيف/نشيل كلاس "open"
// على الزرار نفسه كمان عشان الـ CSS (في admin.html) يقدر يلف السهم صح:
// لمين وهو مقفول، وتحت لما يتفتح.
window.toggleSubmenu = function(menuId) {
    let submenu = document.getElementById(menuId);
    if (!submenu) return;
    submenu.classList.toggle("open");
    let btn = document.querySelector(`button[onclick="toggleSubmenu('${menuId}')"]`);
    if (btn) btn.classList.toggle("open", submenu.classList.contains("open"));
};

window.switchTab = function(tabId) {
    // ⭐ نظام الصلاحيات: قبل أي تنقل لأي تاب، نتأكد إن الأدمن الحالي عنده صلاحية
    // مشاهدة على الأقل للقسم المرتبط بيه (لو النظام مفعّل أصلاً ومحمّل بيانات).
    if (typeof window.hasPerm === 'function' && !window.hasPerm(window.getPermKeyForTab(tabId), 'view')) {
        alert('⚠️ ليس لديك صلاحية للوصول لهذا القسم.');
        return;
    }
    if (tabId === 'foundations' && !(window.currentAdminCanManage === true)) {
        alert('⚠️ هذا القسم متاح فقط لمن لديه صلاحية إدارة الفريق.');
        return;
    }
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));
    let targetSection = document.getElementById(tabId);
    if(!targetSection) { tabId = 'orders'; targetSection = document.getElementById(tabId); }
    targetSection.classList.add('active');
    let btn = document.querySelector(`button[onclick="switchTab('${tabId}')"]`);
    if(btn) {
        btn.classList.add('active');
        let parentMenu = btn.closest('.submenu');
        if (parentMenu) {
            parentMenu.classList.add('open');
            // ⭐ إصلاح: نضيف "active" و"open" على زرار القسم الرئيسي (اللي فيه
            // السهم ▼) نفسه كمان، مش بس على القائمة الفرعية والزرار الفرعي
            // المختار. من غيرها كان التلوين البرتقالي بيوصل للزرار الفرعي بس،
            // والقسم الرئيسي (زي "العملاء والمناطق") كان فاضل من غير تلوين
            // حتى لو إنت واقف في تاب جواه فعلاً.
            let parentBtn = parentMenu.previousElementSibling;
            if (parentBtn && parentBtn.classList.contains('has-submenu')) {
                parentBtn.classList.add('active');
                parentBtn.classList.add('open');
            }
        }
    }
    localStorage.setItem("admin_active_tab", tabId);

    if (tabId === 'warranties' && typeof wtySwitchAdminTab === 'function') {
        let lastSub = localStorage.getItem("admin_wty_active_subtab") || "log";
        wtySwitchAdminTab(lastSub);
    }

    // ⭐ نظام الخزنة: تهيئة أول ما التاب المعني يتفتح
    if (tabId === 'acc-expenses') {
        window.populateTreasuryAccountSelects();
        let box = document.getElementById("expAllocationsBox");
        let dateEl = document.getElementById("expDate");
        if (dateEl && !dateEl.value) dateEl.value = new Date().toISOString().slice(0,10);
        if (box && !box.children.length && typeof expAddAllocationRow === 'function') expAddAllocationRow();
        if (typeof renderExpenses === 'function') renderExpenses();
    }
    if (tabId === 'acc-treasury-accounts' && typeof renderAdminTreasuryAccounts === 'function') renderAdminTreasuryAccounts();
    if (tabId === 'acc-treasury-transactions') {
        window.populateTreasuryAccountSelects();
        if (typeof renderTreasuryTransactions === 'function') renderTreasuryTransactions();
    }
    if (tabId === 'acc-overview' && typeof renderTreasuryOverview === 'function') renderTreasuryOverview();
    if (tabId === 'acc-stock-movements' && typeof renderStockMovements === 'function') renderStockMovements();
    if (tabId === 'acc-reports' && typeof initReportsTab === 'function') initReportsTab();
    if (tabId === 'foundations' && typeof renderFoundations === 'function') { populateFoundationSelects(); renderFoundations(); }
    if (tabId === 'team' && typeof loadAdminsList === 'function') { populateFoundationSelects(); loadAdminsList(); }

    // ⭐ نظام الصلاحيات: لو صلاحية الأدمن على هذا القسم "مشاهدة فقط"، نعطّل كل
    // أزرار/حقول الإدخال جوه السكشن (عدا التنقل والفلاتر) بعد ما المحتوى يترندر.
    setTimeout(function() {
        if (typeof window.enforceSectionLock === 'function') window.enforceSectionLock(tabId);
    }, 60);
};


// ================================================================
// ⑯ المصادقة والتهيئة (Auth & Initialization)
// ================================================================

window.doAdminLogin = function() {
    let email  = document.getElementById("adminLoginEmail").value.trim();
    let pass   = document.getElementById("adminLoginPass").value;
    let errBox = document.getElementById("adminLoginError");
    let btn    = document.getElementById("adminLoginSubmitBtn");
    errBox.style.display = "none";
    btn.disabled  = true;
    btn.innerText = "جاري الدخول... ⏳";
    firebase.auth().signInWithEmailAndPassword(email, pass)
        .catch(() => {
            errBox.innerText     = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
            errBox.style.display = "block";
            btn.disabled  = false;
            btn.innerText = "دخول";
        });
};

window.applyTranslations = function() { return false; };
document.documentElement.setAttribute("dir",  "rtl");
document.documentElement.setAttribute("lang", "ar");

document.addEventListener("DOMContentLoaded", () => {
    let activeTab = localStorage.getItem("admin_active_tab") || "orders";
    switchTab(activeTab);
});

// زر الخروج
let logoutBtn = document.getElementById("adminLogoutBtn");
if(logoutBtn) {
    logoutBtn.addEventListener("click", function(e) {
        e.preventDefault();
        let btn = this;
        btn.innerText = "جاري الخروج... ⏳";
        firebase.auth().signOut().catch(error => {
            alert("عطل في الخروج: " + error.message);
            btn.innerText = "تسجيل خروج 🚪";
        });
    });
}

// مراقب حالة الدخول
firebase.auth().onAuthStateChanged(function(user) {
    let loginScreen  = document.getElementById("adminLoginModal");
    let sidebar      = document.getElementById("adminSidebarPanel");
    let mainPanel    = document.getElementById("adminMainPanel");
    let loadingScreen= document.getElementById("adminLoadingScreen");

    // ⚠️ اليوزر المجهول (Anonymous) مش أدمن، وقراءة /admins ليه هترفض دايمًا
    // من قواعد الأمان. فبنعامله زي إنه مفيش يوزر مسجل خالص، ونعرض شاشة تسجيل
    // الدخول العادية بدل ما الكود يقف على خطأ permission_denied.
    if (user && !user.isAnonymous) {
        db.ref('/admins/' + user.uid).once('value').then(function(snap) {
            if (snap.val() !== true) {
                if(loadingScreen) loadingScreen.style.display = "none";
                firebase.auth().signOut();
                if(loginScreen) loginScreen.style.display = "flex";
                if(sidebar)     sidebar.style.display     = "none";
                if(mainPanel)   mainPanel.style.display   = "none";
                document.getElementById("adminLoginError").innerText     = "ليس لديك صلاحية الدخول.";
                document.getElementById("adminLoginError").style.display = "block";
                return;
            }
            // ⭐ نظام الصلاحيات: نتأكد إن الحساب مش موقوف ونحمّل فئته وصلاحياته
            // قبل ما نعرض أي حاجة من اللوحة، ونتأكد كمان من وجود فئة "سوبر أدمن"
            // الافتراضية عشان لو دي أول مرة يتفعل فيها النظام.
            return window.ensureSuperAdminFoundation().then(function() {
                return window.loadCurrentAdminPermissions(user.uid);
            }).then(function() {
                if(loadingScreen) loadingScreen.style.display = "none";
                if(loginScreen) loginScreen.style.display = "none";
                if(sidebar)     sidebar.style.display     = "flex";
                if(mainPanel)   mainPanel.style.display   = "block";
                if(typeof loadAdminsList === "function") loadAdminsList();
                // ⚠️ إصلاح: مزامنة الروت (كل بيانات المتجر شامل /users و /orders)
                // كانت بتشتغل تلقائي لحظة تحميل admin.js، يعني أي حد يفتح admin.html
                // في المتصفح كان بينزّل نسخة كاملة من الداتابيز حتى لو مسجلش دخول
                // أصلاً (الفورم بس هو اللي كان مخفي، البيانات كانت اتسحبت فعلاً).
                // دلوقتي المزامنة بتشتغل بس بعد ما نتأكد إن المستخدم أدمن معتمد.
                if(typeof window.startAdminSync === "function") window.startAdminSync();
                setTimeout(function() {
                    if (typeof window.applyPermissionsToSidebar === "function") window.applyPermissionsToSidebar();
                    // ⭐ إصلاح: وقت التحميل الأول (Refresh)، تاب البداية بيتفتح عن طريق
                    // switchTab() في DOMContentLoaded قبل ما صلاحيات الأدمن تخلص تحميل
                    // من فايربيس (لأنها async). فكان enforceSectionLock بيتنفذ ساعتها
                    // على currentAdminPermissions = null (معاملة مؤقتة كسوبر أدمن)
                    // فمايقفلش حاجة، وبعدين محدش بينادي عليه تاني بعد ما الصلاحيات
                    // الحقيقية توصل. دلوقتي بنعيد تطبيق القفل على التاب الحالي فعلياً
                    // هنا كمان، بعد ما الصلاحيات الحقيقية بقت متاحة.
                    if (typeof window.enforceSectionLock === "function") {
                        let curTab = localStorage.getItem("admin_active_tab") || "orders";
                        window.enforceSectionLock(curTab);
                    }
                }, 300);
            }).catch(function(err) {
                if(loadingScreen) loadingScreen.style.display = "none";
                firebase.auth().signOut();
                if(loginScreen) loginScreen.style.display = "flex";
                if(sidebar)     sidebar.style.display     = "none";
                if(mainPanel)   mainPanel.style.display   = "none";
                let msg = (err && err.message === 'ACCOUNT_DISABLED')
                    ? "تم إيقاف هذا الحساب من قبل الإدارة."
                    : "تعذر تحميل صلاحياتك، حاول تسجيل الدخول مرة أخرى.";
                document.getElementById("adminLoginError").innerText     = msg;
                document.getElementById("adminLoginError").style.display = "block";
            });
        }).catch(function(err) {
            console.warn("تعذر التحقق من صلاحيات الأدمن:", err.message);
            if(loadingScreen) loadingScreen.style.display = "none";
            if(loginScreen)   loginScreen.style.display   = "flex";
            if(sidebar)       sidebar.style.display       = "none";
            if(mainPanel)     mainPanel.style.display     = "none";
        });
    } else {
        if(loadingScreen) loadingScreen.style.display = "none";
        if(loginScreen)   loginScreen.style.display   = "flex";
        if(sidebar)       sidebar.style.display        = "none";
        if(mainPanel)     mainPanel.style.display      = "none";
    }
});


// ================================================================
// ⑰ محرك المزامنة الذكي + محرر المدونة + فترات انتهاء النقاط (IIFE)
// ================================================================

(function() {
    console.log("🚀 جاري تشغيل محرك المزامنة الذكي للوحة التحكم...");

    // ─── محرك المزامنة ─────────────────────────────────────────

    const originalSetItem = localStorage.setItem;

    // اعتراض أوامر الحفظ القديمة للمزامنة مع Firebase
    localStorage.setItem = function(key, value) {
        originalSetItem.apply(this, arguments);
        try {
            if (!window.db) return;
            let parsed = JSON.parse(value);
            let obj    = {};
            switch(key) {
                case "eljory_products":      parsed.forEach(p => { if(p&&p.id)    obj[p.id]    = p; }); window.db.ref('/products').set(obj); break;
                case "eljory_categories":    parsed.forEach(c => { if(c&&c.id)    obj[c.id]    = c; }); window.db.ref('/categories').set(obj); break;
                case "eljory_orders":        parsed.forEach(o => { if(o&&o.id)    obj[o.id]    = o; }); window.db.ref('/orders').set(obj); break;
                case "eljory_users_db":      parsed.forEach(u => { if(u&&u.phone) obj[window.getShortPhone(u.phone)] = u; }); window.db.ref('/users').set(obj); break;
                case "eljory_regions":       window.db.ref('/regions').set(parsed); break;
                case "eljory_banners":       window.db.ref('/banners').set(parsed); break;
                case "eljory_promos":        window.db.ref('/promos').set(parsed); break;
                case "eljory_rewards":       window.db.ref('/rewards').set(parsed); break;
                case "eljory_gallery":       window.db.ref('/gallery').set(parsed); break;
                case "eljory_loyalty_settings": window.db.ref('/settings').set(parsed); break;
            }
        } catch(e) {}
    };

    // التحميل الفوري من الذاكرة عند فتح الصفحة
    setTimeout(() => {
        if(typeof loadAdminOrders        === "function") loadAdminOrders();
        if(typeof renderAdminProducts    === "function") renderAdminProducts();
        if(typeof renderAdminCustomers   === "function") renderAdminCustomers();
        if(typeof loadAdminCategories    === "function") loadAdminCategories();
        if(typeof loadAdminRegions       === "function") loadAdminRegions();
        if(typeof renderAdminPromos      === "function") renderAdminPromos();
        if(typeof renderAdminRewards     === "function") renderAdminRewards();
        if(typeof renderAdminBanners     === "function") renderAdminBanners();
        if(typeof renderGlobalPoints     === "function") renderGlobalPoints();
        if(typeof renderGalleryGrid      === "function") renderGalleryGrid();
        if(typeof loadAdminLoyalty       === "function") loadAdminLoyalty();
        if(typeof renderAdminSections    === "function") renderAdminSections();
        if(typeof renderAdminCustomLists === "function") renderAdminCustomLists();
        if(typeof loadWarrantySettings   === "function") loadWarrantySettings();
        if(typeof renderAdminWarranties  === "function") renderAdminWarranties();
        if(typeof loadWarrantyPageEditor === "function") loadWarrantyPageEditor();
        if(typeof renderAdminPriceHistory === "function") renderAdminPriceHistory();
        if(typeof renderAdminTreasuryAccounts === "function") renderAdminTreasuryAccounts();
        if(typeof renderTreasuryTransactions  === "function") renderTreasuryTransactions();
        if(typeof renderExpenses              === "function") renderExpenses();
        if(typeof renderTreasuryOverview      === "function") renderTreasuryOverview();
        if(typeof renderStockMovements        === "function") renderStockMovements();
        if(typeof populateTreasuryAccountSelects === "function") populateTreasuryAccountSelects();
        if(typeof renderFoundations           === "function") renderFoundations();
        if(typeof populateFoundationSelects   === "function") populateFoundationSelects();
        if(typeof window.enforceSectionLock   === "function") {
            window.enforceSectionLock(localStorage.getItem("admin_active_tab") || "orders");
        }
    }, 50);

    // الاستماع الحي للسحابة (real-time sync)
    let _adminSyncStarted = false;
    let startSync = function() {
        if (!window.db) { setTimeout(startSync, 200); return; }
        if (_adminSyncStarted) return; // منعاً للاشتراك المتكرر لو onAuthStateChanged نادى تاني
        _adminSyncStarted = true;

        let safeSet   = (key, val) => originalSetItem.call(localStorage, key, JSON.stringify(val));
        let fbToArray = (obj) => obj ? (Array.isArray(obj) ? obj.filter(x=>x) : Object.values(obj).filter(x=>x)) : [];

        // تحديث الواجهة في الخلفية (نفس القائمة القديمة، بس بقت دالة نقدر ننادي عليها من أي مسار)
        let renderEverything = function() {
            if(typeof loadAdminOrders        === "function") loadAdminOrders();
            if(typeof renderAdminProducts    === "function") renderAdminProducts();
            if(typeof renderAdminCustomers   === "function") renderAdminCustomers();
            if(typeof loadAdminCategories    === "function") loadAdminCategories();
            if(typeof loadAdminRegions       === "function") loadAdminRegions();
            if(typeof renderAdminPromos      === "function") renderAdminPromos();
            if(typeof renderAdminRewards     === "function") renderAdminRewards();
            if(typeof renderAdminBanners     === "function") renderAdminBanners();
            if(typeof renderGlobalPoints     === "function") renderGlobalPoints();
            if(typeof renderGalleryGrid      === "function") renderGalleryGrid();
            if(typeof loadAdminLoyalty       === "function") loadAdminLoyalty();
            if(typeof renderAdminSections    === "function") renderAdminSections();
            if(typeof renderAdminCustomLists === "function") renderAdminCustomLists();
            if(typeof loadWarrantySettings   === "function") loadWarrantySettings();
            if(typeof renderAdminWarranties  === "function") renderAdminWarranties();
            if(typeof loadWarrantyPageEditor === "function") loadWarrantyPageEditor();
            if(typeof renderAdminPriceHistory === "function") renderAdminPriceHistory();
            if(typeof renderAdminTreasuryAccounts === "function") renderAdminTreasuryAccounts();
            if(typeof renderTreasuryTransactions  === "function") renderTreasuryTransactions();
            if(typeof renderExpenses              === "function") renderExpenses();
            if(typeof renderTreasuryOverview      === "function") renderTreasuryOverview();
            if(typeof renderStockMovements        === "function") renderStockMovements();
            if(typeof populateTreasuryAccountSelects === "function") populateTreasuryAccountSelects();
            if(typeof renderReportsAll === "function" && window._reportsInited) renderReportsAll();
            if(typeof renderFoundations           === "function") renderFoundations();
            if(typeof populateFoundationSelects   === "function") populateFoundationSelects();
            if(typeof applyPermissionsToSidebar    === "function") applyPermissionsToSidebar();
            // ⭐ إصلاح: renderEverything بتتنفذ من جديد مع أي تحديث حي من فايربيس
            // (منتج اتغير، طلب جديد...)، وكل مرة بتعيد بناء الجداول بأزرار جديدة
            // "مفتوحة" افتراضياً. من غير السطر ده، أي قفل "مشاهدة فقط" كنا نطبّقه
            // قبل كده كان بيتلغى تلقائياً أول ما يوصل أي تحديث بيانات بعد كده.
            // فبنعيد تطبيق القفل على التاب الحالي بعد كل عملية رندر.
            if(typeof window.enforceSectionLock === "function") {
                window.enforceSectionLock(localStorage.getItem("admin_active_tab") || "orders");
            }
        };

        // ⚠️ إصلاح: كنا بنقرأ الجذر (root) كله دفعة واحدة عبر db.ref('/').on('value')،
        // لكن قواعد الأمان عندنا ".read": false على الجذر، وقواعد Realtime Database
        // مبتعملش "قراءة جزئية" — لو القراءة مرفوضة عند المسار المطلوب بالظبط، العملية
        // كلها بترفض حتى لو فيه مسارات فرعية جواها مسموح بيها فعلياً (زي /products
        // و /users نفسها). فكانت كل بيانات اللوحة (منتجات، عملاء، أقسام...) بتفشل
        // بصمت من غير أي رسالة خطأ واضحة. الحل: بنعمل استماع منفصل لكل مسار على
        // حدة، بالظبط زي ما store-core.js بيعمل مع المسارات العامة.
        window.db.ref('/products').on('value', snap => { safeSet("eljory_products", fbToArray(snap.val())); renderEverything(); });
        window.db.ref('/categories').on('value', snap => { safeSet("eljory_categories", fbToArray(snap.val())); renderEverything(); });
        window.db.ref('/orders').on('value', snap => { safeSet("eljory_orders", fbToArray(snap.val())); renderEverything(); });
        window.db.ref('/users').on('value', snap => { safeSet("eljory_users_db", fbToArray(snap.val())); renderEverything(); }, err => console.warn('⚠️ تعذرت قراءة /users:', err.message));
        window.db.ref('/regions').on('value', snap => { safeSet("eljory_regions", fbToArray(snap.val())); renderEverything(); });
        window.db.ref('/banners').on('value', snap => { safeSet("eljory_banners", fbToArray(snap.val())); renderEverything(); });
        window.db.ref('/promos').on('value', snap => { safeSet("eljory_promos", fbToArray(snap.val())); renderEverything(); });
        window.db.ref('/rewards').on('value', snap => { safeSet("eljory_rewards", fbToArray(snap.val())); renderEverything(); });
        window.db.ref('/gallery').on('value', snap => { safeSet("eljory_gallery", fbToArray(snap.val())); renderEverything(); });
        window.db.ref('/customLists').on('value', snap => { safeSet("eljory_custom_lists", fbToArray(snap.val())); renderEverything(); });
        window.db.ref('/sections').on('value', snap => { safeSet("eljory_sections", fbToArray(snap.val())); renderEverything(); });
        window.db.ref('/settings').on('value', snap => { safeSet("eljory_loyalty_settings", snap.val() || { system:"global", spent:10, earn:1 }); renderEverything(); });
        window.db.ref('/warrantyPageContent').on('value', snap => { safeSet("eljory_warranty_content", snap.val() || null); renderEverything(); });
        window.db.ref('/warrantyActivationPageContent').on('value', snap => { safeSet("eljory_warranty_activation_content", snap.val() || null); });
        // ⭐ سجل تغييرات الأسعار — بيتقرأ فقط (مفيش كتابة عن طريق localStorage
        // intercept هنا، الكتابة بتتم مباشرة عبر db.ref('/priceHistory').push())
        window.db.ref('/priceHistory').on('value', snap => { safeSet("eljory_price_history", fbToArray(snap.val())); renderEverything(); });
        // ⭐ نظام الخزنة: نفس أسلوب باقي المسارات — استماع منفصل لكل مسار
        window.db.ref('/treasuryAccounts').on('value', snap => { safeSet("eljory_treasury_accounts", fbToArray(snap.val())); renderEverything(); });
        window.db.ref('/treasuryTransactions').on('value', snap => { safeSet("eljory_treasury_transactions", fbToArray(snap.val())); renderEverything(); });
        window.db.ref('/expenses').on('value', snap => { safeSet("eljory_expenses", fbToArray(snap.val())); renderEverything(); });
        window.db.ref('/stockMovements').on('value', snap => { safeSet("eljory_stock_movements", fbToArray(snap.val())); renderEverything(); });
        // ⭐ نظام الصلاحيات: مزامنة الفئات (الأسس) حية، ولو حصل تغيير في فئة الأدمن
        // الحالي نفسه (أو الفئة اتحذفت)، نعيد تحميل صلاحياته فوراً بدون ما يحتاج
        // يعمل خروج ودخول تاني.
        window.db.ref('/permissionFoundations').on('value', snap => {
            safeSet("eljory_permission_foundations", fbToArray(snap.val()));
            renderEverything();
            let curUser = firebase.auth().currentUser;
            if (curUser && !curUser.isAnonymous && typeof window.loadCurrentAdminPermissions === "function") {
                window.loadCurrentAdminPermissions(curUser.uid).then(function() {
                    if (typeof applyPermissionsToSidebar === "function") applyPermissionsToSidebar();
                }).catch(function() {});
            }
        });
    };
     // ⚠️ إصلاح: مبقاش بننادي startSync() هنا تلقائي (ده كان بيسحب كل قاعدة
    // البيانات لأي حد يفتح admin.html حتى قبل تسجيل الدخول). دلوقتي بنعرضها
    // عالمياً بس، وبتتنادى من onAuthStateChanged بعد التأكد إن المستخدم أدمن.
    window.startAdminSync = startSync;

    // ─── محرر المدونة ──────────────────────────────────────────

    let adminBlogCurrentProductId = null;
    let adminBlogSavedRange       = null;
    // ⭐ معرّف المحرر اللي هيستقبل الصورة/الفيديو/الرابط اللي هيتم إدراجه من
    // المودالز المشتركة (adminModalImg/Video/Link). كل استدعاء لـ
    // openAdminBlogModal بيحدد المحرر المستهدف، بحيث نفس المودالز تقدر تخدم
    // محرر مدونة المنتج، ومحرر صفحة "ضماناتي"، ومحرر صفحة تفعيل الضمان، من
    // غير أي تكرار في الكود.
    window._richTargetEditorId = 'adminBlogEditor';

    window.switchProductTab = function(tab) {
        let tabBasic  = document.getElementById('tabBasic');
        let tabBlog   = document.getElementById('tabBlog');
        let btnBasic  = document.getElementById('tabBtnBasic');
        let btnBlog   = document.getElementById('tabBtnBlog');
        if (tab === 'basic') {
            tabBasic.style.display = 'flex';  tabBlog.style.display  = 'none';
            btnBasic.style.background = '#1d364a'; btnBasic.style.color = 'white';
            btnBlog.style.background  = '#eef2f5'; btnBlog.style.color  = '#1d364a';
        } else {
            tabBasic.style.display = 'none';  tabBlog.style.display  = 'block';
            btnBasic.style.background = '#eef2f5'; btnBasic.style.color = '#1d364a';
            btnBlog.style.background  = '#1d364a'; btnBlog.style.color  = 'white';
            let prodId = document.getElementById('newProdId').value.trim();
            if (prodId) {
                adminBlogCurrentProductId = prodId;
                document.getElementById('blogProdIdLabel').innerText = 'المنتج: ' + prodId;
                loadAdminBlogContent(prodId);
            } else {
                document.getElementById('blogProdIdLabel').innerText = 'لم يتم اختيار منتج بعد';
            }
        }
    };

    function loadAdminBlogContent(productId) {
        let editor = document.getElementById('adminBlogEditor');
        db.ref('/productBlogs/' + productId).once('value', function(snap) {
            let content = snap.val();
            editor.innerHTML = content
                ? content
                : '<p style="color:#aaa;">لا يوجد محتوى محفوظ لهذا المنتج. ابدأ الكتابة هنا...</p>';
        });
    }

    window.saveAdminBlogContent = function() {
        let prodId = document.getElementById('newProdId').value.trim();
        if (!prodId) return alert('يرجى تحديد كود المنتج أولاً!');
        let content = document.getElementById('adminBlogEditor').innerHTML;
        db.ref('/productBlogs/' + prodId).set(content)
            .then(() => alert('✅ تم حفظ محتوى الصفحة بنجاح!'))
            .catch(() => alert('❌ خطأ في الحفظ!'));
    };

    window.clearAdminBlogContent = function() {
        let prodId = document.getElementById('newProdId').value.trim();
        if (!confirm('هل أنت متأكد من مسح كل المحتوى؟')) return;
        document.getElementById('adminBlogEditor').innerHTML = '<p style="color:#aaa;">ابدأ الكتابة هنا...</p>';
        if (prodId) db.ref('/productBlogs/' + prodId).remove();
    };

    window.previewAdminBlog = function() {
        let prodId = document.getElementById('newProdId').value.trim();
        if (!prodId) return alert('يرجى تحديد كود المنتج أولاً!');
        window.open('product.html?id=' + prodId, '_blank');
    };

    window.blogExecCmd = function(cmd, val) {
        document.getElementById('adminBlogEditor').focus();
        document.execCommand(cmd, false, val || null);
    };

    window.blogInsertDivider = function() {
        document.getElementById('adminBlogEditor').focus();
        document.execCommand('insertHTML', false,
            '<hr style="border:none;border-top:2px solid #f38c18;margin:25px 0;">');
    };

    function saveAdminBlogRange() {
        let sel = window.getSelection();
        if (sel && sel.rangeCount > 0) adminBlogSavedRange = sel.getRangeAt(0).cloneRange();
    }

    function restoreAdminBlogRange() {
        let editorId = window._richTargetEditorId || 'adminBlogEditor';
        let editorEl  = document.getElementById(editorId);
        if (editorEl) editorEl.focus();
        if (adminBlogSavedRange) {
            let sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(adminBlogSavedRange);
        }
    }

    // ⭐ targetEditorId اختياري: لو مبعوتة، المودال هيدرج المحتوى في المحرر ده
    // بدل محرر مدونة المنتج الافتراضي (adminBlogEditor). بيُستخدم كده من محرري
    // صفحة "ضماناتي" وصفحة تفعيل الضمان.
    window.openAdminBlogModal = function(type, targetEditorId) {
        window._richTargetEditorId = targetEditorId || 'adminBlogEditor';
        saveAdminBlogRange();
        if (type === 'img')   document.getElementById('adminModalImg').style.display   = 'flex';
        if (type === 'video') document.getElementById('adminModalVideo').style.display = 'flex';
        if (type === 'link')  document.getElementById('adminModalLink').style.display  = 'flex';
    };

    window.closeAdminBlogModal = function(id) {
        document.getElementById(id).style.display = 'none';
    };

    window.adminInsertImage = function() {
        let url   = document.getElementById('adminImgUrl').value.trim();
        let align = document.getElementById('adminImgAlign').value;
        if (!url) return alert('يرجى إدخال رابط الصورة!');
        let style = '';
        if      (align === 'center') style = 'display:block;margin:15px auto;max-width:100%;border-radius:10px;';
        else if (align === 'right')  style = 'float:right;margin:0 0 10px 15px;max-width:50%;border-radius:10px;';
        else if (align === 'left')   style = 'float:left;margin:0 15px 10px 0;max-width:50%;border-radius:10px;';
        else                          style = 'display:block;width:100%;border-radius:10px;margin:15px 0;';
        restoreAdminBlogRange();
        document.execCommand('insertHTML', false, `<img src="${url}" style="${style}"><div style="clear:both;"></div>`);
        document.getElementById('adminImgUrl').value = '';
        closeAdminBlogModal('adminModalImg');
    };

    window.adminBlogHandleUpload = function(event) {
        let file = event.target.files[0];
        if (!file || !window.storage) return;
        let prodId = document.getElementById('newProdId').value.trim() || 'general';
        let ref    = storage.ref('productBlog/' + prodId + '_' + Date.now() + '.jpg');
        let btn    = document.querySelector('#adminModalImg .btn-insert-confirm');
        if (btn) { btn.innerText = '⏳ جاري الرفع...'; btn.disabled = true; }
        ref.put(file).then(snap => snap.ref.getDownloadURL()).then(url => {
            document.getElementById('adminImgUrl').value = url;
            if (btn) { btn.innerText = 'إدراج الصورة'; btn.disabled = false; }
        }).catch(() => {
            alert('❌ فشل الرفع!');
            if (btn) { btn.innerText = 'إدراج الصورة'; btn.disabled = false; }
        });
    };

    window.adminInsertVideo = function() {
        let url = document.getElementById('adminVideoUrl').value.trim();
        if (!url) return alert('يرجى إدخال رابط الفيديو!');
        let embedHtml = '';
        let ytMatch   = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
        if (ytMatch) {
            embedHtml = `<div style="position:relative;padding-bottom:56.25%;height:0;margin:20px 0;border-radius:10px;overflow:hidden;"><iframe src="https://www.youtube.com/embed/${ytMatch[1]}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allowfullscreen></iframe></div>`;
        } else if (url.includes('facebook.com')) {
            let encoded = encodeURIComponent(url);
            embedHtml = `<div style="position:relative;padding-bottom:56.25%;height:0;margin:20px 0;border-radius:10px;overflow:hidden;"><iframe src="https://www.facebook.com/plugins/video.php?href=${encoded}&show_text=0" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allowfullscreen></iframe></div>`;
        } else if (url.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) {
            embedHtml = `<video controls style="width:100%;max-width:720px;border-radius:10px;margin:15px 0;"><source src="${url}" type="video/mp4"></video>`;
        } else {
            embedHtml = `<div style="position:relative;padding-bottom:56.25%;height:0;margin:20px 0;border-radius:10px;overflow:hidden;"><iframe src="${url}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allowfullscreen></iframe></div>`;
        }
        restoreAdminBlogRange();
        document.execCommand('insertHTML', false, embedHtml);
        document.getElementById('adminVideoUrl').value = '';
        closeAdminBlogModal('adminModalVideo');
    };

    window.adminInsertLink = function() {
        let text = document.getElementById('adminLinkText').value.trim();
        let url  = document.getElementById('adminLinkUrl').value.trim();
        if (!url) return alert('يرجى إدخال الرابط!');
        if (!text) text = url;
        restoreAdminBlogRange();
        document.execCommand('insertHTML', false,
            `<a href="${url}" target="_blank" style="color:#f38c18;font-weight:bold;text-decoration:underline;">${text}</a>`);
        document.getElementById('adminLinkText').value = '';
        document.getElementById('adminLinkUrl').value  = '';
        closeAdminBlogModal('adminModalLink');
    };

    // تحديث معرف المدونة تلقائياً عند تعديل منتج
    let _origEditProduct = window.editProduct;
    window.editProduct = function(id) {
        if (_origEditProduct) _origEditProduct(id);
        adminBlogCurrentProductId = id;
        document.getElementById('blogProdIdLabel').innerText = 'المنتج: ' + id;
    };

    // ─── فترات انتهاء صلاحية النقاط ──────────────────────────

    // ملء قائمة الأيام
    (function() {
        let dayEl = document.getElementById("periodExpireDay");
        if (dayEl) {
            for (let d = 1; d <= 31; d++) {
                dayEl.innerHTML += `<option value="${d}">${d}</option>`;
            }
        }
    })();

    let expiryPeriods = [];

    const monthNames = {
        1:"يناير", 2:"فبراير", 3:"مارس",    4:"أبريل",
        5:"مايو",  6:"يونيو",  7:"يوليو",   8:"أغسطس",
        9:"سبتمبر",10:"أكتوبر",11:"نوفمبر", 12:"ديسمبر"
    };

    window.addExpiryPeriod = function() {
        let from = parseInt(document.getElementById("periodEarnFrom").value);
        let to   = parseInt(document.getElementById("periodEarnTo").value);
        let expM = parseInt(document.getElementById("periodExpireMonth").value);
        let expD = parseInt(document.getElementById("periodExpireDay").value);
        if (from > to) return alert("شهر البداية لازم يكون قبل شهر النهاية!");
        let key = `${from}-${to}-${expM}-${expD}`;
        if (expiryPeriods.find(p => p.key === key)) return alert("الفترة دي موجودة!");
        expiryPeriods.push({ key, earnFrom:from, earnTo:to, expireMonth:expM, expireDay:expD });
        renderExpiryPeriods();
    };

    window.removeExpiryPeriod = function(key) {
        expiryPeriods = expiryPeriods.filter(p => p.key !== key);
        renderExpiryPeriods();
    };

    window.renderExpiryPeriods = function() {
        let container = document.getElementById("expiryPeriodsList");
        if (!container) return;
        if (!expiryPeriods.length) {
            container.innerHTML = '<p style="color:gray;font-size:13px;">لا توجد فترات محددة</p>';
            return;
        }
        container.innerHTML = expiryPeriods.map(p => `
            <span style="display:inline-flex;align-items:center;gap:8px;background:#1d364a;color:white;padding:7px 14px;border-radius:20px;margin:4px;font-size:13px;">
                🗓️ من <strong>${monthNames[p.earnFrom]}</strong> لـ <strong>${monthNames[p.earnTo]}</strong>
                ← تنتهي <strong>${p.expireDay} ${monthNames[p.expireMonth]}</strong>
                <span onclick="removeExpiryPeriod('${p.key}')"
                      style="cursor:pointer;color:#f38c18;font-weight:bold;font-size:15px;">✖</span>
            </span>`).join("");
    };

})();


// ================================================================
