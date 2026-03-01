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
  bool _loading = false;
  bool _isSearching = false;

  // Demo market data for visual representation
  final _demoMarketDeals = [
    {'name': 'Dvaro Sviestas 82%', 'brand': 'Pieno Žvaigždės', 'price': 2.45, 'drop': '-5.4%', 'dropColor': AppColors.green},
    {'name': 'Lavazza Kava 1kg', 'brand': 'Lavazza', 'price': 14.99, 'drop': '-12.0%', 'dropColor': AppColors.green},
    {'name': 'Bananas', 'brand': 'Ekvadoras', 'price': 1.25, 'drop': '+2.1%', 'dropColor': AppColors.error},
  ];

  Future<void> _search(String q) async {
    if (q.trim().isEmpty) {
      setState(() => _isSearching = false);
      return;
    }
    setState(() {
      _loading = true;
      _isSearching = true;
    });
    try {
      final res = await ApiClient().dio.get('/search', queryParameters: {'q': q.trim()});
      setState(() => _results = res.data ?? []);
    } catch (_) {
      setState(() => _results = []);
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Kainų Birža', style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: 1.5)),
        backgroundColor: AppColors.background,
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Paieškos laukelis
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            child: TextField(
              controller: _controller,
              textInputAction: TextInputAction.search,
              onSubmitted: _search,
              onChanged: (val) {
                if (val.isEmpty) setState(() => _isSearching = false);
              },
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              decoration: InputDecoration(
                hintText: 'Ieškoti produkto (pvz. Sviestas)...',
                hintStyle: TextStyle(color: AppColors.textSub.withValues(alpha: 0.5)),
                prefixIcon: const Icon(Icons.search, color: AppColors.primary),
                suffixIcon: _controller.text.isNotEmpty 
                  ? IconButton(
                      icon: const Icon(Icons.clear, color: AppColors.textSub),
                      onPressed: () {
                        _controller.clear();
                        setState(() => _isSearching = false);
                      },
                    )
                  : null,
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
          
          if (_loading) const LinearProgressIndicator(color: AppColors.primary, backgroundColor: AppColors.surface),
          
          Expanded(
            child: _isSearching
                ? _buildSearchResults()
                : _buildMarketDashboard(),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchResults() {
    if (!_loading && _results.isEmpty) {
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
        final p = _results[i];
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
              width: 40, height: 40,
              decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
              child: const Icon(Icons.shopping_bag_outlined, color: AppColors.primary),
            ),
            title: Text(p['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
            subtitle: Text(p['brand'] ?? 'Nežinomas gamintojas', style: const TextStyle(color: AppColors.textSub, fontSize: 12)),
            trailing: const Icon(Icons.chevron_right, color: AppColors.textSub),
            onTap: () {
              // TODO: Navigate to detailed product screen
            },
          ),
        );
      },
    );
  }

  Widget _buildMarketDashboard() {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      children: [
        const Text('RINKOS TENDENCIJOS', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: AppColors.textSub, letterSpacing: 1.5)),
        const SizedBox(height: 16),
        
        // Horizontalus Top Drop kortelių list'as
        SizedBox(
          height: 180,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: _demoMarketDeals.length,
            itemBuilder: (ctx, i) {
              final deal = _demoMarketDeals[i];
              final isDrop = deal['dropColor'] == AppColors.green;
              return Container(
                width: 160,
                margin: const EdgeInsets.only(right: 16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [AppColors.surface, AppColors.elevated]),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: isDrop ? AppColors.green.withValues(alpha: 0.3) : AppColors.error.withValues(alpha: 0.3)),
                  boxShadow: [BoxShadow(color: isDrop ? AppColors.green.withValues(alpha: 0.05) : AppColors.error.withValues(alpha: 0.05), blurRadius: 15)],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Icon(isDrop ? Icons.trending_down : Icons.trending_up, color: deal['dropColor'] as Color, size: 24),
                        Text(deal['drop'] as String, style: TextStyle(color: deal['dropColor'] as Color, fontWeight: FontWeight.w900)),
                      ],
                    ),
                    const Spacer(),
                    Text(deal['name'] as String, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white, height: 1.2)),
                    const SizedBox(height: 4),
                    Text('${deal['price']} €', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Colors.white)),
                  ],
                ),
              );
            },
          ),
        ),
        
        const SizedBox(height: 32),
        const Text('POPULIARIAUSIOS KATEGORIJOS', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: AppColors.textSub, letterSpacing: 1.5)),
        const SizedBox(height: 16),
        
        _buildCategoryRow(Icons.local_cafe, 'Kava ir Arbata', '+1.2%'),
        _buildCategoryRow(Icons.egg, 'Pieno produktai', '-3.4%', isDown: true),
        _buildCategoryRow(Icons.fastfood, 'Mėsa', '+5.0%'),
        
        const SizedBox(height: 100), // padding bottom
      ],
    );
  }

  Widget _buildCategoryRow(IconData icon, String title, String change, {bool isDown = false}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, color: AppColors.primary, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(child: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white))),
          Text(change, style: TextStyle(fontWeight: FontWeight.w900, color: isDown ? AppColors.green : AppColors.error)),
        ],
      ),
    );
  }

  @override
  void dispose() { _controller.dispose(); super.dispose(); }
}
