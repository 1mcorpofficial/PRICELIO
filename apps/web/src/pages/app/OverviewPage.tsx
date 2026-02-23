import { useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { useGamificationStore } from '../../stores/gamificationStore';
import { useI18n } from '../../i18n';

export function OverviewPage() {
  const t = useI18n((state) => state.t);
  const profile = useGamificationStore((state) => state.profile);
  const ranks = useGamificationStore((state) => state.ranks);
  const load = useGamificationStore((state) => state.load);
  const loading = useGamificationStore((state) => state.loading);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !profile) {
    return (
      <section className="view-grid">
        <Card><SkeletonRows rows={4} /></Card>
        <Card><SkeletonRows rows={3} /></Card>
      </section>
    );
  }

  const currentXp = profile?.lifetime_xp || 0;
  const currentLevel = profile?.rank?.level || 1;
  const nextRank = ranks.find((rank) => rank.level === currentLevel + 1);
  const levelMin = profile?.rank?.min_xp || 0;
  const levelMax = nextRank?.min_xp || (levelMin + 500);
  const levelProgress = Math.max(0, currentXp - levelMin);
  const levelCapacity = Math.max(1, levelMax - levelMin);
  const xpToNext = Math.max(0, levelMax - currentXp);

  return (
    <section className="view-grid">
      <Card>
        <h2>{t('app_overview_title')}</h2>
        <div className="overview-stats">
          <div>
            <small>{t('app_rank')}</small>
            <strong>{profile?.rank?.rank_name || 'Window Shopper'}</strong>
          </div>
          <div>
            <small>{t('app_xp')}</small>
            <strong>{currentXp}</strong>
          </div>
          <div>
            <small>{t('app_spendable_points')}</small>
            <strong>{profile?.spendable_points || 0}</strong>
          </div>
        </div>
        <ProgressBar value={levelProgress} max={levelCapacity} />
        <p>{t('app_xp_to_next')}: <strong>{xpToNext}</strong></p>
      </Card>

      <Card>
        <h3>{t('app_badges')}</h3>
        <div className="landing-tag-row">
          <span className="landing-tag">{t('app_badge_receipt')}</span>
          <span className="landing-tag">{t('app_badge_mission')}</span>
        </div>
      </Card>
    </section>
  );
}
