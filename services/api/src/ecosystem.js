const crypto = require('crypto');
const { query } = require('./db');
const {
  hashStringToPercent,
  computeWeightedTruthPrice,
  determineRank,
  evaluateConsensus,
  haversineKm
} = require('./ecosystem-algorithms');

const PLUS_FEATURES = [
  'time_machine',
  'advanced_analytics',
  'multi_baskets',
  'priority_scan',
  'family_plus'
];

const REDEEM_COST_POINTS = 3000;
const REDEEM_DURATION_DAYS = 30;

function isMissingRelationError(error) {
  return error && (error.code === '42P01' || /does not exist/i.test(error.message || ''));
}

function hashPin(pin) {
  return crypto.createHash('sha256').update(String(pin || '')).digest('hex');
}

async function isFeatureEnabled(flagKey, userId = null, cityCode = 'LT') {
  if (process.env.FEATURE_FLAGS_ENFORCE !== 'true') {
    return true;
  }

  if (userId) {
    const override = await query(
      `SELECT enabled
       FROM feature_flag_overrides
       WHERE flag_key = $1 AND user_id = $2
       LIMIT 1`,
      [flagKey, userId]
    );
    if (override.rows.length > 0) {
      return override.rows[0].enabled;
    }
  }

  const result = await query(
    `SELECT enabled, rollout_percent, allowed_cities
     FROM feature_flags
     WHERE flag_key = $1
     LIMIT 1`,
    [flagKey]
  );
  if (!result.rows.length) {
    return false;
  }

  const row = result.rows[0];
  if (!row.enabled) {
    return false;
  }
  if (Array.isArray(row.allowed_cities) && row.allowed_cities.length && cityCode) {
    if (!row.allowed_cities.includes(cityCode)) {
      return false;
    }
  }
  if (!userId) {
    return true;
  }
  const bucket = hashStringToPercent(`${flagKey}:${userId}`);
  return bucket < Number(row.rollout_percent || 0);
}

