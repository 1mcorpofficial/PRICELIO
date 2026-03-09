import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:ui';
import 'package:local_auth/local_auth.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/app_theme.dart';

class WarrantyPage extends StatefulWidget {
  const WarrantyPage({super.key});

  @override
  State<WarrantyPage> createState() => _WarrantyPageState();
}

class _WarrantyPageState extends State<WarrantyPage> with SingleTickerProviderStateMixin {
  final LocalAuthentication _auth = LocalAuthentication();
  bool _isUnlocked = false;
  bool _isAuthenticating = false;
  bool _biometricsAvailable = true;
  bool _loadingWarranties = false;
  List<dynamic> _warranties = [];

  late AnimationController _rotationController;

  @override
  void initState() {
    super.initState();
    _rotationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat();
    _checkBiometrics();
  }

  Future<void> _checkBiometrics() async {
    try {
      final canCheck = await _auth.canCheckBiometrics;
      final biometrics = await _auth.getAvailableBiometrics();
      if (!mounted) return;
      setState(() => _biometricsAvailable = canCheck && biometrics.isNotEmpty);
    } catch (_) {
      if (mounted) setState(() => _biometricsAvailable = false);
    }
  }

  @override
  void dispose() {
    _rotationController.dispose();
    super.dispose();
  }

  Future<void> _authenticate() async {
    setState(() => _isAuthenticating = true);
    bool authenticated = false;
    try {
      HapticFeedback.heavyImpact();
      authenticated = await _auth.authenticate(
        localizedReason: 'Atrakinkite garantijų seifą',
      );
    } catch (_) {}
    if (mounted) {
      setState(() {
        _isAuthenticating = false;
        _isUnlocked = authenticated;
      });
      if (authenticated) {
        HapticFeedback.heavyImpact();
        _loadWarranties();
      }
    }
  }

  Future<void> _loadWarranties() async {
    setState(() => _loadingWarranties = true);
    try {
      final res = await ApiClient().dio.get('/warranty/list');
      final data = res.data;
      if (!mounted) return;
      setState(() => _warranties = data is List ? data : []);
    } catch (_) {
      if (mounted) setState(() => _warranties = []);
    } finally {
      if (mounted) setState(() => _loadingWarranties = false);
    }
  }

  double get _totalProtected => _warranties.fold(0.0, (sum, w) {
    final price = w['purchase_price'];
    return sum + (price is num ? price.toDouble() : 0.0);
  });

