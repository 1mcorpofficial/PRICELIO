import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'dart:ui';
import 'dart:math' as math;
import '../../../core/api/api_client.dart';
import '../../../core/theme/app_theme.dart';

class MapPage extends StatefulWidget {
  const MapPage({super.key});
  @override
  State<MapPage> createState() => _MapPageState();
}

class _MapPageState extends State<MapPage> with TickerProviderStateMixin {
  List<dynamic> _stores = [];
  bool _loading = true;
  String _selectedFilter = 'Karštos Akcijos';
  final _mapController = MapController();

  // Lietuva, centras (apytiksliai aplink Kauną/Vilnių)
  static const _initialCenter = LatLng(54.8985, 23.9036);
  
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: false);
    _loadStores();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _loadStores() async {
    try {
      // Krauname visas parduotuves
      final res = await ApiClient().dio.get('/map/stores');
      final data = res.data is List ? res.data : [];
      
      // Simuliuojame, kad kai kurios parduotuvės turi "Hot Deals" (karštas akcijas)
      // Realiame scenarijuje tai ateitų iš API pagal nuskenuotus čekius
      final rnd = math.Random();
      for (var s in data) {
        s['is_hot'] = rnd.nextDouble() > 0.8; // ~20% parduotuvių yra "karštos"
        s['hot_discount'] = s['is_hot'] ? '-${(rnd.nextInt(40) + 20)}%' : null;
      }

      setState(() { 
        _stores = data; 
        _loading = false; 
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  List<dynamic> get _filtered {
    if (_selectedFilter == 'Karštos Akcijos') {
      return _stores.where((s) => s['is_hot'] == true).toList();
    } else if (_selectedFilter == 'Visos') {
      return _stores;
    }
    return _stores.where((s) => s['chain'] == _selectedFilter).toList();
  }

  List<String> get _filters => ['Karštos Akcijos', 'Visos', 'Maxima', 'Lidl', 'Iki', 'Rimi', 'Norfa'];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // 1. Tamsus Bazinis Žemėlapis (Dark Matter Tiles)
          FlutterMap(
            mapController: _mapController,
            options: const MapOptions(
              initialCenter: _initialCenter,
              initialZoom: 8,
              maxZoom: 18,
            ),
            children: [
              TileLayer(
                // Naudojame tamsaus stiliaus žemėlapio plyteles (Dark Matter)
                urlTemplate: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                subdomains: const ['a', 'b', 'c', 'd'],
                userAgentPackageName: 'app.pricelio',
              ),
              // 2. Karštųjų Taškų ir Parduotuvių Markeriai
              MarkerLayer(
                markers: _filtered.map((s) {
                  final lat = (s['lat'] as num?)?.toDouble();
                  final lon = (s['lon'] as num?)?.toDouble();
                  if (lat == null || lon == null) return null;
                  
                  final isHot = s['is_hot'] == true;

                  return Marker(
                    point: LatLng(lat, lon),
                    width: isHot ? 80 : 40,
                    height: isHot ? 80 : 40,
                    child: GestureDetector(
                      onTap: () => _showStoreDeal(s),
                      child: isHot ? _buildHotMarker(s['hot_discount']) : _buildNormalMarker(s['chain']),
                    ),
                  );
                }).whereType<Marker>().toList(),
              ),
            ],
          ),

          // 3. Viršutinė Glassmorphism Paieška ir Filtrai
          Positioned(
            top: 50,
            left: 16,
            right: 16,
            child: Column(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(24),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                    child: Container(
                      height: 56,
                      decoration: BoxDecoration(
                        color: AppColors.surface.withValues(alpha: 0.7),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.5), blurRadius: 20)],
                      ),
                      child: Row(
                        children: [
                          IconButton(
                            icon: const Icon(Icons.arrow_back, color: Colors.white),
                            onPressed: () => Navigator.pop(context),
                          ),
                          const Expanded(
                            child: TextField(
                              decoration: InputDecoration(
                                hintText: 'Ieškoti miesto ar parduotuvės...',
                                hintStyle: TextStyle(color: AppColors.textSub),
                                border: InputBorder.none,
                                enabledBorder: InputBorder.none,
                                focusedBorder: InputBorder.none,
                                fillColor: Colors.transparent,
                                filled: true,
                              ),
                              style: TextStyle(color: Colors.white),
                            ),
                          ),
                          const Icon(Icons.radar, color: AppColors.primary),
                          const SizedBox(width: 16),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                // Filtrų "Chips"
                SizedBox(
                  height: 40,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: _filters.length,
                    itemBuilder: (context, index) {
                      final filter = _filters[index];
                      final isSelected = _selectedFilter == filter;
                      final isHotFilter = filter == 'Karštos Akcijos';
                      
                      return GestureDetector(
                        onTap: () => setState(() => _selectedFilter = filter),
                        child: Container(
                          margin: const EdgeInsets.only(right: 8),
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          decoration: BoxDecoration(
                            color: isSelected 
                                ? (isHotFilter ? AppColors.error : AppColors.primary) 
                                : AppColors.surface.withValues(alpha: 0.8),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: isSelected ? Colors.transparent : Colors.white.withValues(alpha: 0.1),
                            ),
                            boxShadow: isSelected ? [
                              BoxShadow(
                                color: (isHotFilter ? AppColors.error : AppColors.primary).withValues(alpha: 0.4),
                                blurRadius: 10,
                              )
                            ] : [],
                          ),
                          alignment: Alignment.center,
                          child: Row(
                            children: [
                              if (isHotFilter) const Icon(Icons.local_fire_department, size: 14, color: Colors.white),
                              if (isHotFilter) const SizedBox(width: 4),
                              Text(
                                filter,
                                style: TextStyle(
                                  color: isSelected ? Colors.black : Colors.white,
                                  fontWeight: isSelected ? FontWeight.w900 : FontWeight.w500,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
          
          // Radaro krovimo indikatorius
          if (_loading)
            const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SizedBox(
                    width: 60, height: 60,
                    child: CircularProgressIndicator(color: AppColors.primary, strokeWidth: 2),
                  ),
                  SizedBox(height: 16),
                  Text('Skenuojamas tinklas...', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, shadows: [Shadow(color: AppColors.primary, blurRadius: 10)])),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildHotMarker(String? discount) {
    return AnimatedBuilder(
      animation: _pulseController,
      builder: (context, child) {
        return Stack(
          alignment: Alignment.center,
          children: [
            // Pulsuojanti banga
            Container(
              width: 80 * _pulseController.value,
              height: 80 * _pulseController.value,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.error.withValues(alpha: 1.0 - _pulseController.value),
              ),
            ),
            // Pagrindinis burbulas
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.error,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 2),
                boxShadow: [
                  BoxShadow(color: AppColors.error.withValues(alpha: 0.6), blurRadius: 15, spreadRadius: 2),
                ],
              ),
              child: Center(
                child: Text(
                  discount ?? 'HOT',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 10),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildNormalMarker(String? chain) {
    return Container(
      width: 24,
      height: 24,
      decoration: BoxDecoration(
        color: AppColors.surface,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.textSub.withValues(alpha: 0.5), width: 1.5),
      ),
      child: Center(
        child: Text(
          (chain ?? 'P')[0].toUpperCase(),
          style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }

  void _showStoreDeal(Map store) {
    final isHot = store['is_hot'] == true;
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => ClipRRect(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppColors.surface.withValues(alpha: 0.85),
              border: Border(top: BorderSide(color: isHot ? AppColors.error : AppColors.primary, width: 2)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(store['name'] ?? 'Parduotuvė', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.white)),
                          Text(store['chain'] ?? '', style: const TextStyle(color: AppColors.textSub)),
                        ],
                      ),
                    ),
                    if (isHot)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppColors.error.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.error),
                        ),
                        child: Text(
                          store['hot_discount'] ?? 'HOT',
                          style: const TextStyle(color: AppColors.error, fontWeight: FontWeight.w900),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 24),
                if (isHot) ...[
                  const Text('NAUJAUSI BENDROMENĖS RADINIAI', style: TextStyle(color: AppColors.textSub, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.5)),
                  const SizedBox(height: 12),
                  _buildDealRow('Dvaro Sviestas 82%', '2.45 €', 'Prieš 15 min'),
                  _buildDealRow('Lavazza Kava', '11.99 €', 'Prieš 42 min'),
                  const SizedBox(height: 20),
                ],
                ElevatedButton.icon(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.directions),
                  label: const Text('Naviguoti čia'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isHot ? AppColors.error : AppColors.primary,
                    foregroundColor: isHot ? Colors.white : Colors.black,
                  ),
                ),
                const SizedBox(height: 20), // Padding for bottom
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDealRow(String item, String price, String time) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              const Icon(Icons.check_circle, color: AppColors.green, size: 16),
              const SizedBox(width: 8),
              Text(item, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(price, style: const TextStyle(color: AppColors.green, fontWeight: FontWeight.w900)),
              Text(time, style: const TextStyle(color: AppColors.textSub, fontSize: 10)),
            ],
          )
        ],
      ),
    );
  }
}
