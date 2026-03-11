import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/user_model.dart';
import '../models/game_model.dart';

class FirestoreService {
  final _db = FirebaseFirestore.instance;

  // ── USERS ──────────────────────────────────────────────

  Future<void> createUserIfNotExists(String uid) async {
    final doc = _db.collection('users').doc(uid);
    final snap = await doc.get();
    if (!snap.exists) {
      await doc.set({
        'jetons': 50, // başlangıç jeton
        'unlockedGames': [],
        'createdAt': FieldValue.serverTimestamp(),
      });
    }
  }

  Stream<UserModel> userStream(String uid) {
    return _db
        .collection('users')
        .doc(uid)
        .snapshots()
        .map((s) => UserModel.fromMap(uid, s.data() ?? {}));
  }

  Future<UserModel?> getUser(String uid) async {
    final snap = await _db.collection('users').doc(uid).get();
    if (!snap.exists) return null;
    return UserModel.fromMap(uid, snap.data()!);
  }

  // ── JETONS ─────────────────────────────────────────────

  Future<bool> addJetons(String uid, int amount) async {
    try {
      await _db.collection('users').doc(uid).update({
        'jetons': FieldValue.increment(amount),
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> spendJetons(String uid, int amount) async {
    final user = await getUser(uid);
    if (user == null || user.jetons < amount) return false;

    await _db.collection('users').doc(uid).update({
      'jetons': FieldValue.increment(-amount),
    });
    return true;
  }

  // ── GAMES ──────────────────────────────────────────────

  Stream<List<GameModel>> gamesStream() {
    // where + orderBy birlikte Firestore index gerektirir.
    // Basit sorgu kullan, sıralamayı client tarafında yap.
    return _db
        .collection('games')
        .snapshots()
        .map((s) {
          final list = s.docs
              .map((d) => GameModel.fromMap(d.id, d.data()))
              .where((g) => g.isActive)
              .toList();
          list.sort((a, b) => a.order.compareTo(b.order));
          return list;
        });
  }

  // ── UNLOCK ─────────────────────────────────────────────

  Future<bool> unlockGame(String uid, String gameId, int cost) async {
    final spent = await spendJetons(uid, cost);
    if (!spent) return false;

    await _db.collection('users').doc(uid).update({
      'unlockedGames': FieldValue.arrayUnion([gameId]),
    });
    return true;
  }
}