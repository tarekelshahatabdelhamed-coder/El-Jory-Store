// ================================================================
// js/admin-customers.js
// إدارة مناطق التوصيل (Regions) + إدارة العملاء (Customers).
// ملحوظة: كل الدوال هنا لسه بتتسجل على window (زي الأول تمامًا) — الفصل ده
// تنظيمي بس، ومحتاج كل الملفات تتحمّل مع بعض في admin.html بالترتيب المحدد
// (utils الأول، dashboard آخر واحد).
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
        let btnColor  = isActive ? "#28a745" : "#5a6268";
        let btnText   = isActive ? "نشط 👁️" : "مخفي 🙈";
        // ⭐ بقينا بنستخدم reg.id (ثابت) بدل reg.name (قابل للتغيير) كمعرّف في كل
        // الأزرار، عشان تعديل اسم المنطقة منعادش يفصلها عن سجلها في فايربيس.
        list.innerHTML += `<div class="badge" style="background:${bg};font-size:14px;padding:8px 15px;margin-left:10px;display:inline-flex;align-items:center;gap:10px;margin-bottom:10px;">
            ${reg.name} <span style="color:#f38c18;">(${feeTxt})</span>
            <button onclick="openEditRegion('${reg.id}')" style="background:#17a2b8;color:white;border:none;padding:3px 8px;border-radius:3px;cursor:pointer;font-size:12px;">⚙️ تعديل</button>
            <button onclick="toggleRegionStatus('${reg.id}')" style="background:${btnColor};color:white;border:none;padding:3px 8px;border-radius:3px;cursor:pointer;font-size:12px;">${btnText}</button>
            <span class="badge-remove" data-perm-delete="1" style="margin:0;padding:0;" onclick="deleteAdminRegion('${reg.id}')">✖</span>
        </div>`;
    });
};

window.addAdminRegion = function() {
    let name     = document.getElementById("newRegionName").value.trim();
    let feeInput = document.getElementById("newRegionFee") ? document.getElementById("newRegionFee").value : "0";
    let fee      = feeInput === "" ? 0 : parseFloat(feeInput);
    if (!name) return alert("يرجى إدخال اسم المنطقة!");
    let existing = JSON.parse(localStorage.getItem("eljory_regions")) || [];
    if (existing.find(r => r.name === name)) return alert("هذه المنطقة موجودة مسبقاً!");
    let newId = 'REG_' + Date.now();
    db.ref('/regions/' + newId).set({ id: newId, name, isActive: true, fee }).then(() => {
        document.getElementById("newRegionName").value = "";
        if(document.getElementById("newRegionFee")) document.getElementById("newRegionFee").value = "";
        alert("تمت إضافة المنطقة للسحابة بنجاح!");
    }).catch(err => { console.error(err); alert("حدث خطأ أثناء الحفظ."); });
};

window.deleteAdminRegion = function(regionId) {
    if(confirm("هل أنت متأكد من مسح هذه المنطقة؟")) {
        db.ref('/regions/' + regionId).remove().then(() => { alert("تم الحذف بنجاح!"); })
            .catch(err => { console.error(err); alert("❌ حدث خطأ أثناء الحذف — قد لا تملك صلاحية الحذف على هذا القسم."); });
    }
};

window.openEditRegion = function(regionId) {
    let regions = JSON.parse(localStorage.getItem("eljory_regions")) || [];
    let reg     = regions.find(r => r.id === regionId);
    if(!reg) return;
    document.getElementById("editRegionIndex").value = regionId;
    document.getElementById("editRegionName").value  = reg.name;
    document.getElementById("editRegionFee").value   = reg.fee || 0;
    document.getElementById("editRegionModal").style.display = "flex";
};

