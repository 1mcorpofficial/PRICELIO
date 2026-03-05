import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:async';
import '../../../core/api/api_client.dart';
import '../../../core/theme/app_theme.dart';

class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage> with TickerProviderStateMixin {
  late AnimationController _gasController;
  late AnimationController _cameraController;
  late AnimationController _morphController;
  late AnimationController _dropController;
  
  late Animation<double> _gasOpacity;
  
  // Auth check runs in parallel with the animation; result is awaited
  // before navigation to guarantee the token is resolved.
  late final Future<bool> _authFuture;

  @override
  void initState() {
    super.initState();

    _gasController = AnimationController(vsync: this, duration: const Duration(milliseconds: 2000));
    _cameraController = AnimationController(vsync: this, duration: const Duration(milliseconds: 1500));
    _morphController = AnimationController(vsync: this, duration: const Duration(milliseconds: 1000));
    _dropController = AnimationController(vsync: this, duration: const Duration(milliseconds: 800));

    _gasOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(CurvedAnimation(parent: _gasController, curve: Curves.easeInOut));

    // Start auth check immediately so it runs during the animation.
    _authFuture = _checkAuth();
    _startSequence();
  }

  Future<bool> _checkAuth() async {
    const storage = FlutterSecureStorage();
    final token = await storage.read(key: kTokenKey);
    return token != null && token.isNotEmpty;
  }

  Future<void> _startSequence() async {
    // 1s black screen
    await Future.delayed(const Duration(seconds: 1));

    // Deep gas from corners
    _gasController.forward();
    await Future.delayed(const Duration(milliseconds: 1000));

    // Notch glow appears and drops
    _cameraController.forward();
    await Future.delayed(const Duration(milliseconds: 1500));

    // Torus morphs into P
    _morphController.forward();
    await Future.delayed(const Duration(milliseconds: 1000));

    // Drop falls
    _dropController.forward();
    await Future.delayed(const Duration(milliseconds: 800));

    // Auth result is guaranteed to be resolved by now (5.3s >> storage read).
    // Await just in case device is extremely slow.
    final isAuth = await _authFuture;

    if (mounted) {
      if (isAuth) {
        context.go('/more');
      } else {
        context.go('/login');
      }
    }
  }

  @override
  void dispose() {
    _gasController.dispose();
    _cameraController.dispose();
    _morphController.dispose();
    _dropController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final topPadding = MediaQuery.of(context).padding.top;
    final screenHeight = MediaQuery.of(context).size.height;
    final centerY = screenHeight / 2;

    return Scaffold(
      backgroundColor: Colors.black, // Starts totally black
      body: Stack(
        children: [
          // 1. Deep Gas (4 corners)
          AnimatedBuilder(
            animation: _gasOpacity,
            builder: (context, child) {
              return Opacity(
                opacity: _gasOpacity.value,
                child: Stack(
                  children: [
                    Positioned(top: -100, left: -100, child: _buildGasCloud(AppColors.primary)),
                    Positioned(top: -100, right: -100, child: _buildGasCloud(AppColors.secondary)),
                    Positioned(bottom: -100, left: -100, child: _buildGasCloud(AppColors.secondary)),
                    Positioned(bottom: -100, right: -100, child: _buildGasCloud(AppColors.primary)),
                  ],
                ),
              );
            },
          ),
          
          // 2. Camera Glow & Drop
          AnimatedBuilder(
            animation: _cameraController,
            builder: (context, child) {
              final val = _cameraController.value;
              if (val == 0) return const SizedBox.shrink();
              
              // Starts at notch (topPadding + 10), drops to center
              final currentY = (topPadding + 10) + (centerY - topPadding - 10) * val;
              // Size expands from 20 to 100
              final currentSize = 20.0 + 80.0 * val;
              
              return Positioned(
                top: currentY - currentSize / 2,
                left: MediaQuery.of(context).size.width / 2 - currentSize / 2,
                child: Opacity(
                  opacity: val < 0.2 ? val * 5 : 1.0, // Fade in quickly at the notch
                  child: Container(
                    width: currentSize,
                    height: currentSize,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: val < 0.8 ? AppColors.primary : Colors.transparent,
                      border: val >= 0.8 ? Border.all(color: AppColors.primary, width: 10) : null, // Becomes Torus
                      boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: 0.6), blurRadius: 40)],
                    ),
                  ),
                ),
              );
            },
          ),
          
          // 3. Morph to P
          AnimatedBuilder(
            animation: _morphController,
            builder: (context, child) {
              if (_morphController.value == 0 && _cameraController.isCompleted) {
                // Keep the Torus visible while waiting for morph
                return Center(
                  child: Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.primary, width: 10),
                      boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: 0.6), blurRadius: 40)],
                    ),
                  ),
                );
              }
              if (_morphController.value == 0) return const SizedBox.shrink();
              
              // Fade out Torus, Fade in P
              return Center(
                child: Opacity(
                  opacity: _morphController.value,
                  child: Text(
                    'P',
                    style: TextStyle(
                      fontSize: 80,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                      shadows: [Shadow(color: AppColors.primary.withValues(alpha: 0.8), blurRadius: 30)],
                    ),
                  ),
                ),
              );
            },
          ),

          // 4. The Drop
          AnimatedBuilder(
            animation: _dropController,
            builder: (context, child) {
              if (_dropController.value == 0) return const SizedBox.shrink();
              
              final dropY = centerY + 40 + (screenHeight - centerY - 40) * _dropController.value;
              return Positioned(
                top: dropY,
                left: MediaQuery.of(context).size.width / 2 - 5,
                child: Container(
                  width: 10,
                  height: 20,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(5),
                    boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: 0.8), blurRadius: 10)],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildGasCloud(Color color) {
    return Container(
      width: 350,
      height: 350,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: RadialGradient(
          colors: [color.withValues(alpha: 0.3), Colors.transparent],
        ),
      ),
    );
  }
}
