import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:dio/dio.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/app_theme.dart';

class ReceiptScanPage extends StatefulWidget {
  const ReceiptScanPage({super.key});
  @override
  State<ReceiptScanPage> createState() => _ReceiptScanPageState();
}

class _ReceiptScanPageState extends State<ReceiptScanPage> {
  final _picker = ImagePicker();
  File? _imageFile;
  String _status = 'Pasirinkite čekio nuotrauką';
  bool _uploading = false;
  bool _analyzing = false;
  Map<String, dynamic>? _report;
  String? _error;

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picked = await _picker.pickImage(
        source: source,
        imageQuality: 90,
        maxWidth: 2000,
      );
      if (picked == null) return;
      setState(() {
        _imageFile = File(picked.path);
        _status = 'Nuotrauka pasirinkta. Paspauskite "Analizuoti".';
        _report = null;
        _error = null;
      });
    } catch (e) {
      setState(() => _error = 'Klaida renkantis nuotrauką: $e');
    }
  }

  Future<void> _analyze() async {
    if (_imageFile == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pirmiausia pasirinkite čekio nuotrauką')),
      );
      return;
    }

    setState(() { _uploading = true; _error = null; _status = 'Įkeliama...'; _report = null; });

    try {
      // Upload receipt
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(
          _imageFile!.path,
          filename: 'receipt.jpg',
        ),
      });

      final uploadRes = await ApiClient().dio.post(
        '/receipts/upload',
        data: formData,
        options: Options(contentType: 'multipart/form-data'),
      );

      final receiptId = uploadRes.data['receipt_id'];
      setState(() {
        _uploading = false;
        _analyzing = true;
        _status = 'Analizuojama... (ID: $receiptId)';
      });

      // Poll status
      String? finalStatus;
      for (int i = 0; i < 14; i++) {
        await Future.delayed(const Duration(milliseconds: 1200));
        try {
          final statusRes = await ApiClient().dio.get('/receipts/$receiptId/status');
          final s = statusRes.data['status'] as String? ?? '';
          final progress = statusRes.data['progress'] ?? 0;
          setState(() => _status = 'Būsena: $s ($progress%)');
          if (['processed', 'finalized', 'needs_confirmation'].contains(s)) {
            finalStatus = s;
            break;
          }
        } catch (_) {}
      }

      if (finalStatus == null) {
        setState(() {
          _analyzing = false;
          _status = 'Vis dar apdorojama. Bandykite vėliau.';
        });
        return;
      }

      // Get report
      final reportRes = await ApiClient().dio.get('/receipts/$receiptId/report');
      setState(() {
        _analyzing = false;
        _report = reportRes.data;
        _status = 'Analizė baigta!';
      });
    } on DioException catch (e) {
      final msg = e.response?.data?['error'] ?? e.message ?? 'Tinklo klaida';
      setState(() {
        _uploading = false;
        _analyzing = false;
        _error = 'Klaida: $msg';
        _status = 'Nepavyko';
      });
    } catch (e) {
      setState(() {
        _uploading = false;
        _analyzing = false;
        _error = 'Klaida: $e';
        _status = 'Nepavyko';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Čekio analizė'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Image preview
            GestureDetector(
              onTap: () => _showSourcePicker(),
              child: Container(
                height: 220,
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: _imageFile != null ? AppColors.primary : Colors.grey[300]!,
                    width: _imageFile != null ? 2 : 1.5,
                    style: _imageFile != null ? BorderStyle.solid : BorderStyle.solid,
                  ),
                ),
                child: _imageFile != null
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(15),
                        child: Image.file(_imageFile!, fit: BoxFit.cover),
                      )
                    : Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.receipt_long, size: 64, color: Colors.grey[400]),
                          const SizedBox(height: 12),
                          Text('Palieskite norėdami pasirinkti čekį',
                              style: TextStyle(color: Colors.grey[500], fontSize: 14)),
                        ],
                      ),
              ),
            ),
            const SizedBox(height: 16),
            // Action buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: (_uploading || _analyzing) ? null : () => _pickImage(ImageSource.camera),
                    icon: const Icon(Icons.camera_alt),
                    label: const Text('Fotografuoti'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      side: const BorderSide(color: AppColors.primary),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: (_uploading || _analyzing) ? null : () => _pickImage(ImageSource.gallery),
                    icon: const Icon(Icons.photo_library),
                    label: const Text('Galerija'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      side: const BorderSide(color: AppColors.primary),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ElevatedButton.icon(
              onPressed: (_uploading || _analyzing || _imageFile == null) ? null : _analyze,
              icon: (_uploading || _analyzing)
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.analytics),
              label: Text(_uploading ? 'Įkeliama...' : _analyzing ? 'Analizuojama...' : 'Analizuoti čekį'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
            ),
            const SizedBox(height: 12),
            // Status
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: _error != null ? Colors.red[50] : Colors.grey[50],
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: _error != null ? Colors.red[200]! : Colors.grey[200]!),
              ),
              child: Text(
                _error ?? _status,
                style: TextStyle(
                  color: _error != null ? Colors.red[700] : Colors.grey[700],
                  fontSize: 13,
                ),
                textAlign: TextAlign.center,
              ),
            ),
            // Report
            if (_report != null) ...[
              const SizedBox(height: 20),
              _ReportView(report: _report!),
            ],
          ],
        ),
      ),
    );
  }

  void _showSourcePicker() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.camera_alt, color: AppColors.primary),
                title: const Text('Fotografuoti'),
                onTap: () { Navigator.pop(context); _pickImage(ImageSource.camera); },
              ),
              ListTile(
                leading: const Icon(Icons.photo_library, color: AppColors.primary),
                title: const Text('Pasirinkti iš galerijos'),
                onTap: () { Navigator.pop(context); _pickImage(ImageSource.gallery); },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ReportView extends StatelessWidget {
  final Map<String, dynamic> report;
  const _ReportView({required this.report});

  @override
  Widget build(BuildContext context) {
    final items = (report['line_items'] as List?)?.cast<Map>() ?? [];
    final savingsTotal = (report['savings_total'] as num?)?.toDouble() ?? 0.0;
    final verifiedRatio = (report['verified_ratio'] as num?)?.toDouble() ?? 0.0;
    final overpaidItems = (report['overpaid_items'] as List?)?.cast<Map>() ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Summary card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.primary.withOpacity(0.08),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.primary.withOpacity(0.3)),
          ),
          child: Row(
            children: [
              Expanded(
                child: _Stat(
                  label: 'Sutaupoma',
                  value: '€${savingsTotal.toStringAsFixed(2)}',
                  positive: savingsTotal > 0,
                ),
              ),
              Expanded(
                child: _Stat(
                  label: 'Patikrinta',
                  value: '${(verifiedRatio * 100).toStringAsFixed(0)}%',
                  positive: verifiedRatio > 0.5,
                ),
              ),
              Expanded(
                child: _Stat(
                  label: 'Permokėta',
                  value: '${overpaidItems.length} prec.',
                  positive: false,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        const Text('Čekio eilutės',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        if (items.isEmpty)
          Container(
            padding: const EdgeInsets.all(20),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: Colors.grey[50],
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey[200]!),
            ),
            child: const Text(
              'Prekės nerastos. Bandykite su aiškesne čekio nuotrauka.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
          )
        else
          ...items.map((item) => _ReceiptItemTile(item: item)).toList(),
      ],
    );
  }
}

class _Stat extends StatelessWidget {
  final String label;
  final String value;
  final bool positive;
  const _Stat({required this.label, required this.value, required this.positive});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value,
            style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: positive ? AppColors.primary : AppColors.textMain)),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textSub)),
      ],
    );
  }
}

