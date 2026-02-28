import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'dart:ui';
import '../../../core/api/api_client.dart';
import '../../../core/theme/app_theme.dart';

class ScannerPage extends StatefulWidget {
  const ScannerPage({super.key});
  @override
  State<ScannerPage> createState() => _ScannerPageState();
}

class _ScannerPageState extends State<ScannerPage> with SingleTickerProviderStateMixin {
  final _controller = MobileScannerController();
  bool _scanning = true;
  bool _loading = false;
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    _pulseAnimation = Tween<double>(begin: 0.8, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  void _onDetect(BarcodeCapture capture) async {
    if (!_scanning || _loading) return;
    final barcode = capture.barcodes.firstOrNull;
    final ean = barcode?.rawValue;
    if (ean == null || ean.isEmpty) return;

    setState(() { _scanning = false; _loading = true; });
    _controller.stop();

    try {
      final res = await ApiClient().dio.get('/products/barcode/$ean');
      if (!mounted) return;
      await _showResultSheet(res.data, ean);
    } catch (_) {
      if (!mounted) return;
      _showNotFoundSheet(ean);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _showResultSheet(Map<String, dynamic> product, String ean) async {
    List<dynamic> prices = [];
    try {
      final res = await ApiClient().dio.get('/products/${product['id']}/prices');
      prices = res.data ?? [];
    } catch (_) {}

    if (!mounted) return;
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ProductSheet(product: product, prices: prices, ean: ean),
    );
    _resume();
  }

  void _showNotFoundSheet(String ean) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(32),
          border: Border.all(color: AppColors.error.withOpacity(0.5)),
          boxShadow: [BoxShadow(color: AppColors.error.withOpacity(0.2), blurRadius: 40)],
        ),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.search_off, size: 64, color: AppColors.error),
          const SizedBox(height: 16),
          const Text('Neatpažinta prekė', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          Text('Barkodas: $ean', style: const TextStyle(color: AppColors.textSub)),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () { Navigator.pop(context); _resume(); },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error, foregroundColor: Colors.white),
            child: const Text('Skenuoti iš naujo'),
          ),
        ]),
      ),
    );
  }

  void _resume() {
    setState(() { _scanning = true; });
    _controller.start();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          MobileScanner(controller: _controller, onDetect: _onDetect),
          
          // Tamsintas fonas aplink skenavimo rėmelį
          ColorFiltered(
            colorFilter: ColorFilter.mode(Colors.black.withOpacity(0.6), BlendMode.srcOut),
            child: Stack(
              children: [
                Container(
                  decoration: const BoxDecoration(
                    color: Colors.black,
                    backgroundBlendMode: BlendMode.dstOut,
                  ),
                ),
                Center(
                  child: Container(
                    width: 280,
                    height: 180,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Neoninis skenavimo rėmelis
          Center(
            child: AnimatedBuilder(
              animation: _pulseAnimation,
              builder: (context, child) {
                return Container(
                  width: 280,
                  height: 180,
                  decoration: BoxDecoration(
                    border: Border.all(color: AppColors.primary.withOpacity(_pulseAnimation.value), width: 3),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(color: AppColors.primary.withOpacity(_pulseAnimation.value * 0.4), blurRadius: 30, spreadRadius: 5),
                    ],
                  ),
                  child: _loading 
                    ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                    : Stack(
                        alignment: Alignment.center,
                        children: [
                          // Skystas lazeris
                          Positioned(
                            top: 0,
                            left: 0,
                            right: 0,
                            child: Container(
                              height: 4,
                              decoration: BoxDecoration(
                                color: AppColors.secondary,
                                boxShadow: [BoxShadow(color: AppColors.secondary, blurRadius: 10, spreadRadius: 2)],
                              ),
                            ),
                          ) // Reikėtų Tween animacijos pilnam lazerio judėjimui, bet kol kas pakanka ir rėmelio glow
                        ],
                      ),
                );
              },
            ),
          ),

          // Viršutinis Meniu (Back ir Flashlight)
          Positioned(
            top: 50,
            left: 20,
            right: 20,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.white, size: 32),
                  onPressed: () => Navigator.pop(context),
                ),
                ClipRRect(
                  borderRadius: BorderRadius.circular(20),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      color: Colors.black.withOpacity(0.3),
                      child: const Text('MAGIŠKA KAMERA', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, letterSpacing: 2)),
                    ),
                  ),
                ),
                IconButton(
                  icon: ValueListenableBuilder<MobileScannerState>(
                    valueListenable: _controller,
                    builder: (_, state, __) => Icon(
                      state.torchState == TorchState.on ? Icons.flashlight_on : Icons.flashlight_off,
                      color: state.torchState == TorchState.on ? AppColors.primary : Colors.white,
                      size: 28,
                    ),
                  ),
                  onPressed: _controller.toggleTorch,
                ),
              ],
            ),
          ),

          // Informacinis tekstas apačioje
          Positioned(
            bottom: 80,
            left: 20,
            right: 20,
            child: Center(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(24),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    decoration: BoxDecoration(
                      color: AppColors.surface.withOpacity(0.8),
                      border: Border.all(color: Colors.white.withOpacity(0.1)),
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: Text(
                      _loading ? 'Analizuojamas barkodas...' : 'Nukreipk kamerą į barkodą',
                      style: TextStyle(color: _loading ? AppColors.primary : Colors.white, fontWeight: FontWeight.bold),
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

  @override
  void dispose() { 
    _controller.dispose(); 
    _pulseController.dispose();
    super.dispose(); 
  }
}

class _ProductSheet extends StatelessWidget {
  final Map<String, dynamic> product;
  final List<dynamic> prices;
  final String ean;
  const _ProductSheet({required this.product, required this.prices, required this.ean});

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.65,
      maxChildSize: 0.95,
      builder: (_, scroll) => Container(
        decoration: BoxDecoration(
          color: AppColors.background,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
          border: Border.all(color: Colors.white.withOpacity(0.1)),
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 12, 24, 20),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Center(child: Container(width: 50, height: 5, decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(5)))),
            const SizedBox(height: 24),
            Text(product['name'] ?? 'Prekė nerasta', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Colors.white)),
            if (product['brand'] != null) ...[
              const SizedBox(height: 4),
              Text(product['brand'], style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
            ],
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(color: Colors.white.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
              child: Text('EAN: $ean', style: const TextStyle(color: AppColors.textSub, fontSize: 10)),
            ),
            const SizedBox(height: 24),
            
            if (prices.isEmpty)
              const Center(child: Text('Kainų istorijos nėra', style: TextStyle(color: AppColors.textSub)))
            else ...[
              const Text('KAINOS RINKOJE', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 2, color: AppColors.textSub)),
              const SizedBox(height: 12),
              Expanded(
                child: ListView.builder(
                  controller: scroll,
                  itemCount: prices.length,
                  itemBuilder: (_, i) {
                    final p = prices[i];
                    final isMin = i == 0;
                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isMin ? AppColors.primary.withOpacity(0.1) : AppColors.surface,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: isMin ? AppColors.primary.withOpacity(0.5) : Colors.white.withOpacity(0.05)),
                        boxShadow: isMin ? [BoxShadow(color: AppColors.primary.withOpacity(0.2), blurRadius: 20)] : [],
                      ),
                      child: Row(children: [
                        if (isMin) const Icon(Icons.star, color: AppColors.primary, size: 24),
                        if (isMin) const SizedBox(width: 12),
                        Expanded(child: Text(p['store_chain'] ?? p['chain'] ?? '', style: TextStyle(fontWeight: isMin ? FontWeight.w900 : FontWeight.w600, fontSize: 16))),
                        Text('€${p['price_value'] ?? p['price'] ?? '?'}', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: isMin ? AppColors.green : Colors.white)),
                      ]),
                    );
                  },
                ),
              ),
            ],
          ]),
        ),
      ),
    );
  }
}
