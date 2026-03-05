import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../core/api/api_client.dart';

// ─── Constants ────────────────────────────────────────────────────────────────

const _kPlasmaColors = [
  Color(0xFFFF6B35),
  Color(0xFFFFD23F),
  Color(0xFFFF3366),
  Color(0xFF4361EE),
  Color(0xFF4CC9F0),
  Color(0xFFFF85A1),
  Color(0xFFFFAA80),
  Color(0xFFB8A9FF),
  Color(0xFFA8EDCE),
  Color(0xFFFFE566),
];

const _kFirstLaunchKey = 'pricelio_first_launch_done';
const _kBg = Color(0xFF1A1A2E);

Color _lerpColor(double t) {
  const n = 10;
  final scaled = t * n;
  final i = scaled.floor() % n;
  final j = (i + 1) % n;
  return Color.lerp(_kPlasmaColors[i], _kPlasmaColors[j], scaled - scaled.floor())!;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

class _SplashConfig {
  final bool isFirst;
  final bool isAuth;
  const _SplashConfig({required this.isFirst, required this.isAuth});
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage> {
  late final Future<_SplashConfig> _config;

  @override
  void initState() {
    super.initState();
    _config = _load();
  }

  Future<_SplashConfig> _load() async {
    const storage = FlutterSecureStorage();
    final results = await Future.wait([
      storage.read(key: _kFirstLaunchKey),
      storage.read(key: kTokenKey),
    ]);
    final isFirst = results[0] == null;
    final isAuth = results[1] != null && results[1]!.isNotEmpty;
    if (isFirst) {
      await storage.write(key: _kFirstLaunchKey, value: 'true');
    }
    return _SplashConfig(isFirst: isFirst, isAuth: isAuth);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<_SplashConfig>(
      future: _config,
      builder: (context, snap) {
        if (!snap.hasData) {
          return const Scaffold(backgroundColor: _kBg);
        }
        final cfg = snap.data!;
        if (cfg.isFirst) {
          return _FirstSplash(isAuth: cfg.isAuth);
        }
        return _ReturnSplash(isAuth: cfg.isAuth);
      },
    );
  }
}

// ─── Scenario A: First Launch (8s) ───────────────────────────────────────────

class _FirstSplash extends StatefulWidget {
  final bool isAuth;
  const _FirstSplash({required this.isAuth});

  @override
  State<_FirstSplash> createState() => _FirstSplashState();
}

class _FirstSplashState extends State<_FirstSplash> with TickerProviderStateMixin {
  late final AnimationController _lightningCtrl;
  late final AnimationController _drop1Ctrl;
  late final AnimationController _circleCtrl;
  late final AnimationController _pGlowCtrl;
  late final AnimationController _drop2Ctrl;
  late final AnimationController _waveCtrl;
  late final AnimationController _colorsCtrl;

  late final Animation<double> _dropY;
  late final Animation<double> _dropSize;
  late final Animation<double> _circleRotation;
  late final Animation<double> _morphToP;
  late final Animation<double> _pGlow;
  late final Animation<double> _drop2Y;
  late final Animation<double> _waveProgress;

  bool _navigationDone = false;

  @override
  void initState() {
    super.initState();

    _lightningCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 2000));
    _drop1Ctrl     = AnimationController(vsync: this, duration: const Duration(milliseconds: 1500));
    _circleCtrl    = AnimationController(vsync: this, duration: const Duration(milliseconds: 4000));
    _pGlowCtrl     = AnimationController(vsync: this, duration: const Duration(milliseconds: 800));
    _drop2Ctrl     = AnimationController(vsync: this, duration: const Duration(milliseconds: 700));
    _waveCtrl      = AnimationController(vsync: this, duration: const Duration(milliseconds: 700));
    _colorsCtrl    = AnimationController(vsync: this, duration: const Duration(milliseconds: 3000))..repeat();

    _dropY    = Tween<double>(begin: 0, end: 1).animate(CurvedAnimation(parent: _drop1Ctrl, curve: Curves.easeIn));
    _dropSize = Tween<double>(begin: 18, end: 88).animate(CurvedAnimation(parent: _drop1Ctrl, curve: Curves.easeOut));

    _circleRotation = Tween<double>(begin: 0, end: 4 * math.pi).animate(
      CurvedAnimation(parent: _circleCtrl, curve: const Interval(0, 0.65, curve: Curves.easeInOut)),
    );
    _morphToP = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _circleCtrl, curve: const Interval(0.65, 1.0, curve: Curves.elasticOut)),
    );

    _pGlow        = Tween<double>(begin: 0.2, end: 1.0).animate(CurvedAnimation(parent: _pGlowCtrl, curve: Curves.easeOut));
    _drop2Y       = Tween<double>(begin: 0, end: 1).animate(CurvedAnimation(parent: _drop2Ctrl, curve: Curves.easeIn));
    _waveProgress = Tween<double>(begin: 0, end: 1).animate(CurvedAnimation(parent: _waveCtrl, curve: Curves.easeOut));

    _run();
  }

  Future<void> _run() async {
    await Future.delayed(const Duration(milliseconds: 300));
    _lightningCtrl.forward();

    await Future.delayed(const Duration(milliseconds: 500)); // 0.8s total
    _drop1Ctrl.forward();

    await Future.delayed(const Duration(milliseconds: 1200)); // 2.0s total
    _circleCtrl.forward();

    await Future.delayed(const Duration(milliseconds: 2600)); // 4.6s total
    _pGlowCtrl.forward();

    await Future.delayed(const Duration(milliseconds: 1400)); // 6.0s total
    _drop2Ctrl.forward();

    await Future.delayed(const Duration(milliseconds: 700)); // 6.7s total
    _waveCtrl.forward();

    await Future.delayed(const Duration(milliseconds: 700)); // 7.4s total
    _navigate();
  }

  void _navigate() {
    if (_navigationDone || !mounted) return;
    _navigationDone = true;
    context.go(widget.isAuth ? '/home' : '/login');
  }

  @override
  void dispose() {
    _lightningCtrl.dispose();
    _drop1Ctrl.dispose();
    _circleCtrl.dispose();
    _pGlowCtrl.dispose();
    _drop2Ctrl.dispose();
    _waveCtrl.dispose();
    _colorsCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final media      = MediaQuery.of(context);
    final topPadding = media.padding.top;
    final screenWidth  = media.size.width;
    final screenHeight = media.size.height;
    final centerX = screenWidth / 2;
    final centerY = screenHeight / 2;

    return Scaffold(
      backgroundColor: _kBg,
      body: AnimatedBuilder(
        animation: _colorsCtrl,
        builder: (context, _) {
          final cv = _colorsCtrl.value;
          return Stack(
            children: [
              // 1. Lightning around camera notch
              Positioned(
                top: 0, left: 0, right: 0,
                height: topPadding + 70,
                child: AnimatedBuilder(
                  animation: _lightningCtrl,
                  builder: (_, __) => CustomPaint(
                    painter: _LightningPainter(
                      progress: _lightningCtrl.value,
                      centerX: centerX,
                      topPadding: topPadding,
                      cv: cv,
                    ),
                  ),
                ),
              ),

              // 2. Drop 1: camera → center
              AnimatedBuilder(
                animation: _drop1Ctrl,
                builder: (_, __) {
                  if (_drop1Ctrl.value == 0) return const SizedBox.shrink();
                  final startY   = topPadding + 22;
                  final endY     = centerY;
                  final currentY = startY + (endY - startY) * _dropY.value;
                  final size     = _dropSize.value;
                  return Positioned(
                    top:  currentY - size / 2,
                    left: centerX - size / 2,
                    child: _Droplet(size: size, cv: cv),
                  );
                },
              ),

              // 3+4. Circle → morph → P glow (single merged builder)
              AnimatedBuilder(
                animation: Listenable.merge([_circleCtrl, _pGlowCtrl]),
                builder: (_, __) {
                  if (_circleCtrl.value == 0) return const SizedBox.shrink();

                  // Phase 3b: pGlow controller took over — show full-glow P
                  if (_pGlowCtrl.value > 0) {
                    return Center(
                      child: _PlasmaP(cv: cv, glow: _pGlow.value, fontSize: 100),
                    );
                  }

                  final morph = _morphToP.value;

                  // Phase 3a: morph complete → show P with morph progress as glow
                  if (morph > 0.4) {
                    return Center(
                      child: _PlasmaP(
                        cv: cv,
                        glow: morph.clamp(0.0, 1.0),
                        fontSize: 80 + 20 * morph,
                      ),
                    );
                  }

                  // Phase 3: spinning circle
                  return Center(
                    child: Transform.rotate(
                      angle: _circleRotation.value,
                      child: CustomPaint(
                        size: const Size(160, 160),
                        painter: _CirclePainter(cv: cv),
                      ),
                    ),
                  );
                },
              ),

              // 5. Drop 2: P → bottom
              AnimatedBuilder(
                animation: _drop2Ctrl,
                builder: (_, __) {
                  if (_drop2Ctrl.value == 0) return const SizedBox.shrink();
                  final startY   = centerY + 50;
                  final endY     = screenHeight - 110;
                  final currentY = startY + (endY - startY) * _drop2Y.value;
                  return Positioned(
                    top:  currentY - 6,
                    left: centerX - 6,
                    child: _Droplet(size: 12, cv: cv),
                  );
                },
              ),

              // 6. Wave at bottom
              Positioned(
                bottom: 0, left: 0, right: 0,
                height: 100,
                child: AnimatedBuilder(
                  animation: _waveCtrl,
                  builder: (_, __) {
                    if (_waveCtrl.value == 0) return const SizedBox.shrink();
                    return CustomPaint(
                      painter: _WavePainter(
                        progress: _waveProgress.value,
                        screenWidth: screenWidth,
                        cv: cv,
                      ),
                    );
                  },
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

// ─── Scenario B: Return Launch (~3.5s) ───────────────────────────────────────

class _ReturnSplash extends StatefulWidget {
  final bool isAuth;
  const _ReturnSplash({required this.isAuth});

  @override
  State<_ReturnSplash> createState() => _ReturnSplashState();
}

class _ReturnSplashState extends State<_ReturnSplash> with TickerProviderStateMixin {
  late final AnimationController _breatheCtrl;
  late final AnimationController _wakeCtrl;
  late final AnimationController _burstCtrl;
  late final AnimationController _colorsCtrl;

  late final Animation<double> _bScale;
  late final Animation<double> _bOpacity;
  late final Animation<double> _wRise;
  late final Animation<double> _wScale;
  late final Animation<double> _wGlow;
  late final Animation<double> _burstRadius;

  bool _navigationDone = false;

  @override
  void initState() {
    super.initState();

    _breatheCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 2500))
      ..repeat(reverse: true);
    _wakeCtrl  = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200));
    _burstCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 800));
    _colorsCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 3000))
      ..repeat();

    _bScale   = Tween<double>(begin: 0.45, end: 0.55).animate(CurvedAnimation(parent: _breatheCtrl, curve: Curves.easeInOut));
    _bOpacity = Tween<double>(begin: 0.25, end: 0.45).animate(CurvedAnimation(parent: _breatheCtrl, curve: Curves.easeInOut));
    _wRise    = Tween<double>(begin: 30.0, end: 0.0).animate(CurvedAnimation(parent: _wakeCtrl, curve: Curves.easeOutCubic));
    _wScale   = Tween<double>(begin: 0.5,  end: 1.0).animate(CurvedAnimation(parent: _wakeCtrl, curve: Curves.elasticOut));
    _wGlow    = Tween<double>(begin: 0.0,  end: 1.0).animate(CurvedAnimation(parent: _wakeCtrl, curve: Curves.easeOut));

    _burstRadius = Tween<double>(begin: 0, end: 1.5).animate(
      CurvedAnimation(parent: _burstCtrl, curve: Curves.easeOut),
    );

    _run();
  }

  Future<void> _run() async {
    await Future.delayed(const Duration(milliseconds: 2000));
    _breatheCtrl.stop();
    _wakeCtrl.forward();

    await Future.delayed(const Duration(milliseconds: 800)); // 2.8s total
    _burstCtrl.forward();

    await Future.delayed(const Duration(milliseconds: 600)); // 3.4s total
    _navigate();
  }

  void _navigate() {
    if (_navigationDone || !mounted) return;
    _navigationDone = true;
    context.go(widget.isAuth ? '/home' : '/login');
  }

  @override
  void dispose() {
    _breatheCtrl.dispose();
    _wakeCtrl.dispose();
    _burstCtrl.dispose();
    _colorsCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final media      = MediaQuery.of(context);
    final screenWidth  = media.size.width;
    final screenHeight = media.size.height;
    final centerX = screenWidth / 2;
    final centerY = screenHeight / 2;

    return Scaffold(
      backgroundColor: _kBg,
      body: AnimatedBuilder(
        animation: _colorsCtrl,
        builder: (context, _) {
          final cv = _colorsCtrl.value;
          return Stack(
            children: [
              // 1. Sleeping / Waking P
              AnimatedBuilder(
                animation: Listenable.merge([_breatheCtrl, _wakeCtrl]),
                builder: (_, __) {
                  final isWaking = _wakeCtrl.value > 0;
                  final scale   = isWaking ? _wScale.value  : _bScale.value;
                  final opacity = isWaking ? 1.0            : _bOpacity.value;
                  final yOffset = isWaking ? _wRise.value   : 30.0;
                  final glow    = isWaking ? _wGlow.value   : 0.3;
                  return Positioned(
                    top:  centerY - 60 + yOffset,
                    left: centerX - 60,
                    child: Opacity(
                      opacity: opacity,
                      child: Transform.scale(
                        scale: scale,
                        child: _PlasmaP(cv: cv, glow: glow, fontSize: 80),
                      ),
                    ),
                  );
                },
              ),

              // 2. Rainbow burst
              AnimatedBuilder(
                animation: _burstCtrl,
                builder: (_, __) {
                  if (_burstCtrl.value == 0) return const SizedBox.shrink();
                  return SizedBox.expand(
                    child: CustomPaint(
                      painter: _BurstPainter(
                        progress: _burstCtrl.value,
                        radius: _burstRadius.value * screenWidth * 1.2,
                        centerX: centerX,
                        centerY: centerY,
                      ),
                    ),
                  );
                },
              ),
            ],
          );
        },
      ),
    );
  }
}

