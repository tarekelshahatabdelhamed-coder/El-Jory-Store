// ================================================================
// js/admin-accounting.js
// نظام الخزنة والحسابات (Treasury) + سجل حركة المخزون واستلام دفعات بضاعة جديدة.
// ملحوظة: كل الدوال هنا لسه بتتسجل على window (زي الأول تمامًا) — الفصل ده
// تنظيمي بس، ومحتاج كل الملفات تتحمّل مع بعض في admin.html بالترتيب المحدد
// (utils الأول، dashboard آخر واحد).
// ================================================================

// ⑦.٦ نظام الخزنة والحسابات (Treasury) — المرحلة 2
// ================================================================
// المبدأ: كل حساب (كاش/بنك/محفظة) عنده رصيد بيتحدث فقط عن طريق transaction
// ذرّي على Firebase (زي بالظبط نظام نقاط الولاء)، وكل حركة بتتسجل في سجل
// منفصل /treasuryTransactions عشان يبقى عندنا تاريخ كامل قابل للفلترة والتصدير.

window.treasuryAccountTypeLabel = function(type) {
    return type === 'bank' ? 'حساب بنكي 🏦' : (type === 'wallet' ? 'محفظة إلكترونية 📱' : 'كاش نقدي 💵');
};

// ── إدارة الحسابات (CRUD) ──────────────────────────────────────────────
window.addTreasuryAccount = function() {
    let name    = document.getElementById("newTreasAccName").value.trim();
    let type    = document.getElementById("newTreasAccType").value;
    let opening = parseFloat(document.getElementById("newTreasAccOpening").value) || 0;
    if (!name) return alert("يرجى كتابة اسم الحساب!");
    let accId = 'ACC_' + Date.now();
    // ⚠️ إصلاح: كان الرصيد الافتتاحي بيتسجل مرتين — مرة هنا مباشرة في balance،
    // ومرة تانية عن طريق logTreasuryTransaction تحت (اللي بتعمل transaction
    // بتضيف delta فوق الرصيد الحالي). فكان أي رصيد افتتاحي بيتضاعف تلقائياً
    // (مثلاً 2205.99 كانت بتتسجل 4411.98). دلوقتي الحساب بيتاخد balance:0 وقت
    // الإنشاء، وlogTreasuryTransaction هي المصدر الوحيد اللي بيحدد الرصيد
    // الفعلي، بحيث سجل حركات الخزنة يفضل مطابق تماماً لرصيد الحساب دايماً.
    let newAcc = { id: accId, name, type, balance: 0, isActive: true, createdAt: Date.now() };
    db.ref('/treasuryAccounts/' + accId).set(newAcc).then(() => {
        if (opening !== 0) {
            return window.logTreasuryTransaction({
                accountId: accId, type: 'deposit', amount: opening,
                reason: 'الرصيد الافتتاحي عند إنشاء الحساب', relatedOrderId: null, relatedExpenseId: null
            });
        }
    }).then(() => {
        document.getElementById("newTreasAccName").value    = "";
        document.getElementById("newTreasAccOpening").value = "0";
        alert("✅ تم إضافة الحساب بنجاح!");
    });
};

window.renderAdminTreasuryAccounts = function() {
    let tbody = document.getElementById("adminTreasuryAccountsBody");
    if (!tbody) return;
    let accounts = JSON.parse(localStorage.getItem("eljory_treasury_accounts")) || [];
    tbody.innerHTML = "";
    if (!accounts.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:gray;padding:20px;">لا توجد حسابات مضافة بعد. أضف أول حساب من الفورم فوق.</td></tr>';
        return;
    }
    accounts.forEach(a => {
        let isActive = a.isActive !== false;
        let balColor = (a.balance || 0) < 0 ? '#d9534f' : '#28a745';
        tbody.innerHTML += `<tr style="${!isActive?'opacity:0.55;':''}">
            <td><strong>${a.name}</strong></td>
            <td>${window.treasuryAccountTypeLabel(a.type)}</td>
            <td style="color:${balColor};font-weight:bold;font-size:15px;">${(a.balance||0).toFixed(2)} ج.م</td>
            <td><button class="btn ${isActive?'btn-green':'btn-inactive'}" style="padding:4px 10px;" onclick="toggleTreasuryAccountStatus('${a.id}')">${isActive?'نشط':'مخفي'}</button></td>
            <td>
                <button class="btn" style="background:#17a2b8;padding:4px 10px;margin-bottom:5px;" onclick="renameTreasuryAccount('${a.id}')">✏️ تعديل الاسم</button>
                <button class="btn" style="background:#f38c18;color:#1d364a;padding:4px 10px;margin-bottom:5px;" onclick="correctTreasuryAccountBalance('${a.id}')">💰 تصحيح الرصيد</button>
                <button class="btn btn-red" style="padding:4px 10px;" onclick="deleteTreasuryAccount('${a.id}')">🗑️ حذف</button>
            </td>
        </tr>`;
    });
};

window.toggleTreasuryAccountStatus = function(id) {
    db.ref('/treasuryAccounts/' + id + '/isActive').once('value').then(function(snap) {
        let cur = snap.val();
        db.ref('/treasuryAccounts/' + id + '/isActive').set(!(cur !== false));
    });
};

window.renameTreasuryAccount = function(id) {
    let accounts = JSON.parse(localStorage.getItem("eljory_treasury_accounts")) || [];
    let acc = accounts.find(a => a.id === id);
    if (!acc) return;
    let newName = prompt("اسم الحساب الجديد:", acc.name);
    if (!newName || !newName.trim()) return;
    db.ref('/treasuryAccounts/' + id + '/name').set(newName.trim());
};

// ⭐ تصحيح الرصيد: بدل ما نكتب فوق balance مباشرة (وده بيكسر التطابق بين الرصيد
// وسجل الحركات)، بنحسب الفرق بين الرصيد الحالي والرصيد الصح اللي الأدمن كتبه،
// ونسجله كحركة خزنة عادية (إيداع أو سحب تصحيحي) عن طريق نفس logTreasuryTransaction
// اللي بتستخدمها كل عمليات الخزنة التانية. كده الرصيد بيتظبط والسجل التاريخي
// بيفضل موثّق وقابل للمراجعة (تقدر تشوف "تصحيح يدوي للرصيد" في تاب حركات الخزنة).
window.correctTreasuryAccountBalance = function(id) {
    let accounts = JSON.parse(localStorage.getItem("eljory_treasury_accounts")) || [];
    let acc = accounts.find(a => a.id === id);
    if (!acc) return;
    let currentBal = acc.balance || 0;
    let input = prompt(`الرصيد الحالي المسجل لحساب "${acc.name}": ${currentBal.toFixed(2)} ج.م\n\nاكتب الرصيد الصحيح المفروض يكون عليه الحساب:`, currentBal.toFixed(2));
    if (input === null) return; // اتلغى
    let newBal = parseFloat(input);
    if (isNaN(newBal)) return alert("⚠️ قيمة غير صحيحة!");
    let diff = newBal - currentBal;
    if (Math.abs(diff) < 0.01) return alert("لا يوجد فرق يستحق التسجيل — الرصيد مطابق بالفعل.");
    let type = diff > 0 ? 'deposit' : 'withdraw';
    window.logTreasuryTransaction({
        accountId: id, type: type, amount: Math.abs(diff),
        reason: `تصحيح يدوي للرصيد (من ${currentBal.toFixed(2)} إلى ${newBal.toFixed(2)} ج.م)`,
        relatedOrderId: null, relatedExpenseId: null
    }).then(() => {
        alert(`✅ تم تصحيح رصيد الحساب إلى ${newBal.toFixed(2)} ج.م بنجاح!`);
    }).catch(() => {
        alert("❌ حدث خطأ أثناء التصحيح، حاول مرة أخرى.");
    });
};

