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
    var navCats = fbToArray(data.categories)
        .filter(function(cat) { return cat && cat.isActive !== false; })
        .map(function(cat) {
            var rawSubs = cat.subcategories || cat.lists || cat.subCategories || cat.children || [];
            if (!Array.isArray(rawSubs)) rawSubs = Object.values(rawSubs);

            var subs = rawSubs.filter(function(s){ return s; }).map(function(s) {
                return {
                    name: s.nameAr || s.name || s.title,
                    link: 'shop.html?list=' + (s.id || s.slug)
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