// ─── _PlasmaP ─────────────────────────────────────────────────────────────────

class _PlasmaP extends StatelessWidget {
  final double cv;
  final double glow;
  final double fontSize;

  const _PlasmaP({required this.cv, required this.glow, this.fontSize = 80});

  @override
  Widget build(BuildContext context) {
    final c1 = _lerpColor(cv);
    final c2 = _lerpColor((cv + 0.35) % 1.0);
    final c3 = _lerpColor((cv + 0.65) % 1.0);

    return Container(
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: c1.withValues(alpha: glow * 0.6),
            blurRadius: 40 * glow,
            spreadRadius: 10 * glow,
          ),
          BoxShadow(
            color: c2.withValues(alpha: glow * 0.3),
            blurRadius: 70 * glow,
            spreadRadius: 20 * glow,
          ),
        ],
      ),
      child: ShaderMask(
        shaderCallback: (bounds) => LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [c1, c2, c3],
        ).createShader(bounds),
        child: Text(
          'P',
          style: TextStyle(
            fontSize: fontSize,
            fontWeight: FontWeight.w900,
            color: Colors.white,
            shadows: [Shadow(color: c1.withValues(alpha: glow), blurRadius: 20)],
          ),
        ),
      ),
    );
  }
}

// ─── _Droplet ─────────────────────────────────────────────────────────────────

