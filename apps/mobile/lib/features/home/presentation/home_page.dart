import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:async';
import '../../../core/theme/app_theme.dart';
import '../../../core/api/api_client.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});
  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> with SingleTickerProviderStateMixin {
  bool _isListening = false;
  late AnimationController _breatheController;
  late Animation<double> _breatheAnimation;
  Timer? _stopListeningTimer;
  int _lifetimeXp = 0;

  @override
  void initState() {
    super.initState();
    _breatheController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);

    _breatheAnimation = Tween<double>(begin: 1.0, end: 1.05).animate(
      CurvedAnimation(parent: _breatheController, curve: Curves.easeInOut),
    );
    _loadXp();
  }

  Future<void> _loadXp() async {
    try {
      final res = await ApiClient().dio.get('/me/gamification');
      final data = res.data as Map<String, dynamic>? ?? {};
      if (!mounted) return;
      setState(() {
        _lifetimeXp = (data['lifetime_xp'] as num?)?.toInt() ?? 0;
      });
    } catch (_) {}
  }

  @override
  void dispose() {
    _breatheController.dispose();
    _stopListeningTimer?.cancel();
    super.dispose();
  }

  void _handlePClick() {
    HapticFeedback.mediumImpact();
    _showInputSheet();
  }

  void _showInputSheet() {
    final controller = TextEditingController();
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: Container(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
          decoration: const BoxDecoration(
            color: Color(0xFF1A1A2E),
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Klausk P',
                style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: controller,
                      autofocus: true,
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        hintText: 'Klausk P apie kainas...',
                        hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.4)),
                        filled: true,
                        fillColor: Colors.white.withValues(alpha: 0.07),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      ),
                      onSubmitted: (text) {
                        if (text.trim().isEmpty) return;
                        Navigator.pop(ctx);
                        _askAssistant(text.trim());
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  GestureDetector(
                    onTap: () {
                      final text = controller.text.trim();
                      if (text.isEmpty) return;
                      Navigator.pop(ctx);
                      _askAssistant(text);
                    },
                    child: Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: const Color(0xFF4361EE),
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: [
                          BoxShadow(color: const Color(0xFF4361EE).withValues(alpha: 0.4), blurRadius: 12),
                        ],
                      ),
                      child: const Icon(Icons.send, color: Colors.white, size: 20),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _askAssistant(String message) async {
    setState(() => _isListening = true);
    try {
      final res = await ApiClient().dio.post(
        '/ai/assistant',
        data: {'message': message, 'context': 'price_assistant'},
      );
      final body = res.data as Map<String, dynamic>? ?? {};
      final reply = (body['reply'] ?? body['data']?['reply'] ?? '').toString();
      if (!mounted) return;
      _showAiResponse(reply.isNotEmpty ? reply : 'P negavo atsakymo. Bandyk dar kartą.');
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('P šiuo metu nepasiekiamas. Bandyk vėliau.')),
      );
    } finally {
      if (mounted) setState(() => _isListening = false);
    }
  }

  void _showAiResponse(String reply) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.5,
        minChildSize: 0.3,
        maxChildSize: 0.85,
        expand: false,
        builder: (_, scrollController) => Container(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
          decoration: const BoxDecoration(
            color: Color(0xFF1A1A2E),
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Text(
                    'P',
                    style: TextStyle(
                      color: Color(0xFF4361EE),
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Atsakymas',
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.6), fontSize: 14),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Expanded(
                child: SingleChildScrollView(
                  controller: scrollController,
                  child: Text(
                    reply,
                    style: const TextStyle(color: Colors.white, fontSize: 16, height: 1.6),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  style: TextButton.styleFrom(
                    backgroundColor: Colors.white.withValues(alpha: 0.07),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: const Text('Uždaryti', style: TextStyle(color: Colors.white)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // Subtilus radialinis gradientas fone
          Positioned(
            top: -100,
            left: -100,
            child: Container(
              width: 400,
              height: 400,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [AppColors.primary.withValues(alpha: 0.15), Colors.transparent],
                  stops: const [0.0, 1.0],
                ),
              ),
            ),
          ),
          Positioned(
            bottom: -50,
            right: -50,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [AppColors.secondary.withValues(alpha: 0.1), Colors.transparent],
                  stops: const [0.0, 1.0],
                ),
              ),
            ),
          ),
          
          SafeArea(
            child: Column(
              children: [
                _buildTopBar(),
                Expanded(
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _buildPAssistant(),
                        const SizedBox(height: 40),
                        Text(
                          _isListening ? 'Analizuoju...' : 'Bakstelėk, kad klaustum P',
                          style: TextStyle(
                            color: _isListening ? AppColors.textMain : AppColors.textSub,
                            fontSize: 16,
                            fontWeight: FontWeight.w500,
                            letterSpacing: 1.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTopBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 10,
                height: 10,
                decoration: const BoxDecoration(
                  color: AppColors.secondary,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(color: AppColors.secondary, blurRadius: 10)
                  ],
                ),
              ),
              const SizedBox(width: 8),
              const Text(
                'PRICELIO',
                style: TextStyle(
                  color: AppColors.textMain,
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 2.0,
                ),
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.surface.withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              children: [
                const Icon(Icons.star, color: AppColors.primary, size: 16),
                const SizedBox(width: 6),
                Text(
                  _lifetimeXp >= 1000
                      ? '${(_lifetimeXp / 1000).toStringAsFixed(1)}K XP'
                      : '$_lifetimeXp XP',
                  style: const TextStyle(
                    color: AppColors.textMain,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPAssistant() {
    return GestureDetector(
      onTap: _handlePClick,
      child: AnimatedBuilder(
        animation: _breatheAnimation,
        builder: (context, child) {
          final scale = _isListening ? 1.05 : _breatheAnimation.value;
          return Transform.scale(
            scale: scale,
            child: Container(
              width: 180,
              height: 180,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    AppColors.surface.withValues(alpha: 0.8),
                    AppColors.elevated.withValues(alpha: 0.9),
                  ],
                ),
                border: Border.all(
                  color: _isListening ? AppColors.primary : AppColors.border,
                  width: _isListening ? 2 : 1,
                ),
                boxShadow: [
                  BoxShadow(
                    color: _isListening 
                        ? AppColors.primary.withValues(alpha: 0.4) 
                        : Colors.black.withValues(alpha: 0.5),
                    blurRadius: _isListening ? 40 : 30,
                    spreadRadius: _isListening ? 10 : 0,
                    offset: const Offset(0, 10),
                  ),
                  if (_isListening)
                    BoxShadow(
                      color: AppColors.secondary.withValues(alpha: 0.2),
                      blurRadius: 60,
                      spreadRadius: 20,
                    ),
                ],
              ),
              child: Center(
                child: Text(
                  'P',
                  style: TextStyle(
                    fontSize: 80,
                    fontWeight: FontWeight.w900,
                    color: AppColors.textMain,
                    shadows: [
                      Shadow(
                        color: Colors.white.withValues(alpha: 0.3),
                        blurRadius: 20,
                      )
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
