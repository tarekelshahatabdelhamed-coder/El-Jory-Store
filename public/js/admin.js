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
// ② التنقل والقوائم الجانبية (Navigation)
// ================================================================

window.toggleSubmenu = function(menuId) {
    document.getElementById(menuId).classList.toggle("open");
};

window.switchTab = function(tabId) {
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));
    let targetSection = document.getElementById(tabId);
    if(!targetSection) { tabId = 'orders'; targetSection = document.getElementById(tabId); }
    targetSection.classList.add('active');
    let btn = document.querySelector(`button[onclick="switchTab('${tabId}')"]`);
    if(btn) {
        btn.classList.add('active');
        let parentMenu = btn.closest('.submenu');
        if (parentMenu) parentMenu.classList.add('open');
    }
    localStorage.setItem("admin_active_tab", tabId);
};


// ================================================================
// ③ إدارة السكاشن الاحترافية (Sections)
// ================================================================

const LAYOUTS = [
    { id:'full',            label:'بانر كامل',         icon:'🟦',   images:1 },
    { id:'two',             label:'صورتين جنب بعض',    icon:'▐▌',   images:2 },
    { id:'three',           label:'3 صور في صف',       icon:'▐▌▌',  images:3 },
    { id:'four',            label:'4 صور في صف',       icon:'▐▌▌▌', images:4 },
    { id:'big-left-2right', label:'كبيرة + 2 صغار',   icon:'🔲▌',  images:3 },
    { id:'big-left-4right', label:'كبيرة + 4 صغار',   icon:'🔲▌▌', images:5 },
    { id:'slider',          label:'سلايدر تلقائي',     icon:'▶️',   images:6 },
];

let currentLayout = 'full';
let sectionImages = [];

window.buildLayoutPicker = function() {
    let picker = document.getElementById('layoutPicker');
    if (!picker) return;
    picker.innerHTML = LAYOUTS.map(l => `
        <div onclick="selectLayout('${l.id}')" id="lpick_${l.id}"
             style="border:2px solid ${l.id===currentLayout?'#f38c18':'#ddd'};border-radius:8px;
                    padding:12px 16px;cursor:pointer;text-align:center;
                    background:${l.id===currentLayout?'#fdf5e6':'white'};
                    transition:.2s;min-width:110px;flex:0 0 auto;">
            <div style="font-size:22px;margin-bottom:5px;">${l.icon}</div>
            <div style="font-size:12px;font-weight:bold;color:#1d364a;">${l.label}</div>
            <div style="font-size:11px;color:#999;margin-top:3px;">
                ${l.id==='slider' ? 'صور متعددة' : `${l.images} صورة`}
            </div>
        </div>`).join('');
};

window.selectLayout = function(layoutId) {
    currentLayout = layoutId;
    LAYOUTS.forEach(l => {
        let el = document.getElementById(`lpick_${l.id}`);
        if (!el) return;
        el.style.border     = l.id === layoutId ? '2px solid #f38c18' : '2px solid #ddd';
        el.style.background = l.id === layoutId ? '#fdf5e6' : 'white';
    });
    buildImagesInputs();
};

window.buildImagesInputs = function() {
    let container = document.getElementById('secImagesContainer');
    if (!container) return;
    let layout = LAYOUTS.find(l => l.id === currentLayout);
    let count  = currentLayout === 'slider' ? Math.max(sectionImages.length + 1, 2) : layout.images;
    while (sectionImages.length < count) sectionImages.push({ src:'', linkType:'none', linkValue:'' });
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        let im = sectionImages[i] || { src:'', linkType:'none', linkValue:'' };
        let isOptional = currentLayout === 'slider' && i >= 2;
        container.innerHTML += buildImageInputBox(i, im, isOptional);
    }
};

function buildImageInputBox(i, im, isOptional) {
    let labels = {
        full: 'الصورة الرئيسية',
        two:  `الصورة ${i+1}`, three: `الصورة ${i+1}`, four: `الصورة ${i+1}`,
        'big-left-2right': i===0 ? 'الصورة الكبيرة' : `الصورة الصغيرة ${i}`,
        'big-left-4right': i===0 ? 'الصورة الكبيرة' : `الصورة ${i}`,
        slider: `شريحة ${i+1}`
    };
    let label = labels[currentLayout] || `الصورة ${i+1}`;
    return `<div style="background:white;padding:15px;border-radius:8px;border:1px solid #eee;" id="imgBox_${i}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <strong style="color:#1d364a;font-size:14px;">📷 ${label}${isOptional?' (اختياري)':''}</strong>
            ${im.src ? `<img src="${im.src}" style="width:50px;height:35px;object-fit:cover;border-radius:4px;border:1px solid #ddd;">` : ''}
        </div>
        <div style="display:flex;gap:8px;margin-bottom:10px;">
            <input type="text" id="secImgSrc_${i}" value="${im.src||''}" placeholder="رابط الصورة..."
                   class="form-control" style="flex:1;"
                   oninput="sectionImages[${i}].src=this.value;buildImagesInputs();">
            <button type="button" onclick="triggerSecImgUpload(${i})"
                    class="btn btn-green" style="padding:8px 12px;white-space:nowrap;">📤</button>
            <button type="button"
                    onclick="openGalleryModal('secImgSrc_${i}');window._gallerySecIdx=${i};"
                    class="btn" style="background:#e68a10;padding:8px 12px;white-space:nowrap;">🖼️</button>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
            <label style="font-size:13px;color:#555;white-space:nowrap;">Image Click:</label>
            <select onchange="updateImgLinkType(${i},this.value)" class="form-control" style="flex:1;min-width:140px;">
                <option value="none"        ${im.linkType==='none'       ?'selected':''}>بدون رابط</option>
                <option value="product"     ${im.linkType==='product'    ?'selected':''}>منتج</option>
                <option value="category"    ${im.linkType==='category'   ?'selected':''}>قسم رئيسي</option>
                <option value="subcategory" ${im.linkType==='subcategory'?'selected':''}>قسم فرعي</option>
                <option value="customList"  ${im.linkType==='customList' ?'selected':''}>قائمة مخصصة</option>
                <option value="external"    ${im.linkType==='external'   ?'selected':''}>رابط خارجي</option>
            </select>
        </div>
        <div id="imgLinkBox_${i}" style="margin-top:8px;">${buildImgLinkInput(i, im)}</div>
    </div>`;
}

function buildImgLinkInput(i, im) {
    let cats  = JSON.parse(localStorage.getItem('eljory_categories')    || '[]');
    let lists = JSON.parse(localStorage.getItem('eljory_custom_lists')  || '[]');
    if (!im.linkType || im.linkType === 'none') return '';
    if (im.linkType === 'product') return `
        <div style="position:relative;">
            <input type="text" id="imgProdSearch_${i}" placeholder="ابحث عن منتج..."
                   class="form-control" style="margin-bottom:4px;"
                   oninput="searchImgProduct(${i})" value="${im.linkValue||''}">
            <div id="imgProdResults_${i}"
                 style="display:none;position:absolute;top:100%;right:0;left:0;background:white;
                        border:1px solid #ddd;border-radius:5px;max-height:160px;overflow-y:auto;z-index:100;"></div>
            <input type="hidden" id="imgLinkVal_${i}" value="${im.linkValue||''}">
        </div>`;
    if (im.linkType === 'category') return `
        <select class="form-control" id="imgLinkVal_${i}" onchange="sectionImages[${i}].linkValue=this.value">
            <option value="">-- اختر قسم --</option>
            ${cats.filter(c=>!c.parentId).map(c=>`<option value="${c.id}" ${im.linkValue===c.id?'selected':''}>${c.nameAr}</option>`).join('')}
        </select>`;
    if (im.linkType === 'subcategory') return `
        <select class="form-control" id="imgLinkVal_${i}" onchange="sectionImages[${i}].linkValue=this.value">
            <option value="">-- اختر قسم فرعي --</option>
            ${cats.filter(c=>c.parentId).map(c=>`<option value="${c.id}" ${im.linkValue===c.id?'selected':''}>${c.nameAr}</option>`).join('')}
        </select>`;
    if (im.linkType === 'customList') return `
        <select class="form-control" id="imgLinkVal_${i}" onchange="sectionImages[${i}].linkValue=this.value">
            <option value="">-- اختر قائمة --</option>
            ${lists.map(l=>`<option value="${l.id}" ${im.linkValue===l.id?'selected':''}>${l.name}</option>`).join('')}
        </select>`;
    if (im.linkType === 'external') return `
        <input type="text" class="form-control" id="imgLinkVal_${i}"
               placeholder="https://..." value="${im.linkValue||''}"
               oninput="sectionImages[${i}].linkValue=this.value">`;
    return '';
}

window.updateImgLinkType = function(i, type) {
    sectionImages[i].linkType  = type;
    sectionImages[i].linkValue = '';
    document.getElementById(`imgLinkBox_${i}`).innerHTML = buildImgLinkInput(i, sectionImages[i]);
};

window.searchImgProduct = function(i) {
    let q   = document.getElementById(`imgProdSearch_${i}`).value.trim().toLowerCase();
    let box = document.getElementById(`imgProdResults_${i}`);
    if (!q) { box.style.display = 'none'; return; }
    let products = JSON.parse(localStorage.getItem('eljory_products')||'[]').filter(p=>p.isActive!==false);
    let res = products.filter(p =>
        p.titleAr.toLowerCase().includes(q) ||
        (p.titleEn||'').toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
    ).slice(0, 8);
    if (!res.length) {
        box.innerHTML = '<div style="padding:10px;color:gray;">لا نتائج</div>';
        box.style.display = 'block';
        return;
    }
    box.innerHTML = res.map(p=>`
        <div onclick="selectImgProduct(${i},'${p.id}','${p.titleAr}')"
             style="padding:8px 12px;border-bottom:1px solid #eee;cursor:pointer;display:flex;align-items:center;gap:8px;"
             onmouseover="this.style.background='#f0f8ff'" onmouseout="this.style.background='white'">
            <img src="${p.img}" style="width:32px;height:32px;object-fit:cover;border-radius:3px;">
            <span style="font-size:13px;">${p.titleAr} <small style="color:gray;">(${p.id})</small></span>
        </div>`).join('');
    box.style.display = 'block';
};

window.selectImgProduct = function(i, id, name) {
    sectionImages[i].linkValue = id;
    document.getElementById(`imgProdSearch_${i}`).value = `${name} (${id})`;
    document.getElementById(`imgLinkVal_${i}`).value    = id;
    document.getElementById(`imgProdResults_${i}`).style.display = 'none';
};

window.triggerSecImgUpload = function(idx) {
    window._secImgIdx = idx;
    let inp = document.createElement('input');
    inp.type   = 'file';
    inp.accept = 'image/*';
    inp.onchange = function(e) {
        let file = e.target.files[0]; if(!file) return;
        window._directUploadTargetCallback = function(url) {
            sectionImages[idx].src = url;
            document.getElementById(`secImgSrc_${idx}`).value = url;
            buildImagesInputs();
        };
        compressAndSaveImage(file, false);
    };
    inp.click();
};

window.toggleSecProductsBox = function() {
    let show = document.getElementById('secShowProducts').value === '1';
    document.getElementById('secProductsBox').style.display = show ? 'block' : 'none';
};

window.updateSecLinkUI = function() {
    let type  = document.getElementById('secLinkType').value;
    let cats  = JSON.parse(localStorage.getItem('eljory_categories')   || '[]');
    let lists = JSON.parse(localStorage.getItem('eljory_custom_lists') || '[]');
    ['secLinkCategoryBox','secLinkSubcategoryBox','secLinkCustomListBox'].forEach(b => {
        let el = document.getElementById(b); if(el) el.style.display = 'none';
    });
    document.getElementById('secLinkValueBox').style.display = type === 'none' ? 'none' : 'block';
    document.getElementById('secLinkValue').value = '';
    if (type === 'category') {
        let sel = document.getElementById('secLinkCategorySelect');
        sel.innerHTML = '<option value="">-- اختر --</option>' +
            cats.filter(c=>!c.parentId).map(c=>`<option value="${c.id}">${c.nameAr}</option>`).join('');
        document.getElementById('secLinkCategoryBox').style.display = 'block';
    } else if (type === 'subcategory') {
        let sel = document.getElementById('secLinkSubcategorySelect');
        sel.innerHTML = '<option value="">-- اختر --</option>' +
            cats.filter(c=>c.parentId).map(c=>`<option value="${c.id}">${c.nameAr}</option>`).join('');
        document.getElementById('secLinkSubcategoryBox').style.display = 'block';
    } else if (type === 'customList') {
        let sel = document.getElementById('secLinkCustomListSelect');
        sel.innerHTML = '<option value="">-- اختر --</option>' +
            lists.map(l=>`<option value="${l.id}">${l.name}</option>`).join('');
        document.getElementById('secLinkCustomListBox').style.display = 'block';
    }
};