async function ensureWallet(userId) {
  try {
    await query(
      `INSERT INTO user_points_wallet (user_id, spendable_points, lifetime_xp)
       VALUES ($1, 0, 0)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );
  } catch (error) {
    if (isMissingRelationError(error)) return;
    throw error;
  }
}

async function getRankLevels() {
  try {
    const result = await query(
      `SELECT level, rank_name, tier, min_xp
       FROM rank_levels
       ORDER BY level ASC`
    );
    return result.rows;
  } catch (error) {
    if (isMissingRelationError(error)) return [];
    throw error;
  }
}

async function refreshUserRank(userId) {
  await ensureWallet(userId);
  let wallet;
  try {
    wallet = await query(
      `SELECT spendable_points, lifetime_xp
       FROM user_points_wallet
       WHERE user_id = $1`,
      [userId]
    );
  } catch (error) {
    if (isMissingRelationError(error)) {
      return { spendable_points: 0, lifetime_xp: 0, rank: null };
    }
    throw error;
  }
  const row = wallet.rows[0] || { spendable_points: 0, lifetime_xp: 0 };
  const levels = await getRankLevels();
  const rank = determineRank(levels, row.lifetime_xp);

  if (rank) {
    await query(
      `INSERT INTO user_rank_snapshot (user_id, current_level, current_rank_name, lifetime_xp, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET current_level = EXCLUDED.current_level,
           current_rank_name = EXCLUDED.current_rank_name,
           lifetime_xp = EXCLUDED.lifetime_xp,
           updated_at = NOW()`,
      [userId, rank.level, rank.rank_name, row.lifetime_xp]
    ).catch((error) => {
      if (!isMissingRelationError(error)) throw error;
    });
  }

  return {
    spendable_points: Number(row.spendable_points || 0),
    lifetime_xp: Number(row.lifetime_xp || 0),
    rank: rank
      ? {
          level: Number(rank.level),
          rank_name: rank.rank_name,
          tier: rank.tier,
          min_xp: Number(rank.min_xp)
        }
      : null
  };
}

async function awardPoints(userId, {
  eventType,
  xp = 0,
  points = 0,
  referenceType = null,
  referenceId = null,
  metadata = {}
}) {
  if (!userId || (!xp && !points)) {
    return { awarded: false, reason: 'no_op' };
  }

  await ensureWallet(userId);

  try {
    let inserted = true;
    if (referenceType && referenceId) {
      const exists = await query(
        `SELECT 1
         FROM points_ledger
         WHERE user_id = $1
           AND event_type = $2
           AND reference_type = $3
           AND reference_id = $4
         LIMIT 1`,
        [userId, eventType, referenceType, String(referenceId)]
      );
      if (exists.rows.length) {
        inserted = false;
      } else {
        await query(
          `INSERT INTO points_ledger (
             user_id, event_type, xp_delta, points_delta, reference_type, reference_id, metadata, created_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            userId,
            eventType,
            xp,
            points,
            referenceType,
            String(referenceId),
            JSON.stringify(metadata || {})
          ]
        );
        inserted = true;
      }
    } else {
      await query(
        `INSERT INTO points_ledger (
           user_id, event_type, xp_delta, points_delta, metadata, created_at
         ) VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          userId,
          eventType,
          xp,
          points,
          JSON.stringify(metadata || {})
        ]
      );
    }

    if (!inserted) {
      return { awarded: false, reason: 'duplicate_reference' };
    }

    await query(
      `UPDATE user_points_wallet
       SET lifetime_xp = lifetime_xp + $2,
           spendable_points = GREATEST(0, spendable_points + $3),
           updated_at = NOW()
       WHERE user_id = $1`,
      [userId, xp, points]
    );
    const refreshed = await refreshUserRank(userId);
    return { awarded: true, wallet: refreshed };
  } catch (error) {
    if (isMissingRelationError(error)) {
      return { awarded: false, reason: 'gamification_tables_missing' };
    }
    throw error;
  }
}

async function spendPoints(userId, amount, eventType, referenceType, referenceId, metadata = {}) {
  await ensureWallet(userId);
  const update = await query(
    `UPDATE user_points_wallet
     SET spendable_points = spendable_points - $2,
         updated_at = NOW()
     WHERE user_id = $1
       AND spendable_points >= $2
     RETURNING spendable_points, lifetime_xp`,
    [userId, amount]
  );
  if (!update.rows.length) {
    return { ok: false, reason: 'insufficient_points' };
  }

  await query(
    `INSERT INTO points_ledger (
       user_id, event_type, xp_delta, points_delta, reference_type, reference_id, metadata, created_at
     ) VALUES ($1, $2, 0, $3, $4, $5, $6, NOW())`,
    [
      userId,
      eventType,
      -Math.abs(amount),
      referenceType || null,
      referenceId ? String(referenceId) : null,
      JSON.stringify(metadata || {})
    ]
  );
  return { ok: true };
}

async function getGamification(userId) {
  const refreshed = await refreshUserRank(userId);
  return refreshed;
}

async function getLeaderboardGlobal(limit = 50) {
  const result = await query(
    `SELECT u.id AS user_id,
            u.email,
            rs.current_level,
            rs.current_rank_name,
            rs.lifetime_xp,
            w.spendable_points
     FROM user_rank_snapshot rs
     JOIN users u ON u.id = rs.user_id
     JOIN user_points_wallet w ON w.user_id = rs.user_id
     ORDER BY rs.lifetime_xp DESC, rs.updated_at ASC
     LIMIT $1`,
    [Math.min(200, Math.max(1, Number(limit || 50)))]
  );
  return result.rows.map((r, idx) => ({
    position: idx + 1,
    user_id: r.user_id,
    email_masked: String(r.email || '').replace(/(.{2}).+(@.*)/, '$1***$2'),
    level: Number(r.current_level || 1),
    rank_name: r.current_rank_name,
    lifetime_xp: Number(r.lifetime_xp || 0),
    spendable_points: Number(r.spendable_points || 0)
  }));
}

async function getLeaderboardFriends(userId, limit = 50) {
  const members = await query(
    `SELECT DISTINCT hm2.user_id
     FROM household_members hm1
     JOIN household_members hm2 ON hm2.household_id = hm1.household_id
     WHERE hm1.user_id = $1
       AND hm1.status = 'active'
       AND hm2.status = 'active'`,
    [userId]
  );
  const ids = members.rows.map((r) => r.user_id);
  if (!ids.length) {
    return [];
  }
  const result = await query(
    `SELECT u.id AS user_id,
            u.email,
            rs.current_level,
            rs.current_rank_name,
            rs.lifetime_xp,
            w.spendable_points
     FROM user_rank_snapshot rs
     JOIN users u ON u.id = rs.user_id
     JOIN user_points_wallet w ON w.user_id = rs.user_id
     WHERE rs.user_id = ANY($1::uuid[])
     ORDER BY rs.lifetime_xp DESC, rs.updated_at ASC
     LIMIT $2`,
    [ids, Math.min(200, Math.max(1, Number(limit || 50)))]
  );
  return result.rows.map((r, idx) => ({
    position: idx + 1,
    user_id: r.user_id,
    email_masked: String(r.email || '').replace(/(.{2}).+(@.*)/, '$1***$2'),
    level: Number(r.current_level || 1),
    rank_name: r.current_rank_name,
    lifetime_xp: Number(r.lifetime_xp || 0),
    spendable_points: Number(r.spendable_points || 0)
  }));
}

async function getPointsLedger(userId, limit = 100) {
  const result = await query(
    `SELECT id, event_type, xp_delta, points_delta, reference_type, reference_id, metadata, created_at
     FROM points_ledger
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, Math.min(500, Math.max(1, Number(limit || 100)))]
  );
  return result.rows;
}

async function getRedeemOptions() {
  return [
    {
      reward_key: 'plus_30d',
      points_cost: REDEEM_COST_POINTS,
      duration_days: REDEEM_DURATION_DAYS
    }
  ];
}

async function hasFeature(userId, featureKey) {
  try {
    const result = await query(
      `SELECT 1
       FROM user_entitlements
       WHERE user_id = $1
         AND feature_key = $2
         AND is_active = true
         AND starts_at <= NOW()
         AND ends_at > NOW()
       LIMIT 1`,
      [userId, featureKey]
    );
    return result.rows.length > 0;
  } catch (error) {
    if (isMissingRelationError(error)) return false;
    throw error;
  }
}

