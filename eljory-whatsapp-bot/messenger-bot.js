// ==================== بوت ماسنجر الجوري ستور (Facebook Messenger) ====================
// ⚠️ ده ملف منفصل عن index.js (بوت الواتساب) لكن بيشارك معاه نفس قاعدة البيانات
// (Firebase) ونفس إعدادات لوحة التحكم (/botSettings) ونفس منطق الردود السريعة
// وتسجيل الأوردرات وسجل استهلاك التوكنز - يعني بتتحكم فيه من نفس لوحة الأدمن
// بالظبط من غير أي تاب جديد.
//
// ⚠️ الفرق الجوهري عن الواتساب: هنا مفيش أي متصفح Chromium ولا محاكاة - ده
// Webhook رسمي من فيسبوك (Messenger Platform API)، يعني أخف وأثبت بكتير.
//
// ==================== إعداد أول مرة (لازم تعمله انت بنفسك) ====================
// 1) اعمل صفحة فيسبوك (Facebook Page) للمتجر لو مفيش.
// 2) روح https://developers.facebook.com واعمل App جديد، ضيف فيه منتج "Messenger".
// 3) من صفحة إعدادات Messenger في الـ App:
//    - اربط الصفحة، وهيديك "Page Access Token" - حطه في .env باسم MESSENGER_PAGE_ACCESS_TOKEN
//    - اختار "Verify Token" من عندك (أي نص سري تختاره انت) - حطه في .env باسم MESSENGER_VERIFY_TOKEN
// 4) في نفس الصفحة، هتحتاج تسجل Webhook URL بالشكل:
//      https://<الدومين أو IP بتاعك>/webhook/messenger
//    ⚠️ لازم يكون HTTPS شغال (فيسبوك بيرفض أي webhook من غير SSL) - لو معندكش
//    شهادة، استخدم Let's Encrypt (certbot) مجاني وسهل على Oracle Cloud.
// 5) subscribe الـ App على events: messages, messaging_postbacks
//
// ==================== ملفات .env المطلوبة ====================
// MESSENGER_PAGE_ACCESS_TOKEN=EAAxxxxxxxxxxxxx
// MESSENGER_VERIFY_TOKEN=اي-نص-سري-تختاره-انت

const crypto = require('crypto');

// ==================== ثوابت ====================
const MESSENGER_API_BASE = 'https://graph.facebook.com/v21.0/me/messages';
const PAGE_ACCESS_TOKEN = process.env.MESSENGER_PAGE_ACCESS_TOKEN || '';
const VERIFY_TOKEN = process.env.MESSENGER_VERIFY_TOKEN || '';

// بادئة ثابتة بنحطها على أي chatKey جاي من الماسنجر، عشان نفرّقه عن عملاء
// الواتساب في نفس قاعدة البيانات (/conversations, /followUps, /botOrdersLog...)
// من غير أي تعارض حتى لو نفس الشخص بيكلم المتجر من الاتنين.
const MESSENGER_KEY_PREFIX = 'fb_';

// منع معالجة نفس الرسالة مرتين (فيسبوك أحيانًا بيبعت نفس الـ webhook أكتر من مرة)
const processedMessengerIds = new Set();
const PROCESSED_IDS_TTL_MS = 10 * 60 * 1000;
function markProcessed(id) {
    processedMessengerIds.add(id);
    setTimeout(() => processedMessengerIds.delete(id), PROCESSED_IDS_TTL_MS).unref?.();
}

// ==================== تجميع الرسائل المجزأة (نفس فكرة الواتساب بالظبط) ====================
const pendingMessengerBuffers = new Map();
const MESSAGE_BUFFER_DELAY_MS = 25 * 1000;
const MESSAGE_BUFFER_MAX_WAIT_MS = 60 * 1000;

