// ================================================================
// js/admin-reports.js
// التقارير المالية (ملخص، خزنة، مصاريف، أفضل منتجات) + تصدير تقرير كامل.
// ملحوظة: كل الدوال هنا لسه بتتسجل على window (زي الأول تمامًا) — الفصل ده
// تنظيمي بس، ومحتاج كل الملفات تتحمّل مع بعض في admin.html بالترتيب المحدد
// (utils الأول، dashboard آخر واحد).
// ================================================================

// ⑱ التقارير المالية (Reports) — المرحلة 4
// ================================================================
// كل الحسابات هنا بتُقرأ من الكاش المحلي (localStorage) اللي بيتزامن أوتوماتيك
// من Firebase بالفعل (نفس المصادر المستخدمة في باقي اللوحة). مفيش أي كتابة جديدة
// هنا، التاب ده للعرض والتحليل بس.

window._reportsInited  = false;
window._repTopMode     = 'qty'; // 'qty' أو 'profit'
window._repChartInstances = {}; // نحتفظ بمرجع كل شارت عشان نقدر نـ destroy قبل إعادة الرسم

function repDestroyChart(id) {
    if (window._repChartInstances[id]) {
        try { window._repChartInstances[id].destroy(); } catch(e) {}
        delete window._repChartInstances[id];
    }
}

function repFmt(n) {
    return (Math.round((n||0) * 100) / 100).toLocaleString('en-US');
}

// ── تهيئة أول مرة: تواريخ افتراضية (آخر 30 يوم) ──────────────────────────
window.initReportsTab = function() {
    if (!window._reportsInited) {
        let toEl = document.getElementById("repFrom") ? null : null;
        repSetQuickRange(30);
        window._reportsInited = true;
    } else {
        renderReportsAll();
    }
};

window.repSetQuickRange = function(days) {
    let to = new Date();
    let from = new Date();
    from.setDate(from.getDate() - (days - 1));
    let fmt = d => d.toISOString().slice(0,10);
    let fromEl = document.getElementById("repFrom");
    let toEl   = document.getElementById("repTo");
    if (fromEl) fromEl.value = fmt(from);
    if (toEl)   toEl.value   = fmt(to);
    renderReportsAll();
};

window.repSetTopMode = function(mode) {
    window._repTopMode = mode;
    let btnQty = document.getElementById("repTopModeQty");
    let btnProfit = document.getElementById("repTopModeProfit");
    if (btnQty)    { btnQty.style.background = mode==='qty' ? '#1d364a' : '#eef2f5'; btnQty.style.color = mode==='qty' ? 'white' : '#1d364a'; }
    if (btnProfit) { btnProfit.style.background = mode==='profit' ? '#1d364a' : '#eef2f5'; btnProfit.style.color = mode==='profit' ? 'white' : '#1d364a'; }
    renderReportsTopProducts();
};

// ── أدوات مساعدة للفلترة بالتاريخ ─────────────────────────────────────────
function repGetRange() {
    let fromEl = document.getElementById("repFrom");
    let toEl   = document.getElementById("repTo");
    let fromStr = fromEl ? fromEl.value : "";
    let toStr   = toEl   ? toEl.value   : "";
    let fromTs = fromStr ? new Date(fromStr + "T00:00:00").getTime() : null;
    let toTs   = toStr   ? new Date(toStr   + "T23:59:59").getTime() : null;
    return { fromStr, toStr, fromTs, toTs };
}

// طلبات محسوبة ماليًا فعليًا (تم التوصيل + عندها costPrice لكل عناصرها) وغير ملغاة، ضمن الفترة
function repGetComputedOrders(range) {
    let orders = JSON.parse(localStorage.getItem("eljory_orders")) || [];
    return orders.filter(o => {
        let fs = o.financeSnapshot;
        if (!fs || !fs.computed || fs.reversed) return false;
        let ts = fs.computedAt || o.timestamp;
        if (!ts) return false;
        if (range.fromTs && ts < range.fromTs) return false;
        if (range.toTs   && ts > range.toTs)   return false;
        return true;
    });
}

function repGetExpenses(range) {
    let expenses = JSON.parse(localStorage.getItem("eljory_expenses")) || [];
    return expenses.filter(e => {
        if (!e.date) return false;
        if (range.fromStr && e.date < range.fromStr) return false;
        if (range.toStr   && e.date > range.toStr)   return false;
        return true;
    });
}

