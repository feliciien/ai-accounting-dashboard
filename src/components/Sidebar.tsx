import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useIntegration } from '../context/IntegrationContext';
import DarkModeToggle from './DarkModeToggle';

interface SidebarProps {
  className?: string;
  activeTab?: 'overview' | 'tasks' | 'insights';
  setActiveTab?: React.Dispatch<React.SetStateAction<'overview' | 'tasks' | 'insights'>>;
  isMobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  className = '',
  isMobileMenuOpen,
  toggleMobileMenu,
}) => {
  const { currentUser } = useAuth();
  const { xero, paypal, stripe, bank } = useIntegration();
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    if (isMobileMenuOpen) {
      toggleMobileMenu();
    }
    // eslint-disable-next-line
  }, [location.pathname]);

  return (
    <>

      {/* Sidebar */}
      <aside 
        className={`
          fixed md:sticky top-0 inset-y-0 left-0 z-20
          transform md:transform-none sidebar-transition
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          p-3 sm:p-4 bg-gray-900 text-white 
          h-[100dvh] w-[85vw] sm:w-64 md:w-72 lg:w-80
          overflow-y-auto shadow-xl
          ${className}
        `}
      >
        {/* Mobile close button - More accessible */}
        {isMobileMenuOpen && (
          <button
            onClick={toggleMobileMenu}
            className="md:hidden absolute top-3 right-3 p-2 text-gray-400 hover:text-white rounded-full focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Close menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Dark mode toggle for mobile */}
        <div className="md:hidden flex justify-end mb-4">
          <DarkModeToggle />
        </div>
        <div className="mb-6 flex items-center">
          <h1 className="text-lg md:text-xl font-bold flex items-center">
            <svg className="w-6 h-6 mr-2 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span className="hidden sm:inline">Financial</span> Dashboard
          </h1>
        </div>
      
        <nav className="space-y-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Main</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  to="/" 
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
                    ${location.pathname === '/' 
                      ? 'bg-gray-800 text-white shadow-sm' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                    }
                  `}
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Integrations</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  to="/integrations/xero" 
                  className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
                    ${location.pathname === '/integrations/xero'
                      ? 'bg-gray-800 text-white shadow-sm'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                    }
                  `}
                >
                  <span className="flex items-center">
                    <span className="w-5 h-5 mr-3">🧾</span>
                    Xero
                  </span>
                  {xero.connected ? 
                    <span className="flex h-2 w-2 rounded-full bg-green-400"></span> :
                    <span className="flex h-2 w-2 rounded-full bg-gray-600"></span>
                  }
                </Link>
              </li>
              <li>
                <Link 
                  to="/integrations/paypal" 
                  className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
                    ${location.pathname === '/integrations/paypal'
                      ? 'bg-gray-800 text-white shadow-sm'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                    }
                  `}
                >
                  <span className="flex items-center">
                    <span className="w-5 h-5 mr-3">💸</span>
                    PayPal
                  </span>
                  {paypal.connected ? 
                    <span className="flex h-2 w-2 rounded-full bg-green-400"></span> :
                    <span className="flex h-2 w-2 rounded-full bg-gray-600"></span>
                  }
                </Link>
              </li>
              <li>
                <Link 
                  to="/integrations/stripe" 
                  className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
                    ${location.pathname === '/integrations/stripe'
                      ? 'bg-gray-800 text-white shadow-sm'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                    }
                  `}
                >
                  <span className="flex items-center">
                    <span className="w-5 h-5 mr-3">📈</span>
                    Stripe
                  </span>
                  {stripe.connected ? 
                    <span className="flex h-2 w-2 rounded-full bg-green-400"></span> :
                    <span className="flex h-2 w-2 rounded-full bg-gray-600"></span>
                  }
                </Link>
              </li>
              <li>
                <Link 
                  to="/integrations/bank" 
                  className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
                    ${location.pathname === '/integrations/bank'
                      ? 'bg-gray-800 text-white shadow-sm'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800'
                    }
                  `}
                >
                  <span className="flex items-center">
                    <span className="w-5 h-5 mr-3">🏦</span>
                    Bank
                  </span>
                  {bank.connected ? 
                    <span className="flex h-2 w-2 rounded-full bg-green-400"></span> :
                    <span className="flex h-2 w-2 rounded-full bg-gray-600"></span>
                  }
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        {/* User section at bottom */}
        {currentUser && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">
                  {currentUser.email?.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {currentUser.email}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden overlay-fade"
          onClick={toggleMobileMenu}
        />
      )}
    </>
  );
};

export default Sidebar;
