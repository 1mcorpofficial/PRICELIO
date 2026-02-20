import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../receipts/presentation/receipt_scan_page.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});
  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  List<dynamic> _stores = [];
  Map<String, dynamic>? _gamification;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final storesRes = await ApiClient().dio.get(
        '/map/stores',
        queryParameters: {'city': 'Vilnius'},
      );
      Map<String, dynamic>? gamification;
      try {
        final gamificationRes = await ApiClient().dio.get('/me/gamification');
        if (gamificationRes.data is Map<String, dynamic>) {
          gamification = gamificationRes.data as Map<String, dynamic>;
        }
      } catch (_) {}
      setState(() {
        _stores = storesRes.data is List ? storesRes.data : [];
        _gamification = gamification;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: CustomScrollView(
          slivers: [
            _buildAppBar(context),
            if (_loading)
              const SliverFillRemaining(
                child: Center(child: CircularProgressIndicator()),
              )
            else ...[
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    // Savings hero
                    if (_gamification != null) ...[
                      _SavingsHeroCard(gamification: _gamification!),
                      const SizedBox(height: 16),
                    ],
                    // Quick actions row
                    _QuickActions(),
                    const SizedBox(height: 20),
                    // Receipt scan banner
                    _ReceiptScanBanner(),
                    const SizedBox(height: 20),
                    // Section title
                    _SectionTitle('Parduotuvės Vilniuje (${_stores.length})'),
                    const SizedBox(height: 10),
                  ]),
                ),
              ),
              // Stores list
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (ctx, i) => _StoreCard(store: _stores[i]),
                    childCount: _stores.length,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  SliverAppBar _buildAppBar(BuildContext context) {
    return SliverAppBar(
      floating: true,
      snap: true,
      backgroundColor: AppColors.surface,
      elevation: 0,
      titleSpacing: 16,
      title: Row(children: [
        Container(
          width: 32, height: 32,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [AppColors.primary, Color(0xFFFF8C5A)],
            ),
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Center(
            child: Text('PL',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 11)),
          ),
        ),
        const SizedBox(width: 10),
        const Text('PRICELIO',
          style: TextStyle(
            fontWeight: FontWeight.w900,
            color: AppColors.textMain,
            fontSize: 18,
            letterSpacing: -0.3,
          )),
      ]),
      actions: [
        IconButton(
          icon: const Icon(Icons.search, color: AppColors.textMain),
          onPressed: () => context.go('/search'),
        ),
        IconButton(
          icon: const Icon(Icons.map_outlined, color: AppColors.textMain),
          onPressed: () => context.go('/map'),
        ),
        const SizedBox(width: 4),
      ],
    );
  }
}

// ── Savings Hero Card ─────────────────────────────────────
class _SavingsHeroCard extends StatelessWidget {
  final Map<String, dynamic> gamification;
  const _SavingsHeroCard({required this.gamification});

  @override
  Widget build(BuildContext context) {
    final xp    = gamification['lifetime_xp'] ?? 0;
    final pts   = gamification['spendable_points'] ?? 0;
    final rank  = gamification['rank'];
    final level = rank?['level'] ?? 1;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0B1C4A), Color(0xFF1A3D8A), Color(0xFF0E5E58)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1A3D8A).withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(children: [
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Jūsų pažanga',
              style: TextStyle(
                color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            Text('$xp XP',
              style: const TextStyle(
                color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900)),
            const SizedBox(height: 4),
            Text('Lygis $level · $pts taškų',
              style: const TextStyle(color: Colors.white60, fontSize: 13)),
          ]),
        ),
        Container(
          width: 56, height: 56,
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.12),
            borderRadius: BorderRadius.circular(16),
          ),
          child: const Center(
            child: Text('🏆', style: TextStyle(fontSize: 28)),
          ),
        ),
      ]),
    );
  }
}

// ── Quick Actions ─────────────────────────────────────────
class _QuickActions extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Expanded(child: _QuickBtn(
        icon: Icons.qr_code_scanner,
        label: 'Barkodas',
        color: const Color(0xFF7C3AED),
        onTap: () => context.go('/scanner'),
      )),
      const SizedBox(width: 10),
      Expanded(child: _QuickBtn(
        icon: Icons.emoji_events_outlined,
        label: 'Misijos',
        color: AppColors.primary,
        onTap: () => context.go('/missions'),
      )),
      const SizedBox(width: 10),
      Expanded(child: _QuickBtn(
        icon: Icons.shopping_bag_outlined,
        label: 'Krepšelis',
        color: const Color(0xFF047857),
        onTap: () => context.go('/basket'),
      )),
    ]);
  }
}

class _QuickBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _QuickBtn({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 5),
          Text(label, style: TextStyle(
            color: color, fontSize: 11, fontWeight: FontWeight.w700)),
        ]),
      ),
    );
  }
}

// ── Receipt Scan Banner ───────────────────────────────────
class _ReceiptScanBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => Navigator.push(context,
          MaterialPageRoute(builder: (_) => const ReceiptScanPage())),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [AppColors.primary, AppColors.primary.withOpacity(0.75)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withOpacity(0.35),
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Row(children: [
          Container(
            width: 52, height: 52,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.18),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(Icons.receipt_long, color: Colors.white, size: 28),
          ),
          const SizedBox(width: 14),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Analizuoti čekį',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                    )),
                SizedBox(height: 3),
                Text('Nuskenuokite čekį ir sužinokite, kur permokėjote',
                    style: TextStyle(color: Colors.white70, fontSize: 12)),
              ],
            ),
          ),
          const Icon(Icons.arrow_forward_ios, color: Colors.white60, size: 16),
        ]),
      ),
    );
  }
}

// ── Section Title ─────────────────────────────────────────
class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);

  @override
  Widget build(BuildContext context) => Text(text,
      style: const TextStyle(
        fontSize: 17,
        fontWeight: FontWeight.w800,
        color: AppColors.textMain,
      ));
}

// ── Store Card ────────────────────────────────────────────
class _StoreCard extends StatelessWidget {
  final Map store;
  const _StoreCard({required this.store});

  @override
  Widget build(BuildContext context) {
    final chain = (store['chain'] ?? '') as String;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        leading: Container(
          width: 44, height: 44,
          decoration: BoxDecoration(
            color: AppColors.primary.withOpacity(0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Center(
            child: Text(_chainEmoji(chain),
              style: const TextStyle(fontSize: 20)),
          ),
        ),
        title: Text(store['name'] ?? '',
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
        subtitle: Text(chain,
            style: TextStyle(color: AppColors.textSub, fontSize: 12)),
        trailing: const Icon(Icons.chevron_right, color: AppColors.textSub),
      ),
    );
  }

  String _chainEmoji(String chain) {
    switch (chain.toLowerCase()) {
      case 'maxima':  return '🅼';
      case 'lidl':    return '🛒';
      case 'iki':     return '🏪';
      case 'norfa':   return '🏬';
      case 'rimi':    return '🛍';
      default:        return '🏪';
    }
  }
}
