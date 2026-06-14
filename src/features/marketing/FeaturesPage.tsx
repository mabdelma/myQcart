import {
  Smartphone, QrCode, CreditCard, Users, BarChart3, Bell,
  Shield, Globe, Clock, Printer, Sliders, Zap
} from 'lucide-react';
import { MarketingHeader } from '../../components/layout/MarketingHeader';
import { Footer } from '../../components/layout/Footer';

const featureGroups = [
  {
    title: 'For Customers',
    items: [
      { icon: Smartphone, title: 'Scan & Order', desc: 'Customers scan a QR code to view the menu and place orders from their phone. No app download required.' },
      { icon: CreditCard, title: 'Pay at Table', desc: 'Integrated Stripe payments let customers pay by card or digital wallet. Support tips and split bills.' },
      { icon: Clock, title: 'Order Tracking', desc: 'Real-time order status shows when the kitchen starts preparing, when it\'s ready, and when it\'s delivered.' },
    ],
  },
  {
    title: 'For Staff',
    items: [
      { icon: Bell, title: 'Kitchen Display', desc: 'Orders appear instantly on the kitchen screen. Staff update status with one tap.' },
      { icon: Users, title: 'Role Management', desc: 'Assign roles — waiter, kitchen, cashier, manager — each with tailored views and permissions.' },
      { icon: Globe, title: 'Multi-Table View', desc: 'Waiters see all their tables at a glance: new orders, pending deliveries, and bill requests.' },
    ],
  },
  {
    title: 'For Management',
    items: [
      { icon: BarChart3, title: 'Analytics', desc: 'Track revenue, popular items, peak hours, and table turnover. Export reports for accounting.' },
      { icon: Sliders, title: 'Menu Management', desc: 'Update prices, descriptions, and availability in real time. Add modifiers and photos.' },
      { icon: Printer, title: 'Payment Links', desc: 'Generate shareable payment links for takeout, delivery, or split bills sent via SMS or WhatsApp.' },
    ],
  },
];

export function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />

      <section className="bg-gradient-to-b from-amber-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">All Features</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Everything your restaurant needs to go digital, from the first scan to the final receipt.
          </p>
        </div>
      </section>

      {featureGroups.map((group) => (
        <section key={group.title} className="py-16 border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-10">{group.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {group.items.map((item) => (
                <div key={item.title} className="bg-white rounded-xl border border-gray-100 p-6">
                  <div className="w-12 h-12 bg-[#8B4513]/10 rounded-lg flex items-center justify-center mb-4">
                    <item.icon className="h-6 w-6 text-[#8B4513]" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      <Footer />
    </div>
  );
}
