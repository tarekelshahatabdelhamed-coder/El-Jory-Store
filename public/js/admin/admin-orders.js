// ================================================================
// js/admin-orders.js
// إنشاء طلب واتساب يدوي + إدارة الطلبات والفواتير الكاملة.
// ملحوظة: كل الدوال هنا لسه بتتسجل على window (زي الأول تمامًا) — الفصل ده
// تنظيمي بس، ومحتاج كل الملفات تتحمّل مع بعض في admin.html بالترتيب المحدد
// (utils الأول، dashboard آخر واحد).
// ================================================================

// ⑨.٥ إنشاء طلب واتساب يدوي (Manual WhatsApp Order + نظام الضمان)
// ================================================================

let moItemsCache = [];       // عناصر الطلب اليدوي الحالي
let moExistingCustomer = null; // بيانات العميل الحالي بعد البحث بنجاح
let moSearchTimer = null;    // مؤقت الـ debounce لبحث العميل اللايف
let moProdSearchTimer = null; // مؤقت الـ debounce لبحث المنتج اللايف

window.openManualOrderModal = function() {
    moItemsCache = [];
    moExistingCustomer = null;

    // إعادة ضبط الفورم بالكامل كل مرة تُفتح فيها
    document.querySelector('input[name="moCustomerType"][value="existing"]').checked = true;
    document.getElementById("moSearchPhone").value = "";
    document.getElementById("moCustomerResults").style.display = "none";
    document.getElementById("moCustomerResults").innerHTML = "";
    document.getElementById("moExistingResult").style.display = "none";
    document.getElementById("moExistingResult").innerHTML = "";
    document.getElementById("moNewName").value    = "";
    document.getElementById("moNewPhone").value   = "";
    document.getElementById("moNewAddress").value = "";
    document.getElementById("moProdSearch").value = "";
    document.getElementById("moProdResults").style.display = "none";
    document.getElementById("moProdResults").innerHTML = "";
    document.getElementById("moShipping").value   = "0";
    document.getElementById("moOrderStatus").value= "Delivered";
    moEnsureDiscountField();
    let discEl = document.getElementById("moDiscount");
    if (discEl) discEl.value = "0";
    let saveBtn = document.getElementById("moSaveBtn");
    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = "💾 حفظ الطلب وطباعة الفاتورة"; }
    moRegenerateSecretCode();
    moToggleCustomerType();
    moToggleAccountBox();
    window.populateTreasuryAccountSelects();

    // تعبئة قائمة المناطق (لاستخدامها في سحب مصاريف الشحن أوتوماتيك)
    let regions = JSON.parse(localStorage.getItem("eljory_regions")) || [];
    let regSel  = document.getElementById("moNewRegion");
    regSel.innerHTML = '<option value="">-- اختر المنطقة --</option>' +
        regions.filter(r => r.isActive !== false).map(r => `<option value="${r.name}" data-fee="${r.fee||0}">${r.name}</option>`).join('');

    renderMoItems();
    document.getElementById("manualOrderModal").style.display = "flex";
};

window.closeManualOrderModal = function() {
    document.getElementById("manualOrderModal").style.display = "none";
};

// ⭐ نظام الحسابات: بنحقن حقل "قيمة الخصم" ديناميكياً جنب حقل الشحن في مودال
// الطلب اليدوي (بدل ما نعدّل الـ HTML الثابت)، عشان الأدمن يقدر يكتب قيمة أي
// خصم اتفق عليه مع العميل يدوياً (واتساب)، وده هيتسجل تلقائياً كمصروف تسويقي
// لو الطلب اتحفظ بحالة "تم التوصيل" (نفس منطق finalizeDeliverOrder بالظبط).
function moEnsureDiscountField() {
    if (document.getElementById("moDiscount")) return;
    let shippingInput = document.getElementById("moShipping");
    let shippingGroup = shippingInput ? shippingInput.closest('.form-group') : null;
    if (!shippingGroup || !shippingGroup.parentNode) return;
    let discBox = document.createElement('div');
    discBox.className = 'form-group';
    discBox.style.cssText = 'flex:1;min-width:150px;margin-bottom:0;';
    discBox.innerHTML = `<label>قيمة الخصم (لو فيه) <small style="color:gray;font-weight:normal;">(هتتسجل تلقائي كمصروف تسويقي)</small></label>
        <input type="number" id="moDiscount" class="form-control" value="0" min="0" onchange="moUpdateTotal()">`;
    shippingGroup.parentNode.insertBefore(discBox, shippingGroup.nextSibling);
}

// ⭐ نظام الخزنة: صندوق اختيار الحساب المستلم يظهر بس لما حالة الطلب اليدوي
// = "تم التوصيل" (لأنه وقتها بس اللي بندخل فيه إيراد فعلي للخزنة).
window.moToggleAccountBox = function() {
    let status = document.getElementById("moOrderStatus").value;
    let box = document.getElementById("moDepositAccountBox");
    if (box) box.style.display = (status === "Delivered") ? "block" : "none";
};

window.moToggleCustomerType = function() {
    let type = document.querySelector('input[name="moCustomerType"]:checked').value;
    document.getElementById("moExistingBox").style.display = type === "existing" ? "block" : "none";
    document.getElementById("moNewBox").style.display      = type === "new"      ? "block" : "none";
    document.getElementById("moLabelExisting").style.borderColor = type === "existing" ? "#25d366" : "transparent";
    document.getElementById("moLabelNew").style.borderColor      = type === "new"      ? "#25d366" : "transparent";
};

window.moRegenerateSecretCode = function() {
    let el = document.getElementById("moSecretCode");
    if (el) el.value = window.generateSecretCode ? window.generateSecretCode() : Math.floor(100000 + Math.random()*900000).toString();
};

// ── سحب مصاريف الشحن أوتوماتيك من المنطقة المختارة (قابلة للتعديل بعد كده) ──
window.moApplyShippingFee = function(fee) {
    let el = document.getElementById("moShipping");
    if (el) { el.value = fee || 0; moUpdateTotal(); }
};

window.moOnNewRegionChange = function() {
    let sel = document.getElementById("moNewRegion");
    let opt = sel.options[sel.selectedIndex];
    let fee = opt ? (parseFloat(opt.getAttribute("data-fee")) || 0) : 0;
    moApplyShippingFee(fee);
};

// ── بحث لايف عن عميل حالي برقم التليفون (Debounce 300ms) ──────────────────
window.moLiveSearchCustomer = function() {
    clearTimeout(moSearchTimer);
    let raw = document.getElementById("moSearchPhone").value;
    let resultsBox = document.getElementById("moCustomerResults");

    // العميل المختار سابقًا بيتلغي لو الأدمن غيّر في نص البحث تاني
    moExistingCustomer = null;
    document.getElementById("moExistingResult").style.display = "none";

    // ⚠️ إصلاح: كنا بنستعلم على فايربيس مباشرة بـ orderByChild('phone') ونقارن
    // بالأرقام زي ما اتكتبت حرفيًا. المشكلة إن الأرقام بتتخزن في الداتابيز من
    // غير الصفر الأول (getShortPhone بتاخد آخر 10 أرقام بس)، لكن الأدمن
    // بيكتب رقم العميل عادةً بالصفر الأول زي ما هو مكتوب في أي فاتورة أو شات
    // واتساب (01033325909)، فكانت المقارنة النصية بتفشل دايمًا وتقول "مفيش
    // عميل" حتى لو موجود. الحل: بنستخدم نفس الكاش المحلي اللي أدمن.js بيزامنه
    // حي أصلاً من /users (eljory_users_db)، وبنطبّع رقم البحث بنفس منطق
    // getShortPhone (نشيل غير الأرقام وناخد آخر 10 خانات) قبل المقارنة، فيبقى
    // شكل رقم البحث مطابق تمامًا لشكل الرقم المخزن أيًا كان شكله وقت الكتابة.
    let digits = window.getShortPhone(raw);

    if (digits.length < 3) {
        resultsBox.style.display = "none";
        resultsBox.innerHTML = "";
        return;
    }

    moSearchTimer = setTimeout(function() {
        let usersDB = JSON.parse(localStorage.getItem("eljory_users_db")) || [];
        let matches = usersDB.filter(function(u) {
            return window.getShortPhone(u.phone).includes(digits);
        }).slice(0, 8);

        resultsBox.innerHTML = "";
        if (!matches.length) {
            resultsBox.style.display = "block";
            resultsBox.innerHTML = `<div style="padding:12px;color:#d9534f;font-weight:bold;">⚠️ مفيش عميل مطابق. اختر "عميل جديد" لو الرقم مش مسجل.</div>`;
            return;
        }

        let rows = matches.map(function(u) {
            let primaryAddr = u.addresses && u.addresses.find(a=>a.isPrimary) ? u.addresses.find(a=>a.isPrimary).text : (u.address || "غير محدد");
            return `<div onclick='moSelectCustomer(${JSON.stringify(JSON.stringify(u))})'
                 style="padding:10px 12px;border-bottom:1px solid #eee;cursor:pointer;transition:.15s;"
                 onmouseover="this.style.background='#f0f8ff'" onmouseout="this.style.background='white'">
                <strong style="color:#1d364a;">${u.name || 'بدون اسم'}</strong><br>
                <small>📞 ${u.phone}</small> — <small style="color:gray;">${primaryAddr}</small>
            </div>`;
        });
        resultsBox.innerHTML = rows.join('');
        resultsBox.style.display = "block";
    }, 250);
};

