// ============================================================================
// ملف الاتصال الأساسي بقاعدة بيانات الجوري ستور (El Jory Store 2.0)
// ============================================================================

const firebaseConfig = {
    apiKey: "AIzaSyBvXHuxrQBF3j3WcpymaHjeLD3_G7tWXOs",
    authDomain: "el-jory-store.firebaseapp.com",
    databaseURL: "https://el-jory-store-default-rtdb.firebaseio.com",
    projectId: "el-jory-store",
    storageBucket: "el-jory-store.firebasestorage.app",
    messagingSenderId: "1050351354804",
    appId: "1:1050351354804:web:fe6fad449de4c0859d68e1"
};

// تهيئة الاتصال بفايربيس
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// تعريف المتغيرات العامة للوصول لقاعدة البيانات
window.db = firebase.database();
if (typeof firebase.storage === 'function') {
    window.storage = firebase.storage();
}

// ⚠️ إضافة مطلوبة عشان قواعد الأمان الجديدة تشتغل صح: تسجيل دخول مجهول
// (Anonymous Auth) تلقائي لأي زائر. العملاء في الموقع بيستخدموا نظام دخول
// مخصص (رقم تليفون + كلمة مرور) مش Firebase Auth الرسمي، فمن غير الخطوة دي
// كانت قواعد الأمان اللي بتطلب "auth != null" (زي التسجيل، حفظ الطلبات،
// تحديث نقاط الولاء) ممكن تمنع العمليات دي أساساً. الكود محمي بالكامل:
// لو الصفحة مش شايلة مكتبة firebase-auth-compat.js، بيتجاهل الخطوة بأمان.
if (typeof firebase.auth === 'function') {
    // ⚠️ إصلاح: كنا بننادي signInAnonymously() فورًا من غير ما ننتظر Firebase
    // يتأكد الأول هل فيه جلسة محفوظة (زي جلسة الأدمن) ولا لأ. ده كان بيسبب
    // تعارض توقيت (race condition): أحيانًا الجلسة المجهولة كانت بتحل محل
    // الجلسة الحقيقية قبل ما تسترجع، فكنت بتضطر تسجل دخول تاني بعد كل ريفريش.
    // دلوقتي بننتظر أول استدعاء لـ onAuthStateChanged (اللي بيحصل بعد ما
    // Firebase يخلص التأكد من الجلسة المحفوظة)، وبس لو مفيش يوزر مسجل خالص
    // بننادي signInAnonymously().
    firebase.auth().onAuthStateChanged(function(user) {
        if (!user) {
            firebase.auth().signInAnonymously().catch(function(error) {
                console.warn('⚠️ تعذر تسجيل الدخول المجهول:', error.message);
            });
        }
    });
}

// مسار قاعدة البيانات الأساسي كمتغير عام
window.DB_PATH = '/';

// دالة مساعدة عامة لتوحيد أرقام التليفونات في كل المشروع
window.getShortPhone = function(str) {
    return String(str || "").replace(/\D/g, '').slice(-10);
};

// دالة موحدة لاستخراج اسم المنطقة من نص العنوان (آخر جزء بعد " - ")
// ⚠️ منقولة هنا (وموجودة كمان في script.js) عشان تبقى متاحة في لوحة الأدمن
// اللي بتحمّل firebase-init.js بس من غير script.js.
window.getRegionFromAddressText = function(addressText) {
    if (!addressText) return "";
    let parts = addressText.split(" - ");
    return parts.length > 1 ? parts[parts.length - 1].trim() : parts[0].trim();
};

// ============================================================================
// ⭐ نظام الضمان — دوال مشتركة (مستخدمة في الأدمن وصفحات العملاء وصفحة التفعيل)
// ============================================================================

// توليد توكن عشوائي فريد لتفعيل ضمان فاتورة معينة (يتحط في رابط/QR الفاتورة)
window.generateWarrantyToken = function() {
    let arr = new Uint8Array(6);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(36)).join('').toUpperCase().slice(0, 8);
};

