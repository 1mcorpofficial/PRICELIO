import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../../../core/api/api_client.dart';
import '../../../core/theme/app_theme.dart';

class SearchPage extends StatefulWidget {
  const SearchPage({super.key});

  @override
  State<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends State<SearchPage> {
  final _controller = TextEditingController();

  List<dynamic> _results = [];
  List<dynamic> _offers = [];
  Map<String, dynamic>? _selectedProduct;

  bool _loadingSearch = false;
  bool _loadingOffers = false;
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
        if (err is Map<String, dynamic> && err['message'] is String) {
          return err['message'].toString();
        }
        if (err is String && err.isNotEmpty) {
          return err;
        }
      }
      if ((error.message ?? '').isNotEmpty) {
        return error.message!;
      }
    }
    return fallback;
  }

  Future<void> _search(String q) async {
    final trimmed = q.trim();
    if (trimmed.length < 2) {
      setState(() {
        _isSearching = false;
        _results = [];
        _error = 'Įvesk bent 2 simbolius paieškai';
      });
      return;
    }

    setState(() {
      _loadingSearch = true;
      _isSearching = true;
      _error = null;
      _alertStatus = null;
    });

    try {
      final res = await ApiClient().dio.get('/search', queryParameters: {
        'q': trimmed,
        'limit': 30,
      });
      setState(() {
        _results = res.data is List ? List<dynamic>.from(res.data as List) : [];
      });
    } catch (error) {
      setState(() {
        _results = [];
        _error = _extractError(error, fallback: 'Paieška nepavyko');
      });
    } finally {
      if (mounted) {
        setState(() => _loadingSearch = false);
      }
    }
  }

  Future<void> _openProduct(Map<String, dynamic> product) async {
    final productId = (product['product_id'] ?? product['id'])?.toString();
    if (productId == null || productId.isEmpty) {
      setState(() => _error = 'Neteisingas produkto ID');
      return;
    }

    setState(() {
      _loadingOffers = true;
      _error = null;
      _alertStatus = null;
    });

    try {
      final res = await ApiClient().dio.get('/products/$productId/prices');
      setState(() {
        _selectedProduct = product;
        _offers = res.data is List ? List<dynamic>.from(res.data as List) : [];
        _isSearching = false;
      });
    } catch (error) {
      setState(() {
        _offers = [];
        _error = _extractError(error, fallback: 'Nepavyko gauti kainų pagal parduotuves');
      });
    } finally {
      if (mounted) {
        setState(() => _loadingOffers = false);
      }
    }
  }

  Future<void> _createAlert() async {
    if (_selectedProduct == null || _offers.isEmpty) return;

    final best = _offers
        .map((row) => (row is Map ? row['price'] : null) as num?)
        .whereType<num>()
        .map((v) => v.toDouble())
        .fold<double?>(null, (min, value) => min == null ? value : (value < min ? value : min));

    if (best == null || best <= 0) {
      setState(() => _alertStatus = 'Nėra kainų, iš kurių galima kurti pranešimą');
      return;
    }

    final target = double.parse((best * 0.95).toStringAsFixed(2));

    setState(() {
      _creatingAlert = true;
      _alertStatus = null;
    });

    try {
      await ApiClient().dio.post('/alerts/price', data: {
        'productId': (_selectedProduct!['product_id'] ?? _selectedProduct!['id']).toString(),
        'targetPrice': target,
      });

      setState(() {
        _alertStatus = 'Pranešimas sukurtas: kai kaina kris žemiau ${target.toStringAsFixed(2)} €';
      });
    } catch (error) {
      setState(() {
        _alertStatus = _extractError(error, fallback: 'Nepavyko sukurti pranešimo');
      });
    } finally {
      if (mounted) {
        setState(() => _creatingAlert = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Kainų Analizė',
          style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.2),
        ),
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
                if (val.isEmpty) {
                  setState(() {
                    _isSearching = false;
                    _results = [];
                    _error = null;
                  });
                }
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
                          setState(() {
                            _isSearching = false;
                            _results = [];
                            _error = null;
                          });
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
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(20),
                  borderSide: BorderSide.none,
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(20),
                  borderSide: const BorderSide(color: AppColors.primary, width: 2),
                ),
              ),
            ),
          ),

          if (_loadingSearch || _loadingOffers)
            const LinearProgressIndicator(
              color: AppColors.primary,
              backgroundColor: AppColors.surface,
            ),

          if (_error != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
              child: Text(
                _error!,
                style: const TextStyle(color: AppColors.error, fontWeight: FontWeight.bold),
              ),
            ),

          Expanded(
            child: _isSearching ? _buildSearchResults() : _buildSelectedProductPanel(),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchResults() {
    if (!_loadingSearch && _results.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.search_off, size: 64, color: AppColors.textSub),
            SizedBox(height: 16),
            Text('Produktų nerasta', style: TextStyle(color: AppColors.textSub, fontSize: 16)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      itemCount: _results.length,
      itemBuilder: (ctx, i) {
        final p = _results[i] is Map<String, dynamic>
            ? Map<String, dynamic>.from(_results[i] as Map)
            : <String, dynamic>{};
        final bestPrice = (p['best_price'] as num?)?.toDouble();

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
          ),
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            leading: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.shopping_bag_outlined, color: AppColors.primary),
            ),
            title: Text(
              p['name']?.toString() ?? 'Prekė',
              style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
            ),
            subtitle: Text(
              bestPrice != null
                  ? '${bestPrice.toStringAsFixed(2)} € · ${p['store_chain']?.toString() ?? 'Store'}'
                  : (p['store_chain']?.toString() ?? 'Store'),
              style: const TextStyle(color: AppColors.textSub, fontSize: 12),
            ),
            trailing: const Icon(Icons.chevron_right, color: AppColors.textSub),
            onTap: () => _openProduct(p),
          ),
        );
      },
    );
  }

  Widget _buildSelectedProductPanel() {
    if (_selectedProduct == null) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: 24),
          child: Text(
            'Įvesk prekės pavadinimą ir pažiūrėk gyvą kainų analizę pagal parduotuves.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.textSub, fontSize: 15, height: 1.4),
          ),
        ),
      );
    }

    final prices = _offers
        .map((row) => (row is Map ? row['price'] : null) as num?)
        .whereType<num>()
        .map((v) => v.toDouble())
        .toList();

    final best = prices.isEmpty ? null : prices.reduce((a, b) => a < b ? a : b);
    final avg = prices.isEmpty ? null : prices.reduce((a, b) => a + b) / prices.length;

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 100),
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [AppColors.surface, AppColors.elevated]),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _selectedProduct!['name']?.toString() ?? 'Prekė',
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.white),
              ),
              const SizedBox(height: 6),
              Text(
                _selectedProduct!['store_chain']?.toString() ?? 'Kainų palyginimas',
                style: const TextStyle(color: AppColors.textSub),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _StatChip(
                      label: 'Geriausia',
                      value: best != null ? '${best.toStringAsFixed(2)} €' : '-',
                      color: AppColors.green,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _StatChip(
                      label: 'Vidurkis',
                      value: avg != null ? '${avg.toStringAsFixed(2)} €' : '-',
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _StatChip(
                      label: 'Pasiūlymų',
                      value: '${_offers.length}',
                      color: AppColors.secondary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: (_creatingAlert || _offers.isEmpty) ? null : _createAlert,
                  icon: _creatingAlert
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.notifications_active_outlined),
                  label: const Text('Pranešti, kai kris 5%'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.black,
                  ),
                ),
              ),
              if (_alertStatus != null) ...[
                const SizedBox(height: 8),
                Text(
                  _alertStatus!,
                  style: const TextStyle(color: AppColors.textSub, fontSize: 12),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),
        const Text(
          'PARDUOTUVIŲ KAINOS',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w900,
            color: AppColors.textSub,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 12),
        if (_offers.isEmpty)
          const Padding(
            padding: EdgeInsets.only(top: 20),
            child: Center(
              child: Text(
                'Šiai prekei aktyvių pasiūlymų nėra.',
                style: TextStyle(color: AppColors.textSub),
              ),
            ),
          )
        else
          ..._offers.asMap().entries.map((entry) {
            final row = entry.value is Map<String, dynamic>
                ? Map<String, dynamic>.from(entry.value as Map)
                : <String, dynamic>{};
            final price = (row['price'] as num?)?.toDouble();
            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
              ),
              child: Row(
                children: [
                  SizedBox(
                    width: 24,
                    child: Text(
                      '#${entry.key + 1}',
                      style: const TextStyle(color: AppColors.textSub, fontWeight: FontWeight.bold),
                    ),
                  ),
                  Expanded(
                    child: Text(
                      row['store_name']?.toString() ?? row['store']?.toString() ?? 'Store',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                  ),
                  Text(
                    price != null ? '${price.toStringAsFixed(2)} €' : '-',
                    style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w900),
                  ),
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

  const _StatChip({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
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
