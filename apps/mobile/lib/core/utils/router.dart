import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:ui';
import '../../features/auth/presentation/login_page.dart';
import '../../features/auth/presentation/register_page.dart';
import '../../features/more/presentation/more_page.dart';
import '../../features/search/presentation/search_page.dart';
import '../../features/map/presentation/map_page.dart';
import '../../features/basket/presentation/basket_page.dart';
import '../../features/profile/presentation/profile_page.dart';
import '../../features/scanner/presentation/scanner_page.dart';
import '../../features/kids/presentation/kids_page.dart';
import '../../features/warranty/presentation/warranty_page.dart';
import '../../features/missions/presentation/missions_page.dart';
import '../../features/splash/presentation/splash_page.dart';
import '../api/api_client.dart';
import '../theme/app_theme.dart';

const _storage = FlutterSecureStorage();

final appRouter = GoRouter(
  initialLocation: '/',
  redirect: (context, state) async {
    // We handle the splash screen at '/' which will do the animation and then navigate.
    // However, if the user explicitly goes to another route (like /login), we might need to check auth.
    // For now, let SplashPage handle the initial auth check and routing.
    final isSplash = state.matchedLocation == '/';
    if (isSplash) return null; // allow splash screen to show

    final token = await _storage.read(key: kTokenKey);
    final isAuth = token != null;
    final isAuthRoute = state.matchedLocation.startsWith('/login') ||
        state.matchedLocation.startsWith('/register');

    if (!isAuth && !isAuthRoute) return '/login';
    if (isAuth && isAuthRoute) return '/more';
    return null;
  },
  routes: [
    GoRoute(path: '/',         builder: (_, __) => const SplashPage()),
    GoRoute(path: '/login',    builder: (_, __) => const LoginPage()),
    GoRoute(path: '/register', builder: (_, __) => const RegisterPage()),
    GoRoute(path: '/kids',     builder: (_, __) => const KidsPage()),
    GoRoute(path: '/map',      builder: (_, __) => const MapPage()),
    GoRoute(path: '/basket',   builder: (_, __) => const BasketPage()),
    GoRoute(path: '/profile',  builder: (_, __) => const ProfilePage()),
    GoRoute(path: '/scanner',  builder: (_, __) => const ScannerPage()),
    
    ShellRoute(
      builder: (context, state, child) => MainShell(child: child),
      routes: [
        GoRoute(path: '/more',     builder: (_, __) => const MorePage()),       // Daugiau
        GoRoute(path: '/warranty', builder: (_, __) => const WarrantyPage()),   // Seifas
        GoRoute(path: '/missions', builder: (_, __) => const MissionsPage()),   // Misijos
        GoRoute(path: '/market',   builder: (_, __) => const SearchPage()),     // Kainos Analizė
      ],
    ),
  ],
);

const _navRoutes = ['/more', '/warranty', '/missions', '/market'];

class MainShell extends StatelessWidget {
  final Widget child;
  const MainShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    final idx = _navRoutes.indexOf(location);
    final activeIndex = idx < 0 ? 0 : idx;

    return Scaffold(
      extendBody: true, // Leidžia fonui palįsti po navigacija
      body: Stack(
        children: [
          child,
          // Top-Right Profile Pill
          Positioned(
            top: MediaQuery.of(context).padding.top + 16,
            right: 20,
            child: _buildProfilePill(context),
          ),
        ],
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      floatingActionButton: _buildCenterCameraBtn(context),
      bottomNavigationBar: _buildGlassBottomNav(context, activeIndex),
    );
  }

  Widget _buildProfilePill(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/profile'),
      child: Hero(
        tag: 'profile_hero',
        child: Material(
          color: Colors.transparent,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(30),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(30),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withValues(alpha: 0.2), blurRadius: 10)
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 24,
                      height: 24,
                      decoration: const BoxDecoration(
                        color: AppColors.elevated,
                        shape: BoxShape.circle,
                      ),
                      child: const Center(
                        child: Text(
                          'M', // Pavyzdinis inicialas
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          '12,500 XP',
                          style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w900),
                        ),
                        const SizedBox(height: 2),
                        Container(
                          width: 50,
                          height: 2,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(2),
                          ),
                          child: FractionallySizedBox(
                            alignment: Alignment.centerLeft,
                            widthFactor: 0.75,
                            child: Container(
                              decoration: BoxDecoration(
                                color: AppColors.primary,
                                borderRadius: BorderRadius.circular(2),
                                boxShadow: const [
                                  BoxShadow(color: AppColors.primary, blurRadius: 4)
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCenterCameraBtn(BuildContext context) {
    return Container(
      width: 64,
      height: 64,
      margin: const EdgeInsets.only(top: 30),
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: const LinearGradient(
          colors: [AppColors.surface, AppColors.elevated],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.4),
            blurRadius: 20,
            spreadRadius: 2,
          ),
        ],
        border: Border.all(color: Colors.white.withValues(alpha: 0.15), width: 1.5),
      ),
      child: FloatingActionButton(
        onPressed: () => context.push('/scanner'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        child: const Text('P', style: TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w900)),
      ),
    );
  }

  Widget _buildGlassBottomNav(BuildContext context, int activeIndex) {
    return Padding(
      padding: const EdgeInsets.only(left: 20, right: 20, bottom: 20),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(32),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
          child: Container(
            height: 70,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  const Color(0xFF271744).withValues(alpha: 0.65),
                  const Color(0xFF1B0F2E).withValues(alpha: 0.85),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              border: Border.all(color: Colors.white.withValues(alpha: 0.12), width: 1),
              borderRadius: BorderRadius.circular(32),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.5),
                  blurRadius: 20,
                )
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _NavItem(
                  icon: Icons.bubble_chart_outlined,
                  isActive: activeIndex == 0,
                  onTap: () => context.go('/more'),
                ),
                _NavItem(
                  icon: Icons.shield_outlined,
                  isActive: activeIndex == 1,
                  onTap: () => context.go('/warranty'),
                ),
                const SizedBox(width: 48), // Vieta centriniam FAB mygtukui
                _NavItem(
                  icon: Icons.my_location_outlined,
                  isActive: activeIndex == 2,
                  onTap: () => context.go('/missions'),
                ),
                _NavItem(
                  icon: Icons.show_chart_outlined,
                  isActive: activeIndex == 3,
                  onTap: () => context.go('/market'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final bool isActive;
  final VoidCallback onTap;

  const _NavItem({
    required this.icon,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        height: double.infinity,
        width: 50,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              transform: Matrix4.translationValues(0, isActive ? -2 : 0, 0),
              child: Icon(
                icon,
                color: isActive ? AppColors.primary : AppColors.textSub,
                size: isActive ? 28 : 24,
              ),
            ),
            const SizedBox(height: 4),
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 4,
              height: 4,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isActive ? AppColors.primary : Colors.transparent,
                boxShadow: isActive ? [
                  const BoxShadow(color: AppColors.primary, blurRadius: 8, spreadRadius: 1)
                ] : null,
              ),
            )
          ],
        ),
      ),
    );
  }
}
