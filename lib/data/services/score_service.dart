import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import '../../core/constants/app_constants.dart';
import 'auth_service.dart';
import 'crashlytics_service.dart';

class ScoreService {
  static final ScoreService _instance = ScoreService._internal();
  factory ScoreService() => _instance;
  ScoreService._internal();

  final FirebaseFirestore _db = FirebaseFirestore.instance;

  Future<void> saveScore({
    required String gameId,
    required String gameName,
    required int score,
  }) async {
    final uid = AuthService().uid;
    if (uid.isEmpty) return;
    CrashlyticsService().breadcrumb('game_flow', 'score_save_requested:$gameId:$score');

    final scoreRef = _db
        .collection(AppConstants.usersCollection)
        .doc(uid)
        .collection(AppConstants.scoresSubCollection)
        .doc(gameId);

    try {
      CrashlyticsService().breadcrumb('game_flow', 'score_firestore_read_start:$gameId');
      final doc = await scoreRef.get();
      
      if (doc.exists) {
        final currentBest = int.tryParse(doc.data()?['bestScore']?.toString() ?? '0') ?? 0;
        
        CrashlyticsService().breadcrumb('game_flow', 'score_firestore_update_start:$gameId');
        await scoreRef.update({
          'lastScore': score,
          'bestScore': score > currentBest ? score : currentBest,
          'lastPlayedAt': FieldValue.serverTimestamp(),
          'playCount': FieldValue.increment(1),
        });
      } else {
        CrashlyticsService().breadcrumb('game_flow', 'score_firestore_create_start:$gameId');
        await scoreRef.set({
          'gameId': gameId,
          'gameName': gameName,
          'lastScore': score,
          'bestScore': score,
          'createdAt': FieldValue.serverTimestamp(),
          'lastPlayedAt': FieldValue.serverTimestamp(),
          'playCount': 1,
        });
      }
      
      debugPrint("Score saved for $gameName: $score");
      CrashlyticsService().breadcrumb('game_flow', 'score_save_success:$gameId');
    } catch (e) {
      debugPrint("Error saving score: $e");
      CrashlyticsService().recordError(
        e,
        StackTrace.current,
        reason: 'Score save failed',
        fatal: false,
      );
    }
  }

  Stream<QuerySnapshot> getBestScores() {
    final uid = AuthService().uid;
    if (uid.isEmpty) return const Stream.empty();

    return _db
        .collection(AppConstants.usersCollection)
        .doc(uid)
        .collection(AppConstants.scoresSubCollection)
        .orderBy('bestScore', descending: true)
        .snapshots();
  }
}