window.moSelectCustomer = function(userJsonStr) {
    let u = JSON.parse(userJsonStr);
    moExistingCustomer = u;
    document.getElementById("moCustomerResults").style.display = "none";
    document.getElementById("moSearchPhone").value = u.phone;

    let primaryAddr = u.addresses && u.addresses.find(a=>a.isPrimary) ? u.addresses.find(a=>a.isPrimary).text : (u.address || "غير محدد");
    let resultBox = document.getElementById("moExistingResult");
    resultBox.style.display = "block";
    resultBox.innerHTML = `<strong style="color:#1d364a;">${u.name}</strong><br><small>📞 ${u.phone}</small><br><small>📍 ${primaryAddr}</small>`;

    // ⭐ سحب مصاريف الشحن أوتوماتيك من منطقة العميل الحالي (لو منطقته متطابقة
    // مع اسم منطقة موجودة في قائمة المناطق)، وبرضو تفضل قابلة للتعديل بعد كده
    let regionName = window.getRegionFromAddressText ? window.getRegionFromAddressText(primaryAddr) : "";
    let regions = JSON.parse(localStorage.getItem("eljory_regions")) || [];
    let matchedRegion = regions.find(r => r.name === regionName);
    if (matchedRegion) moApplyShippingFee(matchedRegion.fee || 0);
};

