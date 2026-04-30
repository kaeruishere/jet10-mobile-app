import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'dart:async';
import '../../core/constants/app_constants.dart';
import '../models/user_model.dart';
import 'coin_service.dart';

class AuthService extends ChangeNotifier {
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();

  User? _firebaseUser;
  LocalUser? _localUser;
  final GoogleSignIn _googleSignIn = GoogleSignIn();
  StreamSubscription<User?>? _authSub;
  StreamSubscription<DocumentSnapshot<Map<String, dynamic>>>? _userDocSub;

  User? get firebaseUser => _firebaseUser;
  LocalUser? get localUser => _localUser;
  String get uid => _firebaseUser?.uid ?? '';
  bool get isAuthenticated => _firebaseUser != null;
  bool get isAnonymous => _firebaseUser?.isAnonymous ?? true;

  Future<void> init() async {
    await _authSub?.cancel();
    // Listen to Auth State changes instead of manual signInAnonymously every time
    _authSub = FirebaseAuth.instance.authStateChanges().listen((User? user) async {
      _firebaseUser = user;
      if (user != null) {
        // Start listening immediately
        _listenToUserDoc(user.uid);
        CoinService().init();
        // Fire and forget ensure doc exists (will sync when online)
        unawaited(_ensureUserDocumentExists(user.uid));
      } else {
        await _userDocSub?.cancel();
        _userDocSub = null;
        _localUser = null;
        // Automatically sign in anonymously if no user
        await FirebaseAuth.instance.signInAnonymously();
      }
      notifyListeners();
    });
  }

  Future<void> _listenToUserDoc(String userId) async {
    await _userDocSub?.cancel();
    _userDocSub = FirebaseFirestore.instance
        .collection(AppConstants.usersCollection)
        .doc(userId)
        .snapshots()
        .listen((doc) {
      if (doc.exists) {
        _localUser = LocalUser.fromFirestore(doc);
      } else {
        _localUser = null;
      }
      notifyListeners();
    });
  }

  @override
  void dispose() {
    _authSub?.cancel();
    _userDocSub?.cancel();
    super.dispose();
  }

  Future<void> _ensureUserDocumentExists(String uid) async {
    final docRef = FirebaseFirestore.instance.collection(AppConstants.usersCollection).doc(uid);
    final docSnap = await docRef.get();

    if (!docSnap.exists) {
      await docRef.set({
        'coins': AppConstants.startingBalance,
        'displayName': 'Misafir Kullanıcı',
        'username': 'misafir${DateTime.now().millisecondsSinceEpoch.toString().substring(8)}',
        'avatarEmoji': '👤',
        'createdAt': FieldValue.serverTimestamp(),
        'lastAppUse': FieldValue.serverTimestamp(),
      });
    } else {
      await docRef.update({
        'lastAppUse': FieldValue.serverTimestamp(),
      });
    }
  }

  Future<bool> signInWithGoogle() async {
    try {
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      if (googleUser == null) return false;

      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      final AuthCredential credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      final currentUser = FirebaseAuth.instance.currentUser;

      if (currentUser != null && currentUser.isAnonymous) {
        // Link anonymous account to Google to save progress
        try {
          await currentUser.linkWithCredential(credential);
          await _updateProfileFromGoogle(googleUser);
        } on FirebaseAuthException catch (e) {
          if (e.code == 'credential-already-in-use') {
            await _mergeAccount(credential, currentUser.uid, googleUser);
            return true;
          } else {
            rethrow;
          }
        }
      } else {
        // Just sign in
        await FirebaseAuth.instance.signInWithCredential(credential);
        await _updateProfileFromGoogle(googleUser);
      }
      return true;
    } catch (e) {
      debugPrint("Google Sign-In Error: $e");
      return false;
    }
  }

