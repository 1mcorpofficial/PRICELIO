import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/app_theme.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});
  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  Map<String, dynamic>? _gamification;
  Map<String, dynamic>? _user;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final results = await Future.wait([
        ApiClient().dio.get('/me'),
        ApiClient().dio.get('/me/gamification'),
      ]);
      setState(() {
        _user = results[0].data;
        _gamification = results[1].data;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _logout() async {
    await ApiClient().logout();
    if (mounted) context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    final rank = _gamification?['rank'];
    final xp   = _gamification?['lifetime_xp'] ?? 0;
    final pts  = _gamification?['spendable_points'] ?? 0;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profilis'),
        actions: [
          IconButton(icon: const Icon(Icons.logout), onPressed: _logout),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Avatar + email
          Center(
            child: Column(children: [
              CircleAvatar(radius: 40, backgroundColor: AppColors.primary,
                child: Text((_user?['email'] ?? 'U')[0].toUpperCase(),
                  style: const TextStyle(fontSize: 32, color: Colors.white, fontWeight: FontWeight.w700))),
              const SizedBox(height: 12),
              Text(_user?['email'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
            ]),
          ),
          const SizedBox(height: 28),

          // Rank card
          if (rank != null) _Card(children: [
            Row(children: [
              _RankBadge(tier: rank['tier'] ?? 'bronze'),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(rank['rank_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                Text('Lygis ${rank['level']}', style: const TextStyle(color: AppColors.textSub)),
              ])),
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text('$xp XP', style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.primary)),
                Text('$pts taškų', style: const TextStyle(color: AppColors.textSub, fontSize: 13)),
              ]),
            ]),
          ]),

          const SizedBox(height: 16),

          // Stats row
          Row(children: [
            Expanded(child: _StatCard(label: 'XP', value: '$xp')),
            const SizedBox(width: 12),
            Expanded(child: _StatCard(label: 'Taškai', value: '$pts')),
            const SizedBox(width: 12),
            Expanded(child: _StatCard(label: 'Lygis', value: '${rank?['level'] ?? 1}')),
          ]),

          const SizedBox(height: 28),
          ElevatedButton.icon(
            onPressed: _logout,
            icon: const Icon(Icons.logout),
            label: const Text('Atsijungti'),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
          ),
        ],
      ),
    );
  }
}

class _Card extends StatelessWidget {
  final List<Widget> children;
  const _Card({required this.children});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: AppColors.border),
    ),
    child: Column(children: children),
  );
}

class _StatCard extends StatelessWidget {
  final String label, value;
  const _StatCard({required this.label, required this.value});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: AppColors.surface,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: AppColors.border),
    ),
    child: Column(children: [
      Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.primary)),
      const SizedBox(height: 4),
      Text(label, style: const TextStyle(color: AppColors.textSub, fontSize: 13)),
    ]),
  );
}

class _RankBadge extends StatelessWidget {
  final String tier;
  const _RankBadge({required this.tier});

  static const _colors = {
    'bronze':  Color(0xFFCD7F32),
    'silver':  Color(0xFFC0C0C0),
    'gold':    Color(0xFFFFD700),
    'diamond': Color(0xFF00BFFF),
  };

  @override
  Widget build(BuildContext context) => CircleAvatar(
    radius: 24,
    backgroundColor: _colors[tier] ?? const Color(0xFFCD7F32),
    child: const Icon(Icons.emoji_events, color: Colors.white),
  );
}
