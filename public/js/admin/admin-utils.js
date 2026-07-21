// ================================================================
// js/admin-utils.js
// أدوات مساعدة عامة + نظام الصلاحيات (Foundations/Roles) + ترقيم الصفحات العام. لازم يتحمّل أول واحد قبل باقي الملفات.
// ملحوظة: كل الدوال هنا لسه بتتسجل على window (زي الأول تمامًا) — الفصل ده
// تنظيمي بس، ومحتاج كل الملفات تتحمّل مع بعض في admin.html بالترتيب المحدد
// (utils الأول، dashboard آخر واحد).
// ================================================================

// ================================================================
// js/admin.js — لوحة التحكم | الجوري ستور
// جميع كود الجافاسكريبت في ملف واحد منظم
// ================================================================


// ================================================================
// ① الدوال المساعدة العامة (Utilities)
// ================================================================

window.getShortPhone = function(str) {
    if(!str) return "";
    return String(str).replace(/\D/g, '').slice(-10);
};

window.safeUpdateList = function(path, transformFn) {
    return db.ref(path).once('value').then(snapshot => {
        let data = snapshot.val();
        let arr = data ? (Array.isArray(data) ? data.filter(x=>x) : Object.values(data).filter(x=>x)) : [];
        let updatedArr = transformFn(arr);
        return db.ref(path).set(updatedArr).then(() => updatedArr);
    });
};

window.editingProdId = null;

// ================================================================
// ①.٥ نظام الصلاحيات (Permission Foundations / Roles)
// ================================================================
// المبدأ: كل أدمن مربوط بـ"فئة/أساس" واحد (foundationId) محفوظ في
// /admin_details/{uid}/foundationId. كل فئة عندها خريطة صلاحيات لكل قسم في
// اللوحة: 'none' (بدون صلاحية) | 'view' (مشاهدة فقط) | 'edit' (مشاهدة وتعديل).
// وعندها كمان علم منفصل canManageAdmins بيتحكم في إدارة فريق العمل نفسه
// (إضافة/تعديل/حذف/إيقاف أدمنز، وإنشاء/تعديل فئات جديدة).
// للتوافق مع الحسابات القديمة (اللي اتعملت قبل الميزة دي): أي أدمن مالوش
// foundationId محفوظ بيتعامل معاه كـ"سوبر أدمن" كامل الصلاحيات، عشان محدش
// من الفريق الحالي يفقد أي وصول كان متاح له قبل كده.

window.PERM_SECTIONS = [
    { key: 'orders',      label: '📦 الطلبات والفواتير' },
    { key: 'products',    label: '🛒 المنتجات والأقسام' },
    { key: 'promos',      label: '🏷️ العروض وكوبونات الخصم' },
    { key: 'warranties',  label: '🛡️ الضمانات' },
    { key: 'customers',   label: '👥 العملاء والمناطق' },
    { key: 'loyalty',     label: '🎁 نظام الولاء والمكافآت' },
    { key: 'storefront',  label: '🖼️ واجهة المتجر' },
    { key: 'gallery',     label: '🖼️ استوديو الصور' },
    { key: 'accounting',  label: '💰 الحسابات والخزنة' },
    { key: 'team',        label: '👤 فريق العمل' }
];

window.SUPER_ADMIN_FOUNDATION_ID = 'FND_SUPER_ADMIN';

// خريطة كل تاب (switchTab) على القسم اللي بيتبعله من ناحية الصلاحيات
window.getPermKeyForTab = function(tabId) {
    let map = {
        orders: 'orders',
        products: 'products', categories: 'products',
        promos: 'promos',
        warranties: 'warranties',
        customers: 'customers', regions: 'customers',
        'loyalty-settings': 'loyalty', 'loyalty-rewards': 'loyalty', 'loyalty-history': 'loyalty',
        storefront: 'storefront', sections: 'storefront', 'custom-lists': 'storefront',
        'acc-overview': 'accounting', 'acc-treasury-accounts': 'accounting', 'acc-treasury-transactions': 'accounting',
        'acc-expenses': 'accounting', 'acc-price-history': 'accounting', 'acc-stock-movements': 'accounting', 'acc-reports': 'accounting',
        team: 'team', foundations: 'team'
    };
    return map[tabId] || null;
};

