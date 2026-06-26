/**
 * header-loader.js  v2
 * ملف الهيدر المشترك لكل صفحات الجوري ستور
 * ══════════════════════════════════════════════════════
 * عشان تضيفه لأي صفحة:
 *   1. حط  <div id="site-header"></div>  أول حاجة جوا <body>
 *   2. حط  <script src="js/header-loader.js"></script>  بعديه مباشرة
 *
 * ══ إعدادات التواصل ══
 * غير الرقم والرابط دول بتاعتك:
 */
var JORY_WHATSAPP = '201100395049';
var JORY_FACEBOOK = 'https://facebook.com/Elgorystore';

// ══════════════════════════════════════════════════════
//  CSS
// ══════════════════════════════════════════════════════
(function injectStyles() {
    if (document.getElementById('jory-header-styles')) return;
    var s = document.createElement('style');
    s.id = 'jory-header-styles';
    s.textContent = [

        '@import url("https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap");',
        '*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }',
        'body { font-family: "Cairo", sans-serif; }',

        /* ── Header ── */
        '.jory-header {',
        '  position: sticky; top: 0; z-index: 1000;',
        '  background: #fff;',
        '  border-bottom: 3px solid #f38c18;',
        '  box-shadow: 0 2px 16px rgba(0,0,0,.08);',
        '}',
        '.jory-header-inner {',
        '  max-width: 1280px; margin: 0 auto;',
        '  padding: 0 28px; height: 76px;',
        '  display: flex; align-items: center; gap: 22px;',
        '}',

        /* ── Logo ── */
        '.jory-logo a { display: flex; align-items: center; flex-shrink: 0; }',
        '.jory-logo img { height: 64px; display: block; }',

        /* ── Search ── */
        '.jory-search { flex: 1; display: flex; max-width: 480px; margin: 0 auto; }',
        '.jory-search input {',
        '  flex: 1; padding: 10px 16px;',
        '  border: 1.5px solid #e2e8f0; border-left: none;',
        '  border-radius: 0 10px 10px 0;',
        '  font-family: "Cairo",sans-serif; font-size: 14px;',
        '  outline: none; color: #1d364a; transition: border-color .2s;',
        '}',
        '.jory-search input:focus { border-color: #f38c18; }',
        '.jory-search button {',
        '  background: #f38c18; color: #fff; border: none;',
        '  padding: 10px 22px; border-radius: 10px 0 0 10px;',
        '  font-family: "Cairo",sans-serif; font-weight: 700; font-size: 14px;',
        '  cursor: pointer; transition: background .2s; white-space: nowrap;',
        '}',
        '.jory-search button:hover { background: #d97b0e; }',

        /* ── Nav ── */
        '.jory-nav-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }',
        '.jory-nav-link {',
        '  display: flex; align-items: center; gap: 4px;',
        '  padding: 9px 14px; border-radius: 9px;',
        '  color: #1d364a; text-decoration: none;',
        '  font-size: 14px; font-weight: 600;',
        '  transition: background .2s, color .2s; white-space: nowrap;',
        '}',
        '.jory-nav-link:hover, .jory-nav-link.active { background: #fff7ed; color: #f38c18; }',

        /* ── Cart ── */
        '.jory-cart-wrap { position: relative; display: flex; align-items: center; }',
        '.jory-cart-btn {',
        '  display: flex; align-items: center; justify-content: center;',
        '  width: 42px; height: 42px; border-radius: 10px;',
        '  color: #1d364a; text-decoration: none;',
        '  transition: background .2s, color .2s;',
        '}',
        '.jory-cart-btn:hover { background: #fff7ed; color: #f38c18; }',
        '.cart-badge {',
        '  position: absolute; top: -6px; left: -6px;',
        '  background: #ef4444; color: #fff; border-radius: 50%;',
        '  min-width: 18px; height: 18px;',
        '  font-size: 11px; font-weight: 700;',
        '  display: flex; align-items: center; justify-content: center; padding: 0 3px;',
        '}',

        /* ── Lang / Logout ── */
        '.jory-lang-btn {',
        '  background: transparent; border: 1.5px solid #e2e8f0;',
        '  border-radius: 9px; padding: 7px 16px;',
        '  font-family: "Cairo",sans-serif; font-size: 13px; font-weight: 600;',
        '  color: #1d364a; cursor: pointer; transition: border-color .2s, color .2s;',
        '}',
        '.jory-lang-btn:hover { border-color: #f38c18; color: #f38c18; }',
        '#headerUserInfo button, #headerUserInfo .logout-btn {',
        '  background: #1d364a; color: #fff; border: none;',
        '  border-radius: 9px; padding: 8px 16px;',
        '  font-family: "Cairo",sans-serif; font-size: 13px; font-weight: 700;',
        '  cursor: pointer; transition: background .2s; white-space: nowrap;',
        '}',
        '#headerUserInfo button:hover, #headerUserInfo .logout-btn:hover { background: #f38c18; }',

        /* ═══════════════════════════════════════════════
           DROPDOWN + MEGA MENU
           ═══════════════════════════════════════════════
           الفكرة: padding-top على القائمة بيخلي الـ hover
           يبقى متصل — مفيش فجوة حقيقية بين اللينك والمينيو
        */
        '.jory-dropdown { position: relative; }',

        /* البريدج الشفاف — بيربط اللينك بالمينيو */
        '.jory-dropdown::after {',
        '  content: ""; position: absolute;',
        '  top: 100%; right: 0; left: 0; height: 12px;',
        '}',

'.jory-mega-menu {',
        '  display: none;',
        '  position: absolute; top: calc(100% + 12px); right: 0;',
        '  background: #fff;',
        '  border: 1px solid #e2e8f0;',
        '  border-radius: 14px;',
        '  box-shadow: 0 10px 32px rgba(0,0,0,.12);',
        '  min-width: 200px;',
        '  overflow: hidden;',
        '  z-index: 300;',
        '}',
        '.jory-mega-menu.sub-open { min-width: 520px; }',
        '.jory-dropdown:hover .jory-mega-menu { display: flex; }',

        /* الجزء الأيسر — الأقسام الرئيسية */
        '.jory-mega-left {',
        '  width: 190px; flex-shrink: 0;',
        '  background: #f8fafc;',
        '  border-left: 1px solid #e2e8f0;',
        '  padding: 8px 0;',
        '}',
        '.jory-mega-cat {',
        '  display: flex; align-items: center; justify-content: space-between;',
        '  padding: 11px 18px; cursor: pointer;',
        '  font-size: 14px; font-weight: 600; color: #1d364a;',
        '  transition: background .15s, color .15s;',
        '  text-decoration: none;',
        '}',
        '.jory-mega-cat:hover,',
        '.jory-mega-cat.active-cat { background: #fff7ed; color: #f38c18; }',
        '.jory-mega-cat-arrow {',
        '  font-size: 11px; color: #94a3b8; transition: color .15s;',
        '}',
        '.jory-mega-cat.active-cat .jory-mega-cat-arrow { color: #f38c18; }',

        /* الجزء الأيمن — الأقسام الفرعية */
        '.jory-mega-right { flex: 1; padding: 12px 16px; min-height: 160px; display: none; }',
        '.jory-mega-menu.sub-open .jory-mega-right { display: block; }',
        '.jory-mega-sublist { display: none; }',
        '.jory-mega-sublist.active-sub { display: block; }',
        '.jory-mega-sub-title {',
        '  font-size: 12px; font-weight: 700; color: #f38c18;',
        '  text-transform: uppercase; letter-spacing: .5px;',
        '  padding-bottom: 8px; margin-bottom: 6px;',
        '  border-bottom: 2px solid #fff7ed;',
        '}',
        '.jory-mega-sublist a {',
        '  display: block; padding: 8px 10px; border-radius: 7px;',
        '  color: #1d364a; text-decoration: none;',
        '  font-size: 13px; transition: background .15s, color .15s;',
        '}',
        '.jory-mega-sublist a:hover { background: #fff7ed; color: #f38c18; }',

        /* لو مفيش أقسام فرعية */
        '.jory-mega-empty {',
        '  color: #94a3b8; font-size: 13px;',
        '  padding: 20px 10px; text-align: center;',
        '}',

        /* fallback: قايمة بسيطة لو مفيش بيانات أقسام فرعية */
        '.jory-dropdown-menu {',
        '  display: none; position: absolute;',
        '  top: calc(100% + 12px); right: 0;',
        '  background: #fff; border: 1px solid #e2e8f0;',
        '  border-radius: 12px; box-shadow: 0 8px 28px rgba(0,0,0,.1);',
        '  min-width: 200px; z-index: 200; overflow: hidden;',
        '}',
        '.jory-dropdown:hover .jory-dropdown-menu { display: block; }',
        '.jory-dropdown-menu a {',
        '  display: block; padding: 11px 18px;',
        '  color: #1d364a; text-decoration: none;',
        '  font-size: 14px; font-family: "Cairo",sans-serif;',
        '  transition: background .15s;',
        '}',
        '.jory-dropdown-menu a:hover { background: #fff7ed; color: #f38c18; }',

        /* ── Hamburger ── */
        '.jory-hamburger {',
        '  display: none; flex-direction: column; gap: 5px;',
        '  cursor: pointer; padding: 8px; margin-right: auto;',
        '  background: none; border: none;',
        '}',
        '.jory-hamburger span {',
        '  display: block; width: 25px; height: 2.5px;',
        '  background: #1d364a; border-radius: 2px; transition: .3s;',
        '}',
        '.jory-hamburger.open span:nth-child(1) { transform: rotate(45deg) translate(5px,5px); }',
        '.jory-hamburger.open span:nth-child(2) { opacity: 0; }',
        '.jory-hamburger.open span:nth-child(3) { transform: rotate(-45deg) translate(5px,-5px); }',

        /* ── Mobile Drawer ── */
        '.jory-mobile-menu {',
        '  display: none; flex-direction: column;',
        '  background: #fff; border-top: 1px solid #f0f0f0;',
        '  padding: 16px 20px 22px; gap: 6px;',
        '}',
        '.jory-mobile-menu.open { display: flex; }',
        '.jory-mobile-menu .jory-search { max-width: 100%; margin: 0 0 10px; }',
        '.jory-mobile-menu .jory-nav-link { padding: 12px 16px; font-size: 15px; }',
        '.jory-mobile-menu .jory-lang-btn { margin-top: 6px; align-self: flex-start; }',

        /* أقسام الموبايل داخل الدراور */
        '.jory-mobile-cats { padding: 4px 0; }',
        '.jory-mobile-cat-toggle {',
        '  display: flex; align-items: center; justify-content: space-between;',
        '  padding: 11px 16px; border-radius: 9px;',
        '  color: #1d364a; text-decoration: none;',
        '  font-size: 14px; font-weight: 600; cursor: pointer;',
        '}',
        '.jory-mobile-cat-toggle:hover { background: #fff7ed; color: #f38c18; }',
        '.jory-mobile-sub-list { display: none; padding: 0 8px 4px 28px; }',
        '.jory-mobile-sub-list.open { display: block; }',
        '.jory-mobile-sub-list a {',
        '  display: block; padding: 8px 12px; border-radius: 7px;',
        '  color: #475569; text-decoration: none; font-size: 13px;',
        '}',
        '.jory-mobile-sub-list a:hover { color: #f38c18; background: #fff7ed; }',

        /* ── Float Buttons ── */
        '.jory-float-btns {',
        '  position: fixed; left: 20px; bottom: 24px;',
        '  display: flex; flex-direction: column; gap: 10px;',
        '  z-index: 9999;',
        '}',
        '.jory-float-btn {',
        '  width: 52px; height: 52px; border-radius: 50%;',
        '  display: flex; align-items: center; justify-content: center;',
        '  text-decoration: none;',
        '  box-shadow: 0 4px 16px rgba(0,0,0,.22);',
        '  transition: transform .2s, box-shadow .2s;',
        '  position: relative;',
        '}',
        '.jory-float-btn:hover { transform: scale(1.1); box-shadow: 0 6px 22px rgba(0,0,0,.28); }',
        '.jory-float-wa { background: #25d366; }',
        '.jory-float-fb { background: #1877f2; }',
        '.jory-float-btn svg { width: 26px; height: 26px; fill: #fff; }',
        '.jory-float-btn::before {',
        '  content: attr(data-tip);',
        '  position: absolute; left: 60px;',
        '  background: #1d364a; color: #fff;',
        '  font-family: "Cairo",sans-serif; font-size: 12px; font-weight: 600;',
        '  padding: 5px 10px; border-radius: 7px; white-space: nowrap;',
        '  opacity: 0; pointer-events: none; transition: opacity .2s;',
        '}',
        '.jory-float-btn:hover::before { opacity: 1; }',

'@media (max-width: 768px) {',
        '  .jory-header-inner { height: 62px; padding: 0 14px; gap: 8px; }',
        '  .jory-logo { display: none; }',
        '  .jory-search { display: flex; flex: 1; margin: 0; }',
        '  .jory-nav-actions { display: flex; }',
        '  .jory-nav-actions .jory-nav-link { display: none; }',
        '  .jory-nav-actions .jory-cart-wrap { display: none; }',
        '  .jory-nav-actions #headerUserInfo { display: none; }',
        '  .jory-nav-actions .jory-lang-btn { display: flex; padding: 7px 10px; font-size: 12px; white-space: nowrap; }',
        '  .jory-hamburger { display: none; }',
        '  .jory-mobile-menu { display: none !important; }',
        '  .jory-float-btn { width: 46px; height: 46px; }',
        '  .jory-float-btns { left: 14px; bottom: 18px; gap: 8px; }',
        '  .jory-float-btn::before { display: none; }',
        '}',

        /* ── Bottom Mobile Nav ── */
        '.jory-bottom-nav {',
        '  display: none;',
        '}',
        '@media (max-width: 768px) {',
        '  body { padding-bottom: 70px; }',
        '  .jory-bottom-nav {',
        '    display: flex;',
        '    position: fixed; bottom: 0; left: 0; right: 0;',
        '    height: 62px;',
        '    background: #fff;',
        '    border-top: 2px solid #f38c18;',
        '    box-shadow: 0 -2px 12px rgba(0,0,0,.1);',
        '    z-index: 2000;',
        '    align-items: center;',
        '    justify-content: space-around;',
        '  }',
        '  .jory-bottom-nav a {',
        '    display: flex; flex-direction: column;',
        '    align-items: center; justify-content: center;',
        '    color: #1d364a; text-decoration: none;',
        '    font-size: 10px; font-weight: 700;',
        '    gap: 3px; flex: 1;',
        '    transition: color .2s;',
        '  }',
        '  .jory-bottom-nav a:hover { color: #f38c18; }',
        '  .jory-bottom-nav a svg { width: 22px; height: 22px; }',
        '  .jory-bottom-nav-logo {',
        '    width: 56px; height: 56px;',
        '    background: #fff;',
        '    border-radius: 50%;',
        '    border: 3px solid #f38c18;',
        '    display: flex; align-items: center; justify-content: center;',
        '    margin-top: -20px;',
        '    box-shadow: 0 4px 12px rgba(0,0,0,.2);',
        '    flex-shrink: 0;',
        '  }',
        '  .jory-bottom-nav-logo img {',
        '    width: 40px; height: 40px;',
        '    object-fit: contain; border-radius: 50%;',
        '  }',
        '  .jory-bottom-cart-wrap { position: relative; display: flex; flex-direction: column; align-items: center; gap: 3px; flex: 1; }',
        '  .jory-bottom-cart-wrap .cart-badge-bot {',
        '    position: absolute; top: -4px; right: 6px;',
        '    background: #ef4444; color: #fff;',
        '    border-radius: 50%; min-width: 16px; height: 16px;',
        '    font-size: 10px; font-weight: 700;',
        '    display: flex; align-items: center; justify-content: center;',
        '  }',
        '  .jory-float-btns { bottom: 80px; }',
        '}'

    ].join('\n');
    document.head.appendChild(s);
}());


