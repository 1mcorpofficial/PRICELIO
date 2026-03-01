import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';

class MorePage extends StatelessWidget {
  const MorePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          // Subtilus radialinis gradientas fone
          Positioned(
            top: -150,
            left: -100,
            child: Container(
              width: 400,
              height: 400,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [AppColors.secondary.withValues(alpha: 0.1), Colors.transparent],
                ),
              ),
            ),
          ),
          
          SafeArea(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Padding(
                  padding: EdgeInsets.fromLTRB(24, 32, 24, 20),
                  child: Text(
                    'Daugiau įrankių',
                    style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: Colors.white),
                  ),
                ),
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 100), // Padding for bottom nav
                    children: [
                      _buildBubbleItem(
                        context: context,
                        icon: Icons.emoji_events_outlined,
                        title: 'Misijos',
                        desc: 'Vykdyk užduotis ir rink XP',
                        color: AppColors.primary,
                        route: '/missions',
                        delay: 0,
                      ),
                      _buildBubbleItem(
                        context: context,
                        icon: Icons.child_care,
                        title: 'Kids Space',
                        desc: 'Vaikų erdvė ir edukacija',
                        color: AppColors.secondary,
                        route: '/kids',
                        delay: 1,
                      ),
                      _buildBubbleItem(
                        context: context,
                        icon: Icons.shield_outlined,
                        title: 'Garantijų Seifas',
                        desc: 'Tavo skaitmeniniai čekiai',
                        color: AppColors.green,
                        route: '/warranty', // Fixed route
                        delay: 2,
                      ),
                      _buildBubbleItem(
                        context: context,
                        icon: Icons.kitchen_outlined,
                        title: 'Smart Pantry',
                        desc: 'Namų spintelė ir likučiai',
                        color: Colors.orangeAccent,
                        route: '/basket',
                        delay: 3,
                      ),
                      _buildBubbleItem(
                        context: context,
                        icon: Icons.settings_outlined,
                        title: 'AI Profiliavimas',
                        desc: 'Dietų filtrai ir asistento nustatymai',
                        color: AppColors.textSub,
                        route: '/profile',
                        delay: 4,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBubbleItem({
    required BuildContext context,
    required IconData icon,
    required String title,
    required String desc,
    required Color color,
    required String route,
    required int delay,
  }) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.0, end: 1.0),
      duration: const Duration(milliseconds: 500),
      curve: Interval(delay * 0.1, 1.0, curve: Curves.easeOutBack),
      builder: (context, value, child) {
        return Transform.translate(
          offset: Offset(0, 30 * (1 - value)),
          child: Opacity(
            opacity: value,
            child: child,
          ),
        );
      },
      child: GestureDetector(
        onTap: () => context.push(route),
        child: Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                AppColors.surface.withValues(alpha: 0.8),
                AppColors.elevated.withValues(alpha: 0.6),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.4),
                blurRadius: 15,
                offset: const Offset(0, 5),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.3),
                  shape: BoxShape.circle,
                  border: Border.all(color: color.withValues(alpha: 0.5)),
                  boxShadow: [
                    BoxShadow(color: color.withValues(alpha: 0.2), blurRadius: 15),
                  ],
                ),
                child: Icon(icon, color: color, size: 30),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                    const SizedBox(height: 4),
                    Text(desc, style: const TextStyle(fontSize: 13, color: AppColors.textSub)),
                  ],
                ),
              ),
              const Icon(Icons.arrow_forward_ios, color: AppColors.textSub, size: 16),
            ],
          ),
        ),
      ),
    );
  }
}
