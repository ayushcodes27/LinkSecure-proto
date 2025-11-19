import { useState, useEffect } from "react";
import { apiUrl } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Download, FileText, HardDrive, Share2, Loader2, Activity, TrendingUp, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import AnimatedCounter from "./AnimatedCounter";
import { TimeRangeSelector, CustomDateRange } from "./TimeRangeSelector";
import { FileFilterSelector } from "./FileFilterSelector";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const AnalyticsChart = () => {
  const [timeRange, setTimeRange] = useState('30');
  const [fileFilter, setFileFilter] = useState('all');
  const [customDateRange, setCustomDateRange] = useState<CustomDateRange | null>(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadAnalytics();
  }, [timeRange, fileFilter, customDateRange]);

  const handleTimeRangeChange = (value: string, customRange?: CustomDateRange) => {
    setTimeRange(value);
    if (customRange) {
      setCustomDateRange(customRange);
    } else {
      setCustomDateRange(null);
    }
  };

  const handleFileFilterChange = (fileId: string) => {
    setFileFilter(fileId);
  };

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('timeRange', timeRange);
      
      if (fileFilter !== 'all') {
        params.append('fileId', fileFilter);
      }
      
      if (customDateRange) {
        params.append('startDate', customDateRange.from.toISOString());
        params.append('endDate', customDateRange.to.toISOString());
      }

      const response = await fetch(apiUrl(`/api/files/analytics/dashboard?${params.toString()}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to load analytics');
      const data = await response.json();
      setAnalytics(data.data);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to load analytics", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatFileType = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return 'Images';
    if (mimeType.startsWith('video/')) return 'Videos';
    if (mimeType.startsWith('audio/')) return 'Audio';
    if (mimeType.includes('pdf')) return 'PDFs';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'Documents';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'Spreadsheets';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'Presentations';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return 'Archives';
    return 'Other';
  };

  const formatDeviceName = (device: string) => {
    if (!device) return 'Unknown';
    const deviceLower = device.toLowerCase();
    if (deviceLower.includes('win') || deviceLower === 'win32') return 'Windows';
    if (deviceLower.includes('mac') || deviceLower === 'macos' || deviceLower === 'darwin') return 'macOS';
    if (deviceLower.includes('linux')) return 'Linux';
    if (deviceLower.includes('android')) return 'Android';
    if (deviceLower.includes('ios') || deviceLower.includes('iphone') || deviceLower.includes('ipad')) return 'iOS';
    return device.charAt(0).toUpperCase() + device.slice(1);
  };

  const formatBrowserName = (browser: string) => {
    if (!browser) return 'Unknown';
    const browserLower = browser.toLowerCase();
    if (browserLower.includes('chrome') || browserLower.includes('chromium')) return 'Chrome';
    if (browserLower.includes('firefox') || browserLower.includes('mozilla')) return 'Firefox';
    if (browserLower.includes('safari') && !browserLower.includes('chrome')) return 'Safari';
    if (browserLower.includes('edge') || browserLower.includes('edg/')) return 'Edge';
    if (browserLower.includes('opera') || browserLower.includes('opr')) return 'Opera';
    if (browserLower.includes('brave')) return 'Brave';
    return browser.charAt(0).toUpperCase() + browser.slice(1);
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!analytics) {
    return (
      <Card className="rounded-3xl border-0 shadow-lg">
        <CardContent className="py-16 text-center text-muted-foreground">
          No analytics data available
        </CardContent>
      </Card>
    );
  }

  const fileTypeData = (analytics.fileTypeBreakdown || []).map((item: any) => ({ 
    name: formatFileType(item._id), 
    value: item.count, 
    size: item.size 
  }));
  
  const uploadTrendData = (analytics.uploadTrend || []).map((item: any) => ({ 
    date: formatDate(item._id), 
    uploads: item.count, 
    size: item.size 
  }));

  const downloadTrendData = (analytics.downloadTrend || []).map((item: any) => ({ 
    date: formatDate(item._id), 
    downloads: item.count 
  }));

  return (
    <div className="space-y-8">
      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-gradient-to-r from-primary/5 to-accent/5 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">Analytics Dashboard</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Time:</span>
            <TimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">File:</span>
            <FileFilterSelector value={fileFilter} onChange={handleFileFilterChange} />
          </div>
        </div>
      </div>

      {/* Modern Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="rounded-3xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/20 rounded-2xl">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Files</p>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                <AnimatedCounter value={analytics.totalFiles || 0} />
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">In your storage</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/20 rounded-2xl">
                <HardDrive className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Storage Used</p>
              <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                {formatBytes(analytics.totalStorageUsed || 0)}
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400">Space consumed</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/20 rounded-2xl">
                <Download className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">Downloads</p>
              <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                <AnimatedCounter value={analytics.totalDownloads || 0} />
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">All time</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-500/20 rounded-2xl">
                <Share2 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Shares</p>
              <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                <AnimatedCounter value={analytics.totalShares || 0} />
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400">Files shared</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-950 dark:to-pink-900">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-pink-500/20 rounded-2xl">
                <Eye className="h-6 w-6 text-pink-600 dark:text-pink-400" />
              </div>
              <TrendingUp className="h-4 w-4 text-pink-600 dark:text-pink-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-pink-700 dark:text-pink-300">Total Views</p>
              <p className="text-3xl font-bold text-pink-900 dark:text-pink-100">
                <AnimatedCounter value={analytics.totalViews || 0} />
              </p>
              <p className="text-xs text-pink-600 dark:text-pink-400">File previews</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Trend - Spans 2 columns */}
        <Card className="lg:col-span-2 rounded-3xl border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Upload className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Upload Trend</CardTitle>
                  <CardDescription className="text-sm">Files uploaded over time</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {uploadTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={uploadTrendData}>
                  <defs>
                    <linearGradient id="colorUploads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="date" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Area type="monotone" dataKey="uploads" stroke="#8884d8" fillOpacity={1} fill="url(#colorUploads)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No upload data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Storage by File Type */}
        <Card className="rounded-3xl border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-xl">
                <HardDrive className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Storage Breakdown</CardTitle>
                <CardDescription className="text-sm">By file type</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {fileTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={fileTypeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={60}
                    paddingAngle={5}
                  >
                    {fileTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No file type data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Files & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Downloaded Files */}
        <Card className="rounded-3xl border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-xl">
                <Download className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Top Downloads</CardTitle>
                <CardDescription className="text-sm">Most popular files</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topDownloadedFiles && analytics.topDownloadedFiles.length > 0 ? (
                analytics.topDownloadedFiles.slice(0, 5).map((file: any, index: number) => (
                  <div key={file.fileId} className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-muted/30 to-muted/10 hover:from-muted/50 hover:to-muted/20 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-green-500/20 rounded-xl text-sm font-bold text-green-700">
                        #{index + 1}
                      </div>
                      <div className="max-w-[200px]">
                        <div className="font-medium text-sm truncate">{file.originalName}</div>
                        <div className="text-xs text-muted-foreground">{formatBytes(file.fileSize)}</div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="rounded-full px-3">
                      {file.downloadCount} <Download className="h-3 w-3 ml-1 inline" />
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">No download data</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="rounded-3xl border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-xl">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <CardDescription className="text-sm">Latest file actions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {analytics.recentActivity && analytics.recentActivity.length > 0 ? (
                analytics.recentActivity.slice(0, 5).map((activity: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-muted/20 to-muted/5 hover:from-muted/40 hover:to-muted/10 transition-all">
                    <div className="flex items-center gap-3">
                      {activity.accessType === 'download' && (
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                          <Download className="h-4 w-4 text-blue-600" />
                        </div>
                      )}
                      {activity.accessType === 'view' && (
                        <div className="p-2 bg-green-500/20 rounded-lg">
                          <Eye className="h-4 w-4 text-green-600" />
                        </div>
                      )}
                      {activity.accessType === 'share' && (
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                          <Share2 className="h-4 w-4 text-purple-600" />
                        </div>
                      )}
                      <div className="max-w-[180px]">
                        <div className="font-medium text-sm truncate">{activity.originalName}</div>
                        <div className="text-xs text-muted-foreground">{formatDateTime(activity.accessedAt)}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="rounded-full capitalize text-xs">
                      {activity.accessType}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">No recent activity</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Download Trend Chart */}
      <Card className="rounded-3xl border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-xl">
              <Download className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Download Trend</CardTitle>
              <CardDescription className="text-sm">Download activity over time</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {downloadTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={downloadTrendData}>
                <defs>
                  <linearGradient id="colorDownloads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="date" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="downloads" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No download data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
