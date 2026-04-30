import 'package:flutter_test/flutter_test.dart';
import '../../lib/data/models/game_model.dart';
import '../../lib/data/services/coin_service.dart';
import '../../lib/providers/game_provider.dart';

void main() {
  group('GameProvider', () {
    test('filters games by search query', () {
      final provider = GameProvider(
        CoinService(),
        autoListen: false,
        initialGames: [
          Game(id: '1', name: 'Snake', url: 'u1', cost: 0, version: 1),
          Game(id: '2', name: 'Tetris', url: 'u2', cost: 0, version: 1),
          Game(id: '3', name: 'Sudoku', url: 'u3', cost: 0, version: 1),
        ],
      );

      provider.updateSearchQuery('te');
      final names = provider.displayList.map((g) => g.name).toList();

      expect(names, ['Tetris']);
      provider.dispose();
    });

    test('puts unlocked first and sorts by play count', () {
      final unlockedIds = <String>{'u1', 'u2'};
      final playCounts = <String, int>{'u1': 2, 'u2': 9};

      final provider = GameProvider(
        CoinService(),
        autoListen: false,
        isUnlocked: (id) => unlockedIds.contains(id),
        playCountForGame: (id) => playCounts[id] ?? 0,
        initialGames: [
          Game(id: 'u1', name: 'Alpha', url: 'u1', cost: 10, version: 1),
          Game(id: 'l1', name: 'Delta', url: 'u2', cost: 5, version: 1),
          Game(id: 'u2', name: 'Beta', url: 'u3', cost: 7, version: 1),
          Game(id: 'l2', name: 'Gamma', url: 'u4', cost: 2, version: 1),
        ],
      );

      final ids = provider.displayList.map((g) => g.id).toList();

      expect(ids, ['u2', 'u1', 'l2', 'l1']);
      provider.dispose();
    });
  });
}