async function grantPlusEntitlements(userId, sourceType, sourceId, durationDays = REDEEM_DURATION_DAYS) {
  const now = new Date();
  const ends = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
  for (const feature of PLUS_FEATURES) {
    await query(
      `INSERT INTO user_entitlements (
         user_id, feature_key, source_type, source_id, starts_at, ends_at, is_active, metadata, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, true, $7, NOW())`,
      [
        userId,
        feature,
        sourceType,
        sourceId || null,
        now.toISOString(),
        ends.toISOString(),
        JSON.stringify({ duration_days: durationDays })
      ]
    );
  }
}

async function unlockPlusWithPoints(userId) {
  const spend = await spendPoints(
    userId,
    REDEEM_COST_POINTS,
    'premium_redeem',
    'reward',
    'plus_30d',
    { duration_days: REDEEM_DURATION_DAYS }
  );
  if (!spend.ok) {
    return spend;
  }

  const redemption = await query(
    `INSERT INTO point_redemptions (user_id, points_spent, reward_key, reward_value, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING id`,
    [
      userId,
      REDEEM_COST_POINTS,
      'plus_30d',
      JSON.stringify({ duration_days: REDEEM_DURATION_DAYS })
    ]
  );

  await grantPlusEntitlements(userId, 'points_redeem', redemption.rows[0].id, REDEEM_DURATION_DAYS);
  return { ok: true, redemption_id: redemption.rows[0].id };
}

async function subscribePlus(userId) {
  const plan = await query(
    `SELECT id, billing_days
     FROM plans
     WHERE code = 'plus_monthly' AND is_active = true
     LIMIT 1`
  );
  if (!plan.rows.length) {
    return { ok: false, reason: 'plan_not_found' };
  }

  await grantPlusEntitlements(userId, 'subscription', plan.rows[0].id, Number(plan.rows[0].billing_days || 30));
  return { ok: true };
}

async function getPlusFeatures() {
  const result = await query(
    `SELECT p.code AS plan_code, p.name AS plan_name, p.price_eur, p.billing_days, pf.feature_key
     FROM plans p
     JOIN plan_features pf ON pf.plan_id = p.id
     WHERE p.code = 'plus_monthly' AND p.is_active = true
     ORDER BY pf.feature_key ASC`
  );
  return result.rows;
}

async function getPlusStatus(userId) {
  const result = await query(
    `SELECT feature_key, starts_at, ends_at, source_type
     FROM user_entitlements
     WHERE user_id = $1
       AND is_active = true
       AND starts_at <= NOW()
       AND ends_at > NOW()
     ORDER BY ends_at DESC`,
    [userId]
  );
  return result.rows;
}

async function requireFamilyMember(householdId, userId) {
  const membership = await query(
    `SELECT role, status
     FROM household_members
     WHERE household_id = $1 AND user_id = $2
     LIMIT 1`,
    [householdId, userId]
  );
  if (!membership.rows.length || membership.rows[0].status !== 'active') {
    throw new Error('forbidden_household');
  }
  return membership.rows[0];
}

