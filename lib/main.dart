import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart'; // 1. Reklam Paketini Ekledik

void main() async { // 2. Async yaptık
  WidgetsFlutterBinding.ensureInitialized();
  
  // 3. Reklam SDK'sını başlattık
  await MobileAds.instance.initialize(); 
  
  runApp(OyunKutuphanesiApp());
}

class OyunKutuphanesiApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Oyun Kütüphanem',
      theme: ThemeData(
        brightness: Brightness.dark,
        primarySwatch: Colors.deepPurple,
        scaffoldBackgroundColor: Color(0xFF05050F), 
        cardTheme: CardThemeData(
          color: Color(0xFF1A1A2E), 
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        ),
        appBarTheme: AppBarTheme(
          backgroundColor: Colors.transparent,
          elevation: 0,
          centerTitle: true,
          titleTextStyle: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.5,
            color: Colors.white,
          ),
        ),
      ),
      home: AnaMenuekrani(),
    );
  }
}

// 4. AnaMenuekrani'ni StatefulWidget yaptık (Reklam durumunu takip etmek için)
class AnaMenuekrani extends StatefulWidget {
  @override
  _AnaMenuekraniState createState() => _AnaMenuekraniState();
}

class _AnaMenuekraniState extends State<AnaMenuekrani> {
  BannerAd? _bannerAd;
  bool _isBannerLoaded = false;

  final String adUnitId = 'ca-app-pub-8178762756925111/9095149202';
  
  final List<String> oyunlar = [
    'Breaker', 'ChopChop', 'Dart', 'Dash', 
    'Helix', 'Roller', 'Snake', 'Sort', 
    'ColorBall', 'Tiles', 'Tower', 'ZigZag', 'StickMaster'
  ];

  @override
  void initState() {
    super.initState();
    _loadBanner();
  }

  void _loadBanner() {
    _bannerAd = BannerAd(
      adUnitId: adUnitId,
      size: AdSize.banner,
      request: const AdRequest(),
      listener: BannerAdListener(
        onAdLoaded: (ad) {
          setState(() {
            _isBannerLoaded = true;
          });
        },
        onAdFailedToLoad: (ad, err) {
          ad.dispose();
          print('Banner yüklenemedi: ${err.message}');
        },
      ),
    )..load();
  }

  @override
  void dispose() {
    _bannerAd?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('JET10'),
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF05050F), Color(0xFF16213E)],
          ),
        ),
        child: GridView.builder(
          padding: EdgeInsets.all(20),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 15,
            mainAxisSpacing: 15,
            childAspectRatio: 0.85,
          ),
          itemCount: oyunlar.length,
          itemBuilder: (context, index) {
            return _oyunKart(context, oyunlar[index], index);
          },
        ),
      ),
      // 5. REKLAMI EN ALTA SABİTLEDİK
      bottomNavigationBar: _isBannerLoaded
          ? Container(
              color: Colors.transparent,
              height: _bannerAd!.size.height.toDouble(),
              width: _bannerAd!.size.width.toDouble(),
              child: AdWidget(ad: _bannerAd!),
            )
          : null,
    );
  }

  Widget _oyunKart(BuildContext context, String oyunAdi, int index) {
    final List<List<Color>> gradients = [
      [Color(0xFF00F2FE), Color(0xFF4FACFE)], 
      [Color(0xFFFF2D78), Color(0xFFFF6EB4)], 
      [Color(0xFFB224EF), Color(0xFF7579FF)], 
      [Color(0xFF39FF14), Color(0xFF00D2FF)], 
      [Color(0xFFFF7B00), Color(0xFFFF00D2)], 
    ];

    List<Color> gradient = gradients[index % gradients.length];

    return InkWell(
      onTap: () => _oyunuAc(context, oyunAdi),
      borderRadius: BorderRadius.circular(24),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: LinearGradient(
            colors: gradient.map((c) => c.withOpacity(0.8)).toList(),
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          boxShadow: [
            BoxShadow(
              color: gradient[0].withOpacity(0.3),
              blurRadius: 10,
              offset: Offset(0, 5),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: EdgeInsets.all(15),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.videogame_asset, size: 45, color: Colors.white),
            ),
            SizedBox(height: 15),
            Text(
              oyunAdi.toUpperCase(),
              style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900),
            ),
          ],
        ),
      ),
    );
  }

  void _oyunuAc(BuildContext context, String oyunAdi) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => OyunEkrani(oyunKlasoru: oyunAdi),
      ),
    );
  }
}

// OyunEkrani class'ın aynı kalıyor (WebView ve Localhost kodun çok iyi)...
// Sadece dispose kısmında reklam çakışmasın diye dikkat et.
class OyunEkrani extends StatefulWidget {
  final String oyunKlasoru;
  OyunEkrani({required this.oyunKlasoru});

  @override
  _OyunEkraniState createState() => _OyunEkraniState();
}

class _OyunEkraniState extends State<OyunEkrani> {
  InAppLocalhostServer localhostServer = InAppLocalhostServer(port: 8080);
  bool isServerRunning = false;

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    baslatSunucu();
  }

  void baslatSunucu() async {
    if (!localhostServer.isRunning()) {
      await localhostServer.start();
    }
    setState(() {
      isServerRunning = true;
    });
  }

  @override
  void dispose() {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    localhostServer.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      child: Scaffold(
        backgroundColor: Colors.black,
        body: isServerRunning
            ? InAppWebView(
                initialUrlRequest: URLRequest(
                  url: WebUri("http://localhost:8080/assets/oyunlar/${widget.oyunKlasoru}/index.html"),
                ),
                initialSettings: InAppWebViewSettings(
                  javaScriptEnabled: true,
                  transparentBackground: true,
                  allowFileAccessFromFileURLs: true,
                  allowUniversalAccessFromFileURLs: true,
                ),
              )
            : Center(child: CircularProgressIndicator(color: Colors.white)),
      ),
    );
  }
}