// ══════════════════════════════════════════════════════
//  HTML الهيدر
// ══════════════════════════════════════════════════════
(function injectHeader() {
    var html = ''
    + '<header class="jory-header">'
    +   '<div class="jory-header-inner">'
    +     '<div class="jory-logo">'
    +       '<a href="index.html"><img src="logo.png" alt="الجوري ستور"></a>'
    +     '</div>'

    +     '<form class="jory-search" onsubmit="performSearch(event)">'
    +       '<button type="submit">بحث</button>'
    +       '<input type="text" id="searchInput" placeholder="ابحث عن منتج...">'
    +     '</form>'

    +     '<nav class="jory-nav-actions">'
    +       '<a href="index.html" class="jory-nav-link" id="navHome">الرئيسية</a>'

    // الأقسام — Mega Menu
    +       '<div class="jory-dropdown" id="joryDropdownWrap">'
    +         '<a href="categories.html" class="jory-nav-link" id="navCategories">'
    +           'الأقسام'
    +           '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:2px"><polyline points="6 9 12 15 18 9"></polyline></svg>'
    +         '</a>'

    // الميجا مينيو
    +         '<div class="jory-mega-menu" id="joryMegaMenu">'
    +           '<div class="jory-mega-left" id="joryMegaLeft"></div>'
    +           '<div class="jory-mega-right" id="joryMegaRight">'
    +             '<div class="jory-mega-empty">اختر قسماً من القائمة</div>'
    +           '</div>'
    +         '</div>'
    // fallback قايمة بسيطة (تُستخدم لو لم يتم استدعاء joryRenderNavCategories)
    +         '<div class="jory-dropdown-menu" id="dynamicNavCategories"></div>'
    +       '</div>'

    +       '<div class="jory-cart-wrap">'
    +         '<a href="cart.html" class="jory-cart-btn" id="navCartIcon" title="السلة">'
    +           '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
    +             '<circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle>'
    +             '<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>'
    +           '</svg>'
    +         '</a>'
    +         '<span id="cartBadge" class="cart-badge" style="display:none;">0</span>'
    +       '</div>'

    +       '<a href="account.html" class="jory-nav-link" id="navAccount">حسابي</a>'
    +       '<div id="headerUserInfo"></div>'
    +       '<button class="jory-lang-btn" id="langBtn">English</button>'
    +     '</nav>'

    +     '<button class="jory-hamburger" id="hamburgerBtn" aria-label="القائمة">'
    +       '<span></span><span></span><span></span>'
    +     '</button>'
    +   '</div>'

    // Mobile Drawer
    +   '<div class="jory-mobile-menu" id="mobileMenu">'
    +     '<form class="jory-search" onsubmit="joryMobileSearch(event)">'
    +       '<button type="submit">بحث</button>'
    +       '<input type="text" id="searchInputMobile" placeholder="ابحث عن منتج...">'
    +     '</form>'
    +     '<a href="index.html" class="jory-nav-link">🏠 الرئيسية</a>'
    +     '<div class="jory-mobile-cats" id="joryMobileCats">'
    +       '<a href="categories.html" class="jory-nav-link">📦 الأقسام</a>'
    +     '</div>'
    +     '<a href="cart.html"     class="jory-nav-link">🛒 السلة</a>'
    +     '<a href="account.html"  class="jory-nav-link">👤 حسابي</a>'
    +     '<button class="jory-lang-btn" onclick="var b=document.getElementById(\'langBtn\');if(b)b.click();">English</button>'
    +   '</div>'
    + '</header>';

    var ph = document.getElementById('site-header');
    if (ph) ph.outerHTML = html;
}());