  Future<void> _mergeAccount(AuthCredential credential, String oldUid, GoogleSignInAccount googleUser) async {
    final oldUserRef = FirebaseFirestore.instance.collection(AppConstants.usersCollection).doc(oldUid);
    final oldGamesRef = oldUserRef.collection(AppConstants.unlockedGamesSubCollection);
    
    // Get old data
    final oldUserSnap = await oldUserRef.get();
    final oldCoins = int.tryParse(oldUserSnap.data()?['coins']?.toString() ?? '0') ?? 0;
    
    final oldGamesSnap = await oldGamesRef.get();
    final oldGames = oldGamesSnap.docs.map((doc) => {'id': doc.id, 'data': doc.data()}).toList();

    // Login to Google account
    await FirebaseAuth.instance.signInWithCredential(credential);
    final newUid = FirebaseAuth.instance.currentUser?.uid;
    
    if (newUid == null) return;
    
    final newUserRef = FirebaseFirestore.instance.collection(AppConstants.usersCollection).doc(newUid);
    final newGamesRef = newUserRef.collection(AppConstants.unlockedGamesSubCollection);

    // Merge coins
    await FirebaseFirestore.instance.runTransaction((transaction) async {
      final newSnap = await transaction.get(newUserRef);
      if (newSnap.exists) {
        int newCoins = int.tryParse(newSnap.data()?['coins']?.toString() ?? '0') ?? 0;
        transaction.update(newUserRef, {'coins': newCoins + oldCoins});
      }
    });

    // Merge games
    for (var game in oldGames) {
      final newGameSnap = await newGamesRef.doc(game['id'] as String).get();
      if (!newGameSnap.exists) {
        await newGamesRef.doc(game['id'] as String).set(game['data'] as Map<String, dynamic>);
      }
    }

    // Clean up old data in Firestore
    for (var doc in oldGamesSnap.docs) {
      await doc.reference.delete();
    }
    await oldUserRef.delete();

    await _updateProfileFromGoogle(googleUser);
  }

  Future<void> _updateProfileFromGoogle(GoogleSignInAccount googleUser) async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;
    
    final doc = await FirebaseFirestore.instance.collection(AppConstants.usersCollection).doc(uid).get();
    if (doc.exists) {
      final currentName = doc.data()?['displayName'] as String?;
      if (currentName == null || currentName == 'Misafir Kullanıcı') {
         if (googleUser.displayName != null && googleUser.displayName!.isNotEmpty) {
           final name = googleUser.displayName!;
           final username = name.replaceAll(' ', '').toLowerCase() + DateTime.now().millisecondsSinceEpoch.toString().substring(10);
           await FirebaseFirestore.instance.collection(AppConstants.usersCollection).doc(uid).update({
             'displayName': name,
             'username': username,
           });
         }
      }
    }
  }

  Future<void> updateProfile(String name, String username) async {
    if (uid.isNotEmpty) {
      try {
        // Update local state immediately for better UX
        if (_localUser != null) {
          _localUser = LocalUser(
            uid: _localUser!.uid,
            coins: _localUser!.coins,
            displayName: name,
            username: username,
            avatarEmoji: _localUser!.avatarEmoji,
            isPremium: _localUser!.isPremium,
            createdAt: _localUser!.createdAt,
            lastAppUse: _localUser!.lastAppUse,
            fcmToken: _localUser!.fcmToken,
          );
          notifyListeners();
        }

        await FirebaseFirestore.instance.collection(AppConstants.usersCollection).doc(uid).update({
          'displayName': name,
          'username': username,
        });
      } catch (e) {
        debugPrint("Profile Update Error: $e");
        // Re-listen to get the real state back if update failed
        _listenToUserDoc(uid);
      }
    }
  }

  Future<void> updateAvatar(String emoji) async {
    if (uid.isNotEmpty) {
      await FirebaseFirestore.instance.collection(AppConstants.usersCollection).doc(uid).update({'avatarEmoji': emoji});
    }
  }

  Future<void> signOut() async {
    await _googleSignIn.signOut();
    await FirebaseAuth.instance.signOut();
  }
}
