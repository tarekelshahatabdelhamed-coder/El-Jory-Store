// ================================================================
// js/admin-products.js
// فلاتر بحث المنتجات + إدارة المنتجات (CRUD, استيراد/تصدير CSV) + سجل تغييرات الأسعار.
// ملحوظة: كل الدوال هنا لسه بتتسجل على window (زي الأول تمامًا) — الفصل ده
// تنظيمي بس، ومحتاج كل الملفات تتحمّل مع بعض في admin.html بالترتيب المحدد
// (utils الأول، dashboard آخر واحد).
// ================================================================

// ⑤ فلاتر البحث وسلامة البيانات (Filters & Data Integrity)
// ================================================================

window.updateFilterSubCats = function() {
    let mainCatId = document.getElementById("filterProdMainCat") ? document.getElementById("filterProdMainCat").value : "";
    let subSelect = document.getElementById("filterProdSubCat");
    if(!subSelect) return;
    subSelect.innerHTML = '<option value="">الكل</option>';
    if(!mainCatId) return;
    let cats = JSON.parse(localStorage.getItem("eljory_categories") || "[]");
    cats.filter(c => c.parentId === mainCatId).forEach(sc => {
        subSelect.innerHTML += `<option value="${sc.id}">${sc.nameAr}</option>`;
    });
};

// ⭐ لما أي فلتر يتغيّر، لازم نرجع لصفحة 1 عشان منفضلش واقفين في صفحة قديمة
// ممكن تبقى فاضية بعد الفلترة الجديدة.
window.renderAdminProductsFiltered = function() {
    window._prodCurrentPage = 1;
    renderAdminProducts();
};

window.resetProductFilters = function() {
    let s   = document.getElementById("filterProdSearch");   if(s)   s.value   = "";
    let m   = document.getElementById("filterProdMainCat");  if(m)   m.value   = "";
    let sub = document.getElementById("filterProdSubCat");
    if(sub) sub.innerHTML = '<option value="">الكل</option>';
    let oos = document.getElementById("filterOutOfStock");   if(oos) oos.checked = false;
    let inc = document.getElementById("filterInactive");     if(inc) inc.checked = false;
    window._prodCurrentPage = 1;
    renderAdminProducts();
};

window.populateProductFilterCats = function() {
    let mainSelect = document.getElementById("filterProdMainCat");
    if(!mainSelect) return;
    let cats = JSON.parse(localStorage.getItem("eljory_categories") || "[]");
    mainSelect.innerHTML = '<option value="">الكل</option>';
    cats.filter(c => !c.parentId).forEach(c => {
        mainSelect.innerHTML += `<option value="${c.id}">${c.nameAr}</option>`;
    });
};

window.checkDataIntegrity = function() {
    let products    = JSON.parse(localStorage.getItem("eljory_products")) || [];
    let brokenCount = 0;
    products.forEach(p => { if(parseFloat(p.price) < 0 || parseInt(p.stock) < 0) brokenCount++; });
    let checkEl = document.getElementById("dataIntegrityCheck");
    if(checkEl) {
        if(brokenCount > 0) {
            checkEl.innerHTML   = `⚠️ تنبيه: تم رصد عدد (${brokenCount}) منتجات ببيانات سالبة خاطئة في المخزن!`;
            checkEl.style.color = "#d9534f";
        } else {
            checkEl.innerHTML   = `✅ جميع المدخلات والبيانات متوافقة ومستقرة تماماً.`;
            checkEl.style.color = "#28a745";
        }
    }
};


// ================================================================
// ⑦ إدارة المنتجات (Products)
// ================================================================

