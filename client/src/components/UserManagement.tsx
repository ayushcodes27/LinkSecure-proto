import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  UserPlus,
  Shield,
  Settings,
  MoreVertical,
  Mail,
  Calendar,
  Eye,
  Bell,
  Edit,
  Trash2,
  Crown,
  User,
  Lock,
  FileText,
  CheckCircle,
  XCircle,
  Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TeamMember {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  accessLevel: 'admin' | 'edit' | 'view';
  grantedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  grantedAt: string;
  lastAccessedAt?: string;
  accessHistory: Array<{
    accessedAt: string;
    accessType: 'view' | 'download' | 'share';
  }>;
}

interface AccessRequest {
  requestId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface OutgoingRequest {
  requestId: string;
  fileId: string;
  requestedRole: 'view' | 'edit' | 'admin';
  status: 'pending' | 'approved' | 'denied';
  message?: string;
  actionedBy?: string;
  actionedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface FileTeamData {
  fileId: string;
  fileName: string;
  members: TeamMember[];
  totalMembers: number;
  requests: AccessRequest[];
}

export const UserManagement = ({ fileId }: { fileId?: string }) => {
  const [teamData, setTeamData] = useState<FileTeamData | null>(null);
  const [outgoingRequests, setOutgoingRequests] = useState<OutgoingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);
  const [isRequestAccessOpen, setIsRequestAccessOpen] = useState(false);
  const [isMyRequestsOpen, setIsMyRequestsOpen] = useState(false);
  const [newUser, setNewUser] = useState<{
    email: string;
    accessLevel: 'admin' | 'edit' | 'view';
  }>({
    email: "",
    accessLevel: "view",
  });
  const [newRequest, setNewRequest] = useState<{
    fileId: string;
    requestedRole: 'admin' | 'edit' | 'view';
    message: string;
  }>({
    fileId: "",
    requestedRole: "view",
    message: "",
  });
  const [selectedFileId, setSelectedFileId] = useState<string>(fileId || "");

  const { toast } = useToast();

  // Fetch team members for a file
  const fetchTeamMembers = async (fileId: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/team/members?fileId=${fileId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTeamData(data.data);
      } else {
        throw new Error('Failed to fetch team members');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load team members.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's outgoing access requests
  const fetchOutgoingRequests = async () => {
    try {
      setRequestsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/team/my-requests', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOutgoingRequests(data.data || []);
      } else {
        throw new Error('Failed to fetch outgoing requests');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load your access requests.",
        variant: "destructive",
      });
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedFileId) {
      fetchTeamMembers(selectedFileId);
    }
    fetchOutgoingRequests();
  }, [selectedFileId]);

