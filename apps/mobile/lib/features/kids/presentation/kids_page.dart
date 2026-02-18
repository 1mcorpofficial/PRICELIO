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
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Nepavyko aktyvuoti vaikų erdvės')));
      }
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
      setState(() => _missions = []);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _deactivate() async {
    if (_session == null) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Baigti vaikų erdvę?'),
        content: const Text('Sesija bus uždaryta. Tęsti?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Ne')),
          ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Taip')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ApiClient().dio.post('/kids/deactivate',
          data: {'session_id': _session!['id'].toString()});
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
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          backgroundColor: AppColors.secondary,
          content: Text(
            '+ ${mission['reward_points']} tasku! Puikus darbas!',
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ));
      }
      await _loadMissions();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Nepavyko pateikti misijos')));
      }
    }
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
      backgroundColor: const Color(0xFFF0FDF4),
      appBar: AppBar(
        title: const Text('Vaikų erdvė'),
        backgroundColor: AppColors.secondary,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const SizedBox(height: 16),

          // Header illustration
          Center(
            child: Container(
              width: 120, height: 120,
              decoration: BoxDecoration(
                color: AppColors.secondary.withOpacity(0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.child_care, size: 72, color: AppColors.secondary),
            ),
          ),
          const SizedBox(height: 24),

          const Text('Sveiki atvykę!',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: AppColors.textMain)),
          const SizedBox(height: 8),
          const Text('Sukurkite vaikų profilį ir pradėkite misijas parduotuvėje',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 15, color: AppColors.textSub)),
          const SizedBox(height: 36),

          // Name field
          _FunCard(children: [
            const Text('Vaiko vardas', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 10),
            TextField(
              controller: nameCtrl,
              textCapitalization: TextCapitalization.words,
              decoration: InputDecoration(
                hintText: 'pvz. Lukas',
                prefixIcon: const Icon(Icons.badge_outlined),
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.border),
                ),
              ),
            ),
          ]),
          const SizedBox(height: 16),

          // Age group
          _FunCard(children: [
            const Text('Amžiaus grupė', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(child: _AgeChip(
                label: '4–8 metai',
                icon: Icons.toys_outlined,
                selected: ageGroup == '4-8',
                onTap: () => onAgeGroupChanged('4-8'),
              )),
              const SizedBox(width: 12),
              Expanded(child: _AgeChip(
                label: '9–12 metų',
                icon: Icons.school_outlined,
                selected: ageGroup == '9-12',
                onTap: () => onAgeGroupChanged('9-12'),
              )),
            ]),
          ]),
          const SizedBox(height: 32),

          // Mode description
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: ageGroup == '4-8'
                  ? AppColors.primary.withOpacity(0.07)
                  : AppColors.secondary.withOpacity(0.07),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: ageGroup == '4-8' ? AppColors.primary : AppColors.secondary,
                width: 1.5,
              ),
            ),
            child: Row(children: [
              Icon(
                ageGroup == '4-8' ? Icons.qr_code_scanner : Icons.calculate_outlined,
                color: ageGroup == '4-8' ? AppColors.primary : AppColors.secondary,
                size: 28,
              ),
              const SizedBox(width: 12),
              Expanded(child: Text(
                ageGroup == '4-8'
                    ? 'Skaitytuvo misijos: ieškokite produktų parduotuvėje ir nuskenuokite jų barkodus!'
                    : 'Matematikos iššūkiai: sprendžiate kainos palyginimo uždavinius ir laimite taškus!',
                style: const TextStyle(fontSize: 13),
              )),
            ]),
          ),
          const SizedBox(height: 32),

          // Activate button
          ElevatedButton.icon(
            onPressed: loading ? null : onActivate,
            icon: loading
                ? const SizedBox(width: 18, height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.play_circle_outline, size: 24),
            label: Text(loading ? 'Aktyvinamas...' : 'Pradėti misijas!',
                style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.secondary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 18),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
          ),
        ]),
      ),
    );
  }
}

// ── Missions screen ───────────────────────────────────────────────────────────

class _MissionsView extends StatelessWidget {
  final List<dynamic> missions;
  final bool loading;
  final VoidCallback onDeactivate;
  final VoidCallback onRefresh;
  final Future<void> Function(Map<String, dynamic>) onSubmit;

  const _MissionsView({
    required this.missions,
    required this.loading,
    required this.onDeactivate,
    required this.onRefresh,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF0FDF4),
      appBar: AppBar(
        title: const Text('Misijos'),
        backgroundColor: AppColors.secondary,
        foregroundColor: Colors.white,
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: onRefresh),
          IconButton(
            icon: const Icon(Icons.stop_circle_outlined),
            tooltip: 'Baigti sesiją',
            onPressed: onDeactivate,
          ),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.secondary))
          : missions.isEmpty
              ? _EmptyMissions(onRefresh: onRefresh)
              : RefreshIndicator(
                  onRefresh: () async => onRefresh(),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: missions.length,
                    itemBuilder: (ctx, i) => _MissionCard(
                      mission: Map<String, dynamic>.from(missions[i]),
                      index: i,
                      onSubmit: () => onSubmit(Map<String, dynamic>.from(missions[i])),
                    ),
                  ),
                ),
    );
  }
}

