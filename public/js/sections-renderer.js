// ============================================================================
// محرك السكاشن الاحترافي — El Jory Store  |  sections-renderer.js
// ============================================================================

(function () {
    'use strict';

    const LC = (key, fb) => {
        try { return JSON.parse(localStorage.getItem(key)) || fb; }
        catch (e) { return fb; }
    };
    const AR = () => (localStorage.getItem('eljory_lang') || 'ar') === 'ar';

    window.getSectionLinkedProducts = function (sec) {
        if (!sec.linkType || ['none', 'external'].includes(sec.linkType)) return [];
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

    window.getSectionHref = function (sec) {
        if (!sec.linkType || sec.linkType === 'none') return null;
        const cats = LC('eljory_categories', []);
        switch (sec.linkType) {
            case 'product':     return `product.html?id=${sec.linkValue}`;
            case 'category':    return `shop.html?cat=${sec.linkValue}`;
            case 'subcategory': {
                const sc = cats.find(c => c.id === sec.linkValue);
                return sc ? `shop.html?cat=${sc.parentId}&sub=${sc.id}` : 'shop.html';
            }
            case 'customList':  return `shop.html?list=${sec.linkValue}`;
            case 'external':    return sec.linkValue || '#';
            default: return null;
        }
    };

    function productCard(p) {
        const ar   = AR();
        const name = ar ? p.titleAr : (p.titleEn || p.titleAr);
        const cur  = ar ? 'ج.م' : 'EGP';
        const addT = ar ? 'أضف للسلة' : 'Add to Cart';
        const outT = ar ? 'نفدت الكمية' : 'Out of Stock';
        const oos  = p.stock <= 0;
        const qId  = `sq_${p.id}`;

        return `
        <div class="product-card" style="position:relative;">
            ${oos ? `<div class="out-of-stock-overlay">${outT}</div>` : ''}
            <a href="product.html?id=${p.id}" style="text-decoration:none;color:inherit;display:block;">
                <img src="${p.img}" alt="${name}"
                     style="width:100%;border-radius:8px;${oos ? 'filter:grayscale(80%)' : ''}">
                <h3 style="color:#1d364a;font-size:16px;margin:10px 0 5px;">${name}</h3>
            </a>
            <p class="price">${p.price} ${cur}</p>
            <div class="qty-container">
                <button class="qty-btn" onclick="increaseQty('${qId}','${p.id}')" ${oos ? 'disabled' : ''}>+</button>
                <input type="text" id="${qId}" class="qty-input" value="1" readonly>
                <button class="qty-btn" onclick="decreaseQty('${qId}')" ${oos ? 'disabled' : ''}>-</button>
            </div>
            <button class="btn-add"
                ${oos ? 'disabled' : `onclick="addToCart('${p.id}',${p.price},'${qId}')"`}>
                ${oos ? outT : addT}
            </button>
        </div>`;
    }

    function buildSectionHTML(sec) {
        const href   = window.getSectionHref(sec);
        const isExt  = sec.linkType === 'external';
        const hasImg = sec.image && sec.displayType !== 'productsOnly';

        // ── عنوان ──
        const titleH = (sec.showTitle && sec.title) ? `
        <div style="text-align:center;padding:22px 5% 14px;">
            <h2 style="color:#1d364a;display:inline-block;border-bottom:3px solid #f38c18;
                       padding-bottom:8px;margin:0;font-size:clamp(18px,3vw,26px);">
                ${sec.title}
            </h2>
        </div>` : '';

        // ── صورة البانر ──
        let imgH = '';
        if (hasImg) {
            const maxH   = { fullBanner: '440px', halfBanner: '280px', slim: '160px' }[sec.displayType] || '400px';
            const radius = sec.displayType === 'halfBanner' ? '12px' : '0';
            const mb     = sec.showProducts ? '22px' : '0';

            const imgTag = `
            <img src="${sec.image}" alt="${sec.title || 'El Jory'}"
                 style="width:100%;max-height:${maxH};object-fit:cover;display:block;
                        transition:transform .35s ease;"
                 onmouseover="this.style.transform='scale(1.025)'"
                 onmouseout="this.style.transform='scale(1)'">`;

            const wrapped = href
                ? `<a href="${href}" ${isExt ? 'target="_blank" rel="noopener"' : ''}>${imgTag}</a>`
                : imgTag;

            imgH = `<div style="overflow:hidden;border-radius:${radius};margin-bottom:${mb};">${wrapped}</div>`;

            if (sec.displayType === 'halfBanner') {
                imgH = `<div style="padding:0 5%;">${imgH}</div>`;
            }
        }

        // ── شبكة المنتجات ──
        let prodsH = '';
        if (sec.showProducts && !['none', 'external'].includes(sec.linkType)) {
            const prods = window.getSectionLinkedProducts(sec).slice(0, sec.maxProducts || 20);
            if (prods.length) {
                prodsH = `<div class="products-grid" style="padding:10px 5% 22px;">${prods.map(productCard).join('')}</div>`;
            }
        }

        const outerPad = sec.displayType === 'productsOnly' ? 'padding:0 5%;' : '';

        return `
        <div style="max-width:1200px;margin:0 auto;${outerPad}">
            ${titleH}${imgH}${prodsH}
        </div>`;
    }

    window.renderStorefrontSections = function () {
        const container = document.getElementById('storefrontSections');
        if (!container) return;

        const sections = LC('eljory_sections', [])
            .filter(s => s.isActive !== false)
            .sort((a, b) => (parseInt(a.priority) || 0) - (parseInt(b.priority) || 0));

        container.innerHTML = '';

        sections.forEach(sec => {
            // دعم كلا الحقلين: img (الجديد) و image (القديم)
            if (!sec.image && sec.img) sec.image = sec.img;

            const el       = document.createElement('div');
            el.className   = 'jory-section';
            el.style.cssText = `
                margin: 18px 0;
                background: ${sec.bgColor || 'transparent'};
                border-radius: ${sec.bgColor ? '14px' : '0'};
                overflow: hidden;
                box-shadow: ${sec.bgColor ? '0 4px 14px rgba(0,0,0,.07)' : 'none'};
            `;
            el.innerHTML = buildSectionHTML(sec);
            container.appendChild(el);
        });
    };

    console.log('✅ El Jory Sections Renderer Ready');
})();