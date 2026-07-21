// ================================================================
// js/admin-loyalty.js
// نظام الولاء والمكافآت (Points & Rewards).
// ملحوظة: كل الدوال هنا لسه بتتسجل على window (زي الأول تمامًا) — الفصل ده
// تنظيمي بس، ومحتاج كل الملفات تتحمّل مع بعض في admin.html بالترتيب المحدد
// (utils الأول، dashboard آخر واحد).
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
