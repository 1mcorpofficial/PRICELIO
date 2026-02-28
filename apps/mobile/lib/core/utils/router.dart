import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:ui';
import '../../features/auth/presentation/login_page.dart';
import '../../features/auth/presentation/register_page.dart';
import '../../features/home/presentation/home_page.dart';
import '../../features/more/presentation/more_page.dart';
import '../../features/search/presentation/search_page.dart';
import '../../features/map/presentation/map_page.dart';
import '../../features/basket/presentation/basket_page.dart';
import '../../features/profile/presentation/profile_page.dart';
import '../../features/scanner/presentation/scanner_page.dart';
import '../../features/kids/presentation/kids_page.dart';
import '../../features/receipts/presentation/receipt_scan_page.dart';
import '../../features/missions/presentation/missions_page.dart';
import '../api/api_client.dart';
import '../theme/app_theme.dart';

final _storage = const FlutterSecureStorage();

final appRouter = GoRouter(
  initialLocation: '/home',
  redirect: (context, state) async {
    final token = await _storage.read(key: kTokenKey);
    final isAuth = token != null;
    final isAuthRoute = state.matchedLocation.startsWith('/login') ||
        state.matchedLocation.startsWith('/register');

    if (!isAuth && !isAuthRoute) return '/login';
    if (isAuth && isAuthRoute) return '/home';
    return null;
  },
  routes: [
    GoRoute(path: '/login',    builder: (_, __) => const LoginPage()),
    GoRoute(path: '/register', builder: (_, __) => const RegisterPage()),
    GoRoute(path: '/kids',     builder: (_, __) => const KidsPage()),
    GoRoute(path: '/map',      builder: (_, __) => const MapPage()),
    // Scanner dabar bus kaip overlay arba tiesiog langas per visą ekraną
    GoRoute(path: '/scanner',  builder: (_, __) => const ScannerPage()),
    
    ShellRoute(
      builder: (context, state, child) => MainShell(child: child),
      routes: [
        // Mūsų 4 pagrindiniai tabai aplink centrinį kameros mygtuką:
        GoRoute(path: '/more',     builder: (_, __) => const MorePage()),     // "Daugiau" / Burbulai
        GoRoute(path: '/market',   builder: (_, __) => const SearchPage()),   // Market
        GoRoute(path: '/basket',   builder: (_, __) => const BasketPage()),   // Basket
        GoRoute(path: '/profile',  builder: (_, __) => const ProfilePage()),  // Profile
      ],
    ),
  ],
);

const _navRoutes = ['/more', '/market', '/basket', '/profile'];

class MainShell extends StatelessWidget {
  final Widget child;
  const MainShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    final idx = _navRoutes.indexOf(location);
    final activeIndex = idx < 0 ? 0 : idx;

    return Scaffold(
      extendBody: true, // Leidžia fonui palįsti po navigacija (Glassmorphism)
      body: child,
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      floatingActionButton: _buildCenterCameraBtn(context),
      bottomNavigationBar: _buildGlassBottomNav(context, activeIndex),
    );
  }

  Widget _buildCenterCameraBtn(BuildContext context) {
    return Container(
      width: 64,
      height: 64,
      margin: const EdgeInsets.only(top: 30), // Iškelia šiek tiek
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          colors: [AppColors.surface, AppColors.elevated],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.4),
            blurRadius: 20,
            spreadRadius: 2,
          ),
        ],
        border: Border.all(color: Colors.white.withOpacity(0.15), width: 1.5),
      ),
      child: FloatingActionButton(
        onPressed: () => context.push('/scanner'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        child: const Icon(Icons.camera_alt_outlined, color: Colors.white, size: 28),
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
                  const Color(0xFF271744).withOpacity(0.65),
                  const Color(0xFF1B0F2E).withOpacity(0.85),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              border: Border.all(color: Colors.white.withOpacity(0.12), width: 1),
              borderRadius: BorderRadius.circular(32),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.5),
                  blurRadius: 20,
                )
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _NavItem(
                  icon: Icons.more_horiz,
                  isActive: activeIndex == 0,
                  onTap: () => context.go('/more'),
                ),
                _NavItem(
                  icon: Icons.show_chart_outlined,
                  isActive: activeIndex == 1,
                  onTap: () => context.go('/market'),
                ),
                const SizedBox(width: 48), // Vieta centriniam FAB mygtukui
                _NavItem(
                  icon: Icons.shopping_basket_outlined,
                  isActive: activeIndex == 2,
                  onTap: () => context.go('/basket'),
                ),
                _NavItem(
                  icon: Icons.person_outline,
                  isActive: activeIndex == 3,
                  onTap: () => context.go('/profile'),
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
                  BoxShadow(color: AppColors.primary, blurRadius: 8, spreadRadius: 1)
                ] : null,
              ),
            )
          ],
        ),
      ),
    );
  }
}
