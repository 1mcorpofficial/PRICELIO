import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api/api_client.dart';
import '../../../core/theme/app_theme.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
  String? _error;

  Future<void> _register() async {
    if (_password.text.length < 8) {
      setState(() => _error = 'Slaptažodis turi būti bent 8 simboliai.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await ApiClient().dio.post('/auth/register', data: {
        'email': _email.text.trim(),
        'password': _password.text,
      });
      await ApiClient().saveTokens(
        accessToken: res.data['access_token']?.toString(),
        refreshToken: res.data['refresh_token']?.toString(),
      );
      if (mounted) context.go('/home');
    } catch (e) {
      setState(() => _error =
          'Registracija nepavyko. Gal toks el. paštas jau egzistuoja?');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 48),
              Text('Sukurti paskyrą 🛒',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w700, color: AppColors.textMain)),
              const SizedBox(height: 8),
              const Text('Taupykite kasdien su PRICELIO',
                  style: TextStyle(
                    color: AppColors.textSub,
                    fontSize: 16,
                  )),
              const SizedBox(height: 40),
              TextField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                    labelText: 'El. paštas',
                    prefixIcon: Icon(Icons.email_outlined)),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _password,
                obscureText: true,
                decoration: const InputDecoration(
                    labelText: 'Slaptažodis (min. 8 simboliai)',
                    prefixIcon: Icon(Icons.lock_outlined)),
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: const TextStyle(color: AppColors.error)),
              ],
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _loading ? null : _register,
                child: _loading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2))
                    : const Text('Registruotis'),
              ),
              const SizedBox(height: 16),
              Center(
                child: TextButton(
                  onPressed: () => context.go('/login'),
                  child: const Text('Jau turite paskyrą? Prisijungti'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }
}
