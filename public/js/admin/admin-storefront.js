// ================================================================
// js/admin-storefront.js
// السكاشن الاحترافية + القوائم المخصصة + البانرات والسلايدر + استوديو الصور.
// ملحوظة: كل الدوال هنا لسه بتتسجل على window (زي الأول تمامًا) — الفصل ده
// تنظيمي بس، ومحتاج كل الملفات تتحمّل مع بعض في admin.html بالترتيب المحدد
// (utils الأول، dashboard آخر واحد).
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
    { id:'products-strip',  label:'شريط منتجات',      icon:'🛍️',   images:0 },
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

    if (currentLayout === 'products-strip') {
        container.innerHTML = '<div style="background:#fdf5e6;border:1px dashed #f38c18;border-radius:8px;padding:20px;color:#1d364a;font-size:14px;line-height:1.8;">🛍️ <strong>شريط المنتجات:</strong> مفيش صور مطلوبة في الشكل ده.<br>لازم تفعّل خيار "إظهار منتجات تحت السيكشن؟ = نعم" بالأسفل وتحدد مصدر المنتجات (قسم رئيسي / فرعي / قائمة مخصصة) — المنتجات هتظهر كشريط بيتلف تلقائياً.</div>';
        let showProdsSelect = document.getElementById('secShowProducts');
        if (showProdsSelect) { showProdsSelect.value = '1'; toggleSecProductsBox(); }
        sectionImages = [];
        return;
    }

    let layout = LAYOUTS.find(l => l.id === currentLayout);
    let count  = currentLayout === 'slider' ? Math.max(sectionImages.length + 1, 2) : layout.images;
    while (sectionImages.length < count) sectionImages.push({ src:'', srcMobile:'', linkType:'none', linkValue:'' });
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        let im = sectionImages[i] || { src:'', srcMobile:'', linkType:'none', linkValue:'' };
        let isOptional = currentLayout === 'slider' && i >= 2;
        container.innerHTML += buildImageInputBox(i, im, isOptional);
    }
};

// مقاس كل صورة (كمبيوتر/موبايل) بيتحدد حسب دورها الفعلي في الشكل المختار،
// مش نص ثابت واحد لكل الصور — عشان كده الصورة الكبيرة تاخد مقاس يناسبها
// والصورة الصغيرة تاخد مقاس أصغر يناسب مكانها هي.
function getImgSizeHint(layout, i) {
    const hints = {
        full:              [{d:'1600×550', m:'800×280'}],
        two:               [{d:'800×280',  m:'420×260'}, {d:'800×280', m:'420×260'}],
        three:             [{d:'530×240',  m:'340×260'}, {d:'530×240', m:'340×260'}, {d:'530×240', m:'340×260'}],
        four:              [{d:'400×200',  m:'340×260'}, {d:'400×200', m:'340×260'}, {d:'400×200', m:'340×260'}, {d:'400×200', m:'340×260'}],
        'big-left-2right': [{d:'1060×320', m:'800×400'}, {d:'530×160', m:'420×260'}, {d:'530×160', m:'420×260'}],
        'big-left-4right': [{d:'1060×340', m:'800×400'}, {d:'400×165', m:'420×260'}, {d:'400×165', m:'420×260'}, {d:'400×165', m:'420×260'}, {d:'400×165', m:'420×260'}],
        slider:            [{d:'1600×420', m:'800×400'}],
    };
    let arr = hints[layout];
    if (!arr) return {d:'1600×500', m:'800×400'};
    return arr[i] || arr[arr.length - 1];
}