function repGetTreasuryTx(range) {
    let txs = JSON.parse(localStorage.getItem("eljory_treasury_transactions")) || [];
    return txs.filter(t => {
        if (!t.timestamp) return false;
        if (range.fromTs && t.timestamp < range.fromTs) return false;
        if (range.toTs   && t.timestamp > range.toTs)   return false;
        return true;
    });
}

// ── الدالة الرئيسية: بترندر كل الأقسام الأربعة مع بعض ────────────────────
window.renderReportsAll = function() {
    if (!document.getElementById("acc-reports")) return;
    let range = repGetRange();
    renderReportsSummary(range);
    renderReportsTreasury(range);
    renderReportsExpenses(range);
    renderReportsTopProducts();
};

// ════════════════════════════════════════════════════════════════
// ① الملخص المالي العام
// ════════════════════════════════════════════════════════════════
function renderReportsSummary(range) {
    range = range || repGetRange();
    let orders   = repGetComputedOrders(range);
    let expenses = repGetExpenses(range);

    let totalRevenue = 0, totalCost = 0, totalShipping = 0;
    orders.forEach(o => {
        totalRevenue += (o.financeSnapshot.revenue || 0);
        totalCost    += (o.financeSnapshot.cost || 0);
        totalShipping+= (o.financeSnapshot.shippingFee || 0);
    });
    let productProfit = totalRevenue - totalCost;
    let totalExpenses = expenses.reduce((s,e) => s + (e.total||0), 0);
    let netProfit = productProfit - totalExpenses;

    let cardsBox = document.getElementById("repSummaryCards");
    if (cardsBox) {
        let cards = [
            { label: 'إجمالي المبيعات', value: totalRevenue, color: '#1d364a' },
            { label: 'إجمالي التكلفة',  value: totalCost,    color: '#795548' },
            { label: 'ربح المنتجات (قبل المصاريف)', value: productProfit, color: '#17a2b8' },
            { label: 'إجمالي المصاريف', value: totalExpenses, color: '#d9534f' },
            { label: 'صافي الربح النهائي', value: netProfit, color: netProfit >= 0 ? '#28a745' : '#d9534f' },
            { label: 'عدد الطلبات المحسوبة', value: orders.length, color: '#f38c18', isCount: true }
        ];
        cardsBox.innerHTML = cards.map(c => `
            <div style="background:white;border-radius:10px;padding:18px;box-shadow:0 4px 10px rgba(0,0,0,0.06);border-top:4px solid ${c.color};">
                <div style="color:#666;font-size:12.5px;font-weight:bold;margin-bottom:8px;">${c.label}</div>
                <div style="color:${c.color};font-size:23px;font-weight:900;">${repFmt(c.value)}${c.isCount?'':' <span style="font-size:12px;">ج.م</span>'}</div>
            </div>`).join('');
    }

    // تجميع للرسم البياني: يومي لو الفترة <= 45 يوم، شهري لو أطول
    let groupByMonth = false;
    if (range.fromTs && range.toTs) {
        let days = (range.toTs - range.fromTs) / (24*60*60*1000);
        groupByMonth = days > 45;
    }
    let buckets = {}; // key -> {revenue, cost, profit}
    orders.forEach(o => {
        let ts = o.financeSnapshot.computedAt || o.timestamp;
        let d = new Date(ts);
        let key = groupByMonth
            ? (d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'))
            : d.toISOString().slice(0,10);
        if (!buckets[key]) buckets[key] = { revenue:0, cost:0 };
        buckets[key].revenue += (o.financeSnapshot.revenue || 0);
        buckets[key].cost    += (o.financeSnapshot.cost || 0);
    });
    let sortedKeys = Object.keys(buckets).sort();
    let labels  = sortedKeys;
    let revData = sortedKeys.map(k => buckets[k].revenue);
    let costData= sortedKeys.map(k => buckets[k].cost);
    let profData= sortedKeys.map(k => buckets[k].revenue - buckets[k].cost);

    let canvas = document.getElementById("repRevenueChart");
    if (canvas && typeof Chart !== 'undefined') {
        repDestroyChart('repRevenueChart');
        window._repChartInstances['repRevenueChart'] = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels.length ? labels : ['لا توجد بيانات'],
                datasets: [
                    { label: 'المبيعات', data: revData, borderColor:'#1d364a', backgroundColor:'rgba(29,54,74,.1)', tension:.3, fill:true },
                    { label: 'التكلفة',  data: costData, borderColor:'#795548', backgroundColor:'rgba(121,85,72,.1)', tension:.3, fill:true },
                    { label: 'الربح',    data: profData, borderColor:'#28a745', backgroundColor:'rgba(40,167,69,.1)', tension:.3, fill:true }
                ]
            },
            options: {
                responsive:true,
                plugins:{ legend:{ position:'top', rtl:true } },
                scales:{ y:{ beginAtZero:true } }
            }
        });
    }
}

