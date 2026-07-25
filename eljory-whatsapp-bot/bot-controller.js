require('dotenv').config({ quiet: true });

// ==================== مراقب التحكم في تشغيل/إيقاف البوت (Bot Controller) ====================
// ⚠️ ده process منفصل تمامًا عن index.js (البوت الأساسي)، وبيتشغّل جنبه بـ pm2
// باسم مختلف (jory-bot-controller). شغله الوحيد: يفضل واقف يراقب أمر بسيط في
// Firebase، ولما تدوس زرار "إيقاف السيرفر" أو "تشغيل السيرفر" من لوحة التحكم،
// هو اللي بينفّذ فعليًا `pm2 stop jory-bot` أو `pm2 start jory-bot` على السيرفر.
//
// ⚠️ ليه محتاجين process منفصل: البوت الأساسي (index.js) لما تقفله بالكامل
// (pm2 stop) مبيقدرش "يسمع" لوحة التحكم تاني عشان يرجع يشتغل - لازم حد تاني
// يفضل صاحي يسمعله. المراقب ده خفيف جدًا (مفيش متصفح Chromium ولا أي معالجة
// تقيلة، بس اتصال خامل بقاعدة البيانات)، فاستهلاكه للسيرفر شبه معدوم.
//
// تشغيله أول مرة على السيرفر:
//   cd /home/ubuntu/jory-bot/eljory-whatsapp-bot
//   pm2 start bot-controller.js --name jory-bot-controller
//   pm2 save
const { initializeApp, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const { execSync } = require('child_process');

const serviceAccount = require('./firebase-service-account.json');

initializeApp({
    credential: cert(serviceAccount),
    databaseURL: 'https://el-jory-store-default-rtdb.firebaseio.com'
});

const db = getDatabase();

// اسم البوت الأساسي في pm2 - لازم يكون مطابق بالظبط لاسمه الحالي
const BOT_PM2_NAME = 'jory-bot';

// بنحتفظ بآخر حالة نفّذناها عشان منكررش نفس الأمر مرتين لو Firebase بعت
// نفس القيمة تاني (بيحصل أحيانًا وقت إعادة الاتصال بقاعدة البيانات)
let lastAppliedState = null;

function runCommand(cmd) {
    try {
        const output = execSync(cmd, { stdio: 'pipe' }).toString().trim();
        console.log(`✅ تم تنفيذ: ${cmd}${output ? '\n' + output : ''}`);
    } catch (err) {
        console.error(`⚠️ فشل تنفيذ: ${cmd}\n${err.message}`);
    }
}

// القيمة في /botSettings/serverPower:
// - 'off'  => البوت الأساسي لازم يكون متوقف تمامًا (pm2 stop)
// - أي حاجة تانية أو فاضي => البوت الأساسي لازم يكون شغال (pm2 start)
db.ref('/botSettings/serverPower').on('value', snap => {
    const desired = snap.val() === 'off' ? 'off' : 'on';
    if (desired === lastAppliedState) return; // نفس الحالة اللي إحنا فيها بالفعل - متجاهلة
    lastAppliedState = desired;

    if (desired === 'off') {
        console.log('🛑 استقبلنا أمر "إيقاف السيرفر بالكامل" من لوحة التحكم - جاري إيقاف jory-bot فعليًا...');
        runCommand(`pm2 stop ${BOT_PM2_NAME}`);
    } else {
        console.log('▶️ استقبلنا أمر "تشغيل البوت" من لوحة التحكم - جاري تشغيل jory-bot فعليًا...');
        runCommand(`pm2 start ${BOT_PM2_NAME}`);
    }
});

console.log('👀 مراقب التحكم في تشغيل/إيقاف البوت شغال وبيراقب لوحة التحكم دلوقتي...');
