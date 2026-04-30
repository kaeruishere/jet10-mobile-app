import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_strings.dart';
import '../../data/models/game_model.dart';
import '../../data/services/coin_service.dart';
import '../../data/services/audio_service.dart';
import '../../providers/game_provider.dart';
import '../widgets/game_card.dart';
import '../widgets/jeton_counter.dart';
import 'oyun_ekrani.dart';
import 'earn_coins_screen.dart';
import 'settings_screen.dart';
import 'profile_screen.dart';
import '../../data/services/settings_service.dart';
import '../../data/services/auth_service.dart';
import '../../data/services/ad_service.dart';
import '../../data/services/crashlytics_service.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';

class AnaMenuScreen extends StatefulWidget {
  const AnaMenuScreen({super.key});

  @override
  State<AnaMenuScreen> createState() => _AnaMenuScreenState();
}

class _AnaMenuScreenState extends State<AnaMenuScreen> {
  final TextEditingController _searchController = TextEditingController();
  BannerAd? _bannerAd;

  @override
  void initState() {
    super.initState();
    _bannerAd = AdService().createBannerAd();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _bannerAd?.dispose();
    super.dispose();
  }

  void _showUnlockDialog(BuildContext context, Game game) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.cardDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            const Icon(Icons.lock_open, color: AppColors.jetonGold),
            const SizedBox(width: 8),
            Text(AppStrings.unlockTitle, style: const TextStyle(color: Colors.white)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              AppStrings.unlockPrompt(game.name, game.cost), 
              style: const TextStyle(color: Colors.white70, fontSize: 16)
            ),
            const SizedBox(height: 10),
            Text(
              AppStrings.unlockWithAdSubtitle,
              style: const TextStyle(color: Colors.white54, fontSize: 12),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(AppStrings.unlockCancel, style: const TextStyle(color: Colors.white54)),
          ),
          Consumer<AdService>(
            builder: (context, adService, _) {
              return TextButton.icon(
                icon: Icon(
                  Icons.play_circle_fill, 
                  size: 18, 
                  color: adService.isRewardedAdLoaded ? Colors.blueAccent : Colors.grey
                ),
                label: Text(
                  adService.isRewardedAdLoaded ? AppStrings.unlockWithAd : AppStrings.adLoading, 
                  style: TextStyle(
                    color: adService.isRewardedAdLoaded ? Colors.blueAccent : Colors.grey, 
                    fontWeight: FontWeight.bold
                  )
                ),
                onPressed: adService.isRewardedAdLoaded ? () {
                  Navigator.pop(ctx);
                  adService.showRewardedAd(() async {
                    final success = await context.read<CoinService>().unlockGameWithAd(game);
                    if (success) {
                      AudioService().playUnlock();
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(AppStrings.gameUnlocked(game.name)), backgroundColor: AppColors.successGreen)
                        );
                      }
                    }
                  });
                } : null,
              );
            },
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.jetonGold,
              foregroundColor: Colors.black,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () async {
              Navigator.pop(ctx);
              final success = await context.read<CoinService>().unlockGame(game);
              if (!success) {
                AudioService().playError();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(AppStrings.insufficientJeton),
                    backgroundColor: AppColors.errorRed,
                  )
                );
              } else {
                AudioService().playUnlock();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(AppStrings.gameUnlocked(game.name)),
                    backgroundColor: AppColors.successGreen,
                  )
                );
              }
            },
            child: Text(AppStrings.unlockConfirm(game.cost), style: const TextStyle(fontWeight: FontWeight.bold)),
          )
        ],
      )
    );
  }

  void _oyunuAc(BuildContext context, Game game) {
    context.read<CoinService>().incrementPlayCount(game.id);
    AudioService().playClick();
    CrashlyticsService().breadcrumb('game_flow', 'game_open_requested:${game.id}');
    
    Navigator.push(
      context,
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) => OyunEkrani(game: game),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(opacity: animation, child: child);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<SettingsService>(
      builder: (context, settings, _) {
        return Scaffold(
          extendBodyBehindAppBar: true,
          appBar: AppBar(
            backgroundColor: Colors.transparent,
            elevation: 0,
            scrolledUnderElevation: 0,
            leading: Consumer<AuthService>(
              builder: (context, authService, _) {
                final user = authService.localUser;
                return GestureDetector(
                  onTap: () {
                    AudioService().playClick();
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileScreen()));
                  },
                  child: Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: Container(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Theme.of(context).colorScheme.primary.withOpacity(0.2),
                      ),
                      child: Center(
                        child: Text(user?.avatarEmoji ?? '👤', style: const TextStyle(fontSize: 20)),
                      ),
                    ),
                  ),
                );
              },
            ),
            title: Text(
              AppStrings.appTitle, 
              style: Theme.of(context).textTheme.displayLarge?.copyWith(fontSize: 26, letterSpacing: 1.5),
            ),
        actions: [
          Consumer<CoinService>(
            builder: (context, coinService, _) => Padding(
              padding: const EdgeInsets.only(right: 8.0),
              child: JetonCounter(value: coinService.balance.toDouble()),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.settings, size: 28),
            padding: const EdgeInsets.only(right: 15),
            onPressed: () {
              AudioService().playClick();
              Navigator.push(context, MaterialPageRoute(builder: (context) => const SettingsScreen()));
            },
          ),
        ],
      ),
      body: Container(
        padding: EdgeInsets.only(top: MediaQuery.of(context).padding.top + kToolbarHeight),
        // Removed hardcoded gradient to rely on AppTheme scaffoldBackgroundColor
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 10.0),
              child: TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: AppStrings.searchHint,
                  prefixIcon: const Icon(Icons.search),
                ),
                onChanged: (value) => context.read<GameProvider>().updateSearchQuery(value),
              ),
            ),

            Expanded(
              child: Consumer2<GameProvider, CoinService>(
                builder: (context, gameProvider, coinService, _) {
                  if (gameProvider.isLoading) {
                    return Center(child: CircularProgressIndicator(color: Theme.of(context).colorScheme.primary));
                  }
                  
                  final games = gameProvider.displayList;
                  
                  if (gameProvider.allGames.isEmpty) {
                    return Center(
                      child: Text(AppStrings.noGamesFound, style: Theme.of(context).textTheme.titleLarge),
                    );
                  }

                  if (games.isEmpty) {
                    return Center(
                      child: Text(AppStrings.noSearchMatch, style: Theme.of(context).textTheme.bodyLarge),
                    );
                  }

                  return CustomScrollView(
                    slivers: [
                      SliverPadding(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                        sliver: SliverToBoxAdapter(
                          child: _jetonKazanKarti(context),
                        ),
                      ),
                      SliverPadding(
                        padding: const EdgeInsets.only(left: 20, right: 20, bottom: 20),
                        sliver: SliverGrid(
                          delegate: SliverChildBuilderDelegate(
                            (context, index) {
                              final game = games[index];
                              final bool isUnlocked = game.cost <= 0 || coinService.isGameUnlocked(game.id);
                              
                              return GameCard(
                                game: game,
                                index: index,
                                isUnlocked: isUnlocked,
                                onTap: () {
                                  if (!isUnlocked) {
                                    _showUnlockDialog(context, game);
                                  } else if (game.url.isNotEmpty) {
                                    _oyunuAc(context, game);
                                  } else {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text(AppStrings.urlNotFound)),
                                    );
                                  }
                                },
                                onUnlock: () => _showUnlockDialog(context, game),
                              );
                            },
                            childCount: games.length,
                          ),
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            crossAxisSpacing: 15,
                            mainAxisSpacing: 15,
                            childAspectRatio: 0.82,
                          ),
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: _bannerAd != null 
        ? SafeArea(
            child: SizedBox(
              width: _bannerAd!.size.width.toDouble(),
              height: _bannerAd!.size.height.toDouble(),
              child: AdWidget(ad: _bannerAd!),
            ),
          )
        : null,
    );
    },
    );
  }

  Widget _jetonKazanKarti(BuildContext context) {
    return GestureDetector(
      onTap: () {
        AudioService().playClick();
        Navigator.push(context, MaterialPageRoute(builder: (context) => const EarnCoinsScreen()));
      },
      child: Container(
        height: 90,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: const LinearGradient(
            colors: [Color(0xFFFFAA00), Color(0xFFFF6B00)],
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
          ),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFFFAA00).withOpacity(0.45),
              blurRadius: 18,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Row(
          children: [
            const SizedBox(width: 20),
            const Icon(Icons.stars_rounded, color: Colors.white, size: 45),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    AppStrings.earnCoinsCardTitle,
                    style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900, letterSpacing: 1.2),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    AppStrings.earnCoinsCardDesc,
                    style: const TextStyle(color: Colors.white70, fontSize: 13),
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios, color: Colors.white70, size: 20),
            const SizedBox(width: 20),
          ],
        ),
      ),
    );
  }
}
