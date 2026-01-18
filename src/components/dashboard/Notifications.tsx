import { useRef, useState, useEffect } from 'react';
import type { RefObject } from 'react';
import { Bell, MessageSquare, AlertCircle, CheckCircle2, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useNotifications } from '../../lib/hooks/useNotifications';
// Local hook implementation below

// Simple click outside hook implementation if not exists
function useClickOutside<T extends HTMLElement>(ref: RefObject<T | null>, handler: (event: Event) => void) {
  useEffect(() => {
    const listener = (event: any) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}



export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, () => setIsOpen(false));

  const getIcon = (type: string) => {
    switch (type) {
      case 'post_status':
        return <AlertCircle className="size-4" />;
      case 'new_message':
        return <MessageSquare className="size-4" />;
      case 'new_comment':
        return <MessageCircle className="size-4" />;
      default:
        return <Bell className="size-4" />;
    }
  };

  const getColor = (type: string, isRead: boolean) => {
      if (isRead) return 'text-zinc-500 bg-zinc-800';
      switch (type) {
          case 'post_status': return 'text-red-400 bg-red-400/10';
          case 'new_message': return 'text-blue-400 bg-blue-400/10';
          case 'new_comment': return 'text-emerald-400 bg-emerald-400/10';
          default: return 'text-violet-400 bg-violet-400/10';
      }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full ring-2 ring-zinc-950" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 md:w-96 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-zinc-900/50 backdrop-blur-sm">
              <h3 className="font-semibold text-white">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
                >
                  <CheckCircle2 className="size-3" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">
                  <Bell className="size-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-4 flex gap-3 transition-colors hover:bg-white/5",
                        !notification.is_read ? "bg-white/[0.02]" : ""
                      )}
                      onClick={() => !notification.is_read && markAsRead(notification.id)}
                    >
                      <div className={cn("shrink-0 size-8 rounded-lg flex items-center justify-center", getColor(notification.type, notification.is_read))}>
                         {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                          <p className={cn("text-sm font-medium truncate", !notification.is_read ? "text-white" : "text-zinc-400")}>
                              {notification.title}
                          </p>
                          <span className="text-[10px] text-zinc-600 whitespace-nowrap ml-2">
                             {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 line-clamp-2">{notification.message}</p>
                      </div>
                      {!notification.is_read && (
                          <div className="shrink-0 self-center">
                              <div className="size-2 bg-violet-500 rounded-full" />
                          </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
