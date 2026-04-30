import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'dart:async';
import '../../core/constants/app_constants.dart';
import '../models/game_model.dart';
import 'auth_service.dart';
import 'crashlytics_service.dart';

class CoinService extends ChangeNotifier {
  static final CoinService _instance = CoinService._internal();
  factory CoinService() => _instance;
  CoinService._internal();

  late SharedPreferences _prefs;
  int _balance = AppConstants.startingBalance;
  Map<String, int> _unlockedGamesData = {}; // gameId -> playCount
  List<String> _unlockedGames = [];
  
  StreamSubscription? _coinSub;
  StreamSubscription? _gamesSub;

  int get balance => _balance;
  List<String> get unlockedGames => _unlockedGames;
  Map<String, int> get unlockedGamesData => _unlockedGamesData;

  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
    _balance = _prefs.getInt('jeton_balance') ?? AppConstants.startingBalance;
    _unlockedGames = _prefs.getStringList('unlocked_games') ?? [];
    
    final uid = AuthService().uid;
    if (uid.isNotEmpty) {
      final db = FirebaseFirestore.instance;
      
      // Initial fetch for synchronization
      final docSnap = await db.collection(AppConstants.usersCollection).doc(uid).get();
      if (docSnap.exists) {
        final data = docSnap.data();
        if (data != null && data.containsKey('coins')) {
          _balance = int.tryParse(data['coins']?.toString() ?? '100') ?? 100;
          _prefs.setInt('jeton_balance', _balance);
        }
      }

      // Synchronize unlocked games
      final gamesSnap = await db.collection(AppConstants.usersCollection).doc(uid).collection(AppConstants.unlockedGamesSubCollection).get();
      _unlockedGamesData = { for (var d in gamesSnap.docs) d.id : (int.tryParse(d.data()['playCount']?.toString() ?? '0') ?? 0) };
      _unlockedGames = _unlockedGamesData.keys.toList();
      _prefs.setStringList('unlocked_games', _unlockedGames);

      // Cancel old subscriptions if any
      await _coinSub?.cancel();
      await _gamesSub?.cancel();

      // Listen for real-time updates for coins
      _coinSub = db.collection(AppConstants.usersCollection).doc(uid).snapshots().listen((doc) {
        if (doc.exists && doc.data() != null && doc.data()!.containsKey('coins')) {
          _balance = int.tryParse(doc.data()!['coins']?.toString() ?? '100') ?? 100;
          _prefs.setInt('jeton_balance', _balance);
          CrashlyticsService().setCustomKey('coin_balance', _balance);
          notifyListeners();
        }
      });
      
      // Listen for real-time updates on games
      _gamesSub = db.collection(AppConstants.usersCollection).doc(uid).collection(AppConstants.unlockedGamesSubCollection).snapshots().listen((snapshot) {
        _unlockedGamesData = { for (var d in snapshot.docs) d.id : (int.tryParse(d.data()['playCount']?.toString() ?? '0') ?? 0) };
        _unlockedGames = _unlockedGamesData.keys.toList();
        _prefs.setStringList('unlocked_games', _unlockedGames);
        notifyListeners();
      });
    }

