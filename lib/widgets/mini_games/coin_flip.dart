import 'dart:math';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme.dart';
import '../../services/firestore_service.dart';
import '../../services/jeton_service.dart';

class CoinFlipGame extends StatefulWidget {
  final String uid;
  const CoinFlipGame({super.key, required this.uid});

  @override
  State<CoinFlipGame> createState() => _CoinFlipGameState();
}

class _CoinFlipGameState extends State<CoinFlipGame>
    with SingleTickerProviderStateMixin {
  final _firestore = FirestoreService();
  final _jetonService = JetonService();

  late AnimationController _animController;
  late Animation<double> _flipAnim;

  bool _isFlipping = false;
  String? _result;     // 'yazı' | 'tura'
  String? _userChoice;
  int _remaining = JetonService.coinDailyLimit;

  static const _reward = 10;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    _flipAnim = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeInOut),
    );
    _loadRemaining();
  }

  Future<void> _loadRemaining() async {
    final r = await _jetonService.getRemainingPlays(JetonService.coinKey);
    setState(() => _remaining = r);
  }

  Future<void> _flip(String choice) async {
    if (_isFlipping || _remaining <= 0) return;

    final canPlay = await _jetonService.consumePlay(JetonService.coinKey);
    if (!canPlay) return;

    setState(() {
      _isFlipping = true;
      _userChoice = choice;
      _result = null;
      _remaining--;
    });

    await _animController.forward(from: 0);

    final result = Random().nextBool() ? 'yazı' : 'tura';
    setState(() {
      _result = result;
      _isFlipping = false;
    });

    if (result == choice) {
      await _firestore.addJetons(widget.uid, _reward);
    }
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final won = _result != null && _result == _userChoice;
    final lost = _result != null && _result != _userChoice;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.neonYellow.withOpacity(0.2)),
      ),
      child: Column(
        children: [
          // Title + remaining
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '🪙  YAZI - TURA',
                style: GoogleFonts.orbitron(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.neonYellow,
                  letterSpacing: 1,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.border),
                ),
                child: Text(
                  '$_remaining hak',
                  style: GoogleFonts.orbitron(
                    fontSize: 10,
                    color: _remaining > 0 ? AppColors.neonCyan : AppColors.neonPink,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Coin visual
          AnimatedBuilder(
            animation: _flipAnim,
            builder: (_, __) {
              final angle = _flipAnim.value * pi * 4;
              return Transform(
                alignment: Alignment.center,
                transform: Matrix4.identity()
                  ..setEntry(3, 2, 0.001)
                  ..rotateY(angle),
                child: Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: const LinearGradient(
                      colors: [AppColors.neonYellow, AppColors.neonOrange],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.neonYellow.withOpacity(0.5),
                        blurRadius: 20,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: Center(
                    child: Text(
                      _result == 'tura' ? '⭕' : '🪙',
                      style: const TextStyle(fontSize: 36),
                    ),
                  ),
                ),
              );
            },
          ),

          const SizedBox(height: 16),

          // Result message
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 300),
            child: Text(
              _result == null
                  ? 'Tarafını seç!'
                  : won
                      ? '✅ Kazandın! +$_reward Jeton'
                      : '❌ Kaybettin! Tekrar dene.',
              key: ValueKey(_result),
              style: GoogleFonts.rajdhani(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: won
                    ? AppColors.neonYellow
                    : lost
                        ? AppColors.neonPink
                        : AppColors.textDim,
              ),
            ),
          ),

          const SizedBox(height: 20),

          // Choice buttons
          if (_remaining > 0)
            Row(
              children: [
                _choiceBtn('YAZI', AppColors.neonYellow),
                const SizedBox(width: 12),
                _choiceBtn('TURA', AppColors.neonCyan),
              ],
            )
          else
            Text(
              '🌙 Yarın tekrar gel!',
              style: GoogleFonts.rajdhani(
                fontSize: 14,
                color: AppColors.textDim,
                fontWeight: FontWeight.w600,
              ),
            ),
        ],
      ),
    );
  }

  Widget _choiceBtn(String label, Color color) {
    return Expanded(
      child: GestureDetector(
        onTap: _isFlipping ? null : () => _flip(label.toLowerCase()),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: color, width: 2),
          ),
          child: Center(
            child: Text(
              label,
              style: GoogleFonts.orbitron(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
