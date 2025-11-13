import { useState, useEffect } from "react";
import { apiUrl } from '@/lib/api';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Download, 
  Eye, 
  Share2, 
  FileText, 
  RefreshCw,
  Clock,
  User,
  Globe
} from "lucide-react";

interface FileHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
}

interface HistoryEntry {
  accessedAt: string;
  accessType: 'view' | 'download' | 'share';
  ipAddress?: string;
  userAgent?: string;
  userId?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface DownloadEntry {
  downloadedAt: string;
  ipAddress?: string;
  userAgent?: string;
  userId?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface FileHistoryData {
  fileId: string;
  originalName: string;
  accessHistory: HistoryEntry[];
  downloadHistory: DownloadEntry[];
  totalDownloads: number;
  lastAccessedAt?: string;
}

export const FileHistoryModal = ({ isOpen, onClose, fileId, fileName }: FileHistoryModalProps) => {
  const [historyData, setHistoryData] = useState<FileHistoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');

  const fetchFileHistory = async () => {
    if (!token || !fileId) return;
    
    setLoading(true);
    try {
      const response = await fetch(apiUrl(`/api/files/${fileId}/history`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setHistoryData(result.data);
      } else {
        console.error('Failed to fetch file history');
      }
    } catch (error) {
      console.error('Error fetching file history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && fileId) {
      fetchFileHistory();
    }
  }, [isOpen, fileId]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'download':
        return <Download className="h-4 w-4 text-primary" />;
      case 'view':
        return <Eye className="h-4 w-4 text-blue-500" />;
      case 'share':
        return <Share2 className="h-4 w-4 text-green-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getUserDisplay = (userId?: { firstName: string; lastName: string; email: string }) => {
    if (userId) {
      return `${userId.firstName} ${userId.lastName} (${userId.email})`;
    }
    return 'Anonymous';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            File History: {fileName}
          </DialogTitle>
          <DialogDescription>
            View access and download history for this file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading history...
            </div>
          ) : historyData ? (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <div className="text-2xl font-bold">{historyData.totalDownloads}</div>
                  <div className="text-sm text-muted-foreground">Total Downloads</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{historyData.accessHistory.length}</div>
                  <div className="text-sm text-muted-foreground">Total Access Events</div>
                </div>
              </div>

              {/* Activity Timeline */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Activity Timeline</h3>
                <ScrollArea className="h-[400px] pr-1">
                  <div className="grid grid-cols-1 gap-3">
                    {/* Combine and sort all activities */}
                    {[
                      ...historyData.accessHistory.map(entry => ({
                        ...entry,
                        timestamp: entry.accessedAt,
                        type: entry.accessType
                      })),
                      ...historyData.downloadHistory.map(entry => ({
                        ...entry,
                        timestamp: entry.downloadedAt,
                        type: 'download' as const
                      }))
                    ]
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map((activity, index) => (
                        <div
                          key={index}
                          className="p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {getActivityIcon(activity.type)}
                            <Badge variant="outline" className="text-xs">
                              {activity.type}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(activity.timestamp)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3" />
                              <span className="truncate">{getUserDisplay(activity.userId)}</span>
                            </div>
                            {activity.ipAddress && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Globe className="h-3 w-3" />
                                <span className="font-mono text-xs">{activity.ipAddress}</span>
                              </div>
                            )}
                            {activity.userAgent && (
                              <div className="col-span-2 text-xs text-muted-foreground break-words">
                                {activity.userAgent}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No history data available
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={fetchFileHistory} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
