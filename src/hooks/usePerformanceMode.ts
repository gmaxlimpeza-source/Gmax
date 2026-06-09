import { useState, useEffect } from 'react';

export function usePerformanceMode() {
  const [isPerformanceMode, setIsPerformanceMode] = useState(() => {
    return localStorage.getItem('gmax_performance_mode') !== 'false';
  });

  const togglePerformanceMode = () => {
    const next = !isPerformanceMode;
    localStorage.setItem('gmax_performance_mode', String(next));
    setIsPerformanceMode(next);
    window.dispatchEvent(new Event('gmax_performance_mode_changed'));
  };

  useEffect(() => {
    const handleSync = () => {
      setIsPerformanceMode(localStorage.getItem('gmax_performance_mode') !== 'false');
    };
    window.addEventListener('gmax_performance_mode_changed', handleSync);
    return () => window.removeEventListener('gmax_performance_mode_changed', handleSync);
  }, []);

  return { isPerformanceMode, togglePerformanceMode };
}
