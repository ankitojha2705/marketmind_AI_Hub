import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Building2,
  Calendar,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Settings,
  Megaphone,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CONTENT_SHELL_CLASS } from '../constants/layout';

function userDisplayName(user) {
  if (!user) return 'User';
  const n = user.fullname || user.fullName || user.name || user.displayName;
  if (n && String(n).trim()) return String(n).trim();
  if (user.email) return user.email.split('@')[0];
  return 'User';
}

const mainNavItems = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/brands', label: 'Brands', Icon: Building2 },
  { to: '/campaigns', label: 'Campaigns', Icon: Megaphone },
  { to: '/calendar', label: 'Calendar', Icon: Calendar },
];

export default function NavBar() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileUserOpen, setMobileUserOpen] = useState(false);
  const userMenuRef = useRef(null);

  const name = userDisplayName(user);

  useEffect(() => {
    const handlePointerDown = (e) => {
      if (userMenuRef.current?.contains(e.target)) return;
      setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, []);

  const handleLogout = () => {
    setUserMenuOpen(false);
    setMobileUserOpen(false);
    logout();
  };

  return (
    <nav className="fixed z-10 w-full bg-white shadow-md">
      <div className={CONTENT_SHELL_CLASS}>
        <div className="flex h-16 justify-between">
          <div className="flex items-center">
            <div className="flex flex-shrink-0 items-center">
              <Link to="/" className="text-xl font-bold text-blue-600 hover:text-blue-700">
                MarketMind <span className="text-gray-700">AI Hub</span>
              </Link>
            </div>
          </div>

          <div className="hidden md:flex md:items-center md:gap-4 md:pl-6">
            {isAuthenticated ? (
              <>
                {mainNavItems.map(({ to, label, Icon }) => {
                  const active =
                    location.pathname === to ||
                    (to === '/brands' && location.pathname.startsWith('/brands')) ||
                    (to === '/campaigns' && location.pathname.startsWith('/campaigns'));
                  return (
                  <Link
                    key={to}
                    to={to}
                    className={[
                      'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200',
                      active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100',
                    ].join(' ')}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                    <span>{label}</span>
                  </Link>
                  );
                })}

                <div className="relative pl-4" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((o) => !o)}
                    className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100"
                    aria-expanded={userMenuOpen}
                    aria-haspopup="menu"
                  >
                    <span className="max-w-[10rem] truncate">{name}</span>
                    <ChevronDown
                      className={['h-4 w-4 shrink-0 text-gray-500 transition-transform', userMenuOpen ? 'rotate-180' : ''].join(
                        ' '
                      )}
                      aria-hidden
                    />
                  </button>
                  {userMenuOpen ? (
                    <div
                      className="absolute right-0 top-full z-20 mt-1 min-w-[12rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                      role="menu"
                    >
                      <Link
                        to="/settings"
                        role="menuitem"
                        onClick={() => setUserMenuOpen(false)}
                        className={[
                          'flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50',
                          location.pathname === '/settings' ? 'bg-blue-50 text-blue-700' : 'text-gray-700',
                        ].join(' ')}
                      >
                        <Settings className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                        Settings
                      </Link>
                      <div className="my-1 border-t border-gray-100" aria-hidden />
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-red-700 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                        Log out
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Sign In
              </Link>
            )}
          </div>

          <div className="flex items-center md:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              <svg
                className="block h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="md:hidden" id="mobile-menu">
        <div className={[CONTENT_SHELL_CLASS, 'flex flex-col gap-1 py-3'].join(' ')}>
          {isAuthenticated ? (
            <>
              {mainNavItems.map(({ to, label, Icon }) => {
                const active =
                  location.pathname === to ||
                  (to === '/brands' && location.pathname.startsWith('/brands')) ||
                  (to === '/campaigns' && location.pathname.startsWith('/campaigns'));
                return (
                <Link
                  key={to}
                  to={to}
                  className={[
                    'block rounded-md px-3 py-2 text-base font-medium',
                    active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
                    <span>{label}</span>
                  </div>
                </Link>
                );
              })}
              <div className="border-t border-gray-200 pt-4">
                <button
                  type="button"
                  onClick={() => setMobileUserOpen((o) => !o)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium text-gray-800 hover:bg-gray-100"
                  aria-expanded={mobileUserOpen}
                >
                  <span className="min-w-0 truncate pr-2">{name}</span>
                  <ChevronDown
                    className={['h-4 w-4 shrink-0 text-gray-500 transition-transform', mobileUserOpen ? 'rotate-180' : ''].join(
                      ' '
                    )}
                    aria-hidden
                  />
                </button>
                {mobileUserOpen ? (
                  <div className="border-t border-gray-100 py-1" role="menu">
                    <Link
                      to="/settings"
                      role="menuitem"
                      onClick={() => setMobileUserOpen(false)}
                      className={[
                        'flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-gray-50',
                        location.pathname === '/settings' ? 'bg-blue-50 text-blue-700' : 'text-gray-700',
                      ].join(' ')}
                    >
                      <Settings className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                      Settings
                    </Link>
                    <div className="mx-3 border-t border-gray-100" aria-hidden />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-red-700 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                      Log out
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <Link
              to="/login"
              className="block rounded-md px-3 py-2 text-base font-medium text-gray-600 hover:bg-gray-100"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
