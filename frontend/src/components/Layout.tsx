import { Calendar, LayoutDashboard, LogOut, Shield, Table2 } from 'lucide-react';
import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Layout: React.FC = () => {
    const { user, logout } = useAuth();
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="min-h-screen bg-gray-100 pb-20 md:pb-0 md:pl-64 transition-all duration-300">
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white shadow-sm z-50 flex items-center px-4 justify-between">
                <div className="font-bold text-xl text-primary-600">LeagueMgr</div>
                {user && (
                    <button onClick={() => logout()} className="p-2 text-gray-500">
                        <LogOut size={20} />
                    </button>
                )}
            </div>

            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 z-50">
                <div className="h-16 flex items-center px-6 border-b border-gray-100">
                    <span className="font-bold text-2xl text-primary-600 bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-400">
                        LeagueMgr
                    </span>
                </div>

                <nav className="flex-1 py-6 px-3 space-y-1">
                    <NavItem to="/" icon={<Table2 />} label="League Table" active={isActive('/')} />
                    <NavItem to="/matches" icon={<Calendar />} label="Matches" active={isActive('/matches')} />
                    {user?.role === 'ADMIN' && (
                        <NavItem to="/admin" icon={<LayoutDashboard />} label="Dashboard" active={isActive('/admin')} />
                    )}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    {user ? (
                        <div className="flex items-center justify-between">
                            <div className="text-sm">
                                <p className="font-medium text-gray-900">{user.email.split('@')[0]}</p>
                                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                            </div>
                            <button onClick={() => logout()} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                                <LogOut size={18} />
                            </button>
                        </div>
                    ) : (
                        <Link to="/login" className="flex items-center justify-center w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all">
                            <Shield size={16} className="mr-2" /> Admin Login
                        </Link>
                    )}
                </div>
            </aside>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 z-50 safe-area-pb">
                <MobileNavItem to="/" icon={<Table2 />} label="Table" active={isActive('/')} />
                <MobileNavItem to="/matches" icon={<Calendar />} label="Matches" active={isActive('/matches')} />
                {user?.role === 'ADMIN' && (
                    <MobileNavItem to="/admin" icon={<LayoutDashboard />} label="Admin" active={isActive('/admin')} />
                )}
            </nav>

            {/* Main Content */}
            <main className="pt-20 md:pt-6 px-4 md:px-8 max-w-7xl mx-auto min-h-[calc(100vh-4rem)]">
                <Outlet />
            </main>
        </div>
    );
};

const NavItem = ({ to, icon, label, active }: any) => (
    <Link to={to} className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${active ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
        <span className={`${active ? 'text-primary-600' : 'text-gray-400'} mr-3`}>{icon}</span>
        {label}
    </Link>
);

const MobileNavItem = ({ to, icon, label, active }: any) => (
    <Link to={to} className={`flex flex-col items-center justify-center w-full py-1 ${active ? 'text-primary-600' : 'text-gray-500'}`}>
        {React.cloneElement(icon, { size: 24, strokeWidth: active ? 2.5 : 2 })}
        <span className="text-[10px] mt-1 font-medium">{label}</span>
    </Link>
);
