import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Check, Send } from 'lucide-react';
import { MarketingHeader } from '../../components/layout/MarketingHeader';
import { Footer } from '../../components/layout/Footer';
import { api } from '../../lib/api/client';

export function DemoPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    restaurant: '',
    phone: '',
    size: '',
    message: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post<{ id: string }>('/demo', form, { skipAuth: true });
      setStep('success');
    } catch {
      setError('Something went wrong. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-white">
        <MarketingHeader />
        <div className="max-w-lg mx-auto px-4 py-24 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Thank you!</h1>
          <p className="text-lg text-gray-600 mb-8">
            We've received your demo request and will be in touch within 24 hours.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            In the meantime, you can explore the{' '}
            <button onClick={() => navigate('/onboarding')} className="text-[#8B4513] underline hover:text-[#5C4033]">
              self-service setup wizard
            </button>{' '}
            to get started right away.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-[#8B4513] text-white rounded-lg hover:bg-[#5C4033] transition-colors"
          >
            Back to Home
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />

      <section className="bg-gradient-to-b from-amber-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Get a Demo</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            See QCart in action. Fill out the form and we'll show you how it works.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="demo-name" className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
              <input id="demo-name" type="text" required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-[#8B4513] focus:border-[#8B4513]"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label htmlFor="demo-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input id="demo-email" type="email" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-[#8B4513] focus:border-[#8B4513]"
                placeholder="john@myrestaurant.com"
              />
            </div>
            <div>
              <label htmlFor="demo-restaurant" className="block text-sm font-medium text-gray-700 mb-1">Restaurant Name</label>
              <input id="demo-restaurant" type="text" required value={form.restaurant}
                onChange={(e) => setForm({ ...form, restaurant: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-[#8B4513] focus:border-[#8B4513]"
                placeholder="My Restaurant"
              />
            </div>
            <div>
              <label htmlFor="demo-phone" className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
              <input id="demo-phone" type="tel" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-[#8B4513] focus:border-[#8B4513]"
                placeholder="+1 234 567 8900"
              />
            </div>
            <div>
              <label htmlFor="demo-size" className="block text-sm font-medium text-gray-700 mb-1">Restaurant Size</label>
              <select id="demo-size" value={form.size} required
                onChange={(e) => setForm({ ...form, size: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-[#8B4513] focus:border-[#8B4513]"
              >
                <option value="">Select size...</option>
                <option value="1-10">1-10 tables</option>
                <option value="11-25">11-25 tables</option>
                <option value="26-50">26-50 tables</option>
                <option value="50+">50+ tables</option>
              </select>
            </div>
            <div>
              <label htmlFor="demo-message" className="block text-sm font-medium text-gray-700 mb-1">Message (optional)</label>
              <textarea id="demo-message" rows={3} value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:ring-[#8B4513] focus:border-[#8B4513]"
                placeholder="Tell us about your needs..."
              />
            </div>
            {error && <p className="text-sm text-red-600 text-center" role="alert">{error}</p>}
            <div className="flex items-center space-x-4 pt-2">
              <button
                type="submit" disabled={loading}
                className="flex-1 bg-[#8B4513] text-white py-3 rounded-lg font-medium hover:bg-[#5C4033] transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? 'Sending...' : 'Request Demo'}
                {!loading && <Send className="ml-2 h-4 w-4" />}
              </button>
              <button
                type="button" onClick={() => navigate('/onboarding')}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Self-Service Setup
              </button>
            </div>
          </form>
        </div>
      </section>

      <Footer />
    </div>
  );
}
