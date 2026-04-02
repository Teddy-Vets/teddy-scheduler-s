import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";

const ROLE_LABELS = { admin: "מנהל", user: "משתמש" };

export default function AppLayout() {
  const [user, setUser] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
      <motion.main
        animate={{ marginRight: typeof window !== 'undefined' && window.innerWidth >= 768 ? (sidebarCollapsed ? 72 : 256) : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="pt-14 md:pt-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
          {user && (
            <div className="flex items-center justify-start mb-6 text-sm text-muted-foreground gap-2">
              <span>{user.full_name || user.email}</span>
              {user.role && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {ROLE_LABELS[user.role] || user.role}
                </span>
              )}
            </div>
          )}
          <Outlet />
        </div>
      </motion.main>
    </div>
  );
}