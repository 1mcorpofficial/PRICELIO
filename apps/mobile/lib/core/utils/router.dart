import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../features/auth/presentation/login_page.dart';
import '../../features/auth/presentation/register_page.dart';
import '../../features/home/presentation/home_page.dart';
import '../../features/search/presentation/search_page.dart';
import '../../features/map/presentation/map_page.dart';
import '../../features/basket/presentation/basket_page.dart';
import '../../features/profile/presentation/profile_page.dart';
import '../../features/scanner/presentation/scanner_page.dart';
import '../../features/kids/presentation/kids_page.dart';
import '../api/api_client.dart';

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
    GoRoute(path: '/scanner',  builder: (_, __) => const ScannerPage()),
    GoRoute(path: '/kids',     builder: (_, __) => const KidsPage()),
    ShellRoute(
      builder: (context, state, child) => MainShell(child: child),
      routes: [
        GoRoute(path: '/home',    builder: (_, __) => const HomePage()),
        GoRoute(path: '/search',  builder: (_, __) => const SearchPage()),
        GoRoute(path: '/map',     builder: (_, __) => const MapPage()),
        GoRoute(path: '/basket',  builder: (_, __) => const BasketPage()),
        GoRoute(path: '/profile', builder: (_, __) => const ProfilePage()),
      ],
    ),
  ],
);

class MainShell extends StatelessWidget {
  final Widget child;
  const MainShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    final idx = ['/home', '/search', '/map', '/basket', '/profile']
        .indexOf(location);

    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: idx < 0 ? 0 : idx,
        onDestinationSelected: (i) {
          const routes = ['/home', '/search', '/map', '/basket', '/profile'];
          context.go(routes[i]);
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined),   selectedIcon: Icon(Icons.home),           label: 'Home'),
          NavigationDestination(icon: Icon(Icons.search_outlined),  selectedIcon: Icon(Icons.search),         label: 'Search'),
          NavigationDestination(icon: Icon(Icons.map_outlined),     selectedIcon: Icon(Icons.map),            label: 'Map'),
          NavigationDestination(icon: Icon(Icons.shopping_bag_outlined), selectedIcon: Icon(Icons.shopping_bag), label: 'Basket'),
          NavigationDestination(icon: Icon(Icons.person_outlined),  selectedIcon: Icon(Icons.person),         label: 'Profile'),
        ],
      ),
    );
  }
}
