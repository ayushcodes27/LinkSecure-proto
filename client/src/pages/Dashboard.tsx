import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Search,
  Filter,
  MoreVertical,
  Share2,
  Download,
  FileText,
  Image,
  Film,
  Archive,
  Shield,
  Eye,
  BarChart3,
  Users,
  Settings,
  Bell,
  Plus,
  LogOut,
  History,
  RefreshCw,
  Loader2,
  Link,
  TrendingUp,
  FolderOpen,
  Trash2,
  Copy
} from "lucide-react";
import { FileUploadZone } from "@/components/FileUploadZone";
import { FileHistoryModal } from "@/components/FileHistoryModal";
import SecureLinkModal from "@/components/SecureLinkModal";
import FilePreviewModal from "@/components/FilePreviewModal";
import { ShareModal } from "@/components/ShareModalTabbed";
import { FileAnalyticsModal } from "@/components/FileAnalyticsModal";
import { AnalyticsChart } from "@/components/AnalyticsChartNew";
import { UserManagement } from "@/components/UserManagement";
import { ProfileMenu } from "@/components/ProfileMenu";
import { NotificationCenter } from "@/components/NotificationCenter";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { MetricCard } from "@/components/MetricCard";
import { useToast } from "@/hooks/use-toast";
import SkeletonLoader from "@/components/SkeletonLoader";
import AnimatedCounter from "@/components/AnimatedCounter";
import ThemeToggle from "@/components/ThemeToggle";
import { apiUrl } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FileData {
  fileId: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadMethod: string;
  isPublic: boolean;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
  uploadedBy?: string;
  metadata?: {
    description?: string;
    tags?: string[];
    category?: string;
  };
}

interface ActivityData {
  type: string;
  fileId: string;
  fileName: string;
  timestamp: string;
  mimeType: string;
  fileSize: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("files");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showSecureLinkModal, setShowSecureLinkModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [selectedFileForHistory, setSelectedFileForHistory] = useState<{ fileId: string; fileName: string } | null>(null);
  const [selectedFileForSecureLink, setSelectedFileForSecureLink] = useState<{ fileId: string; fileName: string } | null>(null);
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<FileData | null>(null);
  const [selectedFileForAnalytics, setSelectedFileForAnalytics] = useState<string | null>(null);
  const [previewFileIndex, setPreviewFileIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [files, setFiles] = useState<FileData[]>([]);
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [secureLinks, setSecureLinks] = useState<any[]>([]);
  const [sharedFiles, setSharedFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [linksLoading, setLinksLoading] = useState(false);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashFiles, setTrashFiles] = useState<FileData[]>([]);
  const [storageStats, setStorageStats] = useState<{
    used: number;
    limit: number;
    percentage: number;
  }>({
    used: 0,
    limit: 5 * 1024 * 1024 * 1024, // Default 5GB
    percentage: 0
  });

  const { toast } = useToast();

  // Get user data from localStorage and state
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const getUserInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || 'U';
  };

