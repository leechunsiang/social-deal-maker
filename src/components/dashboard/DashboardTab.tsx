
import React from 'react';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

const stats = [
  {
    label: 'Total Revenue',
    value: '$45,231.89',
    change: '+20.1%',
    trend: 'up',
    icon: DollarSign,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20'
  },
  {
    label: 'Active Deals',
    value: '24',
    change: '+12',
    trend: 'up',
    icon: Activity,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/20'
  },
  {
    label: 'New Leads',
    value: '1,203',
    change: '-4%',
    trend: 'down',
    icon: Users,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20'
  }
];

const recentActivity = [
  {
    id: 1,
    user: 'Sarah Wilson',
    action: 'signed the contract',
    amount: '$12,500',
    time: '2 hours ago',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop'
  },
  {
    id: 2,
    user: 'TechStart Inc.',
    action: 'scheduled a demo',
    amount: null,
    time: '4 hours ago',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop'
  },
  {
    id: 3,
    user: 'Alex Chen',
    action: 'viewed your proposal',
    amount: null,
    time: '5 hours ago',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop'
  },
  {
    id: 4,
    user: 'Marcus Johnson',
    action: 'paid invoice #3421',
    amount: '$3,400',
    time: '1 day ago',
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop'
  }
];

export function DashboardTab() {
  return (
    <div className="flex-1 p-2 space-y-6 overflow-y-auto">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
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
                "flex items-center text-xs font-medium px-2 py-1 rounded-full",
                stat.trend === 'up' ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"
              )}>
                {stat.change}
                {stat.trend === 'up' ? <ArrowUpRight className="size-3 ml-1" /> : <ArrowDownRight className="size-3 ml-1" />}
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
                {recentActivity.map((activity, i) => (
                    <div key={activity.id} className="flex items-center gap-4">
                        <img src={activity.avatar} alt={activity.user} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-white">
                                <span className="font-bold">{activity.user}</span> {activity.action}
                            </p>
                            <p className="text-xs text-zinc-500">{activity.time}</p>
                        </div>
                        {activity.amount && (
                            <span className="text-sm font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                                {activity.amount}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </motion.div>

        {/* Chart Placeholder */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm flex flex-col"
        >
             <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h3 className="font-bold text-lg">Deal Velocity</h3>
                <select className="bg-zinc-800 border border-white/10 rounded-lg text-xs px-2 py-1 outline-none">
                    <option>Last 7 days</option>
                    <option>Last 30 days</option>
                    <option>Last 90 days</option>
                </select>
            </div>
            <div className="flex-1 flex items-center justify-center p-6 relative">
                 {/* Decorative background chart lines */}
                 <div className="absolute inset-0 flex items-end justify-between px-10 pb-10 opacity-20 pointer-events-none">
                    {[40, 70, 45, 90, 60, 80, 50].map((h, index) => (
                        <div key={index} style={{ height: `${h}%` }} className="w-8 bg-violet-500 rounded-t-lg" />
                    ))}
                 </div>
                 <div className="z-10 text-center">
                    <TrendingUp className="size-12 text-violet-500 mx-auto mb-2" />
                    <p className="text-zinc-300 font-medium">Coming Soon</p>
                    <p className="text-zinc-500 text-sm">Detailed analytics charts will appear here.</p>
                 </div>
            </div>
        </motion.div>
      </div>
    </div>
  );
}
