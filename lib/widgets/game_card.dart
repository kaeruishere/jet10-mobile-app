import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/theme.dart';
import '../models/game_model.dart';

class GameCard extends StatelessWidget {
  final GameModel game;
  final bool isUnlocked;
  final VoidCallback onTap;

  const GameCard({
    super.key,
    required this.game,
    required this.isUnlocked,
    required this.onTap,
  });

  bool get canPlay => game.isFree || isUnlocked;

  _CategoryStyle get _style {
    switch (game.category) {
      case 'Arcade':
        return _CategoryStyle('🕹️', const Color(0xFF7B2FFF), const Color(0xFFBF5FFF));
      case 'Puzzle':
        return _CategoryStyle('🧩', const Color(0xFF0077FF), const Color(0xFF00CFFF));
      case 'Aksiyon':
        return _CategoryStyle('⚔️', const Color(0xFFFF2D6B), const Color(0xFFFF6B1A));
      case 'Yarış':
        return _CategoryStyle('🏎️', const Color(0xFFFF6B1A), const Color(0xFFF5E642));
      case 'Spor':
        return _CategoryStyle('⚽', const Color(0xFF00C853), const Color(0xFF00E5FF));
      case 'Strateji':
        return _CategoryStyle('♟️', const Color(0xFF8B6914), const Color(0xFFF5E642));
      default:
        return _CategoryStyle('🎮', const Color(0xFF2A2A40), const Color(0xFF4A4A60));
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = _style;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: canPlay ? s.colorA.withOpacity(0.35) : AppColors.border,
            width: 1.5,
          ),
          boxShadow: canPlay
              ? [BoxShadow(color: s.colorA.withOpacity(0.12), blurRadius: 20, offset: const Offset(0, 6))]
              : [],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: Stack(
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildBanner(s),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          game.name,
                          style: GoogleFonts.orbitron(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textPrimary, letterSpacing: 0.3),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                              decoration: BoxDecoration(color: s.colorA.withOpacity(0.12), borderRadius: BorderRadius.circular(6)),
                              child: Text(game.category.toUpperCase(), style: GoogleFonts.rajdhani(fontSize: 9, fontWeight: FontWeight.w700, color: s.colorB, letterSpacing: 1)),
                            ),
                            _buildPrice(s),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (!canPlay) _buildLockedOverlay(s),
              if (game.isFree)
                Positioned(
                  top: 8, right: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.neonCyan,
                      borderRadius: BorderRadius.circular(8),
                      boxShadow: [BoxShadow(color: AppColors.neonCyan.withOpacity(0.4), blurRadius: 8)],
                    ),
                    child: Text('FREE', style: GoogleFonts.orbitron(fontSize: 8, fontWeight: FontWeight.w900, color: Colors.black, letterSpacing: 1)),
                  ),
                ),
              if (!game.isFree && isUnlocked)
                Positioned(
                  top: 8, right: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(color: AppColors.neonYellow, borderRadius: BorderRadius.circular(8)),
                    child: Text('AÇIK', style: GoogleFonts.orbitron(fontSize: 8, fontWeight: FontWeight.w900, color: Colors.black, letterSpacing: 1)),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBanner(_CategoryStyle s) {
    return Container(
      height: 80,
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [s.colorA.withOpacity(0.9), s.colorB.withOpacity(0.6)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            right: -10, bottom: -10,
            child: Text(s.emoji, style: const TextStyle(fontSize: 72)),
          ),
          if (game.thumbnail.isNotEmpty)
            Positioned.fill(
              child: Image.network(game.thumbnail, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const SizedBox()),
            ),
        ],
      ),
    );
  }

  Widget _buildPrice(_CategoryStyle s) {
    if (game.isFree) return const SizedBox.shrink();
    if (isUnlocked) {
      return Row(children: [
        Icon(Icons.lock_open_rounded, size: 11, color: AppColors.neonYellow),
        const SizedBox(width: 3),
        Text('AÇIK', style: GoogleFonts.orbitron(fontSize: 9, fontWeight: FontWeight.w700, color: AppColors.neonYellow)),
      ]);
    }
    return Row(children: [
      const Text('🪙', style: TextStyle(fontSize: 11)),
      const SizedBox(width: 3),
      Text('${game.cost}', style: GoogleFonts.orbitron(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.neonYellow)),
    ]);
  }

  Widget _buildLockedOverlay(_CategoryStyle s) {
    return Positioned.fill(
      child: Container(
        decoration: BoxDecoration(color: Colors.black.withOpacity(0.55), borderRadius: BorderRadius.circular(20)),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.black.withOpacity(0.5),
                border: Border.all(color: s.colorA.withOpacity(0.5), width: 1.5),
              ),
              child: const Center(child: Text('🔒', style: TextStyle(fontSize: 20))),
            ),
            const SizedBox(height: 6),
            Text('${game.cost} JETON', style: GoogleFonts.orbitron(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.neonYellow)),
          ],
        ),
      ),
    );
  }
}

class _CategoryStyle {
  final String emoji;
  final Color colorA;
  final Color colorB;
  const _CategoryStyle(this.emoji, this.colorA, this.colorB);
}