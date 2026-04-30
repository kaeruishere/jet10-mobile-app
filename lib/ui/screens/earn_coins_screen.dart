import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_strings.dart';
import '../../core/constants/app_constants.dart';
import '../../data/services/coin_service.dart';
import '../../data/services/audio_service.dart';
import '../widgets/jeton_counter.dart';
import '../../minigames/coin_flip_screen.dart';
import '../../minigames/rps_screen.dart';
import '../../data/services/settings_service.dart';
import '../../data/services/ad_service.dart';

class EarnCoinsScreen extends StatefulWidget {
  const EarnCoinsScreen({super.key});

  @override
  State<EarnCoinsScreen> createState() => _EarnCoinsScreenState();
}

class _EarnCoinsScreenState extends State<EarnCoinsScreen> {
  @override
  Widget build(BuildContext context) {
    return Consumer<SettingsService>(
      builder: (context, settings, _) {
        return Scaffold(
          appBar: AppBar(
            title: Text(AppStrings.earnTitle, style: const TextStyle(fontWeight: FontWeight.bold)),
            actions: [
              Consumer<CoinService>(
                builder: (context, coinService, _) => Padding(
                  padding: const EdgeInsets.only(right: 8.0),
                  child: JetonCounter(value: coinService.balance.toDouble()),
                ),
              )
            ],
          ),
          body: Container(
        width: double.infinity,
        // Removed hardcoded gradient to rely on AppTheme scaffoldBackgroundColor
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Consumer<AdService>(
                  builder: (context, adService, _) => _optionCard(
                    title: AppStrings.adWatchTitle,
                    subtitle: AppStrings.adWatchSubtitle,
                    icon: Icons.play_circle_fill,
                    color: Colors.redAccent,
                    label: AppStrings.adRewardLabel,
                    onTap: () {
                      if (adService.isRewardedAdLoaded) {
                        adService.showRewardedAd(() {
                          context.read<CoinService>().addCoins(AppConstants.rewardAdAmount);
                          AudioService().playUnlock();
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text(AppStrings.adRewardSuccess), backgroundColor: AppColors.successGreen),
                          );
                        });
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(AppStrings.adNotLoaded)),
                        );
                      }
                    },
                    isLoaded: adService.isRewardedAdLoaded,
                  ),
                ),
                const SizedBox(height: 25),
                Padding(
                  padding: const EdgeInsets.only(left: 4),
                  child: Text(
                    'EĞLENCELİ OYUNLAR', 
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.bold, 
                      letterSpacing: 1.5,
                    ),
                  ),
                ),
                const SizedBox(height: 15),
                _optionCard(
                  title: AppStrings.coinFlipTitle,
                  subtitle: AppStrings.coinFlipSubtitle,
                  icon: Icons.monetization_on,
                  color: Colors.amber,
                  label: AppStrings.luckGameLabel,
                  onTap: () {
                    AudioService().playClick();
                    Navigator.push(context, MaterialPageRoute(builder: (context) => const CoinFlipScreen()));
                  },
                ),
                const SizedBox(height: 15),
                _optionCard(
                  title: AppStrings.rpsTitle,
                  subtitle: AppStrings.rpsSubtitle,
                  icon: Icons.sports_esports,
                  color: Colors.blueAccent,
                  label: AppStrings.skillGameLabel,
                  onTap: () {
                    AudioService().playClick();
                    Navigator.push(context, MaterialPageRoute(builder: (context) => const RpsScreen()));
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
      },
    );
  }

  Widget _optionCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required String label,
    required VoidCallback onTap,
    bool isLoaded = true,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: Theme.of(context).colorScheme.primary, 
            width: 2,
          ),
          boxShadow: [
            BoxShadow(
              color: Theme.of(context).colorScheme.primary.withOpacity(0.3),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withOpacity(0.12), 
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(icon, color: color, size: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          title, 
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 18),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (!isLoaded) ...[
                        const SizedBox(width: 8),
                        const SizedBox(width: 10, height: 10, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white24)),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle, 
                    style: Theme.of(context).textTheme.bodyMedium,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1), 
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                label, 
                style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
