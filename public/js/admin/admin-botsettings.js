// ================================================================
// js/admin-bot.js
// إعدادات بوت الواتساب: تعليمات عامة (System Prompt) + تفعيل/تعطيل الرد الآلي
// + مدة الإيقاف المؤقت عند الرد اليدوي.
// البوت (index.js) بيقرا المسار /botSettings مباشرة من نفس قاعدة البيانات دي،
// ولا يسحب أي بيانات تانية (منتجات/عروض/مناطق) من أي مكان تلقائيًا —
// كل تعليماته بتيجي حصريًا من نص الـ System Prompt المكتوب هنا.
// ================================================================

// تحميل الإعدادات الحالية أول ما التاب يتفتح أو الصفحة تحمّل
db.ref('/botSettings').on('value', snap => {
    let settings = snap.val() || {};
    let promptBox = document.getElementById("botSystemPrompt");
    let toggle    = document.getElementById("botIsActiveToggle");
    let label     = document.getElementById("botIsActiveLabel");
    let pauseBox  = document.getElementById("botPauseMinutes");
    let ownerBox  = document.getElementById("botOwnerNumber");
    let whToggle  = document.getElementById("botWorkHoursEnabled");
    let whStart   = document.getElementById("botWorkHoursStart");
    let whEnd     = document.getElementById("botWorkHoursEnd");
    let offMsgBox = document.getElementById("botOffHoursMessage");
    let rateBox   = document.getElementById("botRateLimitPerMinute");
    let fuToggle  = document.getElementById("botFollowUpEnabled");
    let fuHours   = document.getElementById("botFollowUpHours");
    let fuMsgBox  = document.getElementById("botFollowUpMessage");

    if (promptBox && document.activeElement !== promptBox) {
        promptBox.value = settings.systemPrompt || "";
    }
    if (toggle) {
        let isActive = settings.isActive !== false; // افتراضيًا مفعّل لو مفيش قيمة محفوظة
        toggle.checked = isActive;
        if (label) label.textContent = isActive ? "مفعّل" : "متوقف";
    }
    if (pauseBox && document.activeElement !== pauseBox) {
        pauseBox.value = settings.pauseMinutes !== undefined ? settings.pauseMinutes : 30;
    }
    if (ownerBox && document.activeElement !== ownerBox) {
        ownerBox.value = settings.ownerNumber || "";
    }
    if (whToggle) whToggle.checked = settings.workHoursEnabled === true;
    if (whStart && document.activeElement !== whStart) whStart.value = settings.workHoursStart || "10:00";
    if (whEnd && document.activeElement !== whEnd) whEnd.value = settings.workHoursEnd || "22:00";
    if (offMsgBox && document.activeElement !== offMsgBox) {
        offMsgBox.value = settings.offHoursMessage || 'شكراً لتواصلك معنا! فريقنا هيكون متاح للرد عليك في أقرب وقت خلال مواعيد الشغل 🙏';
    }
    if (rateBox && document.activeElement !== rateBox) {
        rateBox.value = settings.rateLimitPerMinute !== undefined ? settings.rateLimitPerMinute : 5;
    }
    if (fuToggle) fuToggle.checked = settings.followUpEnabled === true;
    if (fuHours && document.activeElement !== fuHours) fuHours.value = settings.followUpHours !== undefined ? String(settings.followUpHours) : "8";
    if (fuMsgBox && document.activeElement !== fuMsgBox) {
        fuMsgBox.value = settings.followUpMessage || 'تمام حضرتك، لسه محتاج أي تفاصيل تانية؟ 😊';
    }
});

window.saveBotSystemPrompt = function() {
    let promptBox = document.getElementById("botSystemPrompt");
    let statusEl  = document.getElementById("botSaveStatus");
    if (!promptBox) return;

    db.ref('/botSettings/systemPrompt').set(promptBox.value.trim()).then(() => {
        if (statusEl) {
            statusEl.textContent = "✅ تم الحفظ";
            setTimeout(() => { statusEl.textContent = ""; }, 3000);
        }
    }).catch(err => {
        alert("حصل خطأ أثناء الحفظ: " + err.message);
    });
};

window.saveBotIsActive = function() {
    let toggle = document.getElementById("botIsActiveToggle");
    if (!toggle) return;
    db.ref('/botSettings/isActive').set(toggle.checked).catch(err => {
        alert("حصل خطأ أثناء الحفظ: " + err.message);
    });
    // يفتح شاشة اللوج المباشر تلقائيًا لحظة ما تتغيّر حالة التفعيل
    window.openBotLiveLog();
};

// ================================================================
// اللوج المباشر للبوت (Live Log)
// البوت (index.js) بيكتب كل سطر console.log/console.error بتاعه في
// /liveLogs في نفس قاعدة البيانات. إحنا هنا بس بنستمع (on child_added)
// ونعرض السطور أول ما توصل، زي شاشة تيرمنال حية. البوت نفسه بينظّف
// أي سطر عمره أكتر من 24 ساعة تلقائيًا كل ساعة.
// ================================================================
const LIVE_LOG_DISPLAY_LIMIT = 300;
let _liveLogRef = null;
let _liveLogListenerAttached = false;

