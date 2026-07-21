// ================================================================
// js/admin-warranties.js
// إدارة الضمانات (Warranties) — السجل + محتوى صفحة ضماناتي + صفحة التفعيل.
// ملحوظة: كل الدوال هنا لسه بتتسجل على window (زي الأول تمامًا) — الفصل ده
// تنظيمي بس، ومحتاج كل الملفات تتحمّل مع بعض في admin.html بالترتيب المحدد
// (utils الأول، dashboard آخر واحد).
// ================================================================

// ⑪.٥ إدارة الضمانات (Warranties)
// ================================================================

window.loadWarrantySettings = function() {
    let el = document.getElementById("warrantyGraceDaysInput");
    if (!el) return;
    let settings = JSON.parse(localStorage.getItem("eljory_loyalty_settings")) || {};
    el.value = parseInt(settings.warrantyGraceDays) || 3;
};

window.saveWarrantySettings = function() {
    let days = parseInt(document.getElementById("warrantyGraceDaysInput").value) || 3;
    // بنحافظ على باقي إعدادات الولاء (system/spent/earn/expiryPeriods) زي ما هي
    // وبنضيف/نحدّث بس مهلة تفعيل الضمان جوه نفس عقدة /settings
    let settings = JSON.parse(localStorage.getItem("eljory_loyalty_settings")) || { system:"global", spent:10, earn:1 };
    settings.warrantyGraceDays = days;
    db.ref('/settings').set(settings).then(() => alert("تم حفظ مهلة تفعيل الضمان بنجاح!"));
};

// ── محرر محتوى صفحة "ضماناتي" (CMS بسيط زي محرر مدونة المنتج بالظبط لكن
// لمحتوى عام واحد بيظهر لكل العملاء، مش لكل منتج على حدة) ─────────────────
window.wtyPageExecCmd = function(cmd, val) {
    document.getElementById('warrantyPageEditor').focus();
    document.execCommand(cmd, false, val || null);
};

window.loadWarrantyPageEditor = function() {
    let editor = document.getElementById("warrantyPageEditor");
    if (!editor) return;
    let data = JSON.parse(localStorage.getItem("eljory_warranty_content") || "null");
    if (data && data.content) {
        editor.innerHTML = data.content;
    }
    let btnTextEl = document.getElementById("warrantyBtnText");
    let btnLinkEl = document.getElementById("warrantyBtnLink");
    if (btnTextEl) btnTextEl.value = (data && data.btnText) ? data.btnText : "";
    if (btnLinkEl) btnLinkEl.value = (data && data.btnLink) ? data.btnLink : "";
};

window.saveWarrantyPageContent = function() {
    let content = document.getElementById("warrantyPageEditor").innerHTML;
    let btnText = document.getElementById("warrantyBtnText").value.trim();
    let btnLink = document.getElementById("warrantyBtnLink").value.trim();
    db.ref('/warrantyPageContent').set({ content, btnText, btnLink }).then(() => {
        alert("✅ تم حفظ محتوى صفحة ضماناتي بنجاح!");
    }).catch(() => alert("❌ حدث خطأ أثناء الحفظ، حاول مرة أخرى."));
};

// ── تبويبات قسم الضمانات الثلاثة (سجل / صفحة ضماناتي / صفحة التفعيل) ──────
window.wtySwitchAdminTab = function(tab) {
    let tabs = { log:'wtyTabLog', account:'wtyTabAccount', activation:'wtyTabActivation' };
    let btns = { log:'wtyTabBtnLog', account:'wtyTabBtnAccount', activation:'wtyTabBtnActivation' };
    Object.keys(tabs).forEach(function(k) {
        let el  = document.getElementById(tabs[k]);
        let btn = document.getElementById(btns[k]);
        if (el)  el.style.display = (k === tab) ? 'block' : 'none';
        if (btn) {
            btn.style.background = (k === tab) ? '#1d364a' : '#eef2f5';
            btn.style.color      = (k === tab) ? 'white'   : '#1d364a';
        }
    });
    if (tab === 'activation' && typeof loadWarrantyActivationPageEditor === 'function') {
        loadWarrantyActivationPageEditor();
    }
    localStorage.setItem("admin_wty_active_subtab", tab);
};

