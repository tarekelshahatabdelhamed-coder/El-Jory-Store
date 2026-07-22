require('dotenv').config({ quiet: true });

// ⚠️ إصلاح ترميز الـ Console على ويندوز: الـ PowerShell/CMD القديم بيستخدم ترميز
// افتراضي مختلف عن UTF-8 (زي Windows-1256 أو 437)، فاللوجات العربية بتظهر رموز
// غريبة (Mojibake). السطور دي بتفرض UTF-8 (كود الصفحة 65001) تلقائيًا كل مرة
// البوت يشتغل، من غير ما تحتاج تكتب أمر "chcp 65001" يدويًا في كل نافذة.
// ملحوظة: لسه ممكن يظهر الاتجاه (RTL) مقلوب شوية في الـ PowerShell القديم لأنه
// مش بيدعم الكتابة من اليمين لليسار أصلاً - للحل الكامل استخدم Windows Terminal.
if (process.platform === 'win32') {
    try {
        require('child_process').execSync('chcp 65001', { stdio: 'ignore' });
    } catch (e) {
        // لو فشل الأمر لأي سبب، نتجاهله بهدوء - ده مجرد تحسين شكل اللوج، مش جزء
        // أساسي من عمل البوت.
    }
}
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { initializeApp, cert } = require('firebase-admin/app');
const { getDatabase, ServerValue } = require('firebase-admin/database');
const fs = require('fs');
const path = require('path');

// ==================== إعداد شيت الأوردرات (ملف Excel/CSV محلي) ====================
// كل ما البوت يجمع بيانات عميل عايز يأكد أوردر (اسم + رقم + عنوان مفصّل)، بيضيفله
// صف جديد هنا تلقائيًا. الملف ده بصيغة CSV، وتقدر تفتحه بإكسل عادي مباشرة من غير
// أي إعدادات أو حسابات إضافية - هيتحدث لحظيًا كل ما يجيلك أوردر جديد.
const ORDERS_FILE_PATH = path.join(__dirname, 'orders.csv');
// السطر "sep=," ده بيقول لإكسل صراحة "استخدم الفاصلة العادية كفاصل بين الأعمدة" -
// بيحل مشكلة إن بعض إصدارات ويندوز العربي بتفتح الفاصل الافتراضي فاصلة منقوطة (؛).
const ORDERS_CSV_SEP_HINT = 'sep=,\n';
const ORDERS_CSV_HEADER = 'التاريخ والوقت,الاسم,رقم التليفون,العنوان,قيمة الشحن,سعر القطعة\n';
// ⚠️ الترميز: رجعنا لـ UTF-8 (بدل UTF-16 اللي جربناه). السبب إن بعض إصدارات
// إكسل بتتجاهل علامة الـ BOM خالص لملفات .csv عند الفتح بالـ Double-Click
// العادي (بغض النظر عن الترميز نفسه)، وبتفتحها دايمًا بترميز النظام الافتراضي.
// UTF-8 هو الأكثر توافقًا عالميًا وهو المعيار القياسي لملفات CSV، فلو المشكلة
// استمرت، الحل الأضمن مش تغيير الترميز، لكن فتح الملف عن طريق:
// Excel > Data > Get Data / From Text-CSV، واختيار "65001: Unicode (UTF-8)"
// صراحة من قايمة File Origin وقت الاستيراد - ده بيضمن الفتح الصحيح 100%
// بغض النظر عن سلوك الـ Double-Click في نسخة إكسل بتاعتك.
const ORDERS_FILE_ENCODING = 'utf8';

function ensureOrdersFileExists() {
    if (!fs.existsSync(ORDERS_FILE_PATH)) {
        // BOM (\uFEFF) في الأول عشان إكسل يتعرف على إن الملف UTF-8 من غير ما يتلخبط
        fs.writeFileSync(ORDERS_FILE_PATH, '\uFEFF' + ORDERS_CSV_SEP_HINT + ORDERS_CSV_HEADER, ORDERS_FILE_ENCODING);
    }
}