function _appendLiveLogLine(entry) {
    let body = document.getElementById("botLiveLogBody");
    if (!body || !entry) return;

    let time = entry.time
        ? new Date(entry.time).toLocaleTimeString('ar-EG', { timeZone: 'Africa/Cairo', hour12: false })
        : "";
    let isError = entry.level === 'error';

    let line = document.createElement("div");
    line.style.color = isError ? '#ff7b72' : '#7ee787';
    line.style.marginBottom = '2px';
    line.textContent = `[${time}] ${entry.text || ""}`;
    body.appendChild(line);

    // اسكرول تلقائي لتحت، إلا لو المستخدم مركّز شايف سطور فوق قصدًا
    let nearBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 100;
    if (nearBottom) body.scrollTop = body.scrollHeight;
}

window.openBotLiveLog = function() {
    let modal = document.getElementById("botLiveLogModal");
    let body  = document.getElementById("botLiveLogBody");
    if (!modal || !body) return;

    modal.style.display = "flex";

    if (_liveLogListenerAttached) return; // الاستماع شغال بالفعل من فتحة سابقة

    body.innerHTML = "";
    _liveLogRef = db.ref('/liveLogs').limitToLast(LIVE_LOG_DISPLAY_LIMIT);
    _liveLogListenerAttached = true;
    _liveLogRef.on('child_added', snap => _appendLiveLogLine(snap.val()));
};

window.closeBotLiveLog = function() {
    let modal = document.getElementById("botLiveLogModal");
    if (modal) modal.style.display = "none";
    if (_liveLogRef) {
        _liveLogRef.off('child_added');
        _liveLogRef = null;
    }
    _liveLogListenerAttached = false;
};

// مدة الإيقاف المؤقت (بالدقايق) لما الأدمن يرد يدويًا على عميل من موبايله —
// البوت بيوقف نفسه مع العميل ده بس للمدة دي، وبعدها يرجع يشتغل تلقائي تاني.
window.saveBotPauseMinutes = function() {
    let pauseBox = document.getElementById("botPauseMinutes");
    if (!pauseBox) return;
    let minutes = parseInt(pauseBox.value, 10);
    if (isNaN(minutes) || minutes < 0) minutes = 30;
    db.ref('/botSettings/pauseMinutes').set(minutes).catch(err => {
        alert("حصل خطأ أثناء الحفظ: " + err.message);
    });
};

// رقم صاحب المتجر لاستقبال تنبيهات التحويل اليدوي وأعطال جيميناي
window.saveBotOwnerNumber = function() {
    let ownerBox = document.getElementById("botOwnerNumber");
    if (!ownerBox) return;
    let cleaned = ownerBox.value.replace(/\D/g, '');
    ownerBox.value = cleaned;
    db.ref('/botSettings/ownerNumber').set(cleaned).catch(err => {
        alert("حصل خطأ أثناء الحفظ: " + err.message);
    });
};

// مواعيد الشغل (تفعيل + من/لحد)
window.saveBotWorkHours = function() {
    let whToggle = document.getElementById("botWorkHoursEnabled");
    let whStart  = document.getElementById("botWorkHoursStart");
    let whEnd    = document.getElementById("botWorkHoursEnd");
    db.ref('/botSettings').update({
        workHoursEnabled: whToggle ? whToggle.checked : false,
        workHoursStart: (whStart && whStart.value) ? whStart.value : "10:00",
        workHoursEnd: (whEnd && whEnd.value) ? whEnd.value : "22:00"
    }).catch(err => {
        alert("حصل خطأ أثناء الحفظ: " + err.message);
    });
};

// رسالة "بره مواعيد الشغل"
window.saveBotOffHoursMessage = function() {
    let offMsgBox = document.getElementById("botOffHoursMessage");
    if (!offMsgBox) return;
    db.ref('/botSettings/offHoursMessage').set(offMsgBox.value.trim()).catch(err => {
        alert("حصل خطأ أثناء الحفظ: " + err.message);
    });
};

// أقصى عدد رسائل من نفس العميل في الدقيقة
window.saveBotRateLimit = function() {
    let rateBox = document.getElementById("botRateLimitPerMinute");
    if (!rateBox) return;
    let val = parseInt(rateBox.value, 10);
    if (isNaN(val) || val < 1) val = 5;
    db.ref('/botSettings/rateLimitPerMinute').set(val).catch(err => {
        alert("حصل خطأ أثناء الحفظ: " + err.message);
    });
};

// متابعة العملاء الساكتين تلقائيًا
window.saveBotFollowUp = function() {
    let fuToggle = document.getElementById("botFollowUpEnabled");
    let fuHours  = document.getElementById("botFollowUpHours");
    let fuMsgBox = document.getElementById("botFollowUpMessage");
    db.ref('/botSettings').update({
        followUpEnabled: fuToggle ? fuToggle.checked : false,
        followUpHours: fuHours ? Number(fuHours.value) : 8,
        followUpMessage: (fuMsgBox && fuMsgBox.value.trim()) ? fuMsgBox.value.trim() : 'تمام حضرتك، لسه محتاج أي تفاصيل تانية؟ 😊'
    }).catch(err => {
        alert("حصل خطأ أثناء الحفظ: " + err.message);
    });
};