// ── محرر محتوى صفحة تفعيل الضمان (warranty.html) — نظام CMS زي باقي المحرّرات ──
window.wtyActExecCmd = function(cmd, val) {
    document.getElementById('wtyActSubtitleEditor').focus();
    document.execCommand(cmd, false, val || null);
};

window.WTY_ACTIVATION_DEFAULTS = {
    logoImg: "logo.png",
    title: "🛡️ تفعيل ضمان منتجاتك",
    subtitleHtml: "إحنا في الجوري ستور بنوثّق ضمان كل منتج بشرائك عشان تضمن حقك بالكامل وقت ما تحتاج الصيانة.\nخطوة واحدة بسيطة وضمانك يبقى موثّق وحسابك جاهز.",
    trust1: "🔒 بياناتك في أمان تام",
    trust2: "🛡️ ضمان موثّق",
    trust3: "⚡ تفعيل فوري",
    successMsg: "تم تفعيل ضمانك بنجاح!",
    successBtnText: 'اذهب لصفحة "ضماناتي"'
};

window.loadWarrantyActivationPageEditor = function() {
    let editor = document.getElementById("wtyActSubtitleEditor");
    if (!editor) return;
    db.ref('/warrantyActivationPageContent').once('value', function(snap) {
        let data = snap.val() || {};
        let d = window.WTY_ACTIVATION_DEFAULTS;
        document.getElementById("wtyActLogoImg").value        = data.logoImg        !== undefined ? data.logoImg        : d.logoImg;
        document.getElementById("wtyActTitle").value           = data.title          !== undefined ? data.title          : d.title;
        document.getElementById("wtyActTrust1").value          = data.trust1         !== undefined ? data.trust1         : d.trust1;
        document.getElementById("wtyActTrust2").value          = data.trust2         !== undefined ? data.trust2         : d.trust2;
        document.getElementById("wtyActTrust3").value          = data.trust3         !== undefined ? data.trust3         : d.trust3;
        document.getElementById("wtyActSuccessMsg").value      = data.successMsg     !== undefined ? data.successMsg     : d.successMsg;
        document.getElementById("wtyActSuccessBtnText").value  = data.successBtnText !== undefined ? data.successBtnText : d.successBtnText;
        if (data.subtitleHtml) {
            editor.innerHTML = data.subtitleHtml;
        } else {
            editor.innerHTML = '<p>' + d.subtitleHtml.replace(/\n/g, '<br>') + '</p>';
        }
    });
};

window.saveWarrantyActivationPageContent = function() {
    let content = {
        logoImg:        document.getElementById("wtyActLogoImg").value.trim(),
        title:          document.getElementById("wtyActTitle").value.trim(),
        subtitleHtml:   document.getElementById("wtyActSubtitleEditor").innerHTML,
        trust1:         document.getElementById("wtyActTrust1").value.trim(),
        trust2:         document.getElementById("wtyActTrust2").value.trim(),
        trust3:         document.getElementById("wtyActTrust3").value.trim(),
        successMsg:     document.getElementById("wtyActSuccessMsg").value.trim(),
        successBtnText: document.getElementById("wtyActSuccessBtnText").value.trim()
    };
    db.ref('/warrantyActivationPageContent').set(content).then(() => {
        alert("✅ تم حفظ محتوى صفحة تفعيل الضمان بنجاح!");
    }).catch(() => alert("❌ حدث خطأ أثناء الحفظ، حاول مرة أخرى."));
};