window.deleteTreasuryAccount = function(id) {
    let accounts = JSON.parse(localStorage.getItem("eljory_treasury_accounts")) || [];
    let acc = accounts.find(a => a.id === id);
    if (!acc) return;
    if (Math.abs(acc.balance || 0) > 0.001) {
        alert("⚠️ لا يمكن حذف حساب رصيده ليس صفراً! حوّل رصيده لحساب آخر أولاً من تاب 'حركات الخزنة'.");
        return;
    }
    if (!confirm("هل أنت متأكد من حذف هذا الحساب نهائياً؟")) return;
    db.ref('/treasuryAccounts/' + id).remove();
};

// ── تعبئة قوائم اختيار الحسابات في كل الأماكن اللي محتاجاها ────────────
window.populateTreasuryAccountSelects = function() {
    let accounts = (JSON.parse(localStorage.getItem("eljory_treasury_accounts")) || []).filter(a => a.isActive !== false);
    let opts = '<option value="">-- اختر الحساب --</option>' +
        accounts.map(a => `<option value="${a.id}">${a.name} (${window.treasuryAccountTypeLabel(a.type)}) — الرصيد: ${(a.balance||0).toFixed(2)} ج.م</option>`).join('');

    ['depTreasAccount','wdTreasAccount','trFromAccount','trToAccount','deliveryModalAccount','moDepositAccount'].forEach(id => {
        let el = document.getElementById(id);
        if (el) { let cur = el.value; el.innerHTML = opts; if (cur) el.value = cur; }
    });

    let filterEl = document.getElementById("filterTxAccount");
    if (filterEl) {
        let cur = filterEl.value;
        filterEl.innerHTML = '<option value="">الكل</option>' + accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
        if (cur) filterEl.value = cur;
    }

    // صناديق تخصيص المصاريف (كل صف فيه select مستقل)
    document.querySelectorAll('.expAllocAccountSelect').forEach(sel => {
        let cur = sel.value;
        sel.innerHTML = opts;
        if (cur) sel.value = cur;
    });

    // صناديق تخصيص دفع دفعات استلام البضاعة على أكتر من حساب (نفس فكرة المصاريف)
    document.querySelectorAll('.rstAllocAccountSelect').forEach(sel => {
        let cur = sel.value;
        sel.innerHTML = opts;
        if (cur) sel.value = cur;
    });

    let noAccMsg = document.getElementById("deliveryModalNoAccountsMsg");
    let confirmBtn = document.querySelector('#deliveryAccountModal .btn-green');
    if (noAccMsg) {
        noAccMsg.style.display = accounts.length ? 'none' : 'block';
        if (confirmBtn) confirmBtn.disabled = !accounts.length;
    }
};

// ── تسجيل حركة خزنة + تحديث رصيد الحساب بأمان (Transaction ذرّي) ───────
// delta: موجب = إضافة للرصيد (إيداع/إيراد بيع/تحويل وارد)
//        سالب = خصم من الرصيد (سحب/مصروف/تحويل صادر/عكس بيع)
window.logTreasuryTransaction = function(opts) {
    // opts: { accountId, type, amount(دايماً موجب), reason, relatedOrderId, relatedExpenseId }
    let isCredit = ['deposit','transfer_in','sale_revenue'].includes(opts.type);
    let delta    = isCredit ? Math.abs(opts.amount) : -Math.abs(opts.amount);
    let adminEmail = (firebase.auth().currentUser && firebase.auth().currentUser.email) || 'غير معروف';

    return db.ref('/treasuryAccounts/' + opts.accountId + '/balance').transaction(cur => (cur || 0) + delta)
        .then(() => {
            let txEntry = {
                id: 'TX_' + Date.now() + '_' + Math.random().toString(36).slice(2,7),
                accountId: opts.accountId,
                type: opts.type,
                amount: Math.abs(opts.amount),
                reason: opts.reason || '',
                relatedOrderId: opts.relatedOrderId || null,
                relatedExpenseId: opts.relatedExpenseId || null,
                by: adminEmail,
                date: new Date().toLocaleString('ar-EG'),
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };
            return db.ref('/treasuryTransactions/' + txEntry.id).set(txEntry);
        });
};

// ── فورم إيداع/سحب/تحويل ────────────────────────────────────────────────
window.treasSwitchTxForm = function(which) {
    let tabs = { deposit:'treasFormDeposit', withdraw:'treasFormWithdraw', transfer:'treasFormTransfer' };
    let btns = { deposit:'treasTxTabBtnDeposit', withdraw:'treasTxTabBtnWithdraw', transfer:'treasTxTabBtnTransfer' };
    Object.keys(tabs).forEach(k => {
        let el  = document.getElementById(tabs[k]);
        let btn = document.getElementById(btns[k]);
        if (el)  el.style.display = (k === which) ? 'flex' : 'none';
        if (btn) { btn.style.background = (k===which) ? '#1d364a' : '#eef2f5'; btn.style.color = (k===which) ? 'white' : '#1d364a'; }
    });
};

window.treasSubmitDeposit = function() {
    let accId  = document.getElementById("depTreasAccount").value;
    let amount = parseFloat(document.getElementById("depTreasAmount").value);
    let reason = document.getElementById("depTreasReason").value.trim() || "إيداع يدوي";
    if (!accId) return alert("يرجى اختيار الحساب!");
    if (!amount || amount <= 0) return alert("يرجى إدخال مبلغ صحيح!");
    window.logTreasuryTransaction({ accountId: accId, type: 'deposit', amount, reason }).then(() => {
        alert("✅ تم تسجيل الإيداع بنجاح!");
        document.getElementById("depTreasAmount").value = "";
        document.getElementById("depTreasReason").value = "";
    });
};

window.treasSubmitWithdraw = function() {
    let accId  = document.getElementById("wdTreasAccount").value;
    let amount = parseFloat(document.getElementById("wdTreasAmount").value);
    let reason = document.getElementById("wdTreasReason").value.trim() || "سحب يدوي";
    if (!accId) return alert("يرجى اختيار الحساب!");
    if (!amount || amount <= 0) return alert("يرجى إدخال مبلغ صحيح!");
    window.logTreasuryTransaction({ accountId: accId, type: 'withdraw', amount, reason }).then(() => {
        alert("✅ تم تسجيل السحب بنجاح!");
        document.getElementById("wdTreasAmount").value = "";
        document.getElementById("wdTreasReason").value = "";
    });
};