// ==================== بحث في المحادثات + إرسال جماعي ====================
// بيدور جوه /conversations (كل رسائل العملاء وردود البوت) عن كلمة معينة،
// ويرجّع كل عميل ظهرت الكلمة دي عنده. الإرسال الفعلي بيحصل من index.js
// (هو بس اللي متصل بواتساب فعليًا) عن طريق قائمة انتظار /broadcastQueue.
let _broadcastSearchResults = []; // [{chatKey, phone, snippet}]
let _broadcastSelectedKeys = new Set();

window.searchConversations = function() {
    let input = document.getElementById("broadcastSearchInput");
    let countBox = document.getElementById("broadcastSearchResultsCount");
    let resultsBox = document.getElementById("broadcastSearchResults");
    let keyword = (input && input.value || "").trim().toLowerCase();
    if (!keyword) { alert("اكتب كلمة تدور بيها الأول."); return; }

    resultsBox.innerHTML = '<p style="color:#888;font-size:13px;">جاري البحث...</p>';
    _broadcastSelectedKeys = new Set();
    updateBroadcastSendBox();

    db.ref('/conversations').once('value').then(snap => {
        let all = snap.val() || {};
        let found = [];
        Object.keys(all).forEach(chatKey => {
            let entries = all[chatKey];
            if (!entries) return;
            let matchedText = '';
            Object.values(entries).forEach(entry => {
                let combined = ((entry.message || '') + ' ' + (entry.reply || '')).toLowerCase();
                if (combined.includes(keyword) && !matchedText) {
                    matchedText = entry.message || entry.reply || '';
                }
            });
            if (matchedText) {
                let phone = chatKey.replace('@c.us', '').replace(/\D/g, '');
                found.push({ chatKey, phone, snippet: matchedText });
            }
        });

        _broadcastSearchResults = found;
        countBox.textContent = `${found.length} محادثة لقيت فيها "${keyword}"`;

        if (found.length === 0) {
            resultsBox.innerHTML = '<p style="color:#888;font-size:13px;">مفيش نتايج.</p>';
            return;
        }

        resultsBox.innerHTML = found.map(r => `
            <div style="display:flex;align-items:flex-start;gap:10px;background:white;border:1px solid #ddd;border-radius:8px;padding:12px 15px;">
                <input type="checkbox" style="width:20px;height:20px;margin-top:2px;" onchange="toggleBroadcastSelection('${r.chatKey}', this.checked)">
                <div style="flex:1;cursor:pointer;" onclick="openConversationModal('${r.chatKey}', '${r.phone}')">
                    <div style="font-weight:bold;color:#1d364a;">${r.phone} <span style="font-weight:normal;color:#1d6fd6;font-size:12px;">👁️ اضغط لعرض المحادثة كاملة</span></div>
                    <div style="font-size:13px;color:#666;margin-top:3px;">${r.snippet.replace(/</g, '&lt;').slice(0, 120)}</div>
                </div>
            </div>
        `).join('');
    }).catch(err => {
        resultsBox.innerHTML = '';
        alert("حصل خطأ أثناء البحث: " + err.message);
    });
};

window.toggleBroadcastSelection = function(chatKey, checked) {
    if (checked) _broadcastSelectedKeys.add(chatKey);
    else _broadcastSelectedKeys.delete(chatKey);
    updateBroadcastSendBox();
};

function updateBroadcastSendBox() {
    let box = document.getElementById("broadcastSendBox");
    let countSpan = document.getElementById("broadcastSelectedCount");
    if (countSpan) countSpan.textContent = _broadcastSelectedKeys.size;
    if (box) box.style.display = _broadcastSelectedKeys.size > 0 ? 'block' : 'none';
}

// معاينة المحادثة الكاملة قبل الإرسال - عشان تتأكد إنك بتبعت للناس الصح
window.openConversationModal = function(chatKey, phone) {
    let overlay = document.getElementById("conversationModalOverlay");
    let title   = document.getElementById("conversationModalTitle");
    let body    = document.getElementById("conversationModalBody");
    if (!overlay) return;

    title.textContent = `محادثة ${phone}`;
    body.innerHTML = '<p style="color:#888;">جاري التحميل...</p>';
    overlay.style.display = 'flex';

    db.ref('/conversations/' + chatKey).orderByKey().once('value').then(snap => {
        let all = snap.val() || {};
        let entries = Object.values(all).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        if (entries.length === 0) {
            body.innerHTML = '<p style="color:#888;">مفيش محادثة مسجلة.</p>';
            return;
        }
        body.innerHTML = entries.map(e => {
            let dt = e.timestamp ? new Date(e.timestamp).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' }) : '';
            return `
            <div style="margin-bottom:16px;">
                <div style="font-size:11px;color:#999;margin-bottom:4px;">${dt}</div>
                <div style="background:#eaf4ff;border-radius:8px;padding:10px 14px;margin-bottom:6px;max-width:85%;">
                    <div style="font-size:11px;color:#1d6fd6;font-weight:bold;margin-bottom:3px;">العميل</div>
                    ${(e.message || '').replace(/</g, '&lt;')}
                </div>
                <div style="background:#eef2f5;border-radius:8px;padding:10px 14px;margin-right:auto;max-width:85%;">
                    <div style="font-size:11px;color:#1d364a;font-weight:bold;margin-bottom:3px;">الرد</div>
                    ${(e.reply || '').replace(/</g, '&lt;')}
                </div>
            </div>`;
        }).join('');
    }).catch(err => {
        body.innerHTML = '<p style="color:#d9534f;">حصل خطأ أثناء تحميل المحادثة: ' + err.message + '</p>';
    });
};