window.resetWarrantyActivationPageContent = function() {
    if (!confirm("هل تريد استعادة المحتوى الافتراضي لصفحة التفعيل؟ (لازم تضغط حفظ بعدها عشان يتفعل)")) return;
    let d = window.WTY_ACTIVATION_DEFAULTS;
    document.getElementById("wtyActLogoImg").value       = d.logoImg;
    document.getElementById("wtyActTitle").value          = d.title;
    document.getElementById("wtyActTrust1").value         = d.trust1;
    document.getElementById("wtyActTrust2").value         = d.trust2;
    document.getElementById("wtyActTrust3").value         = d.trust3;
    document.getElementById("wtyActSuccessMsg").value     = d.successMsg;
    document.getElementById("wtyActSuccessBtnText").value = d.successBtnText;
    document.getElementById("wtyActSubtitleEditor").innerHTML = '<p>' + d.subtitleHtml.replace(/\n/g, '<br>') + '</p>';
};

// بناء صف بيانات ضمان واحد من طلب معين (نستخدم أطول تاريخ انتهاء بين منتجاته
// المضمونة كمرجع لعرض "باقي كام يوم")، بحيث لو الأدمن فاتح الصفحة والضمان لسه
// معلّق فوق المهلة، بنحسب حالته "انتهت مهلة التفعيل" تلقائيًا هنا بس للعرض فقط
// (من غير ما نكتب في الداتابيز إلا لما العميل نفسه يفتح صفحة التفعيل).
function buildWarrantyRow(order) {
    let graceDays = window.getWarrantyGraceDaysSetting ? window.getWarrantyGraceDaysSetting() : 3;
    let warrantyItems = (order.items || []).filter(it => (parseInt(it.warrantyMonths) || 0) > 0);
    if (!warrantyItems.length) return null;

    let status = order.warrantyStatus || "not_activated";
    let deadline = window.getWarrantyDeadline ? window.getWarrantyDeadline(order, graceDays) : null;
    if (status === "not_activated" && deadline && Date.now() > deadline) {
        status = "expired_grace";
    }
    // ⭐ لو الطلب نفسه اتلغى، الأولوية لإظهار إنه ملغي (بدل ما يفضل واقف على
    // "لسه معندوش تسليم" أو "في انتظار التفعيل" وهو أصلاً طلب ملغي مش هيتسلم).
    if (order.status === "Cancelled" && status !== "active") {
        status = "order_cancelled";
    }

    let activatedAt = order.warrantyActivatedAt || null;
    let endsAt = null;
    if (activatedAt) {
        let maxMonths = Math.max(...warrantyItems.map(it => parseInt(it.warrantyMonths) || 0));
        let d = new Date(activatedAt);
        d.setMonth(d.getMonth() + maxMonths);
        endsAt = d.getTime();
    }

    let remainingDays = null;
    if (endsAt) remainingDays = Math.ceil((endsAt - Date.now()) / (24*60*60*1000));

    return {
        orderId: order.id,
        customerName: order.customer ? order.customer.name : "-",
        customerPhone: order.customer ? order.customer.phone : "-",
        total: order.total,
        deliveredAt: order.deliveredAt || null,
        status: status,
        activatedAt: activatedAt,
        endsAt: endsAt,
        remainingDays: remainingDays
    };
}

