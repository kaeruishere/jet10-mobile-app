import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../data/services/auth_service.dart';
import '../../data/services/audio_service.dart';
import '../../data/services/settings_service.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_strings.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  final List<String> _emojis = const [
    '👤', '👾', '🚀', '⭐', '🔥', '💎', '👑', '😎', '🎮', '🐼'
  ];

  void _showEmojiPicker(BuildContext context, AuthService authService) {
    final cs = Theme.of(context).colorScheme;
    showModalBottomSheet(
      context: context,
      backgroundColor: Theme.of(context).cardColor,
      shape: RoundedRectangleBorder(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        side: BorderSide(color: cs.primary.withOpacity(0.5), width: 2),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(AppStrings.profileSelectEmoji,
                style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 20),
            Wrap(
              spacing: 15,
              runSpacing: 15,
              alignment: WrapAlignment.center,
              children: _emojis.map((emoji) {
                return GestureDetector(
                  onTap: () {
                    AudioService().playClick();
                    authService.updateAvatar(emoji);
                    Navigator.pop(ctx);
                  },
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: cs.primary.withOpacity(0.15),
                      shape: BoxShape.circle,
                      border: Border.all(color: cs.primary.withOpacity(0.4)),
                    ),
                    child: Text(emoji, style: const TextStyle(fontSize: 32)),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  void _showEditProfileDialog(BuildContext context, AuthService authService) {
    final user = authService.localUser;
    if (user == null) return;

    final nameController = TextEditingController(text: user.displayName);
    final usernameController = TextEditingController(text: user.username);

    showDialog(
      context: context,
      builder: (ctx) {
        final cs = Theme.of(ctx).colorScheme;
        return AlertDialog(
          backgroundColor: Theme.of(ctx).cardColor,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: cs.primary, width: 2),
          ),
          title: Text('Profili Düzenle', style: Theme.of(ctx).textTheme.titleLarge),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(labelText: 'Görünür İsim'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: usernameController,
                decoration: const InputDecoration(labelText: 'Kullanıcı Adı'),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('İptal'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (nameController.text.trim().isNotEmpty &&
                    usernameController.text.trim().isNotEmpty) {
                  AudioService().playClick();
                  Navigator.pop(ctx);
                  
                  try {
                    await authService.updateProfile(
                      nameController.text.trim(), usernameController.text.trim());
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Profil güncellendi'), backgroundColor: Colors.green),
                      );
                    }
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Hata oluştu, tekrar deneyin'), backgroundColor: Colors.red),
                      );
                    }
                  }
                }
              },
              child: const Text('Kaydet'),
            ),
          ],
        );
      },
    ).then((_) {
      nameController.dispose();
      usernameController.dispose();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<SettingsService>(
      builder: (context, settings, _) {
        final cs = Theme.of(context).colorScheme;
        final textTheme = Theme.of(context).textTheme;

        return Scaffold(
          appBar: AppBar(
            title: Text(AppStrings.profileTitle, style: textTheme.titleLarge),
          ),
          body: Consumer<AuthService>(
            builder: (context, authService, _) {
              final user = authService.localUser;
              if (user == null) {
                return Center(child: CircularProgressIndicator(color: cs.primary));
              }

              return ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  // Avatar Section
                  Center(
                    child: Stack(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: cs.primary.withOpacity(0.1),
                            shape: BoxShape.circle,
                            border: Border.all(color: cs.primary, width: 3),
                            boxShadow: [
                              BoxShadow(color: cs.primary.withOpacity(0.5), blurRadius: 20),
                            ],
                          ),
                          child: Text(user.avatarEmoji, style: const TextStyle(fontSize: 60)),
                        ),
                        Positioned(
                          bottom: 0,
                          right: 0,
                          child: GestureDetector(
                            onTap: () {
                              AudioService().playClick();
                              _showEmojiPicker(context, authService);
                            },
                            child: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: cs.primary,
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(color: cs.primary.withOpacity(0.6), blurRadius: 8),
                                ],
                              ),
                              child: Icon(Icons.edit, color: cs.onPrimary, size: 20),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Display Name and Username
                  Center(
                    child: Stack(
                      clipBehavior: Clip.none,
                      alignment: Alignment.center,
                      children: [
                        Column(
                          children: [
                            Text(user.displayName, style: textTheme.titleLarge),
                            const SizedBox(height: 5),
                            Text('@${user.username}', style: textTheme.bodyMedium),
                          ],
                        ),
                        Positioned(
                          right: -40,
                          child: IconButton(
                            icon: Icon(Icons.edit, color: cs.primary, size: 20),
                            onPressed: () {
                              AudioService().playClick();
                              _showEditProfileDialog(context, authService);
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 40),

                  // Google Login Section
                  if (authService.isAnonymous) ...[
                    _buildNeonCard(
                      context,
                      child: Column(
                        children: [
                          Icon(Icons.cloud_sync, size: 40, color: AppColors.jetonGold),
                          const SizedBox(height: 15),
                          Text(
                            AppStrings.profileGoogleLoginInfo,
                            textAlign: TextAlign.center,
                            style: textTheme.bodyMedium,
                          ),
                          const SizedBox(height: 20),
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.white,
                              foregroundColor: Colors.black87,
                              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                            ),
                            icon: const Icon(Icons.login, color: Colors.red),
                            label: Text(AppStrings.settingsGoogleLogin,
                                style: const TextStyle(fontWeight: FontWeight.bold)),
                            onPressed: () async {
                              AudioService().playClick();
                              ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                                content: Text(AppStrings.settingsGoogleLoggingIn),
                                backgroundColor: cs.primary,
                              ));
                              bool success = await authService.signInWithGoogle();
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                                  content: Text(success
                                      ? AppStrings.settingsGoogleLoginSuccess
                                      : AppStrings.settingsGoogleLoginFail),
                                  backgroundColor: success
                                      ? AppColors.successGreen
                                      : AppColors.errorRed,
                                ));
                              }
                            },
                          ),
                        ],
                      ),
                    ),
                  ] else ...[
                    Container(
                      padding: const EdgeInsets.all(15),
                      decoration: BoxDecoration(
                        color: AppColors.successGreen.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.successGreen.withOpacity(0.6), width: 2),
                        boxShadow: [
                          BoxShadow(color: AppColors.successGreen.withOpacity(0.2), blurRadius: 10),
                        ],
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.check_circle, color: AppColors.successGreen, size: 30),
                          const SizedBox(height: 10),
                          Text(
                            authService.firebaseUser?.email != null 
                              ? '${authService.firebaseUser!.email} hesabı ile giriş yapıldı.'
                              : 'Google hesabı ile giriş yapıldı.',
                            style: const TextStyle(color: AppColors.successGreen, fontWeight: FontWeight.bold),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              );
            },
          ),
        );
      },
    );
  }

  Widget _buildNeonCard(BuildContext context, {required Widget child}) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cs.primary.withOpacity(0.5), width: 2),
        boxShadow: [BoxShadow(color: cs.primary.withOpacity(0.2), blurRadius: 12)],
      ),
      child: child,
    );
  }
}