window.currentAdminPermissions  = null; // { orders:{view:true,add:true,edit:false,delete:false}, ... } أو null = سوبر أدمن
window.currentAdminCanManage    = true;
window.currentAdminFoundationId = null;

// hasPerm: لو currentAdminPermissions === null معناه سوبر أدمن (كل الصلاحيات)
// level ممكن تكون: 'view' | 'add' | 'edit' | 'delete'
// ⭐ كل قسم دلوقتي عنده 4 صلاحيات منفصلة قابلة للاختيار مع بعض بحرية (مش
// اختيار واحد بس زي قبل كده). "مشاهدة" بقت ضمنية تلقائياً لو عنده أي صلاحية
// كتابة (إضافة/تعديل/حذف)، لأنه مش منطقي يقدر يضيف أو يعدّل من غير ما يشوف.
window.hasPerm = function(sectionKey, level) {
    if (!sectionKey) return true; // تابات مالهاش قسم مرتبط (زي مفيش) نسيبها متاحة
    if (!window.currentAdminPermissions) return true; // سوبر أدمن / حساب قديم بدون فئة
    let val = window.currentAdminPermissions[sectionKey];
    if (!val) return false;
    // ⚠️ توافق قديم: الفئات اللي اتعملت قبل التحديث كانت بتخزن نص واحد
    // ('none'/'view'/'edit') بدل كائن. بنترجمه هنا لنفس الشكل الجديد بدل ما
    // نضطر نعمل Migration فعلي على البيانات المحفوظة في فايربيس.
    if (typeof val === 'string') {
        if (level === 'view') return val === 'view' || val === 'edit';
        return val === 'edit'; // 'edit' القديمة كانت معناها كل صلاحيات الكتابة
    }
    if (level === 'view') return !!(val.view || val.add || val.edit || val.delete);
    return !!val[level];
};

// إخفاء أزرار السايدبار اللي مفيهاش صلاحية مشاهدة عليها
window.applyPermissionsToSidebar = function() {
    document.querySelectorAll('[data-perm]').forEach(function(el) {
        let key = el.getAttribute('data-perm');
        el.style.display = window.hasPerm(key, 'view') ? '' : 'none';
    });
    let foundationsBtn = document.getElementById('menuBtnFoundations');
    if (foundationsBtn) foundationsBtn.style.display = (window.currentAdminCanManage === true) ? '' : 'none';
};