window.treasSubmitTransfer = function() {
    let fromId = document.getElementById("trFromAccount").value;
    let toId   = document.getElementById("trToAccount").value;
    let amount = parseFloat(document.getElementById("trAmount").value);
    let reason = document.getElementById("trReason").value.trim() || "تحويل بين حسابين";
    if (!fromId || !toId) return alert("يرجى اختيار الحسابين!");
    if (fromId === toId) return alert("لا يمكن التحويل لنفس الحساب!");
    if (!amount || amount <= 0) return alert("يرجى إدخال مبلغ صحيح!");
    window.logTreasuryTransaction({ accountId: fromId, type: 'transfer_out', amount, reason }).then(() => {
        return window.logTreasuryTransaction({ accountId: toId, type: 'transfer_in', amount, reason });
    }).then(() => {
        alert("✅ تم تنفيذ التحويل بنجاح!");
        document.getElementById("trAmount").value = "";
        document.getElementById("trReason").value = "";
    });
};

// ── عرض سجل الحركات مع فلاتر ─────────────────────────────────────────────
window.treasuryTxTypeLabel = function(type) {
    let map = {
        deposit: '<span style="background:#28a745;color:white;padding:3px 8px;border-radius:4px;font-size:12px;">إيداع يدوي</span>',
        withdraw: '<span style="background:#d9534f;color:white;padding:3px 8px;border-radius:4px;font-size:12px;">سحب يدوي</span>',
        transfer_in: '<span style="background:#17a2b8;color:white;padding:3px 8px;border-radius:4px;font-size:12px;">تحويل وارد</span>',
        transfer_out: '<span style="background:#6c757d;color:white;padding:3px 8px;border-radius:4px;font-size:12px;">تحويل صادر</span>',
        sale_revenue: '<span style="background:#1d364a;color:#f38c18;padding:3px 8px;border-radius:4px;font-size:12px;font-weight:bold;">إيراد بيع</span>',
        sale_reversal: '<span style="background:#f38c18;color:#1d364a;padding:3px 8px;border-radius:4px;font-size:12px;font-weight:bold;">عكس بيع (إلغاء)</span>',
        expense: '<span style="background:#8a2be2;color:white;padding:3px 8px;border-radius:4px;font-size:12px;">مصروف</span>',
        stock_purchase: '<span style="background:#795548;color:white;padding:3px 8px;border-radius:4px;font-size:12px;">📦 شراء بضاعة</span>'
    };
    return map[type] || type;
};

window.renderTreasuryTransactions = function() {
    let tbody = document.getElementById("adminTreasuryTxBody");
    if (!tbody) return;
    let txs      = JSON.parse(localStorage.getItem("eljory_treasury_transactions")) || [];
    let accounts = JSON.parse(localStorage.getItem("eljory_treasury_accounts")) || [];
    let accFilter  = document.getElementById("filterTxAccount") ? document.getElementById("filterTxAccount").value : "";
    let typeFilter = document.getElementById("filterTxType")    ? document.getElementById("filterTxType").value    : "all";
    let fromF = document.getElementById("filterTxFrom") ? document.getElementById("filterTxFrom").value : "";
    let toF   = document.getElementById("filterTxTo")   ? document.getElementById("filterTxTo").value   : "";

    let filtered = txs.filter(t => {
        if (accFilter && t.accountId !== accFilter) return false;
        if (typeFilter !== "all" && t.type !== typeFilter) return false;
        if (t.timestamp) {
            let dayStr = new Date(t.timestamp).toISOString().slice(0,10);
            if (fromF && dayStr < fromF) return false;
            if (toF   && dayStr > toF)   return false;
        }
        return true;
    });
    filtered.sort((a,b) => (b.timestamp||0) - (a.timestamp||0));

    let countEl = document.getElementById("filterTxCount");
    if (countEl) countEl.innerText = `💳 يظهر ${filtered.length} من أصل ${txs.length} حركة`;

    tbody.innerHTML = "";
    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:gray;padding:20px;">لا توجد حركات مطابقة.</td></tr>';
        let box0 = document.getElementById("treasuryTxPaginationBox");
        if (box0) box0.innerHTML = "";
        return;
    }
    let txPageSize  = window.genGetPageSize('treasuryTx', 20);
    let txPageItems = window.genSlicePage('treasuryTx', filtered, txPageSize);
    window.genRenderPagination('treasuryTx', filtered.length, txPageSize, 'renderTreasuryTransactions');

    txPageItems.forEach(t => {
        let acc = accounts.find(a => a.id === t.accountId);
        let isCredit = ['deposit','transfer_in','sale_revenue'].includes(t.type);
        let sign  = isCredit ? '+' : '-';
        let color = isCredit ? '#28a745' : '#d9534f';
        let relatedTxt = t.relatedOrderId ? `طلب: ${t.relatedOrderId}` : (t.relatedExpenseId ? `مصروف: ${t.relatedExpenseId}` : '—');
        tbody.innerHTML += `<tr>
            <td style="font-size:12.5px;">${t.date||'-'}</td>
            <td><strong>${acc?acc.name:t.accountId}</strong></td>
            <td>${window.treasuryTxTypeLabel(t.type)}</td>
            <td style="color:${color};font-weight:bold;">${sign}${t.amount} ج.م</td>
            <td style="font-size:13px;">${t.reason||'-'}</td>
            <td style="font-size:12px;color:gray;">${relatedTxt}</td>
            <td style="font-size:12px;">${t.by||'-'}</td>
        </tr>`;
    });
};

window.exportTreasuryTransactionsCSV = function() {
    let txs      = JSON.parse(localStorage.getItem("eljory_treasury_transactions")) || [];
    let accounts = JSON.parse(localStorage.getItem("eljory_treasury_accounts")) || [];
    if (!txs.length) return alert("لا توجد حركات لتصديرها");
    let esc = v => `"${String(v===undefined||v===null?'':v).replace(/"/g,'""')}"`;
    let csv = "التاريخ;الحساب;النوع;المبلغ;البيان;مرتبط بـ;بواسطة\r\n";
    [...txs].sort((a,b)=>(b.timestamp||0)-(a.timestamp||0)).forEach(t => {
        let acc = accounts.find(a => a.id === t.accountId);
        let related = t.relatedOrderId ? ('طلب:'+t.relatedOrderId) : (t.relatedExpenseId ? ('مصروف:'+t.relatedExpenseId) : '');
        csv += [esc(t.date), esc(acc?acc.name:t.accountId), esc(t.type), esc(t.amount), esc(t.reason), esc(related), esc(t.by)].join(";") + "\r\n";
    });
    let bom = new Uint8Array([0xEF,0xBB,0xBF]);
    let blob = new Blob([bom, csv], { type:'text/csv;charset=utf-8;' });
    let url = URL.createObjectURL(blob);
    let link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ElJory_TreasuryTx_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
};

// ── مودال اختيار حساب استلام قيمة الطلب عند تحويله لـ"تم التوصيل" ───────
window._pendingDeliveryOldStatus = null;

window.openDeliveryAccountModal = function(orderId, oldStatus) {
    document.getElementById("deliveryModalOrderId").value = orderId;
    window._pendingDeliveryOldStatus = oldStatus;
    window.populateTreasuryAccountSelects();
    document.getElementById("deliveryAccountModal").style.display = "flex";
};

window.closeDeliveryAccountModal = function() {
    document.getElementById("deliveryAccountModal").style.display = "none";
};

window.confirmDeliveryAccount = function() {
    let orderId   = document.getElementById("deliveryModalOrderId").value;
    let accountId = document.getElementById("deliveryModalAccount").value;
    if (!accountId) return alert("يرجى اختيار الحساب المستلم!");
    window.finalizeDeliverOrder(orderId, accountId, window._pendingDeliveryOldStatus);
    window.closeDeliveryAccountModal();
};