// بيهرّب أي فاصلة أو علامات اقتباس جوه القيمة نفسها عشان ملف الـ CSV مايتلخبطش
function csvEscape(value) {
    const str = String(value ?? '').replace(/"/g, '""').replace(/[\r\n]+/g, ' ').trim();
    return `"${str}"`;
}

function appendOrderRow(order) {
    try {
        ensureOrdersFileExists();
        const now = new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' });
        const row = [
            csvEscape(now),
            csvEscape(order.name),
            csvEscape(order.phone),
            csvEscape(order.address),
            csvEscape(order.shipping || ''),
            csvEscape(order.price || '')
        ].join(',') + '\n';
        fs.appendFileSync(ORDERS_FILE_PATH, row, ORDERS_FILE_ENCODING);
        console.log(`📦 تم تسجيل أوردر جديد في orders.csv: ${order.name} - ${order.phone}`);
    } catch (error) {
        console.error('خطأ في تسجيل الأوردر في الشيت:', error.message);
    }
}

// ==================== إعداد Firebase ====================
const serviceAccount = require('./firebase-service-account.json');

initializeApp({
    credential: cert(serviceAccount),
    databaseURL: 'https://el-jory-store-default-rtdb.firebaseio.com'
});

const db = getDatabase();
const MAX_MESSAGES_PER_CUSTOMER = 50;

// ==================== اللوج المباشر للبوت (لوحة الأدمن) ====================
// الفكرة: بدل ما نعدّل كل سطر console.log/console.error في الملف (فيه مئات)،
// بنعمل "اعتراض" (override) للدالتين نفسهم مرة واحدة هنا. من اللحظة دي،
// أي console.log أو console.error في أي مكان في الملف هيتنفذ عادي في
// التيرمنال زي ما هو، وهيتبعت كمان نسخة منه لـ Firebase تحت مسار /liveLogs
// عشان صفحة الأدمن تقدر تعرضه لحظة بلحظة زي شاشة تيرمنال حقيقية.
const LIVE_LOG_RETENTION_MS = 24 * 60 * 60 * 1000; // الاحتفاظ باللوج لمدة 24 ساعة بس

function _formatLiveLogArgs(args) {
    return args.map(a => {
        if (typeof a === 'string') return a;
        if (a instanceof Error) return a.message;
        try { return JSON.stringify(a); } catch (e) { return String(a); }
    }).join(' ');
}

function pushLiveLog(level, args) {
    try {
        db.ref('/liveLogs').push({
            text: _formatLiveLogArgs(args),
            level: level, // 'info' أو 'error'
            time: ServerValue.TIMESTAMP
        }).catch(() => { /* لو فشل إرسال اللوج، نتجاهله بهدوء - ميقفش البوت */ });
    } catch (e) {
        // تجاهل بهدوء - اللوج المباشر ميزة إضافية، مش لازم تعطّل البوت لو فشلت
    }
}

const _origConsoleLog = console.log.bind(console);
const _origConsoleError = console.error.bind(console);

console.log = function(...args) {
    _origConsoleLog(...args);
    pushLiveLog('info', args);
};

console.error = function(...args) {
    _origConsoleError(...args);
    pushLiveLog('error', args);
};

// تنظيف اللوجات الأقدم من 24 ساعة - بيشتغل مرة عند بدء التشغيل وبعدين كل ساعة
async function cleanupOldLiveLogs() {
    try {
        const cutoff = Date.now() - LIVE_LOG_RETENTION_MS;
        const snap = await db.ref('/liveLogs').orderByChild('time').endAt(cutoff).once('value');
        const updates = {};
        snap.forEach(child => { updates[child.key] = null; });
        if (Object.keys(updates).length > 0) {
            await db.ref('/liveLogs').update(updates);
            _origConsoleLog(`🧹 تم حذف ${Object.keys(updates).length} سطر لوج أقدم من 24 ساعة`);
        }
    } catch (e) {
        _origConsoleError('⚠️ تعذر تنظيف اللوج المباشر:', e.message);
    }
}

cleanupOldLiveLogs();
setInterval(cleanupOldLiveLogs, 60 * 60 * 1000); // إعادة التنظيف كل ساعة

async function saveConversation(chatKey, customerMessage, aiReply) {
    try {
        const conversationRef = db.ref(`conversations/${chatKey}`);
        const newMessageRef = conversationRef.push();

        await newMessageRef.set({
            message: customerMessage,
            reply: aiReply,
            timestamp: ServerValue.TIMESTAMP
        });

        const snapshot = await conversationRef.orderByKey().once('value');
        const messages = snapshot.val();
        if (messages) {
            const keys = Object.keys(messages);
            if (keys.length > MAX_MESSAGES_PER_CUSTOMER) {
                const keysToDelete = keys.slice(0, keys.length - MAX_MESSAGES_PER_CUSTOMER);
                const updates = {};
                keysToDelete.forEach(key => {
                    updates[key] = null;
                });
                await conversationRef.update(updates);
            }
        }
    } catch (error) {
        console.error('خطأ في حفظ المحادثة على Firebase:', error.message);
    }
}

// عدد آخر رسائل بنجيبها من تاريخ المحادثة ونحطها في البرومبت عشان البوت
// يفتكر اللي اتقال قبل كده ومايكررش نفس الأسئلة (زي مقاس الشاشة مثلاً).
const HISTORY_MESSAGES_COUNT = 4;

// طول الرد القديم اللي بنحطه في السياق - مش بنستبعد أي رسالة قديمة خالص (عشان
// البوت يفضل شايف كل حاجة اتقالت)، بس بنقصّ الردود الطويلة القديمة لملخص قصير
// كفاية إنه يعرف "اتقال إيه" من غير ما يبعت نفس النص الطويل تاني في كل رسالة
// جديدة - ده بيوفر توكنز كتير مع الحفاظ على الاستمرارية.
const HISTORY_REPLY_TRUNCATE_CHARS = 200;

function truncateForHistory(text) {
    if (!text || text.length <= HISTORY_REPLY_TRUNCATE_CHARS) return text;
    return text.slice(0, HISTORY_REPLY_TRUNCATE_CHARS).trim() + '...';
}

async function getRecentHistoryItems(chatKey) {
    try {
        const snapshot = await db.ref(`conversations/${chatKey}`)
            .orderByKey()
            .limitToLast(HISTORY_MESSAGES_COUNT)
            .once('value');
        const messages = snapshot.val();
        if (!messages) return [];

        return Object.values(messages) // Firebase push keys بترتب زمنيًا تلقائيًا
            .filter(m => m && m.message && m.reply);
    } catch (error) {
        console.error('خطأ في جلب تاريخ المحادثة:', error.message);
        return [];
    }
}

// ==================== إعداد Gemini ====================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// ملحوظة: مش بننشئ موديل ثابت هنا لأن لازم نبعتله systemInstruction مختلفة
// (حسب برومبت الأدمن الحالي) مع كل رسالة - شوف chatModel جوه الهاندلر تحت.

// اسم الموديل في مكان واحد بس عشان لو حبيت تغيّره (ترجع لـ Flash العادي أو تجرب
// موديل تاني) تغيّره من هنا بس من غير ما تدوّر عليه في الكود كله.
//
// ⚠️ مهم: مش بنستخدم أسماء "-latest" (زي gemini-flash-lite-latest) لأنها أسماء
// مستعارة (alias) بتتحرك تلقائيًا لآخر إصدار تصدره جوجل - يعني ممكن السعر يتغيّر
// من تحتك من غير ما تاخد بالك. بدل كده بنكتب اسم موديل محدد وثابت.
//
// ⚠️ تحديث: جوجل قفلت الوصول لـ gemini-2.5-flash-lite (كان أرخص موديل) قبل الميعاد
// المعلن رسميًا للإيقاف - ده بيحصل أحيانًا مع جوجل من غير إشعار كافي. البديل
// الرسمي المعتمد دلوقتي هو الجيل اللي بعده مباشرة: gemini-3.1-flash-lite (مستقر
// ومش preview) - لسه أرخص بكتير من الموديلات التانية حتى لو مش أرخص زي القديم بالظبط.
//
// - 'gemini-3.1-flash-lite' -> أرخص موديل مستقر متاح حاليًا (يوليو 2026).
// - 'gemini-2.5-flash'      -> جودة لغة وفهم سياق أعلى، لكن أغلى في التكلفة.
//
// 💡 نصيحة: لو حصل نفس الخطأ ده تاني في المستقبل (404 - model no longer available)،
// معناه جوجل قفلت الموديل ده كمان - راجع صفحة أسعار Gemini الرسمية (ai.google.dev/gemini-api/docs/pricing)
// عشان تلاقي بديل الجيل اللي بعده وغيّر السطر ده بس.
const GEMINI_MODEL_NAME = 'gemini-3.1-flash-lite';

const DEFAULT_SYSTEM_PROMPT = 'أنت مساعد ذكي لمتجر الجوري ستور لبيع واقيات شاشات أكريليك. وظيفتك هي الرد على استفسارات العملاء بأسلوب مهذب وودود وبلهجة مصرية عامية بسيطة. إذا سألك العميل عن شيء لا تعرفه، اطلب منه بلطف الانتظار حتى يرد عليه أحد ممثلي خدمة العملاء من البشر. خلي ردودك قصيرة ومباشرة.';

// كلمة سرية ثابتة بيرجعها الموديل لما يقرر إنه محتاج يحوّل العميل لموظف بشري.
// العميل نفسه أبدًا مش هيشوفها - بنستبدلها في الكود برسالة تحويل ثابتة وقصيرة.
const HANDOVER_MARKER = '[[HANDOVER]]';

// علامة سرية بيحطها الموديل في آخر رده لما يجمع بيانات أوردر كاملة من العميل
// (اسم + رقم تليفون + عنوان مفصّل) عشان الكود يمسكها ويسجلها في شيت الأوردرات
// تلقائيًا. العميل نفسه أبدًا مش بيشوف العلامة دي - بتتشال من الرد قبل ما يوصله.
const ORDER_DATA_START = '[[ORDER_DATA]]';
const ORDER_DATA_END = '[[/ORDER_DATA]]';

const ORDER_CAPTURE_RULES = `
3. تسجيل الأوردر: لو جمعت من العميل اسمه الكامل + رقم تليفونه + عنوان مفصّل (3 كلمات على الأقل، مش مجرد اسم محافظة زي "القاهرة")، ضيف في آخر ردك العادي (بعد تأكيد الطلب) السطر ده بالحرف:
${ORDER_DATA_START}{"name":"...","phone":"...","address":"...","shipping":"لو معروفة وإلا فاضية","price":"لو معروف وإلا فاضي"}${ORDER_DATA_END}
اكتبه JSON صحيح بمفاتيح إنجليزية بالظبط زي ما هي. لو أي بيانة ناقصة، متضيفش العلامة واستمر تسأل عنها.
`;

// تعليمات إجبارية بتتحط دايمًا فوق أي نص بتكتبه في لوحة التحكم - القاعدة دي بس اللي
// مش قابلة للتجاوز (منع اختلاق معلومات غلط + التحويل ليك). أما أسلوب الرد وطوله
// (مختصر ولا مفصّل، امتى يديله كل المواصفات وامتى يختصر...) فده بالكامل قرارك انت،
// اكتبه زي ما عايزه بالظبط في تعليمات المتجر تحت.
const MANDATORY_RULES = `
قواعد إلزامية (الأهم من أي حاجة تانية):
1. التزم حرفيًا بمعلومات صاحب المتجر تحت - ممنوع تخترع أو تغيّر أي معلومة، لكن اكتب الصياغة بإبداعك في كل مرة وبدون تكرار نفس الجمل بالظبط.
2. ⚠️ ممنوع منعًا باتًا تختلق أو تخمّن أي سعر أو معلومة مش مكتوبة صراحة تحت. لو سُئلت عن سعر منتج، مقاس، أو أي تفصيلة مش موجودة بالظبط في تعليمات المتجر، أو مش متأكد منها 100%، رد **فقط وحصريًا** بالنص ده من غير أي إضافة أو كلمة زيادة قبله أو بعده: ${HANDOVER_MARKER}
مثال: لو العميل سأل عن مقاس مش مكتوب سعره تحت، ممنوع تحط سعر تقديري أو "تقريبي" - رد بالـ ${HANDOVER_MARKER} بس.
${ORDER_CAPTURE_RULES}
تعليمات صاحب المتجر (التزم بمضمونها، وابدع في صياغتها):
`;

// ==================== إعدادات البوت (من لوحة التحكم فقط) ====================
// ⚠️ مهم: البوت مبيسحبش أي بيانات تلقائي من المنتجات/العروض/المناطق.
// كل تعليماته وكل المعلومات اللي بيرد بيها بتيجي حصريًا من نص "System Prompt"
// اللي بتكتبه انت بنفسك في تاب "بوت الواتساب 🤖" بلوحة التحكم.
let botSettingsCache = {
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    isActive: true,
    pauseMinutes: 30,
    ownerNumber: '',              // رقم صاحب المتجر (بصيغة دولية زي 201001234567) - يستقبل تنبيهات التحويل والأعطال
    workHoursEnabled: false,
    workHoursStart: '10:00',
    workHoursEnd: '22:00',
    offHoursMessage: 'شكراً لتواصلك معنا! فريقنا هيكون متاح للرد عليك في أقرب وقت خلال مواعيد الشغل 🙏',
    rateLimitPerMinute: 5,        // أقصى عدد رسائل من نفس العميل في الدقيقة قبل ما نتجاهل الباقي
    followUpEnabled: false,
    followUpHours: 8,             // بعد كام ساعة من سكوت العميل نبعتله متابعة (خيارات: 4/8/12/14/20)
    followUpMessage: 'تمام حضرتك، لسه محتاج أي تفاصيل تانية؟ 😊'
};

db.ref('/botSettings').on('value', snap => {
    const val = snap.val() || {};
    botSettingsCache.systemPrompt = val.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    botSettingsCache.isActive = val.isActive !== false;
    botSettingsCache.pauseMinutes = (val.pauseMinutes !== undefined && val.pauseMinutes !== null)
        ? Number(val.pauseMinutes)
        : 30;
    botSettingsCache.ownerNumber = val.ownerNumber || '';
    botSettingsCache.workHoursEnabled = val.workHoursEnabled === true;
    botSettingsCache.workHoursStart = val.workHoursStart || '10:00';
    botSettingsCache.workHoursEnd = val.workHoursEnd || '22:00';
    botSettingsCache.offHoursMessage = val.offHoursMessage || 'شكراً لتواصلك معنا! فريقنا هيكون متاح للرد عليك في أقرب وقت خلال مواعيد الشغل 🙏';
    botSettingsCache.rateLimitPerMinute = (val.rateLimitPerMinute !== undefined && val.rateLimitPerMinute !== null)
        ? Number(val.rateLimitPerMinute)
        : 5;
    botSettingsCache.followUpEnabled = val.followUpEnabled === true;
    botSettingsCache.followUpHours = (val.followUpHours !== undefined && val.followUpHours !== null)
        ? Number(val.followUpHours)
        : 8;
    botSettingsCache.followUpMessage = val.followUpMessage || 'تمام حضرتك، لسه محتاج أي تفاصيل تانية؟ 😊';
});

// ==================== الردود السريعة الجاهزة (توفير كامل للتوكن) ====================
// لو رسالة العميل فيها أي كلمة مفتاحية من دول، البوت بيرد بالنص الجاهز على طول
// من غير ما يكلم جيميناي خالص - يعني توفير 100% من التكلفة على الأسئلة دي.
// بتتدار من تاب "بوت الواتساب" في لوحة التحكم.
let quickRepliesCache = []; // [{ trigger: 'كلمة', reply: 'رد جاهز' }, ...]

db.ref('/botSettings/quickReplies').on('value', snap => {
    const val = snap.val();
    // بنفرز حسب حقل "order" اللي بتتحكم فيه من لوحة التحكم (أسهم لفوق/لتحت) -
    // عشان أول رد بيتطابق مع كلام العميل يظهر الأول في الرد المُجمّع، مش بترتيب
    // إنشاء الرد في قاعدة البيانات. أي رد قديم من غير order بياخد قيمة كبيرة
    // فيظهر في الآخر تلقائيًا.
    quickRepliesCache = val
        ? Object.values(val)
            .filter(q => q && q.trigger && q.reply)
            .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
        : [];
    console.log(`⚡ تحديث الردود السريعة: ${quickRepliesCache.length} رد محمّل (${quickRepliesCache.map(q => q.trigger).join(', ')})`);
});

// بيحوّل أي أرقام عربية/هندية (٠-٩) في النص لأرقام إنجليزية عادية (0-9)، عشان
// نقدر نتعرف على الأرقام صح بغض النظر عن الصيغة اللي كتب بيها العميل أو الأدمن
// الكلمة المفتاحية (65 أو ٦٥ لازم يتحسبوا نفس الحاجة).
const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
function normalizeDigits(str) {
    return String(str || '').replace(/[٠-٩]/g, d => String(ARABIC_INDIC_DIGITS.indexOf(d)));
}

// بيهرّب أي رمز خاص في الـ regex عشان الكلمة المفتاحية (لو فيها رموز غريبة)
// متكسّرش تركيب الـ regex.
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// بيشيل علامات الترقيم (عربي وإنجليزي) من النص وبيوحّد المسافات - مستخدمة بس في
// نظام "مطابقة الرسالة كاملة" عشان عميل كتب "غالي عليا؟" يتحسب زي "غالي عليا"
// بالظبط من غير ما علامة الاستفهام تكسر المطابقة.
const PUNCTUATION_REGEX = /[.,!؟?؛;:"'«»()\[\]{}\-ـ~`@#$%^&*+=|\\/<>_]/g;
function stripPunctuationForExactMessage(str) {
    return str.replace(PUNCTUATION_REGEX, '').replace(/\s+/g, ' ').trim();
}

// بيدور على *كل* الردود السريعة اللي كلماتها المفتاحية موجودة جوه رسالة العميل
// (مش أول واحدة بس) - عشان لو العميل سأل عن أكتر من حاجة في رسالة واحدة (زي
// "بكام 65 و55؟")، يرد بكل الإجابات المطلوبة مجمّعة، مش يتجاهل الباقي.
// الحقل "trigger" ممكن يحتوي على أكتر من كلمة مفصولة بفاصلة (عربي "،" أو إنجليزي ",").
//
// كل رد سريع ليه حقل "matchType" بيتحدد من لوحة التحكم، وله 3 قيم ممكنة:
// - "contains"      (شامل، ده الافتراضي): الكلمة موجودة في أي مكان من رسالة العميل.
// - "exact_word"     (مطابقة تامة): الكلمة لازم تكون منفصلة بذاتها، مش ملتصقة
//                     بحروف/أرقام تانية (زي "غالي" ماتتفعلش من جوه "غاليه").
// - "exact_message"  (مطابقة الرسالة كاملة): رسالة العميل كلها (من غير علامات
//                     ترقيم) لازم تطابق الكلمة المفتاحية بالحرف.
//
// ⚠️ ملحوظة مهمة: لو الكلمة المفتاحية أرقام بس (زي "65") واختار الأدمن نظام
// "شامل" (الافتراضي)، بنفرض عليها حماية تلقائية: "رقم مش ملتصق برقم تاني قبله
// أو بعده" (بس) - عشان الكلمة المفتاحية "65" متتفعّلش غلط من جوه رقم تليفون
// العميل (زي 01065xxxxxx). الحماية دي بتفحص الأرقام بس، مش الحروف، عشان
// "65بوصة" أو "32سم" (من غير مسافة، شائع في كتابة العملاء) تفضل تشتغل عادي.
// لو الأدمن اختار صراحة "مطابقة تامة" لرقم معيّن، بنستخدم الحماية الأشمل
// (حرف أو رقم) لأنه اختيار مقصود منه.
function findQuickReplies(customerMessageBody) {
    const normalized = normalizeDigits(customerMessageBody.toLowerCase());
    const matchedReplies = [];

    for (const q of quickRepliesCache) {
        const chosenType = q.matchType || 'contains';
        const keywords = q.trigger
            .split(/[,،]/)
            .map(k => normalizeDigits(k.trim().toLowerCase()))
            .filter(Boolean);

        const matched = keywords.some(keyword => {
            const isNumeric = /^\d+$/.test(keyword);

            if (chosenType === 'contains' && isNumeric) {
                // الحماية الافتراضية للأرقام: رقم مش ملتصق برقم تاني بس (مش حروف)
                const regex = new RegExp(`(?<!\\d)${escapeRegex(keyword)}(?!\\d)`);
                return regex.test(normalized);
            }
            if (chosenType === 'exact_message') {
                return stripPunctuationForExactMessage(normalized) === stripPunctuationForExactMessage(keyword);
            }
            if (chosenType === 'exact_word') {
                // \p{L} = أي حرف (عربي أو إنجليزي)، \p{N} = أي رقم - بنتأكد إن
                // الكلمة مش ملتصقة بحرف أو رقم قبلها أو بعدها. ده اختيار مقصود
                // من الأدمن، فبنطبّق الحماية الأشمل زي ما هي.
                const regex = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(keyword)}(?![\\p{L}\\p{N}])`, 'u');
                return regex.test(normalized);
            }
            // "contains" (شامل) لكلمة نصية - نفس المنطق القديم
            return normalized.includes(keyword);
        });

        if (matched) {
            matchedReplies.push({ reply: q.reply, trigger: q.trigger });
        }
    }
    return matchedReplies;
}

// ==================== سجل استهلاك التوكنز (لمتابعة تكلفة Gemini حركة بحركة) ====================
// كل مرة البوت يرد (سواء رد سريع جاهز أو رد من Gemini)، بنسجل سطر هنا فيه:
// وقت الحركة، رقم العميل، نوع الرد (رد سريع / رد ذكاء اصطناعي)، وعدد التوكنز
// المستهلكة فعليًا (لو رد سريع، التوكنز = 0 لأنه مفيهوش أي اتصال بجيميناي خالص).
// ده بيظهر في تاب "📊 سجل استهلاك التوكنز" تحت بوت الواتساب في لوحة التحكم.
const BOT_USAGE_LOG_MAX_ENTRIES = 5000; // حد أقصى للسجلات المحفوظة عشان قاعدة البيانات متكبرش من غير حد

async function logBotUsage({ chatKey, phone, type, modelName = '', promptTokens = 0, completionTokens = 0, thoughtsTokens = 0, totalTokens = 0, trigger = '', message = '' }) {
    try {
        const logRef = db.ref('/botUsageLog');
        const newEntryRef = logRef.push();
        await newEntryRef.set({
            timestamp: ServerValue.TIMESTAMP,
            phone: phone || '',
            chatKey: chatKey || '',
            type, // 'quick_reply' أو 'ai'
            modelName, // اسم موديل جيميناي المستخدم في الحركة دي (فاضي لو رد سريع)
            trigger, // الكلمة/الكلمات المفتاحية اللي اتفعّلت (فاضي لو رد ذكاء اصطناعي)
            message, // نص رسالة العميل (بيتسجل بس لو النوع 'ai' - عشان نلاقي الأسئلة المتكررة اللي محتاجة رد سريع جديد)
            promptTokens,
            completionTokens,
            thoughtsTokens, // توكنز "التفكير الداخلي" المخفية - المفروض تفضل 0 بعد قفل thinkingConfig
            totalTokens
        });

        // تنظيف السجلات القديمة الزيادة عن الحد الأقصى (زي منطق حفظ المحادثات بالظبط)
        const snapshot = await logRef.orderByKey().once('value');
        const entries = snapshot.val();
        if (entries) {
            const keys = Object.keys(entries);
            if (keys.length > BOT_USAGE_LOG_MAX_ENTRIES) {
                const keysToDelete = keys.slice(0, keys.length - BOT_USAGE_LOG_MAX_ENTRIES);
                const updates = {};
                keysToDelete.forEach(key => { updates[key] = null; });
                await logRef.update(updates);
            }
        }
    } catch (error) {
        console.error('خطأ في تسجيل استهلاك التوكنز:', error.message);
    }
}

// ==================== نظام الإيقاف المؤقت لكل عميل + منع تكرار المعالجة ====================
// customerNumber -> timestamp (ms) لحد امتى البوت يفضل واقف مع العميل ده
const pausedCustomers = new Map();

// تتبع لو البوت لسه مستني "إيكو" رده الخاص يرجعله من واتساب كـ fromMe، عشان
// مايفهمهوش غلط إنه رد يدوي منك ويوقف نفسه بالغلط. بنستخدم علامة وقت بسيطة بدل
// مقارنة النص بالحرف، لأن واتساب أحيانًا بيغيّر تفاصيل صغيرة في النص وقت الإرسال
// (مسافات، ترميز حروف...) فمقارنة النص بالظبط كانت بتفشل والبوت كان بيوقف نفسه
// بنفسه غلط بعد كل رد يبعته.
const pendingBotEcho = new Map(); // chatKey -> expiryTimestamp
// شبكة أمان إضافية: بنسجل نص آخر رسالة بعتناها فعليًا لكل عميل. لو الإيكو
// وصل متأخر شوية وفوّت النافذة الزمنية بتاعة pendingBotEcho (حصل مرة بسبب
// تضارب في توقيت واتساب Multi-Device)، بنقارن نص "الرد اليدوي" المفترض
// بآخر رد بعته البوت فعليًا - لو مطابق، يبقى أكيد إيكو للبوت مش رد يدوي حقيقي.
const lastBotReplyText = new Map(); // chatKey -> text
const BOT_ECHO_WINDOW_MS = 15 * 1000; // 15 ثانية كافية جدًا لاستقبال الإيكو من واتساب

function expectBotEcho(chatKey) {
    const expiry = Date.now() + BOT_ECHO_WINDOW_MS;
    pendingBotEcho.set(chatKey, expiry);
    // تنظيف تلقائي بعد انتهاء النافذة الزمنية - بدل ما نمسح العلامة من أول
    // استخدام (اللي كان بيسبب مشكلة مع تكرار حدث message_create بتاع واتساب
    // Multi-Device لنفس الرسالة)، بنسيبها شغالة لحد ما الوقت يخلص فعليًا،
    // عشان أي "إيكو" مكرر لنفس الرد في نفس النافذة يتجاهل صح من غير ما يتفهم
    // غلط كأنه رد يدوي منك ويوقف البوت بالغلط.
    setTimeout(() => {
        if (pendingBotEcho.get(chatKey) === expiry) {
            pendingBotEcho.delete(chatKey);
        }
    }, BOT_ECHO_WINDOW_MS).unref?.();
}

function rememberBotReply(chatKey, text) {
    lastBotReplyText.set(chatKey, text);
    setTimeout(() => {
        if (lastBotReplyText.get(chatKey) === text) lastBotReplyText.delete(chatKey);
    }, BOT_ECHO_WINDOW_MS * 4).unref?.(); // مهلة أطول من نافذة الإيكو العادية كشبكة أمان
}

function consumeBotEchoIfPending(chatKey) {
    const expiry = pendingBotEcho.get(chatKey);
    if (!expiry) return false;
    return Date.now() <= expiry; // من غير ما نمسحها فورًا - تفضل صالحة لحد ما تنتهي المهلة
}

// منع معالجة نفس الرسالة أكتر من مرة (بيحصل أحيانًا مع واتساب Multi-Device)
const processedMessageIds = new Set();
const PROCESSED_IDS_TTL_MS = 10 * 60 * 1000; // 10 دقايق كفاية

function markProcessed(id) {
    processedMessageIds.add(id);
    setTimeout(() => processedMessageIds.delete(id), PROCESSED_IDS_TTL_MS).unref?.();
}

function isCustomerPaused(chatKey) {
    const until = pausedCustomers.get(chatKey);
    if (!until) return false;
    if (Date.now() >= until) {
        pausedCustomers.delete(chatKey);
        return false;
    }
    return true;
}

// إيقاف مؤقت بمدة محددة (بيحصل لما الأدمن يرد يدوي بنفسه على العميل)
function pauseCustomer(chatKey) {
    const minutes = Number(botSettingsCache.pauseMinutes) || 0;
    if (minutes <= 0) return; // 0 يعني الميزة مقفولة
    pausedCustomers.set(chatKey, Date.now() + minutes * 60 * 1000);
    console.log(`⏸️ تم إيقاف الرد الآلي مؤقتًا (${minutes} دقيقة) - رد أدمن يدوي.`);
}

// إيقاف "غير محدود" لحد ما الأدمن يرد يدوي بنفسه - بيتفعّل لما البوت نفسه
// يقرر إنه محتاج يحوّل العميل لموظف بشري (شوف HANDOVER_MARKER تحت).
function pauseCustomerIndefinitely(chatKey) {
    // تاريخ بعيد جدًا في المستقبل (100 سنة) بيعتبر عمليًا "إيقاف دائم" لحد ما نلغيه يدوي
    pausedCustomers.set(chatKey, Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);
    console.log('🚫 تم تحويل العميل لموظف بشري - البوت هيسكت تمامًا لحد ما ترد انت بنفسك.');
}

// عميل معتبر "متحوّل لموظف بشري" لو مدة الإيقاف المتبقية له أكتر من سنة (زي ما بنحطها في pauseCustomerIndefinitely)
function isHandedOver(chatKey) {
    const until = pausedCustomers.get(chatKey);
    if (!until) return false;
    return (until - Date.now()) > 365 * 24 * 60 * 60 * 1000;
}

// ==================== المتابعة التلقائية للعملاء الساكتين ====================
// كل ما إحنا (بوت أو أدمن يدويًا) نرد على عميل، بنسجل توقيت آخر رد بتاعنا في
// /followUps/{chatKey}. لو العميل فضل ساكت للمدة المحددة من لوحة التحكم، بنبعتله
// رسالة متابعة ثابتة (من غير أي جيميناي) مرة واحدة بس. لو العميل رد أي وقت،
// بنمسح المتابعة بتاعته فورًا. العملاء المتحوّلين لموظف بشري مستبعدين تمامًا.
function markOutgoingForFollowUp(chatKey, phone) {
    if (isHandedOver(chatKey)) return;
    db.ref('/followUps/' + encodeURIComponent(chatKey)).set({
        chatKey, phone: phone || '', lastOutgoingAt: Date.now(), notified: false
    }).catch(() => {});
}

function clearFollowUp(chatKey) {
    db.ref('/followUps/' + encodeURIComponent(chatKey)).remove().catch(() => {});
}

async function runFollowUpCheck() {
    if (!botSettingsCache.followUpEnabled) return;
    try {
        const snap = await db.ref('/followUps').once('value');
        const all = snap.val() || {};
        const thresholdMs = (botSettingsCache.followUpHours || 8) * 60 * 60 * 1000;
        const now = Date.now();

        for (const key of Object.keys(all)) {
            const entry = all[key];
            if (!entry || entry.notified) continue;
            if (isHandedOver(entry.chatKey)) { clearFollowUp(entry.chatKey); continue; }
            if (now - (entry.lastOutgoingAt || 0) < thresholdMs) continue;

            try {
                expectBotEcho(entry.chatKey);
                await client.sendMessage(entry.chatKey, botSettingsCache.followUpMessage);
                await db.ref('/followUps/' + encodeURIComponent(entry.chatKey)).update({ notified: true });
                logBotUsage({ chatKey: entry.chatKey, phone: entry.phone, type: 'follow_up' });
                console.log(`🔁 اتبعتت رسالة متابعة للعميل ${entry.phone}`);
            } catch (err) {
                console.log('⚠️ تعذر إرسال متابعة لـ ' + entry.phone + ': ' + err.message);
            }

            // تأخير عشوائي بسيط بين كل متابعة والتانية عشان مايبقاش شكله جماعي/سبام
            await new Promise(r => setTimeout(r, 20000 + Math.random() * 40000));
        }
    } catch (err) {
        console.log('⚠️ خطأ أثناء فحص المتابعات: ' + err.message);
    }
}
setInterval(runFollowUpCheck, 10 * 60 * 1000); // بيتفحص كل 10 دقايق

// ==================== إرسال جماعي من لوحة التحكم (بحث في المحادثات) ====================
// لوحة الأدمن بتكتب طلب إرسال في /broadcastQueue/{id} برسالة ثابتة + قائمة أرقام
// (بعد ما الأدمن يدور ويعلّم عليهم يدويًا في المحادثات). البوت بيعالجهم واحد واحد
// بفاصل زمني عشوائي بينهم (30-90 ثانية) عشان الإرسال يفضل شكله طبيعي مش جماعي.
let broadcastQueueBusy = false;
db.ref('/broadcastQueue').on('child_added', async (snap) => {
    const item = snap.val();
    if (!item || item.status !== 'pending') return;
    if (broadcastQueueBusy) {
        // لو فيه طلب شغال بالفعل، الطلب ده هيتلقط تلقائي في الدورة اللي بعدها
        // (Firebase بيفضل يبعت child_added لحد ما نغيّر status بتاعه)
        return;
    }
    broadcastQueueBusy = true;
    const queueRef = db.ref('/broadcastQueue/' + snap.key);
    await queueRef.update({ status: 'sending' });

    const recipients = Array.isArray(item.recipients) ? item.recipients : [];
    let sentCount = 0;
    for (const r of recipients) {
        const chatId = String(r.chatKey || r.phone || '').includes('@') ? r.chatKey : `${r.phone}@c.us`;
        try {
            expectBotEcho(chatId);
            await client.sendMessage(chatId, item.message);
            sentCount++;
            logBotUsage({ chatKey: chatId, phone: r.phone || '', type: 'broadcast' });
        } catch (err) {
            console.log('⚠️ تعذر إرسال رسالة جماعية لـ ' + (r.phone || chatId) + ': ' + err.message);
        }
        await queueRef.update({ sentCount });
        await new Promise(res => setTimeout(res, 30000 + Math.random() * 60000));
    }

    await queueRef.update({ status: 'done', completedAt: Date.now() });
    broadcastQueueBusy = false;
});


// ==================== حدود أمان لمحتوى الرسائل ====================
const MAX_MESSAGE_CHARS = 1500;

// وقت تشغيل البوت - أي رسالة (حتى لو وصلت كـ "جديدة") تاريخها قبل اللحظة دي
// معناها إنها رسالة قديمة راجعة من عملية مزامنة الموبايل مع واتساب وليست رسالة حقيقية جديدة.
// ده بيمنع إعادة الرد على كل المحادثات القديمة في كل مرة نعمل فيها تشغيل جديد للبوت.
const BOT_START_TIMESTAMP_SECONDS = Math.floor(Date.now() / 1000);

// ==================== إعداد واتساب ====================
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      executablePath: '/usr/bin/chromium-browser',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu'
        ]
    }
});

client.on('qr', function (qr) {
    console.log('امسح الكود ده من موبايلك (واتساب > الأجهزة المرتبطة):');
    qrcode.generate(qr, { small: true });
});

client.on('ready', function () {
    console.log('✅ البوت شغال ومتصل بالواتساب بنجاح!');
    console.log(`🤖 الموديل المستخدم حاليًا: ${GEMINI_MODEL_NAME}`);
});

// ==================== حارس البراوزر (Watchdog) ====================
// أحيانًا Chromium بيقفل نفسه من جوه (crash داخلي في الصفحة) من غير ما
// الـ process الأساسي بتاع Node يوقع، فـ pm2 مش بيلاحظ أي مشكلة ويسيب
// البوت "شغال" شكليًا (status: online) بس هو فعليًا مش قادر يبعت ولا
// يستقبل أي رسايل حقيقية (بيظهر بخطأ "detached Frame" في اللوج).
// الحارس ده بيتأكد كل دقيقتين إن صفحة واتساب لسه شغالة وبترد فعليًا،
// ولو لاقاها اتقفلت أو متجمدة، بيقفل الـ process بنفسه (process.exit)
// عشان pm2 يعيد تشغيله تلقائيًا بجلسة نضيفة من غير أي تدخل يدوي.
const BROWSER_WATCHDOG_INTERVAL_MS = 2 * 60 * 1000; // فحص كل دقيقتين

setInterval(async () => {
    try {
        const page = client.pupPage;
        if (!page || page.isClosed()) {
            console.error('🚨 حارس البراوزر: صفحة واتساب مقفولة أو مش موجودة - إعادة تشغيل البوت...');
            process.exit(1);
        }
        // فحص إضافي: نتأكد إن الصفحة فعلاً بترد ومش "متجمدة" من جوه
        await page.evaluate(() => true);
    } catch (err) {
        console.error('🚨 حارس البراوزر: تعذر التواصل مع صفحة واتساب (' + err.message + ') - إعادة تشغيل البوت...');
        process.exit(1);
    }
}, BROWSER_WATCHDOG_INTERVAL_MS);

// ==================== تنبيه صاحب المتجر على واتساب ====================
// بيبعت رسالة لرقم صاحب المتجر (لو محدد في لوحة التحكم) - مستخدمة في حالتين:
// تحويل عميل لموظف بشري، وتوقف جيميناي عن الرد بشكل متكرر (عطل محتمل).
async function notifyOwner(text) {
    const ownerNumber = (botSettingsCache.ownerNumber || '').replace(/\D/g, '');
    if (!ownerNumber) return; // مفيش رقم محدد في لوحة التحكم - يتجاهل بهدوء
    try {
        expectBotEcho(`${ownerNumber}@c.us`); // عشان النسخة اللي هترجع كـ fromMe متتفسّرش غلط كـ "رد يدوي" وتوقف البوت مع رقمك انت
        await client.sendMessage(`${ownerNumber}@c.us`, text);
    } catch (err) {
        console.log('⚠️ تعذر إرسال تنبيه لصاحب المتجر: ' + err.message);
    }
}

// ==================== مواعيد الشغل ====================
// بيتحقق إن الوقت الحالي (بتوقيت القاهرة) داخل مواعيد الشغل المحددة في لوحة
// التحكم. لو معطّلة الميزة (workHoursEnabled=false)، البوت بيرد 24 ساعة عادي.
function isWithinWorkHours() {
    if (!botSettingsCache.workHoursEnabled) return true;
    const now = new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo', hour12: false });
    const currentMinutes = (function () {
        const d = new Date(now);
        return d.getHours() * 60 + d.getMinutes();
    })();
    const toMinutes = (t) => {
        const [h, m] = String(t).split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
    };
    const start = toMinutes(botSettingsCache.workHoursStart);
    const end = toMinutes(botSettingsCache.workHoursEnd);
    if (start === end) return true; // إعداد ناقص/متطابق - نتجاهل القيد بدل ما نوقف البوت غلط
    if (start < end) return currentMinutes >= start && currentMinutes < end;
    return currentMinutes >= start || currentMinutes < end; // مواعيد بتعدي منتصف الليل
}

// عشان مانبعتش رسالة "بره مواعيد الشغل" مع كل رسالة من نفس العميل، بنبعتها
// مرة واحدة بس كل ساعة لكل عميل.
const lastOffHoursReply = new Map();
function shouldSendOffHoursMessage(chatKey) {
    const last = lastOffHoursReply.get(chatKey) || 0;
    if (Date.now() - last < 60 * 60 * 1000) return false;
    lastOffHoursReply.set(chatKey, Date.now());
    return true;
}

// ==================== حد أقصى للرسائل (Rate Limit) ====================
// بيحمي من استهلاك توكنز بالبلاش لو عميل بعت رسايل كتير جدًا ورا بعض
// (قصدًا أو بالغلط) - أي رسالة زيادة عن الحد بيتم تجاهلها بهدوء من غير رد.
const messageTimestamps = new Map(); // chatKey -> [timestamps]
function isRateLimited(chatKey) {
    const limit = botSettingsCache.rateLimitPerMinute;
    if (!limit || limit <= 0) return false;
    const now = Date.now();
    const windowMs = 60 * 1000;
    const timestamps = (messageTimestamps.get(chatKey) || []).filter(t => now - t < windowMs);
    timestamps.push(now);
    messageTimestamps.set(chatKey, timestamps);
    return timestamps.length > limit;
}

// ==================== تتبّع أعطال جيميناي المتكررة ====================
// لو جيميناي وقع 3 مرات ورا بعض (مش رسائل عاديين مختلفين - نفس السبب
// المتكرر)، بنبعت تنبيه واحد لصاحب المتجر عشان يعرف فيه مشكلة (رصيد خلص،
// تغيير في الـ API...) بدل ما البوت يسكت بصمت مع كل العملاء.
let consecutiveGeminiErrors = 0;
let ownerAlreadyNotifiedForErrors = false;
async function trackGeminiError(err) {
    consecutiveGeminiErrors++;
    if (consecutiveGeminiErrors >= 3 && !ownerAlreadyNotifiedForErrors) {
        ownerAlreadyNotifiedForErrors = true;
        await notifyOwner(`⚠️ تنبيه: البوت واجه ${consecutiveGeminiErrors} أعطال متتالية في الاتصال بجيميناي.\nآخر خطأ: ${err.message}\nممكن يكون رصيد الـ API خلص أو فيه مشكلة في المفتاح - يستاهل تتشيك بسرعة.`);
    }
}
function resetGeminiErrorStreak() {
    consecutiveGeminiErrors = 0;
    ownerAlreadyNotifiedForErrors = false;
}

// نستخدم message_create عشان نقدر نلتقط ردودنا احنا (fromMe) ونفرقها عن ردود العميل،
// وده اللي بيسمحلنا نطبق ميزة "وقف تلقائي لما ترد بنفسك".
client.on('message_create', async function (message) {
    try {
        if (message.from.includes('broadcast') || message.to?.includes('broadcast')) {
            return;
        }

        // تجاهل رسائل الجروبات تمامًا (البوت مخصص للشات الفردي مع العملاء بس)
        if (message.from.endsWith('@g.us') || message.to?.endsWith('@g.us')) {
            return;
        }

        // تجاهل أي رسالة قديمة راجعة من مزامنة واتساب وقت تشغيل البوت
        // (زي المحادثات القديمة اللي بترجع تظهر كأنها جديدة أول ما تشغّل node index.js)
        if (typeof message.timestamp === 'number' && message.timestamp < BOT_START_TIMESTAMP_SECONDS) {
            return;
        }

        const msgId = message.id?._serialized;

        // ---------- حالة 1: الرسالة دي رد مني أنا (fromMe) ----------
        if (message.fromMe) {
            const chatKeyOfThisReply = message.id?.remote;

            if (chatKeyOfThisReply && (chatKeyOfThisReply.endsWith('@newsletter') || chatKeyOfThisReply.endsWith('@g.us') || chatKeyOfThisReply.endsWith('@broadcast'))) {
                return;
            }

            // لو الرسالة دي هي رد البوت نفسه (بعتناها إحنا برمجيًا) نتجاهلها تمامًا
            if (chatKeyOfThisReply && consumeBotEchoIfPending(chatKeyOfThisReply)) {
                return;
            }

            // شبكة أمان: لو نص الرسالة مطابق تمامًا لآخر رد بعته البوت فعليًا لنفس
            // الشات، يبقى برضه إيكو متأخر مش رد يدوي حقيقي - حتى لو النافذة الزمنية
            // الأساسية فاتت لأي سبب (تضارب توقيت واتساب Multi-Device مثلاً).
            if (chatKeyOfThisReply && lastBotReplyText.get(chatKeyOfThisReply) === (message.body || '')) {
                return;
            }

            // غير كده، يبقى ده رد يدوي مني من الموبايل على عميل -> نوقف البوت مؤقتًا مع العميل ده
            if (chatKeyOfThisReply) {
                pauseCustomer(chatKeyOfThisReply);
                markOutgoingForFollowUp(chatKeyOfThisReply, chatKeyOfThisReply.replace('@c.us', ''));
            }
            return;
        }

        // ---------- حالة 2: رسالة عميل عادية ----------

        // نتعامل مع الرسائل النصية العادية بس. أي حاجة تانية (صور، فيديو، ستيكرز،
        // كروت جهات اتصال VCard، مستندات...) بتتجاهل تمامًا ومبتوصلش لجيميناي،
        // لأنها ممكن تحمل بيانات ضخمة (زي صورة Base64 جوه كارت جهة اتصال)
        // وكانت السبب الأساسي في استهلاك الفلوس.
        if (message.type !== 'chat') {
            // إشعارات نظام من واتساب (notification_template, e2e_notification, ...) بتتجاهل بصمت
            // من غير ما تتطبع في اللوج عشان متكترش عليك من غير داعي - مفيش أي استهلاك فلوس عليها أصلًا.
            return;
        }

        const body = (message.body || '').trim();

        // رسالة فاضية (ممكن تيجي من بعض أنواع الميديا) - متبعتش برومبت فاضي لجيميناي
        if (!body) {
            console.log('⏭️ تم تجاهل رسالة فاضية.');
            return;
        }

        // حماية إضافية: أي نص أطول من الحد المسموح بيتجاهل بدل ما يتبعت كامل لجيميناي
        if (body.length > MAX_MESSAGE_CHARS) {
            console.log(`⏭️ تم تجاهل رسالة طويلة جدًا (${body.length} حرف) - غالبًا مش رسالة عميل حقيقية.`);
            return;
        }

        // منع التكرار (نفس الرسالة ممكن تتفعّل أكتر من مرة في بعض الحالات)
        if (msgId) {
            if (processedMessageIds.has(msgId)) {
                console.log('⚠️ تم تجاهل رسالة مكررة:', msgId);
                return;
            }
            markProcessed(msgId);
        }

        const contact = await message.getContact();
        const realNumber = contact.id.user;
        const chatKey = message.id?.remote || (message.from ? message.from.split('@')[0] : realNumber);

        // تجاهل تام لتحديثات القنوات (@newsletter) والمجموعات (@g.us) والقوائم
        // البثّية القديمة (@broadcast) - دول مش محادثات عملاء حقيقية خالص، ومينفعش
        // نرد عليهم أو نسجلهم كمحادثة أو نبعتلهم متابعة.
        if (chatKey.endsWith('@newsletter') || chatKey.endsWith('@g.us') || chatKey.endsWith('@broadcast')) {
            return;
        }

        console.log('رسالة جديدة من ' + realNumber + ': ' + body);
        clearFollowUp(chatKey); // العميل رد - يتلغي أي متابعة معلّقة له

        if (!botSettingsCache.isActive) {
            console.log('⏸️ الرد الآلي متوقف من لوحة التحكم، تم تجاهل الرد.');
            return;
        }

        if (isCustomerPaused(chatKey)) {
            console.log(`⏸️ البوت متوقف مع العميل ${realNumber}، تم تجاهل الرد.`);
            return;
        }

        // حد أقصى للرسائل في الدقيقة - حماية من استهلاك توكنز بالبلاش
        if (isRateLimited(chatKey)) {
            console.log(`🚫 تم تجاوز الحد الأقصى للرسائل من ${realNumber} - تم تجاهل الرسالة دي.`);
            return;
        }

        // بره مواعيد الشغل (لو الميزة مفعّلة من لوحة التحكم)
        if (!isWithinWorkHours()) {
            if (shouldSendOffHoursMessage(chatKey)) {
                expectBotEcho(chatKey);
                rememberBotReply(chatKey, botSettingsCache.offHoursMessage);
                await message.reply(botSettingsCache.offHoursMessage);
                await saveConversation(chatKey, body, botSettingsCache.offHoursMessage);
            }
            return;
        }

        // فحص الردود السريعة الجاهزة الأول - لو فيه أي تطابق (حتى لو أكتر من واحد)،
        // نرد بيهم كلهم مجمّعين من غير أي اتصال بجيميناي خالص (توفير كامل للتوكن).
        const quickReplies = findQuickReplies(body);
        if (quickReplies.length > 0) {
            const combinedReply = quickReplies.map(q => q.reply).join('\n\n');
            const matchedTriggers = quickReplies.map(q => q.trigger).join(' | ');
            console.log(`⚡ رد سريع جاهز (${quickReplies.length} تطابق، من غير استدعاء جيميناي): ` + combinedReply);
            expectBotEcho(chatKey);
            rememberBotReply(chatKey, combinedReply);
            await message.reply(combinedReply);
            await saveConversation(chatKey, body, combinedReply);
            logBotUsage({ chatKey, phone: realNumber, type: 'quick_reply', trigger: matchedTriggers });
            markOutgoingForFollowUp(chatKey, realNumber);
            return;
        }

        const historyItems = await getRecentHistoryItems(chatKey);

        // بنبني المحادثة كـ "أدوار" حقيقية (عميل/بوت) بدل ما نلخبط كل حاجة في نص واحد -
        // ده بيوضّح للموديل الفرق بين "التعليمات اللي يتبعها" و"كلام حقيقي اتقال في الشات"،
        // وبيقلل جدًا احتمال إنه يسرّب جزء من التعليمات الداخلية كأنه رد على العميل.
        // الردود القديمة (بتاعة البوت) بتتقصّ لملخص قصير لتوفير التوكن، لكن رسائل
        // العميل نفسها بتفضل كاملة زي ما هي دايمًا.
        const contents = [];
        for (const item of historyItems) {
            contents.push({ role: 'user', parts: [{ text: item.message }] });
            contents.push({ role: 'model', parts: [{ text: truncateForHistory(item.reply) }] });
        }
        contents.push({ role: 'user', parts: [{ text: body }] });

        const systemInstructionText = MANDATORY_RULES + botSettingsCache.systemPrompt;

        // بننشئ نسخة موديل بتعليمات النظام دي تحديدًا لكل رسالة (عشان تتحدث لحظيًا
        // مع أي تغيير في البرومبت من لوحة التحكم) - إنشاء الكائن ده محلي وخفيف
        // ومفيهوش أي اتصال بالإنترنت، فمفيش أي تكلفة إضافية عليه.
        const chatModel = genAI.getGenerativeModel({
            model: GEMINI_MODEL_NAME,
            systemInstruction: systemInstructionText
        });

        let result;
        try {
            result = await chatModel.generateContent({
                contents,
                generationConfig: {
                    maxOutputTokens: 1500, // مساحة كبيرة كفاية لرد كامل مفصّل بكل المواصفات والعروض من غير قطع
                    temperature: 0.5, // قللناها من 0.8 عشان نقلل احتمالية اختلاق معلومات (أسعار/مقاسات) مش موجودة في التعليمات - لسه فيها تنويع كفاية في الصياغة
                    // ⚠️ مهم جدًا للتكلفة: الموديلات الحديثة بتـ"فكر" داخليًا قبل ما تكتب الرد (Thinking)،
                    // وده بيستهلك توكنز فعلية بتتحاسب عليها فلوس من غير ما تظهر في الرد النهائي للعميل.
                    // شغلنا البوت ده مصمم لردود مباشرة وقصيرة على أسئلة متجر - مش محتاج أي "تفكير عميق"،
                    // فبنقفل الميزة دي تمامًا عشان نوفر التوكنز المخفية دي بالكامل.
                    thinkingConfig: { thinkingBudget: 0 }
                }
            });
            resetGeminiErrorStreak();
        } catch (geminiError) {
            await trackGeminiError(geminiError);
            throw geminiError; // نسيب المعالجة العامة تحت تتكفل بتسجيل الخطأ زي ما هي
        }

        const candidate = result.response.candidates?.[0];
        let aiReply = result.response.text().trim();

        // استخراج عدد التوكنز الفعلي المستهلك في الحركة دي (طلب + رد) من نفس رد جيميناي،
        // عشان نسجله في سجل الاستهلاك من غير أي استدعاء إضافي أو تكلفة زيادة.
        const usage = result.response.usageMetadata || {};
        logBotUsage({
            chatKey,
            phone: realNumber,
            type: 'ai',
            modelName: GEMINI_MODEL_NAME,
            message: body,
            promptTokens: usage.promptTokenCount || 0,
            completionTokens: usage.candidatesTokenCount || 0,
            thoughtsTokens: usage.thoughtsTokenCount || 0,
            totalTokens: usage.totalTokenCount || 0
        });

        if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
            console.log(`ℹ️ سبب انتهاء الرد: ${candidate.finishReason}`);
        }

        // لو الرد اتقطع لأنه وصل للحد الأقصى، نقصّه لآخر نقطة توقف طبيعية
        // (جملة كاملة، وإلا فاصلة، وإلا آخر كلمة كاملة) بدل ما نسيبه ناقص في نص كلمة.
        if (candidate?.finishReason === 'MAX_TOKENS') {
            let cutIndex = Math.max(
                aiReply.lastIndexOf('.'),
                aiReply.lastIndexOf('!'),
                aiReply.lastIndexOf('؟'),
                aiReply.lastIndexOf('?'),
                aiReply.lastIndexOf('\n')
            );
            if (cutIndex > 10) {
                aiReply = aiReply.slice(0, cutIndex + 1).trim();
            } else {
                // مفيش علامة ترقيم مناسبة - نجرب نقص عند آخر فاصلة
                cutIndex = Math.max(aiReply.lastIndexOf('،'), aiReply.lastIndexOf(','));
                if (cutIndex > 10) {
                    aiReply = aiReply.slice(0, cutIndex).trim() + '.';
                } else {
                    // آخر حل: نقص عند آخر مسافة عشان مايسيبش كلمة مقطوعة نص نص
                    const lastSpace = aiReply.lastIndexOf(' ');
                    if (lastSpace > 10) {
                        aiReply = aiReply.slice(0, lastSpace).trim() + '...';
                    }
                }
            }
        }

        // لو البوت جمع بيانات أوردر كاملة (اسم + رقم + عنوان مفصّل)، هيكون حط علامة
        // سرية في آخر رده - نمسكها هنا، نسجل الأوردر في الشيت، ونشيلها قبل ما
        // الرد يوصل للعميل (العميل أبدًا مايشوفش العلامة دي أو أي جزء منها).
        const orderMarkerIndex = aiReply.indexOf(ORDER_DATA_START);
        if (orderMarkerIndex !== -1) {
            const endIndex = aiReply.indexOf(ORDER_DATA_END, orderMarkerIndex);
            if (endIndex !== -1) {
                const jsonText = aiReply.slice(orderMarkerIndex + ORDER_DATA_START.length, endIndex);
                try {
                    const orderData = JSON.parse(jsonText);
                    if (orderData.name && orderData.phone && orderData.address) {
                        appendOrderRow(orderData);
                    }
                } catch (e) {
                    console.error('تعذّر قراءة بيانات الأوردر (JSON غير صحيح):', e.message);
                }
                // نشيل العلامة بالكامل (من بدايتها لنهايتها) من الرد قبل ما يتبعت للعميل
                aiReply = (aiReply.slice(0, orderMarkerIndex) + aiReply.slice(endIndex + ORDER_DATA_END.length)).trim();
            } else {
                // العلامة اتبتدت بس مكملتش (الرد اتقطع مثلاً) - نقص الرد عندها
                // عشان العلامة أو أي جزء منها مايوصلش للعميل أبدًا.
                aiReply = aiReply.slice(0, orderMarkerIndex).trim();
            }
        }

        // لو البوت قرر إنه محتاج يحوّل العميل لموظف بشري
        if (aiReply.includes(HANDOVER_MARKER)) {
            aiReply = 'تمام، هحولك لأحد زملائنا يرد عليك بالتفاصيل دلوقتي 🙏';
            expectBotEcho(chatKey);
            rememberBotReply(chatKey, aiReply);
            await message.reply(aiReply);
            pauseCustomerIndefinitely(chatKey); // وقف دائم لحد ما ترد انت يدويًا بنفسك
            clearFollowUp(chatKey); // العملاء المتحوّلين مستبعدين تمامًا من المتابعة التلقائية
            await saveConversation(chatKey, body, aiReply);
            notifyOwner(`🔔 عميل محتاج تحويل يدوي!\n📱 ${realNumber}\n💬 آخر رسالة: ${body}`);
            return;
        }

        console.log('رد الذكاء الاصطناعي: ' + aiReply);

        expectBotEcho(chatKey);
        rememberBotReply(chatKey, aiReply);
        await message.reply(aiReply);
        markOutgoingForFollowUp(chatKey, realNumber);

        await saveConversation(chatKey, body, aiReply);
    } catch (error) {
        console.error('خطأ أثناء معالجة الرسالة:', error.message);
    }
});

client.initialize();
