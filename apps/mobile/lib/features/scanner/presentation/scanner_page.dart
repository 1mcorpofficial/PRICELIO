import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/app_theme.dart';

class ScannerPage extends StatefulWidget {
  const ScannerPage({super.key});
  @override
  State<ScannerPage> createState() => _ScannerPageState();
}

class _ScannerPageState extends State<ScannerPage> {
  final _controller = MobileScannerController();
  bool _scanning = true;
  bool _loading = false;

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
    // Load prices
    List<dynamic> prices = [];
    try {
      final res = await ApiClient().dio.get('/products/${product['id']}/prices');
      prices = res.data ?? [];
    } catch (_) {}

    if (!mounted) return;
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => _ProductSheet(product: product, prices: prices, ean: ean),
    );
    _resume();
  }

  void _showNotFoundSheet(String ean) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(32),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.search_off, size: 64, color: AppColors.textSub),
          const SizedBox(height: 16),
          const Text('Produktas nerastas', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Text('EAN: $ean', style: const TextStyle(color: AppColors.textSub)),
          const SizedBox(height: 24),
          ElevatedButton(onPressed: () { Navigator.pop(context); _resume(); },
              child: const Text('Skanuoti iš naujo')),
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
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: const Text('Brūkšninio kodo skaitytuvas'),
        actions: [
          IconButton(
            icon: ValueListenableBuilder<MobileScannerState>(
              valueListenable: _controller,
              builder: (_, state, __) => Icon(
                state.torchState == TorchState.on
                    ? Icons.flashlight_on
                    : Icons.flashlight_off,
              ),
            ),
            onPressed: _controller.toggleTorch,
          ),
        ],
      ),
      body: Stack(
        children: [
          MobileScanner(controller: _controller, onDetect: _onDetect),
          // Scan overlay
          Center(
            child: Container(
              width: 260, height: 160,
              decoration: BoxDecoration(
                border: Border.all(color: AppColors.primary, width: 3),
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          // Hint text
          Positioned(
            bottom: 80, left: 0, right: 0,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  _loading ? 'Ieškoma...' : 'Nukreipkite kamerą į brūkšninį kodą',
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                ),
              ),
            ),
          ),
          if (_loading) const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        ],
      ),
    );
  }

  @override
  void dispose() { _controller.dispose(); super.dispose(); }
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
      initialChildSize: 0.6,
      maxChildSize: 0.92,
      builder: (_, scroll) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Center(child: Container(width: 40, height: 4,
              decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2)))),
          const SizedBox(height: 16),
          Text(product['name'] ?? 'Produktas',
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
          if (product['brand'] != null) ...[
            const SizedBox(height: 4),
            Text(product['brand'], style: const TextStyle(color: AppColors.textSub)),
          ],
          Text('EAN: $ean', style: const TextStyle(color: AppColors.textSub, fontSize: 12)),
          const SizedBox(height: 20),
          if (prices.isEmpty)
            const Text('Kainos šiuo metu nėra', style: TextStyle(color: AppColors.textSub))
          else ...[
            const Text('Kainos parduotuvėse',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
            const SizedBox(height: 12),
            Expanded(
              child: ListView.builder(
                controller: scroll,
                itemCount: prices.length,
                itemBuilder: (_, i) {
                  final p = prices[i];
                  final isMin = i == 0;
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: isMin ? AppColors.primary.withOpacity(0.08) : AppColors.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                          color: isMin ? AppColors.primary : AppColors.border,
                          width: isMin ? 2 : 1),
                    ),
                    child: Row(children: [
                      if (isMin) const Icon(Icons.star, color: AppColors.primary, size: 18),
                      if (isMin) const SizedBox(width: 6),
                      Expanded(child: Text(p['store_chain'] ?? p['chain'] ?? '',
                          style: TextStyle(
                              fontWeight: isMin ? FontWeight.w700 : FontWeight.w500))),
                      Text('€${p['price_value'] ?? p['price'] ?? '?'}',
                          style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              color: isMin ? AppColors.primary : AppColors.textMain)),
                    ]),
                  );
                },
              ),
            ),
          ],
        ]),
      ),
    );
  }
}