async function emitHouseholdEvent(householdId, actorUserId, eventType, payload) {
  await query(
    `INSERT INTO household_events (household_id, actor_user_id, event_type, payload, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [householdId, actorUserId, eventType, JSON.stringify(payload || {})]
  );
}

async function createFamily(userId, name) {
  const household = await query(
    `INSERT INTO households (name, owner_user_id, city_code, currency, created_at)
     VALUES ($1, $2, 'LT', 'EUR', NOW())
     RETURNING id, name, owner_user_id, city_code, currency, created_at`,
    [name || 'My Family', userId]
  );
  const householdId = household.rows[0].id;
  await query(
    `INSERT INTO household_members (household_id, user_id, role, status, joined_at)
     VALUES ($1, $2, 'owner', 'active', NOW())
     ON CONFLICT (household_id, user_id) DO NOTHING`,
    [householdId, userId]
  );
  await query(
    `INSERT INTO household_lists (household_id, title, is_active, created_by, created_at)
     VALUES ($1, 'Shared List', true, $2, NOW())`,
    [householdId, userId]
  );
  await emitHouseholdEvent(householdId, userId, 'family_created', { household_id: householdId });
  return household.rows[0];
}

async function canUseFamilyPlus(userId) {
  return hasFeature(userId, 'family_plus');
}

async function inviteFamilyMember(householdId, userId, { email, role = 'runner' }) {
  const membership = await requireFamilyMember(householdId, userId);
  if (!['owner', 'planner'].includes(membership.role)) {
    throw new Error('forbidden_role');
  }

  const memberCount = await query(
    `SELECT COUNT(*)::int AS count
     FROM household_members
     WHERE household_id = $1 AND status = 'active'`,
    [householdId]
  );
  const count = Number(memberCount.rows[0].count || 0);
  const hasPlus = await canUseFamilyPlus(userId);
  if (!hasPlus && count >= 2) {
    throw new Error('family_plus_required');
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const invite = await query(
    `INSERT INTO household_invites (
       household_id, email, token, role, status, expires_at, created_by, created_at
     ) VALUES ($1, $2, $3, $4, 'pending', $5, $6, NOW())
     RETURNING id, token, role, status, expires_at`,
    [householdId, email || null, token, role, expiresAt.toISOString(), userId]
  );
  await emitHouseholdEvent(householdId, userId, 'invite_created', { invite_id: invite.rows[0].id, role });
  return invite.rows[0];
}

async function joinFamilyByToken(userId, token) {
  const invite = await query(
    `SELECT id, household_id, role, status, expires_at
     FROM household_invites
     WHERE token = $1
     LIMIT 1`,
    [token]
  );
  if (!invite.rows.length) {
    throw new Error('invite_not_found');
  }
  const row = invite.rows[0];
  if (row.status !== 'pending' || new Date(row.expires_at).getTime() < Date.now()) {
    throw new Error('invite_expired');
  }

  const owner = await query(
    `SELECT owner_user_id
     FROM households
     WHERE id = $1`,
    [row.household_id]
  );
  const ownerId = owner.rows[0]?.owner_user_id;
  const ownerHasPlus = ownerId ? await canUseFamilyPlus(ownerId) : false;
  const memberCount = await query(
    `SELECT COUNT(*)::int AS count
     FROM household_members
     WHERE household_id = $1 AND status = 'active'`,
    [row.household_id]
  );
  if (!ownerHasPlus && Number(memberCount.rows[0]?.count || 0) >= 2) {
    throw new Error('family_plus_required');
  }

  await query(
    `INSERT INTO household_members (household_id, user_id, role, status, joined_at)
     VALUES ($1, $2, $3, 'active', NOW())
     ON CONFLICT (household_id, user_id) DO UPDATE
     SET role = EXCLUDED.role, status = 'active', joined_at = NOW()`,
    [row.household_id, userId, row.role]
  );
  await query(
    `UPDATE household_invites
     SET status = 'accepted'
     WHERE id = $1`,
    [row.id]
  );
  await emitHouseholdEvent(row.household_id, userId, 'member_joined', { user_id: userId, role: row.role });
  return { household_id: row.household_id, role: row.role };
}

async function getFamilyLists(householdId, userId) {
  await requireFamilyMember(householdId, userId);
  const lists = await query(
    `SELECT id, title, is_active, created_at
     FROM household_lists
     WHERE household_id = $1
     ORDER BY created_at ASC`,
    [householdId]
  );
  const listIds = lists.rows.map((r) => r.id);
  let items = [];
  if (listIds.length) {
    const result = await query(
      `SELECT hli.id, hli.list_id, hli.product_id, hli.raw_name, hli.quantity, hli.status, hli.created_at
       FROM household_list_items hli
       WHERE hli.list_id = ANY($1::uuid[])
       ORDER BY hli.created_at ASC`,
      [listIds]
    );
    items = result.rows;
  }
  return lists.rows.map((l) => ({
    ...l,
    items: items.filter((i) => i.list_id === l.id)
  }));
}

async function addFamilyListItem(householdId, listId, userId, payload) {
  await requireFamilyMember(householdId, userId);
  const belongs = await query(
    `SELECT id
     FROM household_lists
     WHERE id = $1 AND household_id = $2
     LIMIT 1`,
    [listId, householdId]
  );
  if (!belongs.rows.length) {
    throw new Error('list_not_found');
  }
  const result = await query(
    `INSERT INTO household_list_items (
       list_id, product_id, raw_name, quantity, status, added_by, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, 'open', $5, NOW(), NOW())
     RETURNING id, list_id, product_id, raw_name, quantity, status, created_at`,
    [listId, payload.product_id || null, payload.raw_name || null, payload.quantity || 1, userId]
  );
  await emitHouseholdEvent(householdId, userId, 'list_item_added', {
    list_id: listId,
    item_id: result.rows[0].id
  });
  return result.rows[0];
}

async function pollFamilyEvents(householdId, userId, cursor = 0, limit = 100) {
  await requireFamilyMember(householdId, userId);
  const result = await query(
    `SELECT id, event_type, payload, created_at, actor_user_id
     FROM household_events
     WHERE household_id = $1
       AND id > $2
     ORDER BY id ASC
     LIMIT $3`,
    [householdId, Number(cursor || 0), Math.min(200, Math.max(1, Number(limit || 100)))]
  );
  const lastCursor = result.rows.length ? Number(result.rows[result.rows.length - 1].id) : Number(cursor || 0);
  return { events: result.rows, next_cursor: lastCursor };
}

async function getNearbyMissions(userId, { lat, lon, limit = 20, app_foreground = true }) {
  if (!app_foreground) {
    return [];
  }
  const missionRows = await query(
    `SELECT m.id, m.title, m.description, m.category, m.reward_points, m.status, m.store_id,
            s.name AS store_name, s.chain AS store_chain, gsz.lat AS zone_lat, gsz.lon AS zone_lon, gsz.radius_m
     FROM missions m
     LEFT JOIN stores s ON s.id = m.store_id
     LEFT JOIN geo_store_zones gsz ON gsz.store_id = m.store_id AND gsz.is_active = true
     WHERE m.status IN ('open', 'in_progress')
       AND m.starts_at <= NOW()
       AND (m.ends_at IS NULL OR m.ends_at > NOW())
     ORDER BY m.created_at DESC
     LIMIT 300`
  );

  const filtered = missionRows.rows.filter((m) => {
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon))) return true;
    if (m.zone_lat == null || m.zone_lon == null || m.radius_m == null) return true;
    const km = haversineKm(Number(lat), Number(lon), Number(m.zone_lat), Number(m.zone_lon));
    return km * 1000 <= Number(m.radius_m) * 1.3;
  });

  return filtered.slice(0, Math.min(100, Math.max(1, Number(limit || 20))));
}

async function startMission(userId, missionId) {
  const mission = await query(
    `SELECT id, status
     FROM missions
     WHERE id = $1
       AND starts_at <= NOW()
       AND (ends_at IS NULL OR ends_at > NOW())
     LIMIT 1`,
    [missionId]
  );
  if (!mission.rows.length || !['open', 'in_progress'].includes(mission.rows[0].status)) {
    throw new Error('mission_unavailable');
  }

  const task = await query(
    `INSERT INTO mission_tasks (mission_id, assigned_user_id, status, started_at, created_at)
     VALUES ($1, $2, 'started', NOW(), NOW())
     RETURNING id, mission_id, assigned_user_id, status, started_at`,
    [missionId, userId]
  );
  await query(
    `UPDATE missions
     SET status = 'in_progress'
     WHERE id = $1 AND status = 'open'`,
    [missionId]
  );
  return task.rows[0];
}

async function getUserTrustValue(userId) {
  const row = await query(
    `SELECT trust_value, shadow_banned
     FROM user_trust_score
     WHERE user_id = $1`,
    [userId]
  );
  if (!row.rows.length) {
    await query(
      `INSERT INTO user_trust_score (user_id, trust_value, positive_events, negative_events, strong_conflicts_30d, shadow_banned, updated_at)
       VALUES ($1, 0, 0, 0, 0, false, NOW())
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );
    return { trust_value: 0, shadow_banned: false };
  }
  return {
    trust_value: Number(row.rows[0].trust_value || 0),
    shadow_banned: !!row.rows[0].shadow_banned
  };
}

