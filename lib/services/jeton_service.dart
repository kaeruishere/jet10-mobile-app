import 'package:shared_preferences/shared_preferences.dart';

/// Günlük mini oyun hakkı — her gün sıfırlanır
class JetonService {
  static const _coinKey = 'coin_plays';
  static const _slotKey = 'slot_plays';
  static const _rpsKey = 'rps_plays';
  static const _dateKey = 'last_play_date';

  static const coinDailyLimit = 5;
  static const slotDailyLimit = 3;
  static const rpsDailyLimit = 5;

  Future<SharedPreferences> get _prefs => SharedPreferences.getInstance();

  Future<void> _resetIfNewDay() async {
    final prefs = await _prefs;
    final today = DateTime.now().toIso8601String().substring(0, 10);
    final last = prefs.getString(_dateKey) ?? '';
    if (last != today) {
      await prefs.setString(_dateKey, today);
      await prefs.setInt(_coinKey, 0);
      await prefs.setInt(_slotKey, 0);
      await prefs.setInt(_rpsKey, 0);
    }
  }

  Future<int> getRemainingPlays(String gameKey) async {
    await _resetIfNewDay();
    final prefs = await _prefs;
    final played = prefs.getInt(gameKey) ?? 0;
    final limit = _getLimit(gameKey);
    return (limit - played).clamp(0, limit);
  }

  Future<bool> consumePlay(String gameKey) async {
    final remaining = await getRemainingPlays(gameKey);
    if (remaining <= 0) return false;
    final prefs = await _prefs;
    final played = prefs.getInt(gameKey) ?? 0;
    await prefs.setInt(gameKey, played + 1);
    return true;
  }

  int _getLimit(String key) {
    switch (key) {
      case _coinKey: return coinDailyLimit;
      case _slotKey: return slotDailyLimit;
      case _rpsKey: return rpsDailyLimit;
      default: return 0;
    }
  }

  static String get coinKey => _coinKey;
  static String get slotKey => _slotKey;
  static String get rpsKey => _rpsKey;
}