    notifyListeners();
  }

  @override
  void dispose() {
    _coinSub?.cancel();
    _gamesSub?.cancel();
    super.dispose();
  }

  void addCoins(int amount) {
    _balance += amount;
    _prefs.setInt('jeton_balance', _balance);
    CrashlyticsService().setCustomKey('coin_balance', _balance);
    _syncCoinsToDb();
    notifyListeners();
  }

  // Implementation using Transactions for better security
  Future<bool> subtractCoins(int amount, {bool allowNegative = false}) async {
    final uid = AuthService().uid;
    if (uid.isEmpty) return false;
    CrashlyticsService().breadcrumb('coin_flow', 'coin_subtract_requested:$amount (allowNegative: $allowNegative)');

    final userRef = FirebaseFirestore.instance.collection(AppConstants.usersCollection).doc(uid);

    try {
      final result = await FirebaseFirestore.instance.runTransaction((transaction) async {
        final snapshot = await transaction.get(userRef);
        if (!snapshot.exists) return false;

        int currentCoins = int.tryParse(snapshot.data()?['coins']?.toString() ?? '0') ?? 0;
        
        if (!allowNegative && currentCoins < amount) {
          CrashlyticsService().breadcrumb('coin_flow', 'coin_subtract_insufficient');
          return false;
        }

        CrashlyticsService().breadcrumb('coin_flow', 'coin_subtract_firestore_update_start');
        transaction.update(userRef, {'coins': currentCoins - amount});
        return true;
      });

      if (result) {
        _balance -= amount;
        _prefs.setInt('jeton_balance', _balance);
        CrashlyticsService().setCustomKey('coin_balance', _balance);
        CrashlyticsService().breadcrumb('coin_flow', 'coin_subtract_success');
        notifyListeners();
      }
      return result;
    } catch (e) {
      debugPrint("Transaction failed: $e");
      CrashlyticsService().recordError(
        e,
        StackTrace.current,
        reason: 'Coin subtraction transaction failed',
        fatal: false,
      );
      return false;
    }
  }

  void _syncCoinsToDb() {
    final uid = AuthService().uid;
    if (uid.isNotEmpty) {
      FirebaseFirestore.instance.collection(AppConstants.usersCollection).doc(uid).update({'coins': _balance});
    }
  }

  bool isGameUnlocked(String gameId) {
    return _unlockedGames.contains(gameId);
  }

  Future<bool> unlockGame(Game game) async {
    if (isGameUnlocked(game.id)) return true;
    CrashlyticsService().breadcrumb('unlock_flow', 'unlock_requested:${game.id}');
    
    final success = await subtractCoins(game.cost);
    if (success) {
      final uid = AuthService().uid;
      if (uid.isNotEmpty) {
        CrashlyticsService().breadcrumb('unlock_flow', 'unlock_firestore_update_start:${game.id}');
        await FirebaseFirestore.instance.collection(AppConstants.usersCollection).doc(uid)
          .collection(AppConstants.unlockedGamesSubCollection).doc(game.id).set({
            'unlockedAt': FieldValue.serverTimestamp(),
            'playCount': 0,
            'gameName': game.name,
          }).then((_) {
            CrashlyticsService().breadcrumb('unlock_flow', 'unlock_firestore_success:${game.id}');
          }).catchError((e) {
            debugPrint("Error syncing game unlock: $e");
            CrashlyticsService().recordError(
              e,
              StackTrace.current,
              reason: 'Unlock game Firestore sync failed',
              fatal: false,
            );
          });
      }
      return true;
    }
    CrashlyticsService().breadcrumb('unlock_flow', 'unlock_failed:${game.id}');
    return false;
  }

  Future<bool> unlockGameWithAd(Game game) async {
    if (isGameUnlocked(game.id)) return true;
    
    final uid = AuthService().uid;
    if (uid.isNotEmpty) {
      try {
        await FirebaseFirestore.instance.collection(AppConstants.usersCollection).doc(uid)
          .collection(AppConstants.unlockedGamesSubCollection).doc(game.id).set({
            'unlockedAt': FieldValue.serverTimestamp(),
            'playCount': 0,
            'gameName': game.name,
          });
        return true;
      } catch (e) {
        debugPrint("Error syncing game unlock via ad: $e");
        return false;
      }
    }
    return false;
  }

  void incrementPlayCount(String gameId) {
    final uid = AuthService().uid;
    if (uid.isNotEmpty && isGameUnlocked(gameId)) {
      FirebaseFirestore.instance.collection(AppConstants.usersCollection).doc(uid)
        .collection(AppConstants.unlockedGamesSubCollection).doc(gameId).update({
          'playCount': FieldValue.increment(1),
          'lastPlayedAt': FieldValue.serverTimestamp(),
        }).catchError((e) => debugPrint("Error incrementing play count: $e"));
    }
  }
}