async function addTrustEvent(userId, delta, flagType = null, context = null) {
  await query(
    `INSERT INTO user_trust_score (user_id, trust_value, positive_events, negative_events, strong_conflicts_30d, shadow_banned, updated_at)
     VALUES ($1, 0, 0, 0, 0, false, NOW())
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );

  const isPositive = delta >= 0;
  await query(
    `UPDATE user_trust_score
     SET trust_value = trust_value + $2,
         positive_events = positive_events + $3,
         negative_events = negative_events + $4,
         updated_at = NOW()
     WHERE user_id = $1`,
    [userId, delta, isPositive ? 1 : 0, isPositive ? 0 : 1]
  );

  if (flagType) {
    await query(
      `INSERT INTO user_moderation_flags (user_id, flag_type, severity, context, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [userId, flagType, delta < -2 ? 3 : 2, JSON.stringify(context || {})]
    );
  }

  const conflicts30 = await query(
    `SELECT COUNT(*)::int AS cnt
     FROM user_moderation_flags
     WHERE user_id = $1
       AND flag_type = 'strong_conflict'
       AND created_at > NOW() - INTERVAL '30 days'`,
    [userId]
  );
  const cnt = Number(conflicts30.rows[0].cnt || 0);
  await query(
    `UPDATE user_trust_score
     SET strong_conflicts_30d = $2,
         shadow_banned = CASE WHEN $2 >= 3 THEN true ELSE shadow_banned END,
         updated_at = NOW()
     WHERE user_id = $1`,
    [userId, cnt]
  );
}