window.closeConversationModal = function() {
    let overlay = document.getElementById("conversationModalOverlay");
    if (overlay) overlay.style.display = 'none';
};

window.sendBroadcastToSelected = function() {
    let msgBox = document.getElementById("broadcastMessageText");
    let message = (msgBox && msgBox.value || "").trim();
    if (!message) { alert("اكتب نص الرسالة الأول."); return; }
    if (_broadcastSelectedKeys.size === 0) { alert("مفيش عملاء متحددين."); return; }
    if (!confirm(`هتبعت الرسالة دي لـ ${_broadcastSelectedKeys.size} عميل، بفاصل زمني بينهم عشان أمان الرقم. تأكيد؟`)) return;

    let recipients = _broadcastSearchResults
        .filter(r => _broadcastSelectedKeys.has(r.chatKey))
        .map(r => ({ chatKey: r.chatKey, phone: r.phone }));

    db.ref('/broadcastQueue').push({
        message,
        recipients,
        status: 'pending',
        createdAt: Date.now()
    }).then(() => {
        alert("تمام، الإرسال بدأ وهيتم تدريجيًا من على جهازك (لازم البوت يكون شغال).");
        msgBox.value = '';
        _broadcastSelectedKeys = new Set();
        updateBroadcastSendBox();
        document.querySelectorAll('#broadcastSearchResults input[type=checkbox]').forEach(cb => cb.checked = false);
    }).catch(err => {
        alert("حصل خطأ أثناء بدء الإرسال: " + err.message);
    });
};

// متابعة حالة آخر طلبات الإرسال الجماعي (شغال/خلص)
db.ref('/broadcastQueue').limitToLast(10).on('value', snap => {
    let box = document.getElementById("broadcastQueueStatus");
    if (!box) return;
    let all = snap.val() || {};
    let entries = Object.entries(all).sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));
    if (entries.length === 0) { box.innerHTML = ''; return; }

    let statusLabels = { pending: '⏳ في الانتظار', sending: '📤 جاري الإرسال', done: '✅ تم' };
    box.innerHTML = '<strong style="color:#1d364a;">آخر طلبات الإرسال الجماعي</strong>' +
        entries.map(([id, item]) => {
            let total = (item.recipients || []).length;
            let sent = item.sentCount || 0;
            return `<div style="background:white;border:1px solid #ddd;border-radius:8px;padding:12px 15px;margin-top:10px;font-size:13px;">
                ${statusLabels[item.status] || item.status} — ${sent}/${total} اتبعت
                <div style="color:#888;margin-top:4px;">${(item.message || '').slice(0, 80)}</div>
            </div>`;
        }).join('');
});

// ==================== الردود السريعة الجاهزة ====================
// لو رسالة العميل فيها الكلمة المفتاحية دي، البوت (في index.js) بيرد بالنص الجاهز
// على طول من غير ما يكلم الذكاء الاصطناعي خالص - توفير كامل للتوكن.
let quickRepliesCache = {};

db.ref('/botSettings/quickReplies').on('value', snap => {
    quickRepliesCache = snap.val() || {};
    renderQuickReplies(quickRepliesCache);
});

function matchTypeLabel(matchType) {
    if (matchType === 'exact_word') return { text: 'مطابقة تامة', color: '#f38c18' };
    if (matchType === 'exact_message') return { text: 'مطابقة الرسالة كاملة', color: '#d9534f' };
    return { text: 'شامل', color: '#6c757d' };
}

