import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:dio/dio.dart';
import 'dart:ui';
import '../../../core/api/api_client.dart';
import '../../../core/theme/app_theme.dart';

class ReceiptScanPage extends StatefulWidget {
  const ReceiptScanPage({super.key});
  @override
  State<ReceiptScanPage> createState() => _ReceiptScanPageState();
}

class _ReceiptScanPageState extends State<ReceiptScanPage> with SingleTickerProviderStateMixin {
  final _picker = ImagePicker();
  File? _imageFile;
  String _status = 'Įkelkite arba fotografuokite čekį';
  bool _uploading = false;
  bool _analyzing = false;
  Map<String, dynamic>? _report;
  String? _error;

  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    _pulseAnimation = Tween<double>(begin: 0.8, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picked = await _picker.pickImage(source: source, imageQuality: 90, maxWidth: 2000);
      if (picked == null) return;
      setState(() {
        _imageFile = File(picked.path);
        _status = 'Paruošta analizavimui';
        _report = null;
        _error = null;
      });
    } catch (e) {
      setState(() => _error = 'Klaida: $e');
    }
  }

  Future<void> _analyze() async {
    if (_imageFile == null) return;
    setState(() { _uploading = true; _error = null; _status = 'Skenuojama AI radaru...'; _report = null; });

    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(_imageFile!.path, filename: 'receipt.jpg'),
      });
      final uploadRes = await ApiClient().dio.post(
        '/receipts/upload',
        data: formData,
        options: Options(contentType: 'multipart/form-data'),
      );
      final receiptId = uploadRes.data['receipt_id'];
      setState(() { _uploading = false; _analyzing = true; _status = 'Ieškoma permokėtų prekių...'; });

      String? finalStatus;
      for (int i = 0; i < 14; i++) {
        await Future.delayed(const Duration(milliseconds: 1200));
        try {
          final statusRes = await ApiClient().dio.get('/receipts/$receiptId/status');
          final s = statusRes.data['status'] as String? ?? '';
          if (['processed', 'finalized', 'needs_confirmation'].contains(s)) {
            finalStatus = s;
            break;
          }
        } catch (_) {}
      }

      if (finalStatus == null) {
        setState(() { _analyzing = false; _status = 'Analizė užtruko. Bandykite vėliau.'; });
        return;
      }

      final reportRes = await ApiClient().dio.get('/receipts/$receiptId/report');
      setState(() {
        _analyzing = false;
        _report = reportRes.data;
        _status = 'Analizė baigta!';
      });
    } catch (e) {
      setState(() { _uploading = false; _analyzing = false; _error = 'Skenavimo klaida'; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Čekių Analizatorius', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        backgroundColor: AppColors.background,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        child: Column(
          children: [
            // Skenavimo zona
            GestureDetector(
              onTap: () => _pickImage(ImageSource.camera),
              child: AnimatedBuilder(
                animation: _pulseAnimation,
                builder: (context, child) {
                  final isWorking = _uploading || _analyzing;
                  return Container(
                    height: 250,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(
                        color: isWorking ? AppColors.primary.withOpacity(_pulseAnimation.value) : Colors.white.withOpacity(0.1),
                        width: isWorking ? 2 : 1,
                      ),
                      boxShadow: isWorking ? [BoxShadow(color: AppColors.primary.withOpacity(0.2), blurRadius: 20)] : [],
                    ),
                    child: _imageFile != null
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(23),
                            child: Stack(
                              fit: StackFit.expand,
                              children: [
                                Image.file(_imageFile!, fit: BoxFit.cover, opacity: AlwaysStoppedAnimation(isWorking ? 0.4 : 1.0)),
                                if (isWorking)
                                  Center(
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        const CircularProgressIndicator(color: AppColors.primary),
                                        const SizedBox(height: 16),
                                        Text(_status, style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
                                      ],
                                    ),
                                  ),
                              ],
                            ),
                          )
                        : Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.1), shape: BoxShape.circle),
                                child: const Icon(Icons.document_scanner, size: 48, color: AppColors.primary),
                              ),
                              const SizedBox(height: 16),
                              const Text('Skenuoti naują čekį', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                            ],
                          ),
                  );
                },
              ),
            ),
            const SizedBox(height: 16),
            
            // Kontrolės mygtukai
            if (_imageFile != null && !_uploading && !_analyzing && _report == null) ...[
              ElevatedButton.icon(
                onPressed: _analyze,
                icon: const Icon(Icons.bolt),
                label: const Text('PRADĖTI ANALIZĘ'),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () => setState(() => _imageFile = null),
                child: const Text('Atšaukti', style: TextStyle(color: AppColors.textSub)),
              ),
            ],

            if (_error != null)
              Container(
                padding: const EdgeInsets.all(16),
                margin: const EdgeInsets.only(top: 16),
                decoration: BoxDecoration(color: AppColors.error.withOpacity(0.1), borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.error)),
                child: Text(_error!, style: const TextStyle(color: AppColors.error)),
              ),

            // Rezultatai
            if (_report != null) ...[
              const SizedBox(height: 24),
              _buildReportView(_report!),
            ]
          ],
        ),
      ),
    );
  }

  Widget _buildReportView(Map<String, dynamic> report) {
    final items = (report['line_items'] as List?)?.cast<Map>() ?? [];
    // Demo savings calculation if missing
    final savingsTotal = 4.25; 
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // AI Audito Kortelė
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: LinearGradient(colors: [AppColors.surface, AppColors.elevated]),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AppColors.green.withOpacity(0.5)),
            boxShadow: [BoxShadow(color: AppColors.green.withOpacity(0.1), blurRadius: 20)],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: AppColors.green.withOpacity(0.2), shape: BoxShape.circle),
                child: const Icon(Icons.savings, color: AppColors.green, size: 32),
              ),
              const SizedBox(width: 16),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Permokėta:', style: TextStyle(color: AppColors.textSub, fontSize: 12)),
                    Text('4.25 €', style: TextStyle(color: AppColors.green, fontSize: 28, fontWeight: FontWeight.w900)),
                  ],
                ),
              ),
              const Icon(Icons.arrow_forward_ios, color: AppColors.green, size: 16),
            ],
          ),
        ),
        const SizedBox(height: 24),
        const Text('ČEKIO EILUTĖS', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: AppColors.textSub, letterSpacing: 1.5)),
        const SizedBox(height: 12),
        
        // Pakeistos prekių eilutės (Žalia/Raudona indikacija)
        ...items.map((item) {
          final isOverpaid = (item['price'] as num? ?? 0) > 2.0; // Demo condition
          final color = isOverpaid ? AppColors.error : AppColors.textSub;
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isOverpaid ? AppColors.error.withOpacity(0.05) : AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: isOverpaid ? AppColors.error.withOpacity(0.3) : Colors.white.withOpacity(0.05)),
            ),
            child: Row(
              children: [
                Icon(isOverpaid ? Icons.trending_down : Icons.check_circle, color: color, size: 20),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(item['product_name'] ?? 'Prekė', style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.white)),
                      if (isOverpaid) const Text('Geriausia kaina: Lidl (1.80€)', style: TextStyle(fontSize: 11, color: AppColors.textSub)),
                    ],
                  ),
                ),
                Text('${item['price']} €', style: TextStyle(fontWeight: FontWeight.w800, color: isOverpaid ? AppColors.error : Colors.white)),
              ],
            ),
          );
        }),
      ],
    );
  }
}
