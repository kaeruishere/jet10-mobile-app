import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:provider/provider.dart';
import '../../data/services/settings_service.dart';
import '../../data/services/audio_service.dart';
import '../../data/services/crashlytics_service.dart';
import '../../core/theme/app_strings.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<SettingsService>(
      builder: (context, settings, _) {
        final cs = Theme.of(context).colorScheme;
        final textTheme = Theme.of(context).textTheme;

        return Scaffold(
          appBar: AppBar(
            title: Text(AppStrings.settingsTitle, style: textTheme.titleLarge),
          ),
          body: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              _buildSectionLabel(context, AppStrings.settingsGeneral),
              const SizedBox(height: 10),
              _buildCard(
                context,
                children: [
                  _buildSwitchTile(
                    context,
                    title: AppStrings.settingsAudio,
                    subtitle: AppStrings.settingsAudioDesc,
                    icon: Icons.volume_up_rounded,
                    value: settings.isAudioEnabled,
                    onChanged: (val) {
                      settings.toggleAudio();
                      if (val) AudioService().playClick();
                    },
                  ),
                  _divider(cs),
                  _buildListTile(
                    context,
                    title: AppStrings.settingsTheme,
                    subtitle: settings.isDarkMode ? AppStrings.settingsThemeDark : AppStrings.settingsThemeLight,
                    icon: Icons.dark_mode_rounded,
                    onTap: () {
                      AudioService().playClick();
                      settings.toggleTheme();
                    },
                  ),
                  _divider(cs),
                  _buildListTile(
                    context,
                    title: AppStrings.settingsLanguage,
                    subtitle: settings.currentLanguage == 'tr' ? AppStrings.settingsLanguageTr : AppStrings.settingsLanguageEn,
                    icon: Icons.language_rounded,
                    onTap: () {
                      AudioService().playClick();
                      settings.setLanguage(settings.currentLanguage == 'tr' ? 'en' : 'tr');
                    },
                  ),
                ],
              ),
              if (kDebugMode) ...[
                const SizedBox(height: 24),
                _buildSectionLabel(context, 'DEBUG'),
                const SizedBox(height: 10),
                _buildCard(
                  context,
                  children: [
                    _buildListTile(
                      context,
                      title: 'Simulate Crash',
                      subtitle: 'Crashlytics entegrasyonunu test eder',
                      icon: Icons.bug_report_rounded,
                      onTap: () {
                        CrashlyticsService().log('Manual crash from debug settings');
                        CrashlyticsService().simulateCrash();
                      },
                    ),
                  ],
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _buildSectionLabel(BuildContext context, String label) {
    final cs = Theme.of(context).colorScheme;
    return Text(
      label.toUpperCase(),
      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
        color: cs.primary,
        fontWeight: FontWeight.bold,
        letterSpacing: 2,
      ),
    );
  }

  Widget _buildCard(BuildContext context, {required List<Widget> children}) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: cs.primary.withOpacity(0.5), width: 2),
        boxShadow: [
          BoxShadow(color: cs.primary.withOpacity(0.2), blurRadius: 12, spreadRadius: 1),
        ],
      ),
      child: Column(children: children),
    );
  }

  Widget _divider(ColorScheme cs) {
    return Divider(height: 1, color: cs.primary.withOpacity(0.2), indent: 16, endIndent: 16);
  }

  Widget _buildSwitchTile(BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    final cs = Theme.of(context).colorScheme;
    return ListTile(
      leading: _iconBox(context, icon),
      title: Text(title, style: Theme.of(context).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w600)),
      subtitle: Text(subtitle, style: Theme.of(context).textTheme.bodyMedium),
      trailing: Switch(
        value: value,
        onChanged: onChanged,
        activeColor: cs.primary,
        activeTrackColor: cs.primary.withOpacity(0.4),
      ),
    );
  }

  Widget _buildListTile(BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    final cs = Theme.of(context).colorScheme;
    return ListTile(
      onTap: onTap,
      leading: _iconBox(context, icon),
      title: Text(title, style: Theme.of(context).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w600)),
      subtitle: Text(subtitle, style: Theme.of(context).textTheme.bodyMedium),
      trailing: Icon(Icons.arrow_forward_ios_rounded, size: 16, color: cs.primary),
    );
  }

  Widget _iconBox(BuildContext context, IconData icon) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: cs.primary.withOpacity(0.15),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: cs.primary.withOpacity(0.4)),
      ),
      child: Icon(icon, color: cs.primary, size: 20),
    );
  }
}
