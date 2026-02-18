import 'package:flutter/material.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/app_theme.dart';

class MissionsPage extends StatefulWidget {
  const MissionsPage({super.key});
  @override
  State<MissionsPage> createState() => _MissionsPageState();
}

class _MissionsPageState extends State<MissionsPage>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  List<dynamic> _missions = [];
  List<dynamic> _globalBoard = [];
  List<dynamic> _friendsBoard = [];
  bool _loadingMissions = true;
  bool _loadingBoard    = false;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
    _loadMissions();
    _tabs.addListener(() {
      if (_tabs.index == 1 && _globalBoard.isEmpty && !_loadingBoard) {
        _loadLeaderboard();
      }
    });
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _loadMissions() async {
    setState(() => _loadingMissions = true);
    try {
      // Vilnius default coords
      final res = await ApiClient().dio.get(
        '/missions/nearby',
        queryParameters: {'lat': 54.6872, 'lon': 25.2797, 'radius_km': 5},
      );
      setState(() => _missions = res.data is List ? res.data : []);
    } catch (_) {
      setState(() => _missions = []);
    } finally {
      setState(() => _loadingMissions = false);
    }
  }

  Future<void> _loadLeaderboard() async {
    setState(() => _loadingBoard = true);
    try {
      final res = await ApiClient().dio.get('/leaderboard/global');
      setState(() => _globalBoard = res.data is List ? res.data : []);
    } catch (_) {
    } finally {
      setState(() => _loadingBoard = false);
    }
  }

  Future<void> _loadFriends() async {
    try {
      final res = await ApiClient().dio.get('/leaderboard/friends');
      setState(() => _friendsBoard = res.data is List ? res.data : []);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Misijos & Lyderiai'),
        bottom: TabBar(
          controller: _tabs,
          tabs: const [
            Tab(text: '🎯  Misijos'),
            Tab(text: '🏆  Lyderiai'),
          ],
          labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: [
          _MissionsTab(
            missions: _missions,
            loading: _loadingMissions,
            onRefresh: _loadMissions,
          ),
          _LeaderboardTab(
            globalBoard: _globalBoard,
            friendsBoard: _friendsBoard,
            loading: _loadingBoard,
            onRefreshGlobal: _loadLeaderboard,
            onRefreshFriends: _loadFriends,
          ),
        ],
      ),
    );
  }
}

// ────────────────────────────────────────────────────────────
// Missions Tab
// ────────────────────────────────────────────────────────────

class _MissionsTab extends StatelessWidget {
  final List<dynamic> missions;
  final bool loading;
  final VoidCallback onRefresh;

  const _MissionsTab({
    required this.missions,
    required this.loading,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (missions.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('🎯', style: TextStyle(fontSize: 48)),
              const SizedBox(height: 16),
              const Text('Misijų nerasta',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Text('Nėra aktyvių misijų šalia jūsų.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.textSub)),
              const SizedBox(height: 20),
              ElevatedButton.icon(
                onPressed: onRefresh,
                icon: const Icon(Icons.refresh),
                label: const Text('Atnaujinti'),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async => onRefresh(),
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: missions.length,
        itemBuilder: (ctx, i) => _MissionCard(mission: missions[i]),
      ),
    );
  }
}

class _MissionCard extends StatelessWidget {
  final Map mission;
  const _MissionCard({required this.mission});

  @override
  Widget build(BuildContext context) {
    final xp       = mission['xp_reward'] ?? mission['xp'] ?? 0;
    final title    = mission['title'] ?? mission['product_name'] ?? 'Misija';
    final store    = mission['store_chain'] ?? '';
    final type     = mission['mission_type'] ?? mission['type'] ?? '';
    final typeIcon = _icon(type);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(children: [
          Container(
            width: 48, height: 48,
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Center(child: Text(typeIcon, style: const TextStyle(fontSize: 22))),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
              if (store.isNotEmpty) ...[
                const SizedBox(height: 3),
                Text(store, style: TextStyle(color: AppColors.textSub, fontSize: 13)),
              ],
            ]),
          ),
          const SizedBox(width: 12),
          _XpBadge(xp: xp),
        ]),
      ),
    );
  }

  String _icon(String type) {
    switch (type.toLowerCase()) {
      case 'price_check':    return '💰';
      case 'photo_proof':   return '📷';
      case 'verify':         return '✅';
      default:               return '🎯';
    }
  }
}

