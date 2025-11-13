import { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, FileText, Download, UserPlus, CheckCircle, XCircle, MessageSquare, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  data?: {
    fileId?: string;
    fileName?: string;
    linkId?: string;
    requestId?: string;
    userId?: string;
    userName?: string;
  };
  read: boolean;
  createdAt: string;
}

export const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const token = localStorage.getItem('token');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    fetchUnreadCount();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchUnreadCount = async () => {
    if (!token) return;
    try {
      const response = await fetch('http://localhost:5000/api/notifications/unread-count', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const result = await response.json();
        setUnreadCount(result.data.count);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchNotifications = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/notifications?limit=20', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const result = await response.json();
        setNotifications(result.data.notifications);
        setUnreadCount(result.data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notifications',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!token) return;
    try {
      const response = await fetch(`http://localhost:5000/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setNotifications(notifications.map(n => 
          n._id === notificationId ? { ...n, read: true } : n
        ));
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!token) return;
    try {
      const response = await fetch('http://localhost:5000/api/notifications/mark-all-read', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
        toast({
          title: 'Success',
          description: 'All notifications marked as read'
        });
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!token) return;
    try {
      const response = await fetch(`http://localhost:5000/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setNotifications(notifications.filter(n => n._id !== notificationId));
        toast({
          title: 'Deleted',
          description: 'Notification removed'
        });
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'file_shared':
        return <FileText className="h-4 w-4" />;
      case 'file_downloaded':
        return <Download className="h-4 w-4" />;
      case 'access_request':
        return <UserPlus className="h-4 w-4" />;
      case 'access_approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'access_denied':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative flex items-center" ref={menuRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative hover:opacity-80 transition-opacity p-1"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-red-500 hover:bg-red-600">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="p-4 bg-muted/50 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">Notifications</h3>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
              </p>
            </div>
            {notifications.length > 0 && unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>

          <Separator />

          {/* Notifications List */}
          <ScrollArea className="h-[400px]">
            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`p-4 hover:bg-muted/30 transition-colors group ${
                      !notification.read ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Icon */}
                      <div className={`mt-1 p-2 rounded-full ${
                        !notification.read ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{notification.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground/70 mt-2">
                              {formatTime(notification.createdAt)}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification._id)}
                                className="p-1 hover:bg-muted rounded"
                                title="Mark as read"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteNotification(notification._id)}
                              className="p-1 hover:bg-destructive/10 hover:text-destructive rounded"
                              title="Delete"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
};
