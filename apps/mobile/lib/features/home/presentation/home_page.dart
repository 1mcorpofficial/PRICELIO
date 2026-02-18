import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../receipts/presentation/receipt_scan_page.dart';

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
                // Quick action: Receipt scan
                _ReceiptScanBanner(),
                const SizedBox(height: 16),
                _SectionTitle('Parduotuvės Vilniuje (${_stores.length})'),
                const SizedBox(height: 12),
                ..._stores.map((s) => _StoreCard(store: s)),
              ],
            ),
    );
  }
}

class _ReceiptScanBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => Navigator.push(context,
          MaterialPageRoute(builder: (_) => const ReceiptScanPage())),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [AppColors.primary, AppColors.primary.withOpacity(0.75)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            const Icon(Icons.receipt_long, color: Colors.white, size: 36),
            const SizedBox(width: 14),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Analizuoti čekį',
                      style: TextStyle(color: Colors.white, fontSize: 17,
                          fontWeight: FontWeight.w700)),
                  SizedBox(height: 4),
                  Text('Nuskenuokite čekį ir sužinokite, kur permokėjote',
                      style: TextStyle(color: Colors.white70, fontSize: 12)),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios, color: Colors.white70, size: 18),
          ],
        ),
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