class _Droplet extends StatelessWidget {
  final double size;
  final double cv;

  const _Droplet({required this.size, required this.cv});

  @override
  Widget build(BuildContext context) {
    final color = _lerpColor(cv);
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: RadialGradient(
          colors: [Colors.white, color, Colors.transparent],
        ),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.7),
            blurRadius: size * 0.8,
            spreadRadius: size * 0.15,
          ),
        ],
      ),
    );
  }
}

// ─── _LightningPainter ────────────────────────────────────────────────────────

class _LightningPainter extends CustomPainter {
  final double progress;
  final double centerX;
  final double topPadding;
  final double cv;

  const _LightningPainter({
    required this.progress,
    required this.centerX,
    required this.topPadding,
    required this.cv,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (progress == 0) return;
    final cameraY = topPadding + 22;
    for (int i = 0; i < 8; i++) {
      final phase      = (i / 8) * 2 * math.pi;
      final radius     = 22.0 + i * 4.0;
      final color      = _kPlasmaColors[i % 10];
      final arcProgress = (progress - i * 0.05).clamp(0.0, 1.0);
      if (arcProgress == 0) continue;

      final paint = Paint()
        ..color       = color.withValues(alpha: arcProgress * 0.85)
        ..strokeWidth = 2.5
        ..strokeCap   = StrokeCap.round
        ..style       = PaintingStyle.stroke;

      final rect = Rect.fromCircle(center: Offset(centerX, cameraY), radius: radius);
      canvas.drawArc(rect, phase, 2 * math.pi * arcProgress, false, paint);
    }
  }

  @override
  bool shouldRepaint(_LightningPainter old) =>
      old.progress != progress || old.cv != cv;
}

// ─── _CirclePainter ───────────────────────────────────────────────────────────

class _CirclePainter extends CustomPainter {
  final double cv;