window.saveSection = function() {
    let editingId = document.getElementById('editingSectionId').value;
    let finalImages = sectionImages.map((im, i) => {
        let srcEl = document.getElementById(`secImgSrc_${i}`);
        let valEl = document.getElementById(`imgLinkVal_${i}`);
        return {
            src:       srcEl ? srcEl.value.trim() : (im.src || ''),
            linkType:  im.linkType  || 'none',
            linkValue: valEl ? valEl.value.trim() : (im.linkValue || '')
        };
    }).filter(im => im.src);
    if (!finalImages.length) return alert('يرجى إضافة صورة واحدة على الأقل!');
    let newSec = {
        id:           editingId || ('SEC_' + Date.now()),
        layout:       currentLayout,
        images:       finalImages,
        title:        document.getElementById('secTitle').value.trim(),
        showTitle:    document.getElementById('secShowTitle').value === '1',
        showProducts: document.getElementById('secShowProducts').value === '1',
        linkType:     document.getElementById('secLinkType').value || 'none',
        linkValue:    document.getElementById('secLinkValue').value.trim(),
        maxProducts:  parseInt(document.getElementById('secMaxProducts').value) || 8,
        bgColor:      document.getElementById('secBgColor').value === '#ffffff' ? '' : document.getElementById('secBgColor').value,
        priority:     parseInt(document.getElementById('secPriority').value) || 1,
        isActive:     true
    };
    if (editingId) {
        safeUpdateList('/sections', secs => {
            let i = secs.findIndex(s => s.id === editingId);
            if (i > -1) secs[i] = newSec; else secs.push(newSec);
            return secs;
        }).then(() => { alert('تم تحديث السيكشن! ✅'); cancelEditSection(); });
    } else {
        safeUpdateList('/sections', secs => { secs.push(newSec); return secs; })
            .then(() => { alert('تم حفظ السيكشن! ✅'); resetSectionForm(); });
    }
};

window.resetSectionForm = function() {
    currentLayout = 'full';
    sectionImages = [{ src:'', linkType:'none', linkValue:'' }];
    document.getElementById('editingSectionId').value              = '';
    document.getElementById('secTitle').value                      = '';
    document.getElementById('secShowTitle').value                  = '1';
    document.getElementById('secShowProducts').value               = '0';
    document.getElementById('secProductsBox').style.display        = 'none';
    document.getElementById('secLinkType').value                   = 'none';
    document.getElementById('secLinkValue').value                  = '';
    document.getElementById('secLinkValueBox').style.display       = 'none';
    document.getElementById('secPriority').value                   = '1';
    document.getElementById('secBgColor').value                    = '#ffffff';
    document.getElementById('secSaveBtn').innerHTML                = '➕ حفظ السيكشن';
    document.getElementById('secCancelBtn').style.display          = 'none';
    buildLayoutPicker();
    buildImagesInputs();
};

window.cancelEditSection = function() { resetSectionForm(); };

window.editSection = function(id) {
    let secs = JSON.parse(localStorage.getItem('eljory_sections')||'[]');
    let sec  = secs.find(s => s.id === id);
    if (!sec) return;
    document.getElementById('editingSectionId').value  = id;
    currentLayout = sec.layout || 'full';
    sectionImages = sec.images ? JSON.parse(JSON.stringify(sec.images)) : [{ src:'', linkType:'none', linkValue:'' }];
    document.getElementById('secTitle').value          = sec.title || '';
    document.getElementById('secShowTitle').value      = sec.showTitle  ? '1' : '0';
    document.getElementById('secShowProducts').value   = sec.showProducts ? '1' : '0';
    document.getElementById('secLinkType').value       = sec.linkType || 'none';
    document.getElementById('secPriority').value       = sec.priority || 1;
    document.getElementById('secBgColor').value        = sec.bgColor || '#ffffff';
    document.getElementById('secMaxProducts').value    = sec.maxProducts || 8;
    toggleSecProductsBox();
    if (sec.linkType && sec.linkType !== 'none') {
        updateSecLinkUI();
        setTimeout(() => { document.getElementById('secLinkValue').value = sec.linkValue || ''; }, 100);
    }
    document.getElementById('secSaveBtn').innerHTML       = '💾 حفظ التعديلات';
    document.getElementById('secCancelBtn').style.display = 'inline-block';
    buildLayoutPicker();
    buildImagesInputs();
    document.getElementById('sectionFormBox').scrollIntoView({ behavior:'smooth' });
};

window.renderAdminSections = function() {
    let tbody = document.getElementById('adminSectionsBody');
    if (!tbody) return;
    let secs = JSON.parse(localStorage.getItem('eljory_sections')||'[]');
    secs.sort((a,b) => (a.priority||0) - (b.priority||0));
    tbody.innerHTML = '';
    if (!secs.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:gray;padding:20px;">لا توجد سكاشن.</td></tr>';
        return;
    }
    let layoutNames = { full:'بانر كامل', two:'صورتين', three:'3 صور', four:'4 صور',
                        'big-left-2right':'كبيرة+2', 'big-left-4right':'كبيرة+4', slider:'سلايدر' };
    secs.forEach(s => {
        let isActive = s.isActive !== false;
        let imgs     = s.images || [];
        let previewImgs = imgs.slice(0,3).filter(i=>i.src)
            .map(i=>`<img src="${i.src}" style="width:40px;height:30px;object-fit:cover;border-radius:3px;margin-left:3px;">`).join('');
        tbody.innerHTML += `<tr style="${!isActive?'opacity:0.5;':''}">
            <td><span style="background:#1d364a;color:white;padding:3px 8px;border-radius:4px;font-size:12px;">${layoutNames[s.layout]||s.layout}</span></td>
            <td><strong>${s.title||'—'}</strong><br><small style="color:gray;">${s.showTitle?'✅ عنوان':'—'}</small></td>
            <td>${previewImgs||'—'}<br><small style="color:gray;">${imgs.length} صورة</small></td>
            <td style="text-align:center;">${s.showProducts?`<span style="color:green;font-weight:bold;">✅</span><br><small>${s.linkType}</small>`:'<span style="color:gray;">—</span>'}</td>
            <td style="text-align:center;">${s.priority}</td>
            <td><button class="btn ${isActive?'btn-green':'btn-inactive'}" style="padding:4px 10px;" onclick="toggleSectionStatus('${s.id}')">${isActive?'نشط':'مخفي'}</button></td>
            <td>
                <button class="btn" style="background:#17a2b8;padding:4px 10px;margin-bottom:5px;" onclick="editSection('${s.id}')">⚙️ تعديل</button>
                <button class="btn btn-red" style="padding:4px 10px;" onclick="deleteSection('${s.id}')">🗑️ حذف</button>
            </td>
        </tr>`;
    });
};

window.toggleSectionStatus = function(id) {
    safeUpdateList('/sections', secs => {
        let i = secs.findIndex(s=>s.id===id);
        if(i>-1) secs[i].isActive = !(secs[i].isActive!==false);
        return secs;
    });
};

window.deleteSection = function(id) {
    if(!confirm('متأكد من حذف هذا السيكشن؟')) return;
    safeUpdateList('/sections', secs => secs.filter(s=>s.id!==id));
};

// تهيئة الـ layout picker عند تحميل الصفحة
setTimeout(() => {
    if (document.getElementById('layoutPicker')) {
        sectionImages = [{ src:'', linkType:'none', linkValue:'' }];
        buildLayoutPicker();
        buildImagesInputs();
    }
}, 200);


// ================================================================
// ④ إدارة القوائم المخصصة (Custom Lists)
// ================================================================

let currentEditingListId = null;

window.createCustomList = function() {
    let name = document.getElementById('newListName').value.trim();
    if(!name) return alert('يرجى كتابة اسم القائمة!');
    safeUpdateList('/customLists', lists => {
        if(lists.find(l => l.name === name)) throw new Error('DUPLICATE');
        lists.push({ id: 'LST_' + Date.now(), name, products: [], isActive: true });
        return lists;
    }).then(() => {
        document.getElementById('newListName').value = '';
        alert('تم إنشاء القائمة!');
    }).catch(e => { if(e.message==='DUPLICATE') alert('القائمة موجودة مسبقاً!'); });
};

window.renderAdminCustomLists = function() {
    let tbody = document.getElementById('adminCustomListsBody');
    if(!tbody) return;
    let lists = JSON.parse(localStorage.getItem('eljory_custom_lists') || '[]');
    tbody.innerHTML = '';
    if(!lists.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:gray;padding:20px;">لا توجد قوائم بعد.</td></tr>';
        return;
    }
    lists.forEach(l => {
        let isActive = l.isActive !== false;
        let count    = (l.products || []).length;
        tbody.innerHTML += `<tr style="${!isActive?'opacity:0.55;':''}">
            <td><code style="background:#eef2f5;padding:3px 8px;border-radius:4px;">${l.id}</code></td>
            <td><strong>${l.name}</strong></td>
            <td style="text-align:center;"><span style="background:#f38c18;color:white;padding:3px 8px;border-radius:12px;font-size:13px;">${count} منتج</span></td>
            <td><button class="btn ${isActive?'btn-green':'btn-inactive'}" style="padding:4px 10px;" onclick="toggleCustomListStatus('${l.id}')">${isActive?'نشطة':'مخفية'}</button></td>
            <td>
                <button class="btn" style="background:#17a2b8;margin-left:5px;padding:4px 10px;" onclick="openEditList('${l.id}')">⚙️ تعديل</button>
                <button class="btn btn-red" style="padding:4px 10px;" onclick="deleteCustomList('${l.id}')">حذف</button>
            </td>
        </tr>`;
    });
};

window.openEditList = function(id) {
    let lists = JSON.parse(localStorage.getItem('eljory_custom_lists') || '[]');
    let list  = lists.find(l => l.id === id);
    if(!list) return;
    currentEditingListId = id;
    document.getElementById('editListTitle').innerText = `تعديل: ${list.name}`;
    document.getElementById('editListBox').style.display = 'block';
    document.getElementById('listProductSearch').value   = '';
    document.getElementById('listProductResults').style.display = 'none';
    renderListProducts(list.products || []);
};

window.closeEditList = function() {
    currentEditingListId = null;
    document.getElementById('editListBox').style.display = 'none';
};

window.listSearchProducts = function() {
    let q          = document.getElementById('listProductSearch').value.trim().toLowerCase();
    let resultsBox = document.getElementById('listProductResults');
    if(!q) { resultsBox.style.display = 'none'; return; }
    let products = JSON.parse(localStorage.getItem('eljory_products') || '[]');
    let lists    = JSON.parse(localStorage.getItem('eljory_custom_lists') || '[]');
    let currentList = lists.find(l => l.id === currentEditingListId);
    let alreadyIn   = currentList ? (currentList.products || []) : [];
    let filtered = products.filter(p =>
        p.isActive !== false &&
        !alreadyIn.includes(p.id) &&
        (p.titleAr.toLowerCase().includes(q) || (p.titleEn&&p.titleEn.toLowerCase().includes(q)) || p.id.toLowerCase().includes(q))
    ).slice(0, 10);
    if(!filtered.length) {
        resultsBox.innerHTML = '<div style="padding:10px;color:gray;">لا توجد نتائج</div>';
        resultsBox.style.display = 'block';
        return;
    }
    resultsBox.innerHTML = filtered.map(p => `
        <div onclick="addProductToList('${p.id}')"
             style="padding:10px;border-bottom:1px solid #eee;cursor:pointer;display:flex;align-items:center;gap:10px;transition:0.2s;"
             onmouseover="this.style.background='#f0f8ff'" onmouseout="this.style.background='white'">
            <img src="${p.img}" style="width:35px;height:35px;object-fit:cover;border-radius:4px;">
            <div><strong style="font-size:13px;">${p.titleAr}</strong><br><small style="color:gray;">${p.id} - ${p.price} ج.م</small></div>
        </div>`).join('');
    resultsBox.style.display = 'block';
};

