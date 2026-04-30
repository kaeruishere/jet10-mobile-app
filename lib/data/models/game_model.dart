import 'package:cloud_firestore/cloud_firestore.dart';

class Game {
  final String id;
  final String name;
  final String url;
  final String? imageUrl;
  final int cost;
  final int version;
  final DateTime? createdAt;

  Game({
    required this.id,
    required this.name,
    required this.url,
    this.imageUrl,
    required this.cost,
    required this.version,
    this.createdAt,
  });

  factory Game.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Game(
      id: doc.id,
      name: data['name']?.toString() ?? 'Bilinmeyen Oyun',
      url: data['url']?.toString() ?? '',
      imageUrl: data['imageUrl']?.toString(),
      cost: int.tryParse(data['cost']?.toString() ?? '0') ?? 0,
      version: int.tryParse(data['version']?.toString() ?? '1') ?? 1,
      createdAt: (data['createdAt'] as Timestamp?)?.toDate(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'url': url,
      'imageUrl': imageUrl,
      'cost': cost,
      'version': version,
      'createdAt': createdAt != null ? Timestamp.fromDate(createdAt!) : FieldValue.serverTimestamp(),
    };
  }
}