async function antiCheatChecks(userId, missionId, submission) {
  const flags = [];

  if (!submission.foreground_app) {
    flags.push('foreground_required');
  }

  const recentCount = await query(
    `SELECT COUNT(*)::int AS cnt
     FROM mission_submissions
     WHERE user_id = $1
       AND created_at > NOW() - INTERVAL '1 minute'`,
    [userId]
  );
  if (Number(recentCount.rows[0].cnt || 0) > 12) {
    flags.push('rate_limit_exceeded');
  }

  if (submission.media_hash) {
    const duplicate = await query(
      `SELECT 1
       FROM mission_submissions
       WHERE media_hash = $1
       LIMIT 1`,
      [submission.media_hash]
    );
    if (duplicate.rows.length) {
      flags.push('duplicate_media_hash');
    }
  }

  if (Array.isArray(submission.media)) {
    const lowQuality = submission.media.some((m) => Number(m.quality_score || 0) < 0.6);
    const blurred = submission.media.some((m) => Number(m.blur_score || 0) > 0.4);
    if (lowQuality) flags.push('image_quality_low');
    if (blurred) flags.push('image_blur_high');
  }

  if (Number.isFinite(Number(submission.location_lat)) && Number.isFinite(Number(submission.location_lon))) {
    const last = await query(
      `SELECT location_lat, location_lon, created_at
       FROM mission_submissions
       WHERE user_id = $1
         AND location_lat IS NOT NULL
         AND location_lon IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );
    if (last.rows.length) {
      const prev = last.rows[0];
      const distKm = haversineKm(
        Number(prev.location_lat),
        Number(prev.location_lon),
        Number(submission.location_lat),
        Number(submission.location_lon)
      );
      const dtHours = Math.max(
        1 / 3600,
        (Date.now() - new Date(prev.created_at).getTime()) / (1000 * 60 * 60)
      );
      const speed = distKm / dtHours;
      if (speed > 150) {
        flags.push('impossible_speed');
      }
    }
  }

  const zone = await query(
    `SELECT gsz.lat, gsz.lon, gsz.radius_m
     FROM missions m
     JOIN geo_store_zones gsz ON gsz.store_id = m.store_id
     WHERE m.id = $1
       AND gsz.is_active = true
     LIMIT 1`,
    [missionId]
  );
  if (zone.rows.length && Number.isFinite(Number(submission.location_lat)) && Number.isFinite(Number(submission.location_lon))) {
    const z = zone.rows[0];
    const km = haversineKm(Number(z.lat), Number(z.lon), Number(submission.location_lat), Number(submission.location_lon));
    if (km * 1000 > Number(z.radius_m) * 1.5) {
      flags.push('outside_geofence');
    }
  }

  return { ok: flags.length === 0, flags };
}

async function submitMission(userId, missionId, payload) {
  const trust = await getUserTrustValue(userId);
  if (trust.shadow_banned) {
    throw new Error('shadow_banned');
  }

  const task = await query(
    `SELECT id
     FROM mission_tasks
     WHERE mission_id = $1
       AND assigned_user_id = $2
       AND status IN ('started', 'pending')
     ORDER BY created_at DESC
     LIMIT 1`,
    [missionId, userId]
  );
  const taskId = task.rows[0]?.id || null;

  const antiCheat = await antiCheatChecks(userId, missionId, payload);
  const mission = await query(
    `SELECT m.id, s.chain AS store_chain
     FROM missions m
     LEFT JOIN stores s ON s.id = m.store_id
     WHERE m.id = $1
     LIMIT 1`,
    [missionId]
  );
  if (!mission.rows.length) {
    throw new Error('mission_not_found');
  }
  const storeChain = payload.store_chain || mission.rows[0].store_chain || 'Unknown';

  let claim = await query(
    `SELECT id, claim_status, first_submission_id
     FROM product_identity_claims
     WHERE store_chain = $1
       AND product_canonical_name = $2
       AND barcode = $3
     LIMIT 1`,
    [storeChain, payload.product_canonical_name, payload.barcode]
  );
  if (!claim.rows.length) {
    const created = await query(
      `INSERT INTO product_identity_claims (
         store_chain, product_canonical_name, barcode, claim_status, consensus_count, created_at, updated_at
       ) VALUES ($1, $2, $3, 'pending', 0, NOW(), NOW())
       RETURNING id, claim_status, first_submission_id`,
      [storeChain, payload.product_canonical_name, payload.barcode]
    );
    claim = created;
  }
  const claimId = claim.rows[0].id;

  const proofStatus = antiCheat.ok ? 'pending' : 'rejected';
  const inserted = await query(
    `INSERT INTO mission_submissions (
       mission_id, task_id, claim_id, user_id, store_chain, product_canonical_name, barcode,
       location_lat, location_lon, foreground_app, media_hash, trust_score_at_submit, anti_cheat_flags, proof_status, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
     RETURNING id, proof_status, created_at`,
    [
      missionId,
      taskId,
      claimId,
      userId,
      storeChain,
      payload.product_canonical_name,
      payload.barcode,
      payload.location_lat || null,
      payload.location_lon || null,
      !!payload.foreground_app,
      payload.media_hash || null,
      Number(trust.trust_value || 0),
      JSON.stringify(antiCheat.flags),
      proofStatus
    ]
  );
  const submissionId = inserted.rows[0].id;

  if (Array.isArray(payload.media) && payload.media.length) {
    for (const media of payload.media) {
      await query(
        `INSERT INTO submission_media (
           submission_id, media_type, url, quality_score, blur_score, hash, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          submissionId,
          media.media_type || 'shelfie',
          media.url || 'local://not-provided',
          Number(media.quality_score || 0),
          Number(media.blur_score || 0),
          media.hash || null
        ]
      );
    }
  }

  if (taskId) {
    await query(
      `UPDATE mission_tasks
       SET status = 'submitted'
       WHERE id = $1`,
      [taskId]
    );
  }

  if (!antiCheat.ok) {
    await addTrustEvent(userId, -1, 'anti_cheat_warning', { mission_id: missionId, flags: antiCheat.flags });
  }

  return {
    submission_id: submissionId,
    claim_id: claimId,
    proof_status: proofStatus,
    anti_cheat_flags: antiCheat.flags
  };
}

