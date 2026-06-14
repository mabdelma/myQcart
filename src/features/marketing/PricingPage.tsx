import { Link } from 'react-router';
import { Check } from 'lucide-react';
import { MarketingHeader } from '../../components/layout/MarketingHeader';
import { Footer } from '../../components/layout/Footer';

const plans = [
  {
    name: 'Starter',
    price: '$29',
    period: '/month',
    desc: 'Perfect for small cafes and bistros getting started with digital ordering.',
    features: [
      'Up to 3 staff accounts',
      'Single restaurant location',
      'Basic sales analytics',
      'Email support (48h response)',
      'Standard QR code generation',
      'Up to 50 menu items',
    ],
  },
  {
    name: 'Growth',
    price: '$79',
    period: '/month',
    desc: 'Ideal for busy restaurants that need more flexibility and control.',
    features: [
      'Up to 20 staff accounts',
      'Up to 3 locations',
      'Advanced analytics & reports',
      'Priority email & chat support',
      'Custom branding (logo, colors)',
      'Unlimited menu items',
      'Payment link generation',
      'Staff performance metrics',
    ],
    popular: true,
  },
  {
    name: 'Enterprise',
    price: '$199',
    period: '/month',
    desc: 'For multi-location chains and high-volume operations.',
    features: [
      'Unlimited staff accounts',
      'Unlimited locations',
      'White-label (your domain, your brand)',
      'Dedicated account manager',
      'API access for custom integrations',
      'On-premise deployment option',
      'Custom reporting & exports',
      'SLA guarantee (99.9% uptime)',
    ],
  },
];

const faqs = [
  { q: 'Is there a setup fee?', a: 'No. All plans include free setup and onboarding assistance.' },
  { q: 'Can I cancel anytime?', a: 'Yes. No long-term contracts. Cancel with 30 days notice.' },
  { q: 'Do you offer a free trial?', a: 'Yes. All plans include a 14-day free trial with full features.' },
  { q: 'What payment methods are supported?', a: 'We integrate with Stripe, supporting credit cards, digital wallets, and bank transfers.' },
];

export function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />

      <section className="bg-gradient-to-b from-amber-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#8B4513]/10 text-[#8B4513] mb-6">
            Pricing
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            No hidden fees. No long-term contracts. Cancel anytime.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-8 ${
                  plan.popular
                    ? 'border-[#8B4513] shadow-xl bg-white scale-105 z-10'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#8B4513] text-white text-xs font-medium rounded-full whitespace-nowrap">
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
                      <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 shrink-0" />
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
                  Start Free Trial
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Frequently asked questions</h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="bg-white rounded-lg p-6 border border-gray-100">
                <h3 className="font-medium text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-sm text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