// ════════════════════════════════════════════════════════════════
// ② حركة الخزنة
// ════════════════════════════════════════════════════════════════
function renderReportsTreasury(range) {
    range = range || repGetRange();
    let txs = repGetTreasuryTx(range);
    let accounts = JSON.parse(localStorage.getItem("eljory_treasury_accounts")) || [];

    let perAcc = {}; // accountId -> {in, out}
    txs.forEach(t => {
        let isCredit = ['deposit','transfer_in','sale_revenue'].includes(t.type);
        if (!perAcc[t.accountId]) perAcc[t.accountId] = { in:0, out:0 };
        if (isCredit) perAcc[t.accountId].in += t.amount; else perAcc[t.accountId].out += t.amount;
    });

    let accIds = Object.keys(perAcc);
    let tbody = document.getElementById("repTreasuryTableBody");
    if (tbody) {
        if (!accIds.length) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:gray;padding:20px;">لا توجد حركات في هذه الفترة.</td></tr>';
            let box0 = document.getElementById("repTreasuryPaginationBox");
            if (box0) box0.innerHTML = "";
        } else {
            let repTreasPageSize  = window.genGetPageSize('repTreasury', 20);
            let repTreasPageItems = window.genSlicePage('repTreasury', accIds, repTreasPageSize);
            window.genRenderPagination('repTreasury', accIds.length, repTreasPageSize, 'renderReportsTreasury');
            tbody.innerHTML = repTreasPageItems.map(id => {
                let acc = accounts.find(a => a.id === id);
                let name = acc ? acc.name : id;
                let net = perAcc[id].in - perAcc[id].out;
                let netColor = net >= 0 ? '#28a745' : '#d9534f';
                return `<tr>
                    <td><strong>${name}</strong></td>
                    <td style="color:#28a745;font-weight:bold;">+${repFmt(perAcc[id].in)} ج.م</td>
                    <td style="color:#d9534f;font-weight:bold;">-${repFmt(perAcc[id].out)} ج.م</td>
                    <td style="color:${netColor};font-weight:bold;">${net>=0?'+':''}${repFmt(net)} ج.م</td>
                </tr>`;
            }).join('');
        }
    }

    let canvas = document.getElementById("repTreasuryChart");
    if (canvas && typeof Chart !== 'undefined') {
        repDestroyChart('repTreasuryChart');
        let labels = accIds.map(id => { let a = accounts.find(x=>x.id===id); return a ? a.name : id; });
        window._repChartInstances['repTreasuryChart'] = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels.length ? labels : ['لا توجد بيانات'],
                datasets: [
                    { label: 'داخل ⬇️', data: accIds.map(id => perAcc[id].in),  backgroundColor:'#28a745' },
                    { label: 'خارج ⬆️', data: accIds.map(id => perAcc[id].out), backgroundColor:'#d9534f' }
                ]
            },
            options: { responsive:true, plugins:{ legend:{ position:'top', rtl:true } }, scales:{ y:{ beginAtZero:true } } }
        });
    }
}

