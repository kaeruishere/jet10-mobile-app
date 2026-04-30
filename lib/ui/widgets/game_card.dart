import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:shimmer/shimmer.dart';
import '../../data/models/game_model.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_strings.dart';

class GameCard extends StatelessWidget {
  final Game game;
  final int index;
  final bool isUnlocked;
  final VoidCallback onTap;
  final VoidCallback onUnlock;

  const GameCard({
    super.key,
    required this.game,
    required this.index,
    required this.isUnlocked,
    required this.onTap,
    required this.onUnlock,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final gradient = AppColors.cardGradients[index % AppColors.cardGradients.length];

    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Expanded(
            child: Stack(
              children: [
                // Card container with neon border glow
                Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    gradient: LinearGradient(
                      colors: [gradient[0].withOpacity(0.15), gradient[1].withOpacity(0.05)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    border: Border.all(color: gradient[0].withOpacity(0.7), width: 2),
                    boxShadow: [
                      BoxShadow(
                        color: gradient[0].withOpacity(0.35),
                        blurRadius: 12,
                        spreadRadius: 1,
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(18),
                    child: (game.imageUrl != null && game.imageUrl!.isNotEmpty)
                        ? CachedNetworkImage(
                            imageUrl: game.imageUrl!,
                            cacheKey: "${game.id}_v${game.version}",
                            fit: BoxFit.cover,
                            width: double.infinity,
                            height: double.infinity,
                            placeholder: (context, url) => _buildPlaceholder(gradient),
                            errorWidget: (context, url, error) => _buildPlaceholder(gradient),
                          )
                        : _buildPlaceholder(gradient),
                  ),
                ),

                // Overlay for Locked State
                if (!isUnlocked)
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.65),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.lock_outline, color: cs.tertiary, size: 32),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: AppColors.jetonGold,
                              borderRadius: BorderRadius.circular(8),
                              boxShadow: [
                                BoxShadow(color: AppColors.jetonGold.withOpacity(0.5), blurRadius: 8),
                              ],
                            ),
                            child: Text(
                              AppStrings.unlockPriceLabel(game.cost),
                              style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 11),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            game.name,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
              fontWeight: FontWeight.bold,
              letterSpacing: 0.5,
              shadows: [Shadow(color: cs.primary.withOpacity(0.6), blurRadius: 4)],
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 5),
        ],
      ),
    );
  }

  Widget _buildPlaceholder(List<Color> gradient) {
    return Shimmer.fromColors(
      baseColor: gradient[0].withOpacity(0.2),
      highlightColor: gradient[1].withOpacity(0.4),
      child: Container(
        color: Colors.black12,
        child: Center(
          child: Icon(Icons.videogame_asset_outlined, size: 40, color: gradient[0].withOpacity(0.5)),
        ),
      ),
    );
  }
}