window.renderAdminWarranties = function() {
    let tbody = document.getElementById("adminWarrantiesBody");
    if (!tbody) return;

    let orders = JSON.parse(localStorage.getItem("eljory_orders")) || [];
    let nameF   = (document.getElementById("filterWtyName")   ? document.getElementById("filterWtyName").value.trim().toLowerCase()   : "");
    let phoneF  = (document.getElementById("filterWtyPhone")  ? document.getElementById("filterWtyPhone").value.trim()                : "");
    let statusF = (document.getElementById("filterWtyStatus") ? document.getElementById("filterWtyStatus").value                      : "all");
    let fromF   = (document.getElementById("filterWtyFrom")   ? document.getElementById("filterWtyFrom").value                        : "");
    let toF     = (document.getElementById("filterWtyTo")     ? document.getElementById("filterWtyTo").value                          : "");

    let rows = orders.filter(o => o.warrantyToken).map(buildWarrantyRow).filter(Boolean);

    rows = rows.filter(r => {
        if (nameF  && !(r.customerName||"").toLowerCase().includes(nameF)) return false;
        if (phoneF && !(r.customerPhone||"").includes(phoneF)) return false;
        if (statusF !== "all" && r.status !== statusF) return false;
        if ((fromF || toF) && r.activatedAt) {
            let activatedMonthStr = new Date(r.activatedAt).toISOString().slice(0,7); // YYYY-MM
            if (fromF && activatedMonthStr < fromF) return false;
            if (toF   && activatedMonthStr > toF)   return false;
        } else if (fromF || toF) {
            // لو محدد فلتر شهر ومفيش تاريخ تفعيل أصلاً (لسه معلّق)، نستبعده من النتيجة
            return false;
        }
        return true;
    });

    window._lastFilteredWarranties = rows;

    tbody.innerHTML = "";
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:gray;padding:20px;">لا توجد ضمانات مطابقة.</td></tr>';
        return;
    }

    let statusLabels = {
        not_activated:   '<span style="color:#f38c18;font-weight:bold;">⏳ في انتظار التفعيل</span>',
        active:          '<span style="color:#28a745;font-weight:bold;">✅ مفعّل</span>',
        expired_grace:   '<span style="color:#d9534f;font-weight:bold;">❌ انتهت مهلة التفعيل</span>',
        order_cancelled: '<span style="color:#6c757d;font-weight:bold;">🚫 الطلب ملغي</span>'
    };

    rows.forEach(r => {
        let deliveredTxt = r.deliveredAt ? new Date(r.deliveredAt).toLocaleDateString('ar-EG') : '<span style="color:gray;">لسه ماتسلمش</span>';
        let activatedTxt = r.activatedAt ? new Date(r.activatedAt).toLocaleDateString('ar-EG') : '—';
        let endsTxt       = r.endsAt ? new Date(r.endsAt).toLocaleDateString('ar-EG') : '—';
        let remainingTxt  = '—';
        if (r.remainingDays !== null) {
            remainingTxt = r.remainingDays > 0
                ? `<span style="color:#28a745;font-weight:bold;">${r.remainingDays} يوم</span>`
                : `<span style="color:#d9534f;font-weight:bold;">منتهي</span>`;
        }
        tbody.innerHTML += `<tr>
            <td><strong>${r.orderId}</strong></td>
            <td>${r.customerName}</td>
            <td>${r.customerPhone}</td>
            <td>${r.total} ج.م</td>
            <td>${deliveredTxt}</td>
            <td>${statusLabels[r.status] || r.status}</td>
            <td>${activatedTxt}</td>
            <td>${endsTxt}</td>
            <td>${remainingTxt}</td>
        </tr>`;
    });
};

window.exportWarrantiesCSV = function() {
    let rows = window._lastFilteredWarranties || [];
    if (!rows.length) return alert("لا توجد بيانات ضمانات لتصديرها بالفلتر الحالي!");
    let esc = v => `"${String(v===undefined||v===null?'':v).replace(/"/g,'""')}"`;
    let statusTextMap = { not_activated: "في انتظار التفعيل", active: "مفعّل", expired_grace: "انتهت مهلة التفعيل", order_cancelled: "الطلب ملغي" };
    let csv = "رقم الطلب;اسم العميل;التليفون;قيمة الفاتورة;تاريخ التسليم;الحالة;تاريخ التفعيل;ينتهي في;الأيام المتبقية\r\n";
    rows.forEach(r => {
        csv += [
            esc(r.orderId), esc(r.customerName), esc(r.customerPhone), esc(r.total),
            esc(r.deliveredAt ? new Date(r.deliveredAt).toLocaleDateString('en-GB') : ''),
            esc(statusTextMap[r.status] || r.status),
            esc(r.activatedAt ? new Date(r.activatedAt).toLocaleDateString('en-GB') : ''),
            esc(r.endsAt ? new Date(r.endsAt).toLocaleDateString('en-GB') : ''),
            esc(r.remainingDays !== null ? r.remainingDays : '')
        ].join(";") + "\r\n";
    });
    let bom  = new Uint8Array([0xEF,0xBB,0xBF]);
    let blob = new Blob([bom, csv], { type:'text/csv;charset=utf-8;' });
    let url  = URL.createObjectURL(blob);
    let link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ElJory_Warranties_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
};


// ================================================================
