import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Camera, Bot, Zap, Bus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, labelKey: 'tabs.dashboard' },
  { to: '/report', icon: Camera, labelKey: 'tabs.report' },
  { to: '/assistant', icon: Bot, labelKey: 'tabs.assistant' },
  { to: '/energy', icon: Zap, labelKey: 'tabs.energy' },
  { to: '/mobility', icon: Bus, labelKey: 'tabs.mobility' },
];

export default function Navbar() {
  const { t, i18n } = useTranslation();

  return (
    <nav className="bg-primary-500 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-2xl font-extrabold tracking-tight">مدينة</span>
          <span className="text-sm font-medium opacity-80 ml-1">Smart City</span>
        </div>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map(({ to, icon: Icon, labelKey }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white text-primary-500'
                    : 'text-white/80 hover:bg-white/20',
                )
              }
            >
              <Icon size={18} />
              {t(labelKey)}
            </NavLink>
          ))}
        </div>

        {/* Language switcher */}
        <div className="flex gap-1">
          {(['en', 'ar', 'fr'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => i18n.changeLanguage(lang)}
              className={clsx(
                'px-3 py-1 rounded-full text-xs font-semibold transition-colors',
                i18n.language === lang
                  ? 'bg-white text-primary-500'
                  : 'text-white/70 hover:bg-white/20',
              )}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex overflow-x-auto border-t border-white/20">
        {NAV_ITEMS.map(({ to, icon: Icon, labelKey }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center gap-1 px-4 py-2 text-xs font-medium flex-1 transition-colors',
                isActive ? 'bg-white/20' : 'text-white/70',
              )
            }
          >
            <Icon size={20} />
            {t(labelKey)}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