  // Fetch user profile data
  const fetchUserProfile = async () => {
    if (!token) return;
    
    try {
      const response = await fetch(apiUrl('/api/user/settings'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data?.user) {
          const updatedUser = {
            ...user,
            ...result.data.user
          };
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Fetch user's files
  const fetchFiles = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch(apiUrl('/api/files/my-files'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setFiles(result.data.files || []);
      } else {
        throw new Error('Failed to fetch files');
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      toast({
        title: "Error",
        description: "Failed to load files",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch files shared with current user
  const fetchSharedFiles = async () => {
    if (!token) return;

    setSharedLoading(true);
    try {
      const response = await fetch(apiUrl('/api/files/shared-with-me'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setSharedFiles(result.data.files || []);
      } else if (response.status === 404) {
        console.log('No shared files found or endpoint not fully implemented');
        setSharedFiles([]);
      } else if (response.status === 401) {
        console.warn('Authentication required for shared files');
        setSharedFiles([]);
      } else {
        throw new Error('Failed to fetch shared files');
      }
    } catch (error) {
      console.error('Error fetching shared files:', error);
      // Only show error toast for non-404/401 errors
      if (error instanceof Error && !error.message.includes('404') && !error.message.includes('401')) {
        toast({
          title: "Error",
          description: "Failed to load shared files",
          variant: "destructive"
        });
      }
      setSharedFiles([]);
    } finally {
      setSharedLoading(false);
    }
  };

  // Fetch user activity history
  const fetchActivity = async () => {
    if (!token) return;

    try {
      const response = await fetch(apiUrl('/api/files/history/my-activity'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setActivities(result.data.activities || []);
      } else {
        throw new Error('Failed to fetch activity');
      }
    } catch (error) {
      console.error('Error fetching activity:', error);
      toast({
        title: "Error",
        description: "Failed to load activity history",
        variant: "destructive"
      });
    }
  };

  // Fetch user's secure links
  const fetchSecureLinks = async () => {
    if (!token) return;

    setLinksLoading(true);
    try {
      const response = await fetch(apiUrl('/api/files/secure-links'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setSecureLinks(result.data.links || []);
      } else if (response.status === 401) {
        // Authentication error - don't show toast, just log
        console.warn('Authentication required for secure links');
        setSecureLinks([]);
      } else {
        // Other errors - show toast only if it's not a 404 (no links found)
        if (response.status !== 404) {
          throw new Error('Failed to fetch secure links');
        }
        setSecureLinks([]);
      }
    } catch (error) {
      console.error('Error fetching secure links:', error);
      // Only show error toast for non-authentication errors
      if (error instanceof Error && !error.message.includes('401')) {
        toast({
          title: "Error",
          description: "Failed to load secure links",
          variant: "destructive"
        });
      }
      setSecureLinks([]);
    } finally {
      setLinksLoading(false);
    }
  };

  // Fetch trashed files
  const fetchTrash = async () => {
    if (!token) return;
    setTrashLoading(true);
    try {
      const response = await fetch(apiUrl('/api/files/trash/list'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const result = await response.json();
        setTrashFiles(result.data.files || []);
      } else {
        throw new Error('Failed to fetch trash');
      }
    } catch (error) {
      console.error('Error fetching trash:', error);
      toast({ title: 'Error', description: 'Failed to load trash', variant: 'destructive' });
    } finally {
      setTrashLoading(false);
    }
  };

  // Fetch storage statistics
  const fetchStorageStats = async () => {
    if (!token) return;
    
    try {
      const response = await fetch(apiUrl('/api/user/settings'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data?.storage) {
          setStorageStats({
            used: result.data.storage.used || 0,
            limit: result.data.storage.limit || 5 * 1024 * 1024 * 1024,
            percentage: parseFloat(result.data.storage.percentage) || 0
          });
        }
      } else {
        console.warn('Failed to fetch storage stats');
      }
    } catch (error) {
      console.error('Error fetching storage stats:', error);
      // Don't show error toast, just log it
    }
  };

  const handleRestore = async (fileId: string) => {
    if (!token) return;
    try {
      const response = await fetch(apiUrl(`/api/files/${fileId}/restore`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Restore failed');
      toast({ title: 'Restored', description: 'File moved back from trash' });
      fetchFiles();
      fetchTrash();
      fetchStorageStats();
    } catch (error) {
      toast({ title: 'Error', description: 'Could not restore file', variant: 'destructive' });
    }
  };

  const handlePermanentDelete = async (fileId: string) => {
    if (!token) return;
    if (!confirm('Permanently delete this file? This cannot be undone.')) return;
    try {
      const response = await fetch(apiUrl(`/api/files/${fileId}/permanent`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Permanent delete failed');
      toast({ title: 'Deleted', description: 'File permanently removed' });
      fetchTrash();
      fetchStorageStats();
    } catch (error) {
      toast({ title: 'Error', description: 'Could not delete file permanently', variant: 'destructive' });
    }
  };

  // Sync with Azure storage
  const handleAzureSync = async () => {
    if (!token) return;

    setSyncing(true);
    try {
      const response = await fetch(apiUrl('/api/files/sync/azure'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Sync Complete",
          description: result.message || "Azure storage sync completed",
        });
        // Refresh files after sync
        fetchFiles();
      } else {
        throw new Error('Failed to sync with Azure');
      }
    } catch (error) {
      console.error('Error syncing with Azure:', error);
      toast({
        title: "Sync Error",
        description: "Failed to sync with Azure storage",
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  // Download file
  const handleDownload = async (fileId: string, fileName: string) => {
    if (!token) return;

    try {
      const response = await fetch(apiUrl(`/api/files/${fileId}/download`), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "Download Started",
          description: `Downloading ${fileName}`,
        });

        // Refresh activity after download
        fetchActivity();
      } else {
        throw new Error('Failed to download file');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Download Error",
        description: "Failed to download file",
        variant: "destructive"
      });
    }
  };

  // Soft delete a file (move to trash)
  const handleSoftDelete = async (fileId: string, fileName: string) => {
    if (!token) return;
    if (!confirm(`Move "${fileName}" to Trash?`)) return;
    try {
      const response = await fetch(apiUrl(`/api/files/${fileId}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        let msg = 'Delete failed';
        try {
          const body = await response.json();
          msg = body?.message || body?.error || msg;
        } catch {}
        if (response.status === 403) {
          msg = 'You can only delete files you own or administer.';
        }
        if (response.status === 404) {
          msg = 'File not found.';
        }
        throw new Error(msg);
      }
      toast({ title: 'Moved to Trash', description: `${fileName} was moved to Trash.` });
      fetchFiles();
      if (activeTab === 'trash') fetchTrash();
      fetchStorageStats();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({ title: 'Delete Error', description: error instanceof Error ? error.message : 'Failed to move file to Trash', variant: 'destructive' });
    }
  };

  // Handle file preview
  const handlePreview = (file: FileData, index: number) => {
    setSelectedFileForPreview(file);
    setPreviewFileIndex(index);
    setShowPreviewModal(true);
  };

  // Handle preview navigation
  const handlePreviewNavigate = (direction: 'prev' | 'next') => {
    const currentList = filteredFiles;
    if (direction === 'prev' && previewFileIndex > 0) {
      const newIndex = previewFileIndex - 1;
      setSelectedFileForPreview(currentList[newIndex]);
      setPreviewFileIndex(newIndex);
    } else if (direction === 'next' && previewFileIndex < currentList.length - 1) {
      const newIndex = previewFileIndex + 1;
      setSelectedFileForPreview(currentList[newIndex]);
      setPreviewFileIndex(newIndex);
    }
  };

  useEffect(() => {
    fetchFiles();
    fetchActivity();
    fetchStorageStats();
    fetchUserProfile();
    fetchSharedFiles();
    // Add a small delay for secure links to ensure user is fully authenticated
    setTimeout(() => {
      fetchSecureLinks();
    }, 500);

    // Simulate loading stats
    setTimeout(() => setStatsLoading(false), 1500);
  }, []);

  // Listen for profile updates (when returning from settings)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user' && e.newValue) {
        setUser(JSON.parse(e.newValue));
      }
    };

    const handleFocus = () => {
      // Refresh user data when window regains focus (e.g., returning from settings)
      fetchUserProfile();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [token]);

  useEffect(() => {
    if (activeTab === 'trash') {
      fetchTrash();
    } else if (activeTab === 'shared') {
      fetchSharedFiles();
    }
  }, [activeTab]);

  // Filter files based on search query
  const filteredFiles = files.filter(file =>
    file.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.mimeType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) {
      return <FileText className="h-5 w-5 text-destructive" />;
    } else if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
      return <FileText className="h-5 w-5 text-warning" />;
    } else if (mimeType.includes('video')) {
      return <Film className="h-5 w-5 text-accent" />;
    } else if (mimeType.includes('image')) {
      return <Image className="h-5 w-5 text-primary" />;
    } else {
      return <Archive className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60">
        <div className="h-16 flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative p-2 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-primary/20">
                  <Shield className="h-5 w-5 text-primary transition-transform duration-300 group-hover:scale-110" />
                </div>
              </div>
              <div>
                <span className="text-lg font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  LinkSecure
                </span>
                <p className="text-xs text-muted-foreground -mt-0.5">Dashboard</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <NotificationCenter />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/dashboard/settings')}
              className="hover:bg-muted/50 rounded-lg transition-all duration-200 hover:scale-105"
            >
              <Settings className="h-5 w-5" />
            </Button>
            <ProfileMenu user={user} onLogout={handleLogout} />
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <DashboardSidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        storageUsed={storageStats.used}
        storageLimit={storageStats.limit}
        storagePercentage={storageStats.percentage}
      />

      {/* Main Content */}
      <div className="ml-64 pt-8 pb-12 px-8">
        {/* Page Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-2">
                {activeTab === 'files' && 'Files'}
                {activeTab === 'shared' && 'Shared with Me'}
                {activeTab === 'history' && 'Activity History'}
                {activeTab === 'analytics' && 'Analytics'}
                {activeTab === 'trash' && 'Trash'}
              </h1>
              <p className="text-muted-foreground text-base">
                {activeTab === 'files' && 'Manage and organize your files'}
                {activeTab === 'shared' && 'Access files shared with you by other users'}
                {activeTab === 'history' && 'Track all file activities'}
                {activeTab === 'analytics' && 'View detailed insights and metrics'}
                {activeTab === 'trash' && 'Recover or permanently delete files'}
              </p>
            </div>
            {activeTab === 'files' && (
              <Button 
                onClick={() => document.getElementById('file-upload')?.click()}
                className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
              >
                <Plus className="h-4 w-4 mr-2" />
                Upload File
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {activeTab === 'trash' && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Trash</CardTitle>
                    <CardDescription className="text-sm mt-1">
                      Recently deleted files (auto-removed after 30 days)
                    </CardDescription>
                  </div>
                  <Button 
                    size="sm"
                    onClick={fetchTrash} 
                    disabled={trashLoading}
                    className="h-9"
                  >
                    {trashLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {trashLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="p-5 border rounded-xl bg-card">
                        <SkeletonLoader variant="text" lines={2} />
                      </div>
                    ))}
                  </div>
                ) : trashFiles.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium mb-1">Trash is empty</p>
                    <p className="text-sm">Deleted files will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {trashFiles.map((file, index) => (
                      <div 
                        key={file.fileId} 
                        className="group flex items-center justify-between p-5 border rounded-xl hover:border-destructive/30 hover:shadow-md transition-all duration-200 bg-card"
                      >
                        <div className="flex items-center space-x-4 flex-1 min-w-0">
                          <div className="flex-shrink-0 p-3 rounded-lg bg-destructive/5 text-destructive">
                            {getFileIcon(file.mimeType)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{file.originalName}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Deleted recently • Will be permanently removed in 30 days
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleRestore(file.fileId)}
                            className="h-8"
                          >
                            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                            Restore
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handlePermanentDelete(file.fileId)}
                            className="h-8"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'files' && (
            <>
              {/* File Upload Zone */}
              <FileUploadZone onUploadComplete={() => {
                fetchFiles();
                fetchActivity();
                fetchStorageStats();
              }} />

              {/* File Management */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="border-b bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative flex-1 min-w-[300px]">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search files..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 h-9 bg-background border-muted"
                        />
                      </div>
                      <Button variant="outline" size="sm" className="h-9">
                        <Filter className="h-4 w-4 mr-2" />
                        Filter
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAzureSync}
                        disabled={syncing}
                        className="h-9"
                      >
                        {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        Sync Azure
                      </Button>
                      <Button
                        size="sm"
                        onClick={fetchFiles}
                        disabled={loading}
                        className="h-9"
                      >
                        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        Refresh
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">

                {/* Files List */}
                <div className="space-y-3">
                  {loading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="p-5 border rounded-xl bg-card">
                          <SkeletonLoader variant="text" lines={2} />
                        </div>
                      ))}
                    </div>
                  ) : filteredFiles.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-medium mb-1">
                        {files.length === 0 ? "No files uploaded yet" : "No files match your search"}
                      </p>
                      <p className="text-sm">
                        {files.length === 0 ? "Upload your first file to get started" : "Try a different search term"}
                      </p>
                    </div>
                  ) : (
                    filteredFiles.map((file, index) => (
                      <div
                        key={file.fileId}
                        className="group relative flex items-center justify-between p-5 border rounded-xl 
                                   bg-gradient-to-br from-card to-card/50 
                                   hover:border-primary/40 hover:shadow-lg 
                                   transition-all duration-300 
                                   hover:-translate-y-1 hover:scale-[1.01]
                                   overflow-hidden"
                      >
                        {/* Animated background gradient on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        <div className="relative flex items-center space-x-4 flex-1 min-w-0">
                          <div className="flex-shrink-0 relative">
                            <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative p-3.5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary 
                                          group-hover:from-primary/20 group-hover:to-primary/10 
                                          ring-1 ring-primary/20 group-hover:ring-primary/40
                                          transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                              {getFileIcon(file.mimeType)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors duration-200">
                              {file.originalName}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-xs text-muted-foreground font-mono inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/50">
                                ID: {file.fileId.substring(0, 8)}...
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(file.fileId);
                                    toast({
                                      title: "Copied",
                                      description: "File ID copied to clipboard",
                                    });
                                  }}
                                  className="inline-flex items-center justify-center hover:bg-muted rounded p-0.5 transition-colors"
                                  title="Copy File ID"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              </span>
                              <Badge variant="secondary" className="text-xs font-normal">
                                {formatFileSize(file.fileSize)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(file.createdAt)}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {file.downloadCount} {file.downloadCount === 1 ? 'download' : 'downloads'}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="relative flex items-center gap-3 ml-4">
                          <Badge 
                            variant={file.isPublic ? "default" : "secondary"} 
                            className="text-xs px-2.5 py-1 font-medium ring-1 ring-current/20"
                          >
                            {file.isPublic ? "Public" : "Private"}
                          </Badge>
                          
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-110"
                              onClick={() => handlePreview(file, index)}
                              title="Preview"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-lg hover:bg-accent/10 hover:text-accent transition-all duration-200 hover:scale-110"
                              onClick={() => handleDownload(file.fileId, file.originalName)}
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-110"
                              onClick={() => {
                                setSelectedFileForSecureLink({ fileId: file.fileId, fileName: file.originalName });
                                setShowSecureLinkModal(true);
                              }}
                              title="Share"
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => {
                                  setSelectedFileForHistory({ fileId: file.fileId, fileName: file.originalName });
                                  setShowHistoryModal(true);
                                }}>
                                  <History className="h-4 w-4 mr-2" />
                                  View History
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setSelectedFileForAnalytics(file.fileId);
                                  setShowAnalyticsModal(true);
                                }}>
                                  <BarChart3 className="h-4 w-4 mr-2" />
                                  View Analytics
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {(file as any).uploadedBy && (file as any).uploadedBy === user?.id ? (
                                  <DropdownMenuItem 
                                    className="text-destructive focus:text-destructive" 
                                    onClick={() => handleSoftDelete(file.fileId, file.originalName)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem disabled>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete (owner only)
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
            </>
          )}

          {activeTab === 'shared' && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Shared with Me</CardTitle>
                    <CardDescription className="text-sm mt-1">
                      Files that others have shared with you
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={fetchSharedFiles}
                    disabled={sharedLoading}
                    className="h-9"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${sharedLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {sharedLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="p-5 border rounded-xl bg-card">
                        <SkeletonLoader variant="text" lines={2} />
                      </div>
                    ))}
                  </div>
                ) : sharedFiles.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium mb-1">No shared files</p>
                    <p className="text-sm">Files shared with you will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sharedFiles.map((file, index) => (
                      <div 
                        key={file.fileId} 
                        className="group relative flex items-center justify-between p-5 border rounded-xl 
                                 hover:border-primary/30 hover:shadow-lg transition-all duration-300 
                                 cursor-pointer bg-gradient-to-r from-card via-card to-card
                                 hover:from-primary/5 hover:via-card hover:to-accent/5"
                        onClick={() => handlePreview(file, index)}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        <div className="relative flex items-center space-x-4 flex-1 min-w-0">
                          <div className="flex-shrink-0 relative">
                            <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative p-3.5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary 
                                          group-hover:from-primary/20 group-hover:to-primary/10 
                                          ring-1 ring-primary/20 group-hover:ring-primary/40
                                          transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                              {getFileIcon(file.mimeType)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors duration-200">
                              {file.originalName}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                Shared by {file.sharedBy?.firstName} {file.sharedBy?.lastName}
                              </Badge>
                              <Badge variant="secondary" className="text-xs font-normal">
                                {formatFileSize(file.fileSize)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Shared {formatDate(file.sharedAt)}
                              </span>
                              <Badge variant="outline" className="text-xs capitalize">
                                {file.accessLevel} access
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="relative flex items-center gap-3 ml-4">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-110"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePreview(file, index);
                              }}
                              title="Preview"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-lg hover:bg-accent/10 hover:text-accent transition-all duration-200 hover:scale-110"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(file.fileId, file.originalName);
                              }}
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'history' && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Activity History</CardTitle>
                    <CardDescription className="text-sm mt-1">
                      Track all file activities and access logs
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={fetchActivity}
                    className="h-9"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {activities.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-medium mb-1">No activity yet</p>
                      <p className="text-sm">Activity history will appear here</p>
                    </div>
                  ) : (
                    activities.map((activity, index) => {
                      const getActivityIcon = () => {
                        switch (activity.type) {
                          case 'download': return { icon: Download, color: 'text-blue-500' };
                          case 'view': return { icon: Eye, color: 'text-green-500' };
                          case 'share': return { icon: Share2, color: 'text-purple-500' };
                          case 'upload': return { icon: Upload, color: 'text-primary' };
                          default: return { icon: FileText, color: 'text-muted-foreground' };
                        }
                      };
                      
                      const { icon: IconComponent, color } = getActivityIcon();
                      
                      return (
                        <div
                          key={index}
                          className="group flex items-center justify-between p-5 border rounded-xl hover:border-primary/30 hover:shadow-md transition-all duration-200 bg-card"
                        >
                          <div className="flex items-center space-x-4 flex-1 min-w-0">
                            <div className={`flex-shrink-0 p-3 rounded-lg bg-muted/50 ${color}`}>
                              <IconComponent className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate">{activity.fileName}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs px-2 py-0.5 capitalize">
                                  {activity.type}
                                </Badge>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatFileSize(activity.fileSize)}
                                </span>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(activity.timestamp)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg"
                              onClick={() => handleDownload(activity.fileId, activity.fileName)}
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg"
                              onClick={() => {
                                setSelectedFileForHistory({ fileId: activity.fileId, fileName: activity.fileName });
                                setShowHistoryModal(true);
                              }}
                              title="View History"
                            >
                              <History className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'analytics' && (
            <AnalyticsChart />
          )}
        </div>
      </div>

      {/* Modals */}
      {selectedFileForHistory && (
        <FileHistoryModal
          isOpen={showHistoryModal}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedFileForHistory(null);
          }}
          fileId={selectedFileForHistory.fileId}
          fileName={selectedFileForHistory.fileName}
        />
      )}

      {selectedFileForSecureLink && (
        <ShareModal
          isOpen={showSecureLinkModal}
          onClose={() => {
            setShowSecureLinkModal(false);
            setSelectedFileForSecureLink(null);
          }}
          fileId={selectedFileForSecureLink.fileId}
          fileName={selectedFileForSecureLink.fileName}
          onFileShared={fetchSharedFiles}
        />
      )}

      <FilePreviewModal
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setSelectedFileForPreview(null);
        }}
        file={selectedFileForPreview}
        onDownload={handleDownload}
        onShare={(fileId, fileName) => {
          setSelectedFileForSecureLink({ fileId, fileName });
          setShowSecureLinkModal(true);
        }}
        files={filteredFiles}
        currentIndex={previewFileIndex}
        onNavigate={handlePreviewNavigate}
      />

      <FileAnalyticsModal
        isOpen={showAnalyticsModal}
        onClose={() => {
          setShowAnalyticsModal(false);
          setSelectedFileForAnalytics(null);
        }}
        fileId={selectedFileForAnalytics}
      />
    </div>
  );
};

export default Dashboard;
