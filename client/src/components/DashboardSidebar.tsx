import { cn } from "@/lib/utils";
import { Shield, FolderOpen, History, BarChart3, Trash2, Users } from "lucide-react";

interface DashboardSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  storageUsed?: number;
  storageLimit?: number;
  storagePercentage?: number;
}

const navigation = [
  { id: 'files', label: 'Files', icon: FolderOpen },
  { id: 'shared', label: 'Shared with Me', icon: Users },
  { id: 'history', label: 'History', icon: History },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'trash', label: 'Trash', icon: Trash2 },
];

export function DashboardSidebar({ activeTab, onTabChange, storageUsed = 0, storageLimit = 5 * 1024 * 1024 * 1024, storagePercentage = 0 }: DashboardSidebarProps) {
  // Convert bytes to GB for display
  const usedGB = (storageUsed / (1024 * 1024 * 1024)).toFixed(2);
  const limitGB = (storageLimit / (1024 * 1024 * 1024)).toFixed(0);
  const percentage = storagePercentage.toFixed(1);
  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 border-r bg-card/50 backdrop-blur-sm z-30">
      <div className="flex flex-col h-full py-6">
        {/* Logo Section */}
        <div className="px-6 mb-8">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-primary/20">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">LinkSecure</h2>
              <p className="text-xs text-muted-foreground">Dashboard</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                  "hover:bg-accent/10 group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon 
                  className={cn(
                    "h-5 w-5 mr-3 transition-transform duration-200",
                    isActive ? "scale-110" : "group-hover:scale-110"
                  )} 
                />
                <span>{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Stats */}
        <div className="px-6 pt-6 border-t">
          <div className="p-4 rounded-lg bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Storage Used</span>
              <span className="text-xs font-semibold text-foreground">{percentage}%</span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">{usedGB} GB of {limitGB} GB</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