function buildImageInputBox(i, im, isOptional) {
    let labels = {
        full: 'الصورة الرئيسية',
        two:  `الصورة ${i+1}`, three: `الصورة ${i+1}`, four: `الصورة ${i+1}`,
        'big-left-2right': i===0 ? 'الصورة الكبيرة' : `الصورة الصغيرة ${i}`,
        'big-left-4right': i===0 ? 'الصورة الكبيرة' : `الصورة ${i}`,
        slider: `شريحة ${i+1}`
    };
    let label = labels[currentLayout] || `الصورة ${i+1}`;
    let size  = getImgSizeHint(currentLayout, i);

    return `<div style="background:white;padding:15px;border-radius:8px;border:1px solid #eee;" id="imgBox_${i}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <strong style="color:#1d364a;font-size:14px;">📷 ${label}${isOptional?' (اختياري)':''}</strong>
            ${im.src ? `<img src="${im.src}" style="width:50px;height:35px;object-fit:cover;border-radius:4px;border:1px solid #ddd;">` : ''}
        </div>

        <div style="background:#f0f8ff;padding:10px;border-radius:6px;margin-bottom:10px;border:1px dashed #1d364a;">
            <label style="font-size:12px;font-weight:bold;color:#1d364a;display:block;margin-bottom:6px;">
                🖥️ صورة الكمبيوتر — المقاس المفضل: ${size.d} بكسل
            </label>
            <div style="display:flex;gap:8px;">
                <input type="text" id="secImgSrc_${i}" value="${im.src||''}" placeholder="رابط صورة الكمبيوتر..."
                       class="form-control" style="flex:1;"
                       oninput="sectionImages[${i}].src=this.value;buildImagesInputs();">
                <button type="button" onclick="triggerSecImgUpload(${i}, false)"
                        class="btn btn-green" style="padding:8px 12px;white-space:nowrap;">📤</button>
                <button type="button"
                        onclick="openGalleryModal('secImgSrc_${i}');window._gallerySecIdx=${i};"
                        class="btn" style="background:#e68a10;padding:8px 12px;white-space:nowrap;">🖼️</button>
            </div>
        </div>

        <div style="background:#fff7ed;padding:10px;border-radius:6px;margin-bottom:10px;border:1px dashed #f38c18;">
            <label style="font-size:12px;font-weight:bold;color:#f38c18;display:block;margin-bottom:6px;">
                📱 صورة الموبايل (اختياري) — المقاس المفضل: ${size.m} بكسل — لو سبتها فاضية هيتم استخدام صورة الكمبيوتر
            </label>
            <div style="display:flex;gap:8px;">
                <input type="text" id="secImgSrcMobile_${i}" value="${im.srcMobile||''}" placeholder="رابط صورة الموبايل (اختياري)..."
                       class="form-control" style="flex:1;"
                       oninput="sectionImages[${i}].srcMobile=this.value;">
                <button type="button" onclick="triggerSecImgUpload(${i}, true)"
                        class="btn btn-green" style="padding:8px 12px;white-space:nowrap;">📤</button>
                <button type="button"
                        onclick="openGalleryModal('secImgSrcMobile_${i}');window._gallerySecIdx=${i};"
                        class="btn" style="background:#e68a10;padding:8px 12px;white-space:nowrap;">🖼️</button>
            </div>
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

window.triggerSecImgUpload = function(idx, isMobile) {
    window._secImgIdx = idx;
    let inp = document.createElement('input');
    inp.type   = 'file';
    inp.accept = 'image/*';
    inp.onchange = function(e) {
        let file = e.target.files[0]; if(!file) return;
        window._directUploadTargetCallback = function(url) {
            if (isMobile) {
                sectionImages[idx].srcMobile = url;
                let elM = document.getElementById(`secImgSrcMobile_${idx}`);
                if (elM) elM.value = url;
            } else {
                sectionImages[idx].src = url;
                buildImagesInputs();
            }
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
        let srcEl  = document.getElementById(`secImgSrc_${i}`);
        let srcMEl = document.getElementById(`secImgSrcMobile_${i}`);
        let valEl  = document.getElementById(`imgLinkVal_${i}`);
        return {
            src:       srcEl  ? srcEl.value.trim()  : (im.src || ''),
            srcMobile: srcMEl ? srcMEl.value.trim() : (im.srcMobile || ''),
            linkType:  im.linkType  || 'none',
            linkValue: valEl ? valEl.value.trim() : (im.linkValue || '')
        };
    }).filter(im => im.src);
    if (!finalImages.length && currentLayout !== 'products-strip') return alert('يرجى إضافة صورة واحدة على الأقل!');
    let bgOpTopInput    = document.getElementById('secBgOpacityTop');
    let bgOpBottomInput = document.getElementById('secBgOpacityBottom');
    let bgAnchorInput    = document.getElementById('secBgAnchor');
    let bgHeightInput   = document.getElementById('secBgHeight');
    let bgImgMobileInput      = document.getElementById('secBgImgMobile');
    let bgAnchorMobileInput   = document.getElementById('secBgAnchorMobile');
    let bgHeightMobileInput   = document.getElementById('secBgHeightMobile');
    // بنحول "نسبة الوضوح" لـ "نسبة التعتيم" (overlay) لأن الأبيض اللي بيتحط فوق
    // الصورة كل ما زادت نسبته كل ما قلّ وضوح الصورة تحته.
    let bgOverlayTop    = bgOpTopInput    ? (1 - (parseInt(bgOpTopInput.value)    / 100)) : 0.15;
    let bgOverlayBottom = bgOpBottomInput ? (1 - (parseInt(bgOpBottomInput.value) / 100)) : 0.85;
    let bgBottomAnchor  = bgAnchorInput   ? (parseInt(bgAnchorInput.value) || 260) : 260;
    let bgHeight        = bgHeightInput   ? (parseInt(bgHeightInput.value) || 260) : 260;
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
        bgImage:      document.getElementById('secBgImg').value.trim(),
        bgOverlayTop:    bgOverlayTop,
        bgOverlayBottom: bgOverlayBottom,
        bgBottomAnchor:  bgBottomAnchor,
        bgHeight:        bgHeight,
        bgImageMobile:      bgImgMobileInput    ? bgImgMobileInput.value.trim() : '',
        bgBottomAnchorMobile: bgAnchorMobileInput ? (parseInt(bgAnchorMobileInput.value) || 180) : 180,
        bgHeightMobile:       bgHeightMobileInput ? (parseInt(bgHeightMobileInput.value) || 180) : 180,
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
    sectionImages = [{ src:'', srcMobile:'', linkType:'none', linkValue:'' }];
    document.getElementById('editingSectionId').value              = '';
    document.getElementById('secTitle').value                      = '';
    document.getElementById('secShowTitle').value                  = '1';
    document.getElementById('secShowProducts').value                = '0';
    document.getElementById('secProductsBox').style.display        = 'none';
    document.getElementById('secLinkType').value                   = 'none';
    document.getElementById('secLinkValue').value                  = '';
    document.getElementById('secLinkValueBox').style.display       = 'none';
    document.getElementById('secPriority').value                   = '1';
    document.getElementById('secBgColor').value                    = '#ffffff';
    document.getElementById('secBgImg').value                      = '';
    let bgOpT = document.getElementById('secBgOpacityTop');
    let bgOpB = document.getElementById('secBgOpacityBottom');
    let bgA   = document.getElementById('secBgAnchor');
    let bgH   = document.getElementById('secBgHeight');
    if (bgOpT) { bgOpT.value = 85; document.getElementById('secBgOpacityTopVal').innerText = '85%'; }
    if (bgOpB) { bgOpB.value = 15; document.getElementById('secBgOpacityBottomVal').innerText = '15%'; }
    if (bgA)   { bgA.value = 260; document.getElementById('secBgAnchorVal').innerText = '260px'; }
    if (bgH)   { bgH.value = 260; document.getElementById('secBgHeightVal').innerText = '260px'; }
    let bgImgM = document.getElementById('secBgImgMobile');
    let bgAM   = document.getElementById('secBgAnchorMobile');
    let bgHM   = document.getElementById('secBgHeightMobile');
    if (bgImgM) bgImgM.value = '';
    if (bgAM) { bgAM.value = 180; document.getElementById('secBgAnchorMobileVal').innerText = '180px'; }
    if (bgHM) { bgHM.value = 180; document.getElementById('secBgHeightMobileVal').innerText = '180px'; }
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
    sectionImages = sec.images
        ? JSON.parse(JSON.stringify(sec.images)).map(im => ({ srcMobile:'', ...im }))
        : [{ src:'', srcMobile:'', linkType:'none', linkValue:'' }];
    document.getElementById('secTitle').value          = sec.title || '';
    document.getElementById('secShowTitle').value      = sec.showTitle  ? '1' : '0';
    document.getElementById('secShowProducts').value   = sec.showProducts ? '1' : '0';
    document.getElementById('secLinkType').value       = sec.linkType || 'none';
    document.getElementById('secPriority').value       = sec.priority || 1;
    document.getElementById('secBgColor').value        = sec.bgColor || '#ffffff';
    document.getElementById('secBgImg').value          = sec.bgImage || '';
    document.getElementById('secMaxProducts').value    = sec.maxProducts || 8;
    let bgOpTEl = document.getElementById('secBgOpacityTop');
    let bgOpBEl = document.getElementById('secBgOpacityBottom');
    if (bgOpTEl) {
        let existingTop = (typeof sec.bgOverlayTop === 'number') ? sec.bgOverlayTop : 0.15;
        let sliderTopVal = Math.round((1 - existingTop) * 100);
        bgOpTEl.value = sliderTopVal;
        document.getElementById('secBgOpacityTopVal').innerText = sliderTopVal + '%';
    }
    if (bgOpBEl) {
        let existingBottom = (typeof sec.bgOverlayBottom === 'number') ? sec.bgOverlayBottom : 0.85;
        let sliderBottomVal = Math.round((1 - existingBottom) * 100);
        bgOpBEl.value = sliderBottomVal;
        document.getElementById('secBgOpacityBottomVal').innerText = sliderBottomVal + '%';
    }
    let bgAEl = document.getElementById('secBgAnchor');
    if (bgAEl) {
        let existingAnchor = parseInt(sec.bgBottomAnchor) || 260;
        bgAEl.value = existingAnchor;
        document.getElementById('secBgAnchorVal').innerText = existingAnchor + 'px';
    }
    let bgHEl = document.getElementById('secBgHeight');
    if (bgHEl) {
        let existingHeight = parseInt(sec.bgHeight) || 260;
        bgHEl.value = existingHeight;
        document.getElementById('secBgHeightVal').innerText = existingHeight + 'px';
    }
    let bgImgMEl = document.getElementById('secBgImgMobile');
    if (bgImgMEl) bgImgMEl.value = sec.bgImageMobile || '';
    let bgAMEl = document.getElementById('secBgAnchorMobile');
    if (bgAMEl) {
        let existingAnchorM = parseInt(sec.bgBottomAnchorMobile) || 180;
        bgAMEl.value = existingAnchorM;
        document.getElementById('secBgAnchorMobileVal').innerText = existingAnchorM + 'px';
    }
    let bgHMEl = document.getElementById('secBgHeightMobile');
    if (bgHMEl) {
        let existingHeightM = parseInt(sec.bgHeightMobile) || 180;
        bgHMEl.value = existingHeightM;
        document.getElementById('secBgHeightMobileVal').innerText = existingHeightM + 'px';
    }
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
                        'big-left-2right':'كبيرة+2', 'big-left-4right':'كبيرة+4', slider:'سلايدر',
                        'products-strip':'شريط منتجات 🛍️' };
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
        sectionImages = [{ src:'', srcMobile:'', linkType:'none', linkValue:'' }];
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
    let existingLists = JSON.parse(localStorage.getItem('eljory_custom_lists') || '[]');
    if (existingLists.find(l => l.name === name)) return alert('القائمة موجودة مسبقاً!');
    let newId = 'LST_' + Date.now();
    let newList = { id: newId, name, products: [], isActive: true };
    // ⭐ إصلاح بنيوي: بدل ما نقرا كل القوائم ونكتبها تاني كاملة (مصفوفة واحدة)،
    // بقينا نكتب كل قائمة في مسارها المستقل الخاص بيها (/customLists/{id}).
    // كده قاعدة الأمان تقدر تفرّق فعلياً بين "إضافة قائمة جديدة" و"تعديل قائمة
    // موجودة" و"حذف قائمة" بدل ما يبقى كل شيء "كتابة واحدة كبيرة" ما تقدرش
    // تتفرق نوعها.
    db.ref('/customLists/' + newId).set(newList).then(() => {
        document.getElementById('newListName').value = '';
        alert('تم إنشاء القائمة!');
    }).catch(() => alert('حدث خطأ أثناء إنشاء القائمة.'));
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

// ⭐ بدل ما نقرا/نكتب كل القوائم مع بعض، بنقرا ونكتب بس فرع "products" الخاص
// بالقائمة المفتوحة حالياً (/customLists/{id}/products) — عملية "تعديل"
// واضحة ومعزولة عن أي قائمة تانية، ومطابقة تمامًا لصلاحية "تعديل" في قاعدة
// الأمان (مش حذف ولا إضافة قائمة جديدة).
window.addProductToList = function(productId) {
    if (!currentEditingListId) return;
    db.ref('/customLists/' + currentEditingListId + '/products').once('value').then(function(snap) {
        let list = snap.val() || [];
        if (!Array.isArray(list)) list = Object.values(list);
        if (!list.includes(productId)) list.push(productId);
        db.ref('/customLists/' + currentEditingListId + '/products').set(list).then(() => {
            renderListProducts(list);
            document.getElementById('listProductSearch').value = '';
            document.getElementById('listProductResults').style.display = 'none';
        });
    });
};

window.removeProductFromList = function(productId) {
    if (!currentEditingListId) return;
    db.ref('/customLists/' + currentEditingListId + '/products').once('value').then(function(snap) {
        let list = snap.val() || [];
        if (!Array.isArray(list)) list = Object.values(list);
        list = list.filter(id => id !== productId);
        db.ref('/customLists/' + currentEditingListId + '/products').set(list).then(() => { renderListProducts(list); });
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

// ⚠️ ملحوظة: استيراد الشيت بيعدّل الكاش المحلي بس (في الذاكرة) ومنستنى
// ضغطة "حفظ القائمة" (saveCurrentList) عشان نكتبها فعلياً في فايربيس — نفس
// السلوك القديم بالظبط، غيرنا بس *مكان* الكتابة النهائية (مسار القائمة نفسها
// مش كل القوائم مع بعض).
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
        alert(`تم إضافة ${added} منتج من الشيت! يرجى الضغط على "حفظ القائمة" لحفظ التغييرات.`);
        event.target.value = '';
    };
    reader.readAsText(file);
};

window.saveCurrentList = function() {
    if(!currentEditingListId) return;
    let lists = JSON.parse(localStorage.getItem('eljory_custom_lists') || '[]');
    let list  = lists.find(l => l.id === currentEditingListId);
    if(!list) return;
    db.ref('/customLists/' + currentEditingListId + '/products').set(list.products || []).then(() => {
        alert('تم الحفظ بنجاح!');
        closeEditList();
    }).catch(() => alert('حدث خطأ أثناء الحفظ.'));
};

window.toggleCustomListStatus = function(id) {
    let lists = JSON.parse(localStorage.getItem('eljory_custom_lists') || '[]');
    let list  = lists.find(l => l.id === id);
    if (!list) return;
    db.ref('/customLists/' + id + '/isActive').set(!(list.isActive !== false));
};

window.deleteCustomList = function(id) {
    if(!confirm('متأكد من حذف هذه القائمة؟')) return;
    db.ref('/customLists/' + id).remove().catch(() => alert('حدث خطأ أثناء الحذف — قد لا تملك صلاحية الحذف على هذا القسم.'));
};

// ⭐ ترحيل لمرة واحدة: القوائم اللي اتعملت قبل التحديث ده كانت متخزنة كمصفوفة
// (فايربيس بيدّيها مفاتيح رقمية "0","1","2"...) مش بمفتاح مطابق لـ .id الخاص
// بيها. الدوال الجديدة فوق بتكتب/تقرا كل قائمة من مسار "/customLists/{id}"
// مباشرة، فلو قائمة قديمة لسه متخزنة برقم مش بـ id، الدوال الجديدة مش هتلاقيها.
// الزرار ده بينقل أي قائمة قديمة لشكلها الصحيح مرة واحدة بس، وآمن يتنفذ أكتر
// من مرة (لو مفيش حاجة قديمة، بيقولك كده ومايعملش حاجة).
window.migrateCustomListsToKeyedFormat = function() {
    if (!confirm('هذا الإجراء بيرتب تخزين أي "قوائم مخصصة" قديمة عشان تشتغل صح مع نظام الصلاحيات الجديد. آمن ويمكن تنفيذه أكتر من مرة من غير أي ضرر. متابعة؟')) return;
    db.ref('/customLists').once('value').then(function(snap) {
        if (!snap.exists()) { alert('لا توجد قوائم لترحيلها.'); return; }
        let data = snap.val();
        let entries = Object.keys(data).map(function(k) { return { oldKey: k, item: data[k] }; }).filter(function(e) { return e.item; });
        let toMigrate = entries.filter(function(e) { return !e.item.id || e.item.id !== e.oldKey; });
        if (!toMigrate.length) { alert('✅ كل القوائم بالفعل بالشكل الصحيح، لا يوجد شيء لترحيله.'); return; }

        let ops = [];
        toMigrate.forEach(function(e) {
            let item = e.item;
            let newKey = item.id || ('LST_' + Date.now() + '_' + Math.random().toString(36).slice(2,7));
            item.id = newKey;
            ops.push(db.ref('/customLists/' + newKey).set(item));
            ops.push(db.ref('/customLists/' + e.oldKey).remove());
        });
        Promise.all(ops).then(function() {
            alert('✅ تم ترحيل ' + toMigrate.length + ' قائمة بنجاح لشكل التخزين الجديد!');
            if (typeof renderAdminCustomLists === 'function') renderAdminCustomLists();
        }).catch(function(err) {
            alert('❌ حدث خطأ أثناء الترحيل: ' + err.message + '\nتأكد إنك مسجل دخول كسوبر أدمن، أو عندك صلاحيتي "إضافة" و"حذف" مفعّلتين على قسم "واجهة المتجر".');
        });
    });
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
    let title      = document.getElementById("bannerTitle").value.trim();
    let img        = document.getElementById("bannerImg").value.trim();
    let imgMobileEl= document.getElementById("bannerImgMobile");
    let imgMobile  = imgMobileEl ? imgMobileEl.value.trim() : "";
    let linkType   = document.getElementById("bannerLinkType").value;
    let linkValue  = document.getElementById("bannerLinkValue").value.trim();
    let priority   = parseInt(document.getElementById("bannerPriority").value) || 1;
    if(!img) return alert("يرجى اختيار صورة للبانر الإعلاني!");
    let newId = "BNR_" + Date.now();
    db.ref('/banners/' + newId).set({ id: newId, title, img, imgMobile, linkType, linkValue, priority, isActive: true }).then(() => {
        document.getElementById("bannerTitle").value    = "";
        document.getElementById("bannerImg").value      = "";
        if(imgMobileEl) imgMobileEl.value = "";
        document.getElementById("bannerLinkValue").value= "";
        document.getElementById("bannerPriority").value = "1";
        alert("تم حفظ وتفعيل البانر الإعلاني على الواجهة!");
    }).catch(err => { console.error(err); alert("حدث خطأ أثناء الحفظ."); });
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
            <td>
                <button class="btn" style="background:#17a2b8;margin-bottom:5px;padding:5px 10px;" onclick="editBanner('${b.id}')">⚙️ تعديل</button>
                <button class="btn btn-red" style="padding:5px 10px;" onclick="deleteBanner('${b.id}')">حذف</button>
            </td>
        </tr>`;
    });
};

