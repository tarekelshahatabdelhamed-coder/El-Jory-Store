// ================================================================
// js/admin-team.js
// إدارة فريق العمل (إضافة/إيقاف/تعديل صلاحيات مديرين).
// ملحوظة: كل الدوال هنا لسه بتتسجل على window (زي الأول تمامًا) — الفصل ده
// تنظيمي بس، ومحتاج كل الملفات تتحمّل مع بعض في admin.html بالترتيب المحدد
// (utils الأول، dashboard آخر واحد).
// ================================================================

// ⑮ إدارة فريق العمل والصلاحيات (Admin Team)
// ================================================================

window.addNewAdmin = function(event) {
    if (!(window.currentAdminCanManage === true)) return alert("⚠️ ليس لديك صلاحية إضافة مديرين جدد.");
    let email = document.getElementById("newAdminEmail").value.trim();
    let pass  = document.getElementById("newAdminPass").value;
    let foundationEl = document.getElementById("newAdminFoundation");
    let foundationId = foundationEl ? foundationEl.value : "";
    if(!email || pass.length < 6) {
        alert("يرجى كتابة بريد إلكتروني صحيح وكلمة مرور لا تقل عن 6 أحرف!");
        return;
    }
    if (!foundationId) { alert("يرجى اختيار أساس الصلاحيات (الفئة) لهذا المدير!"); return; }
    let btn = event.target;
    btn.innerText = "جاري إضافة المدير للسحابة... ⏳";
    btn.disabled  = true;
    let secondaryApp = firebase.initializeApp(firebase.app().options, "SecondaryApp" + Date.now());
    secondaryApp.auth().createUserWithEmailAndPassword(email, pass)
        .then(userCredential => {
            let newUid = userCredential.user.uid;
            db.ref('/admins/' + newUid).set(true).then(() => {
                db.ref('/admin_details/' + newUid).set({ email, date: new Date().toLocaleDateString('en-GB'), foundationId, isDisabled: false });
                alert("تم إضافة المدير بنجاح وحصل على صلاحيات فئته! 🎉");
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

// ⭐ تغيير فئة صلاحيات مدير موجود (بدون إعادة إنشائه)
window.changeAdminFoundation = function(uid, selectEl) {
    if (!(window.currentAdminCanManage === true)) { alert("⚠️ ليس لديك صلاحية تعديل صلاحيات المديرين."); return; }
    let newFoundationId = selectEl.value;
    db.ref('/admin_details/' + uid + '/foundationId').set(newFoundationId).then(() => {
        alert("✅ تم تحديث فئة صلاحيات هذا المدير.");
    });
};

// ⭐ إيقاف/تفعيل مدير (مايقدرش يدخل اللوحة وهو موقوف، من غير ما نحذف حسابه)
window.toggleAdminDisabled = function(uid, currentlyDisabled) {
    if (!(window.currentAdminCanManage === true)) { alert("⚠️ ليس لديك صلاحية إيقاف/تفعيل المديرين."); return; }
    db.ref('/admin_details/' + uid + '/isDisabled').set(!currentlyDisabled).then(() => {
        alert(!currentlyDisabled ? "✅ تم إيقاف هذا المدير، لن يقدر يدخل اللوحة." : "✅ تم إعادة تفعيل هذا المدير.");
    });
};

window.loadAdminsList = function() {
    if(!window.db) return;
    db.ref('/admin_details').on('value', snap => {
        let list = document.getElementById("adminListBody");
        if(!list) return;
        list.innerHTML = "";
        let data = snap.val();
        let foundations = JSON.parse(localStorage.getItem('eljory_permission_foundations') || '[]');
        let foundationOpts = foundations.map(f => `<option value="${f.id}">${f.name}${f.isBuiltIn?' (أساسية)':''}</option>`).join('');
        let canManage = window.currentAdminCanManage === true;
        if(data) {
            Object.keys(data).forEach(uid => {
                let info = data[uid];
                let fId = info.foundationId || '';
                let fName = fId ? (foundations.find(f=>f.id===fId) ? foundations.find(f=>f.id===fId).name : 'فئة محذوفة ⚠️') : 'سوبر أدمن (بدون فئة) 👑';
                let isDisabled = info.isDisabled === true;
                let statusHtml = isDisabled
                    ? '<span style="color:red;font-weight:bold;">موقوف ⛔</span>'
                    : '<span style="color:green;font-weight:bold;">نشط ✅</span>';
                let foundationCell = canManage
                    ? `<select class="form-control adminChangeFoundationSelect" style="min-width:160px;" onchange="changeAdminFoundation('${uid}', this)">
                          <option value="">${fName}</option>${foundationOpts}
                       </select>`
                    : `<span>${fName}</span>`;
                let actionsHtml = canManage
                    ? `<button class="btn ${isDisabled?'btn-green':'btn-red'}" style="padding:5px 10px;margin-bottom:5px;" onclick="toggleAdminDisabled('${uid}', ${isDisabled})">${isDisabled?'تفعيل ✅':'إيقاف ⛔'}</button>
                       <button class="btn btn-red" style="padding:5px 10px;" onclick="removeAdmin('${uid}')">سحب الصلاحية ❌</button>`
                    : '<span style="color:gray;font-size:12px;">لا تملك صلاحية الإدارة</span>';
                list.innerHTML += `<tr style="${isDisabled?'opacity:0.6;':''}">
                    <td><strong>${info.email}</strong></td>
                    <td>${info.date}</td>
                    <td>${foundationCell}</td>
                    <td>${statusHtml}</td>
                    <td>${actionsHtml}</td>
                </tr>`;
            });
        } else {
            list.innerHTML = `<tr><td colspan="5" style="text-align:center;color:gray;padding:20px;">لا يوجد مديرين إضافيين حتى الآن.</td></tr>`;
        }
    });
};

window.removeAdmin = function(uid) {
    if (!(window.currentAdminCanManage === true)) { alert("⚠️ ليس لديك صلاحية سحب صلاحيات المديرين."); return; }
    if(confirm("هل أنت متأكد من سحب صلاحيات الإدارة من هذا الحساب نهائياً؟")) {
        db.ref('/admins/' + uid).remove();
        db.ref('/admin_details/' + uid).remove();
        alert("تم سحب الصلاحيات بنجاح!");
    }
};


// ================================================================
