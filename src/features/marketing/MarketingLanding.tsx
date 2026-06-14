import { Link } from 'react-router';
import {
  QrCode, CreditCard, Clock, Users, ArrowRight, Shield, BarChart3,
  Check, Star, Zap, Utensils, ChevronDown,
} from 'lucide-react';
import { MarketingHeader } from '../../components/layout/MarketingHeader';
import { Footer } from '../../components/layout/Footer';

const stats = [
  { value: '300+', label: 'Restaurants' },
  { value: '1.2M+', label: 'Orders served' },
  { value: '30%', label: 'Faster turnover' },
  { value: '4.9★', label: 'Owner rating' },
];

const features = [
  { icon: QrCode, title: 'QR Code Ordering', desc: 'Guests scan a code at the table to browse, order, and pay from their own phone — no app to download.' },
  { icon: CreditCard, title: 'Seamless Payments', desc: 'Stripe-powered checkout with tips, split bills, and shareable payment links over SMS or WhatsApp.' },
  { icon: Clock, title: 'Real-Time Kitchen', desc: 'Orders hit the kitchen display the instant they’re placed. Staff are notified automatically.' },
  { icon: Users, title: 'Role-Based Staff', desc: 'Tailored views for waiters, kitchen, cashiers, and managers — everyone sees exactly what they need.' },
  { icon: BarChart3, title: 'Analytics & Reports', desc: 'Track revenue, best-sellers, peak hours, and staff performance with built-in dashboards.' },
  { icon: Shield, title: 'Multi-Location', desc: 'Run every branch from one platform, each with its own menu, tables, staff, and reporting.' },
];

const steps = [
  { num: '01', icon: Utensils, title: 'Build your menu', desc: 'Add categories and items with photos, prices, and modifiers in minutes.' },
  { num: '02', icon: QrCode, title: 'Print QR codes', desc: 'Generate a unique code per table, print it, and place it on the table tent.' },
  { num: '03', icon: Zap, title: 'Start serving', desc: 'Guests scan, order, and pay. Your kitchen gets every order in real time.' },
];

const plans = [
  { name: 'Starter', price: '$29', period: '/mo', desc: 'For small cafes and bistros', features: ['Up to 3 staff accounts', 'Single location', 'Basic analytics', 'Email support'] },
  { name: 'Growth', price: '$79', period: '/mo', desc: 'For busy, growing restaurants', features: ['Up to 20 staff accounts', 'Up to 3 locations', 'Advanced analytics', 'Priority support', 'Custom branding'], popular: true },
  { name: 'Enterprise', price: '$199', period: '/mo', desc: 'For multi-location chains', features: ['Unlimited staff & locations', 'White-label', 'Dedicated support', 'API access', 'Custom integrations'] },
];

const testimonials = [
  { quote: 'Table turnover went up noticeably in the first month. Guests love ordering without flagging down a server.', name: 'Maria S.', role: 'Owner, Bella Cucina' },
  { quote: 'Setup took an afternoon. The kitchen display alone paid for itself — no more lost paper tickets.', name: 'James O.', role: 'Manager, The Corner Diner' },
  { quote: 'Split bills and tips used to be chaos. Now customers handle it themselves and we just watch revenue land.', name: 'Priya K.', role: 'Owner, Spice Route' },
];

const faqs = [
  { q: 'Do my customers need to download an app?', a: 'No. Guests scan the table QR code and everything runs in their phone’s browser — menu, ordering, and payment.' },
  { q: 'How long does setup take?', a: 'Most restaurants are live the same day. Add your menu, generate table QR codes, and you’re ready to take orders.' },
  { q: 'Can I take payments?', a: 'Yes. QCart uses Stripe for secure card payments, with tips, split bills, and shareable payment links built in.' },
  { q: 'Can I manage more than one location?', a: 'Absolutely. Run multiple restaurants from one account, each with its own menu, staff, tables, and analytics.' },
];

