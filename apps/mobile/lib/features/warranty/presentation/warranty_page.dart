import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';

class WarrantyPage extends StatelessWidget {
  const WarrantyPage({super.key});

  final List<Map<String, dynamic>> _warranties = const [
    {
      'name': 'Sony WH-1000XM5 Ausinės',
      'store': 'Topo Centras',
      'purchaseDate': '2025-11-20',
      'price': 349.99,
      'icon': Icons.headphones,
      'isExpiringSoon': false,
      'timeLeft': 'Galioja dar 18 mėn.',
    },
    {
      'name': 'Nike Bėgimo Batai',
      'store': 'Sportland',
      'purchaseDate': '2026-02-14',
      'price': 129.00,
      'icon': Icons.directions_run,
      'isExpiringSoon': true,
      'timeLeft': 'Liko 2 dienos grąžinimui',
    },
    {
      'name': 'Dyson Dulkių Siurblys',
      'store': 'Senukai',
      'purchaseDate': '2024-05-10',
      'price': 599.00,
      'icon': Icons.cleaning_services,
      'isExpiringSoon': false,
      'timeLeft': 'Galioja dar 5 mėn.',
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Garantijų Seifas', style: TextStyle(fontWeight: FontWeight.w900)),
        backgroundColor: AppColors.background,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppColors.surface, AppColors.elevated],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
              boxShadow: [
                BoxShadow(color: AppColors.primary.withValues(alpha: 0.1), blurRadius: 20),
              ],
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.2),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.shield, color: AppColors.primary, size: 32),
                ),
                const SizedBox(width: 16),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Apsaugota suma', style: TextStyle(color: AppColors.textSub, fontSize: 12)),
                      Text('1,077.99 €', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
          const Text('TAVO DAIKTAI', style: TextStyle(color: AppColors.textSub, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.5)),
          const SizedBox(height: 16),
          ..._warranties.map((w) => _buildWarrantyCard(w)),
          
          const SizedBox(height: 24),
          GestureDetector(
            onTap: () => context.push('/scanner'),
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.transparent,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.white.withValues(alpha: 0.2), style: BorderStyle.solid), // Flutter doesn't natively support dashed easily without a package, using solid for now
              ),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.qr_code_scanner, color: Colors.white),
                  ),
                  const SizedBox(height: 12),
                  const Text('Pridėti naują garantinį čekį', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 100),
        ],
      ),
    );
  }

  Widget _buildWarrantyCard(Map<String, dynamic> item) {
    final bool isExpiring = item['isExpiringSoon'];
    final statusColor = isExpiring ? AppColors.error : AppColors.green;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isExpiring ? AppColors.error.withValues(alpha: 0.4) : Colors.white.withValues(alpha: 0.05)),
        boxShadow: isExpiring ? [BoxShadow(color: AppColors.error.withValues(alpha: 0.15), blurRadius: 20)] : [],
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(item['icon'], color: Colors.white, size: 24),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(item['name'], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 4),
                      Text('${item['store']} • ${item['price']} €', style: const TextStyle(color: AppColors.textSub, fontSize: 12)),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.receipt_long, color: AppColors.primary),
                  onPressed: () {}, // Open receipt image
                )
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.3),
              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(20)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('PIRKTA', style: TextStyle(color: AppColors.textSub, fontSize: 10, fontWeight: FontWeight.bold)),
                    Text(item['purchaseDate'], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                  ],
                ),
                Container(width: 1, height: 24, color: Colors.white.withValues(alpha: 0.1)),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    const Text('STATUSAS', style: TextStyle(color: AppColors.textSub, fontSize: 10, fontWeight: FontWeight.bold)),
                    Text(item['timeLeft'], style: TextStyle(color: statusColor, fontWeight: FontWeight.w900)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