// ⭐ نظام الحسابات — سجل تغييرات الأسعار: بيتحط سطر جديد في /priceHistory/{id}
// كل مرة يتغير فيها سعر البيع أو سعر التكلفة (شامل أول مرة تتكتب فيها تكلفة
// لمنتج كان من غير تكلفة أصلاً، أو لو المنتج جديد كلياً وكتبت له تكلفة من أول مرة).
window.logPriceHistoryEntry = function(productId, titleAr, field, oldVal, newVal) {
    // oldVal/newVal ممكن يكونوا undefined (يعني "مكتوبش أصلاً") — بنتعامل معاها كـ null
    let oldNorm = (oldVal === undefined || oldVal === null) ? null : parseFloat(oldVal);
    let newNorm = (newVal === undefined || newVal === null) ? null : parseFloat(newVal);
    if (oldNorm === newNorm) return; // مفيش تغيير فعلي، متسجلش حاجة
    let adminEmail = (firebase.auth().currentUser && firebase.auth().currentUser.email) || 'غير معروف';
    let entry = {
        productId, titleAr,
        field, // "price" أو "cost"
        oldVal: oldNorm, newVal: newNorm,
        by: adminEmail,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        date: new Date().toLocaleString('ar-EG')
    };
    db.ref('/priceHistory').push(entry);
};

window.saveProduct = function() {
    let id         = document.getElementById("newProdId").value.trim();
    let titleAr    = document.getElementById("newProdNameAr").value.trim();
    let titleEn    = document.getElementById("newProdNameEn").value.trim();
    let price      = parseFloat(document.getElementById("newProdPrice").value);
    let category   = document.getElementById("newProdCategory").value;
    let subCategory= document.getElementById("newProdSubCategory").value || "";
    let stock      = parseInt(document.getElementById("newProdStock").value);
    let warrantyEl = document.getElementById("newProdWarranty");
    let warrantyMonths = warrantyEl ? (parseInt(warrantyEl.value) || 0) : 0;
    let costEl     = document.getElementById("newProdCost");
    // ⭐ سعر التكلفة: لو الحقل فاضي، بنسيبه undefined عمداً (مش صفر) عشان نقدر
    // نفرّق بين "منتج تكلفته صفر فعلاً" و"منتج لسه معندوش تكلفة مكتوبة أصلاً"
    // — الفرق ده أساسي في استبعاد المنتج من الحسابات المالية.
    let costRaw    = costEl ? costEl.value.trim() : "";
    let costPrice  = costRaw === "" ? undefined : parseFloat(costRaw);
    let img        = document.getElementById("newProdImg").value.trim() || "https://via.placeholder.com/200";
    let descAr     = document.getElementById("newProdDescAr").value.trim();
    let descEn     = document.getElementById("newProdDescEn").value.trim();
    if (!id || !titleAr || isNaN(price) || !category) return alert("يرجى ملء الحقول الأساسية!");
    if (price < 0 || isNaN(stock) || stock < 0) return alert("خطأ: لا يمكن إضافة أسعار أو كميات سالبة!");
    if (costPrice !== undefined && (isNaN(costPrice) || costPrice < 0)) return alert("خطأ: سعر التكلفة غير صحيح!");
    db.ref('/products/' + id).once('value').then(snapshot => {
        let existingProd = snapshot.val() || {};
        if (!window.editingProdId && snapshot.exists()) return alert("كود المنتج موجود مسبقاً! يرجى اختيار كود آخر.");
        let newProd = {
            id, titleAr, titleEn, price, stock, category, subCategory, img,
            points:   existingProd.points || 0,
            warrantyMonths,
            descAr, descEn,
            isActive: existingProd.hasOwnProperty('isActive') ? existingProd.isActive : true
        };
        // ⭐ سعر التكلفة: لو المستخدم سابه فاضي، منكتبش الحقل خالص في المنتج
        // (بدل ما نكتب 0 أو null) — عشان أي كود قديم بيفحص .costPrice يلاقيه
        // undefined فعلاً ويعتبره "لسه معندوش تكلفة"، مش قيمة صفرية مضللة.
        if (costPrice !== undefined) newProd.costPrice = costPrice;

        // تسجيل سجل تغييرات الأسعار (بيع + تكلفة) قبل الحفظ
        window.logPriceHistoryEntry(id, titleAr, 'price', existingProd.price, price);
        window.logPriceHistoryEntry(id, titleAr, 'cost',  existingProd.costPrice, costPrice);

        db.ref('/products/' + id).set(newProd).then(() => {
            alert(window.editingProdId ? "تم تعديل المنتج بنجاح! 💾" : "تم حفظ المنتج بنجاح! ☁️");
            window.editingProdId = null;
            document.getElementById("newProdId").disabled        = false;
            document.getElementById("btnSaveProd").innerHTML     = "➕ حفظ المنتج";
            document.querySelectorAll("#products input, #products textarea").forEach(el => {
                if(el.id !== "newProdImg") el.value = "";
            });
        });
    });
};

