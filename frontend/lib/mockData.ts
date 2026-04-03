export const CATEGORIES = ["套装", "上衣", "下装", "鞋子", "配饰"] as const;

export type ClothingCategory = (typeof CATEGORIES)[number];

export interface ClothingItem {
  id: number;
  name: string;
  category: ClothingCategory;
  tag: string;
  color: string;
  secondaryColor?: string;
  emoji: string;
}

export const CATEGORY_LABELS_EN: Record<ClothingCategory, string> = {
  套装: "SET",
  上衣: "TOP",
  下装: "BOTTOM",
  鞋子: "SHOES",
  配饰: "ACC"
};

export const QUICK_ACTIONS = [
  "咖啡馆整套",
  "周末整套",
  "一键换色",
  "通勤整套",
  "约会整套",
  "运动风"
] as const;

export type QuickAction = (typeof QUICK_ACTIONS)[number];

export interface FeaturePlaceholder {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  accent: string;
  tone: string;
  bullets: string[];
}

export const mockClothing: ClothingItem[] = [
  { id: 1, name: "粉色碎花连衣裙", category: "套装", tag: "春日约会", color: "#FFD6E0", secondaryColor: "#FFECEF", emoji: "👗" },
  { id: 2, name: "奶白色西装套装", category: "套装", tag: "商务通勤", color: "#FFF8F0", secondaryColor: "#EEDFD0", emoji: "👔" },
  { id: 3, name: "薰衣草针织套装", category: "套装", tag: "周末休闲", color: "#E8D5F5", secondaryColor: "#F5EFFF", emoji: "🧶" },
  { id: 4, name: "杏色吊带连体裤", category: "套装", tag: "咖啡下午茶", color: "#F5E6D3", secondaryColor: "#E9D1B8", emoji: "👚" },
  { id: 5, name: "玫瑰格纹裙装", category: "套装", tag: "法式优雅", color: "#F5C0C8", secondaryColor: "#FCE3E8", emoji: "🌹" },
  { id: 6, name: "米色麻料套装", category: "套装", tag: "度假风情", color: "#EDE0D0", secondaryColor: "#DCC7B3", emoji: "🌿" },
  { id: 7, name: "白色泡泡袖衬衫", category: "上衣", tag: "清新日常", color: "#FFFFFF", secondaryColor: "#F4E8EE", emoji: "👕" },
  { id: 8, name: "粉色针织背心", category: "上衣", tag: "叠穿必备", color: "#FFB5C8", secondaryColor: "#FFD8E3", emoji: "🎀" },
  { id: 9, name: "奶茶色宽松卫衣", category: "上衣", tag: "慵懒风", color: "#D4A574", secondaryColor: "#EFD5BC", emoji: "☕" },
  { id: 10, name: "碎花雪纺上衣", category: "上衣", tag: "仙女感", color: "#FFE4E8", secondaryColor: "#FFF8FB", emoji: "🌸" },
  { id: 11, name: "柠檬黄针织衫", category: "上衣", tag: "撞色搭配", color: "#FFF3B0", secondaryColor: "#FFFBE4", emoji: "🍋" },
  { id: 12, name: "裸粉色丝绒上衣", category: "上衣", tag: "高定感", color: "#F5D0C0", secondaryColor: "#FBE8DE", emoji: "✨" },
  { id: 13, name: "米白色阔腿裤", category: "下装", tag: "显高显瘦", color: "#F5F0E8", secondaryColor: "#E5DCCF", emoji: "👖" },
  { id: 14, name: "粉色百褶半裙", category: "下装", tag: "少女感", color: "#FFD0DC", secondaryColor: "#FFE8F0", emoji: "💗" },
  { id: 15, name: "牛仔直筒裤", category: "下装", tag: "百搭基础款", color: "#B0C4DE", secondaryColor: "#D4E0F2", emoji: "👖" },
  { id: 16, name: "豆沙色皮质短裙", category: "下装", tag: "秋冬氛围", color: "#C4857A", secondaryColor: "#E1B5A9", emoji: "🍂" },
  { id: 17, name: "薄荷绿纱裙", category: "下装", tag: "仙气飘飘", color: "#B8E8D4", secondaryColor: "#E9FFF6", emoji: "🌱" },
  { id: 18, name: "格纹西装短裤", category: "下装", tag: "帅气休闲", color: "#D4C8C0", secondaryColor: "#EEE7E2", emoji: "🎩" },
  { id: 19, name: "白色玛丽珍鞋", category: "鞋子", tag: "日系甜美", color: "#FFFFFF", secondaryColor: "#EDE3E7", emoji: "👟" },
  { id: 20, name: "奶咖色厚底鞋", category: "鞋子", tag: "增高神器", color: "#C8A882", secondaryColor: "#E6D2BB", emoji: "👠" },
  { id: 21, name: "粉色芭蕾平底鞋", category: "鞋子", tag: "优雅日常", color: "#FFB5C8", secondaryColor: "#FFDDE7", emoji: "🩰" },
  { id: 22, name: "米色老爹鞋", category: "鞋子", tag: "街头潮流", color: "#F0E6D3", secondaryColor: "#FBF4E8", emoji: "👟" },
  { id: 23, name: "透明水晶凉鞋", category: "鞋子", tag: "仙女单品", color: "#E8F0F8", secondaryColor: "#FFFFFF", emoji: "💎" },
  { id: 24, name: "裸色细跟高跟鞋", category: "鞋子", tag: "约会必备", color: "#E8C8B8", secondaryColor: "#F8E4D9", emoji: "👡" },
  { id: 25, name: "珍珠发夹套装", category: "配饰", tag: "甜美点睛", color: "#F5F0E0", secondaryColor: "#FFF9EE", emoji: "🤍" },
  { id: 26, name: "金色细链项链", category: "配饰", tag: "精致叠戴", color: "#F4C98A", secondaryColor: "#FCEBD0", emoji: "✨" },
  { id: 27, name: "薰衣草丝巾", category: "配饰", tag: "法式优雅", color: "#E8D5F5", secondaryColor: "#F7F0FD", emoji: "🎀" },
  { id: 28, name: "草编托特包", category: "配饰", tag: "度假风", color: "#D4B896", secondaryColor: "#F0E2CC", emoji: "👜" },
  { id: 29, name: "玫瑰金手表", category: "配饰", tag: "精致通勤", color: "#F5C0A8", secondaryColor: "#FCE7DE", emoji: "⌚" },
  { id: 30, name: "樱花耳环套装", category: "配饰", tag: "少女心爆棚", color: "#FFD0DC", secondaryColor: "#FFEFF4", emoji: "🌸" }
];

