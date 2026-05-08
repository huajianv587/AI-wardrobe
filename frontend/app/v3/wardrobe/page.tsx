'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { V3Banner } from '@/components/shared/V3Banner';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { PremiumTag, PremiumTagGroup } from '@/components/ui/PremiumTag';
import { PremiumInput } from '@/components/ui/PremiumInput';
import { PremiumDialog, PremiumDialogActions } from '@/components/ui/PremiumDialog';

interface ClothingItem {
  id: string;
  name: string;
  category: string;
  color: string;
  season: string;
  brand: string;
  image: string;
  tags: string[];
}

export default function WardrobePage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'all', label: '全部', color: 'pink' as const },
    { id: 'tops', label: '上衣', color: 'purple' as const },
    { id: 'bottoms', label: '下装', color: 'blue' as const },
    { id: 'dresses', label: '连衣裙', color: 'pink' as const },
    { id: 'outerwear', label: '外套', color: 'orange' as const },
    { id: 'shoes', label: '鞋子', color: 'green' as const },
  ];

  const mockItems: ClothingItem[] = [
    {
      id: '1',
      name: '白色衬衫',
      category: 'tops',
      color: '白色',
      season: '四季',
      brand: 'ZARA',
      image: '👕',
      tags: ['通勤', '简约', '百搭'],
    },
    {
      id: '2',
      name: '黑色西裤',
      category: 'bottoms',
      color: '黑色',
      season: '四季',
      brand: 'Uniqlo',
      image: '👖',
      tags: ['正式', '通勤', '修身'],
    },
    {
      id: '3',
      name: '粉色连衣裙',
      category: 'dresses',
      color: '粉色',
      season: '春夏',
      brand: 'H&M',
      image: '👗',
      tags: ['甜美', '约会', '浪漫'],
    },
    {
      id: '4',
      name: '牛仔外套',
      category: 'outerwear',
      color: '蓝色',
      season: '春秋',
      brand: 'Levi\'s',
      image: '🧥',
      tags: ['休闲', '百搭', '复古'],
    },
    {
      id: '5',
      name: '白色运动鞋',
      category: 'shoes',
      color: '白色',
      season: '四季',
      brand: 'Nike',
      image: '👟',
      tags: ['运动', '舒适', '百搭'],
    },
    {
      id: '6',
      name: '针织衫',
      category: 'tops',
      color: '米色',
      season: '秋冬',
      brand: 'Uniqlo',
      image: '🧶',
      tags: ['温暖', '舒适', '文艺'],
    },
  ];

  const filteredItems = mockItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/20">
      <V3Banner />
      {/* Navigation - keep gentle style */}
      <nav className="fixed top-11 left-0 right-0 z-50 backdrop-blur-xl bg-white/80 border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button
              onClick={() => router.push('/v3')}
              className="text-gray-600 hover:text-gray-900 transition-colors font-medium"
            >
              ← 返回
            </button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent tracking-tight">
              我的衣橱
            </h1>
          </div>

          <PremiumButton
            variant="glow-inner"
            size="md"
            onClick={() => setIsAddDialogOpen(true)}
          >
            添加衣服
          </PremiumButton>
        </div>
      </nav>

      {/* Main Content - tech style with more spacing */}
      <div className="pt-44 pb-16 px-8">
        <div className="max-w-7xl mx-auto">
          {/* Search and Filter - cleaner design */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mb-16"
          >
            <div className="bg-white/80 backdrop-blur-xl rounded-[40px] p-8 shadow-xl border border-gray-100 mb-8">
              <PremiumInput
                placeholder="搜索衣服、品牌、标签..."
                icon={<span>🔍</span>}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-6 mb-6">
              <span className="text-gray-700 font-semibold text-sm tracking-wide">分类</span>
              <PremiumTagGroup>
                {categories.map((cat) => (
                  <PremiumTag
                    key={cat.id}
                    color={cat.color}
                    selected={selectedCategory === cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {cat.label}
                  </PremiumTag>
                ))}
              </PremiumTagGroup>
            </div>

            <div className="text-sm text-gray-500 font-medium">
              共 {filteredItems.length} 件衣服
            </div>
          </motion.div>

          {/* Clothing Grid - larger spacing, cleaner cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10">
            <AnimatePresence>
              {filteredItems.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ scale: 0.95, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 20 }}
                  transition={{
                    duration: 0.5,
                    delay: i * 0.08,
                    ease: [0.22, 1, 0.36, 1]
                  }}
                  whileHover={{ y: -12, scale: 1.02 }}
                  onClick={() => setSelectedItem(item)}
                  className="group cursor-pointer"
                >
                  <div className="bg-white/90 backdrop-blur-sm rounded-[40px] p-8 shadow-xl border border-gray-100 hover:shadow-2xl hover:border-purple-200 transition-all duration-500 overflow-hidden">
                    {/* Image container */}
                    <div className="relative mb-6">
                      <div className="w-full aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-[32px] flex items-center justify-center text-8xl group-hover:scale-105 transition-transform duration-500">
                        {item.image}
                      </div>

                      {/* Hover action buttons */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent rounded-[32px] opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center gap-3">
                        <button className="w-12 h-12 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                          <span className="text-xl">👁️</span>
                        </button>
                        <button className="w-12 h-12 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                          <span className="text-xl">✏️</span>
                        </button>
                      </div>
                    </div>

                    {/* Item info */}
                    <h3 className="font-bold text-gray-900 mb-2 truncate text-lg">
                      {item.name}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4 font-medium">
                      {item.brand} · {item.color}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                      {item.tags.slice(0, 2).map((tag, i) => (
                        <span
                          key={i}
                          className="px-3 py-1.5 bg-gradient-to-r from-pink-50 to-purple-50 text-pink-600 text-xs rounded-full font-medium border border-pink-100"
                        >
                          {tag}
                        </span>
                      ))}
                      {item.tags.length > 2 && (
                        <span className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                          +{item.tags.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Empty state */}
          {filteredItems.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center py-24"
            >
              <div className="text-8xl mb-8">🔍</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
                没有找到衣服
              </h3>
              <p className="text-gray-600 mb-8 text-lg">
                试试其他搜索词或分类
              </p>
              <PremiumButton
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
              >
                清除筛选
              </PremiumButton>
            </motion.div>
          )}
        </div>
      </div>

      {/* Item Detail Dialog */}
      <PremiumDialog
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.name}
        icon={<span className="text-3xl">{selectedItem?.image}</span>}
        maxWidth="lg"
      >
        {selectedItem && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500 block mb-1">品牌</label>
                <p className="font-medium text-gray-800">{selectedItem.brand}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">颜色</label>
                <p className="font-medium text-gray-800">{selectedItem.color}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">季节</label>
                <p className="font-medium text-gray-800">{selectedItem.season}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500 block mb-1">分类</label>
                <p className="font-medium text-gray-800">
                  {categories.find(c => c.id === selectedItem.category)?.label}
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-500 block mb-2">风格标签</label>
              <PremiumTagGroup>
                {selectedItem.tags.map((tag, i) => (
                  <PremiumTag key={i} color="pink">
                    {tag}
                  </PremiumTag>
                ))}
              </PremiumTagGroup>
            </div>

            <PremiumDialogActions>
              <PremiumButton variant="ghost" onClick={() => setSelectedItem(null)}>
                关闭
              </PremiumButton>
              <PremiumButton variant="outline">
                编辑
              </PremiumButton>
              <PremiumButton variant="primary">
                创建搭配
              </PremiumButton>
            </PremiumDialogActions>
          </div>
        )}
      </PremiumDialog>

      {/* Add Dialog */}
      <PremiumDialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        title="添加新衣服"
        icon={<span>✨</span>}
        maxWidth="md"
      >
        <div className="space-y-4">
          <PremiumInput
            label="衣服名称"
            placeholder="例如：白色衬衫"
            icon={<span>👕</span>}
          />
          <PremiumInput
            label="品牌"
            placeholder="例如：ZARA"
            icon={<span>🏷️</span>}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择分类
            </label>
            <PremiumTagGroup>
              {categories.filter(c => c.id !== 'all').map((cat) => (
                <PremiumTag key={cat.id} color={cat.color}>
                  {cat.label}
                </PremiumTag>
              ))}
            </PremiumTagGroup>
          </div>

          <PremiumDialogActions>
            <PremiumButton variant="ghost" onClick={() => setIsAddDialogOpen(false)}>
              取消
            </PremiumButton>
            <PremiumButton variant="glow-inner" onClick={() => setIsAddDialogOpen(false)}>
              添加 ✨
            </PremiumButton>
          </PremiumDialogActions>
        </div>
      </PremiumDialog>
    </div>
  );
}