// ── Widgets ───────────────────────────────────────────────────────────────────

class _FunCard extends StatelessWidget {
  final List<Widget> children;
  const _FunCard({required this.children});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 8, offset: const Offset(0, 2))],
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: children),
  );
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
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: selected ? AppColors.secondary : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: selected ? AppColors.secondary : AppColors.border, width: 2),
        ),
        child: Column(children: [
          Icon(icon, color: selected ? Colors.white : AppColors.textSub, size: 26),
          const SizedBox(height: 6),
          Text(label,
              textAlign: TextAlign.center,
              style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: selected ? Colors.white : AppColors.textSub)),
        ]),
      ),
    );
  }
}

class _MissionCard extends StatefulWidget {
  final Map<String, dynamic> mission;
  final int index;
  final VoidCallback onSubmit;
  const _MissionCard({required this.mission, required this.index, required this.onSubmit});

  @override
  State<_MissionCard> createState() => _MissionCardState();
}

class _MissionCardState extends State<_MissionCard> {
  bool _submitting = false;

  static const _categoryIcons = {
    'grocery':  Icons.local_grocery_store_outlined,
    'dairy':    Icons.egg_outlined,
    'produce':  Icons.eco_outlined,
    'bakery':   Icons.breakfast_dining_outlined,
    'meat':     Icons.set_meal_outlined,
    'beverages': Icons.local_drink_outlined,
    'frozen':   Icons.ac_unit_outlined,
    'snacks':   Icons.cookie_outlined,
  };

  static const _bgColors = [
    Color(0xFFFFF7ED), Color(0xFFF0FDF4), Color(0xFFEFF6FF),
    Color(0xFFFDF4FF), Color(0xFFFFFBEB), Color(0xFFF0FDFA),
  ];

  @override
  Widget build(BuildContext context) {
    final m = widget.mission;
    final icon = _categoryIcons[m['category']] ?? Icons.star_outline;
    final bg = _bgColors[widget.index % _bgColors.length];
    final isScanner = m['kid_mode'] == 'scanner';

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 8, offset: const Offset(0, 3))],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(
              width: 48, height: 48,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 4)],
              ),
              child: Icon(icon, color: AppColors.secondary, size: 26),
            ),
            const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(m['title'] ?? 'Misija',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              const SizedBox(height: 2),
              Row(children: [
                Icon(isScanner ? Icons.qr_code_scanner : Icons.calculate_outlined,
                    size: 14, color: AppColors.textSub),
                const SizedBox(width: 4),
                Text(isScanner ? 'Skaitytuvo misija' : 'Matematikos misija',
                    style: const TextStyle(fontSize: 12, color: AppColors.textSub)),
              ]),
            ])),
            // Points badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFFFFD700).withOpacity(0.25),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                const Icon(Icons.star, size: 14, color: Color(0xFFB8860B)),
                const SizedBox(width: 4),
                Text('${m['reward_points'] ?? 0}',
                    style: const TextStyle(fontWeight: FontWeight.w800,
                        color: Color(0xFFB8860B), fontSize: 14)),
              ]),
            ),
          ]),
          if (m['description'] != null) ...[
            const SizedBox(height: 10),
            Text(m['description'],
                style: const TextStyle(fontSize: 13, color: AppColors.textSub, height: 1.4)),
          ],
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _submitting ? null : () async {
                setState(() => _submitting = true);
                await Future.microtask(() {});
                widget.onSubmit();
                if (mounted) setState(() => _submitting = false);
              },
              icon: _submitting
                  ? const SizedBox(width: 16, height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Icon(isScanner ? Icons.qr_code_scanner : Icons.check_circle_outline, size: 18),
              label: Text(_submitting ? 'Siunčiama...' : 'Atlikta!',
                  style: const TextStyle(fontWeight: FontWeight.w700)),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.secondary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ]),
      ),
    );
  }
}

class _EmptyMissions extends StatelessWidget {
  final VoidCallback onRefresh;
  const _EmptyMissions({required this.onRefresh});

  @override
  Widget build(BuildContext context) => Center(
    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      const Icon(Icons.inbox_outlined, size: 72, color: AppColors.textSub),
      const SizedBox(height: 16),
      const Text('Misijų dar nėra',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.textMain)),
      const SizedBox(height: 8),
      const Text('Netrukus atsiras naujų misijų!',
          style: TextStyle(color: AppColors.textSub)),
      const SizedBox(height: 24),
      ElevatedButton.icon(
        onPressed: onRefresh,
        icon: const Icon(Icons.refresh),
        label: const Text('Atnaujinti'),
        style: ElevatedButton.styleFrom(backgroundColor: AppColors.secondary, foregroundColor: Colors.white),
      ),
    ]),
  );
}
