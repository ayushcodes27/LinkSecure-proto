import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  User, Shield, Bell, HardDrive, Lock, Palette, 
  ArrowLeft, Save, Trash2, Eye, EyeOff, AlertCircle 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UserSettings {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    profileImage?: string;
    emailVerified: boolean;
    twoFactorEnabled: boolean;
    createdAt: string;
  };
  notificationPreferences: {
    emailNotifications: boolean;
    fileShared: boolean;
    fileDownloaded: boolean;
    accessRequestReceived: boolean;
    accessRequestApproved: boolean;
    comments: boolean;
    digestFrequency: 'daily' | 'weekly' | 'never';
  };
  privacySettings: {
    defaultFilePrivacy: 'public' | 'private';
    profileVisibility: 'public' | 'private';
    activityVisibility: 'public' | 'private';
  };
  appearanceSettings: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    timezone: string;
    dateFormat: string;
  };
  storage: {
    used: number;
    limit: number;
    percentage: string;
  };
}

const Settings = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = localStorage.getItem('token');

  const [activeTab, setActiveTab] = useState(searchParams.get('section') || 'account');
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Account settings state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Notification preferences state
  const [notificationPrefs, setNotificationPrefs] = useState<UserSettings['notificationPreferences']>({
    emailNotifications: true,
    fileShared: true,
    fileDownloaded: true,
    accessRequestReceived: true,
    accessRequestApproved: true,
    comments: true,
    digestFrequency: 'daily'
  });

  // Privacy settings state
  const [privacySettings, setPrivacySettings] = useState<UserSettings['privacySettings']>({
    defaultFilePrivacy: 'private',
    profileVisibility: 'public',
    activityVisibility: 'public'
  });

  // Appearance settings state
  const [appearanceSettings, setAppearanceSettings] = useState<UserSettings['appearanceSettings']>({
    theme: 'system',
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY'
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      setFirstName(settings.user.firstName);
      setLastName(settings.user.lastName);
      setNotificationPrefs(settings.notificationPreferences);
      setPrivacySettings(settings.privacySettings);
      setAppearanceSettings(settings.appearanceSettings);
    }
  }, [settings]);

  const fetchSettings = async () => {
    if (!token) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/user/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        setSettings(result.data);
      } else {
        throw new Error('Failed to fetch settings');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const response = await fetch('http://localhost:5000/api/user/settings/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ firstName, lastName })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Profile updated successfully'
        });
        fetchSettings();
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!token) return;
    
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive'
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('http://localhost:5000/api/user/settings/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Password changed successfully'
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to change password');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to change password',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const updateNotifications = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const response = await fetch('http://localhost:5000/api/user/settings/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ notificationPreferences: notificationPrefs })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Notification preferences updated'
        });
      } else {
        throw new Error('Failed to update notifications');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update notification preferences',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const updatePrivacy = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const response = await fetch('http://localhost:5000/api/user/settings/privacy', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ privacySettings })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Privacy settings updated'
        });
      } else {
        throw new Error('Failed to update privacy settings');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update privacy settings',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const updateAppearance = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const response = await fetch('http://localhost:5000/api/user/settings/appearance', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ appearanceSettings })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Appearance settings updated'
        });
        
        // Apply theme change
        if (appearanceSettings.theme !== 'system') {
          document.documentElement.classList.toggle('dark', appearanceSettings.theme === 'dark');
        }
      } else {
        throw new Error('Failed to update appearance settings');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update appearance settings',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const clearTrash = async () => {
    if (!token) return;
    if (!confirm('Are you sure you want to permanently delete all files in trash?')) return;

    setSaving(true);
    try {
      const response = await fetch('http://localhost:5000/api/user/storage/clear-trash', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: 'Success',
          description: result.message
        });
        fetchSettings();
      } else {
        throw new Error('Failed to clear trash');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to clear trash',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const response = await fetch('http://localhost:5000/api/user/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ password: deletePassword })
      });

      if (response.ok) {
        localStorage.removeItem('token');
        navigate('/login');
        toast({
          title: 'Account Deleted',
          description: 'Your account has been permanently deleted'
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete account');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete account',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
      setShowDeleteDialog(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <h1 className="text-xl font-semibold">Settings</h1>
          <div className="w-32"></div> {/* Spacer for centering */}
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-6 w-full max-w-3xl mx-auto">
            <TabsTrigger value="account" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center space-x-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="storage" className="flex items-center space-x-2">
              <HardDrive className="h-4 w-4" />
              <span className="hidden sm:inline">Storage</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center space-x-2">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Privacy</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center space-x-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Appearance</span>
            </TabsTrigger>
          </TabsList>

          {/* Account Settings */}
          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Profile Image Upload */}
                <div className="space-y-2">
                  <Label>Profile Image</Label>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      {settings?.user.profileImage ? (
                        <img
                          src={`http://localhost:5000${settings.user.profileImage}`}
                          alt="Profile"
                          className="h-20 w-20 rounded-full object-cover border-2 border-primary"
                        />
                      ) : (
                        <div className="h-20 w-20 rounded-full bg-gradient-primary flex items-center justify-center text-white text-2xl font-bold">
                          {firstName?.[0]}{lastName?.[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col space-y-2">
                      <input
                        type="file"
                        id="profileImageInput"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          const formData = new FormData();
                          formData.append('profileImage', file);

                          setSaving(true);
                          try {
                            const response = await fetch('http://localhost:5000/api/user/settings/profile-image', {
                              method: 'POST',
                              headers: { Authorization: `Bearer ${token}` },
                              body: formData
                            });

                            if (response.ok) {
                              const result = await response.json();
                              toast({
                                title: 'Success',
                                description: 'Profile image updated successfully'
                              });
                              
                              // Update localStorage user data
                              const user = JSON.parse(localStorage.getItem('user') || '{}');
                              user.profileImage = result.data.profileImage;
                              localStorage.setItem('user', JSON.stringify(user));
                              
                              // Trigger storage event for other tabs/windows
                              window.dispatchEvent(new Event('storage'));
                              
                              // Refresh settings to show new image
                              fetchSettings();
                            } else {
                              throw new Error('Failed to upload image');
                            }
                          } catch (error) {
                            toast({
                              title: 'Error',
                              description: 'Failed to upload profile image',
                              variant: 'destructive'
                            });
                          } finally {
                            setSaving(false);
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('profileImageInput')?.click()}
                        disabled={saving}
                      >
                        Upload New Image
                      </Button>
                      {settings?.user.profileImage && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (!confirm('Remove profile image?')) return;
                            setSaving(true);
                            try {
                              const response = await fetch('http://localhost:5000/api/user/settings/profile-image', {
                                method: 'DELETE',
                                headers: { Authorization: `Bearer ${token}` }
                              });

                              if (response.ok) {
                                toast({
                                  title: 'Success',
                                  description: 'Profile image removed'
                                });
                                
                                // Update localStorage
                                const user = JSON.parse(localStorage.getItem('user') || '{}');
                                delete user.profileImage;
                                localStorage.setItem('user', JSON.stringify(user));
                                
                                // Trigger storage event for other tabs/windows
                                window.dispatchEvent(new Event('storage'));
                                
                                // Refresh settings to show updated profile
                                fetchSettings();
                              } else {
                                throw new Error('Failed to remove image');
                              }
                            } catch (error) {
                              toast({
                                title: 'Error',
                                description: 'Failed to remove profile image',
                                variant: 'destructive'
                              });
                            } finally {
                              setSaving(false);
                            }
                          }}
                          disabled={saving}
                        >
                          Remove Image
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Recommended: Square image, at least 200x200px (Max 5MB)
                  </p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={settings?.user.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>
                <Button onClick={updateProfile} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button onClick={changePassword} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Changing...' : 'Change Password'}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Delete Account</CardTitle>
                <CardDescription>
                  Permanently delete your account and all associated data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This action cannot be undone. All your files and data will be permanently deleted.
                  </AlertDescription>
                </Alert>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">2FA Status</p>
                    <p className="text-sm text-muted-foreground">
                      {settings?.user.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => navigate('/dashboard')}>
                    {settings?.user.twoFactorEnabled ? 'Manage' : 'Enable'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email Verification</CardTitle>
                <CardDescription>Verify your email address</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Status</p>
                    <p className="text-sm text-muted-foreground">
                      {settings?.user.emailVerified ? 'Verified ✓' : 'Not verified'}
                    </p>
                  </div>
                  {!settings?.user.emailVerified && (
                    <Button variant="outline">Verify Email</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Notifications</CardTitle>
                <CardDescription>
                  Choose what notifications you want to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="emailNotifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    id="emailNotifications"
                    checked={notificationPrefs.emailNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationPrefs({ ...notificationPrefs, emailNotifications: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Notification Types</h4>
                  
                  {[
                    { key: 'fileShared', label: 'File Shared', description: 'When someone shares a file with you' },
                    { key: 'fileDownloaded', label: 'File Downloaded', description: 'When someone downloads your file' },
                    { key: 'accessRequestReceived', label: 'Access Request', description: 'When someone requests access' },
                    { key: 'accessRequestApproved', label: 'Access Approved', description: 'When your request is approved' },
                    { key: 'comments', label: 'Comments', description: 'When someone comments on your file' }
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between">
                      <div>
                        <Label>{item.label}</Label>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      <Switch
                        checked={notificationPrefs[item.key as keyof typeof notificationPrefs] as boolean}
                        onCheckedChange={(checked) =>
                          setNotificationPrefs({ ...notificationPrefs, [item.key]: checked })
                        }
                        disabled={!notificationPrefs.emailNotifications}
                      />
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="digestFrequency">Email Digest Frequency</Label>
                  <Select
                    value={notificationPrefs.digestFrequency}
                    onValueChange={(value: any) =>
                      setNotificationPrefs({ ...notificationPrefs, digestFrequency: value })
                    }
                    disabled={!notificationPrefs.emailNotifications}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={updateNotifications} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Preferences'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Storage Settings */}
          <TabsContent value="storage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Storage Usage</CardTitle>
                <CardDescription>Manage your storage space</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Used: {formatBytes(settings?.storage.used || 0)}</span>
                    <span>Limit: {formatBytes(settings?.storage.limit || 0)}</span>
                  </div>
                  <Progress value={parseFloat(settings?.storage.percentage || '0')} />
                  <p className="text-xs text-muted-foreground text-center">
                    {settings?.storage.percentage}% used
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Clear Trash</p>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete all files in trash
                      </p>
                    </div>
                    <Button variant="outline" onClick={clearTrash} disabled={saving}>
                      Clear Trash
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Export All Files</p>
                      <p className="text-sm text-muted-foreground">
                        Download all your files as a ZIP
                      </p>
                    </div>
                    <Button variant="outline" disabled>
                      Export (Coming Soon)
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Settings */}
          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Preferences</CardTitle>
                <CardDescription>Control your privacy settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultFilePrivacy">Default File Privacy</Label>
                  <Select
                    value={privacySettings.defaultFilePrivacy}
                    onValueChange={(value: any) =>
                      setPrivacySettings({ ...privacySettings, defaultFilePrivacy: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Default privacy setting for new files
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profileVisibility">Profile Visibility</Label>
                  <Select
                    value={privacySettings.profileVisibility}
                    onValueChange={(value: any) =>
                      setPrivacySettings({ ...privacySettings, profileVisibility: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="activityVisibility">Activity Visibility</Label>
                  <Select
                    value={privacySettings.activityVisibility}
                    onValueChange={(value: any) =>
                      setPrivacySettings({ ...privacySettings, activityVisibility: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={updatePrivacy} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize how LinkSecure looks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select
                    value={appearanceSettings.theme}
                    onValueChange={(value: any) =>
                      setAppearanceSettings({ ...appearanceSettings, theme: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={appearanceSettings.language}
                    onValueChange={(value) =>
                      setAppearanceSettings({ ...appearanceSettings, language: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={appearanceSettings.timezone}
                    onValueChange={(value) =>
                      setAppearanceSettings({ ...appearanceSettings, timezone: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select
                    value={appearanceSettings.dateFormat}
                    onValueChange={(value) =>
                      setAppearanceSettings({ ...appearanceSettings, dateFormat: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={updateAppearance} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Appearance'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account
              and remove all your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="deletePassword">Enter your password to confirm</Label>
            <Input
              id="deletePassword"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteAccount}
              className="bg-destructive hover:bg-destructive/90"
              disabled={!deletePassword || saving}
            >
              {saving ? 'Deleting...' : 'Delete Account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Settings;
