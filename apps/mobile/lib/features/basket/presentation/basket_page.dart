import 'package:flutter/material.dart';
import '../../../core/api/api_client.dart';
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
                        border: Border.all(color: Colors.white.withOpacity(0.05)),
                      ),
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        leading: Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: Colors.black.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.white.withOpacity(0.05)),
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
                  gradient: LinearGradient(
                    colors: [AppColors.surface, AppColors.elevated],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: AppColors.primary.withOpacity(0.3)),
                  boxShadow: [
                    BoxShadow(color: AppColors.primary.withOpacity(0.15), blurRadius: 20),
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
                        color: AppColors.elevated.withOpacity(0.95),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.secondary.withOpacity(0.3)),
                        boxShadow: [
                          BoxShadow(color: Colors.black.withOpacity(0.5), blurRadius: 10, offset: const Offset(0, 5)),
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
