import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
    const [lang, setLang] = useState('en');
    const navigate        = useNavigate();
    const ar              = lang === 'ar';

    const t = {
        nav_login:    ar ? 'تسجيل الدخول'   : 'Sign in',
        nav_register: ar ? 'إنشاء حساب'      : 'Get started',

        hero_tag:     ar ? '🇬🇧 المملكة المتحدة ↔ السودان 🇸🇩' : '🇬🇧 United Kingdom ↔ Sudan 🇸🇩',
        hero_h1a:     ar ? 'أرسل الأموال'    : 'Send Money.',
        hero_h1b:     ar ? 'استثمر بذكاء'    : 'Invest Smart.',
        hero_sub:     ar ? 'منصة الحوالة الأولى المدعومة بالذكاء الاصطناعي للتحويلات بين المملكة المتحدة والسودان. آمنة، سريعة، وشفافة.'
                         : 'The first AI-powered hawala platform for UK–Sudan transfers. Secure, fast, and fully transparent.',
        hero_cta1:    ar ? 'ابدأ الآن مجاناً' : 'Start for free',
        hero_cta2:    ar ? 'اعرف أكثر'       : 'Learn more',
        hero_stat1:   ar ? 'مستخدم نشط'      : 'Active users',
        hero_stat2:   ar ? 'تحويل مكتمل'     : 'Transfers done',
        hero_stat3:   ar ? 'دول مدعومة'       : 'Countries',

        feat_title:   ar ? 'لماذا HawalaLink؟' : 'Why HawalaLink?',
        feat_sub:     ar ? 'كل ما تحتاجه في منصة واحدة' : 'Everything you need in one platform',
        features: [
            { icon: '⚡', title: ar ? 'تحويلات فورية'     : 'Instant Transfers',     desc: ar ? 'أرسل الأموال من المملكة المتحدة إلى السودان في دقائق'         : 'Send money from UK to Sudan in minutes with real-time confirmation.' },
            { icon: '📈', title: ar ? 'استثمر أموالك'      : 'Grow Your Money',       desc: ar ? 'استثمر بالجنيه السوداني واحصل على قيمة أعلى مع تغير الأسعار'   : 'Invest in SDG and watch your GBP value grow as exchange rates shift.' },
            { icon: '🤖', title: ar ? 'مدعوم بالذكاء الاصطناعي' : 'AI-Powered',       desc: ar ? 'وكلاء ذكاء اصطناعي يراقبون السيولة ويكشفون الاحتيال تلقائياً' : 'AI agents monitor liquidity, detect fraud, and advise on best cashout times.' },
            { icon: '🔒', title: ar ? 'آمن بالكامل'        : 'Fully Secure',          desc: ar ? 'تشفير كامل وحماية متقدمة لجميع معاملاتك'                      : 'End-to-end encryption and advanced fraud detection protect every transaction.' },
            { icon: '💱', title: ar ? 'أسعار صرف شفافة'   : 'Transparent Rates',     desc: ar ? 'شاهد سعر الصرف الحالي قبل كل تحويل بدون رسوم خفية'            : 'See the exact rate before every transfer. No hidden fees, ever.' },
            { icon: '📱', title: ar ? 'سهل الاستخدام'      : 'Easy to Use',           desc: ar ? 'واجهة بسيطة تعمل على جميع الأجهزة'                            : 'Clean, simple interface that works on any device, anywhere.' },
        ],

        how_title:    ar ? 'كيف يعمل'         : 'How it works',
        steps: [
            { n: '01', title: ar ? 'أنشئ حسابك'    : 'Create your account',  desc: ar ? 'سجّل مجاناً في دقيقة واحدة'                  : 'Sign up for free in under a minute.' },
            { n: '02', title: ar ? 'أدخل المبلغ'    : 'Enter your amount',    desc: ar ? 'اختر المبلغ وشاهد التفاصيل الكاملة فوراً'    : 'Enter the amount and see full breakdown instantly.' },
            { n: '03', title: ar ? 'أرسل أو استثمر' : 'Send or invest',       desc: ar ? 'أرسل لشخص آخر أو استثمر لفترة محددة'         : 'Transfer to a recipient or lock funds in an investment period.' },
            { n: '04', title: ar ? 'تتبع في الوقت الحقيقي' : 'Track in real time', desc: ar ? 'راقب تحويلاتك واستثماراتك لحظة بلحظة' : 'Monitor your transfers and investments live on your dashboard.' },
        ],

        price_title:  ar ? 'الأسعار'           : 'Pricing',
        price_sub:    ar ? 'بسيط وشفاف — بدون رسوم خفية' : 'Simple and transparent — no hidden fees',
        plans: [
            {
                name:  ar ? 'المستخدم البريطاني' : 'UK User',
                flag:  '🇬🇧',
                price: ar ? '£1'                  : '£1',
                per:   ar ? 'لكل تحويل'           : 'per transfer',
                color: '#1D9E75',
                bg:    'linear-gradient(135deg, #1D9E75, #0F6E56)',
                features: ar
                    ? ['رسوم ثابتة £1 فقط', 'تحويل SDG فوري', 'تأكيد فوري', 'دعم على مدار الساعة']
                    : ['Flat £1 fee only', 'Instant SDG transfer', 'Real-time confirmation', '24/7 support'],
            },
            {
                name:  ar ? 'المستخدم السوداني' : 'Sudan User',
                flag:  '🇸🇩',
                price: ar ? '5,000'              : '5,000',
                per:   ar ? 'SDG لكل استثمار'    : 'SDG per investment',
                color: '#378ADD',
                bg:    'linear-gradient(135deg, #378ADD, #1A5FAD)',
                features: ar
                    ? ['رسوم خدمة 5000 SDG', 'استثمار 6/9/12 شهر', 'تتبع قيمة GBP لحظياً', 'خيار إعادة الاستثمار']
                    : ['5,000 SDG service fee', '6/9/12 month periods', 'Live GBP value tracking', 'Reinvest option'],
                highlight: true,
            },
        ],

        cta_title:    ar ? 'جاهز للبدء؟'       : 'Ready to get started?',
        cta_sub:      ar ? 'انضم إلى آلاف المستخدمين الذين يثقون بـ HawalaLink لتحويلاتهم واستثماراتهم'
                         : 'Join thousands of users who trust HawalaLink for their transfers and investments.',
        cta_btn1:     ar ? 'أنشئ حسابك الآن'   : 'Create your account',
        cta_btn2:     ar ? 'تسجيل الدخول'       : 'Sign in',

        footer:       ar ? '© 2025 HawalaLink. جميع الحقوق محفوظة.' : '© 2025 HawalaLink. All rights reserved.',
    };

    return (
        <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', direction: ar ? 'rtl' : 'ltr', background: '#0a0a0a', color: 'white', minHeight: '100vh' }}>

            {/* ── Navbar ── */}
            <nav style={N.nav}>
                <div style={N.navInner}>
                    <span style={N.navLogo}>HawalaLink</span>
                    <div style={N.navRight}>
                        <button onClick={() => setLang(ar ? 'en' : 'ar')} style={N.langBtn}>
                            {ar ? 'EN' : 'عربي'}
                        </button>
                        <button onClick={() => navigate('/login')} style={N.navLogin}>{t.nav_login}</button>
                        <button onClick={() => navigate('/register')} style={N.navRegister}>{t.nav_register}</button>
                    </div>
                </div>
            </nav>

            {/* ── Hero ── */}
            <section style={H.section}>
                {/* Background gradient blobs */}
                <div style={{ ...H.blob, top: -100, left: ar ? 'auto' : -100, right: ar ? -100 : 'auto', background: 'radial-gradient(circle, rgba(29,158,117,0.3) 0%, transparent 70%)' }} />
                <div style={{ ...H.blob, bottom: -50, right: ar ? 'auto' : -50, left: ar ? -50 : 'auto', background: 'radial-gradient(circle, rgba(55,138,221,0.2) 0%, transparent 70%)' }} />

                <div style={H.inner}>
                    <div style={H.tag}>{t.hero_tag}</div>
                    <h1 style={H.h1}>
                        <span style={{ color: '#1D9E75' }}>{t.hero_h1a}</span>{' '}
                        <span style={{ background: 'linear-gradient(135deg, #378ADD, #1D9E75)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t.hero_h1b}</span>
                    </h1>
                    <p style={H.sub}>{t.hero_sub}</p>
                    <div style={H.ctaRow}>
                        <button onClick={() => navigate('/register')} style={H.cta1}>{t.hero_cta1}</button>
                        <button onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })} style={H.cta2}>{t.hero_cta2}</button>
                    </div>
                    <div style={H.statsRow}>
                        {[['2,000+', t.hero_stat1], ['10,000+', t.hero_stat2], ['2', t.hero_stat3]].map(([val, label]) => (
                            <div key={label} style={H.stat}>
                                <p style={H.statVal}>{val}</p>
                                <p style={H.statLabel}>{label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Features ── */}
            <section id="features" style={F.section}>
                <div style={F.inner}>
                    <p style={F.tag}>✦ {t.feat_title}</p>
                    <h2 style={F.h2}>{t.feat_sub}</h2>
                    <div style={F.grid}>
                        {t.features.map((f, i) => (
                            <div key={i} style={F.card}>
                                <div style={F.icon}>{f.icon}</div>
                                <h3 style={F.cardTitle}>{f.title}</h3>
                                <p style={F.cardDesc}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── How it works ── */}
            <section style={W.section}>
                <div style={W.inner}>
                    <p style={F.tag}>✦ {t.how_title}</p>
                    <div style={W.steps}>
                        {t.steps.map((s, i) => (
                            <div key={i} style={W.step}>
                                <div style={W.stepNum}>{s.n}</div>
                                <div style={W.stepLine} />
                                <h3 style={W.stepTitle}>{s.title}</h3>
                                <p style={W.stepDesc}>{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Pricing ── */}
            <section style={P.section}>
                <div style={P.inner}>
                    <p style={F.tag}>✦ {t.price_title}</p>
                    <h2 style={F.h2}>{t.price_sub}</h2>
                    <div style={P.cards}>
                        {t.plans.map((plan, i) => (
                            <div key={i} style={{ ...P.card, ...(plan.highlight ? P.cardHL : {}) }}>
                                {plan.highlight && <div style={P.badge}>{ar ? '🌟 الأكثر شيوعاً' : '🌟 Most Popular'}</div>}
                                <div style={{ background: plan.bg, borderRadius: 12, padding: '1.5rem', marginBottom: 20 }}>
                                    <div style={{ fontSize: 32, marginBottom: 8 }}>{plan.flag}</div>
                                    <p style={P.planName}>{plan.name}</p>
                                    <p style={P.planPrice}>{plan.price}</p>
                                    <p style={P.planPer}>{plan.per}</p>
                                </div>
                                <ul style={P.list}>
                                    {plan.features.map((f, j) => (
                                        <li key={j} style={P.listItem}>
                                            <span style={{ color: plan.color, marginRight: ar ? 0 : 8, marginLeft: ar ? 8 : 0 }}>✓</span>
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <button onClick={() => navigate('/register')} style={{ ...P.btn, background: plan.bg }}>
                                    {ar ? 'ابدأ الآن' : 'Get started'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section style={C.section}>
                <div style={C.blob} />
                <div style={C.inner}>
                    <h2 style={C.h2}>{t.cta_title}</h2>
                    <p style={C.sub}>{t.cta_sub}</p>
                    <div style={C.btns}>
                        <button onClick={() => navigate('/register')} style={C.btn1}>{t.cta_btn1}</button>
                        <button onClick={() => navigate('/login')} style={C.btn2}>{t.cta_btn2}</button>
                    </div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer style={{ textAlign: 'center', padding: '2rem', color: '#555', fontSize: 13, borderTop: '1px solid #1a1a1a' }}>
                {t.footer}
            </footer>
        </div>
    );
}

// ── Nav styles ────────────────────────────────────────────────────
const N = {
    nav:       { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', background: 'rgba(10,10,10,0.8)' },
    navInner:  { maxWidth: 1100, margin: '0 auto', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    navLogo:   { fontSize: 20, fontWeight: 700, color: '#1D9E75', letterSpacing: -0.5 },
    navRight:  { display: 'flex', alignItems: 'center', gap: 12 },
    langBtn:   { padding: '6px 14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#aaa', fontSize: 13, cursor: 'pointer' },
    navLogin:  { padding: '8px 18px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: 'white', fontSize: 14, cursor: 'pointer' },
    navRegister:{ padding: '8px 20px', background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', border: 'none', borderRadius: 8, color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};

// ── Hero styles ───────────────────────────────────────────────────
const H = {
    section:   { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', paddingTop: 64 },
    blob:      { position: 'absolute', width: 600, height: 600, borderRadius: '50%', pointerEvents: 'none' },
    inner:     { maxWidth: 700, margin: '0 auto', padding: '4rem 2rem', textAlign: 'center', position: 'relative', zIndex: 1 },
    tag:       { display: 'inline-block', background: 'rgba(29,158,117,0.15)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: 20, padding: '6px 16px', fontSize: 13, color: '#1D9E75', marginBottom: 24 },
    h1:        { fontSize: 'clamp(2.5rem, 8vw, 5rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: 20, letterSpacing: -2 },
    sub:       { fontSize: 18, color: '#aaa', lineHeight: 1.6, marginBottom: 36, maxWidth: 560, margin: '0 auto 36px' },
    ctaRow:    { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 60 },
    cta1:      { padding: '14px 32px', background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', border: 'none', borderRadius: 12, color: 'white', fontSize: 16, fontWeight: 600, cursor: 'pointer', boxShadow: '0 0 30px rgba(29,158,117,0.4)' },
    cta2:      { padding: '14px 32px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'white', fontSize: 16, cursor: 'pointer' },
    statsRow:  { display: 'flex', gap: 40, justifyContent: 'center', flexWrap: 'wrap' },
    stat:      { textAlign: 'center' },
    statVal:   { fontSize: 28, fontWeight: 800, color: 'white' },
    statLabel: { fontSize: 13, color: '#666', marginTop: 4 },
};

// ── Features styles ───────────────────────────────────────────────
const F = {
    section:   { padding: '6rem 2rem', background: '#0d0d0d' },
    inner:     { maxWidth: 1100, margin: '0 auto' },
    tag:       { fontSize: 13, color: '#1D9E75', fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, display: 'block' },
    h2:        { fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 700, color: 'white', marginBottom: 48, letterSpacing: -1 },
    grid:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 },
    card:      { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '1.75rem', transition: 'border-color 0.2s' },
    icon:      { fontSize: 32, marginBottom: 16 },
    cardTitle: { fontSize: 17, fontWeight: 600, color: 'white', marginBottom: 10 },
    cardDesc:  { fontSize: 14, color: '#777', lineHeight: 1.6 },
};

// ── How it works styles ───────────────────────────────────────────
const W = {
    section:   { padding: '6rem 2rem', background: '#0a0a0a' },
    inner:     { maxWidth: 1100, margin: '0 auto' },
    steps:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24, marginTop: 48 },
    step:      { position: 'relative' },
    stepNum:   { fontSize: 48, fontWeight: 900, color: 'rgba(29,158,117,0.2)', lineHeight: 1, marginBottom: 12 },
    stepLine:  { width: 40, height: 3, background: 'linear-gradient(90deg, #1D9E75, transparent)', borderRadius: 2, marginBottom: 16 },
    stepTitle: { fontSize: 16, fontWeight: 600, color: 'white', marginBottom: 8 },
    stepDesc:  { fontSize: 14, color: '#777', lineHeight: 1.6 },
};

// ── Pricing styles ────────────────────────────────────────────────
const P = {
    section:   { padding: '6rem 2rem', background: '#0d0d0d' },
    inner:     { maxWidth: 900, margin: '0 auto' },
    cards:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginTop: 48 },
    card:      { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '1.75rem', position: 'relative' },
    cardHL:    { border: '1px solid rgba(29,158,117,0.4)', background: 'rgba(29,158,117,0.05)', boxShadow: '0 0 40px rgba(29,158,117,0.1)' },
    badge:     { position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', borderRadius: 20, padding: '4px 16px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' },
    planName:  { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 8 },
    planPrice: { fontSize: 42, fontWeight: 800, color: 'white', lineHeight: 1 },
    planPer:   { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
    list:      { listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 10 },
    listItem:  { fontSize: 14, color: '#aaa', display: 'flex', alignItems: 'center' },
    btn:       { width: '100%', padding: 14, border: 'none', borderRadius: 10, color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer' },
};

// ── CTA styles ────────────────────────────────────────────────────
const C = {
    section:   { padding: '8rem 2rem', position: 'relative', overflow: 'hidden', background: '#0a0a0a', textAlign: 'center' },
    blob:      { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 800, height: 400, background: 'radial-gradient(ellipse, rgba(29,158,117,0.15) 0%, transparent 70%)', pointerEvents: 'none' },
    inner:     { position: 'relative', zIndex: 1, maxWidth: 600, margin: '0 auto' },
    h2:        { fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, color: 'white', marginBottom: 16, letterSpacing: -1 },
    sub:       { fontSize: 16, color: '#777', lineHeight: 1.6, marginBottom: 40 },
    btns:      { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' },
    btn1:      { padding: '16px 40px', background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', border: 'none', borderRadius: 12, color: 'white', fontSize: 16, fontWeight: 600, cursor: 'pointer', boxShadow: '0 0 30px rgba(29,158,117,0.4)' },
    btn2:      { padding: '16px 40px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'white', fontSize: 16, cursor: 'pointer' },
};
