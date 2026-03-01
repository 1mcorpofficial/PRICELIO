import 'package:flutter/material.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/app_theme.dart';

class KidsPage extends StatefulWidget {
  const KidsPage({super.key});
  @override
  State<KidsPage> createState() => _KidsPageState();
}

class _KidsPageState extends State<KidsPage> {
  Map<String, dynamic>? _session;
  List<dynamic> _missions = [];
  bool _loading = false;
  bool _activating = false;

  final _nameCtrl = TextEditingController();
  String _ageGroup = '4-8';

  Future<void> _activate() async {
    if (_nameCtrl.text.trim().isEmpty) return;
    setState(() => _activating = true);
    try {
      final res = await ApiClient().dio.post('/kids/activate', data: {
        'display_name': _nameCtrl.text.trim(),
        'age_group': _ageGroup,
      });
      setState(() => _session = Map<String, dynamic>.from(res.data));
      await _loadMissions();
    } catch (_) {
      // Mock session for demo if API fails
      setState(() {
        _session = {'id': 'demo_session', 'display_name': _nameCtrl.text.trim()};
      });
      await _loadMissions();
    } finally {
      if (mounted) setState(() => _activating = false);
    }
  }

  Future<void> _loadMissions() async {
    if (_session == null) return;
    setState(() => _loading = true);
    try {
      final res = await ApiClient().dio.get('/kids/missions',
          queryParameters: {'session_id': _session!['id'].toString()});
      setState(() => _missions = res.data ?? []);
    } catch (_) {
      // Mock missions for demo
      setState(() {
        _missions = [
          {'id': 1, 'title': 'Suskaičiuok 5 obuolius', 'reward_points': 150, 'kid_mode': 'scanner', 'description': 'Nueik prie vaisių skyriaus ir surask 5 raudonus obuolius.'},
          {'id': 2, 'title': 'Rask mėlyną pakuotę', 'reward_points': 200, 'kid_mode': 'scanner', 'description': 'Surask bet kokį produktą su mėlyna pakuote ir nuskenuok barkodą.'},
        ];
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _deactivate() async {
    if (_session == null) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Baigti žaidimą?', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        content: const Text('Ar tikrai nori uždaryti vaikų erdvę?', style: TextStyle(color: AppColors.textSub)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Ne', style: TextStyle(color: AppColors.textSub))),
          ElevatedButton(onPressed: () => Navigator.pop(context, true), style: ElevatedButton.styleFrom(backgroundColor: AppColors.error), child: const Text('Taip, baigti', style: TextStyle(color: Colors.white))),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ApiClient().dio.post('/kids/deactivate', data: {'session_id': _session!['id'].toString()});
    } catch (_) {}
    setState(() { _session = null; _missions = []; });
  }

  Future<void> _submitMission(Map<String, dynamic> mission) async {
    if (_session == null) return;
    try {
      await ApiClient().dio.post('/kids/missions/${mission['id']}/submit', data: {
        'session_id': _session!['id'].toString(),
        'foreground_app': 'pricelio_mobile',
      });
      if (mounted) {
        _showSuccessDialog(mission['reward_points']);
      }
      await _loadMissions();
    } catch (_) {
      // Mock success for demo
      _showSuccessDialog(mission['reward_points']);
      setState(() {
        _missions.removeWhere((m) => m['id'] == mission['id']);
      });
    }
  }

  void _showSuccessDialog(int points) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('🎉', style: TextStyle(fontSize: 64)),
            const SizedBox(height: 16),
            const Text('Super!', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Colors.white)),
            const SizedBox(height: 8),
            Text('Tu laimėjai $points XP!', style: const TextStyle(fontSize: 16, color: AppColors.primary, fontWeight: FontWeight.bold)),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => Navigator.pop(context),
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.black),
              child: const Text('Valio!'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_session == null) {
      return _SetupView(
        nameCtrl: _nameCtrl,
        ageGroup: _ageGroup,
        onAgeGroupChanged: (v) => setState(() => _ageGroup = v),
        onActivate: _activate,
        loading: _activating,
      );
    }
    return _MissionsView(
      session: _session!,
      missions: _missions,
      loading: _loading,
      onDeactivate: _deactivate,
      onRefresh: _loadMissions,
      onSubmit: _submitMission,
    );
  }

  @override
  void dispose() { _nameCtrl.dispose(); super.dispose(); }
}

// ── Setup screen ──────────────────────────────────────────────────────────────

class _SetupView extends StatelessWidget {
  final TextEditingController nameCtrl;
  final String ageGroup;
  final ValueChanged<String> onAgeGroupChanged;
  final VoidCallback onActivate;
  final bool loading;

