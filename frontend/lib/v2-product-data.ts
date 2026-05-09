export type WardrobeItem = {
  id: string;
  name: string;
  category: "tops" | "bottoms" | "dresses" | "outerwear" | "shoes" | "accessories";
  brand: string;
  color: string;
  season: string;
  imageUrl: string;
  imageAlt: string;
  tags: string[];
  usageCount: number;
  lastWorn: string;
  material: string;
  fitNote: string;
  modelStatus: "已识别" | "待确认" | "建议复穿";
};

export type OutfitRecommendation = {
  id: string;
  title: string;
  scenario: string;
  occasion: string;
  matchScore: number;
  weather: string;
  items: string[];
  swaps: string[];
  reason: string;
  confidenceNote: string;
  heroImageUrl: string;
  imageAlt: string;
};

export type ActivityItem = {
  id: string;
  type: "upload" | "save" | "try-on" | "analysis" | "assistant";
  title: string;
  item: string;
  time: string;
};

export type DiaryEntry = {
  date: string;
  title: string;
  weather: string;
  mood: string;
  rating: number;
  scene: string;
  items: string[];
  feedback: string;
  imageUrl: string;
  imageAlt: string;
};

export type StyleProfile = {
  tags: Array<{ name: string; score: number }>;
  colorPreferences: Array<{ name: string; percent: number; color: string }>;
  bodyNotes: string[];
  scenarioPreferences: Array<{ scenario: string; weight: number; note: string }>;
  recommendationWeights: Array<{ name: string; value: number; note: string }>;
};

export type ModelCapability = {
  id: string;
  model: string;
  label: string;
  userBenefit: string;
  route: string;
  status: "ready" | "mock" | "training";
};

export type ProductRoute = {
  href: string;
  label: string;
  shortLabel: string;
  eyebrow: string;
  description: string;
  stat: string;
};

export const productRoutes: ProductRoute[] = [
  {
    href: "/dashboard-new",
    label: "功能首页",
    shortLabel: "今日",
    eyebrow: "Product Home",
    description: "今日造型、功能入口和最近活动总览。",
    stat: "7 个入口",
  },
  {
    href: "/wardrobe-new",
    label: "衣橱管理",
    shortLabel: "衣橱",
    eyebrow: "Wardrobe Index",
    description: "上传、识别、搜索、筛选和维护所有单品档案。",
    stat: "128 件",
  },
  {
    href: "/try-on-new",
    label: "一键试衣",
    shortLabel: "试衣",
    eyebrow: "Atelier Studio",
    description: "人像、衣物和场景组合生成上身试衣结果。",
    stat: "45 次",
  },
  {
    href: "/recommend-new",
    label: "AI 搭配",
    shortLabel: "推荐",
    eyebrow: "Lookbook Board",
    description: "按天气、场景和偏好生成搭配、理由和替换单品。",
    stat: "89 套",
  },
  {
    href: "/outfit-diary-new",
    label: "穿搭日记",
    shortLabel: "日记",
    eyebrow: "Style Memory",
    description: "记录穿搭反馈，让推荐越来越懂你。",
    stat: "67 条",
  },
  {
    href: "/closet-analysis-new",
    label: "衣橱分析",
    shortLabel: "分析",
    eyebrow: "Closet Intelligence",
    description: "复盘利用率、色彩偏好、闲置单品和衣橱缺口。",
    stat: "72%",
  },
  {
    href: "/style-profile-new",
    label: "风格档案",
    shortLabel: "档案",
    eyebrow: "Style Profile",
    description: "维护偏好、体型、场景和推荐权重。",
    stat: "12 标签",
  },
  {
    href: "/assistant-new",
    label: "AI 造型助手",
    shortLabel: "助手",
    eyebrow: "Stylist Assistant",
    description: "把衣橱、天气和偏好变成可执行建议。",
    stat: "4 问题",
  },
];