window.toggleBannerStatus = function(id) {
    let banners = JSON.parse(localStorage.getItem("eljory_banners")) || [];
    let b = banners.find(x => x.id === id);
    if (!b) return;
    db.ref('/banners/' + id + '/isActive').set(!b.isActive);
};

window.deleteBanner = function(id) {
    if(!confirm("هل أنت متأكد من مسح هذا البانر الإعلاني؟")) return;
    db.ref('/banners/' + id).remove().catch(err => { console.error(err); alert("❌ حدث خطأ أثناء الحذف — قد لا تملك صلاحية الحذف على هذا القسم."); });
};

window.editBanner = function(id) {
    let banners = JSON.parse(localStorage.getItem("eljory_banners")) || [];
    let b = banners.find(x => x.id === id);
    if(!b) return;
    document.getElementById("editBannerId").value          = b.id;
    document.getElementById("editBannerTitle").value       = b.title       || "";
    document.getElementById("editBannerImg").value         = b.img        || "";
    document.getElementById("editBannerImgMobile").value   = b.imgMobile  || "";
    document.getElementById("editBannerLinkType").value    = b.linkType   || "product";
    document.getElementById("editBannerLinkValue").value   = b.linkValue  || "";
    document.getElementById("editBannerPriority").value    = b.priority   || 1;
    updateEditBannerLinkPlaceholder();
    document.getElementById("editBannerModal").style.display = "flex";
};

