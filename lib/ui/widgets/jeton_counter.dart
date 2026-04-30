import 'package:flutter/material.dart';
import 'package:animated_flip_counter/animated_flip_counter.dart';
import '../../core/theme/app_colors.dart';

class JetonCounter extends StatelessWidget {
  final double value;
  final bool showBadge;

  const JetonCounter({
    super.key,
    required this.value,
    this.showBadge = true,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      margin: const EdgeInsets.only(top: 8, bottom: 8),
      decoration: BoxDecoration(
        color: cs.surface.withOpacity(0.85),
        borderRadius: BorderRadius.circular(25),
        border: Border.all(color: AppColors.jetonGold, width: 2),
        boxShadow: [
          BoxShadow(
            color: AppColors.jetonGold.withOpacity(0.4),
            blurRadius: 12, 
            spreadRadius: 1,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Image.asset('assets/logo.png', width: 22, height: 22),
          const SizedBox(width: 8),
          AnimatedFlipCounter(
            value: value,
            suffix: ' Jeton',
            duration: const Duration(milliseconds: 500),
            textStyle: TextStyle(
              color: AppColors.jetonGold,
              fontWeight: FontWeight.bold,
              fontSize: 16,
              letterSpacing: 0.5,
              shadows: [Shadow(color: AppColors.jetonGold.withOpacity(0.8), blurRadius: 6)],
            ),
          ),
        ],
      ),
    );
  }
}
