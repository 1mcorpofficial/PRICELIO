import { useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { useMissionsStore } from '../../stores/missionsStore';
import { useI18n } from '../../i18n';

function formatCountdown(endsAt: string, expiredText: string): string {
  const deltaMs = new Date(endsAt).getTime() - Date.now();
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return expiredText;
  const totalSec = Math.floor(deltaMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function MissionsPage() {
  const t = useI18n((state) => state.t);
  const missions = useMissionsStore((state) => state.missions);
  const loading = useMissionsStore((state) => state.loading);
  const load = useMissionsStore((state) => state.load);
  const [, forceTick] = useState(0);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => forceTick((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const list = useMemo(() => missions, [missions]);

  return (
    <Card>
      <h2>{t('app_missions_title')}</h2>
      {loading ? <SkeletonRows rows={4} /> : null}
      {!loading && !list.length ? (
        <EmptyState
          icon="🎯"
          title={t('app_empty_missions_title')}
          description={t('app_empty_missions_text')}
          actionLabel={t('app_empty_generic_action')}
          onAction={() => { void load(); }}
        />
      ) : null}
      <div className="list-grid">
        {list.map((mission) => {
          const expiresInMs = mission.ends_at ? new Date(mission.ends_at).getTime() - Date.now() : Number.MAX_SAFE_INTEGER;
          const expiring = expiresInMs <= 2 * 60 * 60 * 1000;
          const expired = expiresInMs <= 0;
          return (
            <article key={mission.id} className={`list-item mission-item ${expiring ? 'mission-item--expiring' : ''}`}>
              <div>
                <strong>{mission.title}</strong>
                <small>{mission.store_chain || 'Store'}</small>
              </div>
              <div>
                <small>Reward</small>
                <strong>{mission.reward_points} XP</strong>
              </div>
              <div>
                <small>Timer</small>
                <strong className={expiring ? 'text-danger' : ''}>
                  {mission.ends_at ? formatCountdown(mission.ends_at, t('app_mission_expired')) : '--:--:--'}
                </strong>
              </div>
              {expired ? <span className="mission-chip mission-chip--expired">{t('app_mission_expired')}</span> : null}
            </article>
          );
        })}
      </div>
    </Card>
  );
}