export const wardrobeItems: WardrobeItem[] = [
  {
    id: "w-001",
    name: "奶油白真丝衬衫",
    category: "tops",
    brand: "Studio Doe",
    color: "奶油白",
    season: "四季",
    imageUrl: "/editorial/texture-silk-cream.jpg",
    imageAlt: "奶油白衬衫与浅色衣架陈列",
    tags: ["通勤", "极简", "百搭"],
    usageCount: 18,
    lastWorn: "2 天前",
    material: "桑蚕丝混纺",
    fitNote: "垂顺光泽能提亮面部，适合会议、通勤和浅色层次叠穿。",
    modelStatus: "已识别",
  },
  {
    id: "w-002",
    name: "黑色高腰西装裤",
    category: "bottoms",
    brand: "Atelier Form",
    color: "黑色",
    season: "四季",
    imageUrl: "/editorial/wardrobe-tailored-trousers.jpg",
    imageAlt: "深色西装裤与极简衣物陈列",
    tags: ["正式", "显瘦", "通勤"],
    usageCount: 22,
    lastWorn: "昨天",
    material: "垂感羊毛混纺",
    fitNote: "直线裤型拉长比例，能稳定住更柔和的上衣和外套。",
    modelStatus: "已识别",
  },
  {
    id: "w-003",
    name: "雾蓝廓形西装",
    category: "outerwear",
    brand: "Mango",
    color: "雾蓝",
    season: "春秋",
    imageUrl: "/editorial/wardrobe-blazer-blue.jpg",
    imageAlt: "雾蓝与中性色服装陈列",
    tags: ["会议", "轻正式", "气场"],
    usageCount: 9,
    lastWorn: "6 天前",
    material: "轻薄羊毛混纺",
    fitNote: "弱化正式感，同时保留肩线和利落轮廓。",
    modelStatus: "已识别",
  },
  {
    id: "w-004",
    name: "深红缎面连衣裙",
    category: "dresses",
    brand: "Satin Room",
    color: "深红",
    season: "春夏",
    imageUrl: "/editorial/wardrobe-evening-dress.jpg",
    imageAlt: "深红缎面连衣裙衣橱陈列",
    tags: ["约会", "晚餐", "拍照"],
    usageCount: 7,
    lastWorn: "12 天前",
    material: "缎面雪纺",
    fitNote: "适合晚餐、聚会和需要强焦点的场景。",
    modelStatus: "已识别",
  },
  {
    id: "w-005",
    name: "白色极简运动鞋",
    category: "shoes",
    brand: "Nike",
    color: "白色",
    season: "四季",
    imageUrl: "/editorial/wardrobe-shoes-minimal.jpg",
    imageAlt: "白色运动鞋与日常穿搭",
    tags: ["舒适", "周末", "百搭"],
    usageCount: 31,
    lastWorn: "今天",
    material: "皮革拼接",
    fitNote: "降低正式穿搭的距离感，让整套造型更轻盈。",
    modelStatus: "已识别",
  },
  {
    id: "w-006",
    name: "香槟金细项链",
    category: "accessories",
    brand: "APM",
    color: "香槟金",
    season: "四季",
    imageUrl: "/editorial/wardrobe-accessory-detail.jpg",
    imageAlt: "香槟金配饰细节",
    tags: ["点睛", "轻奢", "通勤"],
    usageCount: 14,
    lastWorn: "3 天前",
    material: "镀金合金",
    fitNote: "小面积提升领口和面部亮度，不会压过主造型。",
    modelStatus: "已识别",
  },
  {
    id: "w-007",
    name: "灰色羊绒开衫",
    category: "outerwear",
    brand: "COS",
    color: "灰色",
    season: "秋冬",
    imageUrl: "/editorial/look-blue-coat-city.jpg",
    imageAlt: "高级灰蓝色城市造型",
    tags: ["保暖", "层次", "闲置提醒"],
    usageCount: 3,
    lastWorn: "34 天前",
    material: "羊绒针织",
    fitNote: "适合空调房和早晚温差，也能让周末造型更柔和。",
    modelStatus: "建议复穿",
  },
  {
    id: "w-008",
    name: "深蓝直筒牛仔裤",
    category: "bottoms",
    brand: "Levi's",
    color: "深蓝",
    season: "四季",
    imageUrl: "/editorial/wardrobe-silk-detail.jpg",
    imageAlt: "深色衣物与丝质细节",
    tags: ["休闲", "周末", "复穿"],
    usageCount: 16,
    lastWorn: "5 天前",
    material: "水洗丹宁",
    fitNote: "周末和轻松通勤都可复穿，是衣橱里的稳定底盘。",
    modelStatus: "待确认",
  },
];