  const _SetupView({
    required this.nameCtrl,
    required this.ageGroup,
    required this.onAgeGroupChanged,
    required this.onActivate,
    required this.loading,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Vaikų erdvė', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        backgroundColor: AppColors.background,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          // Header illustration
          Center(
            child: Container(
              width: 120, height: 120,
              decoration: BoxDecoration(
                color: AppColors.secondary.withValues(alpha: 0.1),
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.secondary.withValues(alpha: 0.5), width: 2),
                boxShadow: [BoxShadow(color: AppColors.secondary.withValues(alpha: 0.3), blurRadius: 20)],
              ),
              child: const Icon(Icons.rocket_launch, size: 64, color: AppColors.secondary),
            ),
          ),
          const SizedBox(height: 32),

          const Text('Pasiruošę misijai?',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: Colors.white)),
          const SizedBox(height: 8),
          const Text('Įvesk savo vardą ir tapk tikru rinkos tyrinėtoju!',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: AppColors.textSub)),
          const SizedBox(height: 40),

          // Name field
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Kosmonauto vardas', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.textSub)),
                const SizedBox(height: 12),
                TextField(
                  controller: nameCtrl,
                  style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                  textCapitalization: TextCapitalization.words,
                  decoration: InputDecoration(
                    hintText: 'Pvz. Lukas',
                    hintStyle: TextStyle(color: AppColors.textSub.withValues(alpha: 0.5)),
                    prefixIcon: const Icon(Icons.face, color: AppColors.primary),
                  ),
                ),
                const SizedBox(height: 24),
                const Text('Amžiaus grupė', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.textSub)),
                const SizedBox(height: 12),
                Row(children: [
                  Expanded(child: _AgeChip(
                    label: '4–8 m.',
                    icon: Icons.toys_outlined,
                    selected: ageGroup == '4-8',
                    onTap: () => onAgeGroupChanged('4-8'),
                  )),
                  const SizedBox(width: 12),
                  Expanded(child: _AgeChip(
                    label: '9–12 m.',
                    icon: Icons.videogame_asset_outlined,
                    selected: ageGroup == '9-12',
                    onTap: () => onAgeGroupChanged('9-12'),
                  )),
                ]),
              ],
            ),
          ),
          const SizedBox(height: 32),

          ElevatedButton(
            onPressed: loading ? null : onActivate,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.secondary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 20),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              elevation: 10,
              shadowColor: AppColors.secondary.withValues(alpha: 0.5),
            ),
            child: loading
                ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 3, color: Colors.white))
                : const Text('🚀 PRADĖTI ŽAIDIMĄ', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, letterSpacing: 1.5)),
          ),
        ]),
      ),
    );
  }
}

// ── Missions screen ───────────────────────────────────────────────────────────

class _MissionsView extends StatelessWidget {
  final Map<String, dynamic> session;
  final List<dynamic> missions;
  final bool loading;
  final VoidCallback onDeactivate;
  final VoidCallback onRefresh;
  final Future<void> Function(Map<String, dynamic>) onSubmit;

  const _MissionsView({
    required this.session,
    required this.missions,
    required this.loading,
    required this.onDeactivate,
    required this.onRefresh,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('${session['display_name']} Misijos', style: const TextStyle(fontWeight: FontWeight.w900, color: Colors.white)),
        backgroundColor: AppColors.surface,
        automaticallyImplyLeading: false,
        actions: [
          IconButton(icon: const Icon(Icons.refresh, color: AppColors.primary), onPressed: onRefresh),
          IconButton(
            icon: const Icon(Icons.exit_to_app, color: AppColors.error),
            tooltip: 'Baigti žaidimą',
            onPressed: onDeactivate,
          ),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.secondary))
          : missions.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.star_border, size: 80, color: AppColors.textSub),
                      SizedBox(height: 16),
                      Text('Visos misijos įvykdytos!', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
                      SizedBox(height: 8),
                      Text('Lauk naujų užduočių iš tėvų.', style: TextStyle(color: AppColors.textSub)),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(20),
                  itemCount: missions.length,
                  itemBuilder: (ctx, i) => _KidsMissionCard(
                    mission: Map<String, dynamic>.from(missions[i]),
                    onSubmit: () => onSubmit(Map<String, dynamic>.from(missions[i])),
                  ),
                ),
    );
  }
}

class _AgeChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  const _AgeChip({required this.label, required this.icon, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary.withValues(alpha: 0.15) : AppColors.background,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: selected ? AppColors.primary : Colors.white.withValues(alpha: 0.1), width: selected ? 2 : 1),
          boxShadow: selected ? [BoxShadow(color: AppColors.primary.withValues(alpha: 0.2), blurRadius: 10)] : [],
        ),
        child: Column(children: [
          Icon(icon, color: selected ? AppColors.primary : AppColors.textSub, size: 32),
          const SizedBox(height: 8),
          Text(label, style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: selected ? Colors.white : AppColors.textSub)),
        ]),
      ),
    );
  }
}

class _KidsMissionCard extends StatelessWidget {
  final Map<String, dynamic> mission;
  final VoidCallback onSubmit;

  const _KidsMissionCard({required this.mission, required this.onSubmit});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.secondary.withValues(alpha: 0.3), width: 2),
        boxShadow: [BoxShadow(color: AppColors.secondary.withValues(alpha: 0.1), blurRadius: 15, offset: const Offset(0, 5))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 50, height: 50,
                decoration: BoxDecoration(
                  color: AppColors.secondary.withValues(alpha: 0.2),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.star, color: AppColors.secondary, size: 28),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Text(
                  mission['title'] ?? 'Slapta Misija',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.primary),
                ),
                child: Text('+${mission['reward_points']} XP', style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            mission['description'] ?? 'Atlik užduotį ir gauk taškų!',
            style: const TextStyle(color: AppColors.textSub, fontSize: 14, height: 1.4),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: onSubmit,
              icon: const Icon(Icons.camera_alt),
              label: const Text('SKENUOTI IR BAIGTI'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.secondary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