// ── بحث لايف عن منتج بالاسم أو الكود (Debounce 200ms) ──────────────────────
window.moLiveSearchProduct = function() {
    clearTimeout(moProdSearchTimer);
    let q = document.getElementById("moProdSearch").value.trim().toLowerCase();
    let resultsBox = document.getElementById("moProdResults");

    if (!q) {
        resultsBox.style.display = "none";
        resultsBox.innerHTML = "";
        return;
    }

    moProdSearchTimer = setTimeout(function() {
        let products = JSON.parse(localStorage.getItem("eljory_products") || "[]");
        let matches = products.filter(p =>
            p.isActive !== false && (
                (p.titleAr && p.titleAr.toLowerCase().includes(q)) ||
                (p.titleEn && p.titleEn.toLowerCase().includes(q)) ||
                (p.id && p.id.toLowerCase().includes(q))
            )
        ).slice(0, 8);

        if (!matches.length) {
            resultsBox.style.display = "block";
            resultsBox.innerHTML = `<div style="padding:12px;color:gray;">لا توجد نتائج مطابقة.</div>`;
            return;
        }

        resultsBox.innerHTML = matches.map(function(p, idx) {
            let qtyInputId = 'moQtyInline_' + idx;
            let outOfStock = (p.stock || 0) <= 0;
            let warrantyBadge = (parseInt(p.warrantyMonths) || 0) > 0
                ? `<span style="background:#28a745;color:white;padding:1px 7px;border-radius:8px;font-size:10px;">🛡️ ${p.warrantyMonths} شهر</span>`
                : '';
            return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid #eee;flex-wrap:wrap;">
                <img src="${p.img}" style="width:36px;height:36px;object-fit:cover;border-radius:5px;flex-shrink:0;">
                <div style="flex:2;min-width:140px;">
                    <strong style="font-size:13px;color:#1d364a;">${p.titleAr}</strong> <small style="color:gray;">(${p.id})</small><br>
                    <small style="color:#f38c18;font-weight:bold;">${p.price} ج.م</small>
                    <small style="color:${outOfStock?'#d9534f':'#28a745'};margin-right:6px;">${outOfStock?'نفد المخزون':'متاح: '+p.stock}</small>
                    ${warrantyBadge}
                </div>
                <input type="number" id="${qtyInputId}" value="1" min="1" ${outOfStock?'disabled':''}
                       class="form-control" style="width:64px;flex-shrink:0;">
                <button class="btn btn-green" style="flex-shrink:0;padding:8px 14px;" ${outOfStock?'disabled':''}
                        onclick="moAddProductFromSearch('${p.id}','${qtyInputId}')">➕ إضافة</button>
            </div>`;
        }).join('');
        resultsBox.style.display = "block";
    }, 200);
};

// ── إضافة منتج للطلب بالكمية المحددة قبل الضغط على "إضافة" ────────────────
window.moAddProductFromSearch = async function(id, qtyInputId) {
    // ⚠️ إصلاح: بنقرأ بيانات المنتج مباشرة من فايربيس (مش الكاش المحلي) وقت
    // الإضافة الفعلية، عشان نضمن أحدث شهور ضمان ومخزون حتى لو الأدمن عدّلهم
    // على المنتج قبل ثانية بس من عمل الطلب.
    let qtyInput = document.getElementById(qtyInputId);
    let requestedQty = qtyInput ? (parseInt(qtyInput.value) || 1) : 1;

    let snap = await db.ref('/products/' + id).once('value');
    let p = snap.val();
    if (!p) return;

    if ((p.stock || 0) <= 0) { alert("عذراً، لا يوجد مخزون متاح من هذا المنتج!"); return; }

    let existing = moItemsCache.find(i => i.id === id);
    if (existing) {
        if (existing.qty + requestedQty > p.stock) { alert(`أقصى كمية متاحة لهذا المنتج هي ${p.stock}!`); return; }
        existing.qty += requestedQty;
        existing.warrantyMonths = parseInt(p.warrantyMonths) || 0;
    } else {
        if (requestedQty > p.stock) { alert(`أقصى كمية متاحة لهذا المنتج هي ${p.stock}!`); return; }
        moItemsCache.push({ id: p.id, price: p.price, qty: requestedQty, warrantyMonths: parseInt(p.warrantyMonths) || 0 });
    }

    renderMoItems();
    // تنظيف البحث بعد الإضافة عشان الأدمن يقدر يدوّر على منتج تاني بسهولة
    document.getElementById("moProdSearch").value = "";
    document.getElementById("moProdResults").style.display = "none";
    document.getElementById("moProdResults").innerHTML = "";
};

window.moRemoveItem = function(idx) {
    moItemsCache.splice(idx, 1);
    renderMoItems();
};

window.moChangeQty = function(idx, inputEl) {
    let products = JSON.parse(localStorage.getItem("eljory_products")) || [];
    let it = moItemsCache[idx];
    if (!it) return;
    let p = products.find(x => x.id === it.id);
    let maxAvail = p ? (p.stock || 0) : 0;
    let requested = parseInt(inputEl.value) || 1;
    if (requested > maxAvail) { alert(`أقصى كمية متاحة هي ${maxAvail}!`); requested = maxAvail > 0 ? maxAvail : 1; }
    if (requested < 1) requested = 1;
    it.qty = requested;
    inputEl.value = requested;
    moUpdateTotal();
};

function renderMoItems() {
    let products = JSON.parse(localStorage.getItem("eljory_products")) || [];
    let box = document.getElementById("moItemsBox");
    if (!moItemsCache.length) {
        box.innerHTML = '<p style="color:gray;">لسه مفيش منتجات مضافة للطلب.</p>';
    } else {
        box.innerHTML = moItemsCache.map((it, idx) => {
            let p = products.find(x => x.id === it.id);
            let name = p ? p.titleAr : it.id;
            let warrantyBadge = it.warrantyMonths > 0
                ? `<span style="background:#28a745;color:white;padding:2px 8px;border-radius:10px;font-size:11px;margin-right:6px;">🛡️ ضمان ${it.warrantyMonths} شهر</span>`
                : `<span style="color:gray;font-size:11px;margin-right:6px;">بدون ضمان</span>`;
            return `<div style="display:flex;gap:10px;align-items:center;background:#f9f9f9;padding:10px;border-radius:6px;margin-bottom:8px;flex-wrap:wrap;">
                <span style="flex:2;min-width:150px;">${name} <small style="color:gray;">(${it.id})</small><br>${warrantyBadge}</span>
                <input type="number" min="1" value="${it.qty}" style="width:70px;" class="form-control" onchange="moChangeQty(${idx}, this)">
                <span style="flex:1;">${it.price} ج.م / وحدة</span>
                <button class="btn btn-red" onclick="moRemoveItem(${idx})">🗑️</button>
            </div>`;
        }).join('');
    }
    moUpdateTotal();
}

window.moUpdateTotal = function() {
    let subtotal = moItemsCache.reduce((s,i) => s + (i.price*i.qty), 0);
    let shipping = parseFloat(document.getElementById("moShipping").value) || 0;
    let discEl   = document.getElementById("moDiscount");
    let discount = discEl ? (parseFloat(discEl.value) || 0) : 0;
    document.getElementById("moTotalPreview").innerText = Math.max(0, subtotal + shipping - discount);
};

window.saveManualOrder = async function() {
    if (!moItemsCache.length) return alert("لازم تضيف منتج واحد على الأقل للطلب!");

    // ⚠️ إصلاح جوهري: النسخة القديمة كانت بتنفّذ خطوات حساسة (تحويل رقم الطلب،
    // إنشاء حساب العميل الجديد) من غير أي try/catch حواليها. لو أي خطوة فيهم
    // فشلت (مشكلة صلاحيات في فايربيس، انقطاع نت، بيانات فيها undefined...)
    // كان بيحصل "Unhandled Promise Rejection" صامت تمامًا: مفيش أي alert
    // ومفيش أي حاجة تتغير على الشاشة، فكان بيبان للأدمن إن الزرار "مش شغال"
    // خالص من غير أي تفسير. دلوقتي العملية بأكملها من أول خطوة لآخر خطوة
    // بقت جوه try/catch واحد شامل، وبنعرض رسالة الخطأ الحقيقية في الـ alert
    // عشان لو حصلت مشكلة تانية في المستقبل تبان فورًا مش تختفي بصمت.
    let saveBtn = document.getElementById("moSaveBtn");
    if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = "⏳ جاري الحفظ..."; }

    try {
        let customerType = document.querySelector('input[name="moCustomerType"]:checked').value;
        let shipping = parseFloat(document.getElementById("moShipping").value) || 0;
        let status   = document.getElementById("moOrderStatus").value;
        let subTotal = moItemsCache.reduce((s,i) => s + (i.price*i.qty), 0);
        // ⭐ نظام الحسابات: قيمة أي خصم اتفق عليه الأدمن مع العميل يدوياً (بحد
        // أقصى قيمة السلة + الشحن، عشان الإجمالي منروحش بالسالب)
        let discEl = document.getElementById("moDiscount");
        let discount = discEl ? Math.max(0, parseFloat(discEl.value) || 0) : 0;
        if (discount > subTotal + shipping) discount = subTotal + shipping;
        let total    = subTotal + shipping - discount;

        // ⭐ نظام الخزنة: لو هيتحفظ الطلب مباشرة بحالة "تم التوصيل"، لازم نعرف
        // هيدخل الفلوس في أي حساب قبل ما نكمل
        let moDepositAccountId = null;
        if (status === "Delivered") {
            moDepositAccountId = document.getElementById("moDepositAccount").value;
            if (!moDepositAccountId) throw new Error("يرجى اختيار الحساب اللي استلمت فيه قيمة الطلب!");
        }

        let customerData, phoneKey, isNewCustomer = false, secretCode = null;

        if (customerType === "existing") {
            if (!moExistingCustomer) throw new Error("من فضلك دوّر على العميل بالتليفون واختاره من نتائج البحث الأول!");
            phoneKey = window.getShortPhone(moExistingCustomer.phone);
            let primaryAddr = moExistingCustomer.addresses && moExistingCustomer.addresses.find(a=>a.isPrimary)
                ? moExistingCustomer.addresses.find(a=>a.isPrimary).text
                : (moExistingCustomer.address || "غير محدد");
            customerData = { name: moExistingCustomer.name, phone: moExistingCustomer.phone, address: primaryAddr };
        } else {
            let name    = document.getElementById("moNewName").value.trim();
            let phone   = document.getElementById("moNewPhone").value.trim();
            let region  = document.getElementById("moNewRegion").value;
            let address = document.getElementById("moNewAddress").value.trim();
            phoneKey = window.getShortPhone(phone);
            if (!name || !phoneKey || phoneKey.length < 10 || !region || !address) {
                throw new Error("يرجى ملء جميع بيانات العميل الجديد (الاسم، التليفون، المنطقة، العنوان)!");
            }
            secretCode = document.getElementById("moSecretCode").value.trim();
            if (!secretCode || secretCode.length !== 6) throw new Error("الكود السري لازم يكون 6 أرقام!");

            // نتأكد الأول إن الرقم ده مش عميل مسجل بالفعل
            let existsSnap = await db.ref('/users/' + phoneKey).once('value');
            if (existsSnap.exists()) {
                throw new Error('الرقم ده مسجل بالفعل كعميل! اختر "عميل حالي" وابحث بيه بدل كده.');
            }

            let fullAddress = address + " - " + region;
            isNewCustomer = true;
            customerData = { name, phone: phoneKey, address: fullAddress };

            let newUser = {
                id: 'USR-' + phoneKey,
                name: name,
                phone: phoneKey,
                email: "",
                passwordHash: null,
                passwordSalt: null,
                passwordSet: false,
                accountActivationCode: secretCode,
                region: region,
                address: fullAddress,
                addresses: [{ id: Date.now(), text: fullAddress, isPrimary: true }],
                points: 0,
                joinDate: new Date().toLocaleDateString('en-GB'),
                joinTime: new Date().toLocaleTimeString('ar-EG'),
                isBlocked: false
            };
            await db.ref('/users/' + phoneKey).set(newUser);
        }

        // توليد رقم الطلب بنفس أسلوب باقي المشروع (Transaction على العداد)
        let counterSnap = await db.ref('/metadata/lastOrderId').transaction(v => (v || 1000) + 1);
        let newOrderId  = "ORD-" + counterSnap.snapshot.val();

        let hasWarranty = moItemsCache.some(it => it.warrantyMonths > 0);
        let warrantyToken = hasWarranty ? window.generateWarrantyToken() : null;

        let newOrder = {
            id: newOrderId,
            date: new Date().toLocaleDateString('en-GB'),
            subTotal: subTotal,
            shippingFee: shipping,
            total: total,
            discount: discount,
            promoCode: null,
            status: status,
            earnedPoints: 0,
            source: "manual",
            customer: customerData,
            items: moItemsCache.map(it => ({ id: it.id, price: it.price, qty: it.qty, warrantyMonths: it.warrantyMonths })),
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            warrantyToken: warrantyToken,
            warrantyStatus: hasWarranty ? "not_activated" : null,
            deliveredAt: status === "Delivered" ? Date.now() : null,
            activationCode: (isNewCustomer && hasWarranty) ? secretCode : null
        };

        // ⭐ نظام الحسابات: لو الطلب اليدوي اتعمل مباشرة بحالة "تم التوصيل"،
        // بنحسب وضعه المالي فوراً وقت الإنشاء (بنفس منطق changeOrderStatus)
        if (status === "Delivered") {
            let productsSnap = await db.ref('/products').once('value');
            let allProductsLive = productsSnap.exists()
                ? (Array.isArray(productsSnap.val()) ? productsSnap.val().filter(x=>x) : Object.values(productsSnap.val()).filter(x=>x))
                : [];
            newOrder.financeSnapshot = window.computeOrderFinance(newOrder, allProductsLive);
            newOrder.financeSnapshot.depositAccountId = moDepositAccountId;
        }

        await db.ref('/orders/' + newOrderId).set(newOrder);

        // خصم المخزون
        let stockOps = moItemsCache.map(it =>
            db.ref('/products/' + it.id + '/stock').transaction(s => Math.max(0, (s||0) - it.qty))
        );
        await Promise.all(stockOps);

        // ⭐ سجل حركة المخزون: تسجيل خروج كل منتج بسبب حجزه في هذا الطلب اليدوي
        if (typeof window.logStockMovement === 'function') {
            let productsForNames = JSON.parse(localStorage.getItem('eljory_products')) || [];
            moItemsCache.forEach(function(it) {
                let pName = (productsForNames.find(x => x.id === it.id) || {}).titleAr || it.id;
                window.logStockMovement({
                    productId: it.id, titleAr: pName, type: 'out', qty: it.qty,
                    reason: `خروج بسبب طلب واتساب يدوي رقم ${newOrderId}`
                });
            });
        }

        // ⭐ نظام الخزنة: تسجيل إيراد البيع في الحساب المختار (فقط لو اتحفظ الطلب
        // مباشرة بحالة "تم التوصيل")
        if (status === "Delivered" && moDepositAccountId) {
            await window.logTreasuryTransaction({
    accountId: moDepositAccountId, type: 'sale_revenue', amount: total + discount,
    reason: `إيراد بيع - طلب واتساب يدوي رقم ${newOrderId}`, relatedOrderId: newOrderId
});
            // ⭐ لو فيه خصم مكتوب في الفورم، بيتسجل تلقائياً كمصروف تسويقي
            // ويتخصم من نفس الحساب اللي استلمنا فيه قيمة الطلب فوق مباشرة.
            await window.recordDiscountExpense(newOrder, newOrderId, moDepositAccountId);
        }

        alert("✅ تم حفظ الطلب بنجاح! رقم الطلب: " + newOrderId
            + (discount > 0 ? `\nتم تسجيل الخصم (${discount} ج.م) كمصروف تسويقي تلقائياً.` : ""));
        closeManualOrderModal();

        // فتح الفاتورة فورًا للطباعة (من غير ما ننتظر مزامنة localStorage)
        document.getElementById("printArea").innerHTML = generateInvoiceTemplate(newOrder);
        document.getElementById("invoiceModal").style.display = "flex";
    } catch (err) {
        console.error(err);
        alert("❌ " + (err && err.message ? err.message : "حدث خطأ غير متوقع أثناء حفظ الطلب، حاول مرة أخرى."));
    } finally {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = "💾 حفظ الطلب وطباعة الفاتورة"; }
    }
};



// ================================================================
// ⑩ إدارة الطلبات والفواتير (Orders & Invoices)
// ================================================================

window.toggleAllOrders = function(source) {
    document.querySelectorAll('.order-checkbox').forEach(cb => cb.checked = source.checked);
};

// ⭐ ترقيم صفحات الطلبات — حجم الصفحة قابل للتغيير من الأدمن نفسه (يتحفظ في
// localStorage عشان يفضل نفس الاختيار في المرة الجاية)
window.getOrdersPageSize = function() {
    let sel = document.getElementById("ordersPageSizeSelect");
    if (sel && sel.value) {
        let v = parseInt(sel.value) || 20;
        localStorage.setItem("admin_orders_page_size", v);
        return v;
    }
    return parseInt(localStorage.getItem("admin_orders_page_size")) || 20;
};

window._ordersCurrentPage = window._ordersCurrentPage || 1;

window.goToOrdersPage = function(page) {
    window._ordersCurrentPage = page;
    loadAdminOrders();
    let tbl = document.getElementById("adminOrdersBody");
    if (tbl) tbl.closest('table').scrollIntoView({ behavior: "smooth", block: "start" });
};

// ⭐ يُستدعى من أي فلتر بيتغير عشان يرجعنا لصفحة 1 دايماً (منعاً لواقفين في
// صفحة قديمة ممكن تبقى فاضية بعد الفلترة الجديدة)
window.loadAdminOrdersFiltered = function() {
    window._ordersCurrentPage = 1;
    loadAdminOrders();
};

function renderOrdersPagination(totalItems, pageSize) {
    let box = document.getElementById("adminOrdersPagination");
    if (!box) return;
    let totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    if (window._ordersCurrentPage > totalPages) window._ordersCurrentPage = totalPages;
    if (totalPages <= 1) { box.innerHTML = ""; return; }
    let cur = window._ordersCurrentPage;
    let html = `<button class="btn" style="background:#6c757d;padding:6px 12px;" ${cur<=1?'disabled':''} onclick="goToOrdersPage(${cur-1})">‹ السابق</button>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="btn" style="padding:6px 12px;${i===cur?'background:#f38c18;color:#1d364a;':'background:#1d364a;'}" onclick="goToOrdersPage(${i})">${i}</button>`;
    }
    html += `<button class="btn" style="background:#6c757d;padding:6px 12px;" ${cur>=totalPages?'disabled':''} onclick="goToOrdersPage(${cur+1})">التالي ›</button>`;
    box.innerHTML = html;
}

// ⭐ استخراج وقت إنشاء الطلب (ساعة:دقيقة) من الـ timestamp المسجل وقت الحفظ
window.getOrderTimeStr = function(order) {
    if (!order || !order.timestamp) return '—';
    try {
        return new Date(order.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return '—'; }
};

window.loadAdminOrders = function() {
    let orders      = JSON.parse(localStorage.getItem("eljory_orders")) || [];
    let tbody       = document.getElementById("adminOrdersBody");
    if(!tbody) return;
    let pageSizeSel = document.getElementById("ordersPageSizeSelect");
    if (pageSizeSel && !pageSizeSel.dataset.initedFromStorage) {
        let saved = localStorage.getItem("admin_orders_page_size");
        if (saved) pageSizeSel.value = saved;
        pageSizeSel.dataset.initedFromStorage = "1";
    }
    let filterId    = document.getElementById("filterOrderId") ? document.getElementById("filterOrderId").value.trim().toLowerCase() : "";
    let filterPhone = document.getElementById("filterPhone")   ? document.getElementById("filterPhone").value.trim() : "";
    let filterStatus= document.getElementById("filterStatus")  ? document.getElementById("filterStatus").value : "all";
    let fromEl = document.getElementById("filterDateFrom");
    let toEl   = document.getElementById("filterDateTo");
    let fromTs = (fromEl && fromEl.value) ? new Date(fromEl.value).getTime() : null;
    let toTs   = (toEl   && toEl.value)   ? new Date(toEl.value).getTime()   : null;

    tbody.innerHTML = "";
    if(document.getElementById("selectAllOrders")) document.getElementById("selectAllOrders").checked = false;

    let visibleOrders = [];

    // ⭐ خطوة أولى: فلترة كل الطلبات (من غير ترقيم) — دي القايمة الكاملة اللي
    // بتتصدّر لملف Excel وبنحسب منها إجمالي الصفحات
    [...orders].reverse().forEach(order => {
        let c  = order.customer || {};
        let st = order.status   || "Pending";
        if(filterId    && !order.id.toLowerCase().includes(filterId)) return;
        if(filterPhone && (!c.phone || !c.phone.includes(filterPhone))) return;
        if(filterStatus !== "all") {
            if(filterStatus === "Pending" && st !== "Pending" && st !== "Processing") return;
            if(filterStatus !== "Pending" && st !== filterStatus) return;
        }
        // فلترة بالتاريخ اعتماداً على timestamp لو موجود عند الطلب
        if((fromTs || toTs) && order.timestamp) {
            if(fromTs && order.timestamp < fromTs) return;
            if(toTs   && order.timestamp > toTs)   return;
        }
        visibleOrders.push(order);
    });

    window._lastFilteredOrders = visibleOrders;

    // ⭐ خطوة ثانية: تقسيم القايمة المفلترة على صفحات وعرض صفحة الأدمن الحالية بس
    let pageSize   = window.getOrdersPageSize();
    let totalPages = Math.max(1, Math.ceil(visibleOrders.length / pageSize));
    if (window._ordersCurrentPage > totalPages) window._ordersCurrentPage = totalPages;
    if (window._ordersCurrentPage < 1) window._ordersCurrentPage = 1;
    let startIdx = (window._ordersCurrentPage - 1) * pageSize;
    let pageOrders = visibleOrders.slice(startIdx, startIdx + pageSize);

    if (!pageOrders.length) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:gray;padding:25px;">لا توجد طلبات مطابقة.</td></tr>';
        renderOrdersPagination(visibleOrders.length, pageSize);
        return;
    }

    pageOrders.forEach(order => {
        let c  = order.customer || {};
        let st = order.status   || "Pending";

        let statusText = "", statusColor = "", actionBtns = "";
        if(st === "Pending" || st === "Processing") {
            statusText = "تم الطلب ⏳"; statusColor = "#f38c18";
            actionBtns = `<button class="btn" style="background:#17a2b8;margin-bottom:5px;" onclick="changeOrderStatus('${order.id}','Shipped')">🚚 شحن</button>
                          <button class="btn btn-green" style="margin-bottom:5px;" onclick="changeOrderStatus('${order.id}','Delivered')">✅ توصيل</button>
                          <button class="btn btn-red" style="margin-bottom:5px;" onclick="cancelOrderAdmin('${order.id}')">❌ إلغاء</button>
                          <button class="btn" style="background:#6c757d;margin-bottom:5px;" onclick="openEditOrderModal('${order.id}')">✏️ تعديل الطلب</button>`;
        } else if(st === "Shipped") {
            statusText = "تم الشحن 🚚"; statusColor = "#17a2b8";
            actionBtns = `<button class="btn btn-green" style="margin-bottom:5px;" onclick="changeOrderStatus('${order.id}','Delivered')">✅ توصيل</button>
                          <button class="btn btn-red" onclick="cancelOrderAdmin('${order.id}')">❌ إلغاء</button>`;
        } else if(st === "Delivered") {
            statusText = "تم التوصيل ✅"; statusColor = "#28a745";
            actionBtns = `<span style="color:gray;font-size:12px;font-weight:bold;">مكتملة</span>`;
        } else if(st === "Cancelled") {
            statusText = "تم الإلغاء ❌"; statusColor = "#d9534f";
            actionBtns = `<span style="color:gray;font-size:12px;font-weight:bold;">ملغي</span>`;
        }

        // ── من غيّر آخر حالة (أدمن أو عميل) ──
        let lastChangeHtml = "—";
        if (order.statusHistory && order.statusHistory.length) {
            let last = order.statusHistory[order.statusHistory.length - 1];
            let who  = last.byType === 'customer' ? `العميل (${last.by})` : `أدمن: ${last.by}`;
            lastChangeHtml = `<small>${last.status}<br>${who}<br>${last.date}</small>`;
        }

        // ── ⭐ الحالة المالية (نظام الحسابات) ──
        let financeHtml = '<span style="color:gray;font-size:12px;">— غير مطلوب بعد</span>';
        let fs = order.financeSnapshot;
        if (st === "Delivered") {
            if (fs && fs.computed && !fs.reversed) {
                financeHtml = `<span style="color:#28a745;font-weight:bold;font-size:12px;">✅ محسوب</span><br>
                    <small style="color:#555;">ربح: ${fs.profit} ج.م</small><br>
                    <button class="btn" style="background:#6c757d;padding:3px 8px;font-size:11px;margin-top:4px;" onclick="recalcOrderFinance('${order.id}')">🔄 إعادة احتساب</button>`;
            } else if (fs && fs.reversed) {
                financeHtml = '<span style="color:#d9534f;font-weight:bold;font-size:12px;">↩️ ملغي (مش محسوب)</span>';
            } else {
                financeHtml = `<span style="color:#f38c18;font-weight:bold;font-size:12px;">⚠️ مستبعد (تكلفة ناقصة)</span><br>
                    <button class="btn" style="background:#6c757d;padding:3px 8px;font-size:11px;margin-top:4px;" onclick="recalcOrderFinance('${order.id}')">🔄 حاول تاني</button>`;
            }
        }

        tbody.innerHTML += `<tr>
            <td style="text-align:center;"><input type="checkbox" class="order-checkbox" value="${order.id}" style="width:18px;height:18px;cursor:pointer;"></td>
            <td><strong>${order.id}</strong></td>
            <td>${order.date}</td>
            <td>${window.getOrderTimeStr(order)}</td>
            <td><strong>${c.name}</strong><br><small>📞 ${c.phone}</small></td>
            <td style="color:#f38c18;font-weight:bold;">${order.total} ج.م</td>
            <td style="color:${statusColor};font-weight:bold;">${statusText}</td>
            <td>${financeHtml}</td>
            <td>${lastChangeHtml}</td>
            <td><button class="btn" style="background:#1d364a;margin-bottom:5px;" onclick="openInvoice('${order.id}')">👁️ الفاتورة</button><br>${actionBtns}</td>
        </tr>`;
    });

    renderOrdersPagination(visibleOrders.length, pageSize);
};

// ── تصدير جميع الطلبات الظاهرة حالياً بعد الفلترة (أو كل الطلبات لو مفيش فلاتر) ──
window.exportFilteredOrdersCSV = function() {
    let orders = (window._lastFilteredOrders && window._lastFilteredOrders.length)
        ? window._lastFilteredOrders
        : JSON.parse(localStorage.getItem("eljory_orders")) || [];
    if(!orders.length) return alert("لا توجد طلبات لتصديرها بالفلتر الحالي!");
    let esc = v => `"${String(v===undefined||v===null?'':v).replace(/"/g,'""')}"`;
    let csv = "رقم الطلب;التاريخ;الوقت;اسم العميل;التليفون;العنوان;المنتجات;الإجمالي الفرعي;الشحن;الإجمالي;الحالة;آخر تعديل بواسطة\r\n";
    orders.forEach(o => {
        let c = o.customer || {};
        let itemsStr = (o.items||[]).map(i => `${i.id} x${i.qty}`).join(' | ');
        let lastBy = "";
        if (o.statusHistory && o.statusHistory.length) {
            let last = o.statusHistory[o.statusHistory.length-1];
            lastBy = (last.byType==='customer'?'عميل: ':'أدمن: ') + last.by + ' - ' + last.date;
        }
        csv += [esc(o.id), esc(o.date), esc(window.getOrderTimeStr(o)), esc(c.name), esc(c.phone), esc(c.address),
                esc(itemsStr), esc(o.subTotal||''), esc(o.shippingFee||0), esc(o.total),
                esc(o.status||'Pending'), esc(lastBy)].join(';') + '\r\n';
    });
    let bom  = new Uint8Array([0xEF,0xBB,0xBF]);
    let blob = new Blob([bom, csv], { type:'text/csv;charset=utf-8;' });
    let url  = URL.createObjectURL(blob);
    let link = document.createElement('a');
    link.href = url;
    link.download = `ElJory_Orders_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
};

// ── تصدير "شيت مبيعات المنتجات" ── كل منتج في كل طلب بيطلع سطر مستقل لوحده
// بدل ما يتجمع كل طلب في صف واحد (زي "تصدير الطلبات")، عشان يقدر
// يعمل بيه تحليل مبيعات لكل منتج على حدة براحته (فلترة / تجميع / مقارنة...الخ).
// السعر "قبل الخصم" = سعر الوحدة × الكمية زي ما هو مسجل في الطلب، و"السعر بعد
// الخصم" بنوزّع قيمة خصم الفاتورة كلها (لو موجود) على كل منتج بالتناسب مع قيمته
// من إجمالي الفاتورة (مفيش طريقة دقيقة لتوزيع خصم على مستوى المنتج الواحد لأن الطلب ما بيحفظش إلا قيمة خصم إجمالية واحدة).
window.exportProductSalesCSV = function() {
    let orders = (window._lastFilteredOrders && window._lastFilteredOrders.length)
        ? window._lastFilteredOrders
        : JSON.parse(localStorage.getItem("eljory_orders")) || [];
    if(!orders.length) return alert("لا توجد طلبات لتصديرها بالفلتر الحالي!");
    let products = JSON.parse(localStorage.getItem("eljory_products")) || [];
    let esc = v => `"${String(v===undefined||v===null?'':v).replace(/"/g,'""')}"`;
    let csv = "رقم الأوردر;اسم العميل;رقم تليفون العميل;منطقة العميل;اسم المنتج;كود المنتج;الكمية;السعر قبل الخصم;السعر بعد الخصم\r\n";
    let rowCount = 0;
    orders.forEach(o => {
        let items = o.items || [];
        if (!items.length) return;
        let c = o.customer || {};
        let region = window.getRegionFromAddressText ? window.getRegionFromAddressText(c.address || "") : "";
        let subTotal = items.reduce((s,it) => s + ((it.price||0) * (it.qty||0)), 0);
        let discount = parseFloat(o.discount) || 0;
        items.forEach(it => {
            let p = products.find(x => x.id === it.id);
            let name = p ? p.titleAr : it.id;
            let lineTotal = (it.price||0) * (it.qty||0);
            let lineDiscount = (discount > 0 && subTotal > 0) ? (discount * (lineTotal / subTotal)) : 0;
            let afterDiscount = Math.max(0, lineTotal - lineDiscount);
            csv += [
                esc(o.id), esc(c.name), esc(c.phone), esc(region),
                esc(name), esc(it.id), esc(it.qty),
                esc(lineTotal.toFixed(2)), esc(afterDiscount.toFixed(2))
            ].join(";") + "\r\n";
            rowCount++;
        });
    });
    if (!rowCount) return alert("مفيش منتجات في الطلبات المفلترة الحالية!");
    let bom  = new Uint8Array([0xEF,0xBB,0xBF]);
    let blob = new Blob([bom, csv], { type:'text/csv;charset=utf-8;' });
    let url  = URL.createObjectURL(blob);
    let link = document.createElement('a');
    link.href = url;
    link.download = `ElJory_ProductSales_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
};

// ================================================================
// ⭐ نظام الحسابات — احتساب الوضع المالي لطلب معين (Finance Snapshot)
// ================================================================
// بيتحسب فقط لحظة ما الطلب يتحول لأول مرة لحالة "تم التوصيل"، وبيقرا سعر
// التكلفة الحالي (Live) لكل منتج في الطلب وقتها بالظبط ويجمّده جوه الطلب.
// لو أي منتج في الطلب لسه معندوش سعر تكلفة مكتوب (costPrice === undefined)،
// الطلب كله بيتستبعد من الحسابات المالية (computed:false) لحد ما تحدّث تكلفة
// المنتج وتعمل "إعادة احتساب" يدوي من جدول الطلبات.
window.computeOrderFinance = function(order, allProducts) {
    let items = order.items || [];
    if (!items.length) return { computed:false, reason:'no_items', computedAt: Date.now() };

    let missingCostItem = null;
    let lineDetails = [];
    let revenue = 0, cost = 0;

    for (let it of items) {
        let p = (allProducts || []).find(x => x.id === it.id);
        let unitCost = p ? p.costPrice : undefined;
        if (unitCost === undefined || unitCost === null || isNaN(parseFloat(unitCost))) {
            missingCostItem = it.id;
            break;
        }
        unitCost = parseFloat(unitCost);
        let lineRevenue = (it.price || 0) * (it.qty || 0);
        let lineCost    = unitCost * (it.qty || 0);
        revenue += lineRevenue;
        cost    += lineCost;
        lineDetails.push({ id: it.id, qty: it.qty, unitPrice: it.price, unitCost, lineRevenue, lineCost });
    }

    if (missingCostItem) {
        return {
            computed: false,
            reason: 'missing_cost',
            missingProductId: missingCostItem,
            computedAt: Date.now()
        };
    }

    return {
        computed: true,
        reason: null,
        revenue: revenue,                // إجمالي قيمة المنتجات (بدون شحن)
        cost: cost,                      // إجمالي تكلفة المنتجات
        profit: revenue - cost,          // صافي ربح المنتجات (قبل خصم أي مصاريف عامة)
        shippingFee: order.shippingFee || 0,
        items: lineDetails,
        computedAt: Date.now(),
        reversed: false
    };
};

// ⭐ إعادة احتساب الوضع المالي لطلب "تم التوصيل" بالفعل — مفيدة لو الطلب
// كان مستبعد أول مرة لعدم وجود تكلفة، وبعدين كتبت تكلفة المنتج وعايز
// تحدّث الطلب القديم يدوياً بدل ما يفضل مستبعد للأبد.
window.recalcOrderFinance = function(orderId) {
    let orders   = JSON.parse(localStorage.getItem("eljory_orders"))   || [];
    let products = JSON.parse(localStorage.getItem("eljory_products")) || [];
    let order = orders.find(o => o.id === orderId);
    if (!order) return alert("الطلب غير موجود!");
    if (order.status !== "Delivered") return alert("إعادة الاحتساب متاحة فقط للطلبات (تم التوصيل).");

    let snapshot = window.computeOrderFinance(order, products);
    // نحافظ على الحساب اللي كان اتحدد وقت التوصيل الأصلي (لو موجود) عشان
    // إعادة الاحتساب متمسحوش الربط بين الطلب والحساب اللي استلم فلوسه فعلاً
    if (order.financeSnapshot && order.financeSnapshot.depositAccountId) {
        snapshot.depositAccountId = order.financeSnapshot.depositAccountId;
    }
    db.ref('/orders/' + orderId + '/financeSnapshot').set(snapshot).then(() => {
        if (snapshot.computed) {
            alert(`✅ تم احتساب الطلب مالياً!\nالإيراد: ${snapshot.revenue} ج.م — التكلفة: ${snapshot.cost} ج.م — الربح: ${snapshot.profit} ج.م`);
        } else {
            alert(`⚠️ لسه فيه منتج (${snapshot.missingProductId}) من غير سعر تكلفة — اكتب تكلفته الأول ثم أعد الاحتساب.`);
        }
    });
};

window.changeOrderStatus = function(orderId, newStatus) {
    let orders = JSON.parse(localStorage.getItem("eljory_orders")) || [];
    let order  = orders.find(o => o.id === orderId);
    if(!order) return;
    let oldStatus = order.status;

    // ⭐ نظام الخزنة: لو الطلب بيتحول لأول مرة لـ"تم التوصيل"، لازم الأدمن
    // يختار الحساب اللي هتستلم فيه قيمة الفاتورة قبل ما نكمل أي حفظ. بنفتح
    // مودال اختيار الحساب وبنوقف هنا؛ finalizeDeliverOrder هي اللي هتكمل
    // باقي الخطوات (تحديث الحالة + الاحتساب المالي + إيداع الخزنة + النقاط)
    // بعد ما الأدمن يأكد اختياره.
    if (newStatus === "Delivered" && oldStatus !== "Delivered") {
        window.openDeliveryAccountModal(orderId, oldStatus);
        return;
    }

    let adminEmail = (firebase.auth().currentUser && firebase.auth().currentUser.email) || 'غير معروف';
    let historyEntry = {
        status: newStatus,
        by: adminEmail,
        byType: 'admin',
        date: new Date().toLocaleString('ar-EG')
    };
    let newHistory = (order.statusHistory || []).concat([historyEntry]);

    // ⭐ نظام الضمان: بنسجّل "تاريخ التسليم الفعلي" أول مرة بس الطلب يتحول لحالة
    // "تم التوصيل"، ومنعملش تحديث تاني ليه لو الحالة اتغيرت بعد كده (تفادياً لإعادة
    // ضبط عداد مهلة تفعيل الضمان بالغلط لو الأدمن رجّع الحالة وقدّمها تاني).
    // ⚠️ ملحوظة: أي انتقال لحالة "Delivered" اتلقط بالفعل فوق وخرج من الدالة
    // (return) عن طريق مودال اختيار حساب الاستلام — finalizeDeliverOrder هي
    // اللي بتكمل تسجيل deliveredAt والاحتساب المالي والخزنة والنقاط. الكود اللي
    // كان هنا قبل كده مبنيّ على نفس شرط "newStatus === Delivered && oldStatus
    // !== Delivered"، وهو شرط مستحيل يتحقق في المسار ده (لأن أي حالة زيه كانت
    // هترجع فوق قبل ما توصل هنا)، فتم حذفه كـ "كود ميت" بدل ما يتكرر بلا فايدة.
    let orderUpdates = { status: newStatus, statusHistory: newHistory };

    db.ref('/orders/' + orderId).update(orderUpdates).then(() => {
        alert("تم تغيير حالة الطلب بنجاح!");
    });
};

window.cancelOrderAdmin = function(orderId) {
    if(!confirm("هل أنت متأكد من إلغاء هذا الطلب وإرجاع المنتجات للمخزون؟")) return;
    let orders = JSON.parse(localStorage.getItem("eljory_orders")) || [];
    let order  = orders.find(o => o.id === orderId);
    if(!order) return;

    let adminEmail = (firebase.auth().currentUser && firebase.auth().currentUser.email) || 'غير معروف';
    let historyEntry = { status:'Cancelled', by: adminEmail, byType:'admin', date: new Date().toLocaleString('ar-EG') };
    let newHistory = (order.statusHistory || []).concat([historyEntry]);

    let cancelUpdates = { status:"Cancelled", statusHistory: newHistory };
    // ⭐ نظام الحسابات: لو الطلب ده كان اتحسب مالياً بالفعل (كان "تم التوصيل"
    // واتحسب ربحه)، دلوقتي بيتلغي — بنعلّم عليه reversed:true بدل ما نمسح
    // الأرقام، عشان تقارير الأرباح متحسبوش الطلب ده تاني، مع الاحتفاظ بالسجل
    // التاريخي كامل لأي مراجعة لاحقة.
    let needsTreasuryReversal = false;
    if (order.financeSnapshot && order.financeSnapshot.depositAccountId && !order.financeSnapshot.reversed) {
        cancelUpdates['financeSnapshot/reversed'] = true;
        needsTreasuryReversal = true;
    }

    // ⭐ نظام الحسابات: لو الطلب ده كان اتسجل له مصروف "خصم كوبون" تلقائي وقت
    // التوصيل (discountExpenseId موجود) ولسه ما اترجعش، دلوقتي بعد الإلغاء
    // بنرجّع قيمته لنفس الحساب (عكس المصروف) عشان رصيد الخزنة يفضل صحيح.
    let needsDiscountReversal = !!(order.discountExpenseId && !order.discountReversed && order.financeSnapshot && order.financeSnapshot.depositAccountId);
    if (needsDiscountReversal) {
        cancelUpdates['discountReversed'] = true;
    }

    db.ref('/orders/' + orderId).update(cancelUpdates).then(() => {
        if(order.items) order.items.forEach(item => {
            db.ref('/products/' + item.id + '/stock').transaction(stock => (stock||0) + item.qty);
        });
        // ⭐ سجل حركة المخزون: تسجيل رجوع كل منتج للمخزون بسبب إلغاء الطلب
        if (order.items && typeof window.logStockMovement === 'function') {
            let productsForNames = JSON.parse(localStorage.getItem('eljory_products')) || [];
            order.items.forEach(function(item) {
                let pName = (productsForNames.find(x => x.id === item.id) || {}).titleAr || item.id;
                window.logStockMovement({
                    productId: item.id, titleAr: pName, type: 'in', qty: item.qty,
                    reason: `رجوع للمخزون بسبب إلغاء الطلب رقم ${order.id}`
                });
            });
        }
        // ⭐ نظام الخزنة: لو قيمة الفاتورة كانت اتحطت فعلاً في حساب معين، بنسحبها
        // منه تاني (عكس الإيداع) عشان رصيد الخزنة يفضل مطابق للواقع بعد الإلغاء.
        if (needsTreasuryReversal) {
    window.logTreasuryTransaction({
        accountId: order.financeSnapshot.depositAccountId,
        type: 'sale_reversal',
        amount: order.total + (parseFloat(order.discount) || 0),
        reason: `عكس إيراد بيع بسبب إلغاء الطلب رقم ${order.id}`,
        relatedOrderId: order.id
    });
}
        if (needsDiscountReversal) {
            let discountVal = parseFloat(order.discount) || 0;
            if (discountVal > 0) {
                window.logTreasuryTransaction({
                    accountId: order.financeSnapshot.depositAccountId,
                    type: 'deposit',
                    amount: discountVal,
                    reason: `استرجاع خصم كوبون بسبب إلغاء الطلب رقم ${order.id}`,
                    relatedOrderId: order.id, relatedExpenseId: order.discountExpenseId
                });
            }
        }
        alert("تم الإلغاء بنجاح!"
            + (needsTreasuryReversal ? "\nتم عكس قيمة الفاتورة من الخزنة تلقائياً." : "")
            + (needsDiscountReversal ? "\nتم استرجاع مصروف خصم الكوبون تلقائياً." : ""));
    });
};

// ── تعديل الطلب: إضافة/حذف منتجات، تعديل الكميات ومصاريف الشحن ──
let editOrderItemsCache = [];
let editOrderOriginalReserved = {}; // { productId: qty } الكمية المحجوزة أصلاً لهذا الطلب قبل أي تعديل

window.openEditOrderModal = function(orderId) {
    let orders = JSON.parse(localStorage.getItem("eljory_orders")) || [];
    let order  = orders.find(o => o.id === orderId);
    if(!order) return;
    document.getElementById("editOrderId").value = orderId;
    document.getElementById("editOrderIdLabel").innerText = orderId;
    editOrderItemsCache = JSON.parse(JSON.stringify(order.items || []));

    // نحسب الكمية المحجوزة أصلاً لكل منتج في هذا الطلب (لأن الكمية دي هتترجع
    // للمخزون تلقائياً عند الحفظ، فمسموح نستخدمها كجزء من "المتاح" أثناء التعديل)
    editOrderOriginalReserved = {};
    (order.items || []).forEach(it => {
        editOrderOriginalReserved[it.id] = (editOrderOriginalReserved[it.id] || 0) + it.qty;
    });

    document.getElementById("editOrderShipping").value = order.shippingFee || 0;

    let products = JSON.parse(localStorage.getItem("eljory_products")) || [];
    let sel = document.getElementById("editOrderAddProdSelect");
    sel.innerHTML = '<option value="">-- اختر منتج لإضافته --</option>' +
        products.map(p => `<option value="${p.id}">${p.titleAr} (${p.price} ج.م) — متاح: ${p.stock}</option>`).join('');

    renderEditOrderItems();
    document.getElementById("editOrderModal").style.display = "flex";
};

// الحد الأقصى المسموح لكمية منتج معين داخل هذا الطلب = المخزون الحالي +
// أي كمية من نفس المنتج محجوزة أصلاً لنفس الطلب (لأنها هترجع للمخزون تلقائياً)
function getEditOrderAvailableStock(productId) {
    let products = JSON.parse(localStorage.getItem("eljory_products")) || [];
    let p = products.find(x => x.id === productId);
    let currentStock = p ? (parseInt(p.stock) || 0) : 0;
    let reserved = editOrderOriginalReserved[productId] || 0;
    return currentStock + reserved;
}

function renderEditOrderItems() {
    let products = JSON.parse(localStorage.getItem("eljory_products")) || [];
    let box = document.getElementById("editOrderItemsBox");
    if (!editOrderItemsCache.length) {
        box.innerHTML = '<p style="color:gray;">لا توجد منتجات في الطلب.</p>';
    } else {
        box.innerHTML = editOrderItemsCache.map((it, idx) => {
            let p = products.find(x => x.id === it.id);
            let name = p ? p.titleAr : it.id;
            let maxAvail = getEditOrderAvailableStock(it.id);
            return `<div style="display:flex;gap:10px;align-items:center;background:#f9f9f9;padding:10px;border-radius:6px;margin-bottom:8px;">
                <span style="flex:2;">${name} <small style="color:gray;">(${it.id})</small><br><small style="color:#f38c18;">أقصى متاح: ${maxAvail}</small></span>
                <input type="number" min="1" max="${maxAvail}" value="${it.qty}" style="width:70px;" class="form-control"
                       onchange="editOrderChangeQty(${idx}, this)">
                <span style="flex:1;">${it.price} ج.م / وحدة</span>
                <button class="btn btn-red" onclick="editOrderRemoveItem(${idx})">🗑️</button>
            </div>`;
        }).join('');
    }
    updateEditOrderTotal();
}

window.editOrderChangeQty = function(idx, inputEl) {
    let it = editOrderItemsCache[idx];
    if (!it) return;
    let maxAvail = getEditOrderAvailableStock(it.id);
    let requested = parseInt(inputEl.value) || 1;
    if (requested > maxAvail) {
        alert(`أقصى كمية متاحة لهذا المنتج هي ${maxAvail} (حسب المخزون الفعلي)!`);
        requested = maxAvail > 0 ? maxAvail : 1;
    }
    if (requested < 1) requested = 1;
    it.qty = requested;
    inputEl.value = requested;
    updateEditOrderTotal();
};

window.editOrderAddProduct = function() {
    let sel = document.getElementById("editOrderAddProdSelect");
    let id  = sel.value;
    if (!id) return;
    let products = JSON.parse(localStorage.getItem("eljory_products")) || [];
    let p = products.find(x => x.id === id);
    if (!p) return;
    let maxAvail = getEditOrderAvailableStock(id);
    if (maxAvail <= 0) { alert("عذراً، لا يوجد مخزون متاح من هذا المنتج!"); return; }
    let existing = editOrderItemsCache.find(i => i.id === id);
    if (existing) {
        if (existing.qty + 1 > maxAvail) {
            alert(`أقصى كمية متاحة لهذا المنتج هي ${maxAvail} (حسب المخزون الفعلي)!`);
        } else {
            existing.qty += 1;
        }
    } else {
        editOrderItemsCache.push({ id: p.id, price: p.price, qty: 1, warrantyMonths: parseInt(p.warrantyMonths) || 0 });
    }
    renderEditOrderItems();
};

window.editOrderRemoveItem = function(idx) {
    editOrderItemsCache.splice(idx, 1);
    renderEditOrderItems();
};

window.updateEditOrderTotal = function() {
    let subtotal = editOrderItemsCache.reduce((s,i) => s + (i.price*i.qty), 0);
    let shipping = parseFloat(document.getElementById("editOrderShipping").value) || 0;
    document.getElementById("editOrderTotalPreview").innerText = (subtotal + shipping);
};

window.saveOrderEdit = function() {
    let orderId  = document.getElementById("editOrderId").value;
    let shipping = parseFloat(document.getElementById("editOrderShipping").value) || 0;
    if (!editOrderItemsCache.length) return alert("لازم يكون فيه منتج واحد على الأقل في الطلب!");

    let orders = JSON.parse(localStorage.getItem("eljory_orders")) || [];
    let order  = orders.find(o => o.id === orderId);
    if (!order) return;

    let oldItems = order.items || [];
    let subTotal = editOrderItemsCache.reduce((s,i) => s + (i.price*i.qty), 0);
    let total    = subTotal + shipping;

    let adminEmail = (firebase.auth().currentUser && firebase.auth().currentUser.email) || 'غير معروف';
    let historyEntry = { status:'تعديل الطلب (المنتجات/الكمية)', by: adminEmail, byType:'admin', date: new Date().toLocaleString('ar-EG') };
    let newHistory = (order.statusHistory || []).concat([historyEntry]);

    let hasWarrantyNow = editOrderItemsCache.some(it => (parseInt(it.warrantyMonths) || 0) > 0);
    let orderUpdates = {
        items: editOrderItemsCache,
        subTotal: subTotal,
        shippingFee: shipping,
        total: total,
        statusHistory: newHistory
    };
    if (hasWarrantyNow && !order.warrantyToken) {
        orderUpdates.warrantyToken = window.generateWarrantyToken();
        orderUpdates.warrantyStatus = "not_activated";
    }

    db.ref('/orders/' + orderId).update(orderUpdates).then(() => {
        // تسوية المخزون: نرجّع الكميات القديمة كلها ثم نخصم الكميات الجديدة
        let stockOps = oldItems.map(oi =>
            db.ref('/products/'+oi.id+'/stock').transaction(s => (s||0) + oi.qty)
        );
        Promise.all(stockOps).then(() => {
            let newOps = editOrderItemsCache.map(ni =>
                db.ref('/products/'+ni.id+'/stock').transaction(s => Math.max(0,(s||0) - ni.qty))
            );
            return Promise.all(newOps);
        }).then(() => {
            alert("تم تعديل الطلب وتسوية المخزون بنجاح!");
            closeEditOrderModal();
        });
    });
};

window.closeEditOrderModal = function() {
    document.getElementById("editOrderModal").style.display = "none";
};

window.openInvoice = function(orderId) {
    let orders   = JSON.parse(localStorage.getItem("eljory_orders")) || [];
    let order    = orders.find(o => o.id === orderId);
    if(!order) return;
    document.getElementById("printArea").innerHTML = generateInvoiceTemplate(order);
    document.getElementById("invoiceModal").style.display  = "flex";
};

window.printSingleInvoice = function() {
    printContentViaIframe(`<div class="page-break">${document.getElementById("printArea").innerHTML}</div>`);
};

window.printSelectedOrders = function() {
    let checkboxes = document.querySelectorAll('.order-checkbox:checked');
    if(!checkboxes.length) { alert("يرجى تحديد طلب واحد على الأقل للطباعة"); return; }
    let orders = JSON.parse(localStorage.getItem("eljory_orders")) || [];
    let allInvoicesHtml = "";
    checkboxes.forEach(cb => {
        let order = orders.find(o => o.id === cb.value); if(!order) return;
        allInvoicesHtml += `<div class="page-break">${generateInvoiceTemplate(order)}</div>`;
    });
    printContentViaIframe(allInvoicesHtml);
};

window.printContentViaIframe = function(content) {
    let iframe   = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    let basePath = window.location.href.split('?')[0];
    basePath = basePath.substring(0, basePath.lastIndexOf('/') + 1);
    let html = `<html dir="rtl"><head><title>طباعة الفاتورة - El Jory Store</title><base href="${basePath}">
        <style>
            @page { margin: 0; }
            html, body { font-family:'Segoe UI',Tahoma,Arial,sans-serif; background:white; margin:0; padding:0; }
            * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; box-sizing:border-box; }
            .page-break { page-break-after:always; page-break-inside:avoid; width:100%; overflow:visible; margin:0; padding:0; }
            .page-break:last-child { page-break-after:auto; }
            .page-break > div, #printArea { width:100% !important; max-width:100% !important; height:auto; margin:0 !important; padding:0 !important; }
            table { font-size:16px !important; margin-bottom:0 !important; }
            td { padding:4px !important; }
        </style>
    </head><body>${content}<script>window.onload=function(){setTimeout(()=>{window.print();},800);}<\/script></body></html>`;
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(html);
    iframe.contentWindow.document.close();
    setTimeout(() => { document.body.removeChild(iframe); }, 5000);
};

window.generateInvoiceTemplate = function(order) {
    let allProds = JSON.parse(localStorage.getItem("eljory_products")) || [];
    let c        = order.customer || {};
    let invNum   = "INV-" + String(order.id).replace(/\D/g,'');
    let payStatus= order.status === "Delivered" ? "تم الدفع (كاش)" : "لم يتم الدفع بعد";

    let rowsHtml = "";
    order.items.forEach(item => {
        let pData = allProds.find(p => p.id === item.id);
        let pName = pData ? pData.titleAr : item.id;
        let rowTotal = item.price * item.qty;
        rowsHtml += `<tr>
            <td style="border:1px solid #ccc;padding:8px;text-align:center;">${item.id}</td>
            <td style="border:1px solid #ccc;padding:8px;text-align:center;">${pName}</td>
            <td style="border:1px solid #ccc;padding:8px;text-align:center;">${item.qty}</td>
            <td style="border:1px solid #ccc;padding:8px;text-align:center;">${item.price}</td>
            <td style="border:1px solid #ccc;padding:8px;text-align:center;">${rowTotal}</td>
        </tr>`;
    });

    return `<div style="width:100%;max-width:850px;margin:0 auto;background:white;padding:0;border:3px solid #1d364a;border-radius:10px;overflow:hidden;font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;text-align:center;">
        <div style="padding:12px 20px;border-bottom:3px solid #f38c18;">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                <div style="text-align:right;flex-shrink:0;">
                    <div style="font-weight:bold;color:#1d364a;font-size:13px;">eljorystore.com</div>
                    <div style="font-weight:bold;color:#1877f2;font-size:12px;margin-top:2px;">
                        <a href="https://www.facebook.com/Elgorystore" target="_blank" style="color:#1877f2;text-decoration:none;">facebook.com/Elgorystore</a>
                    </div>
                    <div style="font-weight:bold;color:#1d364a;font-size:13px;margin-top:2px;">📞 01100395049</div>
                </div>
                <div style="flex:1;text-align:center;font-weight:900;color:#1d364a;font-size:20px;white-space:nowrap;">فاتورة بيع</div>
                <div style="width:100px;height:100px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
                    <img src="logo.png" alt="El Jory Store" style="max-width:100%;max-height:100%;">
                </div>
            </div>
        </div>
        <div style="padding:8px 20px;background:#fdf5e6;font-weight:bold;color:#f38c18;text-align:center;">
            <span>${invNum}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr>
                <td style="background:#1d364a;color:white;padding:8px;text-align:center;width:15%;">التاريخ :-</td>
                <td style="padding:8px;text-align:center;width:35%;">${order.date||"---"}</td>
                <td style="background:#1d364a;color:white;padding:8px;text-align:center;width:15%;">العنوان :-</td>
                <td style="padding:8px;text-align:center;width:35%;">${c.address||"---"}</td>
            </tr>
            <tr>
                <td style="background:#1d364a;color:white;padding:8px;text-align:center;">الاسم :-</td>
                <td style="padding:8px;text-align:center;">${c.name||"---"}</td>
                <td style="background:#1d364a;color:white;padding:8px;text-align:center;">رقم العميل :-</td>
                <td style="padding:8px;text-align:center;">${c.phone||"---"}</td>
            </tr>
        </table>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:6px;">
            <thead>
                <tr style="background:#eef2f5;">
                    <th style="border:1px solid #ccc;padding:8px;text-align:center;">كود</th>
                    <th style="border:1px solid #ccc;padding:8px;text-align:center;">اسم المنتج</th>
                    <th style="border:1px solid #ccc;padding:8px;text-align:center;">الكمية</th>
                    <th style="border:1px solid #ccc;padding:8px;text-align:center;">السعر للوحدة</th>
                    <th style="border:1px solid #ccc;padding:8px;text-align:center;">الإجمالي</th>
                </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
        </table>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr>
                <td style="border:1px solid #ccc;padding:8px;text-align:center;width:50%;">مصاريف شحن</td>
                <td style="border:1px solid #ccc;padding:8px;text-align:center;width:50%;">${order.shippingFee||0}</td>
            </tr>
            ${(order.discount && order.discount > 0) ? `<tr>
                <td style="border:1px solid #ccc;padding:8px;text-align:center;">قيمة الخصم${order.promoCode ? ' (' + order.promoCode + ')' : ''}</td>
                <td style="border:1px solid #ccc;padding:8px;text-align:center;color:#d9534f;font-weight:bold;">-${order.discount}</td>
            </tr>` : ''}
            <tr>
                <td style="border:1px solid #ccc;padding:8px;text-align:center;">حالة الدفع</td>
                <td style="border:1px solid #ccc;padding:8px;text-align:center;">${payStatus}</td>
            </tr>
        </table>
        <div style="display:flex;">
            <div style="flex:1;background:#1d364a;color:white;font-weight:bold;font-size:18px;text-align:center;padding:14px;">الإجمالي</div>
            <div style="flex:1;background:#f38c18;color:white;font-weight:900;font-size:22px;text-align:center;padding:14px;">${order.total} جنيه</div>
        </div>
        ${window.buildInvoiceWarrantySection ? window.buildInvoiceWarrantySection(order, allProds) : ''}
    </div>`;
};

// ⭐ نظام الضمان: بناء قسم الضمان في أسفل الفاتورة المطبوعة — بيظهر بس لو
// فيه منتج واحد على الأقل في الطلب عنده ضمان (order.warrantyToken موجود).
// يشمل: قائمة المنتجات اللي عليها ضمان ومدته، QR code لرابط التفعيل، وكود
// سري من 6 أرقام لو العميل جديد ولسه معملش باسورد لحسابه.
window.buildInvoiceWarrantySection = function(order, allProds) {
    let warrantyItems = (order.items || []).filter(it => (parseInt(it.warrantyMonths) || 0) > 0);

    if (!order.warrantyToken || !warrantyItems.length) {
        return `<div style="text-align:center;font-size:11px;padding:8px;color:#888;">
            هذه الفاتورة لا تحتوي على منتجات مشمولة بضمان.
        </div>`;
    }

    let warrantyLink = window.buildWarrantyLink ? window.buildWarrantyLink(order.warrantyToken) : ('warranty.html?token=' + order.warrantyToken);
    let qrImgUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=' + encodeURIComponent(warrantyLink);
    let graceDays = window.getWarrantyGraceDaysSetting ? window.getWarrantyGraceDaysSetting() : 3;

    let itemsListHtml = warrantyItems.map(it => {
        let p = (allProds || []).find(x => x.id === it.id);
        let name = p ? p.titleAr : it.id;
        return `<div style="padding:2px 0;">🛡️ ${name} — ضمان ${it.warrantyMonths} شهر</div>`;
    }).join('');

    let secretCodeHtml = order.activationCode ? `
        <div style="background:#fdf5e6;border:2px dashed #f38c18;border-radius:6px;padding:6px 10px;text-align:center;align-self:flex-start;">
            <div style="font-size:9px;color:#1d364a;font-weight:bold;">الكود السري لحسابك:</div>
            <div style="font-size:20px;font-weight:900;letter-spacing:4px;color:#f38c18;">${order.activationCode}</div>
        </div>` : '';

    let deadlineNoticeHtml = `
        <div style="font-size:12px;color:#d9534f;font-weight:bold;max-width:180px;line-height:1.6;align-self:flex-start;">
            ⚠️ يجب تفعيل الضمان خلال ${graceDays} ${graceDays === 1 ? 'يوم' : 'أيام'} من استلام المنتج، وإلا هتفوت خدمة الضمان!
        </div>`;

    // ⭐ تعديل الشكل: عمود المنتجات أقصى اليمين. بعده أقصى يمين الجزء التاني
    // "فعّل ضمانك الآن" فوق الـQR مباشرة (نفس العمود)، وبعدها الكود السري (لو
    // موجود)، وبعدها الرسالة التحذيرية على يسار الكل — كل العناصر دي في صف
    // أفقي واحد (RTL) بحيث الـQR يفضل أقصى اليمين والتحذير أقصى الشمال.
    return `<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;
                padding:10px 14px;border-top:3px dashed #f38c18;background:#f9fbfc;flex-wrap:wrap;">
        <div style="flex:1;text-align:right;min-width:0;">
            <strong style="color:#1d364a;font-size:12px;">🛡️ المنتجات المشمولة بالضمان</strong>
            <div style="font-size:11px;color:#333;line-height:1.6;margin-top:4px;">${itemsListHtml}</div>
        </div>
        <div style="flex:0 0 auto;display:flex;align-items:flex-start;gap:14px;">
            <div style="text-align:center;flex-shrink:0;">
                <strong style="color:#1d364a;font-size:11px;display:block;margin-bottom:6px;white-space:nowrap;">فعّل ضمانك الآن 🛡️</strong>
                <img src="${qrImgUrl}" alt="QR تفعيل الضمان" style="width:100px;height:100px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.15);border-radius:6px;">
            </div>
            ${secretCodeHtml}
            ${deadlineNoticeHtml}
        </div>
    </div>`;
};


// ================================================================
