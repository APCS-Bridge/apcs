"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/layout/Sidebar";
import AdminSidebar from "@/components/layout/admin/AdminSidebar";
import WorkspaceDetailView from "@/components/workspace/WorkspaceDetailView";

const WorkspaceDetailPage = () => {
  const params = useParams();
  const { user } = useAuth();
  const workspaceId = params.id as string;

  // Determine sidebar and back path based on role
  const isSuperAdmin = user?.role === "SUPERADMIN";
  const SidebarComponent = isSuperAdmin ? Sidebar : AdminSidebar;
  const backPath = "/dashboard";

  return (
    <WorkspaceDetailView
      workspaceId={workspaceId}
      sidebar={<SidebarComponent />}
      backPath={backPath}
    />
  );
};

export default WorkspaceDetailPage;

