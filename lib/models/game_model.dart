class GameModel {
  final String id;
  final String name;
  final String url;
  final String thumbnail;
  final int cost;
  final String category;
  final bool isActive;
  final int order;

  GameModel({
    required this.id,
    required this.name,
    required this.url,
    required this.thumbnail,
    required this.cost,
    required this.category,
    required this.isActive,
    required this.order,
  });

  bool get isFree => cost == 0;

  factory GameModel.fromMap(String id, Map<String, dynamic> map) {
    return GameModel(
      id: id,
      name: map['name'] ?? '',
      url: map['url'] ?? '',
      thumbnail: map['thumbnail'] ?? '',
      cost: (map['cost'] as num?)?.toInt() ?? 0,
      category: map['category'] ?? 'Diğer',
      isActive: map['isActive'] ?? true,
      order: (map['order'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toMap() => {
        'name': name,
        'url': url,
        'thumbnail': thumbnail,
        'cost': cost,
        'category': category,
        'isActive': isActive,
        'order': order,
      };
}
