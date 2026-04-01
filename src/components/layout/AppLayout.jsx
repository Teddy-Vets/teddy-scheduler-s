import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";

export default function AppLayout() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <motion.main
        className="ml-[72px] md:ml-[256px] transition-all duration-300"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
          {user && (
            <div className="flex items-center justify-end mb-6 text-sm text-muted-foreground">
              <span>{user.full_name || user.email}</span>
              {user.role && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                  {user.role}
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