// لو صلاحية الأدمن على القسم الحالي "مشاهدة فقط"، بنعطّل كل عناصر التحكم
// التفاعلية (أزرار/إدخالات/قوائم) جوه محتوى السكشن، عدا عناصر الترقيم والفلاتر
// (اللي بتحمل كلاس أو data attribute مخصوص) عشان يقدر يفلتر ويتصفح براحته.
window.enforceSectionLock = function(tabId) {
    let permKey = window.getPermKeyForTab(tabId);
    let sectionEl = document.getElementById(tabId);
    if (!sectionEl) return;
    let hasAnyWritePerm = permKey && (window.hasPerm(permKey, 'add') || window.hasPerm(permKey, 'edit') || window.hasPerm(permKey, 'delete'));
    let viewOnly = permKey && window.hasPerm(permKey, 'view') && !hasAnyWritePerm;
    sectionEl.querySelectorAll('button, input, select, textarea').forEach(function(el) {
        if (el.closest('[data-perm-exempt]')) return;
        if (el.id && /PageSizeSelect$|^filter/.test(el.id)) return; // فلاتر وترقيم صفحات
        if (el.closest('[id$="PaginationBox"]')) return;
        el.disabled = !!viewOnly;
        el.style.opacity = viewOnly ? '0.55' : '';
        el.style.cursor  = viewOnly ? 'not-allowed' : '';
    });

    // ⭐ صلاحية "حذف" منفصلة تمامًا: كل أزرار الحذف/الإلغاء الفعلية في اللوحة
    // (منتج، طلب، قسم، عميل، فئة، مدير، مصروف، سيكشن...) بتستخدم كلاس btn-red
    // بشكل ثابت في كل التابات. بنعطّل الأزرار دي تحديدًا لو الأدمن مالوش صلاحية
    // "حذف" على القسم، حتى لو عنده صلاحية "تعديل" أو "إضافة" مفعّلة، عشان يقدر
    // يعدّل ويضيف من غير ما يقدر يحذف حاجة نهائيًا.
    let canDelete = permKey ? window.hasPerm(permKey, 'delete') : true;
    sectionEl.querySelectorAll('.btn-red').forEach(function(el) {
        if (el.closest('[data-perm-exempt]')) return;
        if (viewOnly) return; // اتقفل بالفعل فوق مع كل عناصر السكشن
        el.disabled = !canDelete;
        el.style.opacity = canDelete ? '' : '0.45';
        el.style.cursor  = canDelete ? '' : 'not-allowed';
    });

    // ⚠️ إصلاح: مش كل أزرار الحذف عناصر <button> بكلاس btn-red — زي علامة "✖"
    // بجانب كل منطقة توصيل (وهي <span> عادي مربوط بيه onclick مباشرة). العنصر
    // ده كان بيفلت تمامًا من أي قفل لأنه مش button ولا btn-red. أي عنصر حذف
    // حقيقي (زرار أو span أو أي حاجة تانية) لازم يتحط عليه data-perm-delete="1"
    // عشان القفل ده يلاقيه ويمنع الضغط عليه فعلياً (مش بس شكلياً) لو مفيش صلاحية.
    // ⚠️ إصلاح: العناصر دي غالبًا مش <button> (زي علامة "✖" بجانب المنطقة، وهي
    // <span>)، فمش بتدخل في حلقة القفل العامة فوق دي اللي بتدور بس على
    // button/input/select/textarea. كنا هنا بنفترض غلط إن "viewOnly" معناه
    // العنصر ده اتقفل بالفعل فوق وبنعمل return من غير أي تعديل فعلي — وده
    // خلّى أي عنصر حذف من النوع ده (زي الـ span) يفضل شغال 100% حتى لو الأدمن
    // "مشاهدة فقط" بالكامل. دلوقتي بنقفلها صراحةً في حالتين: مفيش صلاحية حذف،
    // أو الأدمن أصلاً مشاهدة فقط (مالوش أي صلاحية كتابة على القسم ده).
    sectionEl.querySelectorAll('[data-perm-delete]').forEach(function(el) {
        if (el.closest('[data-perm-exempt]')) return;
        let shouldLock = viewOnly || !canDelete;
        if (!shouldLock) {
            el.style.pointerEvents = '';
            el.style.opacity = '';
            el.style.cursor = '';
            el.removeAttribute('title');
        } else {
            el.style.pointerEvents = 'none'; // ده اللي فعلياً بيمنع تنفيذ onclick
            el.style.opacity = '0.3';
            el.style.cursor = 'not-allowed';
            el.title = viewOnly ? 'ليس لديك صلاحية التعديل على هذا القسم' : 'ليس لديك صلاحية الحذف';
        }
    });
};

