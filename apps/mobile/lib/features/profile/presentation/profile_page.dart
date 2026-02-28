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
  int _activeTabIndex = 0; // 0: Hoarders, 1: Whales

  // Demo data for leaderboards
  final _topHoarders = [
    {'name': 'Mantas P.', 'rank': 'Rinkos Medžiotojas', 'xp': 45200, 'avatar': 'M', 'color': AppColors.primary},
    {'name': 'Aistė G.', 'rank': 'Kainų Architektė', 'xp': 38100, 'avatar': 'A', 'color': AppColors.secondary},
    {'name': 'Tomas L.', 'rank': 'Taupymo Guru', 'xp': 32500, 'avatar': 'T', 'color': AppColors.green},
  ];

  final _topWhales = [
    {'name': 'Dominykas V.', 'plan': 'Family (Metinis)', 'spent': 150000, 'avatar': 'D', 'color': AppColors.error},
    {'name': 'Laura K.', 'plan': 'Duo', 'spent': 85000, 'avatar': 'L', 'color': Colors.orangeAccent},
    {'name': 'Studentų Atst.', 'plan': 'Group Admin', 'spent': 60000, 'avatar': 'S', 'color': AppColors.primary},
  ];

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
    final xp   = _gamification?['lifetime_xp'] ?? 12500; // Demo
    final initial = (_user?['email'] ?? 'G')[0].toUpperCase();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Profilis'),
        actions: [
          IconButton(icon: const Icon(Icons.settings_outlined), onPressed: () {}),
          IconButton(icon: const Icon(Icons.logout, color: AppColors.error), onPressed: _logout),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        children: [
          // 1. Asmeninė Vitrina (Hero Section)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [AppColors.surface, AppColors.elevated.withOpacity(0.5)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.white.withOpacity(0.1)),
              boxShadow: [
                BoxShadow(color: Colors.black.withOpacity(0.4), blurRadius: 20),
              ],
            ),
            child: Column(
              children: [
                // Avataras su progresu
                Stack(
                  alignment: Alignment.center,
                  children: [
                    SizedBox(
                      width: 90,
                      height: 90,
                      child: CircularProgressIndicator(
                        value: 0.75, // 75% progress
                        backgroundColor: Colors.white.withOpacity(0.1),
                        color: AppColors.primary,
                        strokeWidth: 4,
                      ),
                    ),
                    Container(
                      width: 76,
                      height: 76,
                      decoration: const BoxDecoration(
                        color: AppColors.elevated,
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text(
                          initial,
                          style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  _user?['email']?.split('@')[0] ?? 'Svečias',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.primary.withOpacity(0.3)),
                  ),
                  child: Text(
                    rank?['rank_name']?.toUpperCase() ?? 'LYGIS 14: RINKOS MEDŽIOTOJAS',
                    style: const TextStyle(
                      color: AppColors.primary,
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.5,
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                const Text('XP Piniginė', style: TextStyle(color: AppColors.textSub, fontSize: 12)),
                Text(
                  '$xp',
                  style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w900),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 16),

          // 2. XP Dilemos Zona
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.white.withOpacity(0.05)),
                  ),
                  child: const Column(
                    children: [
                      Icon(Icons.arrow_upward_rounded, color: AppColors.primary),
                      SizedBox(height: 8),
                      Text('Kilti Lygiais', style: TextStyle(fontWeight: FontWeight.bold)),
                      SizedBox(height: 2),
                      Text('Trūksta 2,500 XP', style: TextStyle(fontSize: 10, color: AppColors.textSub)),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  decoration: BoxDecoration(
                    color: AppColors.secondary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.secondary.withOpacity(0.3)),
                  ),
                  child: const Column(
                    children: [
                      Icon(Icons.shopping_cart_checkout, color: AppColors.secondary),
                      SizedBox(height: 8),
                      Text('Išleisti XP', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.secondary)),
                      SizedBox(height: 2),
                      Text('Apmokėti PRO', style: TextStyle(fontSize: 10, color: AppColors.textSub)),
                    ],
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // 3. Dvigubos Lyderių Lentelės
          Container(
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white.withOpacity(0.05)),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    _buildTabBtn('TOP KAUPIKAI', 0, AppColors.primary),
                    _buildTabBtn('🔥 BANGINIAI', 1, AppColors.error),
                  ],
                ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: _activeTabIndex == 0
                        ? _topHoarders.map((u) => _buildHoarderTile(u)).toList()
                        : _topWhales.map((u) => _buildWhaleTile(u)).toList(),
                  ),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 100), // Padding for bottom nav
        ],
      ),
    );
  }

  Widget _buildTabBtn(String title, int index, Color accentColor) {
    final isActive = _activeTabIndex == index;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _activeTabIndex = index),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(
                color: isActive ? accentColor : Colors.white.withOpacity(0.1),
                width: isActive ? 2 : 1,
              ),
            ),
          ),
          child: Center(
            child: Text(
              title,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 12,
                color: isActive ? Colors.white : AppColors.textSub,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHoarderTile(Map<String, dynamic> user) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: user['color'],
            radius: 18,
            child: Text(user['avatar'], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(user['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                Text(user['rank'], style: const TextStyle(fontSize: 11, color: AppColors.textSub)),
              ],
            ),
          ),
          Text('${user['xp']} XP', style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.primary)),
        ],
      ),
    );
  }

  Widget _buildWhaleTile(Map<String, dynamic> user) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.error.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.error.withOpacity(0.15)),
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: user['color'],
            radius: 18,
            child: Text(user['avatar'], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(user['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                Text(user['plan'], style: const TextStyle(fontSize: 11, color: AppColors.textSub)),
              ],
            ),
          ),
          Text('-${user['spent']}', style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.error)),
        ],
      ),
    );
  }
}