class _ReceiptItemTile extends StatelessWidget {
  final Map item;
  const _ReceiptItemTile({required this.item});

  @override
  Widget build(BuildContext context) {
    final savings = (item['savings_eur'] as num?)?.toDouble() ?? 0.0;
    final price = item['price'] != null ? '€${(item['price'] as num).toStringAsFixed(2)}' : '-';
    final bestPrice = item['best_offer_price'] != null
        ? '€${(item['best_offer_price'] as num).toStringAsFixed(2)}'
        : null;
    final store = item['store_chain'] as String?;
    final name = item['product_name'] ?? item['receipt_name'] ?? 'Prekė';
    final isOverpaid = savings > 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: isOverpaid ? Colors.red[50] : Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isOverpaid ? Colors.red[200]! : Colors.grey[200]!,
          width: isOverpaid ? 1.5 : 1,
        ),
      ),
      child: Row(
        children: [
          if (isOverpaid) const Icon(Icons.warning_amber, color: Colors.red, size: 18),
          if (!isOverpaid) const Icon(Icons.check_circle_outline, color: Colors.green, size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                if (store != null)
                  Text('Geriausia: $store${bestPrice != null ? " · $bestPrice" : ""}',
                      style: const TextStyle(fontSize: 11, color: AppColors.textSub)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(price,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
              if (isOverpaid)
                Text('−€${savings.toStringAsFixed(2)}',
                    style: const TextStyle(color: Colors.red, fontSize: 12, fontWeight: FontWeight.w600)),
            ],
          ),
        ],
      ),
    );
  }
}