async function verifyMissionSubmission(userId, missionId, submissionId, vote) {
  const target = await query(
    `SELECT ms.id, ms.user_id, ms.claim_id
     FROM mission_submissions ms
     WHERE ms.id = $1 AND ms.mission_id = $2
     LIMIT 1`,
    [submissionId, missionId]
  );
  if (!target.rows.length) {
    throw new Error('submission_not_found');
  }
  if (target.rows[0].user_id === userId) {
    throw new Error('cannot_verify_own_submission');
  }
  const claimId = target.rows[0].claim_id;

  await query(
    `INSERT INTO verification_votes (mission_id, submission_id, voter_user_id, vote, note, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (submission_id, voter_user_id) DO UPDATE
     SET vote = EXCLUDED.vote,
         note = EXCLUDED.note,
         created_at = NOW()`,
    [missionId, submissionId, userId, vote, null]
  );

  const votes = await query(
    `SELECT vv.voter_user_id AS user_id, vv.vote, COALESCE(uts.trust_value, 0) AS trust_value
     FROM verification_votes vv
     JOIN mission_submissions ms ON ms.id = vv.submission_id
     LEFT JOIN user_trust_score uts ON uts.user_id = vv.voter_user_id
     WHERE ms.claim_id = $1
       AND vv.created_at > NOW() - INTERVAL '30 days'`,
    [claimId]
  );

  const consensus = evaluateConsensus(votes.rows, 3);
  if (consensus.status === 'gold_standard') {
    await query(
      `UPDATE product_identity_claims
       SET claim_status = 'gold_standard',
           consensus_count = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [claimId, consensus.confirmCount]
    );
    await query(
      `UPDATE mission_submissions
       SET proof_status = 'verified'
       WHERE claim_id = $1`,
      [claimId]
    );

    // +20 XP for current verifier (verified action)
    await awardPoints(userId, {
      eventType: 'mission_verify',
      xp: 20,
      points: 20,
      referenceType: 'verification_vote',
      referenceId: submissionId
    });
    await addTrustEvent(userId, 2);

    // First discovery bonus (+50) to first submission owner
    const first = await query(
      `SELECT ms.id, ms.user_id
       FROM mission_submissions ms
       WHERE ms.claim_id = $1
       ORDER BY ms.created_at ASC
       LIMIT 1`,
      [claimId]
    );
    if (first.rows.length) {
      await awardPoints(first.rows[0].user_id, {
        eventType: 'first_discovery',
        xp: 50,
        points: 50,
        referenceType: 'claim',
        referenceId: claimId
      });
      await addTrustEvent(first.rows[0].user_id, 3);
      await query(
        `UPDATE product_identity_claims
         SET first_submission_id = $2,
             updated_at = NOW()
         WHERE id = $1`,
        [claimId, first.rows[0].id]
      );
    }
  } else if (consensus.status === 'conflict') {
    await query(
      `UPDATE product_identity_claims
       SET claim_status = 'conflict',
           consensus_count = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [claimId, consensus.rejectCount]
    );
    await query(
      `UPDATE mission_submissions
       SET proof_status = 'conflict'
       WHERE claim_id = $1`,
      [claimId]
    );
    await addTrustEvent(target.rows[0].user_id, -3, 'strong_conflict', { claim_id: claimId });
    await addTrustEvent(userId, -1, 'strong_conflict', { claim_id: claimId });
  } else {
    // still pending consensus
    await addTrustEvent(userId, 1);
  }

  return { consensus };
}

async function getProofStatus(proofId) {
  const submission = await query(
    `SELECT ms.id, ms.mission_id, ms.user_id, ms.proof_status, ms.anti_cheat_flags, ms.created_at,
            pic.id AS claim_id, pic.claim_status, pic.consensus_count
     FROM mission_submissions ms
     LEFT JOIN product_identity_claims pic ON pic.id = ms.claim_id
     WHERE ms.id = $1
     LIMIT 1`,
    [proofId]
  );
  if (!submission.rows.length) {
    return null;
  }
  const votes = await query(
    `SELECT vote, COUNT(*)::int AS count
     FROM verification_votes
     WHERE submission_id = $1
     GROUP BY vote`,
    [proofId]
  );
  return {
    ...submission.rows[0],
    votes: votes.rows
  };
}

async function disputeProof(userId, proofId, reason) {
  await query(
    `INSERT INTO user_moderation_flags (user_id, flag_type, severity, context, created_at)
     VALUES ($1, 'proof_dispute', 2, $2, NOW())`,
    [userId, JSON.stringify({ proof_id: proofId, reason: reason || null })]
  );
  await query(
    `UPDATE mission_submissions
     SET proof_status = 'conflict'
     WHERE id = $1`,
    [proofId]
  );
  return { ok: true };
}

async function activateKidsMode(parentUserId, payload) {
  let profileId = payload.kid_profile_id || null;
  const pin = payload.parent_pin || '';
  if (!profileId) {
    const created = await query(
      `INSERT INTO kid_profiles (parent_user_id, display_name, age_group, pin_hash, is_active, created_at)
       VALUES ($1, $2, $3, $4, true, NOW())
       RETURNING id, display_name, age_group`,
      [parentUserId, payload.display_name || 'Kid', payload.age_group || '4-8', hashPin(pin)]
    );
    profileId = created.rows[0].id;
    await query(
      `INSERT INTO kid_progress (kid_profile_id, points, missions_completed, streak_days, updated_at)
       VALUES ($1, 0, 0, 0, NOW())
       ON CONFLICT (kid_profile_id) DO NOTHING`,
      [profileId]
    );
  } else {
    const existing = await query(
      `SELECT id, pin_hash
       FROM kid_profiles
       WHERE id = $1
         AND parent_user_id = $2
         AND is_active = true
       LIMIT 1`,
      [profileId, parentUserId]
    );
    if (!existing.rows.length) {
      throw new Error('kid_profile_not_found');
    }
    if (existing.rows[0].pin_hash !== hashPin(pin)) {
      throw new Error('invalid_parent_pin');
    }
  }

  await query(
    `UPDATE kid_sessions
     SET is_active = false, ended_at = NOW()
     WHERE kid_profile_id = $1
       AND is_active = true`,
    [profileId]
  );

  const session = await query(
    `INSERT INTO kid_sessions (kid_profile_id, parent_user_id, household_id, started_at, is_active)
     VALUES ($1, $2, $3, NOW(), true)
     RETURNING id, kid_profile_id, parent_user_id, household_id, started_at, is_active`,
    [profileId, parentUserId, payload.household_id || null]
  );
  return session.rows[0];
}

