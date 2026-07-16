'use client';

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const handleLoad = () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('Intellistreet PWA Service Worker registered with scope:', registration.scope);
          })
          .catch((error) => {
            console.error('Intellistreet PWA Service Worker registration failed:', error);
          });
      };

      if (document.readyState === 'complete') {
        handleLoad();
      } else {
        window.addEventListener('load', handleLoad);
        return () => window.removeEventListener('load', handleLoad);
      }
    }
  }, []);

  return null;
}
