// ============================================================================
// محرك السكاشن الاحترافي — El Jory Store | sections-renderer.js
// ============================================================================
(function () {
    'use strict';

    (function injectSectionCSS(){
        if (document.getElementById('jory-sections-css')) return;
        var s = document.createElement('style');
        s.id = 'jory-sections-css';
        s.textContent = `
            .jory-layout-full{width:100%;max-height:440px;overflow:hidden}
            .jory-layout-full .jory-img-box{height:440px}
            .jory-layout-two{display:grid;grid-template-columns:1fr 1fr;gap:6px;border-radius:10px;overflow:hidden}
            .jory-layout-two .jory-img-box{height:280px}
            .jory-layout-three{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;border-radius:10px;overflow:hidden}
            .jory-layout-three .jory-img-box{height:240px}
            .jory-layout-four{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;border-radius:10px;overflow:hidden}
            .jory-layout-four .jory-img-box{height:200px}
            .jory-layout-big2{display:grid;grid-template-columns:2fr 1fr;gap:6px;border-radius:10px;overflow:hidden}
            .jory-layout-big2 .jory-big-box{height:320px}
            .jory-layout-big2 .jory-small-wrap{display:grid;grid-template-rows:1fr 1fr;gap:6px}
            .jory-layout-big2 .jory-small-box{height:157px}
            .jory-layout-big4{display:grid;grid-template-columns:2fr 1fr;gap:6px;border-radius:10px;overflow:hidden}
            .jory-layout-big4 .jory-big-box{height:340px}
            .jory-layout-big4 .jory-small-wrap{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:6px}
            .jory-layout-big4 .jory-small-box{height:165px}
            .jory-layout-slider .jory-slide-img{max-height:420px}
            .jory-img-box img,.jory-slide-img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .35s}
            .jory-img-empty{background:#eef2f5;display:flex;align-items:center;justify-content:center;color:#aaa;width:100%;height:100%}
            .jory-products-strip-wrap{position:relative;}
            .jory-products-strip{display:flex;gap:14px;overflow-x:auto;-webkit-overflow-scrolling:touch;scroll-snap-type:x proximity;padding:16px 3% 22px !important;scroll-behavior:smooth;cursor:grab;user-select:none;}
            .jory-products-strip.dragging{cursor:grabbing;scroll-snap-type:none;}
            .jory-products-strip::-webkit-scrollbar{height:6px}
            .jory-products-strip::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:10px}
            .jory-products-strip .product-card{flex:0 0 auto;width:220px;scroll-snap-align:start;}
            .jory-strip-arrow{position:absolute;top:50%;transform:translateY(-50%);width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,.95);box-shadow:0 4px 14px rgba(0,0,0,.18);border:none;cursor:pointer;font-size:18px;color:#1d364a;z-index:5;display:flex;align-items:center;justify-content:center;transition:.2s;}
            .jory-strip-arrow:hover{background:#f38c18;color:#fff;}
            .jory-strip-arrow.next{left:6px;}
            .jory-strip-arrow.prev{right:6px;}
            .jory-strip-header{display:flex;justify-content:space-between;align-items:center;padding:0 3%;}
            .jory-strip-seeall{color:#000;font-weight:700;font-size:14px;text-decoration:none;white-space:nowrap;}
            .jory-strip-seeall:hover{text-decoration:underline;}
            .jory-bg-desktop{display:block;}
            .jory-bg-mobile{display:none;}
            @media (max-width:768px){
                .jory-bg-desktop{display:none;}
                .jory-bg-mobile{display:block;}
            }
            @media (max-width:768px){
                .jory-products-strip .product-card{width:150px;padding:10px;}
                .jory-products-strip .product-card img{height:110px;object-fit:cover;}
                .jory-strip-arrow{width:34px;height:34px;font-size:14px;}
                .jory-layout-full{max-height:200px}
                .jory-layout-full .jory-img-box{height:200px}
                .jory-layout-two{gap:4px}
                .jory-layout-two .jory-img-box{height:150px}
                .jory-layout-three{grid-template-columns:1fr 1fr;gap:4px}
                .jory-layout-three .jory-img-box{height:130px}
                .jory-layout-four{grid-template-columns:1fr 1fr;gap:4px}
                .jory-layout-four .jory-img-box{height:130px}
                .jory-layout-big2{grid-template-columns:1fr}
                .jory-layout-big2 .jory-big-box{height:200px}
                .jory-layout-big2 .jory-small-wrap{grid-template-columns:1fr 1fr;grid-template-rows:1fr}
                .jory-layout-big2 .jory-small-box{height:130px}
                .jory-layout-big4{grid-template-columns:1fr}
                .jory-layout-big4 .jory-big-box{height:200px}
                .jory-layout-big4 .jory-small-wrap{grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}
                .jory-layout-big4 .jory-small-box{height:120px}
                .jory-layout-slider .jory-slide-img{max-height:200px}
            }
        `;
        document.head.appendChild(s);
    })();

    const LC  = (key, fb) => { try { return JSON.parse(localStorage.getItem(key)) || fb; } catch(e) { return fb; } };
    const AR  = () => (localStorage.getItem('eljory_lang') || 'ar') === 'ar';

    // ── جلب المنتجات المرتبطة بالسيكشن ──────────────────────────────────────
    window.getSectionLinkedProducts = function(sec) {
        if (!sec.linkType || ['none','external'].includes(sec.linkType)) return [];
        const prods = LC('eljory_products', []).filter(p => p.isActive !== false);
        const lists = LC('eljory_custom_lists', []);
        switch (sec.linkType) {
            case 'product':     return prods.filter(p => p.id === sec.linkValue);
            case 'category':    return prods.filter(p => p.category === sec.linkValue);
            case 'subcategory': return prods.filter(p => p.subCategory === sec.linkValue);
            case 'customList': {
                const list = lists.find(l => l.id === sec.linkValue && l.isActive !== false);
                if (!list || !list.products) return [];
                return list.products.map(id => prods.find(p => p.id === id)).filter(Boolean);
            }
            default: return [];
        }
    };

    // ── بناء رابط الضغط ───────────────────────────────────────────────────────
    window.getSectionHref = function(linkType, linkValue) {
        if (!linkType || linkType === 'none') return null;
        const cats = LC('eljory_categories', []);
        switch (linkType) {
            case 'product':     return `product.html?id=${linkValue}`;
            case 'category':    return `shop.html?cat=${linkValue}`;
            case 'subcategory': {
                const sc = cats.find(c => c.id === linkValue);
                return sc ? `shop.html?cat=${sc.parentId}&sub=${sc.id}` : 'shop.html';
            }
            case 'customList':  return `shop.html?list=${linkValue}`;
            case 'external':    return linkValue || '#';
            default: return null;
        }
    };

    // ── بطاقة منتج مصغرة ─────────────────────────────────────────────────────
    function productCard(p) {
        const ar   = AR();
        const name = ar ? p.titleAr : (p.titleEn || p.titleAr);
        const cur  = ar ? 'ج.م' : 'EGP';
        const addT = ar ? 'أضف للسلة' : 'Add to Cart';
        const outT = ar ? 'نفدت الكمية' : 'Out of Stock';
        const oos  = p.stock <= 0;
        const qId  = `sq_${p.id}_${Date.now()}`;
        return `
        <div class="product-card" style="position:relative;">
            ${oos ? `<div class="out-of-stock-overlay">${outT}</div>` : ''}
            <a href="product.html?id=${p.id}" style="text-decoration:none;color:inherit;display:block;">
                <img src="${p.img}" alt="${name}" style="width:100%;border-radius:8px;${oos?'filter:grayscale(80%)':''}">
                <h3 style="color:#1d364a;font-size:16px;margin:10px 0 5px;">${name}</h3>
            </a>
            <p class="price">${p.price} ${cur}</p>
            <div class="qty-container">
                <button class="qty-btn" onclick="increaseQty('${qId}','${p.id}')" ${oos?'disabled':''}>+</button>
                <input type="text" id="${qId}" class="qty-input" value="1" readonly>
                <button class="qty-btn" onclick="decreaseQty('${qId}')" ${oos?'disabled':''}>-</button>
            </div>
            <button class="btn-add" ${oos ? 'disabled' : `onclick="addToCart('${p.id}',${p.price},'${qId}')"`}>
                ${oos ? outT : addT}
            </button>
        </div>`;
    }

    // ── wrapper صورة واحدة (Desktop + Mobile) مع كليك ─────────────────────────
    function pictureHtml(im) {
        const desktop = im.src;
        const mobile  = im.srcMobile || im.src;
        const srcTag  = mobile !== desktop ? `<source media="(max-width:768px)" srcset="${mobile}">` : '';
        return `<picture>${srcTag}<img src="${desktop}" loading="lazy" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'"></picture>`;
    }

    function imgWrap(im) {
        const href  = window.getSectionHref(im.linkType, im.linkValue);
        const isExt = im.linkType === 'external';
        const inner = pictureHtml(im);
        return href
            ? `<a href="${href}" ${isExt?'target="_blank" rel="noopener"':''} class="jory-img-box" style="display:block;">${inner}</a>`
            : `<div class="jory-img-box">${inner}</div>`;
    }

    // ── layouts ───────────────────────────────────────────────────────────────
    function buildLayout(sec) {
        const imgs   = sec.images || [];  // [{src, srcMobile, linkType, linkValue}]
        const layout = sec.layout || 'full';

        // helper: إحضار صورة بـ index آمن
        const img = (i) => imgs[i] || {};
        const w   = (i) => img(i).src ? imgWrap(img(i)) : `<div class="jory-img-box jory-img-empty">صورة ${i+1}</div>`;

        switch (layout) {

            // ① صورة واحدة كاملة
            case 'full':
                return `<div class="jory-layout-full">${w(0)}</div>`;

            // ② صورتين جنب بعض
            case 'two':
                return `<div class="jory-layout-two">${w(0)}${w(1)}</div>`;

            // ③ 3 صور في صف
            case 'three':
                return `<div class="jory-layout-three">${w(0)}${w(1)}${w(2)}</div>`;

            // ④ 4 صور في صف
            case 'four':
                return `<div class="jory-layout-four">${w(0)}${w(1)}${w(2)}${w(3)}</div>`;

            // ⑤ صورة كبيرة يسار + 2 صغيرة يمين
            case 'big-left-2right':
                return `<div class="jory-layout-big2">
                    <div class="jory-big-box">${w(0)}</div>
                    <div class="jory-small-wrap">
                        <div class="jory-small-box">${w(1)}</div><div class="jory-small-box">${w(2)}</div>
                    </div>
                </div>`;

            // ⑥ صورة كبيرة يسار + 4 صغيرة يمين (2×2)
            case 'big-left-4right':
                return `<div class="jory-layout-big4">
                    <div class="jory-big-box">${w(0)}</div>
                    <div class="jory-small-wrap">
                        <div class="jory-small-box">${w(1)}</div><div class="jory-small-box">${w(2)}</div><div class="jory-small-box">${w(3)}</div><div class="jory-small-box">${w(4)}</div>
                    </div>
                </div>`;

            // ⑦ سلايدر
            case 'slider': {
                const secId = sec.id || ('sl_' + Date.now());
                const slides = imgs.filter(i => i.src);
                if (!slides.length) return '<div style="padding:20px;color:gray;text-align:center;">لا توجد صور</div>';
                const slidesHTML = slides.map((im, idx) => {
                    const href   = window.getSectionHref(im.linkType, im.linkValue);
                    const isExt  = im.linkType === 'external';
                    const mobile = im.srcMobile || im.src;
                    const srcTag = mobile !== im.src ? `<source media="(max-width:768px)" srcset="${mobile}">` : '';
                    const imgTag = `<picture>${srcTag}<img class="jory-slide-img" src="${im.src}"></picture>`;
                    const inner  = href ? `<a href="${href}" ${isExt?'target="_blank"':''}>${imgTag}</a>` : imgTag;
                    return `<div class="jory-slide-${secId}" style="display:${idx===0?'block':'none'};width:100%;">${inner}</div>`;
                }).join('');
                const dots = slides.length > 1 ? `<div style="text-align:center;padding:8px 0;">
                    ${slides.map((_,i) => `<span onclick="joryGoSlide('${secId}',${i})" id="dot_${secId}_${i}" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${i===0?'#f38c18':'#ccc'};margin:0 4px;cursor:pointer;transition:.3s;"></span>`).join('')}
                </div>` : '';
                const nav = slides.length > 1 ? `
                    <button onclick="joryChangeSlide('${secId}',-1)" style="position:absolute;top:50%;left:10px;transform:translateY(-50%);background:rgba(0,0,0,.4);color:white;border:none;padding:10px 14px;border-radius:50%;cursor:pointer;font-size:18px;z-index:2;">&#10094;</button>
                    <button onclick="joryChangeSlide('${secId}',1)"  style="position:absolute;top:50%;right:10px;transform:translateY(-50%);background:rgba(0,0,0,.4);color:white;border:none;padding:10px 14px;border-radius:50%;cursor:pointer;font-size:18px;z-index:2;">&#10095;</button>` : '';
                // تشغيل Auto-play بعد رندر
                setTimeout(() => {
                    if (slides.length > 1) {
                        window[`_sl_${secId}`] = 0;
                        setInterval(() => joryChangeSlide(secId, 1), 4000);
                    }
                }, 100);
                return `<div class="jory-layout-slider" style="position:relative;overflow:hidden;border-radius:10px;">${slidesHTML}${nav}</div>${dots}`;
            }

            case 'products-strip':
                return '';

            default:
                return '<div style="color:gray;padding:20px;text-align:center;">layout غير معروف</div>';
        }
    }

    // ── دوال السلايدر ─────────────────────────────────────────────────────────
    window.joryChangeSlide = function(secId, dir) {
        const slides = document.querySelectorAll(`.jory-slide-${secId}`);
        if (!slides.length) return;
        let cur = window[`_sl_${secId}`] || 0;
        slides[cur].style.display = 'none';
        const dot0 = document.getElementById(`dot_${secId}_${cur}`);
        if (dot0) dot0.style.background = '#ccc';
        cur = (cur + dir + slides.length) % slides.length;
        window[`_sl_${secId}`] = cur;
        slides[cur].style.display = 'block';
        const dot1 = document.getElementById(`dot_${secId}_${cur}`);
        if (dot1) dot1.style.background = '#f38c18';
    };

    window.joryGoSlide = function(secId, idx) {
        const slides = document.querySelectorAll(`.jory-slide-${secId}`);
        if (!slides.length) return;
        let cur = window[`_sl_${secId}`] || 0;
        slides[cur].style.display = 'none';
        const dot0 = document.getElementById(`dot_${secId}_${cur}`);
        if (dot0) dot0.style.background = '#ccc';
        window[`_sl_${secId}`] = idx;
        slides[idx].style.display = 'block';
        const dot1 = document.getElementById(`dot_${secId}_${idx}`);
        if (dot1) dot1.style.background = '#f38c18';
    };

    // ── تحريك شريط المنتجات بالأسهم (يدعم RTL) ─────────────────────────────
    window.joryStripScroll = function(stripId, dir) {
        const el = document.getElementById(stripId);
        if (!el) return;
        const amount = Math.round(el.clientWidth * 0.7) * dir;
        el.scrollBy({ left: amount, behavior: 'smooth' });
    };

    // ── تفعيل السحب بالماوس على الكمبيوتر (Drag to scroll) ─────────────────
    window.joryInitStripDrag = function(stripId) {
        const el = document.getElementById(stripId);
        if (!el || el._joryDragInit) return;
        el._joryDragInit = true;

        let isDown = false, startX = 0, startScroll = 0, moved = false;

        el.addEventListener('mousedown', (e) => {
            isDown = true; moved = false;
            el.classList.add('dragging');
            startX = e.pageX;
            startScroll = el.scrollLeft;
        });
        window.addEventListener('mouseup', () => {
            isDown = false;
            el.classList.remove('dragging');
        });
        window.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const dx = e.pageX - startX;
            if (Math.abs(dx) > 4) moved = true;
            el.scrollLeft = startScroll - dx;
        });
        // منع فتح لينك المنتج لو المستخدم كان بيسحب فعلاً مش بيضغط
        el.addEventListener('click', (e) => {
            if (moved) { e.preventDefault(); e.stopPropagation(); }
        }, true);

        // دعم عجلة الماوس العادية (رأسي) تتحول لسكرول أفقي في الشريط
        el.addEventListener('wheel', (e) => {
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                e.preventDefault();
                el.scrollLeft += e.deltaY;
            }
        }, { passive: false });
    };

    // ── بناء HTML السيكشن كامل ────────────────────────────────────────────────
    function buildSectionHTML(sec) {
        const hasBgImg   = !!sec.bgImage;
        const hasBgColor = !!sec.bgColor;
        const rounded    = (hasBgImg || hasBgColor) ? '18px' : '0';
        const shadow     = (hasBgImg || hasBgColor) ? '0 6px 20px rgba(0,0,0,.08)' : 'none';

        // نقطة الارتكاز (bottomAnchor) هي المكان اللي بتقف عنده حافة الخلفية
        // السفلية دايماً (تقريباً عند السهم/منتصف الكارت) بالنسبة لمحتوى
        // السيكشن. سلايدر "ارتفاع الخلفية" بيتحكم في الامتداد لفوق: كل ما
        // زادت القيمة، الخلفية بتكبر لفوق.
        // ⚠️ الفرق المهم هنا: لو الامتداد المطلوب (bgHeight) أكبر من نقطة
        // الارتكاز (bgBottomAnchor)، بدل ما نـ"يخرج" الخلفية بالسالب فوق حدود
        // السيكشن (وتتراكب بصرياً مع السيكشن اللي قبلها)، بنـ"زوّد مساحة حقيقية"
        // (extraSpace) فوق محتوى السيكشن نفسه. المساحة دي بتكبّر صندوق السيكشن
        // فعلياً في تدفق الصفحة الطبيعي (Normal Flow)، وبالتبعية كل حاجة تحتها
        // بتنزل معاها تلقائياً، ومفيش أي تراكب مع السيكشن اللي فوق خالص.
        //
        // بما إن مقاسات الموبايل مختلفة تمامًا عن الكمبيوتر، بنولّد طبقتين
        // منفصلتين (كمبيوتر + موبايل) بإعدادات ارتفاع/ارتكاز مستقلة، ونتحكم
        // في إظهار كل واحدة بس عبر media query (jory-bg-desktop/jory-bg-mobile)
        // بدل ما نعمل نسخة واحدة لكل الشاشات.
        const overlayTop    = (typeof sec.bgOverlayTop    === 'number') ? sec.bgOverlayTop    : 0.15;
        const overlayBottom = (typeof sec.bgOverlayBottom === 'number') ? sec.bgOverlayBottom : 0.85;

        function buildBgLayer(bgImg, bgColorVal, anchor, height, cssClass) {
            const extra  = Math.max(0, height - anchor);
            const topPos = extra > 0 ? 0 : (anchor - height);
            let layer = '';
            if (bgImg) {
                layer = `<div class="${cssClass}" style="position:absolute;top:${topPos}px;left:0;right:0;height:${height}px;z-index:0;
                    pointer-events:none;overflow:hidden;border-radius:${rounded};box-shadow:${shadow};
                    background-image:linear-gradient(to bottom, rgba(255,255,255,${overlayTop}) 0%, rgba(255,255,255,${overlayBottom}) 100%),url('${bgImg}');
                    background-size:cover;background-position:center;background-repeat:no-repeat;"></div>`;
            } else if (bgColorVal) {
                layer = `<div class="${cssClass}" style="position:absolute;top:${topPos}px;left:0;right:0;height:${height}px;z-index:0;
                    pointer-events:none;border-radius:${rounded};box-shadow:${shadow};background:${bgColorVal};"></div>`;
            }
            return { layer, extra };
        }

        const bgBottomAnchor = parseInt(sec.bgBottomAnchor) || 260;
        const bgHeight       = parseInt(sec.bgHeight) || 260;
        const desktopImg     = sec.bgImage || '';
        const desktopRes     = buildBgLayer(desktopImg, sec.bgColor, bgBottomAnchor, bgHeight, 'jory-bg-desktop');

        const bgBottomAnchorMobile = parseInt(sec.bgBottomAnchorMobile) || bgBottomAnchor;
        const bgHeightMobile       = parseInt(sec.bgHeightMobile) || bgHeight;
        const mobileImg            = sec.bgImageMobile || sec.bgImage || '';
        const mobileRes            = buildBgLayer(mobileImg, sec.bgColor, bgBottomAnchorMobile, bgHeightMobile, 'jory-bg-mobile');

        const bgLayerH  = desktopRes.layer + mobileRes.layer;
        // بما إن المساحة الإضافية (extra) مختلفة بين الكمبيوتر والموبايل، بنستخدم
        // عنصرين منفصلين (كل واحد بكلاس مختلف) بحيث يظهر بس اللي يخص حجم الشاشة
        // الحالي فعلياً — وبكده ارتفاع السيكشن نفسه بيكبر بالقيمة الصحيحة على كل جهاز.
        const extraSpaceH =
            (desktopRes.extra > 0 ? `<div class="jory-bg-desktop" style="height:${desktopRes.extra}px;"></div>` : '') +
            (mobileRes.extra  > 0 ? `<div class="jory-bg-mobile"  style="height:${mobileRes.extra}px;"></div>`  : '');

        // عنوان
        const titleH = (sec.showTitle && sec.title) ? `
        <div style="text-align:center;padding:22px 5% 14px;">
            <h2 style="color:#1d364a;display:inline-block;border-bottom:3px solid #f38c18;
                       padding-bottom:8px;margin:0;font-size:clamp(18px,3vw,26px);">${sec.title}</h2>
        </div>` : '';

        // layout
        const layoutH = sec.layout === 'products-strip'
            ? ''
            : `<div style="padding:0 ${sec.layout==='full'?'0':'3%'};border-radius:10px;overflow:hidden;">
                ${buildLayout(sec)}
              </div>`;

        // منتجات
        let prodsH = '';
        if (sec.showProducts && sec.linkType && !['none','external'].includes(sec.linkType)) {
            const prods = window.getSectionLinkedProducts(sec).slice(0, sec.maxProducts || 20);
            if (prods.length) {
                const stripId  = 'strip_' + (sec.id || Date.now());
                const seeAllHref = window.getSectionHref(sec.linkType, sec.linkValue);
                const seeAllTxt  = AR() ? 'إظهار الكل ←' : 'See All →';
                const seeAllH = seeAllHref
                    ? `<a href="${seeAllHref}" class="jory-strip-seeall">${seeAllTxt}</a>`
                    : '';
                const headerH = seeAllH
                    ? `<div class="jory-strip-header">${seeAllH}<span></span></div>`
                    : '';
                prodsH = `${headerH}
                <div class="jory-products-strip-wrap">
                    <button type="button" class="jory-strip-arrow prev" onclick="joryStripScroll('${stripId}',1)">&#10095;</button>
                    <button type="button" class="jory-strip-arrow next" onclick="joryStripScroll('${stripId}',-1)">&#10094;</button>
                    <div class="jory-products-strip" id="${stripId}">${prods.map(productCard).join('')}</div>
                </div>`;
                setTimeout(() => window.joryInitStripDrag && window.joryInitStripDrag(stripId), 60);
            }
        }

        return `<div style="position:relative;">
            ${bgLayerH}
            ${extraSpaceH}
            <div style="max-width:1200px;margin:0 auto;position:relative;z-index:1;">${titleH}${layoutH}${prodsH}</div>
        </div>`;
    }

    // ── إظهار السكاشن بعد بنائها (fade-in) ─────────────────────────────────────
    // ⚠️ إصلاح: كانت هذه الخطوة بتتنفذ من كود خارجي (observeSections في index.html)
    // مرة واحدة بس بعد أول تحميل للصفحة. لكن store-core.js بينادي
    // renderStorefrontSections() من جديد في كل مرة يتحدّث فيها أي مسار بيانات
    // (منتجات/أقسام/عروض...)، وكل مرة كان بيمسح السكاشن القديمة (الظاهرة) ويبني
    // بدلها عناصر جديدة تبدأ مخفية (opacity:0) من غير حد ينده على كود الإظهار
    // تاني، فكانت تظهر لحظة وتختفي. دلوقتي الإظهار بقى جزء من نفس الدالة، بحيث
    // يتنفذ تلقائياً بعد كل مرة تُبنى فيها السكاشن، أياً كان مين اللي نادى عليها.
    function revealSections(container) {
        const elements = container.querySelectorAll('.jory-section');
        if (!elements.length) return;
        if (!('IntersectionObserver' in window)) {
            elements.forEach(el => el.classList.add('visible'));
            return;
        }
        const obs = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08 });
        elements.forEach(el => obs.observe(el));
    }

    // ── الدالة الرئيسية ───────────────────────────────────────────────────────
    window.renderStorefrontSections = function() {
        const container = document.getElementById('storefrontSections');
        if (!container) return;

        const sections = LC('eljory_sections', [])
            .filter(s => s.isActive !== false)
            .sort((a, b) => (parseInt(a.priority)||0) - (parseInt(b.priority)||0));

        container.innerHTML = '';
       sections.forEach(sec => {
            const el = document.createElement('div');
            el.className = 'jory-section';
            el.style.cssText = `margin:40px 0 22px;position:relative;`;
            el.innerHTML = buildSectionHTML(sec);
            container.appendChild(el);
        });

        // نستنى فريم واحد عشان نتأكد إن العناصر اتلصقت في الصفحة فعلاً قبل ما
        // نبدأ نراقبها بالـ IntersectionObserver.
        requestAnimationFrame(() => revealSections(container));
    };

    console.log('✅ El Jory Sections Renderer v2 Ready');
})();