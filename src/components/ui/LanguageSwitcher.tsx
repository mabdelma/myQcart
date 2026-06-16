import { useState, useRef, useEffect } from 'react';
import { useI18n, LOCALE_NAMES, type Locale } from '../../contexts/I18nContext';
import { Languages } from 'lucide-react';

const LOCALES = Object.keys(LOCALE_NAMES) as Locale[];

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative group" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
        aria-label="Switch language"
        aria-expanded={isOpen}
      >
        <Languages className="h-5 w-5" />
        <span className="text-xs font-medium hidden sm:inline">{LOCALE_NAMES[locale]}</span>
      </button>
      <div className={`absolute right-0 top-full z-50 mt-1 ${isOpen ? 'block' : 'hidden group-hover:block'} rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800 max-h-60 overflow-y-auto`}>
        {LOCALES.map((l) => (
          <button
            key={l}
            onClick={() => { setLocale(l); setIsOpen(false); }}
            className={`block w-full px-4 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
              locale === l
                ? 'font-semibold text-brand dark:text-brand-light'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {LOCALE_NAMES[l]}
          </button>
        ))}
      </div>
    </div>
  );
}
