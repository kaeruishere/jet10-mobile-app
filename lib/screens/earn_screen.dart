import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/theme.dart';
import '../widgets/mini_games/coin_flip.dart';
import '../widgets/mini_games/slot_machine.dart';

class EarnScreen extends StatelessWidget {
  final String uid;
  const EarnScreen({super.key, required this.uid});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'JETON KAZAN',
                    style: GoogleFonts.orbitron(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      color: AppColors.neonYellow,
                      shadows: [
                        Shadow(
                          color: AppColors.neonYellow.withOpacity(0.5),
                          blurRadius: 16,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Mini oyunlarla günlük jeton biriktir',
                    style: GoogleFonts.rajdhani(
                      fontSize: 14,
                      color: AppColors.textDim,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),

            // Günlük bilgi banner
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.neonYellow.withOpacity(0.06),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.neonYellow.withOpacity(0.15)),
              ),
              child: Row(
                children: [
                  const Text('⏰', style: TextStyle(fontSize: 18)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Her gün sıfırlanır — günlük haklarını kullan!',
                      style: GoogleFonts.rajdhani(
                        fontSize: 13,
                        color: AppColors.neonYellow,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 8),

            // Mini games
            CoinFlipGame(uid: uid),
            SlotMachine(uid: uid),

            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}
