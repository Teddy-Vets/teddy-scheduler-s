import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Building2,
  ChevronRight,
  ChevronLeft,
  Stethoscope,
  LogOut,
  Menu,
  X,
  BarChart2,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [
  { path: "/", label: "דשבורד", icon: LayoutDashboard },
  { path: "/shifts", label: "לוח שיבוץ", icon: Calendar },
  { path: "/staff", label: "צוות", icon: Users },
  { path: "/clinics", label: "מרפאות", icon: Building2 },
  { path: "/monthly-report", label: "דו״ח חודשי", icon: BarChart2 },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const handleLogout = () => {
    base44.auth.logout("/");
  };

  const closeMobile = () => setMobileOpen(false);

  // Mobile top bar + drawer
  const mobileNav = (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-sidebar text-sidebar-foreground flex items-center justify-between px-4 border-b border-sidebar-border">
        <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg hover:bg-sidebar-accent">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <span className="text-sm font-bold">VetNetwork</span>
        </div>
        <div className="w-8" /> {/* spacer for centering */}
      </div>

      {/* Mobile drawer overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-50 bg-black/60"
              onClick={closeMobile}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="md:hidden fixed top-0 right-0 h-full w-64 z-50 bg-sidebar text-sidebar-foreground flex flex-col border-l border-sidebar-border"
            >
              {/* Drawer header */}
              <div className="p-4 flex items-center justify-between border-b border-sidebar-border min-h-[64px]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
                    <Stethoscope className="w-5 h-5 text-sidebar-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-base font-bold tracking-tight">VetNetwork</h1>
                    <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest">Scheduler</p>
                  </div>
                </div>
                <button onClick={closeMobile} className="p-1.5 rounded-lg hover:bg-sidebar-accent">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Nav links */}
              <nav className="flex-1 py-4 px-2 space-y-1">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={closeMobile}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20"
                          : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Footer */}
              <div className="p-2 border-t border-sidebar-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="w-full justify-start gap-3 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent px-3"
                >
                  <LogOut className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">התנתק</span>
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );

  // Desktop sidebar
  const desktopSidebar = (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        animate={{ width: collapsed ? 72 : 256 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="hidden md:flex h-screen bg-sidebar text-sidebar-foreground flex-col border-l border-sidebar-border fixed right-0 top-0 z-40"
      >
        {/* Logo */}
        <div className="p-4 flex items-center gap-3 border-b border-sidebar-border min-h-[64px]">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
            <Stethoscope className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <h1 className="text-base font-bold tracking-tight">VetNetwork</h1>
                <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest">Scheduler</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            const linkContent = (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm font-medium"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="left">{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-sidebar-border space-y-1 relative z-[60]">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-start gap-3 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent px-3"
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="text-sm">התנתק</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="left">התנתק</TooltipContent>}
          </Tooltip>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full justify-center text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent px-3"
          >
            {collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
      </motion.aside>
    </TooltipProvider>
  );

  return (
    <>
      {mobileNav}
      {desktopSidebar}
    </>
  );
}