// ══════════════════════════════════════════════════════
//  زراير التواصل الطافية
// ══════════════════════════════════════════════════════
(function injectBottomNav() {
    var html = ''
    + '<nav class="jory-bottom-nav" id="joryBottomNav">'
    +   '<a href="index.html">'
    +     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>'
    +     'الرئيسية'
    +   '</a>'
    +   '<a href="categories.html">'
    +     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect></svg>'
    +     'الأقسام'
    +   '</a>'
    +   '<a href="index.html" class="jory-bottom-nav-logo">'
    +     '<img src="logo.png" alt="الجوري">'
    +   '</a>'
    +   '<a href="account.html">'
    +     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'
    +     'حسابي'
    +   '</a>'
    +   '<div class="jory-bottom-cart-wrap">'
    +     '<a href="cart.html">'
    +       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>'
    +       'السلة'
    +     '</a>'
    +     '<span class="cart-badge-bot" id="cartBadgeBot" style="display:none;">0</span>'
    +   '</div>'
    + '</nav>';
    document.body.insertAdjacentHTML('beforeend', html);
}());

(function injectFloat() {
    var html = ''
    + '<div class="jory-float-btns">'
    +   '<a class="jory-float-btn jory-float-wa"'
    +     ' href="https://wa.me/' + JORY_WHATSAPP + '"'
    +     ' target="_blank" rel="noopener" data-tip="تواصل معنا واتساب" title="واتساب">'
    +     '<svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099'
    +     '-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463'
    +     '-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347'
    +     '.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207'
    +     '-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04'
    +     ' 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306'
    +     ' 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694'
    +     '.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.999 2C6.477 2 2 6.477 2 12'
    +     'c0 1.89.525 3.66 1.438 5.168L2 22l4.918-1.418A9.955 9.955 0 0 0 12 22c5.523 0 10-4.477'
    +     ' 10-10S17.523 2 12 2zm0 18a7.962 7.962 0 0 1-4.062-1.112l-.291-.173-3.024.871.842-3.107'
    +     '-.19-.302A7.952 7.952 0 0 1 4 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.588 8-8 8z"/></svg>'
    +   '</a>'
    +   '<a class="jory-float-btn jory-float-fb"'
    +     ' href="' + JORY_FACEBOOK + '"'
    +     ' target="_blank" rel="noopener" data-tip="صفحتنا على فيسبوك" title="فيسبوك">'
    +     '<svg viewBox="0 0 24 24"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073'
    +     'C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.791-4.697 4.533'
    +     '-4.697 1.313 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.886v2.268h3.328'
    +     'l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>'
    +   '</a>'
    + '</div>';
    document.body.insertAdjacentHTML('beforeend', html);
}());