// توليد كود سري من 6 أرقام (يُطبع على فاتورة العميل الجديد عشان يعمل باسورد لحسابه)
window.generateSecretCode = function() {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// بناء رابط تفعيل الضمان الكامل (Absolute URL) بناءً على مكان استضافة الموقع الحالي
window.buildWarrantyLink = function(token) {
    let basePath = window.location.href.split('?')[0];
    basePath = basePath.substring(0, basePath.lastIndexOf('/') + 1);
    return basePath + 'warranty.html?token=' + token;
};

// حساب مهلة تفعيل الضمان: بتتحسب من تاريخ "تم التوصيل" الفعلي مش من تاريخ الفاتورة،
// عشان منظلمش العميل لو المنتج اتأخر في الطريق قبل ما يوصله. بترجع null لو لسه
// الطلب متسجلش تسليمه أصلاً (يعني لسه معندوش نقطة بداية للمهلة).
window.getWarrantyDeadline = function(order, graceDays) {
    if (!order || !order.deliveredAt) return null;
    let days = parseInt(graceDays) || 3;
    return order.deliveredAt + (days * 24 * 60 * 60 * 1000);
};

// تجهيز عناصر الطلب مع "تجميد" شهور الضمان بتاعة كل منتج وقت البيع نفسه (Snapshot)
// عشان لو الأدمن غيّر مدة الضمان بعدين في المنتج، الفواتير القديمة تفضل زي ما هي.
// بترجع نفس مصفوفة العناصر بعد إضافة warrantyMonths لكل عنصر، مع علم hasWarranty.
window.snapshotItemsWarranty = function(items, allProducts) {
    let hasWarranty = false;
    let newItems = (items || []).map(function(it) {
        let p = (allProducts || []).find(function(x) { return x.id === it.id; });
        let months = (p && parseInt(p.warrantyMonths)) ? parseInt(p.warrantyMonths) : 0;
        if (months > 0) hasWarranty = true;
        return Object.assign({}, it, { warrantyMonths: months });
    });
    return { items: newItems, hasWarranty: hasWarranty };
};

// قراءة مهلة تفعيل الضمان العامة (بالأيام) من إعدادات المتجر، مع قيمة افتراضية 3 أيام
window.getWarrantyGraceDaysSetting = function() {
    let settings = JSON.parse(localStorage.getItem("eljory_loyalty_settings")) || {};
    return parseInt(settings.warrantyGraceDays) || 3;
};

// ⭐ شبكة أمان: الطلبات القديمة (اللي اتعملت قبل تفعيل نظام الضمان، أو قبل ما
// يتم إضافة شهور ضمان للمنتج وقت البيع) مفيهاش warrantyMonths محفوظة جوه
// العنصر أصلاً (undefined). في الحالة دي بس، بنرجع نجيب شهور الضمان الحالية
// من كارت المنتج نفسه بدل ما نفترض إنه بدون ضمان. لو العنصر فيه قيمة محفوظة
// فعلاً (حتى لو صفر) بنحترمها زي ما هي، لأنها كانت قرار وقت البيع نفسه.
window.getEffectiveWarrantyMonths = function(item, allProducts) {
    if (item && item.warrantyMonths !== undefined && item.warrantyMonths !== null) {
        return parseInt(item.warrantyMonths) || 0;
    }
    let p = (allProducts || []).find(function(x) { return x.id === (item ? item.id : null); });
    return (p && parseInt(p.warrantyMonths)) ? parseInt(p.warrantyMonths) : 0;
};

// ⭐ نفس فكرة الـ fallback لكن بترجع بيانات الطلب كله: هل عنده منتجات مضمونة
// فعليًا (سواء كانت محفوظة في الطلب أو لسه بترجع من كارت المنتج الحالي)،
// ورقم توكن الضمان (لو موجود بالفعل على الطلب، أو null لو الطلب قديم قبل
// إضافة الميزة أصلاً ومفيش توكن اتولّد له خالص).
window.getOrderWarrantyItems = function(order, allProducts) {
    return (order && order.items ? order.items : []).filter(function(it) {
        return window.getEffectiveWarrantyMonths(it, allProducts) > 0;
    });
};

console.log("🔥 تمت تهيئة الاتصال بقاعدة بيانات El Jory Store بنجاح!");