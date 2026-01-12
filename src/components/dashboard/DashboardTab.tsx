
import React from 'react';
import { 
  TrendingUp, 
  Users, 
  Activity,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';
import { useDashboardStats } from '../../hooks/useDashboardStats';




export function DashboardTab() {
  const { stats, recentActivity, isLoading, error } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="flex-1 p-2 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-2 flex items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  const dashboardStats = [
    {
      label: 'Total Likes',
      value: stats.totalLikes.toLocaleString(),
      change: 'Lifetime', 
      trend: 'up',
      icon: TrendingUp,
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
      borderColor: 'border-pink-500/20'
    },
    {
      label: 'Total Comments',
      value: stats.totalComments.toLocaleString(),
      change: 'Lifetime',
      trend: 'up',
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20'
    },
    {
      label: 'Published Posts',
      value: stats.publishedPosts.toLocaleString(),
      change: `${stats.scheduledPosts} Scheduled`,
      trend: 'up',
      icon: Activity,
      color: 'text-violet-500',
      bgColor: 'bg-violet-500/10',
      borderColor: 'border-violet-500/20'
    }
  ];

  return (
    <div className="flex-1 p-2 space-y-6 overflow-y-auto">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {dashboardStats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl backdrop-blur-sm hover:bg-zinc-900/80 transition-colors group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={cn("p-3 rounded-xl", stat.bgColor)}>
                <stat.icon className={cn("size-6", stat.color)} />
              </div>
              <span className={cn(
                "flex items-center text-xs font-medium px-2 py-1 rounded-full text-zinc-400 bg-white/5"
              )}>
                {stat.change}
              </span>
            </div>
            <h3 className="text-zinc-400 text-sm font-medium">{stat.label}</h3>
            <p className="text-2xl font-bold text-white mt-1 group-hover:scale-105 transition-transform origin-left">
              {stat.value}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm"
        >
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h3 className="font-bold text-lg">Recent Activity</h3>
                <button className="text-zinc-500 hover:text-white transition-colors">
                    <MoreHorizontal className="size-5" />
                </button>
            </div>
            <div className="p-6 space-y-6">
                {recentActivity.length > 0 ? (
                    recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center overflow-hidden border border-white/10">
                                {activity.thumbnail ? (
                                    <img src={activity.thumbnail} alt="Post thumbnail" className="w-full h-full object-cover" />
                                ) : (
                                    <Activity className="size-5 text-zinc-500" />
                                )}
                             </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">
                                    <span className="font-bold">{activity.platform === 'instagram' ? 'Instagram' : 'Facebook'}</span> {activity.status}
                                </p>
                                <p className="text-xs text-zinc-500 truncate">{activity.caption || 'No caption'}</p>
                            </div>
                            <span className="text-xs text-zinc-500">
                                {activity.time}
                            </span>
                        </div>
                    ))
                ) : (
                    <div className="text-center text-zinc-500 py-4">No recent activity</div>
                )}
            </div>
        </motion.div>

        {/* Engagement Overview Placeholder */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm flex flex-col"
        >
             <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h3 className="font-bold text-lg">Engagement Overview</h3>
                <select className="bg-zinc-800 border border-white/10 rounded-lg text-xs px-2 py-1 outline-none">
                    <option>Last 30 days</option>
                </select>
            </div>
            <div className="flex-1 flex items-center justify-center p-6 relative min-h-[200px]">
                 {/* Decorative background chart lines */}
                 <div className="absolute inset-0 flex items-end justify-between px-10 pb-10 opacity-20 pointer-events-none">
                    {[40, 70, 45, 90, 60, 80, 50].map((h, index) => (
                        <div key={index} style={{ height: `${h}%` }} className="w-8 bg-violet-500 rounded-t-lg" />
                    ))}
                 </div>
                 <div className="z-10 text-center">
                    <TrendingUp className="size-12 text-violet-500 mx-auto mb-2" />
                    <p className="text-zinc-300 font-medium">Coming Soon</p>
                    <p className="text-zinc-500 text-sm">Detailed visualization of your growth.</p>
                 </div>
            </div>
        </motion.div>
      </div>
    </div>
  );
}
