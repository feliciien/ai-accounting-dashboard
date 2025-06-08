import React, { useEffect, useState } from 'react';

const DarkModeToggle: React.FC = () => {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      setEnabled(true);
    } else {
      document.documentElement.classList.remove('dark');
      setEnabled(false);
    }
  }, []);

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
    >
      {enabled ? (
        <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 2a.75.75 0 01.743.648l.007.102v2a.75.75 0 01-1.493.102L9.25 4.75v-2A.75.75 0 0110 2zm0 13a3.25 3.25 0 100-6.5 3.25 3.25 0 000 6.5zm7.25-3a.75.75 0 01.102 1.493L17.25 14l-1.482.011a.75.75 0 01-.102-1.493l1.482-.011L17.25 12zm-12 0a.75.75 0 01.102 1.493L5.25 14l-1.482.011a.75.75 0 01-.102-1.493l1.482-.011L5.25 12zm9.53-7.03a.75.75 0 011.06 1.06l-1.414 1.415a.75.75 0 01-1.06-1.06l1.414-1.415zm-7.06 7.06a.75.75 0 011.06 1.06L5.364 14.485a.75.75 0 01-1.06-1.06l1.415-1.415zm7.06 0l1.414 1.415a.75.75 0 01-1.06 1.06l-1.414-1.415a.75.75 0 011.06-1.06zm-7.06-7.06L5.364 5.485a.75.75 0 011.06-1.06l1.415 1.415a.75.75 0 01-1.06 1.06z" />
        </svg>
      ) : (
        <svg className="w-6 h-6 text-gray-800 dark:text-gray-200" fill="currentColor" viewBox="0 0 20 20">
          <path d="M17.293 13.293a8 8 0 11-10.586-10.586 8 8 0 0010.586 10.586z" />
        </svg>
      )}
    </button>
  );
};

export default DarkModeToggle;