  void _showAddForm() {
    final nameCtrl = TextEditingController();
    final storeCtrl = TextEditingController();
    final priceCtrl = TextEditingController();
    final monthsCtrl = TextEditingController();
    final formKey = GlobalKey<FormState>();

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: Container(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
          decoration: const BoxDecoration(
            color: Color(0xFF12082A),
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Pridėti garantiją', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900)),
                const SizedBox(height: 16),
                _formField(nameCtrl, 'Prekės pavadinimas', required: true),
                const SizedBox(height: 10),
                _formField(storeCtrl, 'Parduotuvė'),
                const SizedBox(height: 10),
                _formField(priceCtrl, 'Kaina (€)', keyboardType: TextInputType.number),
                const SizedBox(height: 10),
                _formField(monthsCtrl, 'Garantija (mėnesiai)', keyboardType: TextInputType.number),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    onPressed: () async {
                      if (nameCtrl.text.trim().isEmpty) return;
                      final months = int.tryParse(monthsCtrl.text) ?? 12;
                      final expiresAt = DateTime.now().add(Duration(days: months * 30));
                      try {
                        await ApiClient().dio.post('/warranty/add', data: {
                          'product_name': nameCtrl.text.trim(),
                          'store_name': storeCtrl.text.trim(),
                          'purchase_price': double.tryParse(priceCtrl.text) ?? 0,
                          'purchase_date': DateTime.now().toIso8601String().split('T').first,
                          'warranty_expires_at': expiresAt.toIso8601String(),
                        });
                        if (mounted) Navigator.pop(ctx);
                        _loadWarranties();
                      } catch (_) {
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Nepavyko išsaugoti. Bandyk vėliau.')),
                          );
                        }
                      }
                    },
                    child: const Text('Išsaugoti', style: TextStyle(fontWeight: FontWeight.w900)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _formField(TextEditingController ctrl, String label, {
    bool required = false,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return TextFormField(
      controller: ctrl,
      keyboardType: keyboardType,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: Colors.white.withValues(alpha: 0.5)),
        filled: true,
        fillColor: Colors.white.withValues(alpha: 0.07),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Garantijų Seifas', style: TextStyle(fontWeight: FontWeight.w900)),
        backgroundColor: AppColors.background,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Stack(
        children: [
          // 1. Seifo turinys
          _loadingWarranties
              ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
              : ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    // Total protected
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [AppColors.surface, AppColors.elevated],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                        boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: 0.1), blurRadius: 20)],
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.2),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.shield, color: AppColors.primary, size: 32),
                          ),
                          const SizedBox(width: 16),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Apsaugota suma', style: TextStyle(color: AppColors.textSub, fontSize: 12)),
                              Text(
                                '${_totalProtected.toStringAsFixed(2)} €',
                                style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),
                    const Text('TAVO DAIKTAI', style: TextStyle(color: AppColors.textSub, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.5)),
                    const SizedBox(height: 16),
                    if (_warranties.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 24),
                        child: Center(child: Text('Nėra garantijų. Pridėk pirmą!', style: TextStyle(color: AppColors.textSub))),
                      )
                    else
                      ..._warranties.map((w) => _buildWarrantyCard(w)),
                    const SizedBox(height: 24),
                    // Add new button
                    GestureDetector(
                      onTap: _showAddForm,
                      child: Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: Colors.transparent,
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                        ),
                        child: Column(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.1),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.add, color: Colors.white),
                            ),
                            const SizedBox(height: 12),
                            const Text('Pridėti naują garantiją', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 100),
                  ],
                ),

          // 2. Biometrinis užraktas
          if (!_isUnlocked)
            Positioned.fill(
              child: GestureDetector(
                onTap: _isAuthenticating ? null : _authenticate,
                child: ClipRRect(
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 30, sigmaY: 30),
                    child: Container(
                      color: AppColors.background.withValues(alpha: 0.6),
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            AnimatedBuilder(
                              animation: _rotationController,
                              builder: (_, child) => Transform.rotate(
                                angle: _rotationController.value * 2 * 3.14159,
                                child: child,
                              ),
                              child: Container(
                                width: 100,
                                height: 100,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.5), width: 4),
                                  boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: 0.3), blurRadius: 40)],
                                ),
                                child: const Center(
                                  child: Text('P', style: TextStyle(fontSize: 40, fontWeight: FontWeight.w900, color: Colors.white)),
                                ),
                              ),
                            ),
                            const SizedBox(height: 32),
                            const Text('SEIFAS UŽRAKINTAS', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900, letterSpacing: 3)),
                            const SizedBox(height: 8),
                            Text(
                              _biometricsAvailable
                                  ? 'Bakstelėk, kad atrakintum su Face ID'
                                  : 'Simuliatorius nepalaiko Face ID. Testuokite ant tikro iPhone.',
                              style: const TextStyle(color: AppColors.textSub, fontSize: 14),
                              textAlign: TextAlign.center,
                            ),
                            if (!_biometricsAvailable && kDebugMode) ...[
                              const SizedBox(height: 24),
                              TextButton(
                                onPressed: () {
                                  setState(() => _isUnlocked = true);
                                  _loadWarranties();
                                },
                                child: const Text('Atidaryti (dev)', style: TextStyle(color: AppColors.primary)),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildWarrantyCard(dynamic item) {
    final name = item['product_name']?.toString() ?? 'Prekė';
    final store = item['store_name']?.toString() ?? '';
    final price = (item['purchase_price'] as num?)?.toDouble() ?? 0.0;
    final purchaseDate = item['purchase_date']?.toString().split('T').first ?? '';

    DateTime? expiresAt;
    if (item['warranty_expires_at'] != null) {
      try { expiresAt = DateTime.parse(item['warranty_expires_at'].toString()); } catch (_) {}
    }

    final now = DateTime.now();
    final daysLeft = expiresAt != null ? expiresAt.difference(now).inDays : null;
    final isExpiring = daysLeft != null && daysLeft <= 30;

    String timeLeft;
    if (daysLeft == null) {
      timeLeft = 'Nėra datos';
    } else if (daysLeft < 0) {
      timeLeft = 'Garantija pasibaigė';
    } else if (daysLeft <= 2) {
      timeLeft = 'Liko $daysLeft d.';
    } else if (daysLeft <= 30) {
      timeLeft = 'Liko $daysLeft dienų';
    } else {
      final months = (daysLeft / 30).round();
      timeLeft = 'Galioja dar $months mėn.';
    }

    final statusColor = isExpiring ? AppColors.error : AppColors.green;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isExpiring ? AppColors.error.withValues(alpha: 0.4) : Colors.white.withValues(alpha: 0.05)),
        boxShadow: isExpiring ? [BoxShadow(color: AppColors.error.withValues(alpha: 0.15), blurRadius: 20)] : [],
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.3), borderRadius: BorderRadius.circular(16)),
                  child: const Icon(Icons.inventory_2_outlined, color: Colors.white, size: 24),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16), maxLines: 1, overflow: TextOverflow.ellipsis),
                      const SizedBox(height: 4),
                      Text('$store • ${price.toStringAsFixed(2)} €', style: const TextStyle(color: AppColors.textSub, fontSize: 12)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.3),
              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(20)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('PIRKTA', style: TextStyle(color: AppColors.textSub, fontSize: 10, fontWeight: FontWeight.bold)),
                    Text(purchaseDate, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                  ],
                ),
                Container(width: 1, height: 24, color: Colors.white.withValues(alpha: 0.1)),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    const Text('STATUSAS', style: TextStyle(color: AppColors.textSub, fontSize: 10, fontWeight: FontWeight.bold)),
                    Text(timeLeft, style: TextStyle(color: statusColor, fontWeight: FontWeight.w900)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
