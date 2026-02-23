import { useMemo, useState } from 'react';
import { Button } from './ui/Button';
import { useI18n } from '../i18n';
import { useUiStore } from '../stores/uiStore';

const STORAGE_KEY = 'pricelio_onboarding_v2_done';

export function OnboardingOverlay() {
  const t = useI18n((state) => state.t);
  const [step, setStep] = useState(0);
  const isOpen = useUiStore((state) => state.onboardingOpen);
  const close = useUiStore((state) => state.closeOnboarding);

  const tips = useMemo(() => [t('onboarding_1'), t('onboarding_2'), t('onboarding_3')], [t]);

  if (!isOpen || localStorage.getItem(STORAGE_KEY) === '1') {
    return null;
  }

  const next = () => {
    if (step >= tips.length - 1) {
      localStorage.setItem(STORAGE_KEY, '1');
      close();
      return;
    }
    setStep((value) => value + 1);
  };

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true">
      <div className="onboarding-overlay__card">
        <h3>Onboarding</h3>
        <p>{tips[step]}</p>
        <Button onClick={next}>{step >= tips.length - 1 ? t('complete') : t('next')}</Button>
      </div>
    </div>
  );
}
