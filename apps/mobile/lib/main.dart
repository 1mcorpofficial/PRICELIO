import 'package:flutter/material.dart';
import 'core/api/api_client.dart';
import 'core/theme/app_theme.dart';
import 'core/utils/router.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  ApiClient().init();
  runApp(const PricelioApp());
}

class PricelioApp extends StatelessWidget {
  const PricelioApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'PRICELIO',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: appRouter,
    );
  }
}