export const outfitRecommendations: OutfitRecommendation[] = [
  {
    id: "r-001",
    title: "通勤柔光套装",
    scenario: "通勤",
    occasion: "办公室 / 客户会议",
    matchScore: 98,
    weather: "24°C 晴，早晚微凉",
    items: ["奶油白真丝衬衫", "黑色高腰西装裤", "雾蓝廓形西装", "香槟金细项链"],
    swaps: ["灰色羊绒开衫", "白色极简运动鞋"],
    reason: "白色真丝衬衫提亮面部，雾蓝西装降低压迫感，黑色西装裤保证会议场景的利落度。",
    confidenceNote: "你过去 30 天保存过 5 套相似通勤搭配，平均满意度 4.8。",
    heroImageUrl: "/editorial/hero-couture-white-suit.jpg",
    imageAlt: "高级白色西装通勤造型",
  },
  {
    id: "r-002",
    title: "周末城市漫步",
    scenario: "周末",
    occasion: "咖啡店 / 买手店",
    matchScore: 92,
    weather: "26°C 多云",
    items: ["灰色羊绒开衫", "深蓝直筒牛仔裤", "白色极简运动鞋"],
    swaps: ["奶油白真丝衬衫", "香槟金细项链"],
    reason: "用长期闲置的针织开衫做层次，搭配高频牛仔裤和白鞋，舒适但不随意。",
    confidenceNote: "这套能提高闲置外套利用率，并保持你偏好的低饱和配色。",
    heroImageUrl: "/editorial/recommend-travel-look.jpg",
    imageAlt: "城市周末出行造型",
  },
  {
    id: "r-003",
    title: "晚餐镜头友好",
    scenario: "聚会",
    occasion: "晚餐 / 合影",
    matchScore: 95,
    weather: "23°C 微风",
    items: ["深红缎面连衣裙", "香槟金细项链", "白色极简运动鞋"],
    swaps: ["黑色高腰西装裤", "雾蓝廓形西装"],
    reason: "深红连衣裙形成视觉焦点，香槟金配饰提升精致度，白鞋让整体更轻盈。",
    confidenceNote: "适合你保存过的轻奢、拍照友好和低压力场景标签。",
    heroImageUrl: "/editorial/recommend-evening-look.jpg",
    imageAlt: "晚餐聚会高定感造型",
  },
];

export const recentActivities: ActivityItem[] = [
  { id: "a-001", type: "upload", title: "新增衣物", item: "雾蓝廓形西装完成自动打标", time: "2 分钟前" },
  { id: "a-002", type: "save", title: "保存搭配", item: "通勤柔光套装加入本周计划", time: "1 小时前" },
  { id: "a-003", type: "try-on", title: "完成试衣", item: "深红缎面连衣裙生成 3 个场景", time: "3 小时前" },
  { id: "a-004", type: "analysis", title: "生成洞察", item: "3 件外套超过 30 天未穿", time: "昨天" },
  { id: "a-005", type: "assistant", title: "助手建议", item: "周五晚餐建议降低正式度", time: "昨天" },
];

export const diaryEntries: DiaryEntry[] = [
  {
    date: "5 月 8 日",
    title: "通勤柔光套装",
    weather: "24°C 晴",
    mood: "自信",
    rating: 4.9,
    scene: "客户会议",
    items: ["奶油白真丝衬衫", "黑色高腰西装裤", "雾蓝廓形西装"],
    feedback: "正式但不压迫，下午会议拍照效果很好。",
    imageUrl: "/editorial/diary-office-look.jpg",
    imageAlt: "办公室通勤穿搭记录",
  },
  {
    date: "5 月 6 日",
    title: "周末城市漫步",
    weather: "26°C 多云",
    mood: "轻松",
    rating: 4.6,
    scene: "咖啡店",
    items: ["灰色羊绒开衫", "深蓝直筒牛仔裤", "白色极简运动鞋"],
    feedback: "走路舒适，灰色开衫重新变得可穿。",
    imageUrl: "/editorial/diary-cafe-look.jpg",
    imageAlt: "周末咖啡店穿搭记录",
  },
  {
    date: "5 月 2 日",
    title: "晚餐镜头友好",
    weather: "23°C 微风",
    mood: "温柔",
    rating: 4.8,
    scene: "晚餐",
    items: ["深红缎面连衣裙", "香槟金细项链"],
    feedback: "深红色成为焦点，但整体仍然轻盈。",
    imageUrl: "/editorial/atelier-red-detail.jpg",
    imageAlt: "晚餐穿搭记录",
  },
];

export const closetInsights = [
  { label: "上装", value: 34, color: "#171322" },
  { label: "下装", value: 22, color: "#8b5e34" },
  { label: "外套", value: 18, color: "#9b1c31" },
  { label: "鞋包配饰", value: 14, color: "#b9892a" },
];