window.toggleProductStatus = function(id) {
    db.ref('/products/' + id).once('value').then(snapshot => {
        if(snapshot.exists()) {
            let p = snapshot.val();
            db.ref('/products/' + id).update({ isActive: !(p.isActive !== false) });
        }
    });
};

window.editProduct = function(id) {
    db.ref('/products/' + id).once('value').then(snapshot => {
        if(!snapshot.exists()) return alert("هذا المنتج غير موجود في قاعدة البيانات!");
        let p = snapshot.val();
        document.getElementById("newProdId").value       = p.id;
        document.getElementById("newProdId").disabled    = true;
        document.getElementById("newProdNameAr").value   = p.titleAr   || "";
        document.getElementById("newProdNameEn").value   = p.titleEn   || "";
        document.getElementById("newProdPrice").value    = p.price     || 0;
        document.getElementById("newProdStock").value    = p.stock     || 0;
        let costEl = document.getElementById("newProdCost");
        if (costEl) costEl.value = (p.costPrice !== undefined && p.costPrice !== null) ? p.costPrice : "";
        let warrantyEl = document.getElementById("newProdWarranty");
        if (warrantyEl) warrantyEl.value = p.warrantyMonths || "";
        document.getElementById("newProdImg").value      = p.img       || "";
        document.getElementById("newProdDescAr").value   = p.descAr    || "";
        document.getElementById("newProdDescEn").value   = p.descEn    || "";
        document.getElementById("newProdCategory").value = p.category  || "";
        if(typeof updateSubCatsDropdown === "function") updateSubCatsDropdown();
        if(p.subCategory) document.getElementById("newProdSubCategory").value = p.subCategory;
        document.getElementById("btnSaveProd").innerHTML = "💾 حفظ التعديلات";
        window.editingProdId = id;
        // ⚠️ إصلاح: كان بيعمل scrollTo(0,0) يعني يوديك لأعلى الصفحة تماماً، فلو
        // كنت نازل لتحت في جدول المنتجات وضغطت "تعديل"، الصفحة كانت بتقفز لفوق
        // خالص بدل ما توديك لمكان الفورم نفسه. دلوقتي بنتأكد إن تاب "البيانات
        // الأساسية" مفتوح ثم نعمل scroll سلس لمكان الفورم مباشرة.
        if (typeof switchProductTab === "function") switchProductTab('basic');
        let formBox = document.getElementById("tabBasic");
        if (formBox) formBox.scrollIntoView({ behavior: "smooth", block: "start" });
    });
};

window.duplicateProduct = function(id) {
    db.ref('/products/' + id).once('value').then(snapshot => {
        if(!snapshot.exists()) return alert("المنتج مش موجود!");
        let original = snapshot.val();
        db.ref('/products').once('value').then(allSnap => {
            let allProducts = [];
            allSnap.forEach(child => { allProducts.push(child.key); });
            let baseId          = original.id.replace(/_COPY_\d+$/, '');
            let existingCopies  = allProducts.filter(k => k === baseId || k.startsWith(baseId + '_COPY_'));
            let newId           = baseId + '_COPY_' + existingCopies.length;
            let newProd = { ...original, id: newId, titleAr: original.titleAr + ' (نسخة)', isActive: false };
            db.ref('/products/' + newId).set(newProd).then(() => {
                alert(`✅ تم نسخ المنتج!\nالكود الجديد: ${newId}\nتم إخفاؤه تلقائياً، عدّل البيانات وفعّله لما تخلص.`);
            });
        });
    });
};

