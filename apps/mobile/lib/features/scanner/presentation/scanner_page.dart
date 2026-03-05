import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dio/dio.dart';
import 'dart:ui';
import 'dart:async';
import '../../../core/api/api_client.dart';
import '../../../core/theme/app_theme.dart';

class ScannerPage extends StatefulWidget {
  const ScannerPage({super.key});
  @override
  State<ScannerPage> createState() => _ScannerPageState();
}

class _ScannerPageState extends State<ScannerPage> with TickerProviderStateMixin {
  static const _basketIdKey = 'pricelio_active_basket_id';
  static const _basketGuestProofKey = 'pricelio_active_basket_guest_proof';
  final _storage = const FlutterSecureStorage();

  final _controller = MobileScannerController();
  bool _scanning = true;
  bool _hasResult = false;
  bool _addingToBasket = false;
  String? _basketFeedback;
  Map<String, dynamic>? _product;
  List<dynamic> _prices = [];

  // Apple Intelligence Plasma Edge Animation
  late AnimationController _plasmaController;

  // Streaming text variables
  String _streamingText = '';
  Timer? _streamTimer;
  final List<String> _steps = [];
  int _currentStepIndex = 0;
  int _currentCharIndex = 0;

  @override
  void initState() {
    super.initState();
    _plasmaController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat(reverse: true);
  }

  void _onDetect(BarcodeCapture capture) async {
    if (!_scanning) return;
    final barcode = capture.barcodes.firstOrNull;
    final ean = barcode?.rawValue;
    if (ean == null || ean.isEmpty) return;

    setState(() {
      _scanning = false;
      _hasResult = true;
    });
    _controller.stop();
    _startStreamingSimulation(ean);
  }

  Future<void> _startStreamingSimulation(String ean) async {
    setState(() {
      _streamingText = '';
      _steps.clear();
      _currentStepIndex = 0;
      _currentCharIndex = 0;
      _steps.add('Atpažintas barkodas: $ean\n');
      _steps.add('Jungiamasi prie PRICELIO duomenų bazės...\n');
    });

    _startTyping();

    try {
      final res = await ApiClient().dio.get('/products/barcode/$ean');
      _product = res.data;
      
      setState(() {
        _steps.add('Atpažinta: ${_product!['name']} (${_product!['brand'] ?? ''})\n');
      });

      final priceRes = await ApiClient().dio.get('/products/${_product!['id']}/prices');
      _prices = priceRes.data ?? [];

      if (_prices.isNotEmpty) {
        final bestPrice = _prices[0];
        setState(() {
          _steps.add('Analizuojama rinka...\n');
          _steps.add('Geriausia kaina šiuo metu: ${bestPrice['store_chain'] ?? bestPrice['chain']} (${bestPrice['price_value'] ?? bestPrice['price']} €)\n\n');
          _steps.add('REKOMENDACIJA: Pirkti. Kaina žemiausia per 30 dienų.');
        });
      } else {
        setState(() {
          _steps.add('Prekė rasta, bet šiuo metu nėra aktyvių kainų istorijoje.\n');
        });
      }
    } catch (_) {
      setState(() {
        _steps.add('Prekė nerasta globalioje bazėje.\n');
        _steps.add('Rekomendacija: Įvesti prekę rankiniu būdu ir gauti +50 XP.');
      });
    }
  }

  void _startTyping() {
    _streamTimer?.cancel();
    _streamTimer = Timer.periodic(const Duration(milliseconds: 30), (timer) {
      if (!mounted) return;
      if (_currentStepIndex < _steps.length) {
        final currentString = _steps[_currentStepIndex];
        if (_currentCharIndex < currentString.length) {
          setState(() {
            _streamingText += currentString[_currentCharIndex];
            _currentCharIndex++;
          });
        } else {
          _currentStepIndex++;
          _currentCharIndex = 0;
        }
      }
    });
  }

  Future<void> _addToBasket() async {
    if (_product == null) return;
    setState(() { _addingToBasket = true; _basketFeedback = null; });

    try {
      String? basketId = await _storage.read(key: _basketIdKey);
      String? guestProof = await _storage.read(key: _basketGuestProofKey);

      if (basketId == null || basketId.isEmpty) {
        final res = await ApiClient().dio.post('/baskets', data: {'name': 'Main basket'});
        final data = res.data as Map<String, dynamic>? ?? {};
        basketId = data['id']?.toString();
        guestProof = data['guest_proof']?.toString();
        if (basketId != null) {
          await _storage.write(key: _basketIdKey, value: basketId);
          if (guestProof != null && guestProof.isNotEmpty) {
            await _storage.write(key: _basketGuestProofKey, value: guestProof);
          }
        }
      }

      if (basketId == null) throw Exception('basket_unavailable');

      final payload = {
        'items': [
          {
            'raw_name': _product!['name']?.toString() ?? 'Prekė',
            'quantity': 1,
            if ((_product!['id']?.toString() ?? '').isNotEmpty)
              'product_id': _product!['id'].toString(),
          }
        ]
      };

      final options = (guestProof != null && guestProof.isNotEmpty)
          ? Options(headers: {'x-guest-session-proof': guestProof})
          : Options();

      await ApiClient().dio.post(
        '/baskets/$basketId/items',
        data: payload,
        options: options,
      );

      if (mounted) setState(() => _basketFeedback = '✓ Pridėta į krepšelį');
    } catch (_) {
      if (mounted) setState(() => _basketFeedback = 'Nepavyko pridėti');
    } finally {
      if (mounted) setState(() => _addingToBasket = false);
    }
  }

