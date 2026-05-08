export type WardrobeItem = {
  id: string;
  name: string;
  category: "tops" | "bottoms" | "dresses" | "outerwear" | "shoes" | "accessories";
  brand: string;
  color: string;
  season: string;
  image: string;
  tags: string[];
  usageCount: number;
  lastWorn: string;
  palette: string;
};

export type OutfitRecommendation = {
  id: string;
  title: string;
  scenario: string;
  matchScore: number;
  weather: string;
  items: string[];
  reason: string;
};

export type ActivityItem = {
  id: string;
  type: "upload" | "save" | "try-on" | "analysis";
  title: string;
  item: string;
  time: string;
  icon: string;
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
    color: "白色",
    season: "四季",
    image: "👔",
    tags: ["通勤", "极简", "百搭"],
    usageCount: 18,
    lastWorn: "2 天前",
    palette: "from-[#f6f0ff] to-[#c8a8ff]",
  },
  {
    id: "w-002",
    name: "黑色西装裤",
    category: "bottoms",
    brand: "Uniqlo",
    color: "黑色",
    season: "四季",
    image: "👖",
    tags: ["正式", "显瘦", "通勤"],
    usageCount: 22,
    lastWorn: "昨天",
    palette: "from-[#2a2d42] to-[#07080f]",
  },
  {
    id: "w-003",
    name: "雾蓝西装外套",
    category: "outerwear",
    brand: "Mango",
    color: "蓝色",
    season: "春秋",
    image: "🧥",
    tags: ["会议", "轻正式", "气场"],
    usageCount: 9,
    lastWorn: "6 天前",
    palette: "from-[#3139fb] to-[#9fb7ff]",
  },
  {
    id: "w-004",
    name: "粉紫连衣裙",
    category: "dresses",
    brand: "H&M",
    color: "粉紫",
    season: "春夏",
    image: "👗",
    tags: ["约会", "温柔", "拍照"],
    usageCount: 7,
    lastWorn: "12 天前",
    palette: "from-[#f0a0c0] to-[#c8a8ff]",
  },
  {
    id: "w-005",
    name: "白色运动鞋",
    category: "shoes",
    brand: "Nike",
    color: "白色",
    season: "四季",
    image: "👟",
    tags: ["舒适", "周末", "百搭"],
    usageCount: 31,
    lastWorn: "今天",
    palette: "from-[#ffffff] to-[#dbe4ff]",
  },
  {
    id: "w-006",
    name: "金色细项链",
    category: "accessories",
    brand: "APM",
    color: "金色",
    season: "四季",
    image: "💎",
    tags: ["点睛", "轻奢", "通勤"],
    usageCount: 14,
    lastWorn: "3 天前",
    palette: "from-[#e8c87a] to-[#f0a0c0]",
  },
  {
    id: "w-007",
    name: "灰色针织开衫",
    category: "outerwear",
    brand: "COS",
    color: "灰色",
    season: "秋冬",
    image: "🧶",
    tags: ["保暖", "层次", "闲置提醒"],
    usageCount: 3,
    lastWorn: "34 天前",
    palette: "from-[#a7a7bd] to-[#4a4a68]",
  },
  {
    id: "w-008",
    name: "深蓝牛仔裤",
    category: "bottoms",
    brand: "Levi's",
    color: "蓝色",
    season: "四季",
    image: "👖",
    tags: ["休闲", "周末", "复穿"],
    usageCount: 16,
    lastWorn: "5 天前",
    palette: "from-[#25316d] to-[#3139fb]",
  },
];

export const outfitRecommendations: OutfitRecommendation[] = [
  {
    id: "r-001",
    title: "通勤柔光套装",
    scenario: "工作日会议",
    matchScore: 98,
    weather: "24°C 晴，早晚微凉",
    items: ["奶油白衬衫", "黑色西装裤", "雾蓝西装外套", "金色细项链"],
    reason: "白色衬衫提亮面部，雾蓝外套降低正式感，黑色西装裤保证会议场景的利落度。",
  },
  {
    id: "r-002",
    title: "周末轻松出门",
    scenario: "咖啡店 / 逛街",
    matchScore: 92,
    weather: "26°C 多云",
    items: ["灰色针织开衫", "深蓝牛仔裤", "白色运动鞋"],
    reason: "用长期闲置的针织开衫做层次，搭配高频牛仔裤和运动鞋，舒适但不随意。",
  },
  {
    id: "r-003",
    title: "晚餐拍照友好",
    scenario: "约会 / 聚会",
    matchScore: 95,
    weather: "23°C 微风",
    items: ["粉紫连衣裙", "金色细项链", "白色运动鞋"],
    reason: "粉紫连衣裙和金色配饰形成柔和焦点，白色鞋子让整体更轻盈。",
  },
];

export const recentActivities: ActivityItem[] = [
  { id: "a-001", type: "upload", title: "新增衣物", item: "雾蓝西装外套", time: "2 分钟前", icon: "＋" },
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

export const diaryEntries = [
  { date: "5 月 8 日", title: "通勤柔光套装", weather: "24°C 晴", mood: "自信", rating: 4.9, items: ["奶油白衬衫", "黑色西装裤", "雾蓝西装外套"] },
  { date: "5 月 6 日", title: "周末轻松出门", weather: "26°C 多云", mood: "轻松", rating: 4.6, items: ["灰色针织开衫", "深蓝牛仔裤", "白色运动鞋"] },
  { date: "5 月 2 日", title: "晚餐拍照友好", weather: "23°C 微风", mood: "温柔", rating: 4.8, items: ["粉紫连衣裙", "金色细项链"] },
];

export const closetInsights = [
  { label: "上装", value: 34, color: "bg-[#c8a8ff]" },
  { label: "下装", value: 22, color: "bg-[#3139fb]" },
  { label: "外套", value: 18, color: "bg-[#f0a0c0]" },
  { label: "鞋包", value: 14, color: "bg-[#e8c87a]" },
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