window.deleteProduct = function(id) {
    if(confirm("هل أنت متأكد من حذف هذا المنتج نهائياً من الموقع؟")) {
        db.ref('/products/' + id).remove().then(() => { alert("تم مسح المنتج من السحابة!"); });
    }
};

window.PROD_PAGE_SIZE = 20;
window._prodCurrentPage = window._prodCurrentPage || 1;

window.goToProdPage = function(page) {
    window._prodCurrentPage = page;
    renderAdminProducts();
    let tbl = document.getElementById("adminProductsBody");
    if (tbl) tbl.closest('table').scrollIntoView({ behavior: "smooth", block: "start" });
};

function renderProdPagination(totalItems) {
    let box = document.getElementById("adminProductsPagination");
    if (!box) return;
    let totalPages = Math.max(1, Math.ceil(totalItems / window.PROD_PAGE_SIZE));
    if (window._prodCurrentPage > totalPages) window._prodCurrentPage = totalPages;
    if (totalPages <= 1) { box.innerHTML = ""; return; }
    let cur = window._prodCurrentPage;
    let html = `<button class="btn" style="background:#6c757d;padding:6px 12px;" ${cur<=1?'disabled':''} onclick="goToProdPage(${cur-1})">‹ السابق</button>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="btn" style="padding:6px 12px;${i===cur?'background:#f38c18;color:#1d364a;':'background:#1d364a;'}" onclick="goToProdPage(${i})">${i}</button>`;
    }
    html += `<button class="btn" style="background:#6c757d;padding:6px 12px;" ${cur>=totalPages?'disabled':''} onclick="goToProdPage(${cur+1})">التالي ›</button>`;
    box.innerHTML = html;
}