// ── إنشاء فئة "سوبر أدمن" افتراضية لو مش موجودة (كامل الصلاحيات + إدارة الفريق) ──
window.ensureSuperAdminFoundation = function() {
    return db.ref('/permissionFoundations/' + window.SUPER_ADMIN_FOUNDATION_ID).once('value').then(function(snap) {
        if (snap.exists()) return;
        let perms = {};
        window.PERM_SECTIONS.forEach(s => perms[s.key] = { view: true, add: true, edit: true, delete: true });
        return db.ref('/permissionFoundations/' + window.SUPER_ADMIN_FOUNDATION_ID).set({
            id: window.SUPER_ADMIN_FOUNDATION_ID,
            name: 'سوبر أدمن',
            canManageAdmins: true,
            permissions: perms,
            isBuiltIn: true
        });
    }).catch(function(err) { console.warn('تعذر إنشاء فئة سوبر أدمن الافتراضية:', err.message); });
};

// ── تحميل صلاحيات الأدمن الحالي بعد تسجيل الدخول والتأكد إنه أدمن ────────
window.loadCurrentAdminPermissions = function(uid) {
    return db.ref('/admin_details/' + uid).once('value').then(function(snap) {
        let details = snap.val() || {};
        if (details.isDisabled === true) {
            throw new Error('ACCOUNT_DISABLED');
        }
        let fId = details.foundationId || null;
        window.currentAdminFoundationId = fId;
        if (!fId) {
            // حساب قديم بدون فئة محددة = سوبر أدمن كامل الصلاحيات (توافق قديم)
            window.currentAdminPermissions = null;
            window.currentAdminCanManage   = true;
            return;
        }
        return db.ref('/permissionFoundations/' + fId).once('value').then(function(fSnap) {
            let f = fSnap.val();
            if (!f) {
                // فئة محذوفة أو غير موجودة — أمان: نعامله كأقل صلاحية (بدون أي وصول)
                window.currentAdminPermissions = {};
                window.currentAdminCanManage   = false;
            } else {
                window.currentAdminPermissions = f.permissions || {};
                window.currentAdminCanManage   = f.canManageAdmins === true;
            }
        });
    });
};

// ── إدارة الفئات (Foundations CRUD) ──────────────────────────────────────
window.buildFoundationPermRows = function(existingPerms) {
    let tbody = document.getElementById('foundationPermsBody');
    if (!tbody) return;
    existingPerms = existingPerms || {};
    tbody.innerHTML = window.PERM_SECTIONS.map(function(s) {
        let cur = existingPerms[s.key];
        // ⚠️ توافق قديم: تحويل الشكل النصي القديم (none/view/edit) لأربع صلاحيات مستقلة
        if (typeof cur === 'string') {
            cur = { view: cur === 'view' || cur === 'edit', add: cur === 'edit', edit: cur === 'edit', delete: cur === 'edit' };
        }
        cur = cur || {};
        let chk = function(action) { return cur[action] ? 'checked' : ''; };
        return `<tr>
            <td style="text-align:right;font-weight:bold;color:#1d364a;">${s.label}</td>
            <td style="text-align:center;"><input type="checkbox" name="fperm_${s.key}_view"   ${chk('view')}   style="width:18px;height:18px;cursor:pointer;"></td>
            <td style="text-align:center;"><input type="checkbox" name="fperm_${s.key}_add"    ${chk('add')}    style="width:18px;height:18px;cursor:pointer;"></td>
            <td style="text-align:center;"><input type="checkbox" name="fperm_${s.key}_edit"   ${chk('edit')}   style="width:18px;height:18px;cursor:pointer;"></td>
            <td style="text-align:center;"><input type="checkbox" name="fperm_${s.key}_delete" ${chk('delete')} style="width:18px;height:18px;cursor:pointer;"></td>
        </tr>`;
    }).join('');
};

