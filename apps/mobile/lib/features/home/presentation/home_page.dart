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
    setState(() {
      _isListening = !_isListening;
    });

    if (_isListening) {
      _stopListeningTimer?.cancel();
      _stopListeningTimer = Timer(const Duration(seconds: 4), () {
        if (mounted) {
          setState(() {
            _isListening = false;
          });
        }
      });
    }
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
                          _isListening ? 'Klausau tavęs...' : 'Bakstelėk, kad kalbėtumeisi',
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