// ════════════════════════════════════════════════════════════════
// ③ المصاريف حسب الفئة
// ════════════════════════════════════════════════════════════════
function renderReportsExpenses(range) {
    range = range || repGetRange();
    let expenses = repGetExpenses(range);
    let catLabels = { rent:'إيجار', salaries:'رواتب', shipping:'شحن وتوصيل', marketing:'تسويق وإعلانات', utilities:'فواتير ومرافق', other:'أخرى' };

    let perCat = {};
    let total = 0;
    expenses.forEach(e => {
        let cat = e.category || 'other';
        perCat[cat] = (perCat[cat] || 0) + (e.total || 0);
        total += (e.total || 0);
    });

    let catKeys = Object.keys(perCat);
    let tbody = document.getElementById("repExpensesTableBody");
    if (tbody) {
        if (!catKeys.length) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:gray;padding:20px;">لا توجد مصاريف في هذه الفترة.</td></tr>';
        } else {
            tbody.innerHTML = catKeys.sort((a,b)=>perCat[b]-perCat[a]).map(cat => {
                let pct = total > 0 ? ((perCat[cat]/total)*100).toFixed(1) : 0;
                return `<tr>
                    <td><strong>${catLabels[cat]||cat}</strong></td>
                    <td style="color:#d9534f;font-weight:bold;">${repFmt(perCat[cat])} ج.م</td>
                    <td>${pct}%</td>
                </tr>`;
            }).join('') + `<tr style="background:#f4f6f9;font-weight:bold;"><td>الإجمالي</td><td style="color:#d9534f;">${repFmt(total)} ج.م</td><td>100%</td></tr>`;
        }
    }

    let canvas = document.getElementById("repExpensesChart");
    if (canvas && typeof Chart !== 'undefined') {
        repDestroyChart('repExpensesChart');
        let palette = ['#1d364a','#f38c18','#28a745','#d9534f','#17a2b8','#8a2be2','#795548','#6c757d'];
        window._repChartInstances['repExpensesChart'] = new Chart(canvas.getContext('2d'), {
            type: 'pie',
            data: {
                labels: catKeys.length ? catKeys.map(c => catLabels[c]||c) : ['لا توجد بيانات'],
                datasets: [{ data: catKeys.length ? catKeys.map(c => perCat[c]) : [1], backgroundColor: palette }]
            },
            options: { responsive:true, plugins:{ legend:{ position:'bottom', rtl:true } } }
        });
    }
}

// ════════════════════════════════════════════════════════════════
// ④ أفضل المنتجات مبيعًا وربحًا
// ════════════════════════════════════════════════════════════════
function renderReportsTopProducts() {
    let range = repGetRange();
    let orders = repGetComputedOrders(range);
    let products = JSON.parse(localStorage.getItem("eljory_products")) || [];

    let perProd = {}; // id -> {qty, revenue, cost}
    orders.forEach(o => {
        (o.financeSnapshot.items || []).forEach(it => {
            if (!perProd[it.id]) perProd[it.id] = { qty:0, revenue:0, cost:0 };
            perProd[it.id].qty     += (it.qty || 0);
            perProd[it.id].revenue += (it.lineRevenue || 0);
            perProd[it.id].cost    += (it.lineCost || 0);
        });
    });

    let rows = Object.keys(perProd).map(id => {
        let p = products.find(x => x.id === id);
        return {
            id, name: p ? p.titleAr : id,
            qty: perProd[id].qty,
            revenue: perProd[id].revenue,
            cost: perProd[id].cost,
            profit: perProd[id].revenue - perProd[id].cost
        };
    });

    let mode = window._repTopMode || 'qty';
    rows.sort((a,b) => mode === 'qty' ? (b.qty - a.qty) : (b.profit - a.profit));
    let top10 = rows.slice(0, 10);

    let tbody = document.getElementById("repTopProductsTableBody");
    if (tbody) {
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:gray;padding:20px;">لا توجد مبيعات محسوبة في هذه الفترة.</td></tr>';
            let box0 = document.getElementById("repTopProductsPaginationBox");
            if (box0) box0.innerHTML = "";
        } else {
            let repProdPageSize  = window.genGetPageSize('repTopProducts', 20);
            let repProdPageItems = window.genSlicePage('repTopProducts', rows, repProdPageSize);
            window.genRenderPagination('repTopProducts', rows.length, repProdPageSize, 'renderReportsTopProducts');
            tbody.innerHTML = repProdPageItems.map(r => `<tr>
                <td><strong>${r.name}</strong><br><small style="color:gray;">${r.id}</small></td>
                <td>${r.qty}</td>
                <td>${repFmt(r.revenue)} ج.م</td>
                <td>${repFmt(r.cost)} ج.م</td>
                <td style="color:${r.profit>=0?'#28a745':'#d9534f'};font-weight:bold;">${repFmt(r.profit)} ج.م</td>
            </tr>`).join('');
        }
    }

    let canvas = document.getElementById("repTopProductsChart");
    if (canvas && typeof Chart !== 'undefined') {
        repDestroyChart('repTopProductsChart');
        let labels = top10.length ? top10.map(r => r.name) : ['لا توجد بيانات'];
        let data   = top10.length ? top10.map(r => mode === 'qty' ? r.qty : r.profit) : [0];
        window._repChartInstances['repTopProductsChart'] = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: mode === 'qty' ? 'الكمية المباعة' : 'الربح (ج.م)',
                    data,
                    backgroundColor: '#f38c18'
                }]
            },
            options: {
                indexAxis: 'y',
                responsive:true,
                plugins:{ legend:{ display:false } },
                scales:{ x:{ beginAtZero:true } }
            }
        });
    }
}

