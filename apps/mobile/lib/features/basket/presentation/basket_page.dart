import 'package:flutter/material.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/app_theme.dart';

class BasketPage extends StatefulWidget {
  const BasketPage({super.key});
  @override
  State<BasketPage> createState() => _BasketPageState();
}

class _BasketPageState extends State<BasketPage> {
  final List<Map<String, dynamic>> _items = [];
  final _controller = TextEditingController();
  bool _optimizing = false;
  Map<String, dynamic>? _result;

  void _addItem() {
    final name = _controller.text.trim();
    if (name.isEmpty) return;
    setState(() {
      _items.add({'name': name, 'quantity': 1});
      _result = null;
    });
    _controller.clear();
  }

  Future<void> _optimize() async {
    if (_items.isEmpty) return;
    setState(() { _optimizing = true; _result = null; });
    try {
      // Create basket
      final basket = await ApiClient().dio.post('/baskets', data: {'name': 'Mobile Basket'});
      final basketId = basket.data['id'];
      // Add items
      await ApiClient().dio.post('/baskets/$basketId/items', data: {'items': _items});
      // Optimize
      final res = await ApiClient().dio.post('/baskets/$basketId/optimize');
      setState(() => _result = res.data);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Optimizavimas nepavyko. Bandykite vėliau.')));
    } finally {
      setState(() => _optimizing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Krepšelis'),
        actions: [
          if (_items.isNotEmpty)
            TextButton(onPressed: _optimize, child: const Text('Optimizuoti')),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(children: [
              Expanded(
                child: TextField(
                  controller: _controller,
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) => _addItem(),
                  decoration: const InputDecoration(
                    hintText: 'Pridėti produktą...',
                    prefixIcon: Icon(Icons.add_shopping_cart),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: _addItem,
                style: ElevatedButton.styleFrom(minimumSize: const Size(52, 52)),
                child: const Icon(Icons.add),
              ),
            ]),
          ),
          Expanded(
            child: _items.isEmpty
                ? Center(child: Text('Krepšelis tuščias.\nPridėkite produktų!',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.textSub, fontSize: 16)))
                : ListView(
                    children: [
                      ..._items.asMap().entries.map((e) => ListTile(
                        leading: const Icon(Icons.shopping_cart_outlined),
                        title: Text(e.value['name']),
                        trailing: IconButton(
                          icon: const Icon(Icons.close, color: AppColors.error),
                          onPressed: () => setState(() { _items.removeAt(e.key); _result = null; }),
                        ),
                      )),
                      if (_optimizing) const Padding(
                        padding: EdgeInsets.all(24),
                        child: Center(child: CircularProgressIndicator()),
                      ),
                      if (_result != null) _OptimizationResult(result: _result!),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() { _controller.dispose(); super.dispose(); }
}

class _OptimizationResult extends StatelessWidget {
  final Map<String, dynamic> result;
  const _OptimizationResult({required this.result});

  @override
  Widget build(BuildContext context) {
    final stores = (result['stores'] as List? ?? []);
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Optimizuotas maršrutas', style: TextStyle(
          fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.textMain)),
        const SizedBox(height: 12),
        ...stores.map((s) => Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(children: [
            const Icon(Icons.store, color: AppColors.primary),
            const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(s['store_name'] ?? s['chain'] ?? '',
                style: const TextStyle(fontWeight: FontWeight.w600)),
              if (s['total'] != null)
                Text('Iš viso: €${s['total']}', style: const TextStyle(color: AppColors.textSub)),
            ])),
          ]),
        )),
      ]),
    );
  }
}
