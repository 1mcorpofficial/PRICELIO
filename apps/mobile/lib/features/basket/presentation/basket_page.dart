import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../../core/api/api_client.dart';
import '../../../core/theme/app_theme.dart';

class BasketPage extends StatefulWidget {
  const BasketPage({super.key});

  @override
  State<BasketPage> createState() => _BasketPageState();
}

class _BasketPageState extends State<BasketPage> {
  static const _basketIdKey = 'pricelio_active_basket_id';
  static const _basketGuestProofKey = 'pricelio_active_basket_guest_proof';

  final _controller = TextEditingController();
  final _storage = const FlutterSecureStorage();

  Timer? _searchDebounce;

  String? _basketId;
  String? _guestProof;
  List<dynamic> _basketItems = [];
  List<dynamic> _suggestions = [];
  Map<String, dynamic>? _optimization;

  bool _loadingBasket = true;
  bool _loadingSuggestions = false;
  bool _adding = false;
  bool _optimizing = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onQueryChanged);
    _initBasket();
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _controller.removeListener(_onQueryChanged);
    _controller.dispose();
    super.dispose();
  }

  Options _basketOptions() {
    if (_guestProof == null || _guestProof!.isEmpty) {
      return Options();
    }
    return Options(headers: {'x-guest-session-proof': _guestProof});
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

  Future<void> _initBasket() async {
    setState(() {
      _loadingBasket = true;
      _error = null;
    });

    try {
      final storedBasketId = await _storage.read(key: _basketIdKey);
      final storedGuestProof = await _storage.read(key: _basketGuestProofKey);

      if (storedBasketId != null && storedBasketId.isNotEmpty) {
        _basketId = storedBasketId;
        _guestProof = storedGuestProof;
        await _optimizeBasket();
      } else {
        await _createBasket();
      }
    } catch (error) {
      setState(() {
        _error = _extractError(error, fallback: 'Nepavyko paruošti krepšelio');
      });
    } finally {
      if (mounted) {
        setState(() {
          _loadingBasket = false;
        });
      }
    }
  }

  Future<void> _createBasket() async {
    final res = await ApiClient().dio.post('/baskets', data: {'name': 'Main basket'});
    final data = res.data is Map<String, dynamic>
        ? Map<String, dynamic>.from(res.data as Map)
        : <String, dynamic>{};

    final id = data['id']?.toString();
    if (id == null || id.isEmpty) {
      throw const FormatException('basket_id_missing');
    }

    _basketId = id;
    _guestProof = data['guest_proof']?.toString();

    await _storage.write(key: _basketIdKey, value: _basketId);
    if (_guestProof != null && _guestProof!.isNotEmpty) {
      await _storage.write(key: _basketGuestProofKey, value: _guestProof);
    }

    await _optimizeBasket();
  }

  void _onQueryChanged() {
    final q = _controller.text.trim();
    _searchDebounce?.cancel();

    if (q.length < 2) {
      if (mounted) {
        setState(() {
          _suggestions = [];
          _loadingSuggestions = false;
        });
      }
      return;
    }

    _searchDebounce = Timer(const Duration(milliseconds: 280), () {
      _loadSuggestions(q);
    });
  }

  Future<void> _loadSuggestions(String query) async {
    if (query.trim().length < 2) return;

    setState(() => _loadingSuggestions = true);
    try {
      final res = await ApiClient().dio.get('/search', queryParameters: {
        'q': query.trim(),
        'limit': 8,
      });

      if (!mounted) return;
      setState(() {
        _suggestions = res.data is List ? List<dynamic>.from(res.data as List) : [];
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _suggestions = [];
      });
    } finally {
      if (mounted) {
        setState(() => _loadingSuggestions = false);
      }
    }
  }

  Future<void> _addItem({Map<String, dynamic>? suggestion}) async {
    if (_basketId == null) {
      setState(() => _error = 'Krepšelis dar neparuoštas');
      return;
    }

    final raw = (suggestion?['name']?.toString() ?? _controller.text.trim()).trim();
    if (raw.isEmpty) return;

    final Map<String, dynamic> payloadItem = {
      'quantity': 1,
      'raw_name': raw,
    };

    final productId = suggestion?['product_id']?.toString();
    if (productId != null && productId.isNotEmpty) {
      payloadItem['product_id'] = productId;
    }

    setState(() {
      _adding = true;
      _error = null;
    });

    try {
      final res = await ApiClient().dio.post(
        '/baskets/$_basketId/items',
        data: {'items': [payloadItem]},
        options: _basketOptions(),
      );

      final data = res.data is Map<String, dynamic>
          ? Map<String, dynamic>.from(res.data as Map)
          : <String, dynamic>{};

      setState(() {
        _basketItems = data['items'] is List ? List<dynamic>.from(data['items'] as List) : [];
        _controller.clear();
        _suggestions = [];
      });

      await _optimizeBasket();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = _extractError(error, fallback: 'Nepavyko pridėti prekės');
      });
    } finally {
      if (mounted) {
        setState(() => _adding = false);
      }
    }
  }

  Future<void> _optimizeBasket() async {
    if (_basketId == null) return;

    setState(() {
      _optimizing = true;
      _error = null;
    });

    try {
      final res = await ApiClient().dio.post(
        '/baskets/$_basketId/optimize',
        data: {},
        options: _basketOptions(),
      );

      final data = res.data is Map<String, dynamic>
          ? Map<String, dynamic>.from(res.data as Map)
          : <String, dynamic>{};

      if (!mounted) return;
      setState(() {
        _optimization = data;

        if (_basketItems.isEmpty) {
          final plan = data['plan'] is List ? List<dynamic>.from(data['plan'] as List) : const [];
          final firstPlan = plan.isNotEmpty && plan.first is Map<String, dynamic>
              ? Map<String, dynamic>.from(plan.first as Map)
              : <String, dynamic>{};
          final planItems = firstPlan['items'] is List
              ? List<dynamic>.from(firstPlan['items'] as List)
              : const [];

          _basketItems = planItems.asMap().entries.map((entry) {
            final row = entry.value is Map<String, dynamic>
                ? Map<String, dynamic>.from(entry.value as Map)
                : <String, dynamic>{};
            return {
              'id': 'plan-${entry.key}',
              'quantity': row['quantity'] ?? 1,
              'raw_name': row['product_name']?.toString(),
              'product_id': row['product_id']?.toString(),
              'product_name': row['product_name']?.toString() ?? 'Prekė',
            };
          }).toList();
        }
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = _extractError(error, fallback: 'Nepavyko optimizuoti krepšelio');
      });
    } finally {
      if (mounted) {
        setState(() => _optimizing = false);
      }
    }
  }

  List<Map<String, dynamic>> _optimizedItems() {
    final plan = _optimization?['plan'];
    if (plan is! List || plan.isEmpty || plan.first is! Map<String, dynamic>) {
      return const [];
    }

    final firstPlan = Map<String, dynamic>.from(plan.first as Map);
    final items = firstPlan['items'];
    if (items is! List) return const [];

    return items
        .whereType<Map>()
        .map((row) => Map<String, dynamic>.from(row))
        .toList();
  }

  Map<String, dynamic>? _lineForBasketItem(Map<String, dynamic> item) {
    final optimized = _optimizedItems();
    final productId = item['product_id']?.toString();
    final productName = item['product_name']?.toString().toLowerCase();

    for (final row in optimized) {
      final rowProductId = row['product_id']?.toString();
      if (productId != null && productId.isNotEmpty && rowProductId == productId) {
        return row;
      }
    }

    if (productName != null && productName.isNotEmpty) {
      for (final row in optimized) {
        final rowName = row['product_name']?.toString().toLowerCase();
        if (rowName == productName) {
          return row;
        }
      }
    }

    return null;
  }

  @override
  Widget build(BuildContext context) {
    final plan = _optimization?['plan'];
    final storeName =
        (plan is List && plan.isNotEmpty && plan.first is Map<String, dynamic>)
            ? (plan.first['store_name']?.toString() ?? '-')
            : '-';

    final totalPrice = (_optimization?['total_price'] as num?)?.toDouble();
    final savings = (_optimization?['savings_eur'] as num?)?.toDouble();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Išmanus Krepšelis'),
        actions: [
          IconButton(
            icon: _optimizing
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                  )
                : const Icon(Icons.bolt, color: AppColors.primary),
            onPressed: _optimizing ? null : _optimizeBasket,
          )
        ],
      ),
      body: Stack(
        children: [
          Column(
            children: [
              if (_error != null)
                Container(
                  margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.error.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.error.withValues(alpha: 0.35)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: AppColors.error),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _error!,
                          style: const TextStyle(color: AppColors.error, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),

              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        decoration: InputDecoration(
                          hintText: 'Ką nori pirkti?',
                          hintStyle: const TextStyle(color: AppColors.textSub),
                          prefixIcon: const Icon(Icons.search, color: AppColors.textSub),
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
                        onSubmitted: (_) => _addItem(),
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: (_adding || _loadingBasket) ? null : () => _addItem(),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: _adding
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                            )
                          : const Icon(Icons.add),
                    ),
                  ],
                ),
              ),

              if (_loadingSuggestions)
                const Padding(
                  padding: EdgeInsets.only(bottom: 8),
                  child: SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                  ),
                ),

              if (_suggestions.isNotEmpty)
                SizedBox(
                  height: 132,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: _suggestions.length,
                    itemBuilder: (ctx, i) {
                      final item = _suggestions[i] is Map<String, dynamic>
                          ? Map<String, dynamic>.from(_suggestions[i] as Map)
                          : <String, dynamic>{};
                      final price = (item['best_price'] as num?)?.toDouble();
                      return GestureDetector(
                        onTap: () => _addItem(suggestion: item),
                        child: Container(
                          width: 170,
                          margin: const EdgeInsets.only(right: 12),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.elevated.withValues(alpha: 0.95),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppColors.secondary.withValues(alpha: 0.3)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                item['name']?.toString() ?? 'Prekė',
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                              const Spacer(),
                              Text(
                                price != null ? '${price.toStringAsFixed(2)} €' : 'Kaina nenurodyta',
                                style: const TextStyle(color: AppColors.green, fontWeight: FontWeight.bold),
                              ),
                              Text(
                                item['store_chain']?.toString() ?? 'Store',
                                style: const TextStyle(color: AppColors.textSub, fontSize: 11),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),

              Expanded(
                child: _loadingBasket
                    ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                    : _basketItems.isEmpty
                        ? const Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.shopping_basket_outlined, size: 64, color: AppColors.textSub),
                                SizedBox(height: 12),
                                Text('Krepšelis tuščias', style: TextStyle(color: AppColors.textSub, fontSize: 16)),
                              ],
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            itemCount: _basketItems.length,
                            itemBuilder: (ctx, i) {
                              final item = _basketItems[i] is Map<String, dynamic>
                                  ? Map<String, dynamic>.from(_basketItems[i] as Map)
                                  : <String, dynamic>{};
                              final qty = (item['quantity'] as num?)?.toInt() ?? (item['qty'] as num?)?.toInt() ?? 1;
                              final title =
                                  item['product_name']?.toString() ?? item['raw_name']?.toString() ?? item['name']?.toString() ?? 'Prekė';
                              final line = _lineForBasketItem(item);
                              final lineTotal = (line?['line_total'] as num?)?.toDouble();
                              final unitPrice = (line?['price'] as num?)?.toDouble();

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
                                    width: 44,
                                    height: 44,
                                    decoration: BoxDecoration(
                                      color: Colors.black.withValues(alpha: 0.2),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
                                    ),
                                    child: Center(
                                      child: Text(
                                        '${qty}x',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          color: AppColors.primary,
                                        ),
                                      ),
                                    ),
                                  ),
                                  title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
                                  subtitle: Text(
                                    unitPrice != null
                                        ? '${unitPrice.toStringAsFixed(2)} € / vnt. · $storeName'
                                        : 'Kaina skaičiuojama…',
                                    style: const TextStyle(fontSize: 12, color: AppColors.textSub),
                                  ),
                                  trailing: Text(
                                    lineTotal != null ? '${lineTotal.toStringAsFixed(2)} €' : '-',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                  ),
                                ),
                              );
                            },
                          ),
              ),

              Container(
                margin: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.surface, AppColors.elevated],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                  boxShadow: [
                    BoxShadow(color: AppColors.primary.withValues(alpha: 0.15), blurRadius: 20),
                  ],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          'VISO KREPŠELIS',
                          style: TextStyle(fontSize: 10, color: AppColors.textSub, letterSpacing: 1.5),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          totalPrice != null ? '${totalPrice.toStringAsFixed(2)} €' : '--',
                          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900),
                        ),
                        if (savings != null)
                          Text(
                            'Sutaupoma ~ ${savings.toStringAsFixed(2)} €',
                            style: const TextStyle(color: AppColors.green, fontWeight: FontWeight.bold, fontSize: 12),
                          ),
                      ],
                    ),
                    ElevatedButton(
                      onPressed: _optimizing ? null : _optimizeBasket,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                        minimumSize: Size.zero,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Text(_optimizing ? 'Skaičiuoju…' : 'Optimizuoti'),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