// ⭐ نظام الحسابات — خصومات الكوبونات: أي خصم اتطبق فعلياً على فاتورة عميل
// (كوبون نسبة/مبلغ ثابت/كوبون نقاط - بغض النظر عن شكله، ما عدا كود الشحن
// المجاني اللي مستثنى عمداً لأنه مالوش قيمة نقدية بتتخصم من حساب) بيتسجل
// تلقائياً هنا كـ"مصروف" في فئة "تسويق وإعلانات"، ويتخصم من *نفس الحساب*
// اللي استلمنا فيه قيمة الفاتورة (عشان صافي رصيد الحساب يفضل صحيح ومطابق
// للفلوس الحقيقية اللي دخلت فعلاً)، بدل ما نقلل الإيراد المسجل نفسه.
// بنستخدم معرّف مصروف ثابت (EXP_DISC_<orderId>) عشان لو الدالة اتنادت أكتر
// من مرة لنفس الطلب (مثلاً إعادة توصيل بعد إلغاء) منسجلش نفس الخصم مرتين.
window.recordDiscountExpense = function(order, orderId, accountId) {
    let discountVal = parseFloat(order.discount) || 0;
    if (discountVal <= 0 || !accountId) return Promise.resolve(null);

    let expId = 'EXP_DISC_' + orderId;

    return db.ref('/expenses/' + expId).once('value').then(function(snap) {
        if (snap.exists()) return null; // اتسجل قبل كده لنفس الطلب، منكررش

        let adminEmail = (firebase.auth().currentUser && firebase.auth().currentUser.email) || 'غير معروف';
        let discountExpense = {
            id: expId,
            title: `خصم كوبون على طلب رقم ${orderId}` + (order.promoCode ? ` (كود: ${order.promoCode})` : ''),
            category: 'marketing',
            date: new Date().toISOString().slice(0,10),
            total: discountVal,
            allocations: [{ accountId: accountId, amount: discountVal }],
            by: adminEmail,
            relatedOrderId: orderId,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        return db.ref('/expenses/' + expId).set(discountExpense).then(function() {
            return window.logTreasuryTransaction({
                accountId: accountId, type: 'expense', amount: discountVal,
                reason: `خصم كوبون - طلب رقم ${orderId}`,
                relatedOrderId: orderId, relatedExpenseId: expId
            });
        }).then(function() {
            return db.ref('/orders/' + orderId + '/discountExpenseId').set(expId);
        });
    });
};

// تنفيذ فعلي لتحويل الطلب لـ"تم التوصيل": تحديث حالة الطلب + احتساب الوضع
// المالي + إيداع قيمة الفاتورة في الحساب المختار + إضافة نقاط الولاء (نفس
// المنطق القديم في changeOrderStatus لكن بعد ما بقى عندنا حساب مختار).
window.finalizeDeliverOrder = function(orderId, accountId, oldStatus) {
    let orders = JSON.parse(localStorage.getItem("eljory_orders")) || [];
    let order  = orders.find(o => o.id === orderId);
    if (!order) return;

    let adminEmail = (firebase.auth().currentUser && firebase.auth().currentUser.email) || 'غير معروف';
    let historyEntry = { status:'Delivered', by: adminEmail, byType:'admin', date: new Date().toLocaleString('ar-EG') };
    let newHistory = (order.statusHistory || []).concat([historyEntry]);

    let orderUpdates = { status: 'Delivered', statusHistory: newHistory };
    if (!order.deliveredAt) orderUpdates.deliveredAt = Date.now();

    let products = JSON.parse(localStorage.getItem("eljory_products")) || [];
    let finance = window.computeOrderFinance(order, products);
    finance.depositAccountId = accountId;
    orderUpdates.financeSnapshot = finance;

    db.ref('/orders/' + orderId).update(orderUpdates).then(() => {
        // إيداع قيمة الفاتورة (بيع + شحن) في الحساب المختار — بيتم دايماً بغض
        // النظر هل احتسبنا الربح ولا لا (لأن الفلوس دخلت فعلاً في الحساب ده)
        return window.logTreasuryTransaction({
    accountId, type: 'sale_revenue', amount: order.total + (parseFloat(order.discount) || 0),
    reason: `إيراد بيع - طلب رقم ${order.id}`, relatedOrderId: order.id
});
    }).then(() => {
        // ⭐ لو الفاتورة فيها خصم كوبون، بيتسجل تلقائياً هنا كمصروف تسويقي
        // ويتخصم من نفس الحساب اللي استلمنا فيه إيراد البيع فوق مباشرة.
        return window.recordDiscountExpense(order, orderId, accountId);
    }).then(() => {
        let alertMsg = "تم التوصيل وتسجيل الإيداع في الخزنة بنجاح! ✅";
        if (parseFloat(order.discount) > 0) {
            alertMsg += `\nتم تسجيل خصم الكوبون (${order.discount} ج.م) تلقائياً كمصروف تسويقي وخصمه من نفس الحساب.`;
        }
        if (oldStatus !== "Delivered") {
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
                    if (order.items) order.items.forEach(item => {
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
                    alertMsg += `\nتمت إضافة (${pointsEarned}) نقطة لمحفظة العميل.`;
                }
            }
        }
        alert(alertMsg);
    });
};

// ── المصاريف (مع دعم السحب من أكتر من حساب في نفس المصروف) ──────────────
window.expAllocRowCount = 0;

window.expAddAllocationRow = function() {
    let box = document.getElementById("expAllocationsBox");
    if (!box) return;
    let rowId = 'expAlloc_' + (window.expAllocRowCount++);
    let row = document.createElement('div');
    row.id = rowId;
    row.style.cssText = "display:flex;gap:10px;align-items:center;background:white;padding:10px;border-radius:6px;border:1px solid #ddd;";
    row.innerHTML = `
        <select class="form-control expAllocAccountSelect" style="flex:2;"></select>
        <input type="number" class="form-control expAllocAmount" placeholder="المبلغ من هذا الحساب" style="flex:1;" oninput="expUpdateTotal()">
        <button type="button" class="btn btn-red" style="flex:0 0 auto;" onclick="document.getElementById('${rowId}').remove();expUpdateTotal();">✖</button>
    `;
    box.appendChild(row);
    window.populateTreasuryAccountSelects();
};

window.expUpdateTotal = function() {
    let total = 0;
    document.querySelectorAll('.expAllocAmount').forEach(inp => { total += parseFloat(inp.value) || 0; });
    let el = document.getElementById("expTotalPreview");
    if (el) el.innerText = total.toFixed(2);
    return total;
};

window.saveExpense = function() {
    let title    = document.getElementById("expTitle").value.trim();
    let category = document.getElementById("expCategory").value;
    let date     = document.getElementById("expDate").value || new Date().toISOString().slice(0,10);
    if (!title) return alert("يرجى كتابة وصف المصروف!");

    let allocations = [];
    document.querySelectorAll('#expAllocationsBox > div').forEach(row => {
        let accSel = row.querySelector('.expAllocAccountSelect');
        let amtInp = row.querySelector('.expAllocAmount');
        let accId  = accSel ? accSel.value : '';
        let amt    = amtInp ? (parseFloat(amtInp.value) || 0) : 0;
        if (accId && amt > 0) allocations.push({ accountId: accId, amount: amt });
    });

    if (!allocations.length) return alert("يرجى تحديد حساب واحد على الأقل ومبلغ صحيح للسحب منه!");

    let total = allocations.reduce((s,a) => s + a.amount, 0);
    let expId = 'EXP_' + Date.now();
    let adminEmail = (firebase.auth().currentUser && firebase.auth().currentUser.email) || 'غير معروف';
    let newExpense = { id: expId, title, category, date, total, allocations, by: adminEmail, timestamp: firebase.database.ServerValue.TIMESTAMP };

    db.ref('/expenses/' + expId).set(newExpense).then(() => {
        let ops = allocations.map(a => window.logTreasuryTransaction({
            accountId: a.accountId, type: 'expense', amount: a.amount,
            reason: `مصروف: ${title}`, relatedExpenseId: expId
        }));
        return Promise.all(ops);
    }).then(() => {
        alert("✅ تم حفظ المصروف وخصمه من الحسابات المحددة بنجاح!");
        document.getElementById("expTitle").value = "";
        document.getElementById("expAllocationsBox").innerHTML = "";
        expUpdateTotal();
        expAddAllocationRow();
    });
};

window.renderExpenses = function() {
    let tbody = document.getElementById("adminExpensesBody");
    if (!tbody) return;
    let expenses = JSON.parse(localStorage.getItem("eljory_expenses")) || [];
    let accounts = JSON.parse(localStorage.getItem("eljory_treasury_accounts")) || [];
    let catF  = document.getElementById("filterExpCategory") ? document.getElementById("filterExpCategory").value : "all";
    let fromF = document.getElementById("filterExpFrom") ? document.getElementById("filterExpFrom").value : "";
    let toF   = document.getElementById("filterExpTo")   ? document.getElementById("filterExpTo").value   : "";

    let catLabels = { rent:'إيجار', salaries:'رواتب', shipping:'شحن وتوصيل', marketing:'تسويق وإعلانات', utilities:'فواتير ومرافق', other:'أخرى' };

    let filtered = expenses.filter(e => {
        if (catF !== "all" && e.category !== catF) return false;
        if (fromF && e.date < fromF) return false;
        if (toF   && e.date > toF)   return false;
        return true;
    });
    filtered.sort((a,b) => (b.timestamp||0) - (a.timestamp||0));

    let countEl = document.getElementById("filterExpCount");
    if (countEl) countEl.innerText = `🧾 يظهر ${filtered.length} من أصل ${expenses.length} مصروف`;

    tbody.innerHTML = "";
    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:gray;padding:20px;">لا توجد مصاريف مطابقة.</td></tr>';
        return;
    }
    filtered.forEach(e => {
        let allocTxt = (e.allocations||[]).map(a => {
            let acc = accounts.find(x => x.id === a.accountId);
            return `${acc?acc.name:a.accountId}: ${a.amount} ج.م`;
        }).join('<br>');
        tbody.innerHTML += `<tr>
            <td>${e.date}</td>
            <td><strong>${e.title}</strong></td>
            <td>${catLabels[e.category]||e.category}</td>
            <td style="color:#d9534f;font-weight:bold;">${e.total} ج.م</td>
            <td style="font-size:12px;">${allocTxt}</td>
            <td><button class="btn btn-red" style="padding:4px 10px;" onclick="deleteExpense('${e.id}')">🗑️ حذف واسترجاع المبلغ</button></td>
        </tr>`;
    });
};