  const getAccessLevelIcon = (accessLevel: string) => {
    switch (accessLevel) {
      case 'admin':
        return <Crown className="h-4 w-4 text-warning" />;
      case 'edit':
        return <Edit className="h-4 w-4 text-primary" />;
      case 'view':
        return <Eye className="h-4 w-4 text-muted-foreground" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getAccessLevelBadgeVariant = (accessLevel: string) => {
    switch (accessLevel) {
      case 'admin':
        return "default";
      case 'edit':
        return "secondary";
      case 'view':
        return "outline";
      default:
        return "secondary";
    }
  };

  const handleAddUser = async () => {
    if (!newUser.email || !selectedFileId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/team/add-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: newUser.email,
          accessLevel: newUser.accessLevel,
          fileId: selectedFileId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "User added",
          description: `Access granted to ${data.data.email}`,
        });
        setNewUser({ email: "", accessLevel: "view" });
        setIsAddUserOpen(false);
        // Refresh team members
        fetchTeamMembers(selectedFileId);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add user');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add user.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!selectedFileId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/team/remove-access?fileId=${selectedFileId}&userId=${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast({
          title: "Access removed",
          description: "User access has been removed from this file.",
        });
        // Refresh team members
        fetchTeamMembers(selectedFileId);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove access');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove user access.",
        variant: "destructive",
      });
    }
  };

  const handleManageRequest = async (requestId: string, action: 'approve' | 'deny', accessLevel?: 'view' | 'edit' | 'admin') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/team/manage-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId,
          action,
          accessLevel,
        }),
      });

      if (response.ok) {
        toast({
          title: `Request ${action === 'approve' ? 'Approved' : 'Denied'}`,
          description: `The access request has been successfully ${action === 'approve' ? 'approved' : 'denied'}.`,
        });
        // Refresh team members and requests
        if (selectedFileId) {
          fetchTeamMembers(selectedFileId);
        }
        // Close the modal if all requests are handled
        if (teamData?.requests.length === 1) {
          setIsRequestsOpen(false);
        }
      } else {
        const error = await response.json();
        throw new Error(error.message || `Failed to ${action} request`);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive",
      });
    }
  };

  const handleRequestAccess = async () => {
    if (!newRequest.fileId || !newRequest.requestedRole) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/team/request-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          fileId: newRequest.fileId,
          requestedRole: newRequest.requestedRole,
          message: newRequest.message,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Request submitted",
          description: `Access request for file ${data.data.fileId} has been submitted.`,
        });
        setNewRequest({ fileId: "", requestedRole: "view", message: "" });
        setIsRequestAccessOpen(false);
        // Refresh outgoing requests
        fetchOutgoingRequests();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit access request');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit access request.",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Note: Do not early-return on loading so header actions remain visible

  return (
    <div className="space-y-6">
      {/* File Selection */}
      {!fileId && (
        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardHeader>
            <CardTitle>Select File</CardTitle>
            <CardDescription>Choose a file to manage team access</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="fileId">File ID</Label>
              <Input
                id="fileId"
                placeholder="Enter file ID"
                value={selectedFileId}
                onChange={(e) => setSelectedFileId(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Stats */}
      {teamData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamData.totalMembers}</div>
              <p className="text-xs text-muted-foreground">For {teamData.fileName}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admins</CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {teamData.members.filter(m => m.accessLevel === 'admin').length}
              </div>
              <p className="text-xs text-muted-foreground">Full access</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Editors</CardTitle>
              <Edit className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {teamData.members.filter(m => m.accessLevel === 'edit').length}
              </div>
              <p className="text-xs text-muted-foreground">Can edit</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Viewers</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {teamData.members.filter(m => m.accessLevel === 'view').length}
              </div>
              <p className="text-xs text-muted-foreground">Read only</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* My Requests */}
      <Card className="bg-gradient-card border-0 shadow-soft">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-primary" />
                <span>My Requests</span>
              </CardTitle>
              <CardDescription>
                View your outgoing access requests and their status
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Dialog open={isRequestAccessOpen} onOpenChange={setIsRequestAccessOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="hover:shadow-glow transition-all duration-300">
                    <Plus className="h-4 w-4 mr-2" />
                    Request Access
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Request Access to File</DialogTitle>
                    <DialogDescription>
                      Request access to a file by providing the file ID and desired role
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="requestFileId">File ID</Label>
                      <Input
                        id="requestFileId"
                        placeholder="Enter file ID"
                        value={newRequest.fileId}
                        onChange={(e) => setNewRequest(prev => ({ ...prev, fileId: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="requestedRole">Requested Role</Label>
                      <Select
                        value={newRequest.requestedRole}
                        onValueChange={(value: 'admin' | 'edit' | 'view') =>
                          setNewRequest(prev => ({ ...prev, requestedRole: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="view">
                            <div className="flex items-center space-x-2">
                              <Eye className="h-4 w-4" />
                              <span>View - Can view the file only</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="edit">
                            <div className="flex items-center space-x-2">
                              <Edit className="h-4 w-4" />
                              <span>Edit - Can view and edit the file</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="admin">
                            <div className="flex items-center space-x-2">
                              <Crown className="h-4 w-4" />
                              <span>Admin - Full control including permissions</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="requestMessage">Message (Optional)</Label>
                      <Input
                        id="requestMessage"
                        placeholder="Add a message to your request"
                        value={newRequest.message}
                        onChange={(e) => setNewRequest(prev => ({ ...prev, message: e.target.value }))}
                      />
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button variant="outline" onClick={() => setIsRequestAccessOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleRequestAccess} className="bg-gradient-primary">
                        Submit Request
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={isMyRequestsOpen} onOpenChange={setIsMyRequestsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="relative">
                    <Mail className="h-4 w-4 mr-2" />
                    View Requests
                    {outgoingRequests.filter(r => r.status === 'pending').length > 0 && (
                      <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 justify-center p-0">
                        {outgoingRequests.filter(r => r.status === 'pending').length}
                      </Badge>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>My Access Requests</DialogTitle>
                    <DialogDescription>
                      View the status of your outgoing access requests
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
                    {requestsLoading ? (
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                            <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
                            <div className="space-y-2 flex-1">
                              <div className="h-4 bg-muted rounded animate-pulse w-1/4" />
                              <div className="h-3 bg-muted rounded animate-pulse w-1/3" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : outgoingRequests.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No requests found</p>
                        <p className="text-sm">You haven't submitted any access requests yet</p>
                      </div>
                    ) : (
                      outgoingRequests.map(request => (
                        <div key={request.requestId} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              {getAccessLevelIcon(request.requestedRole)}
                              <div>
                                <p className="font-medium">File: {request.fileId}</p>
                                <p className="text-sm text-muted-foreground">
                                  Requested: {request.requestedRole} • {new Date(request.createdAt).toLocaleDateString()}
                                </p>
                                {request.message && (
                                  <p className="text-xs text-muted-foreground mt-1">"{request.message}"</p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant={
                                request.status === 'approved' ? 'default' :
                                request.status === 'denied' ? 'destructive' : 'secondary'
                              }
                            >
                              {request.status}
                            </Badge>
                            {request.actionedAt && (
                              <span className="text-xs text-muted-foreground">
                                {new Date(request.actionedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Team Management */}
      {(selectedFileId || teamData) && (
        <Card className="bg-gradient-card border-0 shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span>Team Members</span>
                </CardTitle>
                <CardDescription>
                  {teamData ? (
                    <>Manage access permissions for {teamData.fileName}</>
                  ) : (
                    <>Manage access permissions for the selected file</>
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-primary hover:shadow-glow transition-all duration-300" disabled={!selectedFileId}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add User
                    </Button>
                  </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Team Member</DialogTitle>
                    <DialogDescription>
                      Grant access to this file by entering their email address
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter email address"
                        value={newUser.email}
                        onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accessLevel">Access Level</Label>
                      <Select
                        value={newUser.accessLevel}
                        onValueChange={(value: 'admin' | 'edit' | 'view') =>
                          setNewUser(prev => ({ ...prev, accessLevel: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="view">
                            <div className="flex items-center space-x-2">
                              <Eye className="h-4 w-4" />
                              <span>View - Can view the file only</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="edit">
                            <div className="flex items-center space-x-2">
                              <Edit className="h-4 w-4" />
                              <span>Edit - Can view and edit the file</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="admin">
                            <div className="flex items-center space-x-2">
                              <Crown className="h-4 w-4" />
                              <span>Admin - Full control including permissions</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddUser} className="bg-gradient-primary">
                        Grant Access
                      </Button>
                    </div>
                  </div>
                </DialogContent>
                </Dialog>
                <Dialog open={isRequestsOpen} onOpenChange={setIsRequestsOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="relative" disabled={!selectedFileId}>
                      <Bell className="h-4 w-4 mr-2" />
                      Requests
                      {teamData && teamData.requests && teamData.requests.length > 0 && (
                        <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 justify-center p-0">{teamData.requests.length}</Badge>
                      )}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Access Requests</DialogTitle>
                      <DialogDescription>
                        Approve or deny requests to access this file.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {!teamData || !teamData.requests || teamData.requests.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="text-sm">No access requests found</p>
                        </div>
                      ) : (
                        teamData.requests.map(request => (
                          <div key={request.requestId} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{request.firstName} {request.lastName}</p>
                              <p className="text-sm text-muted-foreground">{request.email}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => handleManageRequest(request.requestId, 'deny')}>
                                <XCircle className="h-4 w-4 mr-1" />
                                Deny
                              </Button>
                              <Select onValueChange={(value: 'view' | 'edit' | 'admin') => handleManageRequest(request.requestId, 'approve', value)}>
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue placeholder="Approve..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="view">
                                    <div className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-green-500" /> View</div>
                                  </SelectItem>
                                  <SelectItem value="edit">
                                    <div className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Edit</div>
                                  </SelectItem>
                                  <SelectItem value="admin">
                                    <div className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-green-500" /> Admin</div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!teamData || loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-muted rounded animate-pulse w-1/4" />
                      <div className="h-3 bg-muted rounded animate-pulse w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {teamData.members.map((member) => (
                  <div key={member.userId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-gradient-primary text-white">
                          {getInitials(`${member.firstName} ${member.lastName}`)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">{member.firstName} {member.lastName}</p>
                          {getAccessLevelIcon(member.accessLevel)}
                        </div>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                        {member.grantedBy && (
                          <p className="text-xs text-muted-foreground">
                            Granted by {member.grantedBy.firstName} {member.grantedBy.lastName}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right hidden md:block">
                        <p className="text-sm">
                          <Calendar className="inline h-3 w-3 mr-1" />
                          Granted {new Date(member.grantedAt).toLocaleDateString()}
                        </p>
                        {member.lastAccessedAt && (
                          <p className="text-xs text-muted-foreground">
                            Last access: {new Date(member.lastAccessedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <Badge variant={getAccessLevelBadgeVariant(member.accessLevel)}>
                          {member.accessLevel}
                        </Badge>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                        {/* Don't allow removing the file owner */}
                        {member.accessLevel !== 'admin' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveUser(member.userId)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Access Level Overview */}
      <Card className="bg-gradient-card border-0 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lock className="h-5 w-5 text-accent" />
            <span>Access Level Permissions</span>
          </CardTitle>
          <CardDescription>
            Overview of what each access level can do with shared files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Crown className="h-5 w-5 text-warning" />
                <h4 className="font-semibold">Admin</h4>
              </div>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Full file access</li>
                <li>• Manage team permissions</li>
                <li>• Add/remove team members</li>
                <li>• View access history</li>
                <li>• Delete the file</li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Edit className="h-5 w-5 text-primary" />
                <h4 className="font-semibold">Edit</h4>
              </div>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• View and download files</li>
                <li>• Update file metadata</li>
                <li>• Share with others</li>
                <li>• View access history</li>
                <li>• Create secure links</li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-muted-foreground" />
                <h4 className="font-semibold">View</h4>
              </div>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• View shared files</li>
                <li>• Download permitted files</li>
                <li>• Access via secure links</li>
                <li>• View file details</li>
                <li>• Basic access tracking</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};