import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:firebase_performance/firebase_performance.dart';
import '../../data/models/game_model.dart';
import '../../core/theme/app_colors.dart';
import '../../data/services/ad_service.dart';
import '../../data/services/auth_service.dart';
import '../../data/services/score_service.dart';
import '../../data/services/crashlytics_service.dart';

class OyunEkrani extends StatefulWidget {
  final Game game;
  const OyunEkrani({super.key, required this.game});

  @override
  State<OyunEkrani> createState() => _OyunEkraniState();
}

class _OyunEkraniState extends State<OyunEkrani> {
  double _progress = 0;
  Trace? _webviewLoadTrace;

  @override
  void initState() {
    super.initState();
    CrashlyticsService().breadcrumb('game_flow', 'game_screen_opened:${widget.game.id}');
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  }

  @override
  void dispose() {
    _webviewLoadTrace?.stop();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: true,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) AdService().showInterstitialAdOnExit();
      },
      child: Scaffold(
        backgroundColor: Colors.black,
        body: Stack(
          children: [
            if (widget.game.url.isNotEmpty) 
              InAppWebView(
                initialUrlRequest: URLRequest(
                  url: WebUri(widget.game.url),
                ),
                initialSettings: InAppWebViewSettings(
                  javaScriptEnabled: true,
                  transparentBackground: true,
                  useShouldOverrideUrlLoading: true,
                  mediaPlaybackRequiresUserGesture: false,
                ),
                onWebViewCreated: (controller) {
                  controller.addJavaScriptHandler(
                    handlerName: 'saveScore',
                    callback: (args) {
                      if (args.isNotEmpty) {
                        final score = int.tryParse(args[0].toString()) ?? 0;
                        ScoreService().saveScore(
                          gameId: widget.game.id,
                          gameName: widget.game.name,
                          score: score,
                        );
                        
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text("Skor Kaydedildi: $score"),
                            behavior: SnackBarBehavior.floating,
                            backgroundColor: Theme.of(context).colorScheme.primary,
                            duration: const Duration(seconds: 2),
                          ),
                        );
                      }
                    },
                  );
                },
                onLoadStop: (controller, url) async {
                  await _webviewLoadTrace?.stop();
                  _webviewLoadTrace = null;
                  CrashlyticsService().setCustomKey('last_game_id', widget.game.id);

                  final user = AuthService().localUser;
                  if (user != null) {
                    final jsCode = """
                      window.currentUser = {
                        uid: '${AuthService().uid}',
                        username: '${user.username}',
                        displayName: '${user.displayName}',
                        coins: ${user.coins}
                      };
                      console.log('User data injected');
                    """;
                    await controller.evaluateJavascript(source: jsCode);
                  }
                },
                onProgressChanged: (controller, progress) {
                  setState(() => _progress = progress / 100.0);
                },
                onLoadStart: (controller, url) async {
                  if (_webviewLoadTrace == null) {
                    _webviewLoadTrace = FirebasePerformance.instance.newTrace('webview_game_load');
                    _webviewLoadTrace?.putAttribute('game_id', widget.game.id);
                    await _webviewLoadTrace?.start();
                  }
                },
              ),
            if (_progress < 1.0)
              Positioned(
                top: 0, left: 0, right: 0,
                child: LinearProgressIndicator(
                  value: _progress,
                  color: Theme.of(context).colorScheme.primary,
                  backgroundColor: Colors.transparent,
                ),
              ),
            Positioned(
              top: MediaQuery.of(context).padding.top > 0 ? MediaQuery.of(context).padding.top + 10 : 30,
              left: 20,
              child: GestureDetector(
                onTap: () => Navigator.pop(context),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.6),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white.withOpacity(0.3), width: 1),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.4),
                        blurRadius: 8,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.close,
                    color: Colors.white,
                    size: 26,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
