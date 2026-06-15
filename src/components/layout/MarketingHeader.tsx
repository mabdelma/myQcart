import { Link } from 'react-router';
import { UtensilsCrossed, Menu, X } from 'lucide-react';
import { useState } from 'react';

const navLinks = [
  { to: '/features', label: 'Features' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/contact', label: 'Contact' },
  { to: '/demo', label: 'Get a Demo' },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-white/95 backdrop-blur border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <UtensilsCrossed className="h-7 w-7 text-[#8B4513]" />
            <span className="text-xl font-bold text-gray-900">QCart</span>
          </Link>

          <nav className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm font-medium text-gray-600 hover:text-[#8B4513] transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/signin"
              className="text-sm font-medium text-gray-600 hover:text-[#8B4513] transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/demo"
              className="px-4 py-2 bg-[#8B4513] text-white text-sm font-medium rounded-lg hover:bg-[#5C4033] transition-colors"
            >
              Start Free Trial
            </Link>
          </nav>

          <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>
            {open ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white" role="navigation" aria-label="Mobile navigation">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="block text-sm font-medium text-gray-600 hover:text-[#8B4513] py-2"
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/signin"
              onClick={() => setOpen(false)}
              className="block text-sm font-medium text-gray-600 hover:text-[#8B4513] py-2"
            >
              Sign in
            </Link>
            <Link
              to="/demo"
              onClick={() => setOpen(false)}
              className="block text-center px-4 py-2 bg-[#8B4513] text-white text-sm font-medium rounded-lg"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
