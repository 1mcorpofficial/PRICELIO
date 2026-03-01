import 'package:flutter/material.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/app_theme.dart';

class MissionsPage extends StatefulWidget {
  const MissionsPage({super.key});
  @override
  State<MissionsPage> createState() => _MissionsPageState();
}

class _MissionsPageState extends State<MissionsPage> with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  List<dynamic> _missions = [];
  List<dynamic> _globalBoard = [];
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
      final res = await ApiClient().dio.get(
        '/missions/nearby',
        queryParameters: {'lat': 54.6872, 'lon': 25.2797, 'radius_km': 5},
      );
      setState(() => _missions = res.data is List ? res.data : []);
    } catch (_) {
      // Mock missions for demo visualization if API fails
      setState(() {
        _missions = [
          { 'title': 'Skenuoti kvitą MAXIMA', 'store_chain': 'Maxima', 'xp_reward': 500, 'type': 'photo_proof' },
          { 'title': 'Rasti pigiausią sviestą', 'store_chain': 'Lidl', 'xp_reward': 300, 'type': 'price_check' },
          { 'title': 'Patvirtinti akciją IKI', 'store_chain': 'Iki', 'xp_reward': 200, 'type': 'verify' },
        ];
      });
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
      // Mock leaderboard for demo
      setState(() {
        _globalBoard = [
          {'username': 'Kainų Medžiotojas', 'lifetime_xp': 45200, 'rank': 1},
          {'username': 'Taupymo Guru', 'lifetime_xp': 38100, 'rank': 2},
          {'username': 'Akcijų Karalius', 'lifetime_xp': 32500, 'rank': 3},
        ];
      });
    } finally {
      setState(() => _loadingBoard = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Misijos & Lyderiai', style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.0)),
        backgroundColor: AppColors.background,
      ),
      body: Column(
        children: [
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
            ),
            child: TabBar(
              controller: _tabs,
              indicator: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.primary.withValues(alpha: 0.5)),
              ),
              indicatorSize: TabBarIndicatorSize.tab,
              dividerColor: Colors.transparent,
              labelColor: AppColors.primary,
              unselectedLabelColor: AppColors.textSub,
              labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              tabs: const [
                Tab(text: '🎯 Misijos'),
                Tab(text: '🏆 Lyderiai'),
              ],
            ),
          ),
          Expanded(
            child: TabBarView(
              controller: _tabs,
              children: [
                _buildMissionsTab(),
                _buildLeaderboardTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMissionsTab() {
    if (_loadingMissions) return const Center(child: CircularProgressIndicator(color: AppColors.primary));

    return RefreshIndicator(
      onRefresh: _loadMissions,
      color: AppColors.primary,
      backgroundColor: AppColors.surface,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        itemCount: _missions.length,
        itemBuilder: (ctx, i) {
          final m = _missions[i];
          final xp = m['xp_reward'] ?? m['xp'] ?? 0;
          final title = m['title'] ?? 'Užduotis';
          final store = m['store_chain'] ?? '';

          return Container(
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.surface.withValues(alpha: 0.8),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: AppColors.secondary.withValues(alpha: 0.3)),
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: 0.4), blurRadius: 10, offset: const Offset(0, 5)),
              ],
            ),
            child: Row(
              children: [
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: AppColors.secondary.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.secondary.withValues(alpha: 0.5)),
                    boxShadow: [BoxShadow(color: AppColors.secondary.withValues(alpha: 0.2), blurRadius: 10)],
                  ),
                  child: const Center(child: Icon(Icons.star, color: AppColors.secondary, size: 28)),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(Icons.location_on, size: 14, color: AppColors.textSub),
                          const SizedBox(width: 4),
                          Text(store, style: const TextStyle(fontSize: 13, color: AppColors.textSub)),
                        ],
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [AppColors.primary, AppColors.secondary]),
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: 0.4), blurRadius: 8)],
                  ),
                  child: Text('+$xp XP', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 12)),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildLeaderboardTab() {
    if (_loadingBoard) return const Center(child: CircularProgressIndicator(color: AppColors.primary));

    return RefreshIndicator(
      onRefresh: _loadLeaderboard,
      color: AppColors.primary,
      backgroundColor: AppColors.surface,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 100),
        itemCount: _globalBoard.length,
        itemBuilder: (ctx, i) {
          final e = _globalBoard[i];
          final rank = e['rank'] ?? (i + 1);
          final name = e['username'] ?? 'Anonimas';
          final xp = e['lifetime_xp'] ?? 0;
          
          final isTop3 = rank <= 3;
          final color = rank == 1 ? const Color(0xFFFFD700) : (rank == 2 ? const Color(0xFFC0C0C0) : (rank == 3 ? const Color(0xFFCD7F32) : AppColors.primary));

          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            decoration: BoxDecoration(
              color: isTop3 ? color.withValues(alpha: 0.05) : AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: isTop3 ? color.withValues(alpha: 0.3) : Colors.white.withValues(alpha: 0.05)),
            ),
            child: Row(
              children: [
                SizedBox(
                  width: 30,
                  child: Text('#$rank', style: TextStyle(fontWeight: FontWeight.w900, color: color, fontSize: 16)),
                ),
                const SizedBox(width: 12),
                Expanded(child: Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16))),
                Text('$xp XP', style: TextStyle(fontWeight: FontWeight.w900, color: isTop3 ? color : AppColors.primary, fontSize: 16)),
              ],
            ),
          );
        },
      ),
    );
  }
}
