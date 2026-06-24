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

// مسار قاعدة البيانات الأساسي كمتغير عام
window.DB_PATH = '/';

// دالة مساعدة عامة لتوحيد أرقام التليفونات في كل المشروع
window.getShortPhone = function(str) {
    return String(str || "").replace(/\D/g, '').slice(-10);
};

console.log("🔥 تمت تهيئة الاتصال بقاعدة بيانات El Jory Store بنجاح!");