// ══════════════════════════════════════════════════════
//  Mega Menu — بناء الأقسام والفرعية
//
//  استدعي الدالة دي من store-core.js أو script.js
//  لما تجيب الأقسام من Firebase:
//
//  joryRenderNavCategories([
//    {
//      id: 'cat1',
//      name: 'آيفون',
//      link: 'shop.html?cat=cat1',
//      subs: [
//        { name: 'آيفون 15', link: 'shop.html?list=sub1' },
//        { name: 'آيفون 14', link: 'shop.html?list=sub2' }
//      ]
//    },
//    ...
//  ]);
// ══════════════════════════════════════════════════════
window.joryRenderNavCategories = function (categories) {
    var left    = document.getElementById('joryMegaLeft');
    var right   = document.getElementById('joryMegaRight');
    var fallback = document.getElementById('dynamicNavCategories');
    var mobile  = document.getElementById('joryMobileCats');

    if (!left || !right || !categories || !categories.length) return;

    // إخفاء الـ fallback القديم
    if (fallback) fallback.style.display = 'none';

    var leftHTML  = '';
    var rightHTML = '';
    var mobileHTML = '';

    categories.forEach(function (cat, idx) {
        var catId = 'jcat-' + (cat.id || idx);
        var hasSubs = cat.subs && cat.subs.length;

        // الأقسام الرئيسية (يسار الميجا)
        leftHTML += ''
        + '<a class="jory-mega-cat"'
        +    ' data-cat="' + catId + '"'
        +    ' href="' + (cat.link || 'categories.html') + '">'
        +   cat.name
        +   (hasSubs ? '<span class="jory-mega-cat-arrow">&#8250;</span>' : '')
        + '</a>';

        // الأقسام الفرعية (يمين الميجا)
        var subsHTML = hasSubs
            ? cat.subs.map(function(s) {
                return '<a href="' + (s.link || '#') + '">' + s.name + '</a>';
              }).join('')
            : '<div class="jory-mega-empty">لا توجد أقسام فرعية</div>';

        rightHTML += ''
        + '<div class="jory-mega-sublist"'
        +      ' data-cat="' + catId + '">'
        +   '<div class="jory-mega-sub-title">' + cat.name + '</div>'
        +   subsHTML
        + '</div>';

        // الموبايل — accordion
        if (hasSubs) {
            var subLinks = cat.subs.map(function(s) {
                return '<a href="' + (s.link || '#') + '">' + s.name + '</a>';
            }).join('');
            mobileHTML += ''
            + '<div>'
            +   '<div class="jory-mobile-cat-toggle" data-mob="' + catId + '">'
            +     '📦 ' + cat.name
            +     '<span style="font-size:11px;color:#94a3b8;">▾</span>'
            +   '</div>'
            +   '<div class="jory-mobile-sub-list" id="mob-' + catId + '">' + subLinks + '</div>'
            + '</div>';
        } else {
            mobileHTML += ''
            + '<a href="' + (cat.link || 'categories.html') + '" class="jory-nav-link">'
            +   '📦 ' + cat.name
            + '</a>';
        }
    });

    left.innerHTML  = leftHTML;
    right.innerHTML = rightHTML;
    if (mobile) mobile.innerHTML = mobileHTML;

    // ── إخفاء الفرعية لما الماوس يمشي من القائمة كلها
    var megaMenuEl = document.getElementById('joryMegaMenu');
    if (megaMenuEl) {
        megaMenuEl.addEventListener('mouseleave', function () {
            right.querySelectorAll('.jory-mega-sublist').forEach(function(s) {
                s.classList.remove('active-sub');
            });
            left.querySelectorAll('.jory-mega-cat').forEach(function(c) {
                c.classList.remove('active-cat');
            });
            megaMenuEl.classList.remove('sub-open');
        });
    }

    // ── Hover على الأقسام الرئيسية → إظهار الفرعية
    left.querySelectorAll('.jory-mega-cat').forEach(function (el) {
        el.addEventListener('mouseenter', function () {
            var catId = el.getAttribute('data-cat');

            left.querySelectorAll('.jory-mega-cat').forEach(function(c) {
                c.classList.remove('active-cat');
            });
            el.classList.add('active-cat');

            right.querySelectorAll('.jory-mega-sublist').forEach(function(s) {
                s.classList.remove('active-sub');
            });
            var target = right.querySelector('.jory-mega-sublist[data-cat="' + catId + '"]');
            var megaMenu = document.getElementById('joryMegaMenu');
            if (target) {
                target.classList.add('active-sub');
                if (megaMenu) megaMenu.classList.add('sub-open');
            }
        });
    });

    // ── Mobile accordion
    if (mobile) {
        mobile.querySelectorAll('.jory-mobile-cat-toggle').forEach(function (el) {
            el.addEventListener('click', function () {
                var subId = 'mob-' + el.getAttribute('data-mob');
                var sub   = document.getElementById(subId);
                if (sub) sub.classList.toggle('open');
            });
        });
    }
};


