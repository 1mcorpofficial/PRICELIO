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
  String? _missionsError;
  String? _leaderboardError;

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
    setState(() {
      _loadingMissions = true;
      _missionsError = null;
    });
    try {
      final res = await ApiClient().dio.get(
        '/missions/nearby',
        queryParameters: {'lat': 54.6872, 'lon': 25.2797, 'radius_km': 5},
      );
      setState(() => _missions = res.data is List ? res.data : []);
    } catch (error) {
      setState(() {
        _missions = [];
        _missionsError = 'Nepavyko gauti misijų. ${error.toString()}';
      });
    } finally {
      setState(() => _loadingMissions = false);
    }
  }

  Future<void> _loadLeaderboard() async {
    setState(() {
      _loadingBoard = true;
      _leaderboardError = null;
    });
    try {
      final res = await ApiClient().dio.get('/leaderboard/global');
      setState(() => _globalBoard = res.data is List ? res.data : []);
    } catch (error) {
      setState(() {
        _globalBoard = [];
        _leaderboardError = 'Nepavyko gauti lyderių lentelės. ${error.toString()}';
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
    if (_missionsError != null && _missions.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, color: AppColors.error, size: 36),
              const SizedBox(height: 10),
              Text(
                _missionsError!,
                style: const TextStyle(color: AppColors.error, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _loadMissions,
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.black),
                child: const Text('Bandyti dar kartą'),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadMissions,
      color: AppColors.primary,
      backgroundColor: AppColors.surface,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        itemCount: _missions.length,
        itemBuilder: (ctx, i) {
          final m = _missions[i];
          final xp = m['reward_points'] ?? m['xp_reward'] ?? m['xp'] ?? 0;
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
                      Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white), maxLines: 2, overflow: TextOverflow.ellipsis),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(Icons.location_on, size: 14, color: AppColors.textSub),
                          const SizedBox(width: 4),
                          Expanded(child: Text(store, style: const TextStyle(fontSize: 13, color: AppColors.textSub), maxLines: 1, overflow: TextOverflow.ellipsis)),
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
    if (_leaderboardError != null && _globalBoard.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, color: AppColors.error, size: 36),
              const SizedBox(height: 10),
              Text(
                _leaderboardError!,
                style: const TextStyle(color: AppColors.error, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _loadLeaderboard,
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.black),
                child: const Text('Bandyti dar kartą'),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadLeaderboard,
      color: AppColors.primary,
      backgroundColor: AppColors.surface,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 100),
        itemCount: _globalBoard.where((e) => ((e['lifetime_xp'] ?? 0) as num) > 0).length,
        itemBuilder: (ctx, i) {
          final filtered = _globalBoard.where((e) => ((e['lifetime_xp'] ?? 0) as num) > 0).toList();
          final e = filtered[i];
          final rank = e['position'] ?? e['rank'] ?? (i + 1);
          final name = e['username'] ?? e['email_masked'] ?? 'Anonimas';
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
