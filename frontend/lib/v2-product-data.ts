export type WardrobeItem = {
  id: string;
  name: string;
  category: "tops" | "bottoms" | "dresses" | "outerwear" | "shoes" | "accessories";
  brand: string;
  color: string;
  season: string;
  image: string;
  imageUrl: string;
  imageAlt: string;
  tags: string[];
  usageCount: number;
  lastWorn: string;
  palette: string;
  material?: string;
  fitNote?: string;
};

export type OutfitRecommendation = {
  id: string;
  title: string;
  scenario: string;
  occasion: string;
  matchScore: number;
  weather: string;
  items: string[];
  reason: string;
  confidenceNote: string;
  heroImageUrl: string;
  imageAlt: string;
};

export type ActivityItem = {
  id: string;
  type: "upload" | "save" | "try-on" | "analysis";
  title: string;
  item: string;
  time: string;
  icon: string;
};

export type DiaryEntry = {
  date: string;
  title: string;
  weather: string;
  mood: string;
  rating: number;
  items: string[];
  imageUrl: string;
  imageAlt: string;
};

export type StyleProfile = {
  tags: Array<{ name: string; score: number }>;
  colorPreferences: Array<{ name: string; percent: number; color: string }>;
  bodyNotes: string[];
  scenarioPreferences: Array<{ scenario: string; weight: number; note: string }>;
};

export const wardrobeItems: WardrobeItem[] = [
  {
    id: "w-001",
    name: "奶油白衬衫",
    category: "tops",
    brand: "ZARA",
    color: "奶油白",
    season: "四季",
    image: "shirt",
    imageUrl: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80",
    imageAlt: "白色衬衫与极简衣物陈列",
    tags: ["通勤", "极简", "百搭"],
    usageCount: 18,
    lastWorn: "2 天前",
    palette: "from-[#fbf7ef] to-[#eadfcf]",
    material: "棉府绸",
    fitNote: "挺括领口适合会议与通勤叠穿。",
  },
  {
    id: "w-002",
    name: "黑色西装裤",
    category: "bottoms",
    brand: "Uniqlo",
    color: "黑色",
    season: "四季",
    image: "pants",
    imageUrl: "https://images.unsplash.com/photo-1523381294911-8d3cead13475?auto=format&fit=crop&w=900&q=80",
    imageAlt: "深色裤装与衣架陈列",
    tags: ["正式", "显瘦", "通勤"],
    usageCount: 22,
    lastWorn: "昨天",
    palette: "from-[#2a2d42] to-[#07080f]",
    material: "垂感混纺",
    fitNote: "直线裤型让比例更利落。",
  },
  {
    id: "w-003",
    name: "雾蓝西装外套",
    category: "outerwear",
    brand: "Mango",
    color: "雾蓝",
    season: "春秋",
    image: "blazer",
    imageUrl: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=900&q=80",
    imageAlt: "穿着浅色西装外套的时尚人物",
    tags: ["会议", "轻正式", "气场"],
    usageCount: 9,
    lastWorn: "6 天前",
    palette: "from-[#dce8ff] to-[#9fb7ff]",
    material: "轻薄羊毛混纺",
    fitNote: "弱化正式感，同时保留肩线。",
  },
  {
    id: "w-004",
    name: "粉紫连衣裙",
    category: "dresses",
    brand: "H&M",
    color: "粉紫",
    season: "春夏",
    image: "dress",
    imageUrl: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=900&q=80",
    imageAlt: "粉紫调时尚连衣裙造型",
    tags: ["约会", "温柔", "拍照"],
    usageCount: 7,
    lastWorn: "12 天前",
    palette: "from-[#f4d0df] to-[#d6b4ff]",
    material: "轻盈雪纺",
    fitNote: "适合晚餐和周末拍照场景。",
  },
  {
    id: "w-005",
    name: "白色运动鞋",
    category: "shoes",
    brand: "Nike",
    color: "白色",
    season: "四季",
    image: "shoes",
    imageUrl: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=900&q=80",
    imageAlt: "浅色运动鞋与日常穿搭",
    tags: ["舒适", "周末", "百搭"],
    usageCount: 31,
    lastWorn: "今天",
    palette: "from-[#ffffff] to-[#dbe4ff]",
    material: "皮革拼接",
    fitNote: "降低正式穿搭的距离感。",
  },
  {
    id: "w-006",
    name: "金色细项链",
    category: "accessories",
    brand: "APM",
    color: "金色",
    season: "四季",
    image: "necklace",
    imageUrl: "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?auto=format&fit=crop&w=900&q=80",
    imageAlt: "金色配饰与柔和时尚细节",
    tags: ["点睛", "轻奢", "通勤"],
    usageCount: 14,
    lastWorn: "3 天前",
    palette: "from-[#f4df9d] to-[#f0a0c0]",
    material: "镀金合金",
    fitNote: "小面积提亮面部和领口。",
  },
  {
    id: "w-007",
    name: "灰色针织开衫",
    category: "outerwear",
    brand: "COS",
    color: "灰色",
    season: "秋冬",
    image: "cardigan",
    imageUrl: "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=900&q=80",
    imageAlt: "衣架上的柔和针织与日常衣物",
    tags: ["保暖", "层次", "闲置提醒"],
    usageCount: 3,
    lastWorn: "34 天前",
    palette: "from-[#e5e1dc] to-[#a7a7bd]",
    material: "羊毛针织",
    fitNote: "适合空调房和早晚温差。",
  },
  {
    id: "w-008",
    name: "深蓝牛仔裤",
    category: "bottoms",
    brand: "Levi's",
    color: "深蓝",
    season: "四季",
    image: "denim",
    imageUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80",
    imageAlt: "蓝色牛仔与休闲衣物陈列",
    tags: ["休闲", "周末", "复穿"],
    usageCount: 16,
    lastWorn: "5 天前",
    palette: "from-[#25316d] to-[#7f9fff]",
    material: "水洗丹宁",
    fitNote: "周末和轻松通勤都可复穿。",
  },
];