// حذف مصروف = استرجاع كل المبالغ المخصومة لكل حساب شاركت فيه + حذف السجل
window.deleteExpense = function(expId) {
    let expenses = JSON.parse(localStorage.getItem("eljory_expenses")) || [];
    let exp = expenses.find(e => e.id === expId);
    if (!exp) return;
    if (!confirm(`هل أنت متأكد من حذف مصروف "${exp.title}"؟ سيتم استرجاع (${exp.total} ج.م) لحساباتها الأصلية.`)) return;

    let ops = (exp.allocations || []).map(a => window.logTreasuryTransaction({
        accountId: a.accountId, type: 'deposit', amount: a.amount,
        reason: `استرجاع مصروف محذوف: ${exp.title}`, relatedExpenseId: expId
    }));
    Promise.all(ops).then(() => db.ref('/expenses/' + expId).remove()).then(() => {
        alert("✅ تم حذف المصروف واسترجاع المبلغ للحسابات.");
    });
};

window.exportExpensesCSV = function() {
    let expenses = JSON.parse(localStorage.getItem("eljory_expenses")) || [];
    let accounts = JSON.parse(localStorage.getItem("eljory_treasury_accounts")) || [];
    if (!expenses.length) return alert("لا توجد مصاريف لتصديرها");
    let esc = v => `"${String(v===undefined||v===null?'':v).replace(/"/g,'""')}"`;
    let csv = "التاريخ;الوصف;الفئة;الإجمالي;تفاصيل السحب\r\n";
    [...expenses].sort((a,b)=>(b.timestamp||0)-(a.timestamp||0)).forEach(e => {
        let allocTxt = (e.allocations||[]).map(a => {
            let acc = accounts.find(x => x.id === a.accountId);
            return `${acc?acc.name:a.accountId}:${a.amount}`;
        }).join(' | ');
        csv += [esc(e.date), esc(e.title), esc(e.category), esc(e.total), esc(allocTxt)].join(";") + "\r\n";
    });
    let bom = new Uint8Array([0xEF,0xBB,0xBF]);
    let blob = new Blob([bom, csv], { type:'text/csv;charset=utf-8;' });
    let url = URL.createObjectURL(blob);
    let link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ElJory_Expenses_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
};

