import 'dart:math';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../../../core/api/api_client.dart';
import '../../../core/theme/app_theme.dart';

// ─── Chain colors ───────────────────────────────────────────────────────────
Color _chainColor(String chain) {
  switch (chain.toUpperCase()) {
    case 'IKI':         return AppColors.green;
    case 'MAXIMA':      return AppColors.error;
    case 'RIMI':        return const Color(0xFF3B82F6);
    case 'NORFA':       return const Color(0xFFFF9500);
    case 'LIDL':        return const Color(0xFFFFD700);
    case 'AIBĖ':        return AppColors.secondary;
    case 'ČIA MARKET':  return const Color(0xFFFF6B35);
    case 'EXPRESS MARKET': return AppColors.primary;
    case 'ŠILAS':       return const Color(0xFF7CFC00);
    default:            return const Color(0xFF9B92B3);
  }
}

// ─── Line chart painter ──────────────────────────────────────────────────────
class _PriceLinePainter extends CustomPainter {
  final List<MapEntry<String, double>> points; // chain → price, sorted by price asc

  const _PriceLinePainter(this.points);

  @override
  void paint(Canvas canvas, Size size) {
    if (points.isEmpty) return;

    const double padL = 44;
    const double padR = 16;
    const double padT = 24;
    const double padB = 36;

    final double chartW = size.width - padL - padR;
    final double chartH = size.height - padT - padB;

    final prices = points.map((e) => e.value).toList();
    final minP = prices.reduce(min);
    final maxP = prices.reduce(max);
    final range = max(0.01, maxP - minP);

    double xPos(int i) => padL + (points.length > 1 ? i * chartW / (points.length - 1) : chartW / 2);
    double yPos(double price) => padT + chartH - ((price - minP) / range) * chartH;

    final pts = List.generate(points.length, (i) => Offset(xPos(i), yPos(points[i].value)));

    // Grid lines
    final gridPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.06)
      ..strokeWidth = 1;
    for (double f in [0.0, 0.25, 0.5, 0.75, 1.0]) {
      final y = padT + chartH * (1 - f);
      canvas.drawLine(Offset(padL, y), Offset(size.width - padR, y), gridPaint);
      final val = minP + range * f;
      final tp = TextPainter(
        text: TextSpan(text: '€${val.toStringAsFixed(2)}', style: const TextStyle(color: Color(0x66FFFFFF), fontSize: 8)),
        textDirection: TextDirection.ltr,
      )..layout();
      tp.paint(canvas, Offset(0, y - 5));
    }

    // Area fill
    if (pts.length > 1) {
      final areaPath = Path()..moveTo(pts.first.dx, pts.first.dy);
      for (int i = 1; i < pts.length; i++) areaPath.lineTo(pts[i].dx, pts[i].dy);
      areaPath
        ..lineTo(pts.last.dx, padT + chartH)
        ..lineTo(pts.first.dx, padT + chartH)
        ..close();
      canvas.drawPath(
        areaPath,
        Paint()
          ..shader = LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [AppColors.primary.withValues(alpha: 0.18), AppColors.primary.withValues(alpha: 0)],
          ).createShader(Rect.fromLTWH(0, padT, size.width, chartH)),
      );

