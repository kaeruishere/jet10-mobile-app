import 'package:flutter/material.dart';
import 'dart:math';
import 'package:provider/provider.dart';
import '../data/services/coin_service.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_strings.dart';
import '../core/constants/app_constants.dart';
import '../data/services/audio_service.dart';
import '../data/services/settings_service.dart';
import '../data/services/ad_service.dart';

class CoinFlipScreen extends StatefulWidget {
  const CoinFlipScreen({super.key});

  @override
  State<CoinFlipScreen> createState() => _CoinFlipScreenState();
}

class _CoinFlipScreenState extends State<CoinFlipScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;
  
  bool _isFlipping = false;
  int _result = 0; // 0 = Heads (Yazı), 1 = Tails (Tura)
  final Random _random = Random();

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(seconds: 2));
    _animation = Tween<double>(begin: 0, end: 1).animate(CurvedAnimation(parent: _controller, curve: Curves.easeInOut));
  }

  void _flipCoin(int guess) async {
    if (_isFlipping) return;

    final coinService = context.read<CoinService>();
    
    // Always subtract coins, allowing negative balance as requested
    bool canStart = await coinService.subtractCoins(AppConstants.coinFlipBet, allowNegative: true);

    if (!canStart) {
      // This might only happen if service is down or user is not logged in
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(AppStrings.insufficientJeton), backgroundColor: AppColors.errorRed),
      );
      return;
    }

    AudioService().playCoinFlip();
    setState(() { _isFlipping = true; });

    _result = _random.nextInt(2);
    _controller.reset();
    _controller.forward().then((_) {
      if (!mounted) return;
      setState(() { _isFlipping = false; });
      if (guess == _result) {
        coinService.addCoins(AppConstants.coinFlipBet * 2);
        AudioService().playWin();
        _showDialog(AppStrings.winTitle, AppStrings.coinFlipWinDesc, true);
      } else {
        AudioService().playLose();
        _showDialog(AppStrings.loseTitle, AppStrings.coinFlipLoseDesc, false);
      }
    });
  }

  void _showDialog(String title, String message, bool win) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Theme.of(ctx).cardColor,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: win ? AppColors.successGreen : AppColors.errorRed, width: 2),
        ),
        title: Text(title, style: TextStyle(color: win ? AppColors.successGreen : AppColors.errorRed, fontWeight: FontWeight.bold)),
        content: Text(message, style: Theme.of(ctx).textTheme.bodyMedium),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(AppStrings.okay))
        ]
      )
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<SettingsService>(
      builder: (context, settings, _) {
        return PopScope(
          canPop: true,
          onPopInvokedWithResult: (didPop, _) {
            if (didPop) AdService().showInterstitialAdOnExit();
          },
          child: Scaffold(
          appBar: AppBar(
            title: Text(AppStrings.coinFlipTitle),
          ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              AppStrings.coinFlipBet,
              style: const TextStyle(
                color: AppColors.jetonGold,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 40),
            AnimatedBuilder(
              animation: _animation,
              builder: (context, child) {
                double angle = _animation.value * pi * 10;
                double finalAngle = angle + (_result * pi);
                bool isTails = (finalAngle % (2 * pi)) >= pi;

                return Transform(
                  alignment: Alignment.center,
                  transform: Matrix4.identity()
                    ..setEntry(3, 2, 0.001)
                    ..rotateX(angle),
                  child: Container(
                    width: 150,
                    height: 150,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isTails ? AppColors.coinFlipTails : AppColors.coinFlipHeads,
                      border: Border.all(color: Colors.white, width: 4),
                      boxShadow: [BoxShadow(color: (isTails ? AppColors.coinFlipTails : AppColors.coinFlipHeads).withOpacity(0.5), blurRadius: 20)],
                    ),
                    child: Center(
                      child: Text(
                        isTails ? AppStrings.tails : AppStrings.heads, 
                        style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)
                      ),
                    ),
                  ),
                );
              }
            ),
            const SizedBox(height: 60),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.coinFlipHeads, padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 15)),
                  onPressed: _isFlipping ? null : () => _flipCoin(0),
                  child: Text(AppStrings.heads, style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 18)),
                ),
                const SizedBox(width: 20),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.coinFlipTails, padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 15)),
                  onPressed: _isFlipping ? null : () => _flipCoin(1),
                  child: Text(AppStrings.tails, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
                ),
              ],
            )
          ]
        ),
      ),
    ),
    );
      },
    );
  }
}
