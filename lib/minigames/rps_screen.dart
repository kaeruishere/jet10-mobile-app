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

class RpsScreen extends StatefulWidget {
  const RpsScreen({super.key});

  @override
  State<RpsScreen> createState() => _RpsScreenState();
}

class _RpsScreenState extends State<RpsScreen> {
  int? _playerChoice;
  int? _aiChoice;
  String _resultText = AppStrings.rpsChoose;
  bool _isPlaying = false;
  final Random _random = Random();

  final List<String> _options = [AppStrings.rpsRock, AppStrings.rpsPaper, AppStrings.rpsScissors];
  final List<IconData> _icons = [Icons.terrain, Icons.note, Icons.content_cut];

  void _play(int choice) async {
    final coinService = context.read<CoinService>();
    // Always subtract coins, allowing negative balance as requested
    bool canStart = await coinService.subtractCoins(AppConstants.rpsBet, allowNegative: true);

    if (!canStart) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(AppStrings.insufficientJeton), backgroundColor: AppColors.errorRed),
      );
      return;
    }

    AudioService().playRPS();
    setState(() {
      _playerChoice = choice;
      _aiChoice = null;
      _resultText = AppStrings.rpsOpponentThinking;
      _isPlaying = true;
    });

    await Future.delayed(const Duration(seconds: 1)); // Suspense
    if (!mounted) return;

    setState(() {
      _aiChoice = _random.nextInt(3);
      _isPlaying = false;
      
      if (_playerChoice == _aiChoice) {
        _resultText = AppStrings.rpsDraw;
        coinService.addCoins(AppConstants.rpsBet); // Return the bet
      } else {
        bool playerWins = (_playerChoice == 0 && _aiChoice == 2) || 
                          (_playerChoice == 1 && _aiChoice == 0) || 
                          (_playerChoice == 2 && _aiChoice == 1);
        
        int winningChoice = playerWins ? _playerChoice! : _aiChoice!;
        
        if (winningChoice == 0) {
          AudioService().playRockWin();
        } else if (winningChoice == 1) {
          AudioService().playPaperWin();
        } else {
          AudioService().playScissorsWin();
        }

        if (playerWins) {
          _resultText = AppStrings.rpsWin;
          coinService.addCoins(AppConstants.rpsBet * 2); // Net profit is AppConstants.rpsBet
          Future.delayed(const Duration(milliseconds: 800), () {
            if (!mounted) return;
            AudioService().playWin();
          });
        } else {
          _resultText = AppStrings.rpsLose;
          Future.delayed(const Duration(milliseconds: 800), () {
            if (!mounted) return;
            AudioService().playLose();
          });
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<SettingsService>(
      builder: (context, settings, _) {
        final isDark = Theme.of(context).brightness == Brightness.dark;
        return PopScope(
          canPop: true,
          onPopInvokedWithResult: (didPop, _) {
            if (didPop) AdService().showInterstitialAdOnExit();
          },
          child: Scaffold(
            appBar: AppBar(
              title: Text(AppStrings.rpsTitle, style: TextStyle(color: isDark ? Colors.white : Colors.black87)), 
              backgroundColor: Colors.transparent, 
              elevation: 0,
              iconTheme: IconThemeData(color: isDark ? Colors.white : Colors.black87),
            ),
            backgroundColor: Theme.of(context).scaffoldBackgroundColor,
            body: Column(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                // AI Side
                Column(
                  children: [
                    Text(AppStrings.rpsComputer, style: const TextStyle(color: Colors.white54, fontSize: 18)),
                    const SizedBox(height: 15),
                    Container(
                      width: 100, height: 100,
                      decoration: BoxDecoration(color: AppColors.rpsComputerBg, shape: BoxShape.circle, border: Border.all(color: AppColors.errorRed)),
                      child: Icon(_aiChoice != null ? _icons[_aiChoice!] : Icons.question_mark, color: AppColors.errorRed, size: 50),
                    )
                  ],
                ),
                
                Text(_resultText, style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold), textAlign: TextAlign.center),

                // Player Side
                Column(
                  children: [
                     Container(
                       width: 100, height: 100,
                       decoration: BoxDecoration(color: AppColors.rpsPlayerBg, shape: BoxShape.circle, border: Border.all(color: AppColors.successGreen)),
                       child: Icon(_playerChoice != null ? _icons[_playerChoice!] : Icons.person, color: AppColors.successGreen, size: 50),
                     ),
                     const SizedBox(height: 15),
                     Text(
                       '${AppStrings.rpsYou} (${AppConstants.rpsBet} Jeton)',
                       style: const TextStyle(
                         color: Colors.white54,
                         fontSize: 16,
                       ),
                     ),
                  ],
                ),

                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(3, (index) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.optionButtonBg,
                          padding: const EdgeInsets.all(20),
                          shape: const CircleBorder(),
                        ),
                        onPressed: _isPlaying ? null : () => _play(index),
                        child: Icon(_icons[index], color: Colors.white, size: 30),
                      ),
                    );
                  }),
                )
              ]
            )
          ),
        );
      },
    );
  }
}