window.addProductToList = function(productId) {
    db.ref('/customLists').once('value').then(snap => {
        let allLists = [];
        if (snap.exists()) {
            let data = snap.val();
            allLists = Array.isArray(data) ? data.filter(x=>x) : Object.values(data).filter(x=>x);
        }
        let list = allLists.find(l => l.id === currentEditingListId);
        if (!list) return;
        if (!list.products) list.products = [];
        if (!list.products.includes(productId)) list.products.push(productId);
        db.ref('/customLists').set(allLists).then(() => {
            renderListProducts(list.products);
            document.getElementById('listProductSearch').value = '';
            document.getElementById('listProductResults').style.display = 'none';
        });
    });
};

window.removeProductFromList = function(productId) {
    db.ref('/customLists').once('value').then(snap => {
        let allLists = [];
        if (snap.exists()) {
            let data = snap.val();
            allLists = Array.isArray(data) ? data.filter(x=>x) : Object.values(data).filter(x=>x);
        }
        let list = allLists.find(l => l.id === currentEditingListId);
        if (!list) return;
        list.products = (list.products || []).filter(id => id !== productId);
        db.ref('/customLists').set(allLists).then(() => { renderListProducts(list.products); });
    });
};

window.renderListProducts = function(productIds) {
    let container = document.getElementById('listProductsContainer');
    let products  = JSON.parse(localStorage.getItem('eljory_products') || '[]');
    if(!productIds.length) {
        container.innerHTML = '<span style="color:gray;font-size:14px;">لم تضف منتجات بعد</span>';
        return;
    }
    container.innerHTML = productIds.map(id => {
        let p    = products.find(x => x.id === id);
        let name = p ? p.titleAr : id;
        let img  = p ? p.img    : '';
        return `<div style="display:flex;align-items:center;gap:6px;background:#1d364a;color:white;padding:5px 10px;border-radius:20px;font-size:13px;">
            ${img ? `<img src="${img}" style="width:22px;height:22px;object-fit:cover;border-radius:50%;">` : ''}
            <span>${name}</span>
            <button onclick="removeProductFromList('${id}')"
                    style="background:none;border:none;color:#ff9999;cursor:pointer;font-weight:bold;font-size:15px;">✖</button>
        </div>`;
    }).join('');
};

window.importListFromCSV = function(event) {
    let file = event.target.files[0]; if(!file) return;
    let reader = new FileReader();
    reader.onload = function(e) {
        let text = e.target.result;
        let ids  = text.split(/[\r\n,;]+/).map(s => s.trim().replace(/^"|"$/g,'')).filter(Boolean);
        let products  = JSON.parse(localStorage.getItem('eljory_products')     || '[]');
        let lists     = JSON.parse(localStorage.getItem('eljory_custom_lists') || '[]');
        let list      = lists.find(l => l.id === currentEditingListId);
        if(!list) return;
        let validIds  = products.map(p => p.id);
        let added = 0;
        ids.forEach(id => {
            if(validIds.includes(id) && !(list.products||[]).includes(id)) {
                if(!list.products) list.products = [];
                list.products.push(id);
                added++;
            }
        });
        renderListProducts(list.products || []);
        alert(`تم إضافة ${added} منتج من الشيت!`);
        event.target.value = '';
    };
    reader.readAsText(file);
};

window.saveCurrentList = function() {
    if(!currentEditingListId) return;
    let lists = JSON.parse(localStorage.getItem('eljory_custom_lists') || '[]');
    let list  = lists.find(l => l.id === currentEditingListId);
    if(!list) return;
    safeUpdateList('/customLists', allLists => {
        let i = allLists.findIndex(l => l.id === currentEditingListId);
        if(i > -1) allLists[i].products = list.products || [];
        return allLists;
    }).then(() => { alert('تم الحفظ بنجاح!'); closeEditList(); });
};

window.toggleCustomListStatus = function(id) {
    safeUpdateList('/customLists', lists => {
        let i = lists.findIndex(l => l.id === id);
        if(i > -1) lists[i].isActive = !(lists[i].isActive !== false);
        return lists;
    });
};

window.deleteCustomList = function(id) {
    if(!confirm('متأكد من حذف هذه القائمة؟')) return;
    safeUpdateList('/customLists', lists => lists.filter(l => l.id !== id));
};


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

window.resetProductFilters = function() {
    let s   = document.getElementById("filterProdSearch");   if(s)   s.value   = "";
    let m   = document.getElementById("filterProdMainCat");  if(m)   m.value   = "";
    let sub = document.getElementById("filterProdSubCat");
    if(sub) sub.innerHTML = '<option value="">الكل</option>';
    let oos = document.getElementById("filterOutOfStock");   if(oos) oos.checked = false;
    let inc = document.getElementById("filterInactive");     if(inc) inc.checked = false;
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
// ⑥ إدارة الأقسام (Categories)
// ================================================================

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
            let toggleBtn     = `<button onclick="toggleCategoryStatus('${mc.id}')" style="float:left;background:${isActive?'#28a745':'#6c757d'};color:white;border:none;padding:4px 8px;border-radius:3px;margin-right:10px;cursor:pointer;">${isActive?'نشط 👁️':'مخفي 🙈'}</button>`;
            let editBtn       = `<button onclick="editCategory('${mc.id}')" style="float:left;background:#17a2b8;color:white;border:none;padding:4px 8px;border-radius:3px;margin-right:10px;cursor:pointer;">⚙️ تعديل</button>`;
            let priorityBadge = `<span style="background:#f38c18;color:white;padding:3px 8px;border-radius:12px;font-size:12px;margin-right:10px;">أولوية: ${mc.priority||0}</span>`;
            listContainer.innerHTML += `<div style="background:white;padding:15px;border:1px solid #ddd;border-radius:5px;margin-bottom:10px;">
                <strong>${mc.nameAr}</strong> <small style="color:gray;">(${mc.id})</small>
                ${priorityBadge}
                <button onclick="deleteCategory('${mc.id}')" style="float:left;background:none;border:none;color:red;font-weight:bold;cursor:pointer;">✖ حذف</button>
                ${toggleBtn} ${editBtn}
            </div>`;
            cats.filter(sc => sc.parentId === mc.id).forEach(sc => {
                let subActive      = sc.isActive !== false;
                let subToggle      = `<button onclick="toggleCategoryStatus('${sc.id}')" style="float:left;background:${subActive?'#28a745':'#6c757d'};color:white;border:none;padding:3px 6px;border-radius:3px;margin-right:10px;cursor:pointer;font-size:12px;">${subActive?'نشط 👁️':'مخفي 🙈'}</button>`;
                let subEdit        = `<button onclick="editCategory('${sc.id}')" style="float:left;background:#17a2b8;color:white;border:none;padding:3px 6px;border-radius:3px;margin-right:10px;cursor:pointer;font-size:12px;">⚙️ تعديل</button>`;
                let subPriority    = `<span style="background:#f38c18;color:white;padding:2px 6px;border-radius:10px;font-size:11px;margin-right:10px;">أولوية: ${sc.priority||0}</span>`;
                listContainer.innerHTML += `<div style="background:#f9f9f9;padding:10px 20px;border:1px solid #ddd;border-radius:5px;margin-bottom:5px;margin-right:30px;color:#555;">
                    - ${sc.nameAr} <small>(${sc.id})</small> ${subPriority}
                    <button onclick="deleteCategory('${sc.id}')" style="float:left;background:none;border:none;color:red;font-weight:bold;cursor:pointer;">✖ حذف</button>
                    ${subToggle} ${subEdit}
                </div>`;
            });
        }
    });
    updateSubCatsDropdown();
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
    document.getElementById("editCategoryModal").style.display = "flex";
};