      // Line
      final linePath = Path()..moveTo(pts.first.dx, pts.first.dy);
      for (int i = 1; i < pts.length; i++) linePath.lineTo(pts[i].dx, pts[i].dy);
      canvas.drawPath(
        linePath,
        Paint()
          ..color = AppColors.primary.withValues(alpha: 0.6)
          ..strokeWidth = 2.5
          ..style = PaintingStyle.stroke
          ..strokeJoin = StrokeJoin.round
          ..strokeCap = StrokeCap.round,
      );
    }

    // X axis
    canvas.drawLine(
      Offset(padL, padT + chartH),
      Offset(size.width - padR, padT + chartH),
      Paint()..color = Colors.white.withValues(alpha: 0.1)..strokeWidth = 1,
    );

    // Points + labels
    for (int i = 0; i < pts.length; i++) {
      final p = pts[i];
      final entry = points[i];
      final isBest = entry.value == minP;
      final color = _chainColor(entry.key);

      // Price label above point
      final priceText = TextPainter(
        text: TextSpan(
          text: '€${entry.value.toStringAsFixed(2)}',
          style: TextStyle(color: isBest ? AppColors.green : color, fontSize: 9, fontWeight: FontWeight.w700),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      priceText.paint(canvas, Offset(p.dx - priceText.width / 2, p.dy - 18));

      // Glow ring for best
      if (isBest) {
        canvas.drawCircle(p, 10, Paint()..color = AppColors.green.withValues(alpha: 0.3)..style = PaintingStyle.stroke..strokeWidth = 1.5);
      }

      // Point
      canvas.drawCircle(p, isBest ? 7 : 5, Paint()..color = color);
      canvas.drawCircle(p, isBest ? 7 : 5, Paint()..color = const Color(0xFF080312).withValues(alpha: 0.8)..style = PaintingStyle.stroke..strokeWidth = 2);

      // Chain label below X axis
      final label = entry.key.length > 7 ? '${entry.key.substring(0, 6)}…' : entry.key;
      final labelText = TextPainter(
        text: TextSpan(text: label, style: const TextStyle(color: Color(0x99FFFFFF), fontSize: 8, fontWeight: FontWeight.w600)),
        textDirection: TextDirection.ltr,
      )..layout();
      labelText.paint(canvas, Offset(p.dx - labelText.width / 2, padT + chartH + 6));
    }
  }

  @override
  bool shouldRepaint(_PriceLinePainter old) => old.points != points;
}

// ─── Main page ───────────────────────────────────────────────────────────────
class SearchPage extends StatefulWidget {
  const SearchPage({super.key});