window.updateEditBannerLinkPlaceholder = function() {
    let type  = document.getElementById("editBannerLinkType").value;
    let input = document.getElementById("editBannerLinkValue");
    if(type === "product")  input.placeholder = "اكتب كود المنتج المستهدف هنا...";
    else if(type==="category") input.placeholder = "اكتب كود القسم المستهدف هنا...";
    else input.placeholder = "https://example.com/custom-link";
};

window.saveBannerEdit = function() {
    let id        = document.getElementById("editBannerId").value;
    let title     = document.getElementById("editBannerTitle").value.trim();
    let img       = document.getElementById("editBannerImg").value.trim();
    let imgMobile = document.getElementById("editBannerImgMobile").value.trim();
    let linkType  = document.getElementById("editBannerLinkType").value;
    let linkValue = document.getElementById("editBannerLinkValue").value.trim();
    let priority  = parseInt(document.getElementById("editBannerPriority").value) || 1;
    if(!img) return alert("يرجى إدخال رابط صورة الكمبيوتر!");
    db.ref('/banners/' + id).update({ title, img, imgMobile, linkType, linkValue, priority }).then(() => {
        closeBannerModal(); alert("تم تحديث البانر بنجاح! ✅");
    }).catch(err => { console.error(err); alert("حدث خطأ أثناء الحفظ."); });
};