export const outfitRecommendations: OutfitRecommendation[] = [
  {
    id: "r-001",
    title: "通勤柔光套装",
    scenario: "工作日会议",
    occasion: "办公室 / 客户会议",
    matchScore: 98,
    weather: "24°C 晴，早晚微凉",
    items: ["奶油白衬衫", "黑色西装裤", "雾蓝西装外套", "金色细项链"],
    reason: "白色衬衫提亮面部，雾蓝外套降低正式感，黑色西装裤保证会议场景的利落度。",
    confidenceNote: "你过去 30 天保存过 5 套相似通勤搭配，满意度平均 4.8。",
    heroImageUrl: "https://images.unsplash.com/photo-1571513722275-4b41940f54b8?auto=format&fit=crop&w=1200&q=82",
    imageAlt: "高级通勤风格时尚造型",
  },
  {
    id: "r-002",
    title: "周末轻松出门",
    scenario: "咖啡店 / 逛街",
    occasion: "周末城市漫步",
    matchScore: 92,
    weather: "26°C 多云",
    items: ["灰色针织开衫", "深蓝牛仔裤", "白色运动鞋"],
    reason: "用长期闲置的针织开衫做层次，搭配高频牛仔裤和运动鞋，舒适但不随意。",
    confidenceNote: "这套会提高灰色针织开衫的利用率，并保持你偏好的低饱和配色。",
    heroImageUrl: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1200&q=82",
    imageAlt: "周末城市休闲时尚造型",
  },
  {
    id: "r-003",
    title: "晚餐拍照友好",
    scenario: "约会 / 聚会",
    occasion: "晚餐与合影",
    matchScore: 95,
    weather: "23°C 微风",
    items: ["粉紫连衣裙", "金色细项链", "白色运动鞋"],
    reason: "粉紫连衣裙和金色配饰形成柔和焦点，白色鞋子让整体更轻盈。",
    confidenceNote: "适合你保存过的温柔、轻奢、拍照友好三个风格标签。",
    heroImageUrl: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=1200&q=82",
    imageAlt: "晚餐聚会时尚造型",
  },
];