window.renderAdminProducts = function() {
    let tbody    = document.getElementById("adminProductsBody");
    let products = JSON.parse(localStorage.getItem("eljory_products"))    || [];
    let cats     = JSON.parse(localStorage.getItem("eljory_categories"))  || [];
    if(!tbody) return;
    tbody.innerHTML = "";
    let searchVal  = document.getElementById("filterProdSearch")  ? document.getElementById("filterProdSearch").value.trim().toLowerCase() : "";
    let mainCatVal = document.getElementById("filterProdMainCat") ? document.getElementById("filterProdMainCat").value : "";
    let subCatVal  = document.getElementById("filterProdSubCat")  ? document.getElementById("filterProdSubCat").value  : "";
    let filterOOS      = document.getElementById("filterOutOfStock") ? document.getElementById("filterOutOfStock").checked : false;
    let filterInactive = document.getElementById("filterInactive")   ? document.getElementById("filterInactive").checked   : false;
    let filtered = products.filter(p => {
        let matchSearch   = !searchVal      || p.titleAr.toLowerCase().includes(searchVal) || (p.titleEn||"").toLowerCase().includes(searchVal) || p.id.toLowerCase().includes(searchVal);
        let matchMain     = !mainCatVal     || p.category    === mainCatVal;
        let matchSub      = !subCatVal      || p.subCategory === subCatVal;
        let matchOOS      = !filterOOS      || p.stock <= 0;
        let matchInactive = !filterInactive || p.isActive === false;
        return matchSearch && matchMain && matchSub && matchOOS && matchInactive;
    });
    let countEl = document.getElementById("filterProdCount");
    if(countEl) countEl.innerText = `📦 يظهر ${filtered.length} من أصل ${products.length} منتج`;
    let mainSelect = document.getElementById("filterProdMainCat");
    if(mainSelect && mainSelect.options.length <= 1) populateProductFilterCats();
    if(!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:gray;padding:25px;">لا توجد منتجات مطابقة للبحث.</td></tr>';
        renderProdPagination(0);
        return;
    }
    // ⭐ تقسيم النتائج على صفحات (20 منتج في كل صفحة)
    let totalPages = Math.max(1, Math.ceil(filtered.length / window.PROD_PAGE_SIZE));
    if (window._prodCurrentPage > totalPages) window._prodCurrentPage = totalPages;
    if (window._prodCurrentPage < 1) window._prodCurrentPage = 1;
    let startIdx = (window._prodCurrentPage - 1) * window.PROD_PAGE_SIZE;
    let pageItems = filtered.slice(startIdx, startIdx + window.PROD_PAGE_SIZE);
    renderProdPagination(filtered.length);
    pageItems.forEach(p => {
        let mainCat  = cats.find(c => c.id === p.category);
        let subCat   = cats.find(c => c.id === p.subCategory);
        let catName  = mainCat ? mainCat.nameAr : p.category;
        let subName  = subCat  ? subCat.nameAr  : "-";
        let stockStyle = p.stock <= 0 ? "color:red;font-weight:bold;" : "";
        let isActive = p.isActive !== false;
        let activeBtn = `<button class="btn ${isActive?'btn-green':'btn-inactive'}" style="padding:5px 10px;width:100px;" onclick="toggleProductStatus('${p.id}')">${isActive?'نشط 👁️':'مخفي 🙈'}</button>`;
        let hasCost = (p.costPrice !== undefined && p.costPrice !== null && !isNaN(parseFloat(p.costPrice)));
        let costCell = hasCost
            ? `<span style="color:#28a745;font-weight:bold;">✅ ${p.costPrice} ج.م</span>`
            : `<span style="color:#d9534f;font-weight:bold;">⚠️ غير محددة</span>`;
        tbody.innerHTML += `<tr style="${!isActive?'opacity:0.6;':''}">
    <td><strong>${p.id}</strong></td>
    <td>${p.titleAr}</td>
    <td>${catName}<br><small style="color:#f38c18">${subName}</small></td>
    <td>${p.price} ج.م</td>
    <td>${costCell}</td>
    <td style="${stockStyle}">${p.stock}</td>
    <td>${activeBtn}</td>
    <td>
        <button class="btn" style="background:#f38c18;margin-bottom:5px;" onclick="editProduct('${p.id}')">تعديل</button>
        <button class="btn" style="background:#795548;margin-bottom:5px;" onclick="openReceiveStockModal('${p.id}')">📦 استلام كمية</button>
        <button class="btn" style="background:#17a2b8;margin-bottom:5px;" onclick="duplicateProduct('${p.id}')">📋 نسخ</button>
        <button class="btn btn-red" onclick="deleteProduct('${p.id}')">حذف</button>
    </td>
</tr>`;
    });
};