// ==================== الدالة الرئيسية اللي بتوصلها كل الحاجات المشتركة من index.js ====================
// عشان منكررش منطق Gemini/الردود السريعة/الأوردرات مرتين، الملف ده مبني على إنك
// بتبعتله "أدوات" جاهزة من index.js (شوف طريقة الربط في التعليقات آخر الملف).
function createMessengerBot(deps) {
    const {
        db,                      // مرجع Firebase database (نفس getDatabase() المستخدم في index.js)
        ServerValue,             // من 'firebase-admin/database'
        botSettingsCache,        // نفس الكائن المُحدَّث تلقائيًا من /botSettings في index.js
        quickRepliesCache,       // نفس المصفوفة المُحدَّثة تلقائيًا من /botSettings/quickReplies
        findQuickReplies,        // دالة findQuickReplies(body) من index.js
        isClosingMessage,        // دالة isClosingMessage(body) من index.js
        appendOrderRow,          // دالة appendOrderRow(order) من index.js
        logBotUsage,              // دالة logBotUsage({...}) من index.js
        saveConversation,        // دالة saveConversation(chatKey, msg, reply) من index.js
        getRecentHistoryItems,   // دالة getRecentHistoryItems(chatKey) من index.js
        truncateForHistory,      // دالة truncateForHistory(text) من index.js
        genAI,                   // كائن GoogleGenerativeAI من index.js
        GEMINI_MODEL_NAME,       // اسم موديل Gemini من index.js
        MANDATORY_RULES,         // ثابت التعليمات الإلزامية من index.js
        HANDOVER_MARKER,         // ثابت علامة التحويل من index.js
        ORDER_DATA_START,
        ORDER_DATA_END,
        markOutgoingForFollowUp, // دالة من index.js
        clearFollowUp,           // دالة من index.js
        pauseCustomer,           // دالة من index.js (إيقاف مؤقت لو حصل رد يدوي - اختياري هنا)
        isCustomerPaused,        // دالة من index.js
        isHandedOver,            // دالة من index.js
        pauseCustomerIndefinitely, // دالة من index.js
        notifyOwner              // دالة notifyOwner(text) من index.js
    } = deps;

    // ---------- إرسال نص للعميل عن طريق Messenger Send API ----------
    async function sendMessengerText(recipientPsid, text) {
        try {
            const res = await fetch(`${MESSENGER_API_BASE}?access_token=${PAGE_ACCESS_TOKEN}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: { id: recipientPsid },
                    message: { text },
                    messaging_type: 'RESPONSE'
                })
            });
            const data = await res.json();
            if (data.error) {
                console.error('⚠️ خطأ في إرسال رسالة ماسنجر:', JSON.stringify(data.error));
            }
        } catch (err) {
            console.error('⚠️ فشل الاتصال بـ Messenger Send API:', err.message);
        }
    }

    // ---------- إرسال ميديا (صورة/فيديو/صوت) برابط مباشر - نفس فكرة MessageMedia.fromUrl بتاعة الواتساب ----------
    async function sendMessengerAttachment(recipientPsid, url, type) {
        // فيسبوك بيقبل: image, video, audio, file
        const fbType = (type === 'audio') ? 'audio' : (type === 'video') ? 'video' : 'image';
        try {
            const res = await fetch(`${MESSENGER_API_BASE}?access_token=${PAGE_ACCESS_TOKEN}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: { id: recipientPsid },
                    message: {
                        attachment: { type: fbType, payload: { url, is_reusable: true } }
                    },
                    messaging_type: 'RESPONSE'
                })
            });
            const data = await res.json();
            if (data.error) {
                console.error(`⚠️ تعذر إرسال ملف ميديا (${type}) من رد سريع عن طريق ماسنجر:`, JSON.stringify(data.error));
                notifyOwner(`⚠️ ملحوظة: البوت (ماسنجر) فشل يبعت ملف ميديا للعميل ${recipientPsid} (مشكلة تقنية في إرسال الملف). الرابط: ${url}\nممكن يكون العميل محتاج رد يدوي منك.`);
                return false;
            }
            return true;
        } catch (err) {
            console.error('⚠️ فشل إرسال ميديا عن طريق Messenger:', err.message);
            return false;
        }
    }

    // ---------- تأثير "بيكتب..." (Messenger بيدعمه بنفس فكرة الواتساب) ----------
    async function sendTypingIndicator(recipientPsid, on) {
        try {
            await fetch(`${MESSENGER_API_BASE}?access_token=${PAGE_ACCESS_TOKEN}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: { id: recipientPsid },
                    sender_action: on ? 'typing_on' : 'typing_off'
                })
            });
        } catch (e) {
            // تجاهل بهدوء - مش أساسي
        }
    }

    async function sendReplyNaturally(recipientPsid, replyText) {
        await sendTypingIndicator(recipientPsid, true);
        const baseDelay = 1500 + Math.random() * 2500;
        const lengthBonus = Math.min(replyText.length * 15, 4000);
        await new Promise(r => setTimeout(r, baseDelay + lengthBonus));
        await sendMessengerText(recipientPsid, replyText);
    }

    async function sendMediaSequenceNaturally(recipientPsid, mediaItems, captionText) {
        await sendTypingIndicator(recipientPsid, true);
        await new Promise(r => setTimeout(r, 1500 + Math.random() * 1500));

        if (captionText) {
            await sendMessengerText(recipientPsid, captionText);
            await new Promise(r => setTimeout(r, 1000 + Math.random() * 700));
        }
        for (let i = 0; i < mediaItems.length; i++) {
            const item = mediaItems[i];
            await sendMessengerAttachment(recipientPsid, item.url, item.type);
            if (i < mediaItems.length - 1) {
                await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));
            }
        }
    }

    // ---------- Rate limit بسيط لكل عميل (زي الواتساب) ----------
    const messageTimestamps = new Map();
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

    // ---------- معالجة الرسالة (أو الرسائل المجمّعة) الفعلية ----------
    async function processMessengerMessage(chatKey, psid, body) {
        try {
            if (isCustomerPaused(chatKey)) {
                console.log(`⏸️ البوت متوقف مع عميل الماسنجر ${psid}، تم تجاهل الرد.`);
                return;
            }

            if (isRateLimited(chatKey)) {
                console.log(`🚫 تم تجاوز الحد الأقصى للرسائل من عميل ماسنجر ${psid} - تم تجاهل الرسالة.`);
                return;
            }

            if (isClosingMessage(body)) {
                const closingReply = botSettingsCache.closingMessage;
                console.log(`👋 عميل ماسنجر ${psid} قفل الموضوع بنفسه ("${body}") - رد إغلاق من غير جيميناي.`);
                await sendReplyNaturally(psid, closingReply);
                await saveConversation(chatKey, body, closingReply);
                logBotUsage({ chatKey, phone: psid, type: 'quick_reply', source: 'messenger', trigger: '[إغلاق محادثة - ماسنجر]' });
                return;
            }

            const quickReplies = findQuickReplies(body);
            if (quickReplies.length > 0) {
                const mediaReply = quickReplies.find(q => q.mediaItems && q.mediaItems.length);
                if (mediaReply) {
                    console.log(`⚡ رد سريع بميديا (ماسنجر، ${mediaReply.mediaItems.length} ملف): ${mediaReply.mediaItems.map(m => m.url).join(' | ')}`);
                    await sendMediaSequenceNaturally(psid, mediaReply.mediaItems, mediaReply.reply || '');
                    await saveConversation(chatKey, body, mediaReply.reply || `[${mediaReply.mediaItems.length} ملف ميديا مرسلة]`);
                    logBotUsage({ chatKey, phone: psid, type: 'quick_reply', source: 'messenger', trigger: mediaReply.trigger });
                    markOutgoingForFollowUp(chatKey, psid);
                    return;
                }

                const combinedReply = quickReplies.map(q => q.reply).join('\n\n');
                const matchedTriggers = quickReplies.map(q => q.trigger).join(' | ');
                console.log(`⚡ رد سريع جاهز (ماسنجر، ${quickReplies.length} تطابق): ` + combinedReply);
                await sendReplyNaturally(psid, combinedReply);
                await saveConversation(chatKey, body, combinedReply);
                logBotUsage({ chatKey, phone: psid, type: 'quick_reply', source: 'messenger', trigger: matchedTriggers });
                markOutgoingForFollowUp(chatKey, psid);
                return;
            }

            const historyItems = await getRecentHistoryItems(chatKey);
            const contents = [];
            for (const item of historyItems) {
                contents.push({ role: 'user', parts: [{ text: item.message }] });
                contents.push({ role: 'model', parts: [{ text: truncateForHistory(item.reply) }] });
            }
            contents.push({ role: 'user', parts: [{ text: body }] });

            const systemInstructionText = MANDATORY_RULES + botSettingsCache.systemPrompt;
            const chatModel = genAI.getGenerativeModel({
                model: GEMINI_MODEL_NAME,
                systemInstruction: systemInstructionText
            });

            const result = await chatModel.generateContent({
                contents,
                generationConfig: {
                    maxOutputTokens: 1500,
                    temperature: 0.5,
                    thinkingConfig: { thinkingBudget: 0 }
                }
            });

            let aiReply = result.response.text().trim();
            const usage = result.response.usageMetadata || {};
            logBotUsage({
                chatKey, phone: psid, type: 'ai', source: 'messenger', modelName: GEMINI_MODEL_NAME, message: body,
                promptTokens: usage.promptTokenCount || 0,
                completionTokens: usage.candidatesTokenCount || 0,
                thoughtsTokens: usage.thoughtsTokenCount || 0,
                totalTokens: usage.totalTokenCount || 0
            });

            // استخراج بيانات الأوردر (نفس منطق الواتساب بالظبط)
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
                        console.error('تعذّر قراءة بيانات أوردر ماسنجر (JSON غير صحيح):', e.message);
                    }
                    aiReply = (aiReply.slice(0, orderMarkerIndex) + aiReply.slice(endIndex + ORDER_DATA_END.length)).trim();
                } else {
                    aiReply = aiReply.slice(0, orderMarkerIndex).trim();
                }
            }

            if (aiReply.includes(HANDOVER_MARKER)) {
                aiReply = 'تمام، هحولك لأحد زملائنا يرد عليك بالتفاصيل دلوقتي 🙏';
                await sendReplyNaturally(psid, aiReply);
                pauseCustomerIndefinitely(chatKey);
                clearFollowUp(chatKey);
                await saveConversation(chatKey, body, aiReply);
                notifyOwner(`🔔 عميل ماسنجر محتاج تحويل يدوي!\n👤 PSID: ${psid}\n💬 آخر رسالة: ${body}`);
                return;
            }

            console.log('رد الذكاء الاصطناعي (ماسنجر): ' + aiReply);
            await sendReplyNaturally(psid, aiReply);
            markOutgoingForFollowUp(chatKey, psid);
            await saveConversation(chatKey, body, aiReply);
        } catch (error) {
            console.error('خطأ أثناء معالجة رسالة ماسنجر:', error.message);
        }
    }

    // ---------- تجميع الرسائل المجزأة قبل المعالجة (نفس فكرة الواتساب) ----------
    function bufferMessengerMessage(chatKey, psid, body) {
        let buf = pendingMessengerBuffers.get(chatKey);
        if (!buf) {
            buf = { texts: [], psid, timer: null, maxTimer: null };
            pendingMessengerBuffers.set(chatKey, buf);
            buf.maxTimer = setTimeout(() => flushMessengerBuffer(chatKey), MESSAGE_BUFFER_MAX_WAIT_MS);
            buf.maxTimer.unref?.();
        }
        buf.texts.push(body);
        clearTimeout(buf.timer);
        buf.timer = setTimeout(() => flushMessengerBuffer(chatKey), MESSAGE_BUFFER_DELAY_MS);
        buf.timer.unref?.();
    }

    async function flushMessengerBuffer(chatKey) {
        const buf = pendingMessengerBuffers.get(chatKey);
        if (!buf) return;
        pendingMessengerBuffers.delete(chatKey);
        clearTimeout(buf.timer);
        clearTimeout(buf.maxTimer);

        if (isCustomerPaused(chatKey)) return;

        const combinedBody = buf.texts.join('\n');
        await processMessengerMessage(chatKey, buf.psid, combinedBody);
    }

    // ---------- التحقق من توقيع فيسبوك (اختياري لكن موصى به أمنيًا) ----------
    // فيسبوك بيبعت هيدر X-Hub-Signature-256 ممضي بـ App Secret - بيتأكد إن الطلب
    // فعلاً جاي من فيسبوك مش من حد بيحاول ينتحل شخصيته. لو حابب تفعّلها، حط
    // MESSENGER_APP_SECRET في .env وشيل التعليق عن الفحص في الـ webhook handler.
    function verifySignature(req) {
        const appSecret = process.env.MESSENGER_APP_SECRET || '';
        if (!appSecret) return true; // مش مفعّلة - يتجاهل الفحص
        const signature = req.headers['x-hub-signature-256'];
        if (!signature) return false;
        const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(req.rawBody || '').digest('hex');
        try {
            return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
        } catch (e) {
            return false;
        }
    }

    // ---------- ربط الـ webhook بتطبيق Express ----------
    function attachToExpressApp(app) {
        // خطوة التحقق اللي فيسبوك بيعملها مرة واحدة وقت تسجيل الـ webhook URL
        app.get('/webhook/messenger', (req, res) => {
            const mode = req.query['hub.mode'];
            const token = req.query['hub.verify_token'];
            const challenge = req.query['hub.challenge'];
            if (mode === 'subscribe' && token === VERIFY_TOKEN) {
                console.log('✅ تم التحقق من Webhook الماسنجر بنجاح.');
                res.status(200).send(challenge);
            } else {
                console.error('⚠️ فشل التحقق من Webhook الماسنجر - تأكد من MESSENGER_VERIFY_TOKEN.');
                res.sendStatus(403);
            }
        });

        // استقبال الرسائل الفعلية
        app.post('/webhook/messenger', async (req, res) => {
            // نرد فورًا بـ 200 لفيسبوك (لازم يكون سريع، وإلا فيسبوك بيعتبره فشل ويعيد المحاولة)
            res.status(200).send('EVENT_RECEIVED');

            if (!verifySignature(req)) {
                console.error('⚠️ توقيع Webhook الماسنجر غير صحيح - تم تجاهل الطلب.');
                return;
            }

            const body = req.body;
            if (body.object !== 'page') return;

            for (const entry of (body.entry || [])) {
                for (const event of (entry.messaging || [])) {
                    try {
                        const psid = event.sender?.id;
                        if (!psid) continue;

                        // تجاهل إيكو رسائلنا احنا (لو الصفحة أرسلت بنفسها من مكان تاني)
                        if (event.message?.is_echo) continue;

                        const mid = event.message?.mid;
                        if (mid) {
                            if (processedMessengerIds.has(mid)) continue;
                            markProcessed(mid);
                        }

                        const chatKey = MESSENGER_KEY_PREFIX + psid;

                        // ---------- نص عادي ----------
                        let msgText = (event.message?.text || '').trim();

                        // ---------- مرفقات (صور بس دلوقتي - فويس/فيديو/ملفات بيتجاهلوا زي الأول) ----------
                        if (!msgText && Array.isArray(event.message?.attachments)) {
                            const imgAttachment = event.message.attachments.find(a => a.type === 'image');
                            if (imgAttachment) {
                                // ⚠️ ملحوظة: على عكس الواتساب، هنا مبنعملش OCR/ضغط للصورة دلوقتي -
                                // ده تحسين ممكن يتضاف بعدين بنفس فكرة extractTextFromImage/compressImageForGemini
                                // بتوع index.js (بس هيحتاج تنزيل الصورة من رابط فيسبوك الأول).
                                msgText = '[صورة من العميل عن طريق ماسنجر - مفيش نص نقدر نقرأه منها حاليًا]';
                            } else {
                                console.log('⏭️ تم تجاهل مرفق ماسنجر غير مدعوم حاليًا (فويس/فيديو/ملف).');
                                continue;
                            }
                        }

                        if (!msgText) continue; // (postbacks, delivery receipts, read receipts... بتتجاهل)

                        if (msgText.length > 1500) {
                            console.log(`⏭️ تم تجاهل رسالة ماسنجر طويلة جدًا (${msgText.length} حرف).`);
                            continue;
                        }

                        console.log(`رسالة جديدة من عميل ماسنجر ${psid}: ${msgText}`);
                        clearFollowUp(chatKey);

                        if (!botSettingsCache.isActive) {
                            console.log('⏸️ الرد الآلي متوقف من لوحة التحكم، تم تجاهل رد الماسنجر.');
                            continue;
                        }

                        bufferMessengerMessage(chatKey, psid, msgText);
                    } catch (err) {
                        console.error('خطأ أثناء معالجة حدث ماسنجر:', err.message);
                    }
                }
            }
        });

        console.log('👀 Webhook الماسنجر جاهز على /webhook/messenger');
    }

    return { attachToExpressApp };
}

module.exports = { createMessengerBot };
