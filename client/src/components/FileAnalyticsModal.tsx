import { useState, useEffect } from "react";
import { apiUrl } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Eye,
  Download,
  Share2,
  Users,
  TrendingUp,
  Monitor,
  Globe,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

interface FileAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string | null;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const FileAnalyticsModal = ({ isOpen, onClose, fileId }: FileAnalyticsModalProps) => {
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && fileId) {
      loadAnalytics();
    }
  }, [isOpen, fileId]);

  const loadAnalytics = async () => {
    if (!fileId) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`apiUrl('/api/files/${fileId}/analytics`, {
        headers: {
          ')'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load analytics');
      }

      const data = await response.json();
      setAnalytics(data.data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load analytics",
        variant: "destructive"
      });
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            File Analytics
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : analytics ? (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Total Views
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalViews}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Total Downloads
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalDownloads}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Share2 className="h-4 w-4" />
                    Total Shares
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalShares}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Unique Viewers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.uniqueViewers}</div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="timeline" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="devices">Devices</TabsTrigger>
                <TabsTrigger value="browsers">Browsers</TabsTrigger>
                <TabsTrigger value="viewers">Viewers</TabsTrigger>
              </TabsList>

              {/* Timeline Tab */}
              <TabsContent value="timeline" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Access Timeline (Last 30 Days)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics.accessTimeline && analytics.accessTimeline.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={analytics.accessTimeline}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="views" stroke="#8884d8" name="Views" />
                          <Line type="monotone" dataKey="downloads" stroke="#82ca9d" name="Downloads" />
                          <Line type="monotone" dataKey="shares" stroke="#ffc658" name="Shares" />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No access data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Devices Tab */}
              <TabsContent value="devices" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Monitor className="h-5 w-5" />
                      Access by Device
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics.deviceBreakdown && analytics.deviceBreakdown.length > 0 ? (
                      <div className="grid md:grid-cols-2 gap-4">
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={analytics.deviceBreakdown}
                              dataKey="count"
                              nameKey="device"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label
                            >
                              {analytics.deviceBreakdown.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>

                        <div className="space-y-2">
                          {analytics.deviceBreakdown.map((item: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-2 rounded border">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                />
                                <span className="font-medium">{item.device}</span>
                              </div>
                              <Badge variant="secondary">{item.count} accesses</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No device data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Browsers Tab */}
              <TabsContent value="browsers" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Access by Browser
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics.browserBreakdown && analytics.browserBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analytics.browserBreakdown}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="browser" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" fill="#8884d8" name="Accesses" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No browser data available
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Location Breakdown */}
                {analytics.locationBreakdown && analytics.locationBreakdown.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Access by Location</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {analytics.locationBreakdown.map((item: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-2 rounded border">
                            <span className="font-medium">{item.location}</span>
                            <Badge variant="secondary">{item.count} accesses</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Viewers Tab */}
              <TabsContent value="viewers" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Viewers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics.recentViewers && analytics.recentViewers.length > 0 ? (
                      <div className="space-y-2">
                        {analytics.recentViewers.map((viewer: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 rounded border">
                            <div className="space-y-1">
                              <div className="font-medium">{viewer.userName || 'Anonymous'}</div>
                              <div className="text-sm text-muted-foreground">{viewer.userEmail}</div>
                              <div className="flex gap-2 text-xs text-muted-foreground">
                                <span>{viewer.device}</span>
                                <span>•</span>
                                <span>{viewer.browser}</span>
                              </div>
                            </div>
                            <div className="text-right space-y-1">
                              <Badge variant={viewer.accessType === 'download' ? 'default' : 'secondary'}>
                                {viewer.accessType}
                              </Badge>
                              <div className="text-xs text-muted-foreground">
                                {new Date(viewer.accessedAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No viewer data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No analytics data available
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