// ── تصدير التقرير الكامل لملف Excel واحد (كل الأقسام تحت بعض) ────────────
window.exportFullReportCSV = function() {
    let range = repGetRange();
    let orders   = repGetComputedOrders(range);
    let expenses = repGetExpenses(range);
    let txs      = repGetTreasuryTx(range);
    let accounts = JSON.parse(localStorage.getItem("eljory_treasury_accounts")) || [];
    let products = JSON.parse(localStorage.getItem("eljory_products")) || [];
    let catLabels = { rent:'إيجار', salaries:'رواتب', shipping:'شحن وتوصيل', marketing:'تسويق وإعلانات', utilities:'فواتير ومرافق', other:'أخرى' };
    let esc = v => `"${String(v===undefined||v===null?'':v).replace(/"/g,'""')}"`;

    let totalRevenue = 0, totalCost = 0;
    orders.forEach(o => { totalRevenue += (o.financeSnapshot.revenue||0); totalCost += (o.financeSnapshot.cost||0); });
    let totalExpenses = expenses.reduce((s,e) => s + (e.total||0), 0);
    let netProfit = (totalRevenue - totalCost) - totalExpenses;

    let csv = `تقرير الجوري ستور المالي;من ${range.fromStr||'-'} إلى ${range.toStr||'-'}\r\n\r\n`;

    csv += "=== الملخص المالي العام ===\r\n";
    csv += `إجمالي المبيعات;${totalRevenue}\r\n`;
    csv += `إجمالي التكلفة;${totalCost}\r\n`;
    csv += `ربح المنتجات;${totalRevenue-totalCost}\r\n`;
    csv += `إجمالي المصاريف;${totalExpenses}\r\n`;
    csv += `صافي الربح النهائي;${netProfit}\r\n\r\n`;

    csv += "=== حركة الخزنة لكل حساب ===\r\n";
    csv += "الحساب;داخل;خارج;صافي\r\n";
    let perAcc = {};
    txs.forEach(t => {
        let isCredit = ['deposit','transfer_in','sale_revenue'].includes(t.type);
        if (!perAcc[t.accountId]) perAcc[t.accountId] = { in:0, out:0 };
        if (isCredit) perAcc[t.accountId].in += t.amount; else perAcc[t.accountId].out += t.amount;
    });
    Object.keys(perAcc).forEach(id => {
        let acc = accounts.find(a=>a.id===id);
        csv += [esc(acc?acc.name:id), perAcc[id].in, perAcc[id].out, perAcc[id].in-perAcc[id].out].join(";") + "\r\n";
    });

    csv += "\r\n=== المصاريف حسب الفئة ===\r\n";
    csv += "الفئة;الإجمالي\r\n";
    let perCat = {};
    expenses.forEach(e => { let c=e.category||'other'; perCat[c]=(perCat[c]||0)+(e.total||0); });
    Object.keys(perCat).forEach(c => { csv += [esc(catLabels[c]||c), perCat[c]].join(";") + "\r\n"; });

    csv += "\r\n=== أفضل المنتجات ===\r\n";
    csv += "المنتج;الكمية;الإيراد;التكلفة;الربح\r\n";
    let perProd = {};
    orders.forEach(o => {
        (o.financeSnapshot.items||[]).forEach(it => {
            if (!perProd[it.id]) perProd[it.id] = { qty:0, revenue:0, cost:0 };
            perProd[it.id].qty += (it.qty||0);
            perProd[it.id].revenue += (it.lineRevenue||0);
            perProd[it.id].cost += (it.lineCost||0);
        });
    });
    Object.keys(perProd).sort((a,b)=>perProd[b].qty-perProd[a].qty).forEach(id => {
        let p = products.find(x=>x.id===id);
        let r = perProd[id];
        csv += [esc(p?p.titleAr:id), r.qty, r.revenue, r.cost, (r.revenue-r.cost)].join(";") + "\r\n";
    });

    let bom  = new Uint8Array([0xEF,0xBB,0xBF]);
    let blob = new Blob([bom, csv], { type:'text/csv;charset=utf-8;' });
    let url  = URL.createObjectURL(blob);
    let link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ElJory_FullReport_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
};
