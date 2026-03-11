import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme.dart';
import '../../services/firestore_service.dart';
import '../../services/jeton_service.dart';

class SlotMachine extends StatefulWidget {
  final String uid;
  const SlotMachine({super.key, required this.uid});

  @override
  State<SlotMachine> createState() => _SlotMachineState();
}

class _SlotMachineState extends State<SlotMachine> {
  final _firestore = FirestoreService();
  final _jetonService = JetonService();

  static const _symbols = ['🍋', '🍊', '🍒', '⭐', '🎯', '💎'];
  static const _jackpotReward = 100;
  static const _pairReward = 25;

  final _reels = ['🍋', '🍊', '🍒'];
  bool _spinning = false;
  String _message = 'Çevir ve kazan!';
  Color _messageColor = AppColors.textDim;
  int _remaining = JetonService.slotDailyLimit;

  final _random = Random();

  @override
  void initState() {
    super.initState();
    _loadRemaining();
  }

  Future<void> _loadRemaining() async {
    final r = await _jetonService.getRemainingPlays(JetonService.slotKey);
    setState(() => _remaining = r);
  }

  Future<void> _spin() async {
    if (_spinning || _remaining <= 0) return;

    final canPlay = await _jetonService.consumePlay(JetonService.slotKey);
    if (!canPlay) return;

    setState(() {
      _spinning = true;
      _remaining--;
      _message = '🌀 Çevriliyor...';
      _messageColor = AppColors.textDim;
    });

    // Her reel için farklı süre
    for (int reel = 0; reel < 3; reel++) {
      final ticks = 10 + reel * 5;
      for (int t = 0; t < ticks; t++) {
        await Future.delayed(const Duration(milliseconds: 80));
        setState(() {
          _reels[reel] = _symbols[_random.nextInt(_symbols.length)];
        });
      }
    }

    // Sonuç değerlendir
    final r1 = _reels[0], r2 = _reels[1], r3 = _reels[2];

    if (r1 == r2 && r2 == r3) {
      await _firestore.addJetons(widget.uid, _jackpotReward);
      setState(() {
        _message = '🎉 JACKPOT! +$_jackpotReward Jeton!';
        _messageColor = AppColors.neonYellow;
      });
    } else if (r1 == r2 || r2 == r3 || r1 == r3) {
      await _firestore.addJetons(widget.uid, _pairReward);
      setState(() {
        _message = '✅ İki aynı! +$_pairReward Jeton';
        _messageColor = AppColors.neonCyan;
      });
    } else {
      setState(() {
        _message = '❌ Şansını tekrar dene!';
        _messageColor = AppColors.neonPink;
      });
    }

    setState(() => _spinning = false);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.neonCyan.withOpacity(0.2)),
      ),
      child: Column(
        children: [
          // Title
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '🎰  SLOT MAKİNESİ',
                style: GoogleFonts.orbitron(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.neonCyan,
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

          // Reels
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(3, (i) {
              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 6),
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: AppColors.bg,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: AppColors.neonCyan.withOpacity(0.3),
                    width: 2,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.neonCyan.withOpacity(0.05),
                      blurRadius: 12,
                    ),
                  ],
                ),
                child: Center(
                  child: Text(
                    _reels[i],
                    style: const TextStyle(fontSize: 34),
                  ),
                ),
              );
            }),
          ),

          const SizedBox(height: 16),

          // Message
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 300),
            child: Text(
              _message,
              key: ValueKey(_message),
              style: GoogleFonts.rajdhani(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: _messageColor,
              ),
            ),
          ),

          const SizedBox(height: 20),

          // Spin button
          if (_remaining > 0)
            GestureDetector(
              onTap: _spinning ? null : _spin,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: _spinning
                        ? [AppColors.border, AppColors.border]
                        : [AppColors.neonCyan, const Color(0xFF0060AA)],
                  ),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: _spinning
                      ? []
                      : [
                          BoxShadow(
                            color: AppColors.neonCyan.withOpacity(0.3),
                            blurRadius: 16,
                            offset: const Offset(0, 4),
                          ),
                        ],
                ),
                child: Center(
                  child: Text(
                    _spinning ? 'ÇEVRİLİYOR...' : '⚡  ÇEVİR',
                    style: GoogleFonts.orbitron(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: _spinning ? AppColors.textDim : Colors.black,
                      letterSpacing: 2,
                    ),
                  ),
                ),
              ),
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
}