window.saveRegionEdit = function() {
    let regionId = document.getElementById("editRegionIndex").value;
    let newName  = document.getElementById("editRegionName").value.trim();
    let feeInput = document.getElementById("editRegionFee").value;
    let newFee   = feeInput === "" ? 0 : parseFloat(feeInput);
    if(!newName) return alert("الاسم مطلوب!");
    let regions = JSON.parse(localStorage.getItem("eljory_regions")) || [];
    if (regions.find(r => r.name === newName && r.id !== regionId)) return alert("هذا الاسم مستخدم لمنطقة أخرى!");
    // ⭐ بما إن المفتاح في فايربيس بقى id ثابت (مش الاسم)، تغيير الاسم دلوقتي
    // "تعديل" عادي على نفس السجل، مش عملية نقل/حذف وإضافة زي قبل كده.
    db.ref('/regions/' + regionId).update({ name: newName, fee: newFee }).then(() => {
        closeRegionModal(); alert("تم التحديث!");
    }).catch(err => { console.error(err); alert("حدث خطأ أثناء الحفظ."); });
};

window.toggleRegionStatus = function(regionId) {
    let regions = JSON.parse(localStorage.getItem("eljory_regions")) || [];
    let reg = regions.find(r => r.id === regionId);
    if (!reg) return;
    db.ref('/regions/' + regionId + '/isActive').set(!(reg.isActive !== false));
};

window.closeRegionModal = function() {
    document.getElementById("editRegionModal").style.display = "none";
};

// ⭐ ترحيل لمرة واحدة: المناطق القديمة اتحفظت من غير أي "id" مستقل (كانت
// بتتحدد بالاسم بس)، والدوال الجديدة فوق بقت بتشتغل بـ id ثابت. الزرار ده
// بيولّد id لأي منطقة قديمة ناقصها ويعيد حفظها في مسارها الصحيح — آمن يتنفذ
// أكتر من مرة، ولو كل حاجة سليمة هيقولك كده من غير ما يعمل أي تغيير.
window.migrateRegionsToKeyedFormat = function() {
    if (!confirm('هذا الإجراء بيرتب تخزين أي "مناطق توصيل" قديمة عشان تشتغل صح مع نظام الصلاحيات الجديد. آمن ويمكن تنفيذه أكتر من مرة من غير أي ضرر. متابعة؟')) return;
    db.ref('/regions').once('value').then(function(snap) {
        if (!snap.exists()) { alert('لا توجد مناطق لترحيلها.'); return; }
        let data = snap.val();
        let entries = Object.keys(data).map(function(k) { return { oldKey: k, item: data[k] }; }).filter(function(e) { return e.item; });
        let toMigrate = entries.filter(function(e) { return !e.item.id || e.item.id !== e.oldKey; });
        if (!toMigrate.length) { alert('✅ كل المناطق بالفعل بالشكل الصحيح، لا يوجد شيء لترحيله.'); return; }

        let ops = [];
        toMigrate.forEach(function(e) {
            let item = e.item;
            let newKey = item.id || ('REG_' + Date.now() + '_' + Math.random().toString(36).slice(2,7));
            item.id = newKey;
            ops.push(db.ref('/regions/' + newKey).set(item));
            ops.push(db.ref('/regions/' + e.oldKey).remove());
        });
        Promise.all(ops).then(function() {
            alert('✅ تم ترحيل ' + toMigrate.length + ' منطقة بنجاح لشكل التخزين الجديد!');
            if (typeof loadAdminRegions === 'function') loadAdminRegions();
        }).catch(function(err) {
            alert('❌ حدث خطأ أثناء الترحيل: ' + err.message + '\nتأكد إنك مسجل دخول كسوبر أدمن، أو عندك صلاحيتي "إضافة" و"حذف" مفعّلتين على قسم "العملاء والمناطق".');
        });
    });
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
    usersDB = usersDB.slice().reverse();

    let pageSize   = window.genGetPageSize('customers', 20);
    let pageUsers  = window.genSlicePage('customers', usersDB, pageSize);
    window.genRenderPagination('customers', usersDB.length, pageSize, 'renderAdminCustomers');

    let countEl = document.getElementById("customersCount");
    if (countEl) countEl.innerText = `👥 يظهر ${pageUsers.length} من أصل ${usersDB.length} عميل`;

    pageUsers.forEach(u => {
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
            <td><small>${u.joinTime||'—'}</small></td>
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