class _XpBadge extends StatelessWidget {
  final int xp;
  const _XpBadge({required this.xp});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFFF6B35), Color(0xFFFF8C5A)],
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text('+${xp}XP',
        style: const TextStyle(
          color: Colors.white, fontWeight: FontWeight.w800, fontSize: 12)),
    );
  }
}

// ────────────────────────────────────────────────────────────
// Leaderboard Tab
// ────────────────────────────────────────────────────────────

class _LeaderboardTab extends StatefulWidget {
  final List<dynamic> globalBoard;
  final List<dynamic> friendsBoard;
  final bool loading;
  final VoidCallback onRefreshGlobal;
  final VoidCallback onRefreshFriends;

  const _LeaderboardTab({
    required this.globalBoard,
    required this.friendsBoard,
    required this.loading,
    required this.onRefreshGlobal,
    required this.onRefreshFriends,
  });

  @override
  State<_LeaderboardTab> createState() => _LeaderboardTabState();
}

class _LeaderboardTabState extends State<_LeaderboardTab>
    with SingleTickerProviderStateMixin {
  late final TabController _inner;

  @override
  void initState() {
    super.initState();
    _inner = TabController(length: 2, vsync: this);
    _inner.addListener(() {
      if (_inner.index == 1 && widget.friendsBoard.isEmpty) {
        widget.onRefreshFriends();
      }
    });
  }

  @override
  void dispose() {
    _inner.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      Container(
        color: Theme.of(context).colorScheme.surface,
        child: TabBar(
          controller: _inner,
          tabs: const [
            Tab(text: '🌍 Globalus'),
            Tab(text: '👥 Draugai'),
          ],
        ),
      ),
      Expanded(
        child: TabBarView(
          controller: _inner,
          children: [
            _BoardList(
              entries: widget.globalBoard,
              loading: widget.loading,
              onRefresh: widget.onRefreshGlobal,
            ),
            _BoardList(
              entries: widget.friendsBoard,
              loading: false,
              onRefresh: widget.onRefreshFriends,
            ),
          ],
        ),
      ),
    ]);
  }
}

class _BoardList extends StatelessWidget {
  final List<dynamic> entries;
  final bool loading;
  final VoidCallback onRefresh;

  const _BoardList({
    required this.entries,
    required this.loading,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (entries.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('🏆', style: TextStyle(fontSize: 44)),
            const SizedBox(height: 12),
            Text('Nėra duomenų', style: TextStyle(color: AppColors.textSub)),
            const SizedBox(height: 16),
            TextButton.icon(
              onPressed: onRefresh,
              icon: const Icon(Icons.refresh),
              label: const Text('Įkelti'),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async => onRefresh(),
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
        itemCount: entries.length,
        separatorBuilder: (_, __) => const Divider(height: 1),
        itemBuilder: (ctx, i) {
          final e = entries[i];
          final rank  = e['rank'] ?? (i + 1);
          final name  = e['username'] ?? e['email'] ?? 'Anonimai';
          final xp    = e['lifetime_xp'] ?? e['xp'] ?? 0;

          return ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 0, vertical: 4),
            leading: _RankCircle(rank: rank),
            title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
            trailing: Text('$xp XP',
              style: TextStyle(
                fontWeight: FontWeight.w700,
                color: AppColors.primary,
                fontSize: 14,
              )),
          );
        },
      ),
    );
  }
}

class _RankCircle extends StatelessWidget {
  final int rank;
  const _RankCircle({required this.rank});

  @override
  Widget build(BuildContext context) {
    final (bg, emoji) = switch (rank) {
      1 => (const Color(0xFFFFD700), '🥇'),
      2 => (const Color(0xFFC0C0C0), '🥈'),
      3 => (const Color(0xFFCD7F32), '🥉'),
      _ => (AppColors.background, null),
    };

    return CircleAvatar(
      radius: 20,
      backgroundColor: bg,
      child: emoji != null
          ? Text(emoji, style: const TextStyle(fontSize: 18))
          : Text('$rank',
              style: const TextStyle(
                fontWeight: FontWeight.w800, fontSize: 14, color: AppColors.textMain)),
    );
  }
}
