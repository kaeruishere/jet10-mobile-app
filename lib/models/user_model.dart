class UserModel {
  final String uid;
  final int jetons;
  final List<String> unlockedGames;
  final DateTime createdAt;

  UserModel({
    required this.uid,
    required this.jetons,
    required this.unlockedGames,
    required this.createdAt,
  });

  factory UserModel.fromMap(String uid, Map<String, dynamic> map) {
    return UserModel(
      uid: uid,
      jetons: (map['jetons'] as num?)?.toInt() ?? 0,
      unlockedGames: List<String>.from(map['unlockedGames'] ?? []),
      createdAt: (map['createdAt'] as dynamic)?.toDate() ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() => {
        'jetons': jetons,
        'unlockedGames': unlockedGames,
        'createdAt': createdAt,
      };

  UserModel copyWith({int? jetons, List<String>? unlockedGames}) {
    return UserModel(
      uid: uid,
      jetons: jetons ?? this.jetons,
      unlockedGames: unlockedGames ?? this.unlockedGames,
      createdAt: createdAt,
    );
  }
}
