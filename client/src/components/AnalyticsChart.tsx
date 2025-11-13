import { useState, useEffect } from "react";
import { apiUrl } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Eye, Download, FileText, HardDrive, Share2, Loader2, Activity, Monitor, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import AnimatedCounter from "./AnimatedCounter";
import { AnalyticsFilterBar } from "./AnalyticsFilterBar";
import { CustomDateRange } from "./TimeRangeSelector";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff6b9d'];

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
      
      // Build query parameters
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
      console.log('Analytics data received:', data.data);
      setAnalytics(data.data);
    } catch (error: any) {
      console.error('Analytics error:', error);
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
    console.log('Analytics loading...');
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  if (!analytics) {
    console.log('No analytics data received');
    return <Card className="bg-gradient-card border-0 shadow-soft"><CardContent className="py-12 text-center text-muted-foreground">No analytics data available</CardContent></Card>;
  }

  console.log('Analytics data loaded successfully:', {
    totalFiles: analytics.totalFiles,
    hasFileTypeBreakdown: !!analytics.fileTypeBreakdown?.length,
    hasUploadTrend: !!analytics.uploadTrend?.length
  });

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
  
  const storageData = (analytics.storageUsageOverTime || []).map((item: any) => ({ 
    date: formatDate(item._id), 
    storage: item.cumulativeSize 
  }));

  return (
    <div className="space-y-6">
      {/* Global Filter Bar */}
      <AnalyticsFilterBar
        timeRange={timeRange}
        onTimeRangeChange={handleTimeRangeChange}
        fileFilter={fileFilter}
        onFileFilterChange={handleFileFilterChange}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Files</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <AnimatedCounter value={analytics.totalFiles} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Files in your storage</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(analytics.totalStorageUsed)}</div>
            <p className="text-xs text-muted-foreground mt-1">Space used</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Downloads</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <AnimatedCounter value={analytics.totalDownloads} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">All time downloads</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shares</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <AnimatedCounter value={analytics.totalShares} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Files shared</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="top-files">Top Files</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-gradient-card border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Storage by File Type</CardTitle>
                <CardDescription>Distribution of files in your storage</CardDescription>
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
                        label={(entry) => `${entry.name}: ${entry.value}`}
                      >
                        {fileTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No file type data
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-0 shadow-soft">
              <CardHeader>
                <CardTitle>Upload Trend</CardTitle>
                <CardDescription>Files uploaded over time</CardDescription>
              </CardHeader>
              <CardContent>
                {uploadTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={uploadTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="uploads" stroke="#8884d8" name="Uploads" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No upload data
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardHeader>
              <CardTitle>Storage Usage Over Time</CardTitle>
              <CardDescription>Cumulative storage growth</CardDescription>
            </CardHeader>
            <CardContent>
              {storageData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={storageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => formatBytes(value)} />
                    <Tooltip formatter={(value: any) => formatBytes(value)} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="storage"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                      name="Storage Used"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No storage data
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardHeader>
              <CardTitle>Download Trend</CardTitle>
              <CardDescription>File downloads over time</CardDescription>
            </CardHeader>
            <CardContent>
              {downloadTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={downloadTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="downloads" stroke="#82ca9d" name="Downloads" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No download data
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardHeader>
              <CardTitle>Uploads vs Downloads</CardTitle>
              <CardDescription>Activity comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={uploadTrendData.map((item, index) => ({
                    ...item,
                    downloads: downloadTrendData[index]?.downloads || 0
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="uploads" fill="#8884d8" name="Uploads" />
                  <Bar dataKey="downloads" fill="#82ca9d" name="Downloads" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="top-files" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-gradient-card border-0 shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Most Downloaded Files
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.topDownloadedFiles && analytics.topDownloadedFiles.length > 0 ? (
                    analytics.topDownloadedFiles.map((file: any, index: number) => (
                      <div key={file.fileId} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium text-sm truncate max-w-[200px]">
                              {file.originalName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatBytes(file.fileSize)}
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary">{file.downloadCount} downloads</Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No download data
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-0 shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  Most Shared Files
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.topSharedFiles && analytics.topSharedFiles.length > 0 ? (
                    analytics.topSharedFiles.map((file: any, index: number) => (
                      <div key={file.fileId} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-accent/10 rounded text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium text-sm truncate max-w-[200px]">
                              {file.originalName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatBytes(file.fileSize)}
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary">{file.shareCount} shares</Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No share data
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="devices" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-gradient-card border-0 shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Access by Device
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.accessByDevice && analytics.accessByDevice.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.accessByDevice}
                        dataKey="count"
                        nameKey="_id"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {analytics.accessByDevice.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No device data
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-0 shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Access by Browser
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.accessByBrowser && analytics.accessByBrowser.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.accessByBrowser}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="_id" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#8884d8" name="Accesses" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No browser data
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recent" className="space-y-6">
          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Last 20 file actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics.recentActivity && analytics.recentActivity.length > 0 ? (
                  analytics.recentActivity.map((activity: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        {activity.accessType === 'download' && <Download className="h-4 w-4 text-blue-500" />}
                        {activity.accessType === 'view' && <Eye className="h-4 w-4 text-green-500" />}
                        {activity.accessType === 'share' && <Share2 className="h-4 w-4 text-purple-500" />}
                        <div>
                          <div className="font-medium text-sm">{activity.originalName}</div>
                          <div className="text-xs text-muted-foreground flex gap-2">
                            <span>{activity.device || 'Unknown device'}</span>
                            <span>•</span>
                            <span>{activity.browser || 'Unknown browser'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={
                          activity.accessType === 'download' ? 'default' :
                          activity.accessType === 'view' ? 'secondary' : 'outline'
                        }>
                          {activity.accessType}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDateTime(activity.accessedAt)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No recent activity
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
