// ================================================================
// js/admin-categories.js
// إدارة الأقسام الرئيسية والفرعية (Categories CRUD).
// ملحوظة: كل الدوال هنا لسه بتتسجل على window (زي الأول تمامًا) — الفصل ده
// تنظيمي بس، ومحتاج كل الملفات تتحمّل مع بعض في admin.html بالترتيب المحدد
// (utils الأول، dashboard آخر واحد).
// ================================================================

// ⑥ إدارة الأقسام (Categories)
// ================================================================

// ⚙️ توليد كود القسم التسلسلي التالي تلقائياً بناءً على أعلى رقم موجود في
// أكواد الأقسام الحالية (سواء كانت أكواد رقمية بالكامل أو نصية منتهية برقم).
window.getNextCategoryId = function(cats) {
    let maxNum = 0;
    (cats || []).forEach(c => {
        let m = String(c.id).match(/(\d+)$/);
        if (m) {
            let n = parseInt(m[1], 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
        }
    });
    return String(maxNum + 1);
};

window.fillNextCategoryId = function() {
    let idInput = document.getElementById("newCatId");
    if (!idInput) return;
    let cats = JSON.parse(localStorage.getItem("eljory_categories")) || [];
    idInput.value = window.getNextCategoryId(cats);
};

// ⚙️ فتح/قفل قائمة الأقسام الفرعية التابعة لقسم رئيسي معين (Accordion)
window.toggleCategorySublist = function(id) {
    let box   = document.getElementById('subcats_' + id);
    let arrow = document.getElementById('arrow_' + id);
    if (!box) return;
    let isOpen = box.style.display === 'block';
    box.style.display = isOpen ? 'none' : 'block';
    if (arrow) arrow.innerText = isOpen ? '▾' : '▴';
};

window.loadAdminCategories = function() {
    let cats          = JSON.parse(localStorage.getItem("eljory_categories")) || [];
    let parentSelect  = document.getElementById("newCatParent");
    let prodMainSelect= document.getElementById("newProdCategory");
    let listContainer = document.getElementById("adminCategoriesList");
    cats.sort((a,b) => (parseInt(a.priority)||0) - (parseInt(b.priority)||0));
    if(parentSelect)   parentSelect.innerHTML   = `<option value="">-- رئيسي --</option>`;
    if(prodMainSelect) prodMainSelect.innerHTML = `<option value="">-- اختر --</option>`;
    if(listContainer)  listContainer.innerHTML  = "";
    cats.filter(c => !c.parentId).forEach(mc => {
        if(parentSelect)   parentSelect.innerHTML   += `<option value="${mc.id}">${mc.nameAr}</option>`;
        if(prodMainSelect) prodMainSelect.innerHTML += `<option value="${mc.id}">${mc.nameAr}</option>`;
        if(listContainer) {
            let isActive      = mc.isActive !== false;
            let toggleBtn     = `<button onclick="event.stopPropagation();toggleCategoryStatus('${mc.id}')" style="float:left;background:${isActive?'#28a745':'#6c757d'};color:white;border:none;padding:4px 8px;border-radius:3px;margin-right:10px;cursor:pointer;">${isActive?'نشط 👁️':'مخفي 🙈'}</button>`;
            let editBtn       = `<button onclick="event.stopPropagation();editCategory('${mc.id}')" style="float:left;background:#17a2b8;color:white;border:none;padding:4px 8px;border-radius:3px;margin-right:10px;cursor:pointer;">⚙️ تعديل</button>`;
            let priorityBadge = `<span style="background:#f38c18;color:white;padding:3px 8px;border-radius:12px;font-size:12px;margin-right:10px;">أولوية: ${mc.priority||0}</span>`;
            let isFeatured  = mc.isFeatured === true;
            let featuredBtn = `<button onclick="event.stopPropagation();toggleCategoryFeatured('${mc.id}')" style="float:left;background:${isFeatured?'#f38c18':'#ccc'};color:${isFeatured?'#1d364a':'#555'};border:none;padding:4px 8px;border-radius:3px;margin-right:10px;cursor:pointer;font-weight:bold;">${isFeatured?'⭐ مميز':'☆ عادي'}</button>`;

            let subCats       = cats.filter(sc => sc.parentId === mc.id);
            let subCountBadge = `<span style="background:#1d364a;color:white;padding:3px 8px;border-radius:12px;font-size:12px;margin-right:10px;">📂 ${subCats.length} فرعي</span>`;

            let subsHtml = "";
            subCats.forEach(sc => {
                let subActive      = sc.isActive !== false;
                let subToggle      = `<button onclick="event.stopPropagation();toggleCategoryStatus('${sc.id}')" style="float:left;background:${subActive?'#28a745':'#6c757d'};color:white;border:none;padding:3px 6px;border-radius:3px;margin-right:10px;cursor:pointer;font-size:12px;">${subActive?'نشط 👁️':'مخفي 🙈'}</button>`;
                let subEdit        = `<button onclick="event.stopPropagation();editCategory('${sc.id}')" style="float:left;background:#17a2b8;color:white;border:none;padding:3px 6px;border-radius:3px;margin-right:10px;cursor:pointer;font-size:12px;">⚙️ تعديل</button>`;
                let subPriority    = `<span style="background:#f38c18;color:white;padding:2px 6px;border-radius:10px;font-size:11px;margin-right:10px;">أولوية: ${sc.priority||0}</span>`;
                subsHtml += `<div style="background:#f9f9f9;padding:10px 20px;border:1px solid #ddd;border-radius:5px;margin-bottom:5px;margin-right:30px;color:#555;">
                    - ${sc.nameAr} <small>(${sc.id})</small> ${subPriority}
                    <button onclick="event.stopPropagation();deleteCategory('${sc.id}')" style="float:left;background:none;border:none;color:red;font-weight:bold;cursor:pointer;">✖ حذف</button>
                    ${subToggle} ${subEdit}
                </div>`;
            });
            if (!subCats.length) {
                subsHtml = `<div style="padding:10px 20px;margin-right:30px;color:gray;font-size:13px;">لا توجد أقسام فرعية.</div>`;
            }

            listContainer.innerHTML += `<div>
                <div onclick="toggleCategorySublist('${mc.id}')" style="cursor:pointer;background:white;padding:15px;border:1px solid #ddd;border-radius:5px;margin-bottom:10px;">
                    <span id="arrow_${mc.id}" style="margin-right:8px;font-weight:bold;color:#1d364a;">▾</span>
                    <strong>${mc.nameAr}</strong> <small style="color:gray;">(${mc.id})</small>
                    ${priorityBadge}
                    ${subCountBadge}
                    <button onclick="event.stopPropagation();deleteCategory('${mc.id}')" style="float:left;background:none;border:none;color:red;font-weight:bold;cursor:pointer;">✖ حذف</button>
                    ${toggleBtn} ${editBtn} ${featuredBtn}
                </div>
                <div id="subcats_${mc.id}" style="display:none;margin-bottom:15px;">${subsHtml}</div>
            </div>`;
        }
    });
    updateSubCatsDropdown();
    fillNextCategoryId();
};

window.editCategory = function(id) {
    let cats = JSON.parse(localStorage.getItem("eljory_categories")) || [];
    let cat  = cats.find(c => c.id === id);
    if(!cat) return;
    document.getElementById("editCatId").value       = cat.id;
    document.getElementById("editCatNameAr").value   = cat.nameAr   || "";
    document.getElementById("editCatNameEn").value   = cat.nameEn   || "";
    document.getElementById("editCatImg").value      = cat.img      || "";
    document.getElementById("editCatPriority").value = cat.priority || 0;
    let featEl = document.getElementById("editCatFeatured");
    if (featEl) featEl.checked = cat.isFeatured === true;
    document.getElementById("editCategoryModal").style.display = "flex";
};

window.saveCategoryEdit = function() {
    let id          = document.getElementById("editCatId").value;
    let newNameAr   = document.getElementById("editCatNameAr").value.trim();
    let newNameEn   = document.getElementById("editCatNameEn").value.trim();
    let newImg      = document.getElementById("editCatImg").value.trim();
    let newPriority = parseInt(document.getElementById("editCatPriority").value) || 0;
    let featEl      = document.getElementById("editCatFeatured");
    let newFeatured = featEl ? featEl.checked : undefined;
    safeUpdateList('/categories', cats => {
        let index = cats.findIndex(c => c.id === id);
        if(index > -1) {
            cats[index].nameAr   = newNameAr;
            cats[index].nameEn   = newNameEn;
            cats[index].img      = newImg;
            cats[index].priority = newPriority;
            if (newFeatured !== undefined) cats[index].isFeatured = newFeatured;
        }
        return cats;
    }).then(() => { closeCategoryModal(); alert("تم تحديث بيانات القسم بنجاح!"); });
};

window.closeCategoryModal = function() {
    document.getElementById("editCategoryModal").style.display = "none";
};

window.toggleCategoryStatus = function(id) {
    safeUpdateList('/categories', cats => {
        let index = cats.findIndex(c => c.id === id);
        if(index > -1) cats[index].isActive = !(cats[index].isActive !== false);
        return cats;
    });
};

window.deleteCategory = function(id) {
    if(!confirm("هل أنت متأكد من مسح هذا القسم؟")) return;
    safeUpdateList('/categories', cats => cats.filter(c => c.id !== id && c.parentId !== id));
};

window.updateSubCatsDropdown = function() {
    let cats        = JSON.parse(localStorage.getItem("eljory_categories")) || [];
    let mainCatId   = document.getElementById("newProdCategory").value;
    let subSelect   = document.getElementById("newProdSubCategory");
    if(!subSelect) return;
    subSelect.innerHTML = `<option value="">-- بدون --</option>`;
    cats.filter(c => c.parentId === mainCatId).forEach(sc => {
        subSelect.innerHTML += `<option value="${sc.id}">${sc.nameAr}</option>`;
    });
};

window.addCategory = function() {
    let id       = document.getElementById("newCatId").value.trim();
    let nameAr   = document.getElementById("newCatNameAr").value.trim();
    let nameEnEl = document.getElementById("newCatNameEn");
    let nameEn   = nameEnEl ? nameEnEl.value.trim() : "";
    let parentId = document.getElementById("newCatParent").value;
    let prioEl   = document.getElementById("newCatPriority");
    let priority = prioEl ? (parseInt(prioEl.value) || 0) : 0;
    let featEl   = document.getElementById("newCatFeatured");
    let isFeatured = featEl ? featEl.checked : false;
    if(!id || !nameAr) return alert("يرجى كتابة كود القسم والاسم بالعربي على الأقل!");
    safeUpdateList('/categories', cats => {
        if(cats.find(c => c.id === id)) throw new Error("DUPLICATE_CAT_ID");
        cats.push({ id, nameAr, nameEn: nameEn || nameAr, parentId: parentId || null, priority, isFeatured, isActive: true });
        return cats;
    }).then(() => {
        alert("تم الإضافة");
        document.getElementById("newCatNameAr").value = "";
        if(nameEnEl) nameEnEl.value = "";
        if(prioEl)   prioEl.value   = "1";
        if(featEl)   featEl.checked = false;
        // توليد الكود التسلسلي التالي أوتوماتيك بناءً على آخر كود مُضاف
        fillNextCategoryId();
    }).catch(err => {
        if(err.message === "DUPLICATE_CAT_ID") {
            alert("⚠️ كود القسم ده مستخدم بالفعل لقسم آخر! يرجى اختيار كود مختلف.");
        } else {
            console.error(err);
            alert("حدث خطأ أثناء إضافة القسم.");
        }
    });
};

window.toggleCategoryFeatured = function(id) {
    safeUpdateList('/categories', cats => {
        let index = cats.findIndex(c => c.id === id);
        if(index > -1) cats[index].isFeatured = !(cats[index].isFeatured === true);
        return cats;
    });
};


// ================================================================
