// ============================================================================
// النواة الأساسية لمتجر الجوري (El Jory Store Core) — store-core.js
// مسؤول عن جلب بيانات المتجر العامة فقط من Firebase (منتجات/أقسام/عروض...)
// ⚠️ إصلاح أمني: النسخة القديمة كانت بتعمل db.ref('/').on('value', ...) وده
// معناه إنها بتستمع على قاعدة البيانات كلها (الروت) من كل صفحة عامة في الموقع،
// شامل /users (بيانات كل العملاء وباسوورداتهم المشفرة) و /orders (كل الطلبات
// بأسماء وتليفونات وعناوين كل العملاء) - وده بينزل نسخة كاملة من الداتابيز
// لمتصفح أي زائر عادي. دلوقتي كل مسار بيانات عامة بيتسحب لوحده بس.
// ============================================================================

window.DB_PATH = '/';

function initStoreData() {
    // دالة مساعدة: تحول أي Object أو Array من Firebase لمصفوفة نظيفة
    const fbToArray = (obj) =>
        obj ? (Array.isArray(obj) ? obj.filter(x => x) : Object.values(obj).filter(x => x)) : [];

    const safeStore = (key, val) => {
        try { localStorage.setItem(key, JSON.stringify(val)); }
        catch (e) { console.warn('localStorage full?', key, e); }
    };

    // كاش محلي بسيط لبناء قائمة الأقسام (Mega Menu) فور توفر بيانات الأقسام
    let latestCategories = [];

    // ── تحديث الواجهة: بننادي عليها بعد أي تحديث في أي مسار من المسارات العامة ──
    function renderAll() {
        if (typeof renderCategoriesGrid === 'function') renderCategoriesGrid();
        if (typeof renderStoreProducts  === 'function') renderStoreProducts();
        if (typeof renderDynamicNavbar  === 'function') renderDynamicNavbar();

        if (typeof joryRenderNavCategories === 'function') {
            var allCats = latestCategories.filter(function(c) { return c && c.isActive !== false; });

            // الأقسام الرئيسية — اللي مفيهاش parentId
            var mainCats = allCats
                .filter(function(c) { return !c.parentId; })
                .sort(function(a, b) { return (a.priority || 0) - (b.priority || 0); });

            // الأقسام الفرعية — اللي عندها parentId
            var subCats = allCats.filter(function(c) { return c.parentId; });

            var navCats = mainCats.map(function(cat) {
                var subs = subCats
                    .filter(function(s) { return String(s.parentId) === String(cat.id); })
                    .map(function(s) {
                        return { name: s.nameAr, link: 'shop.html?cat=' + cat.id + '&sub=' + s.id };
                    });

                return {
                    id:   cat.id,
                    name: cat.nameAr,
                    link: 'shop.html?cat=' + cat.id,
                    subs: subs
                };
            });

            joryRenderNavCategories(navCats);
        }

        if (typeof renderLoyaltyBanner      === 'function') renderLoyaltyBanner();
        if (typeof renderBanners            === 'function') renderBanners();
        if (typeof renderStorefrontSections === 'function') renderStorefrontSections();
    }

    // ── كل مسار بياناته العامة بيتسحب لوحده بس، مفيش أي استماع على الروت كله ──
    db.ref('/products').on('value', snap => {
        safeStore('eljory_products', fbToArray(snap.val()));
        renderAll();
    });

    db.ref('/categories').on('value', snap => {
        latestCategories = fbToArray(snap.val());
        safeStore('eljory_categories', latestCategories);
        renderAll();
    });

    db.ref('/promos').on('value', snap => {
        safeStore('eljory_promos', fbToArray(snap.val()));
        renderAll();
    });

    db.ref('/banners').on('value', snap => {
        safeStore('eljory_banners', fbToArray(snap.val()));
        renderAll();
    });

    db.ref('/regions').on('value', snap => {
        safeStore('eljory_regions', fbToArray(snap.val()));
        renderAll();
    });

    db.ref('/rewards').on('value', snap => {
        safeStore('eljory_rewards', fbToArray(snap.val()));
        renderAll();
    });

    db.ref('/customLists').on('value', snap => {
        safeStore('eljory_custom_lists', fbToArray(snap.val()));
        renderAll();
    });

    db.ref('/sections').on('value', snap => {
        safeStore('eljory_sections', fbToArray(snap.val()));
        renderAll();
    });

    db.ref('/settings').on('value', snap => {
        safeStore('eljory_loyalty_settings', snap.val() || { system: 'global', spent: 10, earn: 1 });
        renderAll();
    });

    // ⭐ نظام الضمان: محتوى صفحة "ضماناتي" اللي الأدمن بيكتبه من لوحة التحكم
    // (رسالة ترحيبية/توضيحية + زرار اختياري)، بيتسحب هنا عشان يبان لأي عميل
    // فاتح صفحة حسابه، بنفس أسلوب باقي البيانات العامة.
    db.ref('/warrantyPageContent').on('value', snap => {
        safeStore('eljory_warranty_content', snap.val() || null);
        if (typeof renderWarrantyPageContent === 'function') renderWarrantyPageContent();
    });

    // ⭐ محتوى صفحة تفعيل الضمان (warranty.html) — اللوجو/العنوان/النص التمهيدي/
    // شريط الثقة/رسالة النجاح، كلها بيتحكم فيها الأدمن من تاب "صفحة تفعيل الضمان"
    db.ref('/warrantyActivationPageContent').on('value', snap => {
        safeStore('eljory_warranty_activation_content', snap.val() || null);
        if (typeof window.renderWarrantyActivationPageContent === 'function') window.renderWarrantyActivationPageContent();
    });

    // ملحوظة: /gallery (استوديو صور الأدمن) اتشال من هنا عمداً - مش محتاجة تتسحب
    // في أي صفحة عامة، وبقت للأدمن بس (شوف تحديث قواعد الأمان المرفق مع الباتش).

    console.log('✅ تم الاشتراك في بيانات المتجر العامة فقط من Firebase (بدون /users أو /orders)!');
}

// تشغيل النواة فور تحميل الملف
initStoreData();