export function MarketingLanding() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-amber-50 via-white to-white">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-[#8B4513]/10 blur-3xl" />
        <div className="pointer-events-none absolute top-40 -left-24 h-80 w-80 rounded-full bg-amber-200/40 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-[#8B4513]/10 text-[#8B4513] mb-6">
                <Star className="h-3.5 w-3.5 fill-current" /> Trusted by 300+ restaurants
              </span>
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 tracking-tight mb-6">
                Turn every table into a<br className="hidden md:block" />{' '}
                <span className="text-[#8B4513]">self-service</span> revenue engine
              </h1>
              <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-xl mx-auto lg:mx-0">
                QCart lets guests scan, order, and pay from their phones — no app, no waiting.
                Your kitchen and staff stay in sync in real time.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to="/demo" className="inline-flex items-center justify-center px-8 py-3.5 bg-[#8B4513] text-white font-medium rounded-lg hover:bg-[#5C4033] transition-colors text-lg shadow-sm">
                  Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link to="/features" className="inline-flex items-center justify-center px-8 py-3.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-lg">
                  See Features
                </Link>
              </div>
              <p className="mt-5 text-sm text-gray-500 flex items-center gap-2 justify-center lg:justify-start">
                <Check className="h-4 w-4 text-green-600" /> No credit card required · 14-day free trial
              </p>
            </div>

            {/* Phone mockup */}
            <div className="flex justify-center lg:justify-end">
              <PhoneMockup />
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative border-t border-gray-100 bg-white/60 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-3xl font-bold text-[#8B4513]">{s.value}</div>
                <div className="text-sm text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Everything you need to run service</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">From the first scan to the final payment, QCart handles it all.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="group bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:border-[#8B4513]/20 hover:-translate-y-1 transition-all">
                <div className="w-12 h-12 bg-[#8B4513]/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#8B4513] transition-colors">
                  <f.icon className="h-6 w-6 text-[#8B4513] group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Live in three steps</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">No hardware. No installs. Just your menu and a printer.</p>
          </div>
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="hidden md:block absolute top-8 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-[#8B4513]/30 via-[#8B4513]/30 to-[#8B4513]/30" />
            {steps.map((s) => (
              <div key={s.num} className="relative text-center">
                <div className="w-16 h-16 bg-[#8B4513] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#8B4513]/20">
                  <s.icon className="h-7 w-7 text-white" />
                </div>
                <div className="text-xs font-semibold text-[#8B4513] tracking-widest mb-2">STEP {s.num}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{s.title}</h3>
                <p className="text-gray-600 max-w-xs mx-auto">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Showcase ────────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-14 items-center">
          <div className="order-2 lg:order-1">
            <DashboardMockup />
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">From scan to paid in under a minute</h2>
            <p className="text-lg text-gray-600 mb-8">
              Cut wait times, eliminate order errors, and free your staff to focus on hospitality — while the dashboard keeps you on top of every table and every dollar.
            </p>
            <ul className="space-y-4">
              {[
                'Live order feed across kitchen, waiters, and cashiers',
                'Tips & split payments handled by the guest',
                'Revenue, best-sellers, and peak hours at a glance',
                'One dashboard for every location',
              ].map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100">
                    <Check className="h-4 w-4 text-green-600" />
                  </span>
                  <span className="text-gray-700">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Loved by restaurant owners</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">Real operators, real results.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <figure key={t.name} className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col">
                <div className="flex gap-1 mb-4 text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <blockquote className="text-gray-700 leading-relaxed flex-1">“{t.quote}”</blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#8B4513]/10 text-[#8B4513] flex items-center justify-center font-semibold">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.role}</div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">No hidden fees. No long-term contracts. Cancel anytime.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-start">
            {plans.map((plan) => (
              <div key={plan.name} className={`relative rounded-2xl border p-8 bg-white ${plan.popular ? 'border-[#8B4513] shadow-xl md:scale-105' : 'border-gray-200'}`}>
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#8B4513] text-white text-xs font-medium rounded-full">Most Popular</span>
                )}
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{plan.desc}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-500">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start text-sm text-gray-600">
                      <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Link to="/demo" className={`block text-center py-3 rounded-lg font-medium transition-colors ${plan.popular ? 'bg-[#8B4513] text-white hover:bg-[#5C4033]' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}>
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Frequently asked questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((f) => (
              <details key={f.q} className="group bg-white rounded-xl border border-gray-100 p-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between font-medium text-gray-900">
                  {f.q}
                  <ChevronDown className="h-5 w-5 text-gray-400 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm text-gray-600 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-[#8B4513] relative overflow-hidden">
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to digitize your restaurant?</h2>
          <p className="text-lg text-amber-100 mb-10 max-w-2xl mx-auto">Join hundreds of restaurants using QCart to streamline service and grow revenue.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/demo" className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-[#8B4513] font-medium rounded-lg hover:bg-amber-50 transition-colors text-lg">
              Request a Demo <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link to="/signin" className="inline-flex items-center justify-center px-8 py-3.5 border border-white/40 text-white font-medium rounded-lg hover:bg-white/10 transition-colors text-lg">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

/* ── CSS-only phone mockup (no external images) ───────────────────────────── */
function PhoneMockup() {
  const items = [
    { name: 'Classic Burger', price: '12.99' },
    { name: 'Margherita Pizza', price: '14.99' },
    { name: 'Fresh Lemonade', price: '4.99' },
  ];
  return (
    <div className="relative">
      {/* floating QR chip */}
      <div className="absolute -left-6 top-10 z-10 hidden sm:flex flex-col items-center gap-1 rounded-xl bg-white p-3 shadow-xl ring-1 ring-gray-100">
        <QrCode className="h-10 w-10 text-[#8B4513]" />
        <span className="text-[10px] font-medium text-gray-500">Scan to order</span>
      </div>

      <div className="w-[270px] rounded-[2.5rem] border-[10px] border-gray-900 bg-gray-900 shadow-2xl">
        <div className="relative overflow-hidden rounded-[1.8rem] bg-white">
          {/* notch */}
          <div className="absolute left-1/2 top-0 z-10 h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-gray-900" />
          {/* app header */}
          <div className="bg-[#8B4513] px-5 pb-4 pt-7 text-white">
            <div className="text-xs/none opacity-80">Table 4 · Dine in</div>
            <div className="mt-1 text-lg font-bold">Demo Cafe</div>
          </div>
          {/* menu */}
          <div className="space-y-2 px-4 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Popular</div>
            {items.map((it, i) => (
              <div key={it.name} className="flex items-center gap-3 rounded-xl border border-gray-100 p-2.5">
                <div className={`h-11 w-11 shrink-0 rounded-lg ${['bg-amber-100', 'bg-orange-100', 'bg-yellow-100'][i]}`} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-gray-900">{it.name}</div>
                  <div className="text-xs text-gray-500">${it.price}</div>
                </div>
                <button className="h-7 w-7 rounded-full bg-[#8B4513] text-base font-bold leading-none text-white">+</button>
              </div>
            ))}
          </div>
          {/* cart bar */}
          <div className="px-4 pb-5">
            <div className="flex items-center justify-between rounded-xl bg-[#8B4513] px-4 py-3 text-white shadow-lg">
              <span className="text-sm font-medium">View cart · 3</span>
              <span className="text-sm font-bold">$32.97</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── CSS-only dashboard mockup ────────────────────────────────────────────── */
function DashboardMockup() {
  const bars = [40, 65, 50, 80, 60, 95, 75];
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xl">
      <div className="mb-4 flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
        <span className="ml-3 text-xs text-gray-400">qcart.app/dashboard</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[{ l: "Today's Sales", v: '$1,284' }, { l: 'Orders', v: '96' }, { l: 'Avg. Ticket', v: '$13.4' }].map((k) => (
          <div key={k.l} className="rounded-xl bg-gray-50 p-3">
            <div className="text-[11px] text-gray-500">{k.l}</div>
            <div className="text-lg font-bold text-gray-900">{k.v}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-gray-100 p-4">
        <div className="mb-3 text-xs font-medium text-gray-500">Revenue · this week</div>
        <div className="flex h-28 items-end gap-2">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 rounded-t-md bg-[#8B4513]/80" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
