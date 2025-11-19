import React from 'react';
import { Home, Search, PlusSquare, Bell, User } from 'lucide-react';
import { Screen } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  unreadCount?: number; 
  labels: {
    home: string;
    discover: string;
    activity: string;
    profile: string;
  };
}

const Layout: React.FC<LayoutProps> = ({ children, currentScreen, onNavigate, unreadCount = 0, labels }) => {
  
  const NavItem = ({ screen, icon: Icon, label }: { screen: Screen; icon: React.ElementType; label: string }) => {
    const isActive = currentScreen === screen;
    return (
      <button 
        onClick={() => onNavigate(screen)}
        className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-300 ${isActive ? 'opacity-100 scale-105' : 'opacity-50 hover:opacity-75'}`}
      >
        <div className="relative">
           <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
           {screen === Screen.NOTIFICATIONS && unreadCount > 0 && (
             <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-black dark:border-white animate-bounce">
               {unreadCount > 9 ? '9+' : unreadCount}
             </span>
           )}
        </div>
        <span className="text-[10px] font-medium">{label}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full w-full mx-auto bg-white dark:bg-black shadow-2xl relative overflow-hidden transition-colors duration-300">
      <main className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col bg-white dark:bg-black">
        {children}
      </main>

      {/* Sticky Bottom Nav */}
      <nav className="w-full h-16 flex-shrink-0 flex justify-around items-center z-50 pb-safe transition-colors duration-500
                      bg-black text-white dark:bg-white dark:text-black border-t border-gray-800 dark:border-gray-200">
        <NavItem screen={Screen.FEED} icon={Home} label={labels.home} />
        <NavItem screen={Screen.DISCOVER} icon={Search} label={labels.discover} />
        
        <button 
          onClick={() => onNavigate(Screen.CREATE)}
          className="relative -top-5 p-3.5 rounded-2xl shadow-lg active:scale-95 transition-all duration-300
                     bg-white text-black shadow-white/20 hover:bg-gray-200
                     dark:bg-black dark:text-white dark:shadow-black/20 dark:hover:bg-gray-900"
        >
          <PlusSquare size={24} />
        </button>

        <NavItem screen={Screen.NOTIFICATIONS} icon={Bell} label={labels.activity} />
        <NavItem screen={Screen.PROFILE} icon={User} label={labels.profile} />
      </nav>
    </div>
  );
};

export default Layout;