// ══════════════════════════════════════════════════════
//  الهامبرجر
// ══════════════════════════════════════════════════════
function joryInitHamburger() {
    var btn  = document.getElementById('hamburgerBtn');
    var menu = document.getElementById('mobileMenu');
    if (!btn || !menu) return;

    btn.addEventListener('click', function () {
        btn.classList.toggle('open');
        menu.classList.toggle('open');
    });
    window.addEventListener('resize', function () {
        if (window.innerWidth > 768) {
            btn.classList.remove('open');
            menu.classList.remove('open');
        }
    });
}


// ══════════════════════════════════════════════════════
//  بحث الموبايل
// ══════════════════════════════════════════════════════
window.joryMobileSearch = function (e) {
    e.preventDefault();
    var mInput = document.getElementById('searchInputMobile');
    var dInput = document.getElementById('searchInput');
    if (mInput && dInput) dInput.value = mInput.value;
    if (typeof performSearch === 'function') {
        performSearch(e);
    } else if (mInput && mInput.value.trim()) {
        window.location.href = 'shop.html?q=' + encodeURIComponent(mInput.value.trim());
    }
};


// ══════════════════════════════════════════════════════
//  تشغيل بعد جهوز الـ DOM
// ══════════════════════════════════════════════════════
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', joryInitHamburger);
} else {
    joryInitHamburger();
}