export const recentActivities: ActivityItem[] = [
  { id: "a-001", type: "upload", title: "新增衣物", item: "雾蓝西装外套", time: "2 分钟前", icon: "+" },
  { id: "a-002", type: "save", title: "保存搭配", item: "通勤柔光套装", time: "1 小时前", icon: "✓" },
  { id: "a-003", type: "try-on", title: "完成试衣", item: "粉紫连衣裙", time: "3 小时前", icon: "AI" },
  { id: "a-004", type: "analysis", title: "生成洞察", item: "3 件外套超过 30 天未穿", time: "昨天", icon: "!" },
];

export const quickActions = [
  { href: "/wardrobe-new", title: "我的衣橱", description: "搜索、筛选、管理所有单品", stat: "128 件" },
  { href: "/try-on-new", title: "虚拟试衣", description: "上传照片并生成上身效果", stat: "45 次" },
  { href: "/recommend-new", title: "搭配推荐", description: "查看 AI 推荐与匹配理由", stat: "89 套" },
  { href: "/outfit-diary-new", title: "穿搭日记", description: "沉淀每天的穿搭反馈", stat: "67 条" },
  { href: "/closet-analysis-new", title: "衣橱分析", description: "复盘利用率和缺口建议", stat: "72%" },
  { href: "/style-profile-new", title: "风格档案", description: "维护偏好、场景和体型信息", stat: "12 标签" },
];

export const diaryEntries: DiaryEntry[] = [
  {
    date: "5 月 8 日",
    title: "通勤柔光套装",
    weather: "24°C 晴",
    mood: "自信",
    rating: 4.9,
    items: ["奶油白衬衫", "黑色西装裤", "雾蓝西装外套"],
    imageUrl: "https://images.unsplash.com/photo-1571513722275-4b41940f54b8?auto=format&fit=crop&w=900&q=80",
    imageAlt: "通勤柔光套装记录",
  },
  {
    date: "5 月 6 日",
    title: "周末轻松出门",
    weather: "26°C 多云",
    mood: "轻松",
    rating: 4.6,
    items: ["灰色针织开衫", "深蓝牛仔裤", "白色运动鞋"],
    imageUrl: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=900&q=80",
    imageAlt: "周末轻松出门穿搭记录",
  },
  {
    date: "5 月 2 日",
    title: "晚餐拍照友好",
    weather: "23°C 微风",
    mood: "温柔",
    rating: 4.8,
    items: ["粉紫连衣裙", "金色细项链"],
    imageUrl: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=900&q=80",
    imageAlt: "晚餐拍照友好穿搭记录",
  },
];

export const closetInsights = [
  { label: "上装", value: 34, color: "bg-[#c8a8ff]" },
  { label: "下装", value: 22, color: "bg-[#5d63ff]" },
  { label: "外套", value: 18, color: "bg-[#f0a0c0]" },
  { label: "鞋包配饰", value: 14, color: "bg-[#e8c87a]" },
];

export const styleProfile: StyleProfile = {
  tags: [
    { name: "通勤优雅", score: 92 },
    { name: "低饱和", score: 86 },
    { name: "轻正式", score: 78 },
    { name: "舒适优先", score: 74 },
  ],
  colorPreferences: [
    { name: "奶油白", percent: 35, color: "#f6f0ff" },
    { name: "雾蓝", percent: 24, color: "#9fb7ff" },
    { name: "粉紫", percent: 21, color: "#c8a8ff" },
    { name: "黑灰", percent: 20, color: "#4a4a68" },
  ],
  bodyNotes: ["肩线适合利落外套", "高腰下装更显比例", "避免过厚横向膨胀材质"],
  scenarioPreferences: [
    { scenario: "工作日会议", weight: 92, note: "正式但不压迫" },
    { scenario: "通勤", weight: 88, note: "舒适、耐走、可复穿" },
    { scenario: "约会聚会", weight: 74, note: "保留柔和亮点" },
  ],
};
