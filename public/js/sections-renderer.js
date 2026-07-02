// ============================================================================
// محرك السكاشن الاحترافي — El Jory Store | sections-renderer.js
// ============================================================================
(function () {
    'use strict';

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

    // ── wrapper صورة واحدة مع كليك ───────────────────────────────────────────
    function imgWrap(src, linkType, linkValue, style='') {
        const href    = window.getSectionHref(linkType, linkValue);
        const isExt   = linkType === 'external';
        const imgTag  = `<img src="${src}" style="width:100%;height:100%;object-fit:cover;display:block;transition:transform .35s;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">`;
        const inner   = href
            ? `<a href="${href}" ${isExt?'target="_blank" rel="noopener"':''} style="display:block;height:100%;">${imgTag}</a>`
            : imgTag;
        return `<div style="overflow:hidden;${style}">${inner}</div>`;
    }

    // ── layouts ───────────────────────────────────────────────────────────────
    function buildLayout(sec) {
        const imgs   = sec.images || [];  // [{src, linkType, linkValue}]
        const layout = sec.layout || 'full';
        const gap    = '6px';

        // helper: إحضار صورة بـ index آمن
        const img = (i) => imgs[i] || {};
        const w   = (i, style='') => img(i).src
            ? imgWrap(img(i).src, img(i).linkType, img(i).linkValue, style)
            : `<div style="${style}background:#eef2f5;display:flex;align-items:center;justify-content:center;color:#aaa;">صورة ${i+1}</div>`;

        switch (layout) {

            // ① صورة واحدة كاملة
            case 'full':
                return `<div style="width:100%;max-height:440px;overflow:hidden;border-radius:0;">
                    ${w(0,'max-height:440px;')}
                </div>`;

            // ② صورتين جنب بعض
            case 'two':
                return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:${gap};border-radius:10px;overflow:hidden;">
                    ${w(0,'height:280px;')}${w(1,'height:280px;')}
                </div>`;

            // ③ 3 صور في صف
            case 'three':
                return `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:${gap};border-radius:10px;overflow:hidden;">
                    ${w(0,'height:240px;')}${w(1,'height:240px;')}${w(2,'height:240px;')}
                </div>`;

            // ④ 4 صور في صف
            case 'four':
                return `<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:${gap};border-radius:10px;overflow:hidden;">
                    ${w(0,'height:200px;')}${w(1,'height:200px;')}${w(2,'height:200px;')}${w(3,'height:200px;')}
                </div>`;

            // ⑤ صورة كبيرة يسار + 2 صغيرة يمين
            case 'big-left-2right':
                return `<div style="display:grid;grid-template-columns:2fr 1fr;gap:${gap};border-radius:10px;overflow:hidden;height:320px;">
                    ${w(0,'height:320px;')}
                    <div style="display:grid;grid-template-rows:1fr 1fr;gap:${gap};">
                        ${w(1,'height:157px;')}${w(2,'height:157px;')}
                    </div>
                </div>`;

            // ⑥ صورة كبيرة يسار + 4 صغيرة يمين (2×2)
            case 'big-left-4right':
                return `<div style="display:grid;grid-template-columns:2fr 1fr;gap:${gap};border-radius:10px;overflow:hidden;height:340px;">
                    ${w(0,'height:340px;')}
                    <div style="display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:${gap};">
                        ${w(1,'height:165px;')}${w(2,'height:165px;')}${w(3,'height:165px;')}${w(4,'height:165px;')}
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
                    const imgTag = `<img src="${im.src}" style="width:100%;max-height:420px;object-fit:cover;display:block;">`;
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
                return `<div style="position:relative;overflow:hidden;border-radius:10px;">${slidesHTML}${nav}</div>${dots}`;
            }

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

    // ── بناء HTML السيكشن كامل ────────────────────────────────────────────────
    function buildSectionHTML(sec) {
        // عنوان
        const titleH = (sec.showTitle && sec.title) ? `
        <div style="text-align:center;padding:22px 5% 14px;">
            <h2 style="color:#1d364a;display:inline-block;border-bottom:3px solid #f38c18;
                       padding-bottom:8px;margin:0;font-size:clamp(18px,3vw,26px);">${sec.title}</h2>
        </div>` : '';

        // layout
        const layoutH = `<div style="padding:0 ${sec.layout==='full'?'0':'3%'};border-radius:10px;overflow:hidden;">
            ${buildLayout(sec)}
        </div>`;

        // منتجات
        let prodsH = '';
        if (sec.showProducts && sec.linkType && !['none','external'].includes(sec.linkType)) {
            const prods = window.getSectionLinkedProducts(sec).slice(0, sec.maxProducts || 20);
            if (prods.length) {
                prodsH = `<div class="products-grid" style="padding:16px 3% 22px;">${prods.map(productCard).join('')}</div>`;
            }
        }

        return `<div style="max-width:1200px;margin:0 auto;">${titleH}${layoutH}${prodsH}</div>`;
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

            const hasBgImg   = !!sec.bgImage;
            const hasBgColor = !!sec.bgColor;
            const rounded    = (hasBgImg || hasBgColor) ? '18px' : '0';
            const shadow     = (hasBgImg || hasBgColor) ? '0 6px 20px rgba(0,0,0,.08)' : 'none';

            if (hasBgImg) {
                // خلفية صورة: بنحط طبقة تعتيم خفيفة (overlay) فوق الصورة عشان
                // المحتوى والمنتجات فوقها تفضل واضحة ومقروءة أياً كانت الصورة.
                el.style.cssText = `
                    margin:22px 0;position:relative;overflow:hidden;
                    border-radius:${rounded};box-shadow:${shadow};
                    background-image:linear-gradient(rgba(255,255,255,.88),rgba(255,255,255,.88)),url('${sec.bgImage}');
                    background-size:cover;background-position:center;background-repeat:no-repeat;
                    padding:8px 0;
                `;
            } else {
                el.style.cssText = `margin:18px 0;background:${sec.bgColor||'transparent'};
                    border-radius:${rounded};overflow:hidden;box-shadow:${shadow};`;
            }

            el.innerHTML = buildSectionHTML(sec);
            container.appendChild(el);
        });
    };

    console.log('✅ El Jory Sections Renderer v2 Ready');
})();