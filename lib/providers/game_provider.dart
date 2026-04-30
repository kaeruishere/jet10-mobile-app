import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'dart:async';
import '../core/constants/app_constants.dart';
import '../data/models/game_model.dart';
import '../data/services/coin_service.dart';

class GameProvider extends ChangeNotifier {
  final CoinService _coinService;
  StreamSubscription<QuerySnapshot<Map<String, dynamic>>>? _gamesSub;
  final bool Function(String gameId) _isUnlocked;
  final int Function(String gameId) _playCountForGame;
  
  GameProvider(
    this._coinService, {
    bool autoListen = true,
    bool Function(String gameId)? isUnlocked,
    int Function(String gameId)? playCountForGame,
    List<Game>? initialGames,
  })  : _isUnlocked = isUnlocked ?? _defaultIsUnlocked,
        _playCountForGame = playCountForGame ?? _defaultPlayCount {
    _coinService.addListener(_handleCoinStateChanged);
    if (initialGames != null) {
      _allGames = initialGames;
      _isLoading = false;
      _recomputeDisplayList();
    }
    if (autoListen) {
      _initGamesStream();
    }
  }

  List<Game> _allGames = [];
  String _searchQuery = '';
  bool _isLoading = true;
  List<Game> _displayList = [];

  List<Game> get allGames => _allGames;
  String get searchQuery => _searchQuery;
  bool get isLoading => _isLoading;
  List<Game> get displayList => _displayList;

  static bool _defaultIsUnlocked(String gameId) => CoinService().isGameUnlocked(gameId);
  static int _defaultPlayCount(String gameId) => CoinService().unlockedGamesData[gameId] ?? 0;

  void _initGamesStream() {
    _gamesSub = FirebaseFirestore.instance
        .collection(AppConstants.gamesCollection)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .listen((snapshot) {
      _allGames = snapshot.docs.map((doc) => Game.fromFirestore(doc)).toList();
      _isLoading = false;
      _recomputeDisplayList();
      notifyListeners();
    });
  }

  void updateSearchQuery(String query) {
    final normalized = query.toLowerCase();
    if (_searchQuery == normalized) return;
    _searchQuery = normalized;
    _recomputeDisplayList();
    notifyListeners();
  }

  List<Game> _buildFilteredGames() {
    if (_searchQuery.isEmpty) return _allGames;
    return _allGames.where((game) => 
      game.name.toLowerCase().contains(_searchQuery)
    ).toList();
  }

  void _recomputeDisplayList() {
    final filteredGames = _buildFilteredGames();
    final unlockedGames = filteredGames.where((game) => 
      game.cost <= 0 || _isUnlocked(game.id)
    ).toList();
    
    // Sort unlocked games by play count (descending) then name
    unlockedGames.sort((a, b) {
      final countA = _playCountForGame(a.id);
      final countB = _playCountForGame(b.id);
      if (countA != countB) return countB.compareTo(countA);
      return a.name.compareTo(b.name);
    });

    final lockedGames = filteredGames.where((game) => 
      game.cost > 0 && !_isUnlocked(game.id)
    ).toList();
    
    // Sort locked games by cost (ascending) then name
    lockedGames.sort((a, b) {
      if (a.cost != b.cost) return a.cost.compareTo(b.cost);
      return a.name.compareTo(b.name);
    });

    _displayList = [...unlockedGames, ...lockedGames];
  }

  void _handleCoinStateChanged() {
    _recomputeDisplayList();
    notifyListeners();
  }

  @override
  void dispose() {
    _gamesSub?.cancel();
    _coinService.removeListener(_handleCoinStateChanged);
    super.dispose();
  }
}