  @override
  State<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends State<SearchPage> {
  final _controller = TextEditingController();

  List<dynamic> _results = [];
  List<MapEntry<String, double>> _chartPoints = []; // chain → price
  List<dynamic> _offersList = [];
  Map<String, dynamic>? _selectedProduct;

  bool _loadingSearch = false;
  bool _loadingPrices = false;
  bool _creatingAlert = false;
  bool _isSearching = false;

  String? _error;
  String? _alertStatus;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String _extractError(Object error, {String fallback = 'Įvyko klaida'}) {
    if (error is DioException) {
      final dynamic data = error.response?.data;
      if (data is Map<String, dynamic>) {
        final dynamic err = data['error'];
        if (err is Map<String, dynamic> && err['message'] is String) return err['message'].toString();
        if (err is String && err.isNotEmpty) return err;
      }
      if ((error.message ?? '').isNotEmpty) return error.message!;
    }
    return fallback;
  }

  Future<void> _search(String q) async {
    final trimmed = q.trim();
    if (trimmed.length < 2) {
      setState(() { _isSearching = false; _results = []; _error = 'Įvesk bent 2 simbolius paieškai'; });
      return;
    }
    setState(() { _loadingSearch = true; _isSearching = true; _error = null; _alertStatus = null; });
    try {
      final res = await ApiClient().dio.get('/search', queryParameters: {'q': trimmed, 'limit': 30});
      setState(() { _results = res.data is List ? List<dynamic>.from(res.data as List) : []; });
    } catch (error) {
      setState(() { _results = []; _error = _extractError(error, fallback: 'Paieška nepavyko'); });
    } finally {
      if (mounted) setState(() => _loadingSearch = false);
    }
  }

  Future<void> _openProduct(Map<String, dynamic> product) async {
    final name = product['name']?.toString() ?? '';
    if (name.isEmpty) { setState(() => _error = 'Neteisingas produktas'); return; }

    setState(() { _loadingPrices = true; _error = null; _alertStatus = null; _isSearching = false; });

    try {
      // Use /products/compare to get prices by chain
      final res = await ApiClient().dio.get('/products/compare', queryParameters: {'q': name});
      final List<dynamic> data = res.data is List ? List<dynamic>.from(res.data as List) : [];

      if (data.isEmpty) {
        setState(() { _selectedProduct = product; _chartPoints = []; _offersList = []; });
        return;
      }

      final first = data.first as Map<String, dynamic>;
      final storePrices = (first['store_prices'] as List?)?.cast<Map<String, dynamic>>() ?? [];

      // Deduplicate by chain — take lowest price per chain
      final chainMap = <String, double>{};
      for (final sp in storePrices) {
        final chain = sp['chain']?.toString() ?? '';
        final price = (sp['price'] as num?)?.toDouble();
        if (chain.isEmpty || price == null) continue;
        if (!chainMap.containsKey(chain) || price < chainMap[chain]!) chainMap[chain] = price;
      }

      final sorted = chainMap.entries.toList()..sort((a, b) => a.value.compareTo(b.value));

      setState(() {
        _selectedProduct = Map<String, dynamic>.from(first);
        _chartPoints = sorted;
        _offersList = storePrices;
      });
    } catch (error) {
      setState(() { _error = _extractError(error, fallback: 'Nepavyko gauti kainų'); });
    } finally {
      if (mounted) setState(() => _loadingPrices = false);
    }
  }

  Future<void> _createAlert() async {
    if (_selectedProduct == null || _chartPoints.isEmpty) return;
    final best = _chartPoints.first.value;
    final target = double.parse((best * 0.95).toStringAsFixed(2));
    final productId = (_selectedProduct!['id'] ?? _selectedProduct!['product_id'])?.toString();
    if (productId == null) { setState(() => _alertStatus = 'Nėra produkto ID'); return; }

    setState(() { _creatingAlert = true; _alertStatus = null; });
    try {
      await ApiClient().dio.post('/alerts/price', data: {'productId': productId, 'targetPrice': target});
      setState(() { _alertStatus = 'Pranešimas sukurtas: kai kaina kris žemiau ${target.toStringAsFixed(2)} €'; });
    } catch (error) {
      setState(() { _alertStatus = _extractError(error, fallback: 'Nepavyko sukurti pranešimo'); });
    } finally {
      if (mounted) setState(() => _creatingAlert = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Kainų Palyginimas', style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.2)),
        backgroundColor: AppColors.background,
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            child: TextField(
              controller: _controller,
              textInputAction: TextInputAction.search,
              onSubmitted: _search,
              onChanged: (val) {
                if (val.isEmpty) setState(() { _isSearching = false; _results = []; _error = null; });
              },
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              decoration: InputDecoration(
                hintText: 'Ieškoti produkto (pvz. sviestas)...',
                hintStyle: TextStyle(color: AppColors.textSub.withValues(alpha: 0.5)),
                prefixIcon: const Icon(Icons.search, color: AppColors.primary),
                suffixIcon: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_controller.text.isNotEmpty)
                      IconButton(
                        icon: const Icon(Icons.clear, color: AppColors.textSub),
                        onPressed: () {
                          _controller.clear();
                          setState(() { _isSearching = false; _results = []; _error = null; });
                        },
                      ),
                    IconButton(
                      icon: const Icon(Icons.arrow_forward, color: AppColors.primary),
                      onPressed: _loadingSearch ? null : () => _search(_controller.text),
                    ),
                  ],
                ),
                filled: true,
                fillColor: AppColors.surface,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide.none),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: const BorderSide(color: AppColors.primary, width: 2)),
              ),
            ),
          ),

          if (_loadingSearch || _loadingPrices)
            const LinearProgressIndicator(color: AppColors.primary, backgroundColor: AppColors.surface),

          if (_error != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
              child: Text(_error!, style: const TextStyle(color: AppColors.error, fontWeight: FontWeight.bold)),
            ),

          Expanded(child: _isSearching ? _buildSearchResults() : _buildProductPanel()),
        ],
      ),
    );
  }

  Widget _buildSearchResults() {
    if (!_loadingSearch && _results.isEmpty) {
      return const Center(child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.search_off, size: 64, color: AppColors.textSub),
          SizedBox(height: 16),
          Text('Produktų nerasta', style: TextStyle(color: AppColors.textSub, fontSize: 16)),
        ],
      ));
    }
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      itemCount: _results.length,
      itemBuilder: (ctx, i) {
        final p = _results[i] is Map<String, dynamic> ? Map<String, dynamic>.from(_results[i] as Map) : <String, dynamic>{};
        final bestPrice = (p['best_price'] as num?)?.toDouble();
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.white.withValues(alpha: 0.05))),
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            leading: Container(
              width: 40, height: 40,
              decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
              child: const Icon(Icons.shopping_bag_outlined, color: AppColors.primary),
            ),
            title: Text(p['name']?.toString() ?? 'Prekė', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
            subtitle: Text(
              bestPrice != null ? '${bestPrice.toStringAsFixed(2)} € · ${p['store_chain']?.toString() ?? ''}' : (p['store_chain']?.toString() ?? ''),
              style: const TextStyle(color: AppColors.textSub, fontSize: 12),
            ),
            trailing: const Icon(Icons.chevron_right, color: AppColors.textSub),
            onTap: () => _openProduct(p),
          ),
        );
      },
    );
  }

  Widget _buildProductPanel() {
    if (_selectedProduct == null) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: 24),
          child: Text(
            'Įvesk prekės pavadinimą ir pažiūrėk kainų palyginimą linijinėje diagramoje.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.textSub, fontSize: 15, height: 1.5),
          ),
        ),
      );
    }

    final best = _chartPoints.isNotEmpty ? _chartPoints.first.value : null;
    final avg = _chartPoints.isEmpty ? null : _chartPoints.map((e) => e.value).reduce((a, b) => a + b) / _chartPoints.length;

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 100),
      children: [
        // Header card
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [AppColors.surface, AppColors.elevated]),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(_selectedProduct!['name']?.toString() ?? 'Prekė', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.white)),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(child: _StatChip(label: 'Pigiausia', value: best != null ? '${best.toStringAsFixed(2)} €' : '-', color: AppColors.green)),
                const SizedBox(width: 8),
                Expanded(child: _StatChip(label: 'Vidurkis', value: avg != null ? '${avg.toStringAsFixed(2)} €' : '-', color: AppColors.primary)),
                const SizedBox(width: 8),
                Expanded(child: _StatChip(label: 'Tinklų', value: '${_chartPoints.length}', color: AppColors.secondary)),
              ]),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: (_creatingAlert || _chartPoints.isEmpty) ? null : _createAlert,
                  icon: _creatingAlert
                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.notifications_active_outlined),
                  label: const Text('Pranešti, kai kris 5%'),
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary, foregroundColor: Colors.black),
                ),
              ),
              if (_alertStatus != null) ...[
                const SizedBox(height: 8),
                Text(_alertStatus!, style: const TextStyle(color: AppColors.textSub, fontSize: 12)),
              ],
            ],
          ),
        ),

        const SizedBox(height: 16),

        // Line chart card
        if (_chartPoints.isNotEmpty) ...[
          Container(
            padding: const EdgeInsets.fromLTRB(12, 16, 12, 8),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: Colors.white.withValues(alpha: 0.07)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Padding(
                  padding: EdgeInsets.only(left: 4, bottom: 8),
                  child: Text('KAINOS TINKLUOSE', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: AppColors.textSub, letterSpacing: 1.2)),
                ),
                SizedBox(
                  height: 180,
                  child: CustomPaint(
                    painter: _PriceLinePainter(_chartPoints),
                    size: const Size(double.infinity, 180),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],

        // Chain list
        const Text('PARDUOTUVIŲ KAINOS', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: AppColors.textSub, letterSpacing: 1.2)),
        const SizedBox(height: 12),

        if (_chartPoints.isEmpty)
          const Padding(
            padding: EdgeInsets.only(top: 20),
            child: Center(child: Text('Šiai prekei aktyvių kainų nėra.', style: TextStyle(color: AppColors.textSub))),
          )
        else
          ..._chartPoints.asMap().entries.map((entry) {
            final i = entry.key;
            final chain = entry.value.key;
            final price = entry.value.value;
            final isBest = i == 0;
            final color = _chainColor(chain);
            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: isBest ? AppColors.green.withValues(alpha: 0.07) : AppColors.surface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: isBest ? AppColors.green.withValues(alpha: 0.3) : Colors.white.withValues(alpha: 0.05)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 28, height: 28,
                    decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                    child: Center(child: Text('${i + 1}', style: const TextStyle(color: Color(0xFF080312), fontWeight: FontWeight.w900, fontSize: 12))),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: Text(chain, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold))),
                  Text('${price.toStringAsFixed(2)} €', style: TextStyle(color: isBest ? AppColors.green : Colors.white, fontWeight: FontWeight.w900, fontSize: 15)),
                  if (isBest) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: AppColors.green.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(8)),
                      child: const Text('PIGIAUSIAS', style: TextStyle(color: AppColors.green, fontSize: 9, fontWeight: FontWeight.w900, letterSpacing: 0.5)),
                    ),
                  ],
                ],
              ),
            );
          }),
      ],
    );
  }
}

class _StatChip extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _StatChip({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12), border: Border.all(color: color.withValues(alpha: 0.35))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: AppColors.textSub, fontSize: 11)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900)),
        ],
      ),
    );
  }
}
