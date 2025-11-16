import { useState, useEffect, useRef } from 'react';
import { apiUrl } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { User, Settings, Shield, HardDrive, Lock, LogOut, ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

interface ProfileMenuProps {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    profileImage?: string;
  };
  onLogout: () => void;
}

export const ProfileMenu = ({ user, onLogout }: ProfileMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  const getUserInitials = () => {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  };

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

  const handleNavigate = (section: string) => {
    navigate(`/dashboard/settings?section=${section}`);
    setIsOpen(false);
  };

  const menuItems = [
    { icon: User, label: 'My Profile', section: 'account' },
    { icon: Settings, label: 'Account Settings', section: 'account' },
    { icon: Shield, label: 'Security Settings', section: 'security' },
    { icon: HardDrive, label: 'Storage Settings', section: 'storage' },
    { icon: Lock, label: 'Privacy Settings', section: 'privacy' },
  ];

  return (
    <div className="relative" ref={menuRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
      >
        <Avatar className="h-9 w-9 bg-gradient-primary">
          {user.profileImage ? (
            <AvatarImage src={apiUrl(user.profileImage)} alt={`${user.firstName} ${user.lastName}`} />
          ) : null}
          <AvatarFallback className="bg-gradient-primary text-white font-medium">
            {getUserInitials()}
          </AvatarFallback>
        </Avatar>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* User Info Section */}
          <div className="p-4 bg-muted/50">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12 bg-gradient-primary">
                {user.profileImage ? (
                  <AvatarImage src={apiUrl(user.profileImage)} alt={`${user.firstName} ${user.lastName}`} />
                ) : null}
                <AvatarFallback className="bg-gradient-primary text-white font-semibold text-lg">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Menu Items */}
          <div className="py-2">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => handleNavigate(item.section)}
                className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors"
              >
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <Separator />

          {/* Logout Button */}
          <div className="p-2">
            <button
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