// ── نظرة عامة ورأس المال ─────────────────────────────────────────────────
window.renderTreasuryOverview = function() {
    let grid     = document.getElementById("treasuryOverviewGrid");
    let accBox   = document.getElementById("treasuryOverviewAccounts");
    if (!grid) return;

    let accounts = JSON.parse(localStorage.getItem("eljory_treasury_accounts")) || [];
    let products = JSON.parse(localStorage.getItem("eljory_products")) || [];

    let totalTreasury = accounts.reduce((s,a) => s + (a.balance||0), 0);

    // قيمة المخزون بسعر التكلفة — بس للمنتجات اللي مكتوبلها تكلفة فعلاً
    let inventoryValue = 0;
    let inventoryProductsCount = 0;
    products.forEach(p => {
        if (p.costPrice !== undefined && p.costPrice !== null && !isNaN(parseFloat(p.costPrice))) {
            inventoryValue += (parseFloat(p.costPrice) * (parseInt(p.stock) || 0));
            inventoryProductsCount++;
        }
    });

    // ⭐ قيمة البضاعة "المحجوزة" في الطلبات اللي لسه ما اتسلمتش ولا اتلغتش
    // (Pending/Processing/Shipped): الكمية دي بتكون اتخصمت بالفعل من مخزون
    // المنتج (product.stock) وقت عمل الطلب، فمن غير الإضافة دي كانت بتختفي
    // من حساب رأس المال تماماً رغم إنها لسه بضاعة المتجر فعلياً (لسه معندناها
    // ولسه ما اتسلمتش للعميل ولا اتقبض ثمنها). بنجمعها هنا بنفس سعر التكلفة
    // الحالي لكل منتج عشان تفضل محسوبة ضمن رأس المال لحد ما الطلب يتسلم فعلاً
    // (وقتها تدخل كإيراد في الخزنة) أو يتلغي (وقتها ترجع لمخزون المنتج نفسه).
    let orders = JSON.parse(localStorage.getItem("eljory_orders")) || [];
    let reservedStockValue = 0;
    orders.forEach(o => {
        let st = o.status || "Pending";
        if (st === "Delivered" || st === "Cancelled") return;
        (o.items || []).forEach(it => {
            let p = products.find(x => x.id === it.id);
            if (p && p.costPrice !== undefined && p.costPrice !== null && !isNaN(parseFloat(p.costPrice))) {
                reservedStockValue += parseFloat(p.costPrice) * (parseInt(it.qty) || 0);
            }
        });
    });

    inventoryValue += 0; // (قيمة المخزون الفعلي تفضل لوحدها، من غير المحجوز)
    let capital = totalTreasury + inventoryValue + reservedStockValue;

    let cards = [
        { label: 'إجمالي رصيد الخزنة (كل الحسابات)', value: totalTreasury, color: '#1d364a' },
        { label: `قيمة المخزون بسعر التكلفة (${inventoryProductsCount} منتج له تكلفة)`, value: inventoryValue, color: '#17a2b8' },
        { label: 'قيمة البضاعة المحجوزة في طلبات لسه ما اتسلمتش', value: reservedStockValue, color: '#f38c18' },
        { label: 'رأس المال الإجمالي', value: capital, color: '#28a745' }
    ];
    grid.innerHTML = cards.map(c => `
        <div style="background:white;border-radius:10px;padding:22px;box-shadow:0 4px 10px rgba(0,0,0,0.06);border-top:4px solid ${c.color};">
            <div style="color:#666;font-size:13px;font-weight:bold;margin-bottom:8px;">${c.label}</div>
            <div style="color:${c.color};font-size:26px;font-weight:900;">${c.value.toFixed(2)} <span style="font-size:14px;">ج.م</span></div>
        </div>`).join('');

    if (accBox) {
        if (!accounts.length) {
            accBox.innerHTML = '<p style="color:gray;">لا توجد حسابات مضافة بعد.</p>';
        } else {
            accBox.innerHTML = accounts.map(a => `
                <div style="background:white;border:1px solid #ddd;border-radius:8px;padding:14px 18px;min-width:180px;">
                    <div style="font-weight:bold;color:#1d364a;">${a.name}</div>
                    <div style="font-size:12px;color:#888;margin-bottom:6px;">${window.treasuryAccountTypeLabel(a.type)}</div>
                    <div style="font-size:18px;font-weight:bold;color:${(a.balance||0)<0?'#d9534f':'#28a745'};">${(a.balance||0).toFixed(2)} ج.م</div>
                </div>`).join('');
        }
    }
};


// ================================================================
// ⑦.٧ سجل حركة المخزون + استلام دفعات بضاعة جديدة (Stock Movements)
// ================================================================
// المبدأ: أي فلوس بتتصرف فعلياً على شراء بضاعة، لازم تتسجل من هنا بس (مش من
// فورم "حفظ المنتج" العادي، اللي بيفضل للبيانات الوصفية وتصحيح المخزون يدوي
// من غير أي أثر مالي). كل عملية "استلام كمية" بتعمل 3 حاجات مع بعض في نفس
// الوقت: (1) تزود المخزون الحالي بالكمية المستلمة (مش تستبدله)، (2) تحدّث
// سعر التكلفة للمنتج حسب اختيار الأدمن (تكلفة جديدة بالكامل / متوسط مرجّح)
// وتسجل التغيير في سجل تغييرات الأسعار، (3) تخصم قيمة الدفعة فعلياً من حساب
// الخزنة المحدد بنوع حركة مخصص "stock_purchase" وتسجلها في سجل حركة المخزون.
//
// سجل حركة المخزون نفسه (/stockMovements) بيسجل نوعين من الحركات:
//  - "in"  : دخول بضاعة فعلي (استلام دفعة جديدة من هنا)، وكذلك رجوع مخزون
//            بسبب إلغاء طلب (بيترجع تلقائي زي ما كان بيحصل قبل كده، وبس
//            بقينا كمان نسجله كحركة "دخول" بسبب "إلغاء طلب").
//  - "out" : خروج بضاعة فعلي بسبب حجزها/بيعها في طلب جديد (يدوي أو من الموقع).
// ================================================================

window._pendingReceiveStock = null; // { productId, titleAr, oldStock, oldCost }

