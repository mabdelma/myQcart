import { Link } from 'react-router';
import {
  QrCode, Smartphone, CreditCard, Clock, Users,
  ArrowRight, Shield, BarChart3, Bell
} from 'lucide-react';
import { MarketingHeader } from '../../components/layout/MarketingHeader';
import { Footer } from '../../components/layout/Footer';

const features = [
  {
    icon: QrCode,
    title: 'QR Code Ordering',
    desc: 'Customers scan a QR code at their table to browse the menu, order, and pay — no app download needed.',
  },
  {
    icon: CreditCard,
    title: 'Seamless Payments',
    desc: 'Integrated Stripe payments with support for tips, split bills, and payment links sent via SMS or WhatsApp.',
  },
  {
    icon: Clock,
    title: 'Real-Time Updates',
    desc: 'Orders appear instantly in the kitchen display. Staff get notified the moment an order is placed.',
  },
  {
    icon: Users,
    title: 'Staff Management',
    desc: 'Role-based access for waiters, kitchen, cashiers, and managers. Each role sees exactly what they need.',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reports',
    desc: 'Track revenue, popular items, peak hours, and staff performance with built-in analytics.',
  },
  {
    icon: Shield,
    title: 'Multi-Tenant',
    desc: 'Manage multiple restaurant locations from a single dashboard. Each restaurant has its own menu and staff.',
  },
];

const steps = [
  { num: '01', title: 'Set Up Your Menu', desc: 'Add your categories and items with photos, prices, and modifiers in minutes.' },
  { num: '02', title: 'Print QR Codes', desc: 'Generate unique QR codes for each table. Print and place them on table tents.' },
  { num: '03', title: 'Start Taking Orders', desc: 'Customers scan, browse, order, and pay. Your kitchen gets orders in real time.' },
];

const plans = [
  {
    name: 'Starter',
    price: '$29',
    period: '/month',
    desc: 'Perfect for small cafes and bistros',
    features: ['Up to 3 staff accounts', 'Single location', 'Basic analytics', 'Email support'],
  },
  {
    name: 'Growth',
    price: '$79',
    period: '/month',
    desc: 'Ideal for busy restaurants',
    features: ['Up to 20 staff accounts', 'Up to 3 locations', 'Advanced analytics', 'Priority support', 'Custom branding'],
    popular: true,
  },
  {
    name: 'Enterprise',
    price: '$199',
    period: '/month',
    desc: 'For multi-location chains',
    features: ['Unlimited staff accounts', 'Unlimited locations', 'White-label', 'Dedicated support', 'API access', 'Custom integrations'],
  },
];

export function MarketingLanding() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />

      <section className="relative overflow-hidden bg-gradient-to-b from-amber-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-28 md:pt-28 md:pb-36">
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#8B4513]/10 text-[#8B4513] mb-6">
              Digital Ordering Platform
            </span>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 tracking-tight mb-6">
              Your restaurant,<br />
              <span className="text-[#8B4513]">fully digital</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              QCart lets your customers browse your menu, place orders, and pay from their own phones.
              No apps. No waiting. Just a better dining experience.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/demo"
                className="inline-flex items-center justify-center px-8 py-3 bg-[#8B4513] text-white font-medium rounded-lg hover:bg-[#5C4033] transition-colors text-lg"
              >
                Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/features"
                className="inline-flex items-center justify-center px-8 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-lg"
              >
                See Features
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Everything you need to run your restaurant</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">From menu display to payment processing, QCart handles it all.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-lg hover:border-[#8B4513]/20 transition-all">
                <div className="w-12 h-12 bg-[#8B4513]/10 rounded-lg flex items-center justify-center mb-4">
                  <f.icon className="h-6 w-6 text-[#8B4513]" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How it works</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">Get started in three simple steps.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {steps.map((s) => (
              <div key={s.num} className="text-center">
                <div className="w-16 h-16 bg-[#8B4513] rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-white text-xl font-bold">{s.num}</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{s.title}</h3>
                <p className="text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">No hidden fees. No long-term contracts. Cancel anytime.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-8 ${
                  plan.popular
                    ? 'border-[#8B4513] shadow-lg bg-white scale-105'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#8B4513] text-white text-xs font-medium rounded-full">
                    Most Popular
                  </span>
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
                      <Bell className="h-4 w-4 text-green-500 mr-2 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/demo"
                  className={`block text-center py-3 rounded-lg font-medium transition-colors ${
                    plan.popular
                      ? 'bg-[#8B4513] text-white hover:bg-[#5C4033]'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-[#8B4513]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to digitize your restaurant?
          </h2>
          <p className="text-lg text-amber-100 mb-10 max-w-2xl mx-auto">
            Join hundreds of restaurants using QCart to streamline operations and increase revenue.
          </p>
          <Link
            to="/demo"
            className="inline-flex items-center px-8 py-3 bg-white text-[#8B4513] font-medium rounded-lg hover:bg-amber-50 transition-colors text-lg"
          >
            Request a Demo <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
