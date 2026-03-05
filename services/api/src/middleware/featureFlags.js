const ecosystem = require('../ecosystem');

function withFeatureFlag(flagKey) {
  return async (req, res, next) => {
    try {
      const enabled = await ecosystem.isFeatureEnabled(flagKey, req.user?.id || null, 'LT');
      if (!enabled) return res.status(403).json({ error: 'feature_disabled', flag: flagKey });
      return next();
    } catch (error) {
      return res.status(500).json({ error: 'feature_flag_check_failed' });
    }
  };
}

function requirePlusFeature(featureKey) {
  return async (req, res, next) => {
    try {
      const has = await ecosystem.hasFeature(req.user.id, featureKey);
      if (!has) return res.status(402).json({ error: 'plus_feature_required', feature: featureKey });
      return next();
    } catch (error) {
      return res.status(500).json({ error: 'feature_check_failed' });
    }
  };
}

module.exports = { withFeatureFlag, requirePlusFeature };
