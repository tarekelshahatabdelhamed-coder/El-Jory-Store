// ================================================================
// js/admin-coupons.js
// العروض وكوبونات الخصم (Promos).
// ملحوظة: كل الدوال هنا لسه بتتسجل على window (زي الأول تمامًا) — الفصل ده
// تنظيمي بس، ومحتاج كل الملفات تتحمّل مع بعض في admin.html بالترتيب المحدد
// (utils الأول، dashboard آخر واحد).
// ================================================================

// ⑪ إدارة العروض والبروموكود (Promos)
// ================================================================

let promoSelectedProducts = [];

window.togglePromoValue = function() {
    let type = document.getElementById("promoType").value;
    document.getElementById("promoValueGroup").style.display = type === "shipping" ? "none" : "block";
    let maxDiscBox = document.getElementById("promoMaxDiscountGroup");
    if (maxDiscBox) maxDiscBox.style.display = type === "percent" ? "block" : "none";
};

// ── دوال مودال تعديل النسبة القصوى للخصم في مودال التعديل ──
window.toggleEditPromoValue = function() {
    let type = document.getElementById("editPromoType").value;
    document.getElementById("editPromoValueGroup").style.display = type === "shipping" ? "none" : "block";
    let maxDiscBox = document.getElementById("editPromoMaxDiscountGroup");
    if (maxDiscBox) maxDiscBox.style.display = type === "percent" ? "block" : "none";
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
    // ⭐ جديد: الحد الأدنى لقيمة الفاتورة عشان الكود يشتغل، والحد الأقصى لقيمة
    // الخصم (بيتفعل بس مع النسبة المئوية عشان يمنع خصومات ضخمة على فواتير كبيرة)
    let minOrderEl      = document.getElementById("promoMinOrder");
    let maxDiscountEl   = document.getElementById("promoMaxDiscount");
    let minOrderValue   = (minOrderEl && minOrderEl.value !== "") ? (parseFloat(minOrderEl.value) || 0) : 0;
    let maxDiscountValue= (type === "percent" && maxDiscountEl && maxDiscountEl.value !== "") ? (parseFloat(maxDiscountEl.value) || null) : null;
    if(!code || !start || !end) return alert("يرجى كتابة الكود وتحديد وقت البدء والانتهاء!");
    if(type !== "shipping" && value <= 0) return alert("يرجى كتابة قيمة الخصم!");
    if(scope === "specific" && promoSelectedProducts.length === 0) return alert("لم تقم بتحديد أي منتجات للخصم!");
    safeUpdateList('/promos', promos => {
        if(promos.find(p => p.code === code)) throw new Error("DUPLICATE_CODE");
        promos.push({ code, type, value, scope, products: scope==="specific"?[...promoSelectedProducts]:[], start, end, label, maxTotal, maxPerUser, newUsersOnly, minOrderValue, maxDiscountValue, usageCount:0, usedBy:{} });
        return promos;
    }).then(() => {
        alert("تم حفظ البروموكود! ✅");
        document.getElementById("promoCode").value         = "";
        document.getElementById("promoMaxTotal").value     = "";
        document.getElementById("promoMaxPerUser").value   = "";
        if(minOrderEl) minOrderEl.value = "";
        if(maxDiscountEl) maxDiscountEl.value = "";
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
        if(p.minOrderValue) restrictParts.push(`<span style="background:#6c757d;color:white;padding:2px 7px;border-radius:10px;font-size:11px;">حد أدنى فاتورة: ${p.minOrderValue}</span>`);
        if(p.type === 'percent' && p.maxDiscountValue) restrictParts.push(`<span style="background:#d9534f;color:white;padding:2px 7px;border-radius:10px;font-size:11px;">أقصى خصم: ${p.maxDiscountValue} ج.م</span>`);
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
            <td>
                <button class="btn" style="background:#17a2b8;padding:5px 10px;margin-bottom:5px;" onclick="editPromo('${p.code}')">⚙️ تعديل</button><br>
                <button class="btn btn-red" style="padding:5px 10px;" onclick="deletePromo('${p.code}')">حذف</button>
            </td>
        </tr>`;
    });
};

window.deletePromo = function(code) {
    safeUpdateList('/promos', promos => promos.filter(p => p.code !== code));
};

// ── تعديل بروموكود موجود ─────────────────────────────────────────────────
window.editPromo = function(code) {
    let promos = JSON.parse(localStorage.getItem("eljory_promos")) || [];
    let p = promos.find(x => x.code === code);
    if(!p) return alert("هذا الكود غير موجود!");

    document.getElementById("editPromoCode").value       = p.code;
    document.getElementById("editPromoCodeLabel").innerText = p.code;
    document.getElementById("editPromoType").value       = p.type || "percent";
    document.getElementById("editPromoValue").value      = p.value || 0;
    document.getElementById("editPromoMaxDiscount").value= (p.maxDiscountValue !== undefined && p.maxDiscountValue !== null) ? p.maxDiscountValue : "";
    document.getElementById("editPromoMinOrder").value   = (p.minOrderValue !== undefined && p.minOrderValue) ? p.minOrderValue : "";
    document.getElementById("editPromoLabel").value      = p.label || "";
    document.getElementById("editPromoStart").value      = p.start || "";
    document.getElementById("editPromoEnd").value        = p.end   || "";
    document.getElementById("editPromoMaxTotal").value   = (p.maxTotal !== undefined && p.maxTotal) ? p.maxTotal : "";
    document.getElementById("editPromoMaxPerUser").value = (p.maxPerUser !== undefined && p.maxPerUser) ? p.maxPerUser : "";
    document.getElementById("editPromoNewUsersOnly").checked = !!p.newUsersOnly;

    toggleEditPromoValue();
    document.getElementById("editPromoModal").style.display = "flex";
};

window.closeEditPromoModal = function() {
    document.getElementById("editPromoModal").style.display = "none";
};

window.savePromoEdit = function() {
    let code = document.getElementById("editPromoCode").value;
    if(!code) return;

    let type        = document.getElementById("editPromoType").value;
    let value       = parseFloat(document.getElementById("editPromoValue").value) || 0;
    let start       = document.getElementById("editPromoStart").value;
    let end         = document.getElementById("editPromoEnd").value;
    let label       = document.getElementById("editPromoLabel").value.trim() || "خصم خاص!";
    let maxTotal    = parseInt(document.getElementById("editPromoMaxTotal").value)   || null;
    let maxPerUser  = parseInt(document.getElementById("editPromoMaxPerUser").value) || null;
    let newUsersOnly= document.getElementById("editPromoNewUsersOnly").checked;
    let minOrderEl      = document.getElementById("editPromoMinOrder");
    let maxDiscountEl   = document.getElementById("editPromoMaxDiscount");
    let minOrderValue   = (minOrderEl && minOrderEl.value !== "") ? (parseFloat(minOrderEl.value) || 0) : 0;
    let maxDiscountValue= (type === "percent" && maxDiscountEl && maxDiscountEl.value !== "") ? (parseFloat(maxDiscountEl.value) || null) : null;

    if(!start || !end) return alert("يرجى تحديد وقت البدء والانتهاء!");
    if(type !== "shipping" && value <= 0) return alert("يرجى كتابة قيمة الخصم!");

    safeUpdateList('/promos', promos => {
        let i = promos.findIndex(p => p.code === code);
        if (i > -1) {
            // بنحافظ على كل الحقول القديمة (زي scope, products, usageCount, usedBy)
            // ونحدّث بس الحقول اللي في فورم التعديل، عشان منمسحش أي فيتشر موجود.
            promos[i] = {
                ...promos[i],
                type, value, start, end, label,
                maxTotal, maxPerUser, newUsersOnly,
                minOrderValue, maxDiscountValue
            };
        }
        return promos;
    }).then(() => {
        alert("تم تحديث البروموكود بنجاح! ✅");
        closeEditPromoModal();
    });
};


// ================================================================