window.closeBannerModal = function() {
    document.getElementById("editBannerModal").style.display = "none";
};

// ⭐ ترحيل لمرة واحدة: بانرات قديمة ممكن تكون متخزنة بمفتاح رقمي (مصفوفة) مش
// بنفس قيمة .id بتاعتها. آمن يتنفذ أكتر من مرة.
window.migrateBannersToKeyedFormat = function() {
    if (!confirm('هذا الإجراء بيرتب تخزين أي "بانرات" قديمة عشان تشتغل صح مع نظام الصلاحيات الجديد. آمن ويمكن تنفيذه أكتر من مرة من غير أي ضرر. متابعة؟')) return;
    db.ref('/banners').once('value').then(function(snap) {
        if (!snap.exists()) { alert('لا توجد بانرات لترحيلها.'); return; }
        let data = snap.val();
        let entries = Object.keys(data).map(function(k) { return { oldKey: k, item: data[k] }; }).filter(function(e) { return e.item; });
        let toMigrate = entries.filter(function(e) { return !e.item.id || e.item.id !== e.oldKey; });
        if (!toMigrate.length) { alert('✅ كل البانرات بالفعل بالشكل الصحيح، لا يوجد شيء لترحيله.'); return; }

        let ops = [];
        toMigrate.forEach(function(e) {
            let item = e.item;
            let newKey = item.id || ('BNR_' + Date.now() + '_' + Math.random().toString(36).slice(2,7));
            item.id = newKey;
            ops.push(db.ref('/banners/' + newKey).set(item));
            ops.push(db.ref('/banners/' + e.oldKey).remove());
        });
        Promise.all(ops).then(function() {
            alert('✅ تم ترحيل ' + toMigrate.length + ' بانر بنجاح لشكل التخزين الجديد!');
            if (typeof renderAdminBanners === 'function') renderAdminBanners();
        }).catch(function(err) {
            alert('❌ حدث خطأ أثناء الترحيل: ' + err.message + '\nتأكد إنك مسجل دخول كسوبر أدمن، أو عندك صلاحيتي "إضافة" و"حذف" مفعّلتين على قسم "واجهة المتجر".');
        });
    });
};


