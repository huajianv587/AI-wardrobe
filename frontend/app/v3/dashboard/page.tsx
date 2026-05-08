'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { V3Banner } from '@/components/shared/V3Banner';
import { PremiumButton } from '@/components/ui/PremiumButton';
import { PremiumTag } from '@/components/ui/PremiumTag';

export default function DashboardPage() {
  const router = useRouter();

  const features = [
    {
      id: 'wardrobe',
      title: '我的衣橱',
      description: '管理你的所有衣服',
      icon: '👗',
      color: 'from-pink-500 to-rose-500',
      path: '/v3/wardrobe',
      stats: { total: 128, recent: 5 }
    },
    {
      id: 'try-on',
      title: 'AI 试衣',
      description: '虚拟试穿搭配',
      icon: '✨',
      color: 'from-purple-500 to-indigo-500',
      path: '/v3/try-on',
      stats: { total: 45, recent: 3 }
    },
    {
      id: 'recommend',
      title: '搭配推荐',
      description: 'AI 智能推荐',
      icon: '🎨',
      color: 'from-blue-500 to-cyan-500',
      path: '/v3/recommend',
      stats: { total: 89, recent: 12 }
    },
    {
      id: 'diary',
      title: '穿搭日记',
      description: '记录每日穿搭',
      icon: '📔',
      color: 'from-orange-500 to-amber-500',
      path: '/v3/outfit-diary',
      stats: { total: 67, recent: 2 }
    },
    {
      id: 'analysis',
      title: '衣橱分析',
      description: '数据可视化分析',
      icon: '📊',
      color: 'from-green-500 to-emerald-500',
      path: '/v3/closet-analysis',
      stats: { total: 15, recent: 1 }
    },
    {
      id: 'style',
      title: '风格画像',
      description: '了解你的风格',
      icon: '🎭',
      color: 'from-violet-500 to-purple-500',
      path: '/v3/style-profile',
      stats: { total: 8, recent: 0 }
    }
  ];

  const recentActivity = [
    { action: '添加了新衣服', item: '白色衬衫', time: '2分钟前', icon: '👕' },
    { action: '保存了搭配', item: '通勤Look', time: '1小时前', icon: '💼' },
    { action: '完成了试穿', item: '约会装', time: '3小时前', icon: '💕' },
  ];

  const todayRecommendations = [
    {
      title: '通勤优雅',
      items: ['白衬衫', '黑色西裤', '高跟鞋'],
      match: 95,
      weather: '22°C 晴',
    },
    {
      title: '休闲周末',
      items: ['针织衫', '牛仔裤', '运动鞋'],
      match: 88,
      weather: '22°C 晴',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/20">
      <V3Banner />
      {/* Navigation - gentle style */}
      <nav className="fixed top-11 left-0 right-0 z-50 backdrop-blur-xl bg-white/80 border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/v3')}>
            <span className="text-3xl">👗</span>
            <span className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              AI 智能衣橱
            </span>
          </div>

          <div className="flex items-center gap-6">
            <button className="relative hover:scale-110 transition-transform">
              <span className="text-2xl">🔔</span>
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full text-white text-xs flex items-center justify-center font-medium shadow-lg">
                3
              </span>
            </button>
            <button className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-gradient-to-r from-gray-100 to-gray-50 hover:from-gray-200 hover:to-gray-100 transition-all border border-gray-200/50">
              <span className="text-2xl">👤</span>
              <span className="font-medium text-gray-700">用户</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-44 pb-16 px-8">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mb-16"
          >
            <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent tracking-tight">
              早上好
            </h1>
            <p className="text-gray-500 text-xl font-light">
              今天是个适合穿搭的好日子
            </p>
          </motion.div>

          {/* Today's Recommendations - cleaner cards with more spacing */}
          <motion.section
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mb-24"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight">今日推荐</h2>
              <button className="text-purple-600 hover:text-purple-700 font-medium transition-colors">
                查看全部 →
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-10">
              {todayRecommendations.map((rec, i) => (
                <motion.div
                  key={i}
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.2 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -8, scale: 1.01 }}
                  className="bg-white/90 backdrop-blur-sm rounded-[40px] p-10 shadow-xl border border-gray-100 cursor-pointer group overflow-hidden relative"
                >
                  <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">
                          {rec.title}
                        </h3>
                        <p className="text-sm text-gray-500 font-light">{rec.weather}</p>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-full border border-purple-100">
                        <span className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                          {rec.match}%
                        </span>
                        <span className="text-xs text-gray-600 font-medium">匹配</span>
                      </div>
                    </div>

                    <div className="flex gap-3 mb-6">
                      {rec.items.map((item, j) => (
                        <PremiumTag key={j} color="pink">
                          {item}
                        </PremiumTag>
                      ))}
                    </div>

                    <PremiumButton
                      variant="outline"
                      size="md"
                      className="w-full group-hover:bg-purple-50 group-hover:border-purple-200"
                    >
                      试穿看看
                    </PremiumButton>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Quick Actions - larger spacing, cleaner grid */}
          <motion.section
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mb-24"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-8 tracking-tight">快速操作</h2>

            <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-8">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.id}
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.4 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -12, scale: 1.05 }}
                  onClick={() => router.push(feature.path)}
                  className="group relative cursor-pointer"
                >
                  <div className="bg-white/90 backdrop-blur-sm rounded-[32px] p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-500 overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

                    <div className="relative z-10 text-center">
                      <div className="text-6xl mb-4 filter drop-shadow-lg">{feature.icon}</div>
                      <h3 className="font-bold text-gray-900 mb-2 text-base tracking-tight">
                        {feature.title}
                      </h3>
                      <p className="text-xs text-gray-500 mb-4 font-light">
                        {feature.description}
                      </p>

                      <div className="flex items-center justify-center gap-2 text-xs font-light">
                        <span className="text-gray-600">
                          {feature.stats.total} 项
                        </span>
                        {feature.stats.recent > 0 && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="text-purple-600 font-medium">
                              +{feature.stats.recent} 新
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-gradient-to-br from-purple-300/20 to-pink-300/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Recent Activity */}
          <motion.section
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-8 tracking-tight">最近活动</h2>

            <div className="bg-white/90 backdrop-blur-sm rounded-[40px] p-8 shadow-xl border border-gray-100">
              <div className="space-y-2">
                {recentActivity.map((activity, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: -30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.6 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-center gap-5 p-5 rounded-[24px] hover:bg-gray-50 transition-all duration-300 cursor-pointer group"
                  >
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
                      {activity.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 font-medium">
                        {activity.action}
                        <span className="text-purple-600 ml-1">{activity.item}</span>
                      </p>
                      <p className="text-sm text-gray-500 font-light">{activity.time}</p>
                    </div>
                    <button className="text-gray-400 hover:text-purple-600 transition-colors text-xl">
                      →
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