function renderQuickReplies(quickReplies) {
    let box = document.getElementById("quickRepliesList");
    if (!box) return;

    // بنرتب الردود حسب حقل "order" (رقم صغير = بيتفحص الأول). أي رد قديم من غير
    // رقم ترتيب (اتضاف قبل الميزة دي) بياخد قيمة كبيرة جدًا فيظهر في الآخر تلقائيًا
    // لحد ما تسحبه بنفسك لمكانه.
    let entries = Object.entries(quickReplies)
        .sort((a, b) => (a[1].order ?? Infinity) - (b[1].order ?? Infinity));

    if (!entries.length) {
        box.innerHTML = `<p style="color:gray;font-size:13px;margin:0;">مفيش ردود سريعة مضافة لسه.</p>`;
        return;
    }

    let colorPalette = [
        { bg: '#fdf5e6', border: '#f38c18' }, // برتقالي فاتح
        { bg: '#eaf4ff', border: '#1d6fd6' }, // أزرق فاتح
        { bg: '#eaf7ec', border: '#28a745' }, // أخضر فاتح
        { bg: '#fdecea', border: '#d9534f' }, // أحمر فاتح
        { bg: '#f3eafd', border: '#8e44ad' }, // بنفسجي فاتح
        { bg: '#e6f7f7', border: '#17a2b8' }, // تركواز فاتح
        { bg: '#fff9e6', border: '#e0b400' }  // أصفر فاتح
    ];

    box.innerHTML = entries.map(([id, q], index) => {
        let mt = matchTypeLabel(q.matchType);
        let color = colorPalette[index % colorPalette.length];
        return `
        <div draggable="true" data-quick-reply-id="${id}"
             ondragstart="quickReplyDragStart(event, '${id}')"
             ondragover="quickReplyDragOver(event)"
             ondrop="quickReplyDrop(event, '${id}')"
             ondragend="quickReplyDragEnd(event)"
             style="display:flex;gap:10px;align-items:flex-start;background:${color.bg};padding:12px;border-radius:8px;border:1px solid ${color.border};cursor:grab;">
            <div style="flex:0 0 auto;color:${color.border};font-size:18px;padding-top:2px;user-select:none;" title="اسحب لتغيير الترتيب">⠿</div>
            <div style="flex:1;min-width:0;">
                <span style="background:${mt.color};color:white;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:bold;margin-left:6px;display:inline-block;margin-bottom:4px;">${mt.text}</span>
                <span>${(q.trigger || '').split(/[,،]/).map(k => k.trim()).filter(Boolean).map(k =>
                    `<span style="background:${color.border};color:white;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:bold;margin-left:4px;display:inline-block;margin-bottom:4px;">${escapeHtml(k)}</span>`
                ).join('')}</span>
                <div style="margin-top:6px;color:#333;font-size:13.5px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(q.reply)}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;flex:0 0 auto;">
                <button class="btn" style="background:#f38c18;color:#1d364a;padding:6px 14px;font-size:13px;" onclick="editQuickReply('${id}')">✏️ تعديل</button>
                <button class="btn btn-red" style="padding:6px 14px;font-size:13px;" onclick="removeQuickReply('${id}')">🗑️ حذف</button>
            </div>
        </div>
    `;
    }).join('');
}

// بيفتح/يقفل صندوق شرح أنظمة المطابقة التلاتة (شامل / مطابقة تامة / مطابقة الرسالة كاملة)
window.toggleQuickReplyMatchInfo = function() {
    let box = document.getElementById("quickReplyMatchInfoBox");
    if (!box) return;
    box.style.display = (box.style.display === "none" || !box.style.display) ? "block" : "none";
};

// بترجع الردود السريعة مرتبة حسب حقل "order" الحالي. البوت في index.js بيفحص
// الردود بنفس الترتيب ده بالظبط، فأول رد بيتطابق مع كلام العميل هو اللي هيظهر
// الأول في الرد المُجمّع.
function getSortedQuickReplyIds() {
    return Object.entries(quickRepliesCache)
        .sort((a, b) => (a[1].order ?? Infinity) - (b[1].order ?? Infinity))
        .map(([id]) => id);
}

// ==================== سحب وإفلات الردود السريعة (Drag & Drop) ====================
// بدل الضغط على أسهم لفوق/لتحت كذا مرة متتالية، تقدر تمسك أي رد سريع من مقبض
// السحب (⠿) وتسحبه لمكانه المطلوب في القايمة مباشرة - تحديث واحد بس لقاعدة
// البيانات عند الإفلات، مش تحديث لكل خطوة.
let draggedQuickReplyId = null;

window.quickReplyDragStart = function(event, id) {
    draggedQuickReplyId = id;
    event.dataTransfer.effectAllowed = 'move';
    // شفافية بسيطة على العنصر وهو بيتسحب، عشان يبقى واضح بصريًا إنه في وضع السحب
    if (event.target && event.target.style) event.target.style.opacity = '0.4';
};

window.quickReplyDragOver = function(event) {
    event.preventDefault(); // لازم نعمل preventDefault عشان حدث الإفلات يشتغل أصلاً
    event.dataTransfer.dropEffect = 'move';
};

window.quickReplyDrop = function(event, targetId) {
    event.preventDefault();
    if (!draggedQuickReplyId || draggedQuickReplyId === targetId) return;

    let ids = getSortedQuickReplyIds();
    let fromIndex = ids.indexOf(draggedQuickReplyId);
    let toIndex = ids.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    // بنشيل العنصر المسحوب من مكانه القديم ونحطه في المكان الجديد (مكان اللي
    // اتعمله drop عليه بالظبط)، وبعدين نعيد ترقيم الكل حسب الترتيب الجديد.
    ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, draggedQuickReplyId);

    let dbUpdates = {};
    ids.forEach((id, i) => {
        dbUpdates['/botSettings/quickReplies/' + id + '/order'] = i;
    });
    db.ref().update(dbUpdates).catch(err => {
        alert("حصل خطأ أثناء تغيير الترتيب: " + err.message);
    });

    draggedQuickReplyId = null;
};