window.saveFoundation = function() {
    if (!(window.currentAdminCanManage === true)) return alert('⚠️ ليس لديك صلاحية إدارة الفئات.');
    let editingId = document.getElementById('editingFoundationId').value;
    let name = document.getElementById('foundationName').value.trim();
    if (!name) return alert('يرجى كتابة اسم الفئة!');
    let canManage = document.getElementById('foundationCanManageAdmins').checked;
    let perms = {};
    window.PERM_SECTIONS.forEach(function(s) {
        let get = function(action) {
            let el = document.querySelector(`input[name="fperm_${s.key}_${action}"]`);
            return el ? el.checked : false;
        };
        perms[s.key] = { view: get('view'), add: get('add'), edit: get('edit'), delete: get('delete') };
    });
    let id = editingId || ('FND_' + Date.now());
    db.ref('/permissionFoundations/' + id).set({ id, name, canManageAdmins: canManage, permissions: perms, isBuiltIn: (id === window.SUPER_ADMIN_FOUNDATION_ID) }).then(function() {
        alert(editingId ? 'تم تحديث الفئة بنجاح! ✅' : 'تم إنشاء الفئة بنجاح! ✅');
        window.cancelEditFoundation();
    });
};

window.editFoundation = function(id) {
    let foundations = JSON.parse(localStorage.getItem('eljory_permission_foundations') || '[]');
    let f = foundations.find(x => x.id === id);
    if (!f) return;
    document.getElementById('editingFoundationId').value = id;
    document.getElementById('foundationName').value = f.name || '';
    document.getElementById('foundationCanManageAdmins').checked = f.canManageAdmins === true;
    window.buildFoundationPermRows(f.permissions || {});
    document.getElementById('foundationSaveBtn').innerHTML = '💾 حفظ التعديلات';
    document.getElementById('foundationCancelBtn').style.display = 'inline-block';
    document.getElementById('foundationFormBox').scrollIntoView({ behavior:'smooth' });
};

window.cancelEditFoundation = function() {
    document.getElementById('editingFoundationId').value = '';
    document.getElementById('foundationName').value = '';
    document.getElementById('foundationCanManageAdmins').checked = false;
    window.buildFoundationPermRows({});
    document.getElementById('foundationSaveBtn').innerHTML = '➕ حفظ الفئة';
    document.getElementById('foundationCancelBtn').style.display = 'none';
};

window.deleteFoundation = function(id) {
    if (!(window.currentAdminCanManage === true)) return alert('⚠️ ليس لديك صلاحية إدارة الفئات.');
    if (id === window.SUPER_ADMIN_FOUNDATION_ID) return alert('لا يمكن حذف فئة "سوبر أدمن" الأساسية!');
    if (!confirm('هل أنت متأكد من حذف هذه الفئة؟ أي أدمن مربوط بيها هيفقد كل الصلاحيات لحد ما تحدد له فئة جديدة.')) return;
    db.ref('/permissionFoundations/' + id).remove();
};

window.renderFoundations = function() {
    let tbody = document.getElementById('adminFoundationsBody');
    if (!tbody) return;
    let foundations = JSON.parse(localStorage.getItem('eljory_permission_foundations') || '[]');
    if (!foundations.length) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:gray;padding:20px;">لا توجد فئات بعد.</td></tr>';
        window.buildFoundationPermRows({});
        return;
    }
    tbody.innerHTML = foundations.map(function(f) {
        let summary = window.PERM_SECTIONS.filter(function(s) {
            let v = (f.permissions||{})[s.key];
            if (typeof v === 'string') return v === 'edit';
            return v && (v.edit || v.add || v.delete);
        }).map(s => s.label.split(' ')[0]).join(' ') || '—';
        return `<tr>
            <td><strong>${f.name}</strong>${f.isBuiltIn ? ' <small style="color:#f38c18;">(أساسية)</small>' : ''}</td>
            <td>${f.canManageAdmins ? '<span style="color:#28a745;font-weight:bold;">✅ نعم</span>' : '<span style="color:gray;">لا</span>'}</td>
            <td style="font-size:13px;">${summary}</td>
            <td>
                <button class="btn" style="background:#17a2b8;padding:5px 10px;margin-bottom:5px;" onclick="editFoundation('${f.id}')">⚙️ تعديل</button>
                ${f.isBuiltIn ? '' : `<button class="btn btn-red" style="padding:5px 10px;" onclick="deleteFoundation('${f.id}')">🗑️ حذف</button>`}
            </td>
        </tr>`;
    }).join('');
    if (!document.getElementById('editingFoundationId').value) window.buildFoundationPermRows({});
};