window.exportProductsCSV = function() {
    let products = JSON.parse(localStorage.getItem("eljory_products")) || [];
    if(!products.length) return alert("لا توجد منتجات لتصديرها");
    let csvContent = "كود_المنتج;الاسم_عربي;الاسم_انجليزي;القسم_الرئيسي;القسم_الفرعي;الصورة;المخزون;السعر;نقاط_الولاء;الوصف_عربي;الوصف_انجليزي;شهور_الضمان;سعر_التكلفة\r\n";
    products.forEach(p => {
        // ⭐ سعر التكلفة: بيتصدّر فاضي لو المنتج لسه معندوش تكلفة مكتوبة (undefined)،
        // عشان نفرّق بينه وبين منتج تكلفته صفر فعلاً لما نستورد الشيت تاني.
        let costCell = (p.costPrice !== undefined && p.costPrice !== null && !isNaN(parseFloat(p.costPrice))) ? p.costPrice : "";
        let row = [
            `"${p.id}"`, `"${p.titleAr}"`, `"${p.titleEn||""}"`,
            `"${p.category}"`, `"${p.subCategory||""}"`, `"${p.img}"`,
            p.stock, p.price, (p.points||0),
            `"${(p.descAr||"").replace(/"/g,'""')}"`,
            `"${(p.descEn||"").replace(/"/g,'""')}"`,
            (p.warrantyMonths||0),
            costCell
        ];
        csvContent += row.join(";") + "\r\n";
    });
    let bom  = new Uint8Array([0xEF,0xBB,0xBF]);
    let blob = new Blob([bom, csvContent], { type:'text/csv;charset=utf-8;' });
    let url  = URL.createObjectURL(blob);
    let link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "ElJory_Products.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
};

window.importProductsCSV = function(event) {
    const file = event.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        let text = e.target.result;
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
        const firstLine = text.split('\n')[0];
        const delimiter = (firstLine.match(/;/g)||[]).length >= (firstLine.match(/,/g)||[]).length ? ';' : ',';
        const parseCSV = (str, sep) => {
            const rows = [];
            let cur = [], field = '', inQ = false;
            for (let i = 0; i < str.length; i++) {
                const ch = str[i];
                if (inQ) {
                    if (ch === '"' && str[i+1] === '"') { field += '"'; i++; }
                    else if (ch === '"') { inQ = false; }
                    else { field += ch; }
                } else {
                    if      (ch === '"')  { inQ = true; }
                    else if (ch === sep)  { cur.push(field); field = ''; }
                    else if (ch === '\n') { cur.push(field); field = ''; rows.push(cur); cur = []; }
                    else if (ch === '\r') { /* skip */ }
                    else { field += ch; }
                }
            }
            if (field || cur.length) { cur.push(field); rows.push(cur); }
            return rows;
        };
        const rows  = parseCSV(text, delimiter);
        if (rows.length <= 1) return alert("الملف فارغ.");
        const clean = (str) => str ? str.replace(/^"|"$/g,'').replace(/""/g,'"').trim() : '';
        let newProds = [], skipped = 0;
        for (let i = 1; i < rows.length; i++) {
            const cols = rows[i];
            if (!cols || cols.length < 7) { skipped++; continue; }
            const id     = clean(cols[0]), titleAr = clean(cols[1]), titleEn = clean(cols[2]);
            const cat    = clean(cols[3]), subCat  = clean(cols[4]), img     = clean(cols[5]);
            const stock  = parseInt(clean(cols[6]))   || 0;
            const price  = parseFloat(clean(cols[7])) || 0;
            const points = parseFloat(clean(cols[8]||'')) || 0;
            const descAr = clean(cols[9]||''), descEn = clean(cols[10]||'');
            if (!id || !titleAr) { skipped++; continue; }
            let prodRow = { id, titleAr, titleEn, category:cat, subCategory:subCat, img, stock, price, points, descAr, descEn, isActive:true };
            // ⭐ عمود شهور الضمان اختياري ومضاف في آخر الشيت. لو الشيت المرفوع قديم
            // ومفيهوش العمود ده، منسيبوش الفيلد أصلاً في الصف عشان الدمج بعدين
            // (Object.assign) يحافظ على شهور الضمان الموجودة بالفعل للمنتج ومايمسحهاش.
            if (cols.length > 11 && clean(cols[11]||'') !== '') {
                prodRow.warrantyMonths = parseInt(clean(cols[11])) || 0;
            }
            // ⭐ سعر التكلفة: عمود اختياري كمان وفي آخر الشيت (بعد شهور الضمان).
            // لو الخانة فاضية أو العمود مش موجود أصلاً (شيت قديم)، منحطش الحقل في
            // الصف خالص عشان الدمج (Object.assign) يحافظ على تكلفة المنتج المحفوظة
            // بالفعل ومايمسحهاش أو يفضّيها بالغلط. الخانة بتتاخد بجدية بس لو
            // فعلاً مكتوب فيها رقم صريح.
            if (cols.length > 12 && clean(cols[12]||'') !== '') {
                let costVal = parseFloat(clean(cols[12]));
                if (!isNaN(costVal) && costVal >= 0) prodRow.costPrice = costVal;
            }
            newProds.push(prodRow);
        }
        if (!newProds.length) return alert(`مفيش منتجات صالحة!\nتأكد إن الأعمدة 8 على الأقل والكود والاسم مش فاضيين.`);
        db.ref('/products').once('value').then(snapshot => {
            let existing = {};
            if (snapshot.exists()) snapshot.forEach(child => { existing[child.key] = child.val(); });
            newProds.forEach(p => {
                let prevProd = existing[p.id];
                // ⭐ سجل تغييرات الأسعار: لو المنتج موجود بالفعل وفيه تغيير حقيقي
                // في سعر البيع أو سعر التكلفة عن طريق الشيت، نسجله بنفس أسلوب
                // التعديل اليدوي من فورم المنتج (saveProduct)، عشان يبان في تاب
                // "سجل تغييرات الأسعار" حتى لو التحديث جه من استيراد جماعي.
                if (typeof window.logPriceHistoryEntry === 'function') {
                    window.logPriceHistoryEntry(p.id, p.titleAr, 'price', prevProd ? prevProd.price : undefined, p.price);
                    if (p.costPrice !== undefined) {
                        window.logPriceHistoryEntry(p.id, p.titleAr, 'cost', prevProd ? prevProd.costPrice : undefined, p.costPrice);
                    }
                }
                existing[p.id] = prevProd
                    ? { ...prevProd, ...p, isActive: prevProd.isActive }
                    : p;
            });
            db.ref('/products').set(existing).then(() => {
                alert(`✅ تم الاستيراد بنجاح!\nتم معالجة ${newProds.length} منتج.${skipped>0?`\nتم تخطي ${skipped} صف.`:''}`);
                event.target.value = '';
            }).catch(err => { console.error(err); alert("❌ حدث خطأ أثناء الحفظ في Firebase!"); });
        });
    };
    reader.readAsText(file, 'UTF-8');
};