// ================================================================
// ⑭ استوديو الصور ورفع الصور (Gallery & Image Upload)
// ================================================================

let currentTargetInputId = null;
let directUploadTargetId = null;

// ⚠️ إصلاح: مفاتيح Firebase Realtime Database ممنوع تحتوي على أي من الحروف
// ".", "#", "$", "[", "]"، واحنا كنا مستخدمين اسم ملف الصورة كامل (زي
// "IMG_123.jpg") كمفتاح مباشر في "/gallery/{key}" — والنقطة اللي قبل الامتداد
// (.jpg) كانت بتكسر العملية فورًا برسالة "invalid path". الدالة دي بتنضّف أي
// نص عشان يبقى صالح كمفتاح، من غير ما تأثر على اسم الملف الأصلي في Storage.
window.sanitizeFirebaseKey = function(str) {
    return String(str || '').replace(/[.#$\[\]]/g, '_');
};

// ⭐ نظام الصلاحيات: الاستوديو بقى ليه قسم مستقل في PERM_SECTIONS (gallery)،
// منفصل تمامًا عن "واجهة المتجر"، عشان تقدر تدّي فئة معينة صلاحية على الاستوديو
// من غير ما تفتح لها باقي واجهة المتجر (بانرات/سكاشن/قوائم)، أو العكس. القاعدة:
// - فتحه "كإدارة مستقلة" (بدون تحديد حقل هدف، زي زرار "استوديو الصور" في
//   القائمة الجانبية) بيتطلب صلاحية مشاهدة على الأقل لقسم "استوديو الصور".
// - فتحه "كمنتقي صورة" داخل فورم محمي أصلاً (منتج/بانر/سيكشن...) يفضل متاح،
//   لأن الفورم نفسه مقفول بصلاحيته الخاصة أصلاً لو الأدمن مفيهوش صلاحية.
window.openGalleryModal = function(targetInputId = null) {
    if (!targetInputId && typeof window.hasPerm === 'function' && !window.hasPerm('gallery', 'view')) {
        alert('⚠️ ليس لديك صلاحية الوصول لاستوديو الصور.');
        return;
    }
    currentTargetInputId = targetInputId;
    document.getElementById("galleryModal").style.display = "flex";
    renderGalleryGrid();
};

window.closeGalleryModal = function() {
    document.getElementById("galleryModal").style.display = "none";
    currentTargetInputId = null;
};

// ⭐ تعطيل زرار "إضافة صورة جديدة" في الاستوديو لو الأدمن مفيهوش صلاحية
// "إضافة" على قسم "استوديو الصور" — تعطيل شكلي بالواجهة (الكتابة الفعلية على
// إنشاء صورة جديدة تفضل مسموحة على مستوى القاعدة لأي أدمن، عشان منكسرش رفع
// الصور المباشر من فورمات تانية زي المنتج والبانر، اللي أصلاً محمية بصلاحية
// قسمها هي بتاعها).
window.applyGalleryPermissionLock = function() {
    let canAdd = (typeof window.hasPerm === 'function') ? window.hasPerm('gallery', 'add') : true;
    let uploadBtn = document.getElementById('galleryUploadBtn');
    if (uploadBtn) {
        uploadBtn.disabled     = !canAdd;
        uploadBtn.style.opacity= canAdd ? '' : '0.5';
        uploadBtn.style.cursor = canAdd ? 'pointer' : 'not-allowed';
        uploadBtn.title        = canAdd ? '' : 'ليس لديك صلاحية إضافة صور جديدة للاستوديو';
    }
};

window.renderGalleryGrid = function() {
    let gallery  = JSON.parse(localStorage.getItem("eljory_gallery")) || [];
    let gridArea = document.getElementById("galleryGridArea");
    let canDelete = (typeof window.hasPerm === 'function') ? window.hasPerm('gallery', 'delete') : true;
    gridArea.innerHTML = "";
    window.applyGalleryPermissionLock();
    if(!gallery.length) {
        gridArea.innerHTML = "<p style='grid-column:1/-1;text-align:center;color:gray;padding:20px;font-weight:bold;'>الاستوديو فارغ حالياً.</p>";
        return;
    }
    [...gallery].reverse().forEach(imgObj => {
        let delBtnHtml = canDelete
            ? `<button onclick="deleteFromGallery('${imgObj.id}')"
                       style="background:#d9534f;color:white;border:none;padding:5px;cursor:pointer;border-radius:4px;font-size:12px;width:100%;">🗑️ حذف الصورة</button>`
            : `<button disabled title="ليس لديك صلاحية الحذف"
                       style="background:#ccc;color:#888;border:none;padding:5px;cursor:not-allowed;border-radius:4px;font-size:12px;width:100%;">🗑️ حذف الصورة</button>`;
        gridArea.innerHTML += `<div style="border:1px solid #ddd;border-radius:8px;overflow:hidden;background:white;box-shadow:0 2px 5px rgba(0,0,0,0.1);display:flex;flex-direction:column;">
            <div style="height:150px;background:#f4f4f4;display:flex;justify-content:center;align-items:center;overflow:hidden;">
                <img src="${imgObj.data}" style="width:100%;height:100%;object-fit:cover;cursor:pointer;"
                     onclick="selectImageFromGallery('${imgObj.data}')" title="اضغط لاختيار هذه الصورة">
            </div>
            <div style="padding:10px;flex-grow:1;display:flex;flex-direction:column;justify-content:space-between;">
                <p style="font-size:12px;margin:0 0 10px 0;color:#333;word-break:break-all;text-align:center;font-weight:bold;">${imgObj.name}</p>
                ${delBtnHtml}
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
    if (typeof window.hasPerm === 'function' && !window.hasPerm('gallery', 'add')) {
        alert('⚠️ ليس لديك صلاحية إضافة صور جديدة للاستوديو.');
        event.target.value = '';
        return;
    }
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
                let fileName   = "IMG_" + Date.now() + ".jpg";       // اسم الملف في Storage (النقطة هنا مسموحة)
                let dbKey      = window.sanitizeFirebaseKey(fileName); // مفتاح آمن في Realtime Database (بدون نقاط)
                let storageRef = storage.ref('gallery/' + fileName);
                storageRef.put(blob).then(function(snapshot) {
                    snapshot.ref.getDownloadURL().then(function(downloadURL) {
                        // ⭐ نظام الصلاحيات: بنكتب كل صورة في مسارها المستقل
                        // (/gallery/{dbKey}) بدل ما نقرا المصفوفة كلها ونعيد
                        // كتابتها من الأول (زي ما كان بيحصل قبل كده عبر
                        // safeUpdateList). ده اللي بيسمح لقاعدة الأمان تفرّق
                        // بين "إضافة صورة جديدة" (مسموحة لأي أدمن، عشان منكسرش
                        // رفع الصور المباشر من فورمات المنتج/البانر/السيكشن)
                        // و"حذف صورة" (محمية بصلاحية "حذف" على استوديو الصور).
                        db.ref('/gallery/' + dbKey).set({ id: dbKey, name: file.name, data: downloadURL }).then(() => {
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
                        }).catch(function() { alert("❌ فشل حفظ رابط الصورة!"); if(uploadMsg) uploadMsg.value = ""; });
                    });
                }).catch(function() { alert("❌ فشل الرفع لفايربيس!"); if(uploadMsg) uploadMsg.value = ""; });
            }, 'image/jpeg', 0.85);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

window.deleteFromGallery = function(id) {
    if (typeof window.hasPerm === 'function' && !window.hasPerm('gallery', 'delete')) {
        alert('⚠️ ليس لديك صلاحية حذف صور من الاستوديو.');
        return;
    }
    if(confirm("هل أنت متأكد من حذف هذه الصورة؟ (سيتم حذف الرابط فقط من الاستوديو)")) {
        db.ref('/gallery/' + id).remove().catch(() => alert("❌ حدث خطأ أثناء الحذف — قد لا تملك صلاحية الحذف على هذا القسم."));
    }
};

// ⭐ ترحيل لمرة واحدة: صور الاستوديو القديمة (اللي اتضافت قبل تحديث نظام
// الصلاحيات) كانت متخزنة كمصفوفة (مفاتيح رقمية 0،1،2...) مش بمفتاح مطابق
// لـ id الصورة نفسها (اسم الملف). الدوال الجديدة فوق بتكتب/تحذف كل صورة من
// مسارها "/gallery/{id}" مباشرة، فلو صورة قديمة لسه متخزنة برقم مش بـ id،
// حذفها هيفشل لأن قاعدة الأمان بتتحقق من المسار الصحيح. الزرار ده بينقل أي
// صورة قديمة لشكلها الصحيح مرة واحدة بس، وآمن يتنفذ أكتر من مرة (لو مفيش حاجة
// قديمة، بيقولك كده ومايعملش حاجة).
window.migrateGalleryToKeyedFormat = function() {
    if (!confirm('هذا الإجراء بيرتب تخزين أي صور قديمة في الاستوديو عشان تشتغل صح مع نظام الصلاحيات الجديد. آمن ويمكن تنفيذه أكتر من مرة من غير أي ضرر. متابعة؟')) return;
    db.ref('/gallery').once('value').then(function(snap) {
        if (!snap.exists()) { alert('لا توجد صور لترحيلها.'); return; }
        let data = snap.val();
        let entries = Object.keys(data).map(function(k) { return { oldKey: k, item: data[k] }; }).filter(function(e) { return e.item; });
        let toMigrate = entries.filter(function(e) { return !e.item.id || e.item.id !== e.oldKey; });
        if (!toMigrate.length) { alert('✅ كل الصور بالفعل بالشكل الصحيح، لا يوجد شيء لترحيله.'); return; }

        let ops = [];
        toMigrate.forEach(function(e) {
            let item = e.item;
            // ⚠️ نفس إصلاح النقطة في المفتاح: item.id القديم كان بيحمل اسم
            // الملف كامل (زي "IMG_123.jpg")، ولازم يتنضّف قبل ما يتستخدم كمفتاح.
            let newKey = window.sanitizeFirebaseKey(item.id) || ('IMG_' + Date.now() + '_' + Math.random().toString(36).slice(2,7));
            item.id = newKey;
            ops.push(db.ref('/gallery/' + newKey).set(item));
            ops.push(db.ref('/gallery/' + e.oldKey).remove());
        });
        Promise.all(ops).then(function() {
            alert('✅ تم ترحيل ' + toMigrate.length + ' صورة بنجاح لشكل التخزين الجديد!');
            if (typeof renderGalleryGrid === 'function') renderGalleryGrid();
        }).catch(function(err) {
            console.error('gallery migration write error:', err);
            alert('❌ حدث خطأ أثناء الترحيل: ' + err.message + '\nتأكد إنك مسجل دخول كسوبر أدمن، أو عندك صلاحيتي "إضافة" و"حذف" مفعّلتين على قسم "استوديو الصور".');
        });
    }).catch(function(err) {
        // ⚠️ إصلاح: الـ .catch ده كان ناقص هنا، فلو فشلت قراءة /gallery نفسها
        // (رفض صلاحية، مشكلة نت، أو أي خطأ تاني) كان المستخدم مايشوفش أي رسالة
        // خالص بعد ضغط "موافق" على التأكيد — الخطأ كان بيروح لكونسول المتصفح
        // بصمت من غير أي alert. دلوقتي أي فشل هنا هيظهر برسالة واضحة.
        console.error('gallery migration read error:', err);
        alert('❌ تعذر قراءة بيانات الاستوديو: ' + err.message);
    });
};


// ================================================================