window.quickReplyDragEnd = function(event) {
    if (event.target && event.target.style) event.target.style.opacity = '1';
    draggedQuickReplyId = null;
};

function escapeHtml(str) {
    let div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

// بيحفظ رد سريع جديد أو يحدّث واحد موجود، حسب لو فيه ID متسجل في الحقل المخفي
// editingQuickReplyId (يتحط بس لما تدوس "تعديل" على رد موجود).
window.saveQuickReply = function() {
    let editingIdBox = document.getElementById("editingQuickReplyId");
    let triggerBox = document.getElementById("newQuickReplyTrigger");
    let replyBox = document.getElementById("newQuickReplyText");
    let matchTypeBox = document.getElementById("newQuickReplyMatchType");
    if (!triggerBox || !replyBox) return;

    let trigger = triggerBox.value.trim();
    let reply = replyBox.value; // مانعملش trim هنا عشان مايشيلش مسافات/أسطر مقصودة في الأول أو الآخر
    let matchType = matchTypeBox ? matchTypeBox.value : 'contains';
    if (!trigger || !reply.trim()) {
        alert("اكتب الكلمة المفتاحية والرد الجاهز الأول");
        return;
    }

    let editingId = editingIdBox ? editingIdBox.value : "";
    let ref = editingId
        ? db.ref('/botSettings/quickReplies/' + editingId)
        : db.ref('/botSettings/quickReplies').push();

    if (editingId) {
        // بنعدّل trigger/reply/matchType ومنلمسش رقم الترتيب المحفوظ أصلاً
        ref.update({ trigger, reply, matchType }).then(() => {
            cancelEditQuickReply();
        }).catch(err => {
            alert("حصل خطأ أثناء الحفظ: " + err.message);
        });
    } else {
        // رد جديد -> ياخد ترتيب في آخر القايمة تلقائيًا (أكبر رقم موجود + 1)
        let existingOrders = Object.values(quickRepliesCache).map(q => Number.isFinite(q.order) ? q.order : -1);
        let nextOrder = existingOrders.length ? Math.max(...existingOrders) + 1 : 0;
        ref.set({ trigger, reply, matchType, order: nextOrder }).then(() => {
            cancelEditQuickReply();
        }).catch(err => {
            alert("حصل خطأ أثناء الحفظ: " + err.message);
        });
    }
};

// بيفتح رد سريع موجود للتعديل: بيملى الحقول بقيمته الحالية ويحوّل الزرار لوضع "حفظ التعديل"
window.editQuickReply = function(id) {
    let q = quickRepliesCache[id];
    if (!q) return;

    document.getElementById("editingQuickReplyId").value = id;
    document.getElementById("newQuickReplyTrigger").value = q.trigger || "";
    document.getElementById("newQuickReplyText").value = q.reply || "";
    let matchTypeBox = document.getElementById("newQuickReplyMatchType");
    if (matchTypeBox) matchTypeBox.value = q.matchType || "contains";

    let saveBtn = document.getElementById("quickReplySaveBtn");
    let cancelBtn = document.getElementById("quickReplyCancelBtn");
    if (saveBtn) saveBtn.textContent = "💾 حفظ التعديل";
    if (cancelBtn) cancelBtn.style.display = "block";

    document.getElementById("newQuickReplyTrigger").scrollIntoView({ behavior: "smooth", block: "center" });
};

// بيلغي وضع التعديل ويرجع الفورم لحالته العادية (إضافة رد جديد)
window.cancelEditQuickReply = function() {
    document.getElementById("editingQuickReplyId").value = "";
    document.getElementById("newQuickReplyTrigger").value = "";
    document.getElementById("newQuickReplyText").value = "";
    let matchTypeBox = document.getElementById("newQuickReplyMatchType");
    if (matchTypeBox) matchTypeBox.value = "contains";

    let saveBtn = document.getElementById("quickReplySaveBtn");
    let cancelBtn = document.getElementById("quickReplyCancelBtn");
    if (saveBtn) saveBtn.textContent = "➕ إضافة";
    if (cancelBtn) cancelBtn.style.display = "none";
};

window.removeQuickReply = function(id) {
    if (!confirm("متأكد إنك عايز تحذف الرد السريع ده؟")) return;
    db.ref('/botSettings/quickReplies/' + id).remove().then(() => {
        // لو كنت بتعدّل على نفس الرد اللي اتحذف، نلغي وضع التعديل
        let editingIdBox = document.getElementById("editingQuickReplyId");
        if (editingIdBox && editingIdBox.value === id) {
            cancelEditQuickReply();
        }
    }).catch(err => {
        alert("حصل خطأ أثناء الحذف: " + err.message);
    });
};

// ==================== سجل استهلاك التوكنز (تكلفة جيميناي حركة بحركة) ====================
let botUsageLogCache = []; // [{ id, timestamp, phone, chatKey, type, promptTokens, completionTokens, totalTokens }, ...]
let botUsageCurrentPage = 1;

db.ref('/botUsageLog').on('value', snap => {
    const val = snap.val() || {};
    botUsageLogCache = Object.entries(val)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); // الأحدث فوق
    botUsageCurrentPage = 1;
    renderBotUsageLog();
});