// ================================================================
// ⑦.٥ سجل تغييرات أسعار المنتجات (Price History)
// ================================================================

window.renderAdminPriceHistory = function() {
    let tbody = document.getElementById("adminPriceHistoryBody");
    if (!tbody) return;

    let history = JSON.parse(localStorage.getItem("eljory_price_history")) || [];
    let searchF = document.getElementById("filterPHProduct") ? document.getElementById("filterPHProduct").value.trim().toLowerCase() : "";
    let typeF   = document.getElementById("filterPHType")    ? document.getElementById("filterPHType").value : "all";
    let fromF   = document.getElementById("filterPHFrom")    ? document.getElementById("filterPHFrom").value : "";
    let toF     = document.getElementById("filterPHTo")      ? document.getElementById("filterPHTo").value   : "";

    let filtered = history.filter(h => {
        let matchSearch = !searchF || (h.titleAr||"").toLowerCase().includes(searchF) || (h.productId||"").toLowerCase().includes(searchF);
        let matchType   = typeF === "all" || h.field === typeF;
        let matchFrom   = true, matchTo = true;
        if (h.timestamp) {
            let dayStr = new Date(h.timestamp).toISOString().slice(0,10);
            if (fromF) matchFrom = dayStr >= fromF;
            if (toF)   matchTo   = dayStr <= toF;
        }
        return matchSearch && matchType && matchFrom && matchTo;
    });

    // الأحدث أولاً
    filtered.sort((a,b) => (b.timestamp||0) - (a.timestamp||0));

    let countEl = document.getElementById("filterPHCount");
    if (countEl) countEl.innerText = `📜 يظهر ${filtered.length} من أصل ${history.length} حركة تغيير سعر`;

    tbody.innerHTML = "";
    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:gray;padding:20px;">لا توجد حركات مطابقة.</td></tr>';
        let box0 = document.getElementById("priceHistoryPaginationBox");
        if (box0) box0.innerHTML = "";
        return;
    }

    let phPageSize  = window.genGetPageSize('priceHistory', 20);
    let phPageItems = window.genSlicePage('priceHistory', filtered, phPageSize);
    window.genRenderPagination('priceHistory', filtered.length, phPageSize, 'renderAdminPriceHistory');

    phPageItems.forEach(h => {
        let fieldLabel = h.field === 'price'
            ? '<span style="background:#1d364a;color:white;padding:3px 8px;border-radius:4px;font-size:12px;">سعر البيع</span>'
            : '<span style="background:#f38c18;color:#1d364a;padding:3px 8px;border-radius:4px;font-size:12px;font-weight:bold;">سعر التكلفة</span>';
        let oldTxt = (h.oldVal === null || h.oldVal === undefined) ? '<span style="color:gray;">— (غير محدد)</span>' : (h.oldVal + ' ج.م');
        let newTxt = (h.newVal === null || h.newVal === undefined) ? '<span style="color:gray;">— (غير محدد)</span>' : (h.newVal + ' ج.م');
        let diffTxt = "-";
        if (typeof h.oldVal === 'number' && typeof h.newVal === 'number') {
            let diff = h.newVal - h.oldVal;
            let color = diff > 0 ? '#d9534f' : (diff < 0 ? '#28a745' : '#555');
            let sign  = diff > 0 ? '+' : '';
            diffTxt = `<span style="color:${color};font-weight:bold;">${sign}${diff.toFixed(2)} ج.م</span>`;
        } else if (h.oldVal === null && typeof h.newVal === 'number') {
            diffTxt = '<span style="color:#28a745;font-weight:bold;">أول تحديد لسعر التكلفة ✅</span>';
        }
        tbody.innerHTML += `<tr>
            <td style="font-size:12.5px;">${h.date || '-'}</td>
            <td><strong>${h.productId}</strong></td>
            <td>${h.titleAr || '-'}</td>
            <td>${fieldLabel}</td>
            <td>${oldTxt}</td>
            <td>${newTxt}</td>
            <td>${diffTxt}</td>
        </tr>`;
    });
};

