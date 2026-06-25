// ============================================================================
// النواة الأساسية لمتجر الجوري (El Jory Store Core) — store-core.js
// مسؤول عن جلب كل البيانات من Firebase وتخزينها في localStorage
// ============================================================================

window.DB_PATH = '/';

function initStoreData() {
    db.ref(DB_PATH).on('value', (snapshot) => {
        if (!snapshot.exists()) {
            console.warn('⚠️ لا توجد بيانات في Firebase على مسار: ' + DB_PATH);
            return;
        }

        const data = snapshot.val();

        // دالة مساعدة: تحول أي Object أو Array من Firebase لمصفوفة نظيفة
        const fbToArray = (obj) =>
            obj ? (Array.isArray(obj) ? obj.filter(x => x) : Object.values(obj).filter(x => x)) : [];

        // ── تخزين كل البيانات في localStorage ──────────────────────────────
        const safeStore = (key, val) => {
            try { localStorage.setItem(key, JSON.stringify(val)); }
            catch (e) { console.warn('localStorage full?', key, e); }
        };

        safeStore('eljory_products',       fbToArray(data.products));
        safeStore('eljory_categories',     fbToArray(data.categories));
        safeStore('eljory_promos',         fbToArray(data.promos));
        safeStore('eljory_banners',        fbToArray(data.banners));
        safeStore('eljory_regions',        fbToArray(data.regions));
        safeStore('eljory_rewards',        fbToArray(data.rewards));
        safeStore('eljory_gallery',        fbToArray(data.gallery));
        safeStore('eljory_custom_lists',   fbToArray(data.customLists));
        safeStore('eljory_sections',       fbToArray(data.sections));          // ← جديد
        safeStore('eljory_loyalty_settings', data.settings || { system: 'global', spent: 10, earn: 1 });

        console.log('✅ تم سحب بيانات المتجر من Firebase بنجاح!');

        // ── تحديث الواجهة بعد جلب البيانات ─────────────────────────────────
        if (typeof renderCategoriesGrid      === 'function') renderCategoriesGrid();
        if (typeof renderStoreProducts       === 'function') renderStoreProducts();
        if (typeof renderDynamicNavbar       === 'function') renderDynamicNavbar();
        if (typeof joryRenderNavCategories === 'function') {
    var allCats = fbToArray(data.categories)
        .filter(function(c) { return c && c.isActive !== false; });

    // الأقسام الرئيسية — اللي مفيهاش parentId
    var mainCats = allCats
        .filter(function(c) { return !c.parentId; })
        .sort(function(a, b) { return (a.priority || 0) - (b.priority || 0); });

    // الأقسام الفرعية — اللي عندها parentId
    var subCats = allCats.filter(function(c) { return c.parentId; });

    var navCats = mainCats.map(function(cat) {
        var subs = subCats
            .filter(function(s) { return s.parentId === cat.id; })
            .map(function(s) {
                return {
                    name: s.nameAr,
                    link: 'shop.html?cat=' + s.id
                };
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
        if (typeof renderLoyaltyBanner       === 'function') renderLoyaltyBanner();
        if (typeof renderBanners             === 'function') renderBanners();
        if (typeof renderStorefrontSections  === 'function') renderStorefrontSections(); // ← جديد
    });
}

// تشغيل النواة فور تحميل الملف
initStoreData();