function formatUsageDateTime(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleString('ar-EG', { timeZone: 'Africa/Cairo', hour12: true });
}

function getFilteredBotUsageLog() {
    const phoneFilter = (document.getElementById("filterUsagePhone")?.value || '').trim();
    const typeFilter = document.getElementById("filterUsageType")?.value || 'all';
    const fromVal = document.getElementById("filterUsageFrom")?.value || '';
    const toVal = document.getElementById("filterUsageTo")?.value || '';

    const fromTs = fromVal ? new Date(fromVal + 'T00:00:00').getTime() : null;
    const toTs = toVal ? new Date(toVal + 'T23:59:59').getTime() : null;

    return botUsageLogCache.filter(entry => {
        if (phoneFilter && !String(entry.phone || '').includes(phoneFilter)) return false;
        if (typeFilter !== 'all' && entry.type !== typeFilter) return false;
        if (fromTs && (entry.timestamp || 0) < fromTs) return false;
        if (toTs && (entry.timestamp || 0) > toTs) return false;
        return true;
    });
}

// أكتر الأسئلة اللي بترد عليها جيميناي (يعني مش متغطاة برد سريع حاليًا) -
// بيساعدك تكتشف أسئلة بتتكرر كتير وتستاهل تتحول لرد سريع جاهز، توفيرًا للتوكن.
function renderTopQuickReplies(filtered) {
    const box = document.getElementById("topQuickRepliesBox");
    if (!box) return;

    const counts = {}; // normalized message -> { count, original }
    filtered.forEach(e => {
        if (e.type !== 'ai' || !e.message) return;
        const normalized = String(e.message).trim().toLowerCase().replace(/\s+/g, ' ');
        if (!normalized) return;
        if (!counts[normalized]) counts[normalized] = { count: 0, original: e.message };
        counts[normalized].count++;
    });

    const sorted = Object.values(counts).filter(x => x.count > 1).sort((a, b) => b.count - a.count).slice(0, 8);

    if (sorted.length === 0) {
        box.innerHTML = `<strong style="color:#1d364a;">📊 أكتر الأسئلة اللي بترد عليها جيميناي (مش رد سريع)</strong>
            <p style="color:#888;font-size:13px;margin-top:10px;">لسه مفيش سؤال اتكرر أكتر من مرة.</p>`;
        return;
    }

    const maxCount = sorted[0].count;
    box.innerHTML = `<strong style="color:#1d364a;">📊 أكتر الأسئلة اللي بترد عليها جيميناي (مش رد سريع)</strong>
        <p style="color:#666;font-size:12.5px;margin:6px 0 0;">الأسئلة دي اتكررت من عملاء مختلفين ومفيش رد سريع بيغطيها - يستاهل تضيفهم كرد سريع جديد.</p>` +
        sorted.map(({ original, count }) => {
            const pct = Math.round((count / maxCount) * 100);
            return `
            <div style="margin-top:12px;">
                <div style="display:flex;justify-content:space-between;font-size:13px;color:#333;margin-bottom:4px;">
                    <span>${original.replace(/</g, '&lt;')}</span>
                    <span style="font-weight:bold;color:#1d364a;">${count} مرة</span>
                </div>
                <div style="background:#eee;border-radius:6px;height:8px;overflow:hidden;">
                    <div style="background:#d9534f;height:100%;width:${pct}%;"></div>
                </div>
            </div>`;
        }).join('');
}

function renderBotUsageSummaryCards(filtered) {
    const box = document.getElementById("botUsageSummaryCards");
    if (!box) return;

    const totalHits = filtered.length;
    const aiHits = filtered.filter(e => e.type === 'ai').length;
    const quickHits = filtered.filter(e => e.type === 'quick_reply').length;
    const totalTokens = filtered.reduce((sum, e) => sum + (Number(e.totalTokens) || 0), 0);

    const cards = [
        { label: 'إجمالي الحركات', value: totalHits, color: '#1d364a' },
        { label: 'ردود جيميناي (AI)', value: aiHits, color: '#f38c18' },
        { label: 'ردود سريعة (0 توكن)', value: quickHits, color: '#28a745' },
        { label: 'إجمالي التوكنز المستهلكة', value: totalTokens.toLocaleString('en-US'), color: '#d9534f' }
    ];

    box.innerHTML = cards.map(c => `
        <div style="background:white;border-right:5px solid ${c.color};border-radius:8px;padding:16px 18px;box-shadow:0 2px 8px rgba(0,0,0,.05);">
            <div style="color:#777;font-size:13px;font-weight:bold;margin-bottom:6px;">${c.label}</div>
            <div style="color:${c.color};font-size:22px;font-weight:bold;">${c.value}</div>
        </div>
    `).join('');
}

