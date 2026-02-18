import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/app_theme.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});
  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  List<dynamic> _stores = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadStores();
  }

  Future<void> _loadStores() async {
    try {
      final res = await ApiClient().dio.get('/map/stores', queryParameters: {'city': 'Vilnius'});
      setState(() { _stores = res.data; _loading = false; });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('PRICELIO'),
        actions: [
          IconButton(icon: const Icon(Icons.search), onPressed: () => context.go('/search')),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _SectionTitle('Parduotuvės Vilniuje (${_stores.length})'),
                const SizedBox(height: 12),
                ..._stores.map((s) => _StoreCard(store: s)),
              ],
            ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);
  @override
  Widget build(BuildContext context) => Text(text,
    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.textMain));
}

class _StoreCard extends StatelessWidget {
  final Map store;
  const _StoreCard({required this.store});
  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        leading: const CircleAvatar(child: Icon(Icons.store)),
        title: Text(store['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(store['chain'] ?? ''),
        trailing: const Icon(Icons.chevron_right),
      ),
    );
  }
}
