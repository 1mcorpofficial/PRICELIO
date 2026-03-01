import { useState, useCallback } from 'react';
import { useGamificationStore } from '../../stores/gamificationStore';
import clsx from 'clsx';

export function OverviewPage() {
  const profile = useGamificationStore((state) => state.profile);
  const [isListening, setIsListening] = useState(false);

  // Simuliuojame Haptic Feedback ir klausymo būseną
  const handlePClick = useCallback(() => {
    // Jei naršyklė palaiko vibraciją
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
    
    setIsListening(prev => !prev);
    
    // Simuliuojame asistento išsijungimą po kelių sekundžių (Demo tikslais)
    if (!isListening) {
      setTimeout(() => {
        setIsListening(false);
      }, 4000);
    }
  }, [isListening]);

  return (
    <div className="hero-p-container">
      <div 
        className={clsx('p-assistant-button', isListening && 'is-listening')}
        onClick={handlePClick}
        title="Tap to speak with P"
      >
        <div className="p-letter">P</div>
        
        {/* Bangų vizualizacija kai asistentas klausosi (galima vėliau išplėsti CSS animacijomis) */}
        {isListening && (
          <div className="absolute inset-0 rounded-[40px] border-2 border-[var(--accent-blue)] animate-ping opacity-50" style={{ animationDuration: '1.5s' }}></div>
        )}
      </div>

      <div className="p-status-text">
        {isListening ? "Listening to you..." : "Tap to speak"}
      </div>

      {/* Sugrąžiname minimalų XP progresą viršuje/apačioje, jei reikia, bet kol kas paliekam švarų */}
      <div className="absolute top-4 right-4 glass px-4 py-2 rounded-full text-sm font-bold text-[var(--accent-blue)] border border-[rgba(255,255,255,0.1)] shadow-glow">
        {profile?.lifetime_xp || 0} XP
      </div>
    </div>
  );
}