function renderBotUsageLogPagination(totalItems, pageSize) {
    const box = document.getElementById("botUsageLogPagination");
    if (!box) return;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    if (botUsageCurrentPage > totalPages) botUsageCurrentPage = totalPages;

    let buttons = '';
    const makeBtn = (page, label, isActive) => `
        <button class="btn" style="padding:6px 12px;font-size:13px;${isActive ? 'background:#f38c18;color:#1d364a;' : 'background:#eef2f5;color:#1d364a;'}"
                onclick="botUsageGoToPage(${page})">${label}</button>`;

    if (totalPages <= 1) {
        box.innerHTML = '';
        return;
    }

    buttons += makeBtn(Math.max(1, botUsageCurrentPage - 1), '‹ السابق', false);
    for (let p = 1; p <= totalPages; p++) {
        buttons += makeBtn(p, String(p), p === botUsageCurrentPage);
    }
    buttons += makeBtn(Math.min(totalPages, botUsageCurrentPage + 1), 'التالي ›', false);

    box.innerHTML = buttons;
}

window.botUsageGoToPage = function(page) {
    botUsageCurrentPage = page;
    renderBotUsageLog();
};

window.renderBotUsageLog = function() {
    const body = document.getElementById("botUsageLogBody");
    const countEl = document.getElementById("filterUsageCount");
    if (!body) return;

    const filtered = getFilteredBotUsageLog();
    renderBotUsageSummaryCards(filtered);
    renderTopQuickReplies(filtered);

    const pageSize = parseInt(document.getElementById("usagePageSizeSelect")?.value || '20', 10);
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    if (botUsageCurrentPage > totalPages) botUsageCurrentPage = totalPages;
    if (botUsageCurrentPage < 1) botUsageCurrentPage = 1;

    const startIdx = (botUsageCurrentPage - 1) * pageSize;
    const pageItems = filtered.slice(startIdx, startIdx + pageSize);

    if (countEl) {
        countEl.textContent = totalItems
            ? `عرض ${startIdx + 1}-${Math.min(startIdx + pageItems.length, totalItems)} من إجمالي ${totalItems} حركة`
            : 'لا توجد حركات مطابقة';
    }

    if (!pageItems.length) {
        body.innerHTML = `<tr><td colspan="8" style="color:gray;">لا توجد حركات مسجلة.</td></tr>`;
        renderBotUsageLogPagination(0, pageSize);
        return;
    }

    body.innerHTML = pageItems.map(e => {
        const typeLabel = e.type === 'ai'
            ? '<span class="badge" style="background:#f38c18;">🤖 رد ذكاء اصطناعي</span>'
            : '<span class="badge" style="background:#28a745;">⚡ رد سريع</span>';
        const thoughtsVal = Number(e.thoughtsTokens || 0);
        const thoughtsCell = thoughtsVal > 0
            ? `<strong style="color:#d9534f;">${thoughtsVal.toLocaleString('en-US')} ⚠️</strong>`
            : `<span style="color:#28a745;">0</span>`;
        return `
            <tr>
                <td>${formatUsageDateTime(e.timestamp)}</td>
                <td>${escapeHtml(e.phone || '—')}</td>
                <td>${typeLabel}</td>
                <td style="font-size:12px;color:#555;">${escapeHtml(e.modelName || '—')}</td>
                <td>${Number(e.promptTokens || 0).toLocaleString('en-US')}</td>
                <td>${Number(e.completionTokens || 0).toLocaleString('en-US')}</td>
                <td>${thoughtsCell}</td>
                <td><strong>${Number(e.totalTokens || 0).toLocaleString('en-US')}</strong></td>
            </tr>
        `;
    }).join('');

    renderBotUsageLogPagination(totalItems, pageSize);
};

window.exportBotUsageLogCSV = function() {
    const filtered = getFilteredBotUsageLog();
    if (!filtered.length) {
        alert("مفيش حركات مطابقة للفلتر الحالي عشان تصدرها.");
        return;
    }
    const header = 'التاريخ والوقت,رقم العميل,نوع الحركة,توكنز الطلب,توكنز الرد,توكنز تفكير مخفية,الإجمالي\n';
    const rows = filtered.map(e => {
        const typeLabel = e.type === 'ai' ? 'رد ذكاء اصطناعي' : 'رد سريع';
        const csvEscapeLocal = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
        return [
            csvEscapeLocal(formatUsageDateTime(e.timestamp)),
            csvEscapeLocal(e.phone || ''),
            csvEscapeLocal(typeLabel),
            e.promptTokens || 0,
            e.completionTokens || 0,
            e.thoughtsTokens || 0,
            e.totalTokens || 0
        ].join(',');
    }).join('\n');

    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `bot-usage-log-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
};