window.exportPriceHistoryCSV = function() {
    let history = JSON.parse(localStorage.getItem("eljory_price_history")) || [];
    if (!history.length) return alert("لا توجد بيانات لتصديرها");
    let esc = v => `"${String(v===undefined||v===null?'':v).replace(/"/g,'""')}"`;
    let csv = "التاريخ;كود المنتج;اسم المنتج;نوع التغيير;القيمة القديمة;القيمة الجديدة;بواسطة\r\n";
    [...history].sort((a,b) => (b.timestamp||0) - (a.timestamp||0)).forEach(h => {
        csv += [
            esc(h.date), esc(h.productId), esc(h.titleAr),
            esc(h.field === 'price' ? 'سعر البيع' : 'سعر التكلفة'),
            esc(h.oldVal === null || h.oldVal === undefined ? 'غير محدد' : h.oldVal),
            esc(h.newVal === null || h.newVal === undefined ? 'غير محدد' : h.newVal),
            esc(h.by)
        ].join(";") + "\r\n";
    });
    let bom  = new Uint8Array([0xEF,0xBB,0xBF]);
    let blob = new Blob([bom, csv], { type:'text/csv;charset=utf-8;' });
    let url  = URL.createObjectURL(blob);
    let link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ElJory_PriceHistory_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
};


// ================================================================
