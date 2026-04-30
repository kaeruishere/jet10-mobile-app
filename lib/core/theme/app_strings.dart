class AppStrings {
  static String _currentLanguage = 'tr';

  static void setLanguage(String languageCode) {
    _currentLanguage = languageCode;
  }

  static String get appName => _getText('Oyun Kütüphanem', 'My Game Library');
  static const String appTitle = 'JET10';
  
  // Home Screen
  static String get searchHint => _getText('Oyun Ara...', 'Search Games...');
  static String get noGamesFound => _getText('Henüz oyun bulunmuyor.', 'No games found yet.');
  static String get noSearchMatch => _getText('Aranan oyun bulunamadı.', 'Search did not match any games.');
  static String get urlNotFound => _getText('Oyun URL bulunamadı', 'Game URL not found');
  static String get unlockCancel => _getText('İptal', 'Cancel');
  static String get unlockTitle => _getText('Kilidi Aç', 'Unlock');
  static String unlockConfirm(int price) => _getText('Aç ($price Jeton)', 'Unlock ($price Jeton)');
  static String unlockPriceLabel(int price) => '$price ${_getText('Jeton', 'Coins')}';
  static String get freeLabel => _getText('Ücretsiz', 'Free');
  
  static String unlockPrompt(String oyunAdi, int price) => 
    _getText('$oyunAdi oyununu $price Jeton karşılığında kalıcı olarak açmak istiyor musun?', 
            'Do you want to unlock $oyunAdi permanently for $price Coins?');
            
  static String get insufficientJeton => _getText('Yetersiz Jeton! Jeton Kazan simgesine tıklayın.', 'Insufficient Coins! Click on Earn Coins.');
  static String gameUnlocked(String oyunAdi) => _getText('$oyunAdi başarıyla açıldı!', '$oyunAdi unlocked successfully!');

  // Earn Coins Screen
  static String get earnTitle => _getText('JETON KAZAN', 'EARN COINS');
  static String get currentBalance => _getText('Mevcut Bakiyen', 'Current Balance');
  
  static String get adWatchTitle => _getText('Reklam İzle', 'Watch Ads');
  static String get adWatchSubtitle => _getText('Kısa bir video izleyerek risk almadan jeton kazan.', 'Earn coins without risk by watching a short video.');
  static String get adRewardLabel => _getText('+10 Jeton', '+10 Coins');
  
  static String get coinFlipTitle => _getText('Yazı Tura Oyna', 'Play Coin Flip');
  static String get coinFlipSubtitle => _getText('Şansını dene! Doğru tahmin edersen jetonları katla.', 'Try your luck! Double your coins with correct guesses.');
  static String get luckGameLabel => _getText('Şans Oyunu', 'Luck Game');
  
  static String get rpsTitle => _getText('Taş Kağıt Makas', 'Rock Paper Scissors');
  static String get rpsSubtitle => _getText('Yapay zekaya karşı zekanı kullan ve kazan!', 'Use your intelligence against AI and win!');
  static String get skillGameLabel => _getText('Yetenek Oyunu', 'Skill Game');

  // Notifications
  static String get adNotLoaded => _getText('Reklam henüz yüklenmedi, lütfen bekleyin.', 'Ad not loaded yet, please wait.');
  static String get adLoading => _getText('Reklam yükleniyor...', 'Ad is loading...');
  static String get adRewardSuccess => _getText('Tebrikler! 10 Jeton Kazandın!', 'Congratulations! You earned 10 Coins!');

  // Minigames
  static String get coinFlipBet => _getText('Bahis: 5 Jeton', 'Bet: 5 Coins');
  static String get heads => _getText('YAZI', 'HEADS');
  static String get tails => _getText('TURA', 'TAILS');
  static String get winTitle => _getText('Kazandın!', 'You Won!');
  static String get loseTitle => _getText('Kaybettin...', 'You Lost...');
  static String get coinFlipWinDesc => _getText('Tebrikler! Doğru tahmin ettin ve 5 Jeton kazandın!', 'Congratulations! Correct guess, you earned 5 Coins!');
  static String get coinFlipLoseDesc => _getText('Maalesef yanlış tahmin. 5 Jeton kaybettin.', 'Unfortunately wrong guess. You lost 5 Coins.');
  static String get okay => _getText('Tamam', 'Okay');

  static String get rpsChoose => _getText('Seçimini Yap!', 'Make Your Choice!');
  static String get rpsOpponentThinking => _getText('Rakip seçiyor...', 'Opponent is thinking...');
  static String get rpsComputer => _getText('Bilgisayar', 'Computer');
  static String get rpsYou => _getText('Sen', 'You');
  static String get rpsDraw => _getText('Berabere! Jetonun iade edildi.', 'Draw! Coins returned.');
  static String get rpsWin => _getText('Kazandın! +5 Jeton', 'You Won! +5 Coins');
  static String get rpsLose => _getText('Kaybettin! -5 Jeton', 'You Lost! -5 Coins');
  static String get rpsRock => _getText('Taş', 'Rock');
  static String get rpsPaper => _getText('Kağıt', 'Paper');
  static String get rpsScissors => _getText('Makas', 'Scissors');

  // Settings
  static String get settingsTitle => _getText('Ayarlar', 'Settings');
  static String get settingsGeneral => _getText('GENEL', 'GENERAL');
  static String get settingsAudio => _getText('Ses Efektleri', 'Sound Effects');
  static String get settingsAudioDesc => _getText('Oyun içi sesler ve tıklamalar', 'In-game sounds and clicks');
  static String get settingsTheme => _getText('Tema', 'Theme');
  static String get settingsThemeDark => _getText('Koyu Tema', 'Dark Theme');
  static String get settingsThemeLight => _getText('Açık Tema', 'Light Theme');
  static String get settingsLanguage => _getText('Dil', 'Language');
  static String get settingsLanguageTr => _getText('Türkçe', 'Turkish');
  static String get settingsLanguageEn => _getText('English', 'English');
  
  static String get settingsAccount => _getText('HESAP & SENKRONİZASYON', 'ACCOUNT & SYNC');
  static String get settingsGoogleLogin => _getText('Google ile Giriş Yap', 'Sign in with Google');
  static String get settingsGoogleLoginDesc => _getText('Jetonlarınızı ve oyunlarınızı buluta kaydedin', 'Save your coins and games to cloud');
  static String get settingsGoogleLoggingIn => _getText('Google ile giriş yapılıyor...', 'Signing in with Google...');
  static String get settingsGoogleLoginSuccess => _getText('Giriş Başarılı!', 'Login Successful!');
  static String get settingsGoogleLoginFail => _getText('Giriş Başarısız!', 'Login Failed!');

  // Profile
  static String get profileTitle => _getText('Profil', 'Profile');
  static String get profileGuestName => _getText('Misafir Kullanıcı', 'Guest User');
  static String get profileUsername => _getText('Kullanıcı Adı', 'Username');
  static String get profileSelectEmoji => _getText('Profil İkonu Seç', 'Select Profile Icon');
  static String get profileGoogleLoginInfo => _getText('İlerlemeni kaybetmemek ve hesabını buluta kaydetmek için Google ile bağlan.', 'Connect with Google to save your progress to the cloud.');

  // Ana Menu
  static String get earnCoinsCardTitle => _getText('JETON KAZAN', 'EARN COINS');
  static String get earnCoinsCardDesc => _getText('Reklam izle, oyun oyna, ödül kazan!', 'Watch ads, play games, earn rewards!');
  static String get unlockWithAd => _getText('Reklamla Aç', 'Unlock with Ad');
  static String get unlockWithAdSubtitle => _getText('Alternatif olarak, kısa bir reklam izleyerek de bu oyunu kalıcı olarak açabilirsiniz.', 'Alternatively, you can unlock this game permanently by watching a short ad.');

  // Shared Helper
  static String _getText(String tr, String en) {
    return _currentLanguage == 'tr' ? tr : en;
  }
}
