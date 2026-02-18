import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/app_theme.dart';

class MapPage extends StatefulWidget {
  const MapPage({super.key});
  @override
  State<MapPage> createState() => _MapPageState();
}

class _MapPageState extends State<MapPage> {
  List<dynamic> _stores = [];
  bool _loading = true;
  String _selectedChain = 'Visos';
  final _mapController = MapController();

  static const _vilnius = LatLng(54.6872, 25.2797);

  @override
  void initState() {
    super.initState();
    _loadStores();
  }

  Future<void> _loadStores() async {
    try {
      final res = await ApiClient().dio.get('/map/stores', queryParameters: {'city': 'Vilnius'});
      setState(() { _stores = res.data ?? []; _loading = false; });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  List<dynamic> get _filtered => _selectedChain == 'Visos'
      ? _stores
      : _stores.where((s) => s['chain'] == _selectedChain).toList();

  List<String> get _chains => ['Visos', ...{..._stores.map((s) => s['chain'] as String? ?? '')}..remove('')];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Parduotuvės')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Chain filter chips
                SizedBox(
                  height: 48,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    children: _chains.map((c) => Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(c),
                        selected: _selectedChain == c,
                        onSelected: (_) => setState(() => _selectedChain = c),
                      ),
                    )).toList(),
                  ),
                ),
                Expanded(
                  child: FlutterMap(
                    mapController: _mapController,
                    options: MapOptions(initialCenter: _vilnius, initialZoom: 13),
                    children: [
                      TileLayer(
                        urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                        userAgentPackageName: 'app.pricelio',
                      ),
                      MarkerLayer(
                        markers: _filtered.map((s) {
                          final lat = (s['lat'] as num?)?.toDouble();
                          final lon = (s['lon'] as num?)?.toDouble();
                          if (lat == null || lon == null) return null;
                          return Marker(
                            point: LatLng(lat, lon),
                            width: 40, height: 40,
                            child: GestureDetector(
                              onTap: () => _showStoreSheet(s),
                              child: Container(
                                decoration: BoxDecoration(
                                  color: AppColors.primary,
                                  shape: BoxShape.circle,
                                  border: Border.all(color: Colors.white, width: 2),
                                ),
                                child: const Icon(Icons.store, color: Colors.white, size: 20),
                              ),
                            ),
                          );
                        }).whereType<Marker>().toList(),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }

  void _showStoreSheet(Map store) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(store['name'] ?? '', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text(store['chain'] ?? '', style: const TextStyle(color: AppColors.textSub)),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.directions),
            label: const Text('Gauti maršrutą'),
          ),
        ]),
      ),
    );
  }
}