window.populateFoundationSelects = function() {
    let foundations = JSON.parse(localStorage.getItem('eljory_permission_foundations') || '[]');
    let opts = foundations.map(f => `<option value="${f.id}">${f.name}${f.isBuiltIn?' (أساسية)':''}</option>`).join('');
    let sel = document.getElementById('newAdminFoundation');
    if (sel) { let cur = sel.value; sel.innerHTML = opts; if (cur) sel.value = cur; }
    document.querySelectorAll('.adminChangeFoundationSelect').forEach(function(s) {
        let cur = s.value; s.innerHTML = opts; if (cur) s.value = cur;
    });
};

// ================================================================
// ⭐ نظام ترقيم صفحات عام (Generic Pagination Helper)
// ================================================================
// نفس فكرة ترقيم صفحات المنتجات والطلبات، بس معمم لأي جدول تاني (عملاء،
// سجل الأسعار، حركات الخزنة، سجل المخزون، جداول التقارير...) من غير ما نكرر
// نفس الكود في كل قسم. كل قسم بيستخدم "مفتاح" فريد (key) يميزه عن باقي الجداول.
window._genPages     = window._genPages     || {}; // { key: currentPage }

window.genGetPageSize = function(key, defaultSize) {
    let sel = document.getElementById(key + 'PageSizeSelect');
    if (sel && sel.value) {
        let v = parseInt(sel.value) || defaultSize;
        localStorage.setItem('admin_' + key + '_page_size', v);
        return v;
    }
    let saved = localStorage.getItem('admin_' + key + '_page_size');
    return saved ? (parseInt(saved) || defaultSize) : defaultSize;
};

window.genGetCurrentPage = function(key) {
    return window._genPages[key] || 1;
};

window.genGoToPage = function(key, page, renderFnName) {
    window._genPages[key] = page;
    if (typeof window[renderFnName] === 'function') window[renderFnName]();
    let box = document.getElementById(key + 'PaginationBox');
    if (box) box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

window.genRenderPagination = function(key, totalItems, pageSize, renderFnName) {
    let box = document.getElementById(key + 'PaginationBox');
    if (!box) return;
    let totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    let cur = window.genGetCurrentPage(key);
    if (cur > totalPages) cur = totalPages;
    if (cur < 1) cur = 1;
    window._genPages[key] = cur;
    if (totalPages <= 1) { box.innerHTML = ""; return; }
    let html = `<button class="btn" style="background:#6c757d;padding:6px 12px;" ${cur<=1?'disabled':''} onclick="genGoToPage('${key}',${cur-1},'${renderFnName}')">‹ السابق</button>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="btn" style="padding:6px 12px;${i===cur?'background:#f38c18;color:#1d364a;':'background:#1d364a;'}" onclick="genGoToPage('${key}',${i},'${renderFnName}')">${i}</button>`;
    }
    html += `<button class="btn" style="background:#6c757d;padding:6px 12px;" ${cur>=totalPages?'disabled':''} onclick="genGoToPage('${key}',${cur+1},'${renderFnName}')">التالي ›</button>`;
    box.innerHTML = html;
};

window.genSlicePage = function(key, filteredArr, pageSize) {
    let totalPages = Math.max(1, Math.ceil(filteredArr.length / pageSize));
    let cur = window.genGetCurrentPage(key);
    if (cur > totalPages) cur = totalPages;
    if (cur < 1) cur = 1;
    window._genPages[key] = cur;
    let startIdx = (cur - 1) * pageSize;
    return filteredArr.slice(startIdx, startIdx + pageSize);
};



// ================================================================
