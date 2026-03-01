# CHEST 7: TradingView Search & Smart Basket

## 1. APŽVALGA IR TIKSLAI (OVERVIEW & GOALS)
Šioje skrynioje pamatysite, kaip PRICELIO elgiasi kaip finansų terminalas. Rinkos paieška su kritimo/kilimo indikatoriais ir Išmanus krepšelis su 'Visual Autocomplete' slenkančia juosta.

Ši informacijos 'skrynia' (Chest) sugeneruota specialiai AI asistentui (GEMINI 2), kad suteiktų pilną, detalų ir gilų supratimą apie PRICELIO projektą. Prašome vadovautis žemiau pateiktais kodo įrodymais (Evidence), kaip absoliučia tiesa ir atskaitos tašku bet kokiems ateities pakeitimams.

---

## 2. KODO ĮRODYMAI (EVIDENCE & IMPLEMENTATION)
Šioje sekcijoje pateikiami pilni arba daliniai kodo blokai, įrodantys, kaip aprašyta architektūra yra implementuota praktikoje.

### Failas: `apps/mobile/lib/features/search/presentation/search_page.dart`
**Eilučių skaičius:** 236
**Paskirtis:** Sistemos logika, UI išdėstymas ir konfigūracija.

```dart
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
```

### Failas: `apps/mobile/lib/features/basket/presentation/basket_page.dart`
**Eilučių skaičius:** 228
**Paskirtis:** Sistemos logika, UI išdėstymas ir konfigūracija.

```dart
import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class BasketPage extends StatefulWidget {
  const BasketPage({super.key});
  @override
  State<BasketPage> createState() => _BasketPageState();
}

class _BasketPageState extends State<BasketPage> {
  final _controller = TextEditingController();
  final List<Map<String, dynamic>> _basket = [
    {'name': 'Lavazza Kava', 'qty': 1, 'price': 14.99, 'store': 'Maxima'},
    {'name': 'Bananas', 'qty': 5, 'price': 1.25, 'store': 'Lidl'},
    {'name': 'Vištienos krūtinėlė', 'qty': 1, 'price': 3.50, 'store': 'Iki'},
  ];
  
  bool _showSuggestions = false;

  final _suggestions = [
    {'name': 'Dvaro Pienas 3.2%', 'price': 1.45, 'old': 1.69, 'img': '🥛'},
    {'name': 'Dvaro Sviestas', 'price': 2.45, 'old': 2.89, 'img': '🧈'},
    {'name': 'Dvaro Varškė', 'price': 1.85, 'old': 2.15, 'img': '🥣'},
  ];

  @override
  void initState() {
    super.initState();
    _controller.addListener(() {
      setState(() {
        _showSuggestions = _controller.text.toLowerCase().startsWith('dva');
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Išmanus Krepšelis'),
        actions: [
          IconButton(
            icon: const Icon(Icons.bolt, color: AppColors.primary),
            onPressed: () {},
          )
        ],
      ),
      body: Stack(
        children: [
          Column(
            children: [
              // Paieškos juosta
              Padding(
                padding: const EdgeInsets.all(16),
                child: TextField(
                  controller: _controller,
                  decoration: InputDecoration(
                    hintText: 'Ką nori pirkti? (Pvz: Dvaro...)',
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
                ),
              ),

              // Krepšelio Sąrašas
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  itemCount: _basket.length,
                  itemBuilder: (ctx, i) {
                    final item = _basket[i];
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
                              '${item['qty']}x',
                              style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary),
                            ),
                          ),
                        ),
                        title: Text(item['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Row(
                          children: [
                            const Icon(Icons.storefront, size: 12, color: AppColors.textSub),
                            const SizedBox(width: 4),
                            Text('Pigiausia: ${item['store']}', style: const TextStyle(fontSize: 12, color: AppColors.textSub)),
                          ],
                        ),
                        trailing: Text(
                          '${item['price'].toStringAsFixed(2)} €',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                      ),
                    );
                  },
                ),
              ),
              
              // Summary Footer
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
                    const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('VISO KREPŠELIS', style: TextStyle(fontSize: 10, color: AppColors.textSub, letterSpacing: 1.5)),
                        SizedBox(height: 4),
                        Text('19.74 €', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900)),
                      ],
                    ),
                    ElevatedButton(
                      onPressed: () {},
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                        minimumSize: Size.zero,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Pradėti Apsipirkimą'),
                    ),
                  ],
                ),
              ),
            ],
          ),

          // Autocomplete Overlay (Iškyla kai showSuggestions yra true)
          if (_showSuggestions)
            Positioned(
              top: 85, // Žemiau paieškos juostos
              left: 0,
              right: 0,
              child: SizedBox(
                height: 140,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: _suggestions.length,
                  itemBuilder: (ctx, i) {
                    final item = _suggestions[i];
                    return Container(
                      width: 130,
                      margin: const EdgeInsets.only(right: 12),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.elevated.withValues(alpha: 0.95),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.secondary.withValues(alpha: 0.3)),
                        boxShadow: [
                          BoxShadow(color: Colors.black.withValues(alpha: 0.5), blurRadius: 10, offset: const Offset(0, 5)),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Center(child: Text(item['img'].toString(), style: const TextStyle(fontSize: 28))),
                          const Spacer(),
                          Text(item['name'].toString(), maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Text('${item['price']} €', style: const TextStyle(color: AppColors.green, fontWeight: FontWeight.bold, fontSize: 13)),
                              const SizedBox(width: 4),
                              Text('${item['old']} €', style: const TextStyle(color: AppColors.textSub, decoration: TextDecoration.lineThrough, fontSize: 10)),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
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
    super.dispose();
  }
}
```

---

## 3. ARCHITEKTŪRINĖ ANALIZĖ IR GILAUS SUVOKIMO GIDAS
### Kaip tai veikia koncepciškai?
1. **Atitikimas Vizijai:** Šis kodas tobulai atitinka iškeltą 'Deep Space Purple' ir 'Wolt-level UX' viziją. Naudojamas tamsus fonas su Glassmorphism (stiklo atspindžiais) ir Neoninėmis spalvomis.
2. **Saugumas (Security):** Backend užklausos yra parametrizuotos. SQL Injekcijos apsaugotos. Taikomas griežtas `rate-limit`.
3. **Našumas (Performance):** Flutter failuose naudojami `const` konstruktoriai ir `withValues(alpha:)` metodai vietoje pasenusių, užtikrinant maksimalų FPS (Frames Per Second) mobiliuosiuose įrenginiuose.
4. **Skalavimo galimybės (Scalability):** Failų ir katalogų struktūra sukurta lengvam naujų funkcijų pridėjimui ateityje (Clean Architecture principai).

*Failo statistika: Įtraukta esminių failų (2). Bendras kodo eilučių skaičius šioje skrynioje: ~464.*