window.saveCategoryEdit = function() {
    let id          = document.getElementById("editCatId").value;
    let newNameAr   = document.getElementById("editCatNameAr").value.trim();
    let newNameEn   = document.getElementById("editCatNameEn").value.trim();
    let newImg      = document.getElementById("editCatImg").value.trim();
    let newPriority = parseInt(document.getElementById("editCatPriority").value) || 0;
    safeUpdateList('/categories', cats => {
        let index = cats.findIndex(c => c.id === id);
        if(index > -1) {
            cats[index].nameAr   = newNameAr;
            cats[index].nameEn   = newNameEn;
            cats[index].img      = newImg;
            cats[index].priority = newPriority;
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
    let id      = document.getElementById("newCatId").value.trim();
    let nameAr  = document.getElementById("newCatNameAr").value.trim();
    let parentId= document.getElementById("newCatParent").value;
    if(!id || !nameAr) return;
    safeUpdateList('/categories', cats => {
        cats.push({ id, nameAr, nameEn: nameAr, parentId: parentId || null, isActive: true });
        return cats;
    }).then(() => {
        alert("تم الإضافة");
        document.getElementById("newCatId").value    = "";
        document.getElementById("newCatNameAr").value= "";
    });
};


// ================================================================
// ⑦ إدارة المنتجات (Products)
// ================================================================

window.saveProduct = function() {
    let id         = document.getElementById("newProdId").value.trim();
    let titleAr    = document.getElementById("newProdNameAr").value.trim();
    let titleEn    = document.getElementById("newProdNameEn").value.trim();
    let price      = parseFloat(document.getElementById("newProdPrice").value);
    let category   = document.getElementById("newProdCategory").value;
    let subCategory= document.getElementById("newProdSubCategory").value || "";
    let stock      = parseInt(document.getElementById("newProdStock").value);
    let img        = document.getElementById("newProdImg").value.trim() || "https://via.placeholder.com/200";
    let descAr     = document.getElementById("newProdDescAr").value.trim();
    let descEn     = document.getElementById("newProdDescEn").value.trim();
    if (!id || !titleAr || isNaN(price) || !category) return alert("يرجى ملء الحقول الأساسية!");
    if (price < 0 || isNaN(stock) || stock < 0) return alert("خطأ: لا يمكن إضافة أسعار أو كميات سالبة!");
    db.ref('/products/' + id).once('value').then(snapshot => {
        let existingProd = snapshot.val() || {};
        if (!window.editingProdId && snapshot.exists()) return alert("كود المنتج موجود مسبقاً! يرجى اختيار كود آخر.");
        let newProd = {
            id, titleAr, titleEn, price, stock, category, subCategory, img,
            points:   existingProd.points || 0,
            descAr, descEn,
            isActive: existingProd.hasOwnProperty('isActive') ? existingProd.isActive : true
        };
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
        document.getElementById("newProdImg").value      = p.img       || "";
        document.getElementById("newProdDescAr").value   = p.descAr    || "";
        document.getElementById("newProdDescEn").value   = p.descEn    || "";
        document.getElementById("newProdCategory").value = p.category  || "";
        if(typeof updateSubCatsDropdown === "function") updateSubCatsDropdown();
        if(p.subCategory) document.getElementById("newProdSubCategory").value = p.subCategory;
        document.getElementById("btnSaveProd").innerHTML = "💾 حفظ التعديلات";
        window.editingProdId = id;
        window.scrollTo(0, 0);
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
        return;
    }
    filtered.forEach(p => {
        let mainCat  = cats.find(c => c.id === p.category);
        let subCat   = cats.find(c => c.id === p.subCategory);
        let catName  = mainCat ? mainCat.nameAr : p.category;
        let subName  = subCat  ? subCat.nameAr  : "-";
        let stockStyle = p.stock <= 0 ? "color:red;font-weight:bold;" : "";
        let isActive = p.isActive !== false;
        let activeBtn = `<button class="btn ${isActive?'btn-green':'btn-inactive'}" style="padding:5px 10px;width:100px;" onclick="toggleProductStatus('${p.id}')">${isActive?'نشط 👁️':'مخفي 🙈'}</button>`;
        tbody.innerHTML += `<tr style="${!isActive?'opacity:0.6;':''}">
            <td><strong>${p.id}</strong></td>
            <td>${p.titleAr}</td>
            <td>${catName}<br><small style="color:#f38c18">${subName}</small></td>
            <td>${p.price} ج.م</td>
            <td style="${stockStyle}">${p.stock}</td>
            <td>${activeBtn}</td>
            <td>
                <button class="btn" style="background:#f38c18;margin-bottom:5px;" onclick="editProduct('${p.id}')">تعديل</button>
                <button class="btn" style="background:#17a2b8;margin-bottom:5px;" onclick="duplicateProduct('${p.id}')">📋 نسخ</button>
                <button class="btn btn-red" onclick="deleteProduct('${p.id}')">حذف</button>
            </td>
        </tr>`;
    });
};

window.exportProductsCSV = function() {
    let products = JSON.parse(localStorage.getItem("eljory_products")) || [];
    if(!products.length) return alert("لا توجد منتجات لتصديرها");
    let csvContent = "كود_المنتج;الاسم_عربي;الاسم_انجليزي;القسم_الرئيسي;القسم_الفرعي;الصورة;المخزون;السعر;نقاط_الولاء;الوصف_عربي;الوصف_انجليزي\r\n";
    products.forEach(p => {
        let row = [
            `"${p.id}"`, `"${p.titleAr}"`, `"${p.titleEn||""}"`,
            `"${p.category}"`, `"${p.subCategory||""}"`, `"${p.img}"`,
            p.stock, p.price, (p.points||0),
            `"${(p.descAr||"").replace(/"/g,'""')}"`,
            `"${(p.descEn||"").replace(/"/g,'""')}"`
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
            newProds.push({ id, titleAr, titleEn, category:cat, subCategory:subCat, img, stock, price, points, descAr, descEn, isActive:true });
        }
        if (!newProds.length) return alert(`مفيش منتجات صالحة!\nتأكد إن الأعمدة 8 على الأقل والكود والاسم مش فاضيين.`);
        db.ref('/products').once('value').then(snapshot => {
            let existing = {};
            if (snapshot.exists()) snapshot.forEach(child => { existing[child.key] = child.val(); });
            newProds.forEach(p => {
                existing[p.id] = existing[p.id]
                    ? { ...existing[p.id], ...p, isActive: existing[p.id].isActive }
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
// ⑧ إدارة مناطق التوصيل (Regions)
// ================================================================

window.loadAdminRegions = function() {
    let regions = JSON.parse(localStorage.getItem("eljory_regions")) || [];
    let list    = document.getElementById("adminRegionsList");
    if(!list) return;
    list.innerHTML = "";
    regions.forEach(reg => {
        let isActive  = reg.isActive !== false;
        let bg        = isActive ? "#1d364a" : "#6c757d";
        let feeTxt    = (!reg.fee || reg.fee === 0) ? "مجاني" : `${reg.fee} ج.م`;
        let safeName  = reg.name.replace(/'/g, "\\'");
        let btnColor  = isActive ? "#28a745" : "#5a6268";
        let btnText   = isActive ? "نشط 👁️" : "مخفي 🙈";
        list.innerHTML += `<div class="badge" style="background:${bg};font-size:14px;padding:8px 15px;margin-left:10px;display:inline-flex;align-items:center;gap:10px;margin-bottom:10px;">
            ${reg.name} <span style="color:#f38c18;">(${feeTxt})</span>
            <button onclick="openEditRegion('${safeName}')" style="background:#17a2b8;color:white;border:none;padding:3px 8px;border-radius:3px;cursor:pointer;font-size:12px;">⚙️ تعديل</button>
            <button onclick="toggleRegionStatus('${safeName}')" style="background:${btnColor};color:white;border:none;padding:3px 8px;border-radius:3px;cursor:pointer;font-size:12px;">${btnText}</button>
            <span class="badge-remove" style="margin:0;padding:0;" onclick="deleteAdminRegion('${safeName}')">✖</span>
        </div>`;
    });
};

window.addAdminRegion = function() {
    let name     = document.getElementById("newRegionName").value.trim();
    let feeInput = document.getElementById("newRegionFee") ? document.getElementById("newRegionFee").value : "0";
    let fee      = feeInput === "" ? 0 : parseFloat(feeInput);
    if (!name) return alert("يرجى إدخال اسم المنطقة!");
    safeUpdateList('/regions', regions => {
        if(regions.find(r => r.name === name)) throw new Error("DUPLICATE_NAME");
        regions.push({ name, isActive:true, fee });
        return regions;
    }).then(() => {
        document.getElementById("newRegionName").value = "";
        if(document.getElementById("newRegionFee")) document.getElementById("newRegionFee").value = "";
        alert("تمت إضافة المنطقة للسحابة بنجاح!");
    }).catch(err => {
        if(err.message === "DUPLICATE_NAME") alert("هذه المنطقة موجودة مسبقاً!");
        else { console.error(err); alert("حدث خطأ أثناء الحفظ."); }
    });
};

window.deleteAdminRegion = function(regionName) {
    if(confirm("هل أنت متأكد من مسح هذه المنطقة؟")) {
        safeUpdateList('/regions', regions => regions.filter(r => r.name !== regionName))
            .then(() => { alert("تم الحذف بنجاح!"); });
    }
};

window.openEditRegion = function(regionName) {
    let regions = JSON.parse(localStorage.getItem("eljory_regions")) || [];
    let reg     = regions.find(r => r.name === regionName);
    if(!reg) return;
    document.getElementById("editRegionIndex").value = regionName;
    document.getElementById("editRegionName").value  = reg.name;
    document.getElementById("editRegionFee").value   = reg.fee || 0;
    document.getElementById("editRegionModal").style.display = "flex";
};

window.saveRegionEdit = function() {
    let originalName = document.getElementById("editRegionIndex").value;
    let newName      = document.getElementById("editRegionName").value.trim();
    let feeInput     = document.getElementById("editRegionFee").value;
    let newFee       = feeInput === "" ? 0 : parseFloat(feeInput);
    if(!newName) return alert("الاسم مطلوب!");
    safeUpdateList('/regions', regions => {
        if(regions.find(r => r.name === newName && r.name !== originalName)) throw new Error("DUPLICATE_NAME");
        let index = regions.findIndex(r => r.name === originalName);
        if(index > -1) { regions[index].name = newName; regions[index].fee = newFee; }
        return regions;
    }).then(() => { closeRegionModal(); alert("تم التحديث!"); })
      .catch(err => {
          if(err.message === "DUPLICATE_NAME") alert("هذا الاسم مستخدم لمنطقة أخرى!");
          else { console.error(err); alert("حدث خطأ أثناء الحفظ."); }
      });
};

window.toggleRegionStatus = function(regionName) {
    safeUpdateList('/regions', regions => {
        let index = regions.findIndex(r => r.name === regionName);
        if(index > -1) regions[index].isActive = !(regions[index].isActive !== false);
        return regions;
    });
};

window.closeRegionModal = function() {
    document.getElementById("editRegionModal").style.display = "none";
};


// ================================================================
// ⑨ إدارة العملاء (Customers)
// ================================================================

window.renderAdminCustomers = function() {
    let tbody   = document.getElementById("adminCustomersBody");
    if(!tbody) return;
    tbody.innerHTML = "";
    let usersDB  = JSON.parse(localStorage.getItem("eljory_users_db")) || [];
    let ordersDB = JSON.parse(localStorage.getItem("eljory_orders"))   || [];
    usersDB.reverse().forEach(u => {
        let userOrders      = ordersDB.filter(o => o.customer && window.getShortPhone(o.customer.phone) === window.getShortPhone(u.phone));
        let deliveredOrders = userOrders.filter(o => o.status === "Delivered").length;
        let totalSpent      = userOrders.filter(o => o.status === "Delivered").reduce((sum,o) => sum + o.total, 0);
        let primaryAddr     = u.addresses && u.addresses.find(a=>a.isPrimary) ? u.addresses.find(a=>a.isPrimary).text : (u.address || "غير محدد");
        let blockStatus     = u.isBlocked ? `<span style="color:red;font-weight:bold;">محظور ❌</span>` : `<span style="color:green;font-weight:bold;">نشط ✅</span>`;
        let historyCount    = u.pointsHistory ? u.pointsHistory.length : 0;
        tbody.innerHTML += `<tr style="${u.isBlocked?'background:#ffeaea;':''}">
            <td><strong>${u.id||u.phone||'غير محدد'}</strong></td>
            <td><strong>${u.name}</strong><br><small>📞 ${u.phone}</small><br><small>✉️ ${u.email||'-'}</small></td>
            <td><small>${primaryAddr}</small></td>
            <td><small>${u.joinDate||'غير مسجل'}</small></td>
            <td style="text-align:center;"><strong>${userOrders.length}</strong></td>
            <td style="text-align:center;"><span style="color:green;">${deliveredOrders}</span> / <span style="color:red;">${userOrders.filter(o=>o.status==="Cancelled").length}</span></td>
            <td style="color:#f38c18;font-weight:bold;">${totalSpent} ج.م<br><small style="color:#1d364a;">🪙 رصيد: ${u.points||0}</small></td>
            <td>${blockStatus}</td>
            <td>
                <button class="btn" style="background:#17a2b8;margin-bottom:5px;padding:5px 10px;" onclick="editCustomerFull('${u.phone}')">⚙️ تعديل</button>
                <button class="btn" style="background:#f38c18;margin-bottom:5px;padding:5px 10px;" onclick="viewCustomerPointsHistory('${u.phone}')">📜 السجل (${historyCount})</button>
                <button class="btn btn-red" style="margin-bottom:5px;padding:5px 10px;" onclick="deleteCustomerFull('${u.phone}')">🗑️ حذف</button>
                <button class="btn ${u.isBlocked?'btn-green':'btn-red'}" style="padding:5px 10px;" onclick="toggleBlockUser('${u.phone}')">${u.isBlocked?'فك الحظر':'حظر'}</button>
            </td>
        </tr>`;
    });
};

window.deleteCustomerFull = function(phone) {
    let phoneKey = window.getShortPhone(phone);
    if(confirm("هل أنت متأكد من حذف هذا العميل وكل بياناته نهائياً؟")) {
        db.ref('/users/' + phoneKey).remove().then(() => {
            alert("تم مسح العميل من الداتابيز بنجاح! 🗑️");
            if (typeof renderAdminCustomers === "function") renderAdminCustomers();
        });
    }
};

window.editCustomerFull = function(phone) {
    let usersDB = JSON.parse(localStorage.getItem("eljory_users_db")) || [];
    let u = usersDB.find(x => window.getShortPhone(x.phone) === window.getShortPhone(phone));
    if(!u) return;
    document.getElementById("editCustPhoneKey").value = window.getShortPhone(phone);
    document.getElementById("editCustName").value     = u.name   || "";
    document.getElementById("editCustPhone").value    = u.phone  || "";
    document.getElementById("editCustEmail").value    = u.email  || "";
    document.getElementById("editCustPoints").value   = u.points || 0;
    let primaryAddr = "";
    if (u.addresses && u.addresses.length > 0) {
        let p = u.addresses.find(a=>a.isPrimary);
        primaryAddr = p ? p.text : u.addresses[0].text;
    } else if (u.address) { primaryAddr = u.address; }
    document.getElementById("editCustAddress").value = primaryAddr;
    document.getElementById("editCustomerModal").style.display = "flex";
};

window.saveCustomerEdit = function() {
    let phoneKey = document.getElementById("editCustPhoneKey").value;
    let usersDB  = JSON.parse(localStorage.getItem("eljory_users_db")) || [];
    let u        = usersDB.find(x => window.getShortPhone(x.phone) === phoneKey);
    if(!u) return;
    let name        = document.getElementById("editCustName").value.trim();
    let email       = document.getElementById("editCustEmail").value.trim();
    let points      = parseFloat(document.getElementById("editCustPoints").value)  || 0;
    let newAddrText = document.getElementById("editCustAddress").value.trim();
    let addrs       = u.addresses || [];
    if(newAddrText) {
        let pIdx = addrs.findIndex(a=>a.isPrimary);
        if(pIdx > -1) { addrs[pIdx].text = newAddrText; }
        else { addrs.forEach(a=>a.isPrimary=false); addrs.push({ text:newAddrText, isPrimary:true }); }
    }
    db.ref('/users/' + phoneKey).update({ name, email, points, addresses:addrs }).then(() => {
        closeCustomerModals(); alert("تم التعديل!");
    });
};

// ⚠️ إصلاح أمني (استكمال نقطة استرجاع كلمة المرور): دي الطريقة الآمنة الوحيدة
// المتاحة دلوقتي لتوليد كلمة مرور جديدة لعميل - بعد ما الأدمن يتأكد من هوية
// العميل بنفسه (تليفون/واتساب)، يفتح تعديل العميل من هنا ويولّد له كلمة مرور
// جديدة، وبعدين يبلغه بيها يدوياً. الكلمة مبتتخزنش ولا بتتبعت لحد تاني، وبتظهر
// مرة واحدة بس للأدمن نفسه جوه اللوحة المحمية بتسجيل الدخول.
window.adminResetCustomerPassword = async function() {
    let phoneKey = document.getElementById("editCustPhoneKey").value;
    if(!phoneKey) return;
    if(!confirm("هل تأكدت من هوية العميل عبر التليفون/واتساب؟ سيتم الآن توليد كلمة مرور جديدة له.")) return;

    let newPass = Math.floor(100000 + Math.random() * 900000).toString();

    let saltArr = new Uint8Array(16);
    crypto.getRandomValues(saltArr);
    let salt = Array.from(saltArr).map(b => b.toString(16).padStart(2, '0')).join('');

    let encoder = new TextEncoder();
    let data = encoder.encode(salt + newPass);
    let hashBuffer = await crypto.subtle.digest('SHA-256', data);
    let hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    db.ref('/users/' + phoneKey).update({ passwordHash: hash, passwordSalt: salt, password: null }).then(() => {
        alert("✅ تم توليد كلمة مرور جديدة:\n\n" + newPass + "\n\nابلغها للعميل بنفسك بعد التأكد من هويته. لن تظهر هذه الكلمة مرة أخرى.");
    }).catch(() => {
        alert("❌ حدث خطأ أثناء تحديث كلمة المرور، حاول مرة أخرى.");
    });
};

window.viewCustomerPointsHistory = function(phone) {
    let usersDB = JSON.parse(localStorage.getItem("eljory_users_db")) || [];
    let u       = usersDB.find(x => window.getShortPhone(x.phone) === window.getShortPhone(phone));
    if(!u) return;
    document.getElementById("historyCustNameTitle").innerText = `📜 سجل حركات النقاط: ${u.name} | الرصيد الحالي: ${u.points||0}`;
    let tbody   = document.getElementById("historyCustBody");
    tbody.innerHTML = "";
    let history = u.pointsHistory || [];
    if(!history.length) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:gray;">لا يوجد حركات.</td></tr>`;
    } else {
        [...history].reverse().forEach(h => {
            let isEarn    = h.type === "earn";
            let typeBadge = isEarn
                ? `<span style="background:#28a745;color:white;padding:3px 8px;border-radius:4px;font-size:12px;">إضافة</span>`
                : `<span style="background:#d9534f;color:white;padding:3px 8px;border-radius:4px;font-size:12px;">خصم</span>`;
            let sign  = isEarn ? "+" : "-";
            let color = isEarn ? "green" : "red";
            tbody.innerHTML += `<tr>
                <td style="padding:10px;border-bottom:1px solid #eee;">${h.date}</td>
                <td style="padding:10px;border-bottom:1px solid #eee;">${typeBadge}</td>
                <td style="padding:10px;border-bottom:1px solid #eee;color:${color};font-weight:bold;">${sign}${h.amount}</td>
                <td style="padding:10px;border-bottom:1px solid #eee;">${h.reason}</td>
            </tr>`;
        });
    }
    document.getElementById("historyCustomerModal").style.display = "flex";
};

window.closeCustomerModals = function() {
    document.getElementById("editCustomerModal").style.display   = "none";
    document.getElementById("historyCustomerModal").style.display= "none";
};

window.toggleBlockUser = function(phone) {
    let phoneKey = window.getShortPhone(phone);
    let usersDB  = JSON.parse(localStorage.getItem("eljory_users_db")) || [];
    let u        = usersDB.find(x => window.getShortPhone(x.phone) === phoneKey);
    if(u) { db.ref('/users/' + phoneKey).update({ isBlocked: !u.isBlocked }); }
};


// ================================================================
// ⑩ إدارة الطلبات والفواتير (Orders & Invoices)
// ================================================================

window.toggleAllOrders = function(source) {
    document.querySelectorAll('.order-checkbox').forEach(cb => cb.checked = source.checked);
};

window.loadAdminOrders = function() {
    let orders      = JSON.parse(localStorage.getItem("eljory_orders")) || [];
    let tbody       = document.getElementById("adminOrdersBody");
    if(!tbody) return;
    let filterId    = document.getElementById("filterOrderId") ? document.getElementById("filterOrderId").value.trim().toLowerCase() : "";
    let filterPhone = document.getElementById("filterPhone")   ? document.getElementById("filterPhone").value.trim() : "";
    let filterStatus= document.getElementById("filterStatus")  ? document.getElementById("filterStatus").value : "all";
    let filterDate  = document.getElementById("filterDate")    ? document.getElementById("filterDate").value.trim() : "";
    tbody.innerHTML = "";
    if(document.getElementById("selectAllOrders")) document.getElementById("selectAllOrders").checked = false;
    [...orders].reverse().forEach(order => {
        let c  = order.customer || {};
        let st = order.status   || "Pending";
        if(filterId    && !order.id.toLowerCase().includes(filterId)) return;
        if(filterPhone && (!c.phone || !c.phone.includes(filterPhone))) return;
        if(filterDate  && (!order.date || !order.date.includes(filterDate))) return;
        if(filterStatus !== "all") {
            if(filterStatus === "Pending" && st !== "Pending" && st !== "Processing") return;
            if(filterStatus !== "Pending" && st !== filterStatus) return;
        }
        let statusText = "", statusColor = "", actionBtns = "";
        if(st === "Pending" || st === "Processing") {
            statusText = "تم الطلب ⏳"; statusColor = "#f38c18";
            actionBtns = `<button class="btn" style="background:#17a2b8;margin-bottom:5px;" onclick="changeOrderStatus('${order.id}','Shipped')">🚚 شحن</button>
                          <button class="btn btn-green" style="margin-bottom:5px;" onclick="changeOrderStatus('${order.id}','Delivered')">✅ توصيل</button>
                          <button class="btn btn-red" onclick="cancelOrderAdmin('${order.id}')">❌ إلغاء</button>`;
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
        tbody.innerHTML += `<tr>
            <td style="text-align:center;"><input type="checkbox" class="order-checkbox" value="${order.id}" style="width:18px;height:18px;cursor:pointer;"></td>
            <td><strong>${order.id}</strong></td>
            <td>${order.date}</td>
            <td><strong>${c.name}</strong><br><small>📞 ${c.phone}</small></td>
            <td style="color:#f38c18;font-weight:bold;">${order.total} ج.م</td>
            <td style="color:${statusColor};font-weight:bold;">${statusText}</td>
            <td><button class="btn" style="background:#1d364a;margin-bottom:5px;" onclick="openInvoice('${order.id}')">👁️ الفاتورة</button><br>${actionBtns}</td>
        </tr>`;
    });
};

window.changeOrderStatus = function(orderId, newStatus) {
    let orders = JSON.parse(localStorage.getItem("eljory_orders")) || [];
    let order  = orders.find(o => o.id === orderId);
    if(!order) return;
    let oldStatus = order.status;
    db.ref('/orders/' + orderId).update({ status: newStatus }).then(() => {
        let alertMsg = "تم تغيير حالة الطلب بنجاح!";
        if (newStatus === "Delivered" && oldStatus !== "Delivered") {
            let loyaltySettings = JSON.parse(localStorage.getItem("eljory_loyalty_settings")) || { system:"global", spent:10, earn:1 };
            let pointsEarned    = 0;
            let orderTotal      = parseFloat(order.total) || 0;
            let orderPhoneShort = window.getShortPhone(order.customer.phone);
            let usersDB         = JSON.parse(localStorage.getItem("eljory_users_db")) || [];
            let u               = usersDB.find(u => window.getShortPhone(u.phone) === orderPhoneShort);
            if (u) {
                if (loyaltySettings.system === "global") {
                    let spent = parseFloat(loyaltySettings.spent)||10;
                    let earn  = parseFloat(loyaltySettings.earn) ||1;
                    pointsEarned = Math.floor(orderTotal / spent) * earn;
                } else if (loyaltySettings.system === "product") {
                    let productsDB = JSON.parse(localStorage.getItem("eljory_products")) || [];
                    if(order.items) order.items.forEach(item => {
                        let p = productsDB.find(prod => String(prod.id) === String(item.id));
                        if (p && p.points) pointsEarned += (parseFloat(p.points) * (parseInt(item.qty)||1));
                    });
                }
                if (pointsEarned > 0) {
                    db.ref('/users/' + orderPhoneShort + '/points').transaction(curr => (curr||0) + pointsEarned);
                    let historyRef = db.ref('/users/' + orderPhoneShort + '/pointsHistory');
                    historyRef.once('value').then(snap => {
                        let hist = snap.val() || [];
                        hist.push({ type:"earn", amount:pointsEarned, reason:`كسب نقاط من طلب رقم #${order.id} (بقيمة ${orderTotal} ج.م)`, date:new Date().toLocaleDateString('en-GB') });
                        historyRef.set(hist);
                    });
                    db.ref('/orders/' + orderId).update({ earnedPoints: pointsEarned });
                    alertMsg = `تم التوصيل بنجاح! ✅\nتمت إضافة (${pointsEarned}) نقطة لمحفظة العميل.`;
                }
            } else { alertMsg = `تم التوصيل ✅\n⚠️ تحذير: لم يتم العثور على حساب مسجل لإضافة النقاط.`; }
        }
        alert(alertMsg);
    });
};

window.cancelOrderAdmin = function(orderId) {
    if(!confirm("هل أنت متأكد من إلغاء هذا الطلب وإرجاع المنتجات للمخزون؟")) return;
    let orders = JSON.parse(localStorage.getItem("eljory_orders")) || [];
    let order  = orders.find(o => o.id === orderId);
    if(!order) return;
    db.ref('/orders/' + orderId).update({ status:"Cancelled" }).then(() => {
        if(order.items) order.items.forEach(item => {
            db.ref('/products/' + item.id + '/stock').transaction(stock => (stock||0) + item.qty);
        });
        alert("تم الإلغاء بنجاح!");
    });
};

window.openInvoice = function(orderId) {
    let orders   = JSON.parse(localStorage.getItem("eljory_orders")) || [];
    let order    = orders.find(o => o.id === orderId);
    if(!order) return;
    let c = order.customer || {};
    document.getElementById("invCustNameNew").innerText  = c.name  || "---";
    document.getElementById("invCustPhoneNew").innerText = c.phone || "---";
    document.getElementById("invCustAddrNew").innerText  = c.address|| "---";
    document.getElementById("invDateNew").innerText      = order.date || "---";
    document.getElementById("invShipFeeNew").innerText   = order.shippingFee || "0";
    let tbody    = document.getElementById("invProductsNew");
    let allProds = JSON.parse(localStorage.getItem("eljory_products")) || [];
    let rowsHtml = "";
    order.items.forEach(item => {
        let pData    = allProds.find(p => p.id === item.id);
        let pName    = pData ? pData.titleAr : item.id;
        let rowTotal = item.price * item.qty;
        rowsHtml += `<tr>
            <td style="border:2px solid black;border-right:none;padding:6px;text-align:center;">${item.id}</td>
            <td style="border:2px solid black;padding:6px;text-align:center;">${pName}</td>
            <td style="border:2px solid black;padding:6px;text-align:center;">${item.qty}</td>
            <td style="border:2px solid black;padding:6px;text-align:center;">${item.price}</td>
            <td style="border:2px solid black;border-left:none;padding:6px;text-align:center;">${rowTotal}</td>
        </tr>`;
    });
    let emptyRows = Math.max(0, 4 - order.items.length);
    for(let i=0; i<emptyRows; i++){
        rowsHtml += `<tr><td style="border:2px solid black;border-right:none;height:25px;text-align:center;"></td><td style="border:2px solid black;text-align:center;"></td><td style="border:2px solid black;text-align:center;"></td><td style="border:2px solid black;text-align:center;"></td><td style="border:2px solid black;border-left:none;text-align:center;"></td></tr>`;
    }
    tbody.innerHTML = rowsHtml;
    document.getElementById("invTotalAmountNew").innerText = order.total;
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
            @page { size: A5 landscape; margin: 3mm; }
            body { font-family:'Segoe UI',Tahoma,Arial,sans-serif; background:white; margin:0; padding:0; }
            * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; box-sizing:border-box; }
            .page-break { page-break-after:always; page-break-inside:avoid; width:100%; height:138mm; overflow:hidden; margin:0; padding:5px; }
            .page-break:last-child { page-break-after:auto; }
            .page-break > div, #printArea { zoom:0.7; width:100% !important; max-width:1000px; margin:0 auto; padding:0 !important; }
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
    let rowsHtml = "";
    order.items.forEach(item => {
        let pData    = allProds.find(p => p.id === item.id);
        let pName    = pData ? pData.titleAr : item.id;
        let rowTotal = item.price * item.qty;
        rowsHtml += `<tr><td style="border:2px solid black;border-right:none;padding:6px;text-align:center;">${item.id}</td><td style="border:2px solid black;padding:6px;text-align:center;">${pName}</td><td style="border:2px solid black;padding:6px;text-align:center;">${item.qty}</td><td style="border:2px solid black;padding:6px;text-align:center;">${item.price}</td><td style="border:2px solid black;border-left:none;padding:6px;text-align:center;">${rowTotal}</td></tr>`;
    });
    let emptyRows = Math.max(0, 4 - order.items.length);
    for(let i=0; i<emptyRows; i++){
        rowsHtml += `<tr><td style="border:2px solid black;border-right:none;height:25px;text-align:center;"></td><td style="border:2px solid black;text-align:center;"></td><td style="border:2px solid black;text-align:center;"></td><td style="border:2px solid black;text-align:center;"></td><td style="border:2px solid black;border-left:none;text-align:center;"></td></tr>`;
    }
    return `<div style="width:100%;max-width:1000px;margin:0 auto;background:white;padding:5px;">
        <div style="border:4px solid black;display:flex;direction:rtl;position:relative;background:white;">
            <div style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;justify-content:center;align-items:center;z-index:0;opacity:0.15;pointer-events:none;">
                <div style="text-align:center;line-height:1;"><span style="font-size:120px;font-weight:900;letter-spacing:-5px;color:#1d364a;">El</span><span style="font-size:120px;font-weight:900;letter-spacing:-5px;color:#e68a10;">Jory</span><br><span style="font-size:40px;font-weight:bold;letter-spacing:15px;color:#1d364a;">STORE</span></div>
            </div>
            <div style="width:85%;z-index:1;">
                <table style="width:100%;border-collapse:collapse;text-align:center;font-size:18px;font-weight:bold;">
                    <tr><td colspan="5" style="background:#e68a10;color:white;border-bottom:2px solid black;padding:8px;font-size:28px;font-weight:900;letter-spacing:2px;text-align:center;">El Jory Store &nbsp;&nbsp;:&nbsp;&nbsp; 01100395049</td></tr>
                    <tr><td style="border:2px solid black;border-right:none;padding:6px;text-align:center;">التاريخ :-</td><td colspan="4" style="border:2px solid black;border-left:none;padding:6px;font-size:20px;text-align:center;">${c.date||order.date||"---"}</td></tr>
                    <tr><td style="border:2px solid black;border-right:none;padding:6px;text-align:center;">اسم العميل :-</td><td style="border:2px solid black;padding:6px;width:35%;text-align:center;">${c.name||"---"}</td><td style="border:2px solid black;padding:6px;text-align:center;">تليفون</td><td colspan="2" style="border:2px solid black;border-left:none;padding:6px;font-size:18px;text-align:center;">${c.phone||"---"}</td></tr>
                    <tr><td style="border:2px solid black;border-right:none;padding:6px;text-align:center;">العنوان :-</td><td colspan="4" style="border:2px solid black;border-left:none;padding:6px;text-align:center;">${c.address||"---"}</td></tr>
                    <tr style="background:#f9f9f9;"><td style="border:2px solid black;border-right:none;padding:8px;font-size:18px;text-align:center;width:12%;">كود</td><td style="border:2px solid black;padding:8px;font-size:18px;text-align:center;width:38%;">اسم المنتج</td><td style="border:2px solid black;padding:8px;font-size:18px;text-align:center;">الكمية</td><td style="border:2px solid black;padding:8px;font-size:18px;text-align:center;">السعر للوحدة</td><td style="border:2px solid black;border-left:none;padding:8px;font-size:18px;text-align:center;width:15%;">الإجمالي</td></tr>
                    ${rowsHtml}
                    <tr><td colspan="4" style="border:2px solid black;border-right:none;padding:6px;text-align:center;">مصاريف شحن</td><td style="border:2px solid black;border-left:none;padding:6px;font-size:18px;text-align:center;">${order.shippingFee||"0"}</td></tr>
                    <tr><td colspan="4" style="border:2px solid black;border-right:none;border-bottom:none;padding:6px;font-size:22px;text-align:center;font-weight:bold;">الإجمالي</td><td style="border:2px solid black;border-left:none;border-bottom:none;padding:6px;background:linear-gradient(to right,#1d364a,#e68a10);color:white;font-size:24px;text-align:center;-webkit-print-color-adjust:exact;">${order.total}</td></tr>
                </table>
            </div>
            <div style="width:15%;border-right:4px solid black;display:flex;flex-direction:column;justify-content:space-between;align-items:center;padding:10px 0;z-index:1;background:white;">
                <div style="width:80px;height:80px;display:flex;justify-content:center;align-items:center;"><img src="qr-code face book .png" alt="Facebook QR" style="max-width:100%;max-height:100%;object-fit:contain;"></div>
                <div style="width:100%;padding:0 5px;display:flex;justify-content:center;align-items:center;margin:15px 0;"><img src="logo.png" alt="El Jory Store Logo" style="max-width:100%;height:auto;object-fit:contain;"></div>
                <div style="width:80px;height:80px;display:flex;justify-content:center;align-items:center;"><img src="qr-code whatsapp .png" alt="WhatsApp QR" style="max-width:100%;max-height:100%;object-fit:contain;"></div>
            </div>
        </div>
        <div style="text-align:center;font-weight:bold;font-size:14px;margin-top:10px;color:black;">ضمان على منتجات الإكسسوارات لمدة 6 أشهر، وضمان الحماية لمدة 12 شهرًا من تاريخ الفاتورة.</div>
    </div>`;
};


// ================================================================
// ⑪ إدارة العروض والبروموكود (Promos)
// ================================================================

let promoSelectedProducts = [];

window.togglePromoValue = function() {
    let type = document.getElementById("promoType").value;
    document.getElementById("promoValueGroup").style.display = type === "shipping" ? "none" : "block";
};

window.togglePromoScope = function() {
    let scope = document.getElementById("promoScope").value;
    let box   = document.getElementById("specificProductsBox");
    if(scope === "specific") {
        box.style.display = "block";
        let products = JSON.parse(localStorage.getItem("eljory_products")) || [];
        let select   = document.getElementById("promoSelectProd");
        select.innerHTML = `<option value="">-- اختر منتج --</option>`;
        products.forEach(p => select.innerHTML += `<option value="${p.id}">${p.titleAr} (${p.id})</option>`);
        renderPromoSelectedList();
    } else {
        box.style.display = "none";
        promoSelectedProducts = [];
    }
};

window.addProdToPromo = function() {
    let select = document.getElementById("promoSelectProd");
    let val    = select.value;
    if(val && !promoSelectedProducts.includes(val)) { promoSelectedProducts.push(val); renderPromoSelectedList(); }
};

window.removeProdFromPromo = function(id) {
    promoSelectedProducts = promoSelectedProducts.filter(p => p !== id);
    renderPromoSelectedList();
};

window.renderPromoSelectedList = function() {
    let list     = document.getElementById("promoSelectedList");
    let products = JSON.parse(localStorage.getItem("eljory_products")) || [];
    list.innerHTML = "";
    promoSelectedProducts.forEach(id => {
        let p    = products.find(prod => prod.id === id);
        let name = p ? p.titleAr : id;
        list.innerHTML += `<span class="badge">${name} <span class="badge-remove" onclick="removeProdFromPromo('${id}')">✖</span></span>`;
    });
};

window.uploadPromoFile = function(event) {
    const file = event.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const text     = e.target.result;
        const ids      = text.split(/[\r\n,]+/).map(id=>id.trim()).filter(id=>id);
        let products   = JSON.parse(localStorage.getItem("eljory_products")) || [];
        let validIds   = products.map(p => p.id);
        let addedCount = 0;
        ids.forEach(id => {
            if(validIds.includes(id) && !promoSelectedProducts.includes(id)) { promoSelectedProducts.push(id); addedCount++; }
        });
        renderPromoSelectedList();
        alert(`تم سحب ${addedCount} منتج صحيح من الملف!`);
        event.target.value = "";
    };
    reader.readAsText(file);
};

window.savePromo = function() {
    let code        = document.getElementById("promoCode").value.trim().toUpperCase();
    let type        = document.getElementById("promoType").value;
    let value       = parseFloat(document.getElementById("promoValue").value) || 0;
    let scope       = document.getElementById("promoScope").value;
    let start       = document.getElementById("promoStart").value;
    let end         = document.getElementById("promoEnd").value;
    let label       = document.getElementById("promoLabel").value.trim() || "خصم خاص!";
    let maxTotal    = parseInt(document.getElementById("promoMaxTotal").value)   || null;
    let maxPerUser  = parseInt(document.getElementById("promoMaxPerUser").value) || null;
    let newUsersOnly= document.getElementById("promoNewUsersOnly").checked;
    if(!code || !start || !end) return alert("يرجى كتابة الكود وتحديد وقت البدء والانتهاء!");
    if(type !== "shipping" && value <= 0) return alert("يرجى كتابة قيمة الخصم!");
    if(scope === "specific" && promoSelectedProducts.length === 0) return alert("لم تقم بتحديد أي منتجات للخصم!");
    safeUpdateList('/promos', promos => {
        if(promos.find(p => p.code === code)) throw new Error("DUPLICATE_CODE");
        promos.push({ code, type, value, scope, products: scope==="specific"?[...promoSelectedProducts]:[], start, end, label, maxTotal, maxPerUser, newUsersOnly, usageCount:0, usedBy:{} });
        return promos;
    }).then(() => {
        alert("تم حفظ البروموكود! ✅");
        document.getElementById("promoCode").value         = "";
        document.getElementById("promoMaxTotal").value     = "";
        document.getElementById("promoMaxPerUser").value   = "";
        document.getElementById("promoNewUsersOnly").checked= false;
        promoSelectedProducts = [];
    }).catch(err => {
        if(err.message === "DUPLICATE_CODE") alert("كود الخصم ده موجود قبل كده!");
        else { console.error(err); alert("حدث خطأ أثناء الحفظ."); }
    });
};

window.renderAdminPromos = function() {
    let tbody  = document.getElementById("adminPromosBody");
    if(!tbody) return;
    let promos = JSON.parse(localStorage.getItem("eljory_promos")) || [];
    tbody.innerHTML = "";
    let now = new Date();
    if(!promos.length) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:gray;padding:20px;">لا توجد كوبونات بعد.</td></tr>';
        return;
    }
    promos.forEach(p => {
        let sDate = new Date(p.start), eDate = new Date(p.end);
        let status = "", color = "";
        if(now < sDate)      { status = "لم يبدأ بعد ⏳"; color = "#f38c18"; }
        else if(now > eDate) { status = "منتهي ❌";        color = "#d9534f"; }
        else                  { status = "نشط الآن ✅";    color = "#28a745"; }
        let typeText  = p.type==="percent"?"نسبة %":(p.type==="fixed"?"مبلغ ثابت":"شحن مجاني");
        let scopeText = p.scope==="all"?"الكل":`${(p.products||[]).length} منتجات`;
        let restrictParts = [];
        if(p.maxTotal)    restrictParts.push(`<span style="background:#1d364a;color:white;padding:2px 7px;border-radius:10px;font-size:11px;">الكلي: ${p.maxTotal}</span>`);
        if(p.maxPerUser)  restrictParts.push(`<span style="background:#17a2b8;color:white;padding:2px 7px;border-radius:10px;font-size:11px;">للعميل: ${p.maxPerUser}</span>`);
        if(p.newUsersOnly)restrictParts.push(`<span style="background:#f38c18;color:#1d364a;padding:2px 7px;border-radius:10px;font-size:11px;font-weight:bold;">جدد فقط</span>`);
        let restrictHtml = restrictParts.length ? restrictParts.join(' ') : '<span style="color:gray;font-size:12px;">بلا قيود</span>';
        let usageCount   = p.usageCount || 0;
        let usedByCount  = p.usedBy ? Object.keys(p.usedBy).length : 0;
        let maxTotalDisp = p.maxTotal ? `/ ${p.maxTotal}` : '';
        let usageColor   = (p.maxTotal && usageCount >= p.maxTotal) ? '#d9534f' : '#28a745';
        tbody.innerHTML += `<tr>
            <td><strong style="font-size:15px;">${p.code}</strong></td>
            <td>${typeText}</td>
            <td>${p.type==="shipping"?"-":p.value}</td>
            <td style="font-size:12px;">${p.start.replace("T"," ")}</td>
            <td style="font-size:12px;">${p.end.replace("T"," ")}</td>
            <td>${scopeText}</td>
            <td>${restrictHtml}</td>
            <td><div style="text-align:center;"><span style="font-size:20px;font-weight:bold;color:${usageColor};">${usageCount}</span><span style="color:gray;font-size:13px;">${maxTotalDisp}</span><br><small style="color:#555;">${usedByCount} عميل</small></div></td>
            <td style="color:${color};font-weight:bold;">${status}</td>
            <td><button class="btn btn-red" onclick="deletePromo('${p.code}')">حذف</button></td>
        </tr>`;
    });
};

window.deletePromo = function(code) {
    safeUpdateList('/promos', promos => promos.filter(p => p.code !== code));
};


// ================================================================
// ⑫ نظام الولاء والمكافآت (Loyalty & Rewards)
// ================================================================

window.loadAdminLoyalty = function() {
    let settings = JSON.parse(localStorage.getItem("eljory_loyalty_settings")) || { system:"global", spent:10, earn:1, expiry:"" };
    if(!document.getElementById("loyaltySysGlobal")) return;
    document.getElementById("loyaltySysGlobal").checked  = settings.system === "global";
    document.getElementById("loyaltySysProduct").checked = settings.system === "product";
    document.getElementById("loyaltyGlobalSpent").value  = settings.spent;
    document.getElementById("loyaltyGlobalEarn").value   = settings.earn;
    toggleLoyaltyView();
    renderLoyaltyProductsTable();
};

window.toggleLoyaltyView = function() {
    let system = document.querySelector('input[name="loyaltySystem"]:checked').value;
    document.getElementById("loyaltyGlobalSettings").style.display  = system === "global"  ? "block" : "none";
    document.getElementById("loyaltyProductSettings").style.display = system === "product" ? "block" : "none";
    document.getElementById("labelSysGlobal").style.borderColor     = system === "global"  ? "#f38c18" : "transparent";
    document.getElementById("labelSysProduct").style.borderColor    = system === "product" ? "#f38c18" : "transparent";
};

window.saveLoyaltySettings = function() {
    let system = document.querySelector('input[name="loyaltySystem"]:checked').value;
    let spent  = document.getElementById("loyaltyGlobalSpent").value || 10;
    let earn   = document.getElementById("loyaltyGlobalEarn").value  || 1;
    let settings = { system, spent: parseFloat(spent), earn: parseFloat(earn) };
    db.ref('/settings').set(settings).then(() => alert("تم حفظ إعدادات الولاء!"));
};

window.renderLoyaltyProductsTable = function() {
    let tbody    = document.getElementById("loyaltyProductsBody");
    if(!tbody) return;
    tbody.innerHTML = "";
    let products = JSON.parse(localStorage.getItem("eljory_products")) || [];
    products.forEach(p => {
        let currentPts = p.points || 0;
        tbody.innerHTML += `<tr>
            <td><img src="${p.img}" style="width:50px;height:50px;object-fit:cover;border-radius:5px;"></td>
            <td><strong>${p.titleAr}</strong></td>
            <td>${p.price} ج.م</td>
            <td><input type="number" id="pts_${p.id}" class="form-control" value="${currentPts}" style="width:100%;"></td>
            <td><button class="btn btn-green" onclick="saveProductPoints('${p.id}')">حفظ</button></td>
        </tr>`;
    });
};

window.saveProductPoints = function(productId) {
    let newPts = parseFloat(document.getElementById(`pts_${productId}`).value) || 0;
    db.ref('/products/' + productId + '/points').set(newPts).then(() => alert("تم حفظ النقاط للمنتج!"));
};

window.toggleRewardFields = function() {
    let type = document.getElementById("rewardType").value;
    document.getElementById("rewardDiscountGroup").style.display  = type === "discount" ? "block" : "none";
    document.getElementById("rewardGiftDescGroup").style.display  = type === "gift"     ? "block" : "none";
    document.getElementById("rewardGiftImgGroup").style.display   = type === "gift"     ? "block" : "none";
};

window.saveReward = function() {
    let name        = document.getElementById("rewardName").value.trim();
    let cost        = parseInt(document.getElementById("rewardCost").value);
    let type        = document.getElementById("rewardType").value;
    let discountVal = parseFloat(document.getElementById("rewardDiscountVal").value) || 0;
    let giftDesc    = document.getElementById("rewardGiftDesc").value.trim();
    let giftImg     = document.getElementById("rewardGiftImg").value.trim();
    if(!name || isNaN(cost) || cost <= 0) return alert("يرجى إدخال تكلفة المكافأة بشكل صحيح!");
    if(type === "discount" && discountVal <= 0) return alert("يرجى إدخال قيمة الخصم!");
    if(type === "gift" && !giftDesc) return alert("يرجى كتابة الوصف!");
    safeUpdateList('/rewards', rewards => {
        rewards.push({ id:"RWD_"+Date.now(), name, cost, type, discountVal, giftDesc, giftImg: giftImg||"https://via.placeholder.com/100" });
        return rewards;
    }).then(() => {
        alert("تمت إضافة المكافأة!");
        document.getElementById("rewardName").value        = "";
        document.getElementById("rewardCost").value        = "";
        document.getElementById("rewardDiscountVal").value = "";
        document.getElementById("rewardGiftDesc").value    = "";
        document.getElementById("rewardGiftImg").value     = "";
    });
};

window.renderAdminRewards = function() {
    let tbody   = document.getElementById("adminRewardsBody");
    if(!tbody) return;
    tbody.innerHTML = "";
    let rewards = JSON.parse(localStorage.getItem("eljory_rewards")) || [];
    rewards.forEach(r => {
        let typeText    = r.type==="discount"?"خصم مالي":(r.type==="shipping"?"شحن مجاني":"هدية خارجية");
        let detailsText = r.type==="discount"
            ? `خصم ${r.discountVal} ج.م`
            : (r.type==="shipping" ? "-" : `<img src="${r.giftImg}" style="width:40px;height:40px;object-fit:cover;border-radius:5px;"><br><small style="color:gray;">${r.giftDesc}</small>`);
        tbody.innerHTML += `<tr>
            <td><strong>${r.name}</strong></td>
            <td>${typeText}</td>
            <td><span style="color:#f38c18;font-weight:bold;font-size:16px;">${r.cost} نقطة</span></td>
            <td>${detailsText}</td>
            <td><button class="btn btn-red" onclick="deleteReward('${r.id}')">حذف</button></td>
        </tr>`;
    });
};

window.deleteReward = function(id) {
    if(!confirm("متأكد من الحذف؟")) return;
    safeUpdateList('/rewards', rewards => rewards.filter(r => r.id !== id));
};

window.renderGlobalPoints = function() {
    let tbody  = document.getElementById("globalPointsBody");
    if(!tbody) return;
    let nameF  = document.getElementById("filterPtsName").value.trim().toLowerCase();
    let phoneF = document.getElementById("filterPtsPhone").value.trim();
    let reasonF= document.getElementById("filterPtsReason").value.trim().toLowerCase();
    let dateF  = document.getElementById("filterPtsDate").value.trim().toLowerCase();
    let usersDB= JSON.parse(localStorage.getItem("eljory_users_db")) || [];
    let allTx  = [];
    usersDB.forEach(u => {
        if(u.pointsHistory && u.pointsHistory.length > 0) {
            u.pointsHistory.forEach(h => {
                allTx.push({ name:u.name||"غير معروف", phone:u.phone||"-", date:h.date||"", type:h.type, amount:h.amount, reason:h.reason||"" });
            });
        }
    });
    allTx.reverse();
    let filtered = allTx.filter(t => {
        if(nameF   && !t.name.toLowerCase().includes(nameF))   return false;
        if(phoneF  && !t.phone.includes(phoneF))               return false;
        if(reasonF && !t.reason.toLowerCase().includes(reasonF))return false;
        if(dateF   && !t.date.toLowerCase().includes(dateF))   return false;
        return true;
    });
    tbody.innerHTML = "";
    if(!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:gray;padding:20px;">لا توجد حركات مطابقة للبحث.</td></tr>`;
        return;
    }
    filtered.forEach(t => {
        let isEarn    = t.type === "earn";
        let typeBadge = isEarn
            ? `<span style="background:#28a745;color:white;padding:3px 8px;border-radius:4px;font-size:12px;">إضافة</span>`
            : `<span style="background:#d9534f;color:white;padding:3px 8px;border-radius:4px;font-size:12px;">خصم</span>`;
        let sign  = isEarn ? "+" : "-";
        let color = isEarn ? "green" : "red";
        tbody.innerHTML += `<tr>
            <td style="font-size:13px;">${t.date}</td>
            <td><strong>${t.name}</strong><br><small>📞 ${t.phone}</small></td>
            <td>${typeBadge}</td>
            <td style="color:${color};font-weight:bold;font-size:15px;">${sign}${t.amount}</td>
            <td style="font-size:13px;">${t.reason}</td>
        </tr>`;
    });
};

window.exportGlobalPointsCSV = function() {
    let usersDB = JSON.parse(localStorage.getItem("eljory_users_db")) || [];
    let allTx   = [];
    usersDB.forEach(u => {
        if(u.pointsHistory && u.pointsHistory.length > 0) {
            u.pointsHistory.forEach(h => {
                allTx.push({ name:u.name||"غير معروف", phone:u.phone||"-", date:h.date||"", type:h.type, amount:h.amount, reason:h.reason||"" });
            });
        }
    });
    if(!allTx.length) return alert("لا توجد بيانات لتصديرها.");
    let csvContent = "التاريخ;اسم العميل;التليفون;نوع الحركة;النقاط;السبب والتفاصيل\r\n";
    allTx.reverse().forEach(t => {
        let typeStr = t.type==="earn"?"إضافة":"خصم";
        let sign    = t.type==="earn"?"+":"-";
        csvContent += [`"${t.date}"`,`"${t.name}"`,`"${t.phone}"`,`"${typeStr}"`,`"${sign}${t.amount}"`,`"${t.reason}"`].join(";") + "\r\n";
    });
    let bom  = new Uint8Array([0xEF,0xBB,0xBF]);
    let blob = new Blob([bom, csvContent], { type:'text/csv;charset=utf-8;' });
    let url  = URL.createObjectURL(blob);
    let link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "ElJory_Points_History.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
};


// ================================================================
// ⑬ إدارة واجهة المتجر والبانرات (Banners & Storefront)
// ================================================================

window.updateBannerLinkPlaceholder = function() {
    let type  = document.getElementById("bannerLinkType").value;
    let input = document.getElementById("bannerLinkValue");
    if(type === "product")  input.placeholder = "اكتب كود المنتج المستهدف هنا...";
    else if(type==="category") input.placeholder = "اكتب كود القسم المستهدف هنا...";
    else input.placeholder = "https://example.com/custom-link";
};

window.saveBanner = function() {
    let title    = document.getElementById("bannerTitle").value.trim();
    let img      = document.getElementById("bannerImg").value.trim();
    let linkType = document.getElementById("bannerLinkType").value;
    let linkValue= document.getElementById("bannerLinkValue").value.trim();
    let priority = parseInt(document.getElementById("bannerPriority").value) || 1;
    if(!img) return alert("يرجى اختيار صورة للبانر الإعلاني!");
    safeUpdateList('/banners', banners => {
        banners.push({ id:"BNR_"+Date.now(), title, img, linkType, linkValue, priority, isActive:true });
        return banners;
    }).then(() => {
        document.getElementById("bannerTitle").value    = "";
        document.getElementById("bannerLinkValue").value= "";
        document.getElementById("bannerPriority").value = "1";
        alert("تم حفظ وتفعيل البانر الإعلاني على الواجهة!");
    });
};

window.renderAdminBanners = function() {
    let tbody   = document.getElementById("adminBannersBody");
    if(!tbody) return;
    tbody.innerHTML = "";
    let banners = JSON.parse(localStorage.getItem("eljory_banners")) || [];
    banners.sort((a,b) => a.priority - b.priority);
    if(!banners.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:gray;padding:20px;">لا توجد إعلانات أو بانرات معروضة حالياً.</td></tr>`;
        return;
    }
    banners.forEach(b => {
        let isActive = b.isActive !== false;
        let activeBtn= `<button class="btn ${isActive?'btn-green':'btn-inactive'}" style="padding:5px 10px;" onclick="toggleBannerStatus('${b.id}')">${isActive?'نشط 👁️':'مخفي 🙈'}</button>`;
        let routeTxt = b.linkType==="product"?`منتج: ${b.linkValue}`:(b.linkType==="category"?`قسم: ${b.linkValue}`:`رابط: ${b.linkValue||'-'}`);
        tbody.innerHTML += `<tr>
            <td><img src="${b.img}" style="width:120px;height:40px;object-fit:cover;border-radius:4px;border:1px solid #ddd;"></td>
            <td><strong>${b.title||"بدون عنوان"}</strong></td>
            <td><small style="background:#eef2f5;padding:3px 6px;border-radius:4px;">${routeTxt}</small></td>
            <td>${b.priority}</td>
            <td>${activeBtn}</td>
            <td><button class="btn btn-red" onclick="deleteBanner('${b.id}')">حذف</button></td>
        </tr>`;
    });
};

window.toggleBannerStatus = function(id) {
    safeUpdateList('/banners', banners => {
        let index = banners.findIndex(b => b.id === id);
        if(index > -1) banners[index].isActive = !banners[index].isActive;
        return banners;
    });
};

window.deleteBanner = function(id) {
    if(!confirm("هل أنت متأكد من مسح هذا البانر الإعلاني؟")) return;
    safeUpdateList('/banners', banners => banners.filter(b => b.id !== id));
};


// ================================================================
// ⑭ استوديو الصور ورفع الصور (Gallery & Image Upload)
// ================================================================

let currentTargetInputId = null;
let directUploadTargetId = null;

window.openGalleryModal = function(targetInputId = null) {
    currentTargetInputId = targetInputId;
    document.getElementById("galleryModal").style.display = "flex";
    renderGalleryGrid();
};

window.closeGalleryModal = function() {
    document.getElementById("galleryModal").style.display = "none";
    currentTargetInputId = null;
};

window.renderGalleryGrid = function() {
    let gallery  = JSON.parse(localStorage.getItem("eljory_gallery")) || [];
    let gridArea = document.getElementById("galleryGridArea");
    gridArea.innerHTML = "";
    if(!gallery.length) {
        gridArea.innerHTML = "<p style='grid-column:1/-1;text-align:center;color:gray;padding:20px;font-weight:bold;'>الاستوديو فارغ حالياً.</p>";
        return;
    }
    [...gallery].reverse().forEach(imgObj => {
        gridArea.innerHTML += `<div style="border:1px solid #ddd;border-radius:8px;overflow:hidden;background:white;box-shadow:0 2px 5px rgba(0,0,0,0.1);display:flex;flex-direction:column;">
            <div style="height:150px;background:#f4f4f4;display:flex;justify-content:center;align-items:center;overflow:hidden;">
                <img src="${imgObj.data}" style="width:100%;height:100%;object-fit:cover;cursor:pointer;"
                     onclick="selectImageFromGallery('${imgObj.data}')" title="اضغط لاختيار هذه الصورة">
            </div>
            <div style="padding:10px;flex-grow:1;display:flex;flex-direction:column;justify-content:space-between;">
                <p style="font-size:12px;margin:0 0 10px 0;color:#333;word-break:break-all;text-align:center;font-weight:bold;">${imgObj.name}</p>
                <button onclick="deleteFromGallery('${imgObj.id}')"
                        style="background:#d9534f;color:white;border:none;padding:5px;cursor:pointer;border-radius:4px;font-size:12px;width:100%;">🗑️ حذف الصورة</button>
            </div>
        </div>`;
    });
};

window.selectImageFromGallery = function(imgData) {
    if (currentTargetInputId) {
        let inputField = document.getElementById(currentTargetInputId);
        if(inputField) { inputField.value = imgData; inputField.dispatchEvent(new Event('change')); }
        closeGalleryModal();
    } else {
        navigator.clipboard.writeText(imgData).then(() => alert("📋 تم نسخ الرابط السحابي للصورة!"));
    }
};

window.triggerDirectUpload = function(inputId) {
    directUploadTargetId = inputId;
    document.getElementById("directUploadInput").click();
};

window.handleDirectUpload = function(event) {
    let file = event.target.files[0]; if(!file) return;
    compressAndSaveImage(file, true);
};

window.uploadToGallery = function(event) {
    let file = event.target.files[0]; if(!file) return;
    compressAndSaveImage(file, false);
};

function compressAndSaveImage(file, isDirectUpload) {
    let targetId   = isDirectUpload ? directUploadTargetId : null;
    let isBanner   = targetId === 'bannerImg' || targetId === 'editBannerImg';
    let isProduct  = targetId === 'newProdImg' || targetId === 'editCatImg';
    let targetW, targetH, forceCrop = false;
    if (isBanner)       { targetW = 1200; targetH = 400;  forceCrop = true;  }
    else if (isProduct) { targetW = 600;  targetH = 600;  forceCrop = true;  }
    else                { targetW = 800;                   forceCrop = false; }
    let uploadMsg = isDirectUpload && targetId ? document.getElementById(targetId) : null;
    if(uploadMsg) uploadMsg.value = "جاري الرفع لـ Firebase... ⏳";
    let reader = new FileReader();
    reader.onload = function(e) {
        let img = new Image();
        img.onload = function() {
            let canvas = document.createElement('canvas');
            let ctx    = canvas.getContext('2d');
            if (forceCrop) {
                canvas.width  = targetW; canvas.height = targetH;
                let imgRatio    = img.width / img.height;
                let targetRatio = targetW / targetH;
                let srcX = 0, srcY = 0, srcW = img.width, srcH = img.height;
                if (imgRatio > targetRatio) { srcW = img.height * targetRatio; srcX = (img.width - srcW) / 2; }
                else                        { srcH = img.width  / targetRatio; srcY = (img.height- srcH) / 2; }
                ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, targetW, targetH);
            } else {
                let scaleSize = targetW / img.width;
                if (img.width > targetW) { canvas.width = targetW; canvas.height = img.height * scaleSize; }
                else                     { canvas.width = img.width; canvas.height = img.height; }
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            }
            canvas.toBlob(function(blob) {
                let fileName   = "IMG_" + Date.now() + ".jpg";
                let storageRef = storage.ref('gallery/' + fileName);
                storageRef.put(blob).then(function(snapshot) {
                    snapshot.ref.getDownloadURL().then(function(downloadURL) {
                        safeUpdateList('/gallery', gallery => {
                            gallery.push({ id:fileName, name:file.name, data:downloadURL });
                            return gallery;
                        }).then(() => {
                            if (window._directUploadTargetCallback) {
                                window._directUploadTargetCallback(downloadURL);
                                window._directUploadTargetCallback = null;
                            } else if(isDirectUpload && targetId) {
                                let inputField = document.getElementById(targetId);
                                if(inputField) { inputField.value = downloadURL; inputField.dispatchEvent(new Event('change')); }
                            } else {
                                alert("✅ تم رفع الصورة للسحابة بنجاح!");
                                renderGalleryGrid();
                            }
                        });
                    });
                }).catch(function() { alert("❌ فشل الرفع لفايربيس!"); if(uploadMsg) uploadMsg.value = ""; });
            }, 'image/jpeg', 0.85);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

window.deleteFromGallery = function(id) {
    if(confirm("هل أنت متأكد من حذف هذه الصورة؟ (سيتم حذف الرابط فقط من الاستوديو)")) {
        safeUpdateList('/gallery', gallery => gallery.filter(g => g.id !== id));
    }
};


// ================================================================
// ⑮ إدارة فريق العمل والصلاحيات (Admin Team)
// ================================================================

window.addNewAdmin = function(event) {
    let email = document.getElementById("newAdminEmail").value.trim();
    let pass  = document.getElementById("newAdminPass").value;
    if(!email || pass.length < 6) {
        alert("يرجى كتابة بريد إلكتروني صحيح وكلمة مرور لا تقل عن 6 أحرف!");
        return;
    }
    let btn = event.target;
    btn.innerText = "جاري إضافة المدير للسحابة... ⏳";
    btn.disabled  = true;
    let secondaryApp = firebase.initializeApp(firebase.app().options, "SecondaryApp" + Date.now());
    secondaryApp.auth().createUserWithEmailAndPassword(email, pass)
        .then(userCredential => {
            let newUid = userCredential.user.uid;
            db.ref('/admins/' + newUid).set(true).then(() => {
                db.ref('/admin_details/' + newUid).set({ email, date: new Date().toLocaleDateString('en-GB') });
                alert("تم إضافة المدير بنجاح واكتسب كل الصلاحيات! 🎉");
                document.getElementById("newAdminEmail").value = "";
                document.getElementById("newAdminPass").value  = "";
                secondaryApp.auth().signOut();
                secondaryApp.delete();
                btn.innerText = "➕ إضافة المدير وفتح الصلاحيات";
                btn.disabled  = false;
            });
        })
        .catch(error => {
            alert("عفواً، حدث خطأ: " + error.message);
            secondaryApp.delete();
            btn.innerText = "➕ إضافة المدير وفتح الصلاحيات";
            btn.disabled  = false;
        });
};

window.loadAdminsList = function() {
    if(!window.db) return;
    db.ref('/admin_details').on('value', snap => {
        let list = document.getElementById("adminListBody");
        if(!list) return;
        list.innerHTML = "";
        let data = snap.val();
        if(data) {
            Object.keys(data).forEach(uid => {
                let info = data[uid];
                list.innerHTML += `<tr>
                    <td><strong>${info.email}</strong></td>
                    <td>${info.date}</td>
                    <td><button class="btn btn-red" onclick="removeAdmin('${uid}')">سحب الصلاحية ❌</button></td>
                </tr>`;
            });
        } else {
            list.innerHTML = `<tr><td colspan="3" style="text-align:center;color:gray;padding:20px;">لا يوجد مديرين إضافيين حتى الآن.</td></tr>`;
        }
    });
};

window.removeAdmin = function(uid) {
    if(confirm("هل أنت متأكد من سحب صلاحيات الإدارة من هذا الحساب نهائياً؟")) {
        db.ref('/admins/' + uid).remove();
        db.ref('/admin_details/' + uid).remove();
        alert("تم سحب الصلاحيات بنجاح!");
    }
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
    if (user) {
        db.ref('/admins/' + user.uid).once('value', function(snap) {
            if(loadingScreen) loadingScreen.style.display = "none";
            if (snap.val() === true) {
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
            } else {
                firebase.auth().signOut();
                if(loginScreen) loginScreen.style.display = "flex";
                if(sidebar)     sidebar.style.display     = "none";
                if(mainPanel)   mainPanel.style.display   = "none";
                document.getElementById("adminLoginError").innerText     = "ليس لديك صلاحية الدخول.";
                document.getElementById("adminLoginError").style.display = "block";
            }
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
    }, 50);

    // الاستماع الحي للسحابة (real-time sync)
    let _adminSyncStarted = false;
    let startSync = function() {
        if (!window.db) { setTimeout(startSync, 200); return; }
        if (_adminSyncStarted) return; // منعاً للاشتراك المتكرر لو onAuthStateChanged نادى تاني
        _adminSyncStarted = true;
        window.db.ref('/').on('value', snapshot => {
            let data     = snapshot.val() || {};
            let safeSet  = (key, val) => originalSetItem.call(localStorage, key, JSON.stringify(val));
            let fbToArray= (obj) => obj ? (Array.isArray(obj) ? obj.filter(x=>x) : Object.values(obj).filter(x=>x)) : [];
            safeSet("eljory_products",        fbToArray(data.products));
            safeSet("eljory_categories",      fbToArray(data.categories));
            safeSet("eljory_orders",          fbToArray(data.orders));
            safeSet("eljory_users_db",        fbToArray(data.users));
            safeSet("eljory_regions",         fbToArray(data.regions));
            safeSet("eljory_banners",         fbToArray(data.banners));
            safeSet("eljory_promos",          fbToArray(data.promos));
            safeSet("eljory_rewards",         fbToArray(data.rewards));
            safeSet("eljory_gallery",         fbToArray(data.gallery));
            safeSet("eljory_custom_lists",    fbToArray(data.customLists));
            safeSet("eljory_sections",        fbToArray(data.sections));
            safeSet("eljory_loyalty_settings",data.settings || { system:"global", spent:10, earn:1 });
            // تحديث الواجهة في الخلفية
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
        });
    };
     // ⚠️ إصلاح: مبقاش بننادي startSync() هنا تلقائي (ده كان بيسحب كل قاعدة
    // البيانات لأي حد يفتح admin.html حتى قبل تسجيل الدخول). دلوقتي بنعرضها
    // عالمياً بس، وبتتنادى من onAuthStateChanged بعد التأكد إن المستخدم أدمن.
    window.startAdminSync = startSync;

    // ─── محرر المدونة ──────────────────────────────────────────

    let adminBlogCurrentProductId = null;
    let adminBlogSavedRange       = null;

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
        document.getElementById('adminBlogEditor').focus();
        if (adminBlogSavedRange) {
            let sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(adminBlogSavedRange);
        }
    }

    window.openAdminBlogModal = function(type) {
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