async function getKidsMissions(parentUserId, sessionId) {
  const session = await query(
    `SELECT ks.id, ks.kid_profile_id, kp.age_group
     FROM kid_sessions ks
     JOIN kid_profiles kp ON kp.id = ks.kid_profile_id
     WHERE ks.id = $1
       AND ks.parent_user_id = $2
       AND ks.is_active = true
     LIMIT 1`,
    [sessionId, parentUserId]
  );
  if (!session.rows.length) {
    throw new Error('kids_session_not_found');
  }
  const ageGroup = session.rows[0].age_group;

  const missions = await query(
    `SELECT id, title, description, category, reward_points, status
     FROM missions
     WHERE status IN ('open', 'in_progress')
       AND category NOT IN ('alcohol', 'tobacco')
       AND starts_at <= NOW()
       AND (ends_at IS NULL OR ends_at > NOW())
     ORDER BY created_at DESC
     LIMIT 100`
  );

  return missions.rows.map((m) => ({
    ...m,
    kid_mode: ageGroup === '9-12' ? 'math_quest' : 'scanner'
  }));
}

async function submitKidsMission(parentUserId, sessionId, missionId, payload) {
  const session = await query(
    `SELECT ks.id, ks.kid_profile_id, kp.age_group
     FROM kid_sessions ks
     JOIN kid_profiles kp ON kp.id = ks.kid_profile_id
     WHERE ks.id = $1
       AND ks.parent_user_id = $2
       AND ks.is_active = true
     LIMIT 1`,
    [sessionId, parentUserId]
  );
  if (!session.rows.length) {
    throw new Error('kids_session_not_found');
  }
  const ageGroup = session.rows[0].age_group;

  const mission = await query(
    `SELECT id, category
     FROM missions
     WHERE id = $1
     LIMIT 1`,
    [missionId]
  );
  if (!mission.rows.length) {
    throw new Error('mission_not_found');
  }
  if (['alcohol', 'tobacco'].includes(mission.rows[0].category)) {
    throw new Error('adult_mission_not_allowed');
  }

  const submitResult = await submitMission(parentUserId, missionId, {
    ...payload,
    metadata: {
      ...(payload.metadata || {}),
      kid_session_id: sessionId,
      kid_profile_id: session.rows[0].kid_profile_id,
      kid_mode: ageGroup === '9-12' ? 'math_quest' : 'scanner'
    }
  });

  await query(
    `INSERT INTO kid_missions (kid_profile_id, mission_id, mode, status, created_at, completed_at)
     VALUES ($1, $2, $3, 'completed', NOW(), NOW())`,
    [session.rows[0].kid_profile_id, missionId, ageGroup === '9-12' ? 'math_quest' : 'scanner']
  );
  await query(
    `UPDATE kid_progress
     SET points = points + 10,
         missions_completed = missions_completed + 1,
         updated_at = NOW()
     WHERE kid_profile_id = $1`,
    [session.rows[0].kid_profile_id]
  );
  return submitResult;
}

async function deactivateKidsMode(parentUserId, sessionId) {
  const result = await query(
    `UPDATE kid_sessions
     SET is_active = false, ended_at = NOW()
     WHERE id = $1
       AND parent_user_id = $2
       AND is_active = true
     RETURNING id`,
    [sessionId, parentUserId]
  );
  if (!result.rows.length) {
    throw new Error('kids_session_not_found');
  }
  return { ok: true };
}

async function getTimeMachinePrediction(productId) {
  const rows = await query(
    `SELECT price_value AS price, source_type, created_at, updated_at, is_verified
     FROM offers
     WHERE product_id = $1
     ORDER BY created_at DESC
     LIMIT 180`,
    [productId]
  );
  const truth = computeWeightedTruthPrice(rows.rows.map((r) => ({ ...r, timestamp: r.updated_at || r.created_at })));
  return {
    product_id: productId,
    weighted_truth_price: truth,
    records_considered: rows.rows.length
  };
}

async function getAdvancedAnalytics(userId) {
  const spend = await query(
    `SELECT DATE_TRUNC('month', r.created_at) AS month,
            COALESCE(SUM(r.total), 0) AS total_spend
     FROM receipts r
     WHERE r.user_id = $1
     GROUP BY 1
     ORDER BY 1 DESC
     LIMIT 12`,
    [userId]
  );
  return {
    monthly_spend: spend.rows.map((r) => ({
      month: r.month,
      total_spend: Number(r.total_spend || 0)
    }))
  };
}

module.exports = {
  PLUS_FEATURES,
  REDEEM_COST_POINTS,
  REDEEM_DURATION_DAYS,
  isFeatureEnabled,
  hasFeature,
  awardPoints,
  getGamification,
  getLeaderboardGlobal,
  getLeaderboardFriends,
  getRankLevels,
  getPointsLedger,
  getRedeemOptions,
  unlockPlusWithPoints,
  subscribePlus,
  getPlusFeatures,
  getPlusStatus,
  createFamily,
  inviteFamilyMember,
  joinFamilyByToken,
  getFamilyLists,
  addFamilyListItem,
  pollFamilyEvents,
  getNearbyMissions,
  startMission,
  submitMission,
  verifyMissionSubmission,
  getProofStatus,
  disputeProof,
  activateKidsMode,
  getKidsMissions,
  submitKidsMission,
  deactivateKidsMode,
  getTimeMachinePrediction,
  getAdvancedAnalytics
};