// تسجيل سطر واحد في سجل حركة المخزون
window.logStockMovement = function(entry) {
    // entry: { productId, titleAr, type: 'in'|'out', qty, unitCost(اختياري), reason, accountId(اختياري) }
    let adminEmail = (firebase.auth().currentUser && firebase.auth().currentUser.email) || 'غير معروف';
    let movement = {
        id: 'MOV_' + Date.now() + '_' + Math.random().toString(36).slice(2,7),
        productId: entry.productId,
        titleAr: entry.titleAr || entry.productId,
        type: entry.type,
        qty: entry.qty,
        unitCost: (entry.unitCost !== undefined && entry.unitCost !== null) ? entry.unitCost : null,
        reason: entry.reason || '',
        accountId: entry.accountId || null,
        by: adminEmail,
        date: new Date().toLocaleString('ar-EG'),
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    return db.ref('/stockMovements/' + movement.id).set(movement);
};

// ── فتح مودال "استلام كمية جديدة" لمنتج معين ──────────────────────────────
window.openReceiveStockModal = function(productId) {
    db.ref('/products/' + productId).once('value').then(function(snap) {
        let p = snap.val();
        if (!p) return alert('هذا المنتج غير موجود!');

        window._pendingReceiveStock = {
            productId: productId,
            titleAr: p.titleAr,
            oldStock: parseInt(p.stock) || 0,
            oldCost: (p.costPrice !== undefined && p.costPrice !== null) ? parseFloat(p.costPrice) : null
        };

        document.getElementById('rstProdName').innerText = p.titleAr + ' (' + p.id + ')';
        document.getElementById('rstCurrentStock').innerText = window._pendingReceiveStock.oldStock;
        document.getElementById('rstCurrentCost').innerText = (window._pendingReceiveStock.oldCost !== null)
            ? window._pendingReceiveStock.oldCost + ' ج.م'
            : 'لسه غير محدد';
        document.getElementById('rstQty').value = '';
        document.getElementById('rstUnitCost').value = (window._pendingReceiveStock.oldCost !== null) ? window._pendingReceiveStock.oldCost : '';

        // إعادة ضبط صناديق تخصيص الدفع على الحسابات (نبدأ بصف واحد فاضي في كل مرة)
        let allocBox = document.getElementById('rstAllocationsBox');
        if (allocBox) allocBox.innerHTML = '';
        window.rstUpdateTotal();
        window.rstAddAllocationRow();

        document.getElementById('receiveStockModal').style.display = 'flex';
    });
};

window.closeReceiveStockModal = function() {
    document.getElementById('receiveStockModal').style.display = 'none';
    window._pendingReceiveStock = null;
};

// ── إدارة صفوف تخصيص الدفع على أكتر من حساب (نفس فكرة صفوف المصاريف) ──────
window.rstAllocRowCount = 0;

window.rstAddAllocationRow = function() {
    let box = document.getElementById("rstAllocationsBox");
    if (!box) return;
    let rowId = 'rstAlloc_' + (window.rstAllocRowCount++);
    let row = document.createElement('div');
    row.id = rowId;
    row.style.cssText = "display:flex;gap:10px;align-items:center;background:#f9f9f9;padding:10px;border-radius:6px;border:1px solid #ddd;margin-bottom:10px;";
    row.innerHTML = `
        <select class="form-control rstAllocAccountSelect" style="flex:2;"></select>
        <input type="number" class="form-control rstAllocAmount" placeholder="المبلغ من هذا الحساب" style="flex:1;" oninput="rstUpdateTotal()">
        <button type="button" class="btn btn-red" style="flex:0 0 auto;" onclick="document.getElementById('${rowId}').remove();rstUpdateTotal();">✖</button>
    `;
    box.appendChild(row);
    window.populateTreasuryAccountSelects();
};

// يحسب إجمالي المبلغ المطلوب دفعه (كمية × سعر الوحدة) وإجمالي اللي اتوزع فعلاً
// على الحسابات، ويعرض الاتنين عشان الأدمن يتأكد إنهم متطابقين قبل التأكيد
window.rstUpdateTotal = function() {
    let qty      = parseInt(document.getElementById('rstQty') ? document.getElementById('rstQty').value : 0) || 0;
    let unitCost = parseFloat(document.getElementById('rstUnitCost') ? document.getElementById('rstUnitCost').value : 0) || 0;
    let required = qty * unitCost;

    let allocated = 0;
    document.querySelectorAll('.rstAllocAmount').forEach(inp => { allocated += parseFloat(inp.value) || 0; });

    let reqEl = document.getElementById("rstRequiredTotal");
    let allocEl = document.getElementById("rstAllocatedTotal");
    if (reqEl) reqEl.innerText = required.toFixed(2);
    if (allocEl) {
        allocEl.innerText = allocated.toFixed(2);
        allocEl.style.color = Math.abs(allocated - required) < 0.01 ? '#28a745' : '#d9534f';
    }
    return { required, allocated };
};

// ── الضغط على "تأكيد الاستلام" في المودال الأول ──────────────────────────
window.submitReceiveStock = function() {
    let pend = window._pendingReceiveStock;
    if (!pend) return;

    let qty      = parseInt(document.getElementById('rstQty').value);
    let unitCost = parseFloat(document.getElementById('rstUnitCost').value);

    if (!qty || qty <= 0) return alert('يرجى إدخال كمية صحيحة أكبر من صفر!');
    if (isNaN(unitCost) || unitCost < 0) return alert('يرجى إدخال سعر تكلفة صحيح للوحدة!');

    // تجميع تخصيصات الدفع من كل الصفوف (حساب + مبلغ) وتجاهل أي صف فاضي
    let allocations = [];
    document.querySelectorAll('#rstAllocationsBox > div').forEach(row => {
        let accSel = row.querySelector('.rstAllocAccountSelect');
        let amtInp = row.querySelector('.rstAllocAmount');
        let accId  = accSel ? accSel.value : '';
        let amt    = amtInp ? (parseFloat(amtInp.value) || 0) : 0;
        if (accId && amt > 0) allocations.push({ accountId: accId, amount: amt });
    });

    if (!allocations.length) return alert('يرجى تحديد حساب واحد على الأقل ومبلغ صحيح للدفع منه!');

    let batchTotalCost = qty * unitCost;
    let allocatedTotal = allocations.reduce((s,a) => s + a.amount, 0);
    if (Math.abs(allocatedTotal - batchTotalCost) > 0.01) {
        return alert(`إجمالي المبلغ الموزّع على الحسابات (${allocatedTotal.toFixed(2)} ج.م) لازم يساوي قيمة الدفعة كاملة (${batchTotalCost.toFixed(2)} ج.م)!\nيرجى تعديل المبالغ بحيث يتطابق المجموع.`);
    }

    pend.qty = qty;
    pend.unitCost = unitCost;
    pend.allocations = allocations;

    // لو التكلفة الجديدة مختلفة عن القديمة (وفيه تكلفة قديمة أصلاً)، لازم نسأل
    // الأدمن يحدد التكلفة النهائية للمنتج: التكلفة الجديدة بالكامل، أو متوسط مرجّح
    if (pend.oldCost !== null && Math.abs(pend.oldCost - unitCost) > 0.001) {
        let weightedAvg = ((pend.oldStock * pend.oldCost) + (qty * unitCost)) / (pend.oldStock + qty);
        document.getElementById('rstChoiceOldCost').innerText = pend.oldCost + ' ج.م';
        document.getElementById('rstChoiceNewCost').innerText = unitCost + ' ج.م';
        document.getElementById('rstChoiceAvgCost').innerText = weightedAvg.toFixed(2) + ' ج.م';
        window._pendingReceiveStockAvg = weightedAvg;
        document.getElementById('receiveStockModal').style.display = 'none';
        document.getElementById('stockCostChoiceModal').style.display = 'flex';
    } else {
        // مفيش اختلاف في التكلفة (أو أول تكلفة بيتحدد للمنتج) — نكمل مباشرة بنفس القيمة
        window.finalizeReceiveStock(unitCost);
    }
};

// ── اختيار "استخدم التكلفة الجديدة بالكامل" ──────────────────────────────
window.chooseNewCostForReceive = function() {
    let pend = window._pendingReceiveStock;
    if (!pend) return;
    document.getElementById('stockCostChoiceModal').style.display = 'none';
    window.finalizeReceiveStock(pend.unitCost);
};

// ── اختيار "استخدم المتوسط المرجّح" ──────────────────────────────────────
window.chooseAvgCostForReceive = function() {
    if (window._pendingReceiveStockAvg === undefined) return;
    document.getElementById('stockCostChoiceModal').style.display = 'none';
    window.finalizeReceiveStock(window._pendingReceiveStockAvg);
};

window.cancelStockCostChoice = function() {
    document.getElementById('stockCostChoiceModal').style.display = 'none';
    document.getElementById('receiveStockModal').style.display = 'flex';
};

// ── التنفيذ الفعلي: تحديث المخزون + التكلفة + سجل الأسعار + خصم الخزنة (على
// حساب واحد أو أكتر) + سجل الحركة ──
window.finalizeReceiveStock = function(finalCost) {
    let pend = window._pendingReceiveStock;
    if (!pend) return;

    let newStock = pend.oldStock + pend.qty;
    let batchTotalCost = pend.qty * pend.unitCost; // القيمة الفعلية اللي اتصرفت في الدفعة دي (بسعرها هي، مش بالمتوسط)
    let allocations = pend.allocations || [];

    db.ref('/products/' + pend.productId).update({
        stock: newStock,
        costPrice: finalCost
    }).then(function() {
        // تسجيل تغيير التكلفة في سجل تغييرات الأسعار (لو فعلاً اتغيرت)
        if (pend.oldCost === null || Math.abs((pend.oldCost||0) - finalCost) > 0.001) {
            window.logPriceHistoryEntry(pend.productId, pend.titleAr, 'cost', pend.oldCost, finalCost);
        }

        // خصم قيمة الدفعة من كل حساب في التخصيص (حركة خزنة مستقلة لكل حساب من نوع "شراء بضاعة")
        let ops = allocations.map(a => window.logTreasuryTransaction({
            accountId: a.accountId,
            type: 'stock_purchase',
            amount: a.amount,
            reason: `شراء بضاعة: ${pend.titleAr} (${pend.qty} قطعة × ${pend.unitCost} ج.م)`,
            relatedOrderId: null,
            relatedExpenseId: null
        }));
        return Promise.all(ops);
    }).then(function() {
        // تسجيل حركة "دخول" في سجل حركة المخزون — لو الدفع اتوزع على أكتر من
        // حساب، بنسجل البيان بأسماء الحسابات ومبلغ كل واحد بدل ما نربط الحركة
        // بحساب واحد بس (accountId بيتسجل بس لو حساب واحد للتوافق مع باقي الكود)
        let accountsList = JSON.parse(localStorage.getItem("eljory_treasury_accounts")) || [];
        let reason = 'استلام دفعة بضاعة جديدة';
        let singleAccountId = null;
        if (allocations.length === 1) {
            singleAccountId = allocations[0].accountId;
        } else if (allocations.length > 1) {
            let parts = allocations.map(a => {
                let acc = accountsList.find(x => x.id === a.accountId);
                return `${acc ? acc.name : a.accountId}: ${a.amount} ج.م`;
            });
            reason = 'استلام دفعة بضاعة جديدة (دفع من عدة حسابات: ' + parts.join('، ') + ')';
        }
        return window.logStockMovement({
            productId: pend.productId,
            titleAr: pend.titleAr,
            type: 'in',
            qty: pend.qty,
            unitCost: pend.unitCost,
            accountId: singleAccountId,
            reason: reason
        });
    }).then(function() {
        alert(`✅ تم استلام ${pend.qty} قطعة من "${pend.titleAr}" بنجاح!\nالمخزون الجديد: ${newStock}\nسعر التكلفة المعتمد: ${finalCost} ج.م\nتم خصم ${batchTotalCost} ج.م من الخزنة${allocations.length > 1 ? ' (موزّعة على ' + allocations.length + ' حسابات)' : ''}.`);
        window._pendingReceiveStock = null;
        window._pendingReceiveStockAvg = undefined;
        document.getElementById('receiveStockModal').style.display = 'none';
    }).catch(function(err) {
        console.error(err);
        alert('❌ حدث خطأ أثناء تسجيل عملية الاستلام، حاول مرة أخرى.');
    });
};

// ── عرض سجل حركة المخزون (دخول/خروج) مع فلاتر ────────────────────────────
window.renderStockMovements = function() {
    let tbody = document.getElementById('adminStockMovementsBody');
    if (!tbody) return;

    let movements = JSON.parse(localStorage.getItem('eljory_stock_movements')) || [];
    let searchF = document.getElementById('filterStockProduct') ? document.getElementById('filterStockProduct').value.trim().toLowerCase() : '';
    let typeF   = document.getElementById('filterStockType')    ? document.getElementById('filterStockType').value : 'all';
    let fromF   = document.getElementById('filterStockFrom')    ? document.getElementById('filterStockFrom').value : '';
    let toF     = document.getElementById('filterStockTo')      ? document.getElementById('filterStockTo').value   : '';

    let filtered = movements.filter(function(m) {
        let matchSearch = !searchF || (m.titleAr||'').toLowerCase().includes(searchF) || (m.productId||'').toLowerCase().includes(searchF);
        let matchType   = typeF === 'all' || m.type === typeF;
        let matchFrom = true, matchTo = true;
        if (m.timestamp) {
            let dayStr = new Date(m.timestamp).toISOString().slice(0,10);
            if (fromF) matchFrom = dayStr >= fromF;
            if (toF)   matchTo   = dayStr <= toF;
        }
        return matchSearch && matchType && matchFrom && matchTo;
    });

    filtered.sort(function(a,b) { return (b.timestamp||0) - (a.timestamp||0); });

    let countEl = document.getElementById('filterStockCount');
    if (countEl) countEl.innerText = `📦 يظهر ${filtered.length} من أصل ${movements.length} حركة`;

    let accounts = JSON.parse(localStorage.getItem('eljory_treasury_accounts')) || [];

    tbody.innerHTML = '';
    if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:gray;padding:20px;">لا توجد حركات مطابقة.</td></tr>';
        let box0 = document.getElementById("stockMovPaginationBox");
        if (box0) box0.innerHTML = "";
        return;
    }

    let smPageSize  = window.genGetPageSize('stockMov', 20);
    let smPageItems = window.genSlicePage('stockMov', filtered, smPageSize);
    window.genRenderPagination('stockMov', filtered.length, smPageSize, 'renderStockMovements');

    smPageItems.forEach(function(m) {
        let isIn = m.type === 'in';
        let typeBadge = isIn
            ? '<span style="background:#28a745;color:white;padding:3px 8px;border-radius:4px;font-size:12px;">⬇️ دخول</span>'
            : '<span style="background:#d9534f;color:white;padding:3px 8px;border-radius:4px;font-size:12px;">⬆️ خروج</span>';
        let costTxt = (m.unitCost !== null && m.unitCost !== undefined) ? (m.unitCost + ' ج.م') : '—';
        let totalTxt = (m.unitCost !== null && m.unitCost !== undefined) ? ((m.unitCost * m.qty).toFixed(2) + ' ج.م') : '—';
        let acc = accounts.find(a => a.id === m.accountId);
        let accTxt = acc ? acc.name : '—';
        tbody.innerHTML += `<tr>
            <td style="font-size:12.5px;">${m.date||'-'}</td>
            <td><strong>${m.titleAr}</strong><br><small style="color:gray;">${m.productId}</small></td>
            <td>${typeBadge}</td>
            <td style="font-weight:bold;">${m.qty}</td>
            <td>${costTxt}</td>
            <td>${totalTxt}</td>
            <td style="font-size:12px;">${m.reason||'-'}${accTxt!=='—' ? ('<br><small style="color:gray;">حساب: '+accTxt+'</small>') : ''}</td>
        </tr>`;
    });
};

