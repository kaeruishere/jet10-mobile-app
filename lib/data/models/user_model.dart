import 'package:cloud_firestore/cloud_firestore.dart';

class LocalUser {
  final String uid;
  final int coins;
  final String displayName;
  final String username;
  final String avatarEmoji;
  final bool isPremium;
  final DateTime? createdAt;
  final DateTime? lastAppUse;
  final String? fcmToken;

  LocalUser({
    required this.uid,
    required this.coins,
    required this.displayName,
    required this.username,
    required this.avatarEmoji,
    this.isPremium = false,
    this.createdAt,
    this.lastAppUse,
    this.fcmToken,
  });

  factory LocalUser.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    return LocalUser(
      uid: doc.id,
      coins: int.tryParse(data['coins']?.toString() ?? '100') ?? 100,
      displayName: data['displayName']?.toString() ?? 'Misafir Kullanıcı',
      username: data['username']?.toString() ?? 'misafir',
      avatarEmoji: data['avatarEmoji']?.toString() ?? '👤',
      isPremium: data['isPremium'] ?? false,
      createdAt: (data['createdAt'] as Timestamp?)?.toDate(),
      lastAppUse: (data['lastAppUse'] as Timestamp?)?.toDate(),
      fcmToken: data['fcm_token']?.toString(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'coins': coins,
      'displayName': displayName,
      'username': username,
      'avatarEmoji': avatarEmoji,
      'isPremium': isPremium,
      'createdAt': createdAt != null ? Timestamp.fromDate(createdAt!) : FieldValue.serverTimestamp(),
      'lastAppUse': lastAppUse != null ? Timestamp.fromDate(lastAppUse!) : FieldValue.serverTimestamp(),
      if (fcmToken != null) 'fcm_token': fcmToken,
    };
  }
}