export const styleProfile: StyleProfile = {
  tags: [
    { name: "通勤优雅", score: 92 },
    { name: "低饱和", score: 86 },
    { name: "轻正式", score: 78 },
    { name: "舒适优先", score: 74 },
  ],
  colorPreferences: [
    { name: "奶油白", percent: 35, color: "#f6efe6" },
    { name: "雾蓝", percent: 24, color: "#9fb7ff" },
    { name: "深红", percent: 21, color: "#9b1c31" },
    { name: "黑灰", percent: 20, color: "#2b2933" },
  ],
  bodyNotes: ["肩线适合利落外套", "高腰下装更显比例", "避免过厚横向膨胀材质"],
  scenarioPreferences: [
    { scenario: "工作日会议", weight: 92, note: "正式但不压迫" },
    { scenario: "通勤", weight: 88, note: "舒适、耐走、可复穿" },
    { scenario: "约会聚会", weight: 74, note: "保留柔和亮点" },
    { scenario: "旅行", weight: 68, note: "轻量、可叠穿、易拍照" },
  ],
  recommendationWeights: [
    { name: "正式度", value: 72, note: "工作日保持利落" },
    { name: "舒适度", value: 88, note: "优先耐走和体感" },
    { name: "吸睛度", value: 42, note: "用小面积焦点" },
    { name: "复穿优先", value: 76, note: "减少重复购买" },
  ],
};

export const modelCapabilities: ModelCapability[] = [
  {
    id: "image-processor",
    model: "BiRefNet / RealESRGAN",
    label: "图片增强与背景处理",
    userBenefit: "让单品图更干净，支持抠图、背景清理、超分和商品图增强。",
    route: "/wardrobe-new",
    status: "ready",
  },
  {
    id: "classifier",
    model: "CLIP",
    label: "衣物分类与标签识别",
    userBenefit: "上传后自动识别类别、颜色、季节和风格标签。",
    route: "/wardrobe-new",
    status: "ready",
  },
  {
    id: "qwen-vl-attribute-understanding",
    model: "Qwen-VL",
    label: "单品属性理解",
    userBenefit: "读取衣物图里的版型、材质、风格情绪和可搭配场景。",
    route: "/wardrobe-new",
    status: "mock",
  },
  {
    id: "avatar-builder",
    model: "TripoSR / avatar-builder",
    label: "用户形象建模",
    userBenefit: "为虚拟试衣准备更稳定的人像比例和姿态上下文。",
    route: "/try-on-new",
    status: "mock",
  },
  {
    id: "virtual-tryon",
    model: "OOTDiffusion",
    label: "虚拟试衣生成",
    userBenefit: "把人像、衣物和场景组合成可判断的上身效果。",
    route: "/try-on-new",
    status: "training",
  },
  {
    id: "controlnet-product-shot",
    model: "ControlNet",
    label: "场景与商品图渲染",
    userBenefit: "控制姿态、背景和光线，让试衣结果更适合保存和分享。",
    route: "/try-on-new",
    status: "mock",
  },
  {
    id: "llm-recommender",
    model: "Qwen / LLM Recommender",
    label: "搭配生成与理由解释",
    userBenefit: "结合天气、衣橱和偏好给出具体搭配理由。",
    route: "/recommend-new",
    status: "ready",
  },
  {
    id: "weather-context-engine",
    model: "weather-context",
    label: "天气与场景上下文",
    userBenefit: "把温度、通勤、会议、旅行等场景转成可执行穿搭约束。",
    route: "/recommend-new",
    status: "ready",
  },
  {
    id: "style-memory",
    model: "feedback-memory",
    label: "穿搭反馈记忆",
    userBenefit: "把满意度、复穿和场景反馈回流到推荐权重。",
    route: "/outfit-diary-new",
    status: "ready",
  },
  {
    id: "closet-analytics",
    model: "wardrobe-stats",
    label: "衣橱利用率分析",
    userBenefit: "分析闲置、色彩、分类占比和衣橱缺口，减少重复购买。",
    route: "/closet-analysis-new",
    status: "ready",
  },
  {
    id: "style-profile-engine",
    model: "preference-engine",
    label: "个人风格权重",
    userBenefit: "把风格标签、体型信息和场景偏好转成推荐参数。",
    route: "/style-profile-new",
    status: "ready",
  },
  {
    id: "assistant-service",
    model: "assistant service / LLM",
    label: "对话式造型顾问",
    userBenefit: "把自然语言问题转成推荐、试衣、日记和分析动作。",
    route: "/assistant-new",
    status: "mock",
  },
];

export const assistantPrompts = [
  "今天有客户会议，我应该穿什么？",
  "这件雾蓝西装还能怎么搭？",
  "我最近是不是一直在穿重复单品？",
  "帮我为周五晚餐准备一套不夸张但上镜的搭配。",
];