window.exportStockMovementsCSV = function() {
    let movements = JSON.parse(localStorage.getItem('eljory_stock_movements')) || [];
    if (!movements.length) return alert('لا توجد حركات لتصديرها');
    let accounts = JSON.parse(localStorage.getItem('eljory_treasury_accounts')) || [];
    let esc = v => `"${String(v===undefined||v===null?'':v).replace(/"/g,'""')}"`;
    let csv = "التاريخ;كود المنتج;اسم المنتج;النوع;الكمية;تكلفة الوحدة;الإجمالي;الحساب;البيان;بواسطة\r\n";
    [...movements].sort((a,b)=>(b.timestamp||0)-(a.timestamp||0)).forEach(function(m) {
        let acc = accounts.find(a => a.id === m.accountId);
        let total = (m.unitCost !== null && m.unitCost !== undefined) ? (m.unitCost * m.qty) : '';
        csv += [
            esc(m.date), esc(m.productId), esc(m.titleAr),
            esc(m.type === 'in' ? 'دخول' : 'خروج'),
            esc(m.qty), esc(m.unitCost), esc(total),
            esc(acc ? acc.name : ''), esc(m.reason), esc(m.by)
        ].join(';') + '\r\n';
    });
    let bom  = new Uint8Array([0xEF,0xBB,0xBF]);
    let blob = new Blob([bom, csv], { type:'text/csv;charset=utf-8;' });
    let url  = URL.createObjectURL(blob);
    let link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ElJory_StockMovements_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
};


// ================================================================