export const QUICK_ACTION_PRESETS: Record<Exclude<QuickAction, "一键换色">, number> = {
  咖啡馆整套: 4,
  周末整套: 3,
  通勤整套: 2,
  约会整套: 1,
  运动风: 22
};

export const FEATURE_PLACEHOLDERS: FeaturePlaceholder[] = [
  {
    id: "try-on-ai",
    title: "AI 试衣生成",
    subtitle: "下一阶段主功能",
    description: "接入真实试衣生成链路后，当前选中的单品会直接映射到模特图像，形成可分享的高质感试穿结果。",
    accent: "#FFB5C8",
    tone: "rose",
    bullets: ["OOTDiffusion 接入", "姿态对齐", "一键导出 lookbook"]
  },
  {
    id: "daily-planner",
    title: "穿搭日历",
    subtitle: "计划与回顾",
    description: "把每日穿搭、天气、场景和心情串起来，形成真正可复用的个人风格时间线。",
    accent: "#F4C98A",
    tone: "gold",
    bullets: ["日历排期", "天气联动", "穿搭复盘"]
  },
  {
    id: "style-radar",
    title: "风格雷达",
    subtitle: "智能风格画像",
    description: "根据历史收藏、搭配偏好和使用频率，生成你的高频色系、版型与氛围关键词。",
    accent: "#E8D5F5",
    tone: "lavender",
    bullets: ["风格标签", "色板统计", "单品利用率"]
  },
  {
    id: "multi-sync",
    title: "多端衣橱同步",
    subtitle: "随时继续编辑",
    description: "网页、小程序和未来的移动端会共用一套衣橱与搭配记录，不再重复整理与上传。",
    accent: "#FFD9A8",
    tone: "peach",
    bullets: ["Supabase 云同步", "多端登录", "实时状态保持"]
  }
];