  const _CirclePainter({required this.cv});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 8;
    final c1 = _lerpColor(cv);
    final c2 = _lerpColor((cv + 0.5) % 1.0);
    final sweepRect = Rect.fromCircle(center: center, radius: radius);

    // Glow layer
    final glowPaint = Paint()
      ..shader = SweepGradient(colors: [
        c1.withValues(alpha: 0.25),
        c2.withValues(alpha: 0.25),
        Colors.transparent,
      ]).createShader(sweepRect)
      ..strokeWidth = 16
      ..style = PaintingStyle.stroke
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 12);
    canvas.drawCircle(center, radius, glowPaint);

    // Main arc
    final paint = Paint()
      ..shader = SweepGradient(colors: [c1, c2, Colors.transparent]).createShader(sweepRect)
      ..strokeWidth = 8
      ..style = PaintingStyle.stroke;
    canvas.drawCircle(center, radius, paint);
  }

  @override
  bool shouldRepaint(_CirclePainter old) => old.cv != cv;
}

// ─── _WavePainter ─────────────────────────────────────────────────────────────

class _WavePainter extends CustomPainter {
  final double progress;
  final double screenWidth;
  final double cv;

  const _WavePainter({required this.progress, required this.screenWidth, required this.cv});

  @override
  void paint(Canvas canvas, Size size) {
    if (progress == 0) return;
    final c1 = _lerpColor(cv);
    final c2 = _lerpColor((cv + 0.5) % 1.0);

    final waveWidth = screenWidth * progress;
    final startX    = (screenWidth - waveWidth) / 2;

    final path = Path()..moveTo(startX, size.height);
    for (double x = 0; x <= waveWidth; x++) {
      final rel = waveWidth > 0 ? x / waveWidth : 0;
      final y = size.height * 0.4 + math.sin(rel * math.pi * 4) * 7;
      path.lineTo(startX + x, y);
    }
    path.lineTo(startX + waveWidth, size.height);
    path.close();

    final paint = Paint()
      ..shader = LinearGradient(
        colors: [
          Colors.transparent,
          c1.withValues(alpha: 0.7),
          c2.withValues(alpha: 1.0),
          c1.withValues(alpha: 0.7),
          Colors.transparent,
        ],
        stops: const [0.0, 0.25, 0.5, 0.75, 1.0],
      ).createShader(Rect.fromLTWH(startX, 0, waveWidth, size.height));

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(_WavePainter old) =>
      old.progress != progress || old.cv != cv;
}

// ─── _BurstPainter ────────────────────────────────────────────────────────────

class _BurstPainter extends CustomPainter {
  final double progress;
  final double radius;
  final double centerX;
  final double centerY;

  const _BurstPainter({
    required this.progress,
    required this.radius,
    required this.centerX,
    required this.centerY,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (progress == 0 || radius == 0) return;
    final opacity = (1 - progress).clamp(0.0, 1.0);
    final center  = Offset(centerX, centerY);
    const sliceAngle = 2 * math.pi / 10;

    for (int i = 0; i < 10; i++) {
      final color      = _kPlasmaColors[i];
      final startAngle = i * sliceAngle;

      final paint = Paint()
        ..shader = RadialGradient(
          colors: [color.withValues(alpha: opacity), Colors.transparent],
        ).createShader(Rect.fromCircle(center: center, radius: radius));

      final path = Path()
        ..moveTo(centerX, centerY)
        ..arcTo(
          Rect.fromCircle(center: center, radius: radius),
          startAngle,
          sliceAngle,
          false,
        )
        ..close();

      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(_BurstPainter old) =>
      old.progress != progress || old.radius != radius;
}