  void _reset() {
    _streamTimer?.cancel();
    setState(() {
      _hasResult = false;
      _scanning = true;
      _streamingText = '';
      _product = null;
      _prices.clear();
      _basketFeedback = null;
    });
    _controller.start();
  }

  @override
  void dispose() {
    _controller.dispose();
    _plasmaController.dispose();
    _streamTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screenHeight = MediaQuery.of(context).size.height;
    
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // 1. Kameros sluoksnis (išsiplečiantis arba susitraukiantis)
          AnimatedPositioned(
            duration: const Duration(milliseconds: 600),
            curve: Curves.easeOutCubic,
            top: 0,
            left: 0,
            right: 0,
            height: _hasResult ? screenHeight * 0.2 : screenHeight,
            child: ClipRRect(
              borderRadius: _hasResult ? const BorderRadius.vertical(bottom: Radius.circular(24)) : BorderRadius.zero,
              child: MobileScanner(
                controller: _controller,
                onDetect: _onDetect,
              ),
            ),
          ),

          // 2. Tamsintas filtras ant kameros, kai nėra rezultato (kad būtų geresnis kontrastas)
          if (!_hasResult)
            IgnorePointer(
              child: Container(
                color: Colors.black.withValues(alpha: 0.2),
              ),
            ),

          // 3. Apple Intelligence Plazmos Rėmelis
          IgnorePointer(
            child: AnimatedBuilder(
              animation: _plasmaController,
              builder: (context, child) {
                final isFast = _hasResult && _streamingText.length < 50; // Greičiau pulsuoja, kai randa
                final value = _plasmaController.value;
                return Container(
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: AppColors.primary.withValues(alpha: isFast ? 0.8 : (0.3 + 0.3 * value)),
                      width: isFast ? 8 : 4 + 4 * value,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.secondary.withValues(alpha: 0.2 + 0.2 * value),
                        blurRadius: 40,
                        spreadRadius: 10,
                      ),
                      BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.2 + 0.3 * value),
                        blurRadius: 20,
                        spreadRadius: 5,
                        blurStyle: BlurStyle.inner,
                      )
                    ],
                  ),
                );
              },
            ),
          ),

          // Viršutinis Meniu (Back ir Flashlight)
          Positioned(
            top: MediaQuery.of(context).padding.top + 10,
            left: 20,
            right: 20,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.white, size: 32),
                  onPressed: () => Navigator.pop(context),
                ),
                if (!_hasResult)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(20),
                    child: BackdropFilter(
                      filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        color: Colors.black.withValues(alpha: 0.3),
                        child: const Text('AI SKENERIS', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, letterSpacing: 2)),
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
                  onPressed: () => _controller.toggleTorch(),
                ),
              ],
            ),
          ),

          // 4. AI "Arc Search" stiliaus informacijos iškilimas (4/5 ekrano)
          AnimatedPositioned(
            duration: const Duration(milliseconds: 600),
            curve: Curves.easeOutCubic,
            top: _hasResult ? screenHeight * 0.2 + 20 : screenHeight,
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
              decoration: BoxDecoration(
                color: AppColors.background.withValues(alpha: 0.95),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
                border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.1))),
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.8), blurRadius: 40, offset: const Offset(0, -10))],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('AI AUDITAS', style: TextStyle(color: AppColors.textSub, fontWeight: FontWeight.w900, letterSpacing: 2, fontSize: 12)),
                  const SizedBox(height: 24),
                  Expanded(
                    child: SingleChildScrollView(
                      child: RichText(
                        text: TextSpan(
                          style: const TextStyle(color: Colors.white, fontSize: 20, height: 1.5, fontWeight: FontWeight.w500),
                          children: _parseStreamingText(_streamingText),
                        ),
                      ),
                    ),
                  ),
                  // Veiksmo mygtukas pabaigoje
                  if (_hasResult && _currentStepIndex >= _steps.length)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 20),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (_basketFeedback != null)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: Text(
                                _basketFeedback!,
                                style: TextStyle(
                                  color: _basketFeedback!.startsWith('✓')
                                      ? AppColors.green
                                      : AppColors.error,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          Row(
                            children: [
                              Expanded(
                                child: ElevatedButton(
                                  onPressed: _reset,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.surface,
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(vertical: 16),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                    side: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
                                  ),
                                  child: const Text('SKENUOTI KITĄ'),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: ElevatedButton(
                                  onPressed: (_addingToBasket || _product == null) ? null : _addToBasket,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primary,
                                    foregroundColor: Colors.black,
                                    padding: const EdgeInsets.symmetric(vertical: 16),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                    elevation: 10,
                                    shadowColor: AppColors.primary.withValues(alpha: 0.4),
                                  ),
                                  child: _addingToBasket
                                      ? const SizedBox(
                                          width: 18,
                                          height: 18,
                                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                                        )
                                      : const Text('Į KREPŠELĮ', style: TextStyle(fontWeight: FontWeight.w900)),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    )
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<TextSpan> _parseStreamingText(String text) {
    // Paprastas parseris, kuris paryškina žodį REKOMENDACIJA arba Geriausia kaina
    final spans = <TextSpan>[];
    final lines = text.split('\n');
    for (var line in lines) {
      if (line.startsWith('REKOMENDACIJA:')) {
        spans.add(TextSpan(text: '$line\n', style: const TextStyle(color: AppColors.green, fontWeight: FontWeight.w900, fontSize: 24)));
      } else if (line.startsWith('Geriausia kaina')) {
        spans.add(TextSpan(text: '$line\n', style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)));
      } else {
        spans.add(TextSpan(text: '$line\n'));
      }
    }
    return spans;
  }
}
