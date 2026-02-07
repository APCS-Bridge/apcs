"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Briefcase,
  Users,
  Calendar,
  Loader2,
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  Target,
  Play,
  CheckCircle,
  Search,
  UserPlus,
  LayoutDashboard,
  ClipboardList,
  Rocket,
  StopCircle,
  X,
  Folder as FolderIcon,
  FileText,
  Upload,
  ExternalLink,
  Presentation,
  GitBranch,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  api,
  Space,
  SpaceMember,
  Sprint,
  Meeting,
  User,
  Folder,
  Document,
  DocumentType,
  DocumentVisibility,
  isGoogleDocUrl,
  getGoogleDocEmbedUrl,
  type GitInfo,
  type GitBranch as GitBranchType,
  type GitCommit,
  type GitPull,
  type GitCommitDetail,
} from "@/lib/api";
import Header from "@/components/layout/Header";
import KanbanBoard from "@/components/workspace/KanbanBoard";
import ProductBacklog from "@/components/workspace/ProductBacklog";
import ChatWidget from "@/components/workspace/ChatWidget";
import { DocumentWorkflowView } from "@/components/workflow";
import DocumentExplorer from "@/components/documents/DocumentExplorer";
import { FileCheck } from "lucide-react";

interface WorkspaceDetailViewProps {
  workspaceId: string;
  sidebar: React.ReactNode;
  backPath: string;
}

const WorkspaceDetailView: React.FC<WorkspaceDetailViewProps> = ({
  workspaceId,
  sidebar,
  backPath,
}) => {
  const router = useRouter();
  const { user: currentUser, isLoading: authLoading } = useAuth();

  const [workspace, setWorkspace] = useState<Space | null>(null);
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"board" | "backlog" | "members" | "sprints" | "meetings" | "workflow" | "documents" | "repository" | null >(null);

  // Repository (Git) tab state
  const [gitInfo, setGitInfo] = useState<GitInfo | null>(null);
  const [gitBranches, setGitBranches] = useState<GitBranchType[]>([]);
  const [gitCommits, setGitCommits] = useState<GitCommit[]>([]);
  const [gitPulls, setGitPulls] = useState<GitPull[]>([]);
  const [gitLoading, setGitLoading] = useState(false);
  const [gitBranchSelect, setGitBranchSelect] = useState<string>("");
  const [gitLinkUrl, setGitLinkUrl] = useState("");
  const [savingGitLink, setSavingGitLink] = useState(false);
  const [commitDetail, setCommitDetail] = useState<GitCommitDetail | null>(null);
  const [commitDetailLoading, setCommitDetailLoading] = useState(false);
  const [gitCommitViewMode, setGitCommitViewMode] = useState<"list" | "graph">("graph");

  // Documents: folders live inside workspace; every document is inside a folder
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [rootDocuments, setRootDocuments] = useState<Document[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [rootDocumentsLoading, setRootDocumentsLoading] = useState(false);
  const [triggerAddTask, setTriggerAddTask] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [showCreateDoc, setShowCreateDoc] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [creatingDoc, setCreatingDoc] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  // Google Doc: add link modal + embed viewer
  const [showAddGoogleDoc, setShowAddGoogleDoc] = useState(false);
  const [googleDocUrl, setGoogleDocUrl] = useState("");
  const [googleDocName, setGoogleDocName] = useState("");
  const [creatingGoogleDoc, setCreatingGoogleDoc] = useState(false);
  const [docForEmbed, setDocForEmbed] = useState<Document | null>(null);

  // Session state for chatbot
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionSpaceId, setSessionSpaceId] = useState<string | null>(null);
  const [sessionSprintId, setSessionSprintId] = useState<string | null>(null);

  // Sprint creation state
  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [newSprintName, setNewSprintName] = useState("");
  const [newSprintGoal, setNewSprintGoal] = useState("");
  const [newSprintStart, setNewSprintStart] = useState("");
  const [newSprintEnd, setNewSprintEnd] = useState("");
  const [creatingSprint, setCreatingSprint] = useState(false);
  const [sprintActionLoading, setSprintActionLoading] = useState<string | null>(
    null
  );

  // Add member state
  const [showAddMember, setShowAddMember] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [addingMember, setAddingMember] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  const fetchWorkspace = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [spaceRes, membersRes] = await Promise.all([
        api.getSpaceById(workspaceId),
        api.getSpaceMembers(workspaceId),
      ]);

      if (spaceRes.success && spaceRes.data) {
        setWorkspace(spaceRes.data);
      } else {
        setError("Workspace not found");
        return;
      }

      if (membersRes.success && membersRes.data) {
        setMembers(membersRes.data);
      }

      // Fetch sprints and meetings for SCRUM spaces
      if (spaceRes.data?.methodology === "SCRUM") {
        try {
          const [sprintsRes, meetingsRes] = await Promise.all([
            api.getSpaceSprints(workspaceId),
            api.getSpaceMeetings(workspaceId),
          ]);
          if (sprintsRes.success && sprintsRes.data) {
            setSprints(sprintsRes.data);
          }
          if (meetingsRes.success && meetingsRes.data) {
            setMeetings(meetingsRes.data);
          }
        } catch {
          // Sprints/meetings might fail if user is not a member; that's okay
        }
        // Set default tab for SCRUM: Backlog
        if (!activeTab) {
          setActiveTab("backlog");
        }
      } else {
        // Set default tab for KANBAN: Board
        if (!activeTab) {
          setActiveTab("board");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workspace");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (!authLoading && currentUser) {
      fetchWorkspace();
    }
  }, [authLoading, currentUser, fetchWorkspace]);

  // Fetch folders when Documents tab is active (backend: folders inside workspace)
  const fetchFolders = useCallback(async () => {
    setFoldersLoading(true);
    try {
      const res = await api.getSpaceFolders(workspaceId);
      if (res.success && res.data) setFolders(res.data);
      else setFolders([]);
    } catch {
      setFolders([]);
    } finally {
      setFoldersLoading(false);
    }
  }, [workspaceId]);

  // Fetch documents for selected folder (backend: documents inside folder)
  const fetchFolderDocuments = useCallback(
    async (folderId: string) => {
      setDocumentsLoading(true);
      try {
        const res = await api.getFolderDocuments(workspaceId, folderId);
        if (res.success && res.data) setDocuments(res.data);
        else setDocuments([]);
      } catch {
        setDocuments([]);
      } finally {
        setDocumentsLoading(false);
      }
    },
    [workspaceId]
  );

  // Fetch root-level documents (no folder = root)
  const fetchRootDocuments = useCallback(async () => {
    setRootDocumentsLoading(true);
    try {
      const res = await api.getSpaceRootDocuments(workspaceId);
      if (res.success && res.data) setRootDocuments(res.data);
      else setRootDocuments([]);
    } catch {
      setRootDocuments([]);
    } finally {
      setRootDocumentsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (activeTab === "documents") fetchFolders();
  }, [activeTab, fetchFolders]);

  // Fetch Git repo data when Repository tab is active
  const fetchGitData = useCallback(async () => {
    setGitLoading(true);
    try {
      const [infoRes, branchesRes, commitsRes, pullsRes] = await Promise.all([
        api.getSpaceGit(workspaceId),
        api.getSpaceGitBranches(workspaceId),
        api.getSpaceGitCommits(workspaceId, { per_page: 20 }),
        api.getSpaceGitPulls(workspaceId),
      ]);
      if (infoRes.success && infoRes.data) {
        setGitInfo(infoRes.data);
      } else {
        setGitInfo({ gitRepoUrl: null, owner: null, repo: null });
      }
      if (branchesRes.success && branchesRes.data) {
        setGitBranches(branchesRes.data);
        if (branchesRes.data.length) setGitBranchSelect(branchesRes.data[0].name);
      }
      if (commitsRes.success && commitsRes.data) setGitCommits(commitsRes.data);
      if (pullsRes.success && pullsRes.data) setGitPulls(pullsRes.data);
    } catch {
      setGitInfo({ gitRepoUrl: null, owner: null, repo: null });
      setGitBranches([]);
      setGitCommits([]);
      setGitPulls([]);
    } finally {
      setGitLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (activeTab === "repository") fetchGitData();
  }, [activeTab, fetchGitData]);

  const fetchGitCommitsForBranch = useCallback(
    async (branch: string) => {
      const res = await api.getSpaceGitCommits(workspaceId, { branch, per_page: 20 });
      if (res.success && res.data) setGitCommits(res.data);
    },
    [workspaceId]
  );

  // Compute lane index per commit for graph (oldest-first then assign lanes)
  const gitCommitLanes = React.useMemo(() => {
    const commits = [...gitCommits].reverse();
    const shaSet = new Set(gitCommits.map((c) => c.sha));
    const children = new Map<string, GitCommit[]>();
    commits.forEach((c) => {
      (c.parents ?? []).forEach((p) => {
        if (!shaSet.has(p)) return;
        if (!children.has(p)) children.set(p, []);
        children.get(p)!.push(c);
      });
    });
    const lanes = new Map<string, number>();
    let nextLane = 0;
    commits.forEach((c) => {
      const parents = c.parents ?? [];
      if (parents.length === 0) {
        lanes.set(c.sha, 0);
        return;
      }
      if (parents.length >= 2) {
        lanes.set(c.sha, lanes.get(parents[0]) ?? 0);
        return;
      }
      const p = parents[0];
      const siblings = children.get(p) ?? [];
      const idx = siblings.findIndex((s) => s.sha === c.sha);
      if (idx <= 0) {
        lanes.set(c.sha, lanes.get(p) ?? nextLane++);
      } else {
        lanes.set(c.sha, nextLane++);
      }
    });
    return lanes;
  }, [gitCommits]);

  const formatRelativeTime = (dateStr: string) => {
    const d = new Date(dateStr).getTime();
    const now = Date.now();
    const s = Math.floor((now - d) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400 * 2) return `${Math.floor(s / 86400)}d ago`;
    if (s < 86400 * 14) return `${Math.floor(s / 86400 / 7)}w ago`;
    if (s < 86400 * 60) return `${Math.floor(s / 86400 / 30)} mo ago`;
    return `${Math.floor(s / 86400 / 365)}y ago`;
  };

  const GRAPH_LANE_COLORS = [
    "#38bdf8", // sky (main line)
    "#a78bfa", // violet
    "#34d399", // emerald
    "#fbbf24", // amber
    "#f472b6", // pink
  ];
  const getLaneColor = (lane: number) => GRAPH_LANE_COLORS[lane % GRAPH_LANE_COLORS.length];

  useEffect(() => {
    if (selectedFolderId) {
      fetchFolderDocuments(selectedFolderId);
    } else {
      setDocuments([]);
      if (activeTab === "documents") fetchRootDocuments();
    }
  }, [selectedFolderId, fetchFolderDocuments, activeTab, fetchRootDocuments]);

  const fetchAvailableUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await api.getUsers(1, 100);
      if (response.success && response.data) {
        // Filter out users already in the workspace and SUPERADMIN
        const memberIds = members.map((m) => m.userId);
        const filtered = response.data.filter(
          (u) => u.role !== "SUPERADMIN" && !memberIds.includes(u.id)
        );
        setAvailableUsers(filtered);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAddMember = async (
    userId: string,
    scrumRole?: "PRODUCT_OWNER" | "SCRUM_MASTER" | "DEVELOPER"
  ) => {
    setAddingMember(userId);
    try {
      const response = await api.addSpaceMember(
        workspaceId,
        userId,
        workspace?.methodology === "SCRUM"
          ? scrumRole || "DEVELOPER"
          : undefined
      );
      if (response.success && response.data) {
        setMembers((prev) => [...prev, response.data!]);
        setAvailableUsers((prev) => prev.filter((u) => u.id !== userId));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setAddingMember(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Remove this member from the workspace?")) return;
    setRemovingMember(userId);
    try {
      const response = await api.removeSpaceMember(workspaceId, userId);
      if (response.success) {
        setMembers((prev) => prev.filter((m) => m.userId !== userId));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setRemovingMember(null);
    }
  };

  const filteredAvailableUsers = availableUsers.filter((u) => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  });

  const getRoleBadgeColor = (role?: string | null) => {
    switch (role) {
      case "PRODUCT_OWNER":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      case "SCRUM_MASTER":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "DEVELOPER":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      default:
        return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
    }
  };

  const formatRole = (role?: string | null) => {
    if (!role) return "Member";
    return role
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getSprintStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "PLANNING":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "COMPLETED":
        return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
      default:
        return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
    }
  };

  const getSprintStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Play size={14} />;
      case "PLANNING":
        return <Clock size={14} />;
      case "COMPLETED":
        return <CheckCircle size={14} />;
      default:
        return <Clock size={14} />;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Not set";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMeetingTypeLabel = (type: string) => {
    return type
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // ─── Current user's scrum role in this workspace ───────────
  const currentMember = members.find((m) => m.userId === currentUser?.id);
  const currentScrumRole = currentMember?.scrumRole;
  const isScrumMaster = currentScrumRole === "SCRUM_MASTER";
  const isProductOwner = currentScrumRole === "PRODUCT_OWNER";
  const isSpaceOwner = workspace?.ownerId === currentUser?.id;
  const isSuperAdmin = currentUser?.role === "SUPERADMIN";
  const canManageSprints = isScrumMaster || isSpaceOwner || isSuperAdmin;
  const canManageGitLink = currentUser?.role === "SUPERADMIN" || currentUser?.role === "ADMIN";

  // ─── Sprint handlers ──────────────────────────────────────

  const handleCreateSprint = async () => {
    if (!newSprintName.trim()) return;
    setCreatingSprint(true);
    try {
      const data: {
        name: string;
        goal?: string;
        startDate?: string;
        endDate?: string;
      } = {
        name: newSprintName.trim(),
      };
      if (newSprintGoal.trim()) data.goal = newSprintGoal.trim();
      if (newSprintStart) data.startDate = newSprintStart;
      if (newSprintEnd) data.endDate = newSprintEnd;

      const response = await api.createSprint(workspaceId, data);
      if (response.success && response.data) {
        setSprints((prev) => [...prev, response.data!]);
        setShowCreateSprint(false);
        setNewSprintName("");
        setNewSprintGoal("");
        setNewSprintStart("");
        setNewSprintEnd("");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create sprint");
    } finally {
      setCreatingSprint(false);
    }
  };

  const handleStartSprint = async (sprintId: string) => {
    if (
      !confirm(
        "Start this sprint? Any currently active sprint will need to be completed first. Backlog items will be automatically added to the sprint board."
      )
    )
      return;
    setSprintActionLoading(sprintId);
    try {
      // Start the sprint
      const response = await api.updateSprintStatus(sprintId, "ACTIVE");
      if (response.success && response.data) {
        setSprints((prev) =>
          prev.map((s) => (s.id === sprintId ? response.data! : s))
        );

        // Fetch backlog items and add them to the sprint board (only non-terminated items)
        try {
          const backlogRes = await api.getSpaceBacklog(workspaceId);
          if (backlogRes.success && backlogRes.data && backlogRes.data.length > 0) {
            // Determine which backlog items are terminated (in completed sprints)
            const completedSprints = sprints.filter((s) => s.status === "COMPLETED");
            const terminatedItemIds = new Set<string>();
            
            // Check each completed sprint's board for matching backlog items
            for (const sprint of completedSprints) {
              try {
                const boardRes = await api.getBoard(workspaceId, sprint.id);
                if (boardRes.success && boardRes.data) {
                  const cardTitles = boardRes.data.columns
                    .flatMap((col) => col.cards)
                    .map((card) => card.title.toLowerCase().trim());
                  
                  backlogRes.data.forEach((item) => {
                    if (cardTitles.includes(item.title.toLowerCase().trim())) {
                      terminatedItemIds.add(item.id);
                    }
                  });
                }
              } catch {
                // Ignore errors for individual sprints
              }
            }
            
            // Filter out terminated items
            const activeBacklogItems = backlogRes.data.filter(
              (item) => !terminatedItemIds.has(item.id)
            );
            
            if (activeBacklogItems.length > 0) {
              // Get the board for this sprint to find the first column
              const boardRes = await api.getBoard(workspaceId, sprintId);
              if (boardRes.success && boardRes.data && boardRes.data.columns.length > 0) {
                const firstColumn = boardRes.data.columns[0];
                
                // Create board cards from active (non-terminated) backlog items only
                const createCardPromises = activeBacklogItems.map((item) =>
                  api.createBoardCard(workspaceId, {
                    columnId: firstColumn.id,
                    title: item.title,
                    description: item.description || undefined,
                    assigneeId: item.assigneeId || undefined,
                    sprintId: sprintId,
                  })
                );

                await Promise.all(createCardPromises);
                // Optionally show a success message
                console.log(`Added ${activeBacklogItems.length} active backlog items to sprint board (${terminatedItemIds.size} terminated items excluded)`);
              }
            } else {
              console.log("No active backlog items to add to sprint (all items are terminated)");
            }
          }
        } catch (backlogErr) {
          // Log error but don't fail the sprint start
          console.error("Failed to add backlog items to sprint:", backlogErr);
        }
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to start sprint");
    } finally {
      setSprintActionLoading(null);
    }
  };

  const handleCompleteSprint = async (sprintId: string) => {
    if (!confirm("Complete this sprint? This action cannot be undone.")) return;
    setSprintActionLoading(sprintId);
    try {
      const response = await api.updateSprintStatus(sprintId, "COMPLETED");
      if (response.success && response.data) {
        setSprints((prev) =>
          prev.map((s) => (s.id === sprintId ? response.data! : s))
        );
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to complete sprint");
    } finally {
      setSprintActionLoading(null);
    }
  };

  const handleDeleteSprint = async (sprintId: string) => {
    if (!confirm("Delete this sprint permanently?")) return;
    setSprintActionLoading(sprintId);
    try {
      const response = await api.deleteSprint(sprintId);
      if (response.success) {
        setSprints((prev) => prev.filter((s) => s.id !== sprintId));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete sprint");
    } finally {
      setSprintActionLoading(null);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2
            className="animate-spin mx-auto mb-4 text-indigo-600"
            size={32}
          />
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">
            Loading workspace...
          </p>
        </div>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex">
        {sidebar}
        <main className="flex-1 ml-64 min-w-0">
          <Header />
          <div className="p-8">
            <div className="max-w-5xl mx-auto text-center py-20">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} className="text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                {error || "Workspace not found"}
              </h3>
              <button
                onClick={() => router.push(backPath)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors mt-4"
              >
                <ArrowLeft size={18} />
                Go Back
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex transition-colors duration-300">
      {sidebar}

      <main className="flex-1 ml-64 min-w-0">
        <Header />

        <div className="p-8">
          <div className={activeTab === "board" ? "w-full" : "max-w-5xl mx-auto"}>
            {/* Back Button */}
            <button
              onClick={() => router.push(backPath)}
              className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-6"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>

            {/* Workspace Header */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 mb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Briefcase size={20} />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                      {workspace.name}
                    </h1>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          workspace.methodology === "SCRUM"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {workspace.methodology}
                      </span>
                      {workspace.owner && (
                        <span className="text-xs text-zinc-500">
                          Owner:{" "}
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">
                            {workspace.owner.name}
                          </span>
                        </span>
                      )}
                      <span className="text-xs text-zinc-400">
                        {formatDate(workspace.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={fetchWorkspace}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  <RefreshCw size={14} />
                  Refresh
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <div className="bg-zinc-50 dark:bg-zinc-950/50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-zinc-500 mb-0.5">
                    <Users size={12} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">
                      Members
                    </span>
                  </div>
                  <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {members.length}
                  </p>
                </div>
                {workspace.methodology === "SCRUM" && (
                  <>
                    <div className="bg-zinc-50 dark:bg-zinc-950/50 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 text-zinc-500 mb-0.5">
                        <Target size={12} />
                        <span className="text-[10px] font-semibold uppercase tracking-wider">
                          Sprints
                        </span>
                      </div>
                      <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                        {sprints.length}
                      </p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-950/50 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 text-zinc-500 mb-0.5">
                        <Calendar size={12} />
                        <span className="text-[10px] font-semibold uppercase tracking-wider">
                          Meetings
                        </span>
                      </div>
                      <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                        {meetings.length}
                      </p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-950/50 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 text-zinc-500 mb-0.5">
                        <Play size={12} />
                        <span className="text-[10px] font-semibold uppercase tracking-wider">
                          Active Sprint
                        </span>
                      </div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {sprints.find((s) => s.status === "ACTIVE")?.name ||
                          "None"}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-zinc-200/50 dark:bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-fit">
              {/* Board tab: For KANBAN always, for SCRUM only if sprints exist */}
              {(workspace.methodology === "KANBAN" ||
                (workspace.methodology === "SCRUM" && sprints.length > 0)) && (
                <button
                  onClick={() => setActiveTab("board")}
                  className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors ${
                    activeTab === "board"
                      ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-700"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <LayoutDashboard size={16} /> Board
                  </span>
                </button>
              )}
              {workspace.methodology === "SCRUM" && (
                <button
                  onClick={() => setActiveTab("backlog")}
                  className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors ${
                    activeTab === "backlog"
                      ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-700"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <ClipboardList size={16} /> Backlog
                  </span>
                </button>
              )}
              <button
                onClick={() => setActiveTab("members")}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors ${
                  activeTab === "members"
                    ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Users size={16} /> Members ({members.length})
                </span>
              </button>
              {workspace.methodology === "SCRUM" && (
                <>
                  <button
                    onClick={() => setActiveTab("sprints")}
                    className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors ${
                      activeTab === "sprints"
                        ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Target size={16} /> Sprints ({sprints.length})
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab("meetings")}
                    className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors ${
                      activeTab === "meetings"
                        ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Calendar size={16} /> Meetings ({meetings.length})
                    </span>
                  </button>
                </>
              )}
              <button
                onClick={() => setActiveTab("workflow")}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors ${
                  activeTab === "workflow"
                    ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                <span className="flex items-center gap-2">
                  <FileCheck size={16} /> Workflow
                </span>
              </button>
              <button
                onClick={() => setActiveTab("documents")}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors ${
                  activeTab === "documents"
                    ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                <span className="flex items-center gap-2">
                  <FolderIcon size={16} />
                  Documents
                </span>
              </button>
              <button
                onClick={() => setActiveTab("repository")}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors ${
                  activeTab === "repository"
                    ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                <span className="flex items-center gap-2">
                  <GitBranch size={16} /> Repository
                </span>
              </button>
            </div>

            {/* Tab Content */}
            <div className="space-y-4">
              {/* Board Tab */}
              {activeTab === "board" && (
                <div className="space-y-4">
                  {/* New Task Button */}
                  {(workspace.methodology === "KANBAN" || (workspace.methodology === "SCRUM" && isScrumMaster)) && (
                    <div className="flex justify-end">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setTriggerAddTask(!triggerAddTask)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30"
                      >
                        <Plus size={18} />
                        New Task
                      </motion.button>
                    </div>
                  )}
                  <KanbanBoard
                    spaceId={workspaceId}
                    methodology={workspace.methodology as "KANBAN" | "SCRUM"}
                    members={members}
                    sprints={
                      workspace.methodology === "SCRUM" ? sprints : undefined
                    }
                    triggerAddToFirstColumn={triggerAddTask}
                    onAddTriggered={() => setTriggerAddTask(false)}
                    isScrumMaster={isScrumMaster}
                    currentUserId={currentUser?.id}
                  />
                </div>
              )}

              {/* Backlog Tab */}
              {activeTab === "backlog" && workspace.methodology === "SCRUM" && (
                <div>
                  {/* Info banner for SCRUM workflow */}
                  {sprints.length === 0 && (
                    <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-2xl">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                          <Target
                            size={18}
                            className="text-blue-600 dark:text-blue-400"
                          />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-1">
                            SCRUM Workflow
                          </h4>
                          <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                            The Kanban board becomes available once you create a
                            sprint. Product Owners build the backlog here, then
                            Scrum Masters create sprints from the
                            <button
                              onClick={() => setActiveTab("sprints")}
                              className="inline mx-1 font-bold underline hover:text-blue-800 dark:hover:text-blue-200"
                            >
                              Sprints tab
                            </button>
                            to start working.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <ProductBacklog
                    spaceId={workspaceId}
                    members={members}
                    currentUserId={currentUser?.id || ""}
                    currentUserName={currentUser?.name || "Unknown"}
                    currentUserScrumRole={currentScrumRole}
                    sprints={sprints}
                  />
                </div>
              )}

              {/* Members Tab */}
              {activeTab === "members" && (
                <div>
                  {/* Add Member Button */}
                  <div className="mb-4">
                    <button
                      onClick={() => {
                        setShowAddMember(!showAddMember);
                        if (!showAddMember) fetchAvailableUsers();
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30"
                    >
                      <UserPlus size={18} />
                      Add Member
                    </button>
                  </div>

                  {/* Add Member Panel */}
                  <AnimatePresence>
                    {showAddMember && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mb-4"
                      >
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
                          <div className="relative mb-4">
                            <Search
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                              size={16}
                            />
                            <input
                              type="text"
                              placeholder="Search users to add..."
                              value={userSearch}
                              onChange={(e) => setUserSearch(e.target.value)}
                              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                            />
                          </div>
                          {loadingUsers ? (
                            <div className="text-center py-4">
                              <Loader2
                                className="animate-spin mx-auto text-zinc-400"
                                size={20}
                              />
                            </div>
                          ) : filteredAvailableUsers.length === 0 ? (
                            <p className="text-sm text-zinc-500 text-center py-4">
                              No users available to add
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {filteredAvailableUsers.map((u) => (
                                <div
                                  key={u.id}
                                  className="flex items-center justify-between p-3 hover:bg-zinc-50 dark:hover:bg-zinc-950 rounded-xl transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                                      {u.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                        {u.name}
                                      </p>
                                      <p className="text-xs text-zinc-500">
                                        {u.email}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleAddMember(u.id)}
                                    disabled={addingMember === u.id}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-xs font-bold transition-colors"
                                  >
                                    {addingMember === u.id ? (
                                      <Loader2
                                        size={14}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      "Add"
                                    )}
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Members List */}
                  {members.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
                      <Users size={40} className="mx-auto text-zinc-300 mb-3" />
                      <p className="text-zinc-500">
                        No members in this workspace yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {members.map((member) => (
                        <motion.div
                          key={member.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl transition-all hover:shadow-md"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-100 dark:border-indigo-900/30">
                              {member.user?.name?.charAt(0).toUpperCase() ||
                                "U"}
                            </div>
                            <div>
                              <p className="font-bold text-zinc-900 dark:text-zinc-100">
                                {member.user?.name || "Unknown User"}
                              </p>
                              <p className="text-sm text-zinc-500">
                                {member.user?.email || "No email"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-3 md:mt-0">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(
                                member.scrumRole
                              )}`}
                            >
                              {formatRole(member.scrumRole)}
                            </span>
                            {/* Don't allow removing workspace owner */}
                            {member.userId !== workspace.ownerId && (
                              <button
                                onClick={() =>
                                  handleRemoveMember(member.userId)
                                }
                                disabled={removingMember === member.userId}
                                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all disabled:opacity-50"
                              >
                                {removingMember === member.userId ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <Trash2 size={16} />
                                )}
                              </button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sprints Tab */}
              {activeTab === "sprints" && (
                <div>
                  {/* Create Sprint Button */}
                  {canManageSprints && (
                    <div className="mb-4">
                      <button
                        onClick={() => setShowCreateSprint(!showCreateSprint)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30"
                      >
                        <Plus size={18} />
                        New Sprint
                      </button>
                    </div>
                  )}

                  {/* Create Sprint Form */}
                  <AnimatePresence>
                    {showCreateSprint && canManageSprints && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mb-4"
                      >
                        <div className="bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-6 shadow-md">
                          <div className="flex items-center justify-between mb-5">
                            <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                              Create New Sprint
                            </h4>
                            <button
                              onClick={() => setShowCreateSprint(false)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                              <X size={16} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1 block">
                                Sprint Name *
                              </label>
                              <input
                                value={newSprintName}
                                onChange={(e) =>
                                  setNewSprintName(e.target.value)
                                }
                                placeholder="e.g. Sprint 1"
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1 block">
                                Sprint Goal
                              </label>
                              <textarea
                                value={newSprintGoal}
                                onChange={(e) =>
                                  setNewSprintGoal(e.target.value)
                                }
                                placeholder="What do we want to achieve this sprint?"
                                rows={2}
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-all"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1 block">
                                Start Date
                              </label>
                              <input
                                type="date"
                                value={newSprintStart}
                                onChange={(e) =>
                                  setNewSprintStart(e.target.value)
                                }
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1 block">
                                End Date
                              </label>
                              <input
                                type="date"
                                value={newSprintEnd}
                                onChange={(e) =>
                                  setNewSprintEnd(e.target.value)
                                }
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-3 mt-5">
                            <button
                              onClick={handleCreateSprint}
                              disabled={!newSprintName.trim() || creatingSprint}
                              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-bold transition-colors inline-flex items-center gap-2"
                            >
                              {creatingSprint && (
                                <Loader2 size={14} className="animate-spin" />
                              )}
                              Create Sprint
                            </button>
                            <button
                              onClick={() => {
                                setShowCreateSprint(false);
                                setNewSprintName("");
                                setNewSprintGoal("");
                                setNewSprintStart("");
                                setNewSprintEnd("");
                              }}
                              className="px-4 py-2.5 text-sm font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Sprint List */}
                  {sprints.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
                      <Target
                        size={40}
                        className="mx-auto text-zinc-300 mb-3"
                      />
                      <p className="text-zinc-500 font-medium">
                        No sprints created yet.
                      </p>
                      {canManageSprints && (
                        <p className="text-xs text-zinc-400 mt-1">
                          Click &quot;New Sprint&quot; to plan your first
                          sprint.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sprints.map((sprint) => (
                        <motion.div
                          key={sprint.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`bg-white dark:bg-zinc-900 border rounded-2xl p-6 transition-all ${
                            sprint.status === "ACTIVE"
                              ? "border-emerald-200 dark:border-emerald-800 ring-1 ring-emerald-100 dark:ring-emerald-900/30"
                              : "border-zinc-200 dark:border-zinc-800"
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                  {sprint.name}
                                </h3>
                                <span
                                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getSprintStatusColor(
                                    sprint.status
                                  )}`}
                                >
                                  {getSprintStatusIcon(sprint.status)}
                                  {sprint.status}
                                </span>
                              </div>
                              {sprint.goal && (
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
                                  {sprint.goal}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-zinc-400">
                                <span>
                                  Start: {formatDate(sprint.startDate)}
                                </span>
                                <span>End: {formatDate(sprint.endDate)}</span>
                              </div>
                            </div>

                            {/* Sprint Actions */}
                            {canManageSprints && (
                              <div className="flex items-center gap-2 shrink-0">
                                {sprint.status === "PLANNING" && (
                                  <button
                                    onClick={() => handleStartSprint(sprint.id)}
                                    disabled={sprintActionLoading === sprint.id}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-bold transition-colors shadow-md"
                                  >
                                    {sprintActionLoading === sprint.id ? (
                                      <Loader2
                                        size={14}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <Rocket size={14} />
                                    )}
                                    Start Sprint
                                  </button>
                                )}
                                {sprint.status === "ACTIVE" && (
                                  <button
                                    onClick={() =>
                                      handleCompleteSprint(sprint.id)
                                    }
                                    disabled={sprintActionLoading === sprint.id}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-xl text-xs font-bold transition-colors shadow-md"
                                  >
                                    {sprintActionLoading === sprint.id ? (
                                      <Loader2
                                        size={14}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <StopCircle size={14} />
                                    )}
                                    Complete Sprint
                                  </button>
                                )}
                                {sprint.status !== "ACTIVE" && (
                                  <button
                                    onClick={() =>
                                      handleDeleteSprint(sprint.id)
                                    }
                                    disabled={sprintActionLoading === sprint.id}
                                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all disabled:opacity-50"
                                  >
                                    {sprintActionLoading === sprint.id ? (
                                      <Loader2
                                        size={14}
                                        className="animate-spin"
                                      />
                                    ) : (
                                      <Trash2 size={14} />
                                    )}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Meetings Tab */}
              {activeTab === "meetings" && (
                <div>
                  {meetings.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
                      <Calendar
                        size={40}
                        className="mx-auto text-zinc-300 mb-3"
                      />
                      <p className="text-zinc-500">
                        No meetings scheduled yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {meetings.map((meeting) => (
                        <motion.div
                          key={meeting.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6"
                        >
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                  {meeting.title}
                                </h3>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 uppercase tracking-wider">
                                  {getMeetingTypeLabel(meeting.type)}
                                </span>
                              </div>
                              {meeting.description && (
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
                                  {meeting.description}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-zinc-400">
                                <span className="flex items-center gap-1">
                                  <Calendar size={12} />
                                  {formatDateTime(meeting.scheduledAt)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock size={12} />
                                  {meeting.duration} min
                                </span>
                                {meeting.createdBy && (
                                  <span>By: {meeting.createdBy.name}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Documents Tab: folders in workspace; every document inside a folder */}
              {activeTab === "documents" && (
                <div className="space-y-6">
                 

                  {/* Create folder */}
                  <AnimatePresence>
                    {showCreateFolder && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
                          <input
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            placeholder="Folder name"
                            className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button
                            onClick={async () => {
                              if (!newFolderName.trim()) return;
                              setCreatingFolder(true);
                              try {
                                const res = await api.createFolder(workspaceId, {
                                  name: newFolderName.trim(),
                                  type: DocumentType.FOLDER,
                                  visibility: DocumentVisibility.PUBLIC,
                                });
                                if (res.success && res.data) {
                                  setFolders((prev) => [...prev, res.data!]);
                                  setShowCreateFolder(false);
                                  setNewFolderName("");
                                }
                              } catch (e) {
                                alert(e instanceof Error ? e.message : "Failed to create folder");
                              } finally {
                                setCreatingFolder(false);
                              }
                            }}
                            disabled={!newFolderName.trim() || creatingFolder}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold"
                          >
                            {creatingFolder ? <Loader2 size={16} className="animate-spin" /> : "Create"}
                          </button>
                          <button
                            onClick={() => {
                              setShowCreateFolder(false);
                              setNewFolderName("");
                            }}
                            className="p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   

                    {/* Documents: root (no folder) or selected folder */}
                    <div className="md:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                          {selectedFolderId ? "Documents in folder" : "Root (workspace documents)"}
                        </h4>
                        <div className="flex items-center gap-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setUploadingDoc(true);
                              try {
                                if (selectedFolderId) {
                                  const res = await api.uploadDocument(
                                    workspaceId,
                                    file,
                                    { parentId: selectedFolderId }
                                  );
                                  if (res.success && res.data)
                                    setDocuments((prev) => [...prev, res.data!]);
                                } else {
                                  const res = await api.uploadDocumentAtRoot(workspaceId, file);
                                  if (res.success && res.data)
                                    setRootDocuments((prev) => [...prev, res.data!]);
                                }
                              } catch (err) {
                                alert(err instanceof Error ? err.message : "Upload failed");
                              } finally {
                                setUploadingDoc(false);
                                e.target.value = "";
                              }
                            }}
                          />
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingDoc}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-sm font-medium"
                          >
                            {uploadingDoc ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Upload size={14} />
                            )}
                            Upload
                          </button>
                          <button
                            onClick={() => {
                              setShowCreateDoc(true);
                              setNewDocName("");
                            }}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium"
                          >
                            <Plus size={14} />
                            Create .doc
                          </button>
                          <button
                            onClick={() => {
                              setShowAddGoogleDoc(true);
                              setGoogleDocUrl("");
                              setGoogleDocName("");
                            }}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-sm font-medium"
                          >
                            <Presentation size={14} />
                            Add Google Doc
                          </button>
                        </div>
                      </div>

                      {/* Add Google Doc modal */}
                      <AnimatePresence>
                        {showAddGoogleDoc && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="mb-4 p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3"
                          >
                            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                              Paste a Google Docs link to add it {selectedFolderId ? "to this folder" : "to root"}.
                            </p>
                            <input
                              value={googleDocUrl}
                              onChange={(e) => setGoogleDocUrl(e.target.value)}
                              placeholder="https://docs.google.com/document/d/..."
                              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm"
                            />
                            <input
                              value={googleDocName}
                              onChange={(e) => setGoogleDocName(e.target.value)}
                              placeholder="Display name (optional)"
                              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={async () => {
                                  const url = googleDocUrl.trim();
                                  if (!url || !isGoogleDocUrl(url)) {
                                    alert("Please enter a valid Google Docs URL.");
                                    return;
                                  }
                                  const name = googleDocName.trim() || "Google Doc";
                                  setCreatingGoogleDoc(true);
                                  try {
                                    if (selectedFolderId) {
                                      const res = await api.createDocument(
                                        workspaceId,
                                        selectedFolderId,
                                        { name, url }
                                      );
                                      if (res.success && res.data) {
                                        setDocuments((prev) => [...prev, res.data!]);
                                        setShowAddGoogleDoc(false);
                                        setGoogleDocUrl("");
                                        setGoogleDocName("");
                                      }
                                    } else {
                                      const res = await api.createDocumentAtRoot(workspaceId, { name, url });
                                      if (res.success && res.data) {
                                        setRootDocuments((prev) => [...prev, res.data!]);
                                        setShowAddGoogleDoc(false);
                                        setGoogleDocUrl("");
                                        setGoogleDocName("");
                                      }
                                    }
                                  } catch (e) {
                                    alert(
                                      e instanceof Error
                                        ? e.message
                                        : "Failed to add Google Doc. Ensure the backend supports document creation with url."
                                    );
                                  } finally {
                                    setCreatingGoogleDoc(false);
                                  }
                                }}
                                disabled={creatingGoogleDoc}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold disabled:opacity-50"
                              >
                                {creatingGoogleDoc ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  "Add"
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setShowAddGoogleDoc(false);
                                  setGoogleDocUrl("");
                                  setGoogleDocName("");
                                }}
                                className="p-2 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Create .doc modal */}
                      <AnimatePresence>
                        {showCreateDoc && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="mb-4 p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-3"
                          >
                            <input
                              value={newDocName}
                              onChange={(e) => setNewDocName(e.target.value)}
                              placeholder="Document name (e.g. report.doc)"
                              className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm"
                            />
                            <button
                              onClick={async () => {
                                const name = newDocName.trim()
                                  ? newDocName.trim().endsWith(".doc")
                                    ? newDocName.trim()
                                    : `${newDocName.trim()}.doc`
                                  : "document.doc";
                                setCreatingDoc(true);
                                try {
                                  if (selectedFolderId) {
                                    const res = await api.createDocument(
                                      workspaceId,
                                      selectedFolderId,
                                      { name }
                                    );
                                    if (res.success && res.data) {
                                      setDocuments((prev) => [...prev, res.data!]);
                                      setShowCreateDoc(false);
                                      setNewDocName("");
                                    }
                                  } else {
                                    const res = await api.createDocumentAtRoot(workspaceId, { name });
                                    if (res.success && res.data) {
                                      setRootDocuments((prev) => [...prev, res.data!]);
                                      setShowCreateDoc(false);
                                      setNewDocName("");
                                    }
                                  }
                                } catch (e) {
                                  alert(e instanceof Error ? e.message : "Failed to create document");
                                } finally {
                                  setCreatingDoc(false);
                                }
                              }}
                              disabled={creatingDoc}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold disabled:opacity-50"
                            >
                              {creatingDoc ? <Loader2 size={14} className="animate-spin" /> : "Create"}
                            </button>
                            <button
                              onClick={() => {
                                setShowCreateDoc(false);
                                setNewDocName("");
                              }}
                              className="p-2 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg"
                            >
                              <X size={16} />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {selectedFolderId
                        ? (documentsLoading ? (
                            <div className="flex justify-center py-8">
                              <Loader2 size={24} className="animate-spin text-indigo-600" />
                            </div>
                          ) : documents.length === 0 ? (
                            <p className="text-sm text-zinc-500 py-8 text-center">
                              No documents. Upload a file or create a .doc.
                            </p>
                          ) : (
                            <ul className="space-y-2">
                              {documents.map((doc) => (
                                <li
                                  key={doc.id}
                                  className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 group"
                                >
                                  {isGoogleDocUrl(doc.url) ? (
                                    <Presentation size={18} className="text-blue-600 dark:text-blue-400" />
                                  ) : (
                                    <FileText size={18} className="text-zinc-500" />
                                  )}
                                  <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                    {doc.name}
                                  </span>
                                  {doc.size != null && !doc.url && (
                                    <span className="text-xs text-zinc-400">
                                      {(doc.size / 1024).toFixed(1)} KB
                                    </span>
                                  )}
                                  {isGoogleDocUrl(doc.url) && doc.url && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => window.open(doc.url!, "_blank", "noopener")}
                                        className="p-1.5 text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Open in new tab"
                                      >
                                        <ExternalLink size={14} />
                                      </button>
                                      <button
                                        onClick={() => setDocForEmbed(doc)}
                                        className="p-1.5 text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="View embedded"
                                      >
                                        <Presentation size={14} />
                                      </button>
                                    </div>
                                  )}
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Delete "${doc.name}"?`)) return;
                                      setDeletingDocId(doc.id);
                                      try {
                                        await api.deleteDocument(
                                          doc.id
                                        );
                                        setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
                                      } catch (e) {
                                        alert(e instanceof Error ? e.message : "Failed to delete");
                                      } finally {
                                        setDeletingDocId(null);
                                      }
                                    }}
                                    disabled={deletingDocId === doc.id}
                                    className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg opacity-0 group-hover:opacity-100"
                                  >
                                    {deletingDocId === doc.id ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                      <Trash2 size={14} />
                                    )}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ))
                        : (rootDocumentsLoading ? (
                            <div className="flex justify-center py-8">
                              <Loader2 size={24} className="animate-spin text-indigo-600" />
                            </div>
                          ) : rootDocuments.length === 0 ? (
                            <p className="text-sm text-zinc-500 py-8 text-center">
                              No documents at root. Upload a file, create a .doc, or add a Google Doc.
                            </p>
                          ) : (
                            <ul className="space-y-2">
                              {rootDocuments.map((doc) => (
                                <li
                                  key={doc.id}
                                  className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 group"
                                >
                                  {isGoogleDocUrl(doc.url) ? (
                                    <Presentation size={18} className="text-blue-600 dark:text-blue-400" />
                                  ) : (
                                    <FileText size={18} className="text-zinc-500" />
                                  )}
                                  <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                    {doc.name}
                                  </span>
                                  {doc.size != null && !doc.url && (
                                    <span className="text-xs text-zinc-400">
                                      {(doc.size / 1024).toFixed(1)} KB
                                    </span>
                                  )}
                                  {isGoogleDocUrl(doc.url) && doc.url && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => window.open(doc.url!, "_blank", "noopener")}
                                        className="p-1.5 text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Open in new tab"
                                      >
                                        <ExternalLink size={14} />
                                      </button>
                                      <button
                                        onClick={() => setDocForEmbed(doc)}
                                        className="p-1.5 text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="View embedded"
                                      >
                                        <Presentation size={14} />
                                      </button>
                                    </div>
                                  )}
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Delete "${doc.name}"?`)) return;
                                      setDeletingDocId(doc.id);
                                      try {
                                        await api.deleteRootDocument(workspaceId, doc.id);
                                        setRootDocuments((prev) => prev.filter((d) => d.id !== doc.id));
                                      } catch (e) {
                                        alert(e instanceof Error ? e.message : "Failed to delete");
                                      } finally {
                                        setDeletingDocId(null);
                                      }
                                    }}
                                    disabled={deletingDocId === doc.id}
                                    className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg opacity-0 group-hover:opacity-100"
                                  >
                                    {deletingDocId === doc.id ? (
                                      <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                      <Trash2 size={14} />
                                    )}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ))}
                    </div>
                 
                  </div>
                </div>
              )}

              {/* Repository (Git) Tab */}
              {activeTab === "repository" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    GitHub repository
                  </h3>
                  {gitLoading ? (
                    <div className="flex justify-center py-16">
                      <Loader2 size={32} className="animate-spin text-indigo-600" />
                    </div>
                  ) : !gitInfo?.gitRepoUrl ? (
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-xl">
                      {canManageGitLink ? (
                        <>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                            Link a GitHub repository to view branches, commits, and open PRs.
                          </p>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <input
                              value={gitLinkUrl}
                              onChange={(e) => setGitLinkUrl(e.target.value)}
                              placeholder="https://github.com/owner/repo"
                              className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm"
                            />
                            <button
                              onClick={async () => {
                                const url = gitLinkUrl.trim();
                                if (!url) {
                                  alert("Enter a GitHub repository URL.");
                                  return;
                                }
                                setSavingGitLink(true);
                                try {
                                  const res = await api.setSpaceGit(workspaceId, { gitRepoUrl: url });
                                  if (res.success) {
                                    setGitLinkUrl("");
                                    await fetchGitData();
                                  } else {
                                    alert(res.message || "Failed to link repository");
                                  }
                                } catch (e) {
                                  alert(e instanceof Error ? e.message : "Failed to link repository");
                                } finally {
                                  setSavingGitLink(false);
                                }
                              }}
                              disabled={savingGitLink}
                              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold"
                            >
                              {savingGitLink ? <Loader2 size={16} className="animate-spin inline" /> : "Link repository"}
                            </button>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          No repository linked. Only admins can link a GitHub repository to this workspace.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {gitInfo.repoAccessible === false && (
                        <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 p-4">
                          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                            Repository not accessible. Branches, commits, and PRs could not be loaded.
                          </p>
                          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                            The repo may not exist at this path, or it is private. For private repos, set{" "}
                            <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">GITHUB_TOKEN</code> in
                            the backend <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">.env</code>{" "}
                            (create a token at GitHub → Settings → Developer settings → Personal access tokens, with{" "}
                            <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">repo</code> scope) and
                            restart the server.
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <a
                          href={gitInfo.gitRepoUrl ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                        >
                          <GitBranch size={18} />
                          {gitInfo.owner}/{gitInfo.repo}
                          <ExternalLink size={14} />
                        </a>
                        {canManageGitLink && (
                          <button
                            onClick={async () => {
                              if (!confirm("Unlink this GitHub repository from the workspace?")) return;
                              setSavingGitLink(true);
                              try {
                                const res = await api.setSpaceGit(workspaceId, { gitRepoUrl: null });
                                if (res.success) await fetchGitData();
                                else alert(res.message || "Failed to unlink");
                              } catch (e) {
                                alert(e instanceof Error ? e.message : "Failed to unlink repository");
                              } finally {
                                setSavingGitLink(false);
                              }
                            }}
                            disabled={savingGitLink}
                            className="px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 border border-zinc-300 dark:border-zinc-600 hover:border-red-300 dark:hover:border-red-800 rounded-xl transition-colors disabled:opacity-50"
                          >
                            {savingGitLink ? <Loader2 size={14} className="animate-spin inline" /> : "Unlink"}
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
                          <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-3">
                            Branches
                          </h4>
                          {gitBranches.length === 0 ? (
                            <p className="text-sm text-zinc-500">No branches</p>
                          ) : (
                            <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                              {gitBranches.map((b) => (
                                <li key={b.name} className="flex items-center gap-2 text-sm">
                                  <GitBranch size={14} className="text-zinc-400" />
                                  <span className="font-mono text-zinc-800 dark:text-zinc-200">{b.name}</span>
                                  {b.protected && (
                                    <span className="text-xs text-zinc-400">protected</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
                          <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-3">
                            Open pull requests
                          </h4>
                          {gitPulls.length === 0 ? (
                            <p className="text-sm text-zinc-500">No open PRs</p>
                          ) : (
                            <ul className="space-y-2 max-h-48 overflow-y-auto">
                              {gitPulls.map((p) => (
                                <li key={p.number}>
                                  <a
                                    href={p.htmlUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                                  >
                                    <span className="font-bold">#{p.number}</span>
                                    <span className="truncate">{p.title}</span>
                                    <span className="text-zinc-400">by {p.userLogin}</span>
                                    <ExternalLink size={12} />
                                  </a>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>

                      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                          <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                            Recent commits
                          </h4>
                          <div className="flex items-center gap-2">
                            {gitBranches.length > 0 && (
                              <select
                                value={gitBranchSelect}
                                onChange={(e) => {
                                  const branch = e.target.value;
                                  setGitBranchSelect(branch);
                                  fetchGitCommitsForBranch(branch);
                                }}
                                className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-sm"
                              >
                                {gitBranches.map((b) => (
                                  <option key={b.name} value={b.name}>
                                    {b.name}
                                  </option>
                                ))}
                              </select>
                            )}
                            <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => setGitCommitViewMode("list")}
                                className={`px-3 py-1.5 text-xs font-medium ${gitCommitViewMode === "list" ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100" : "bg-transparent text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
                              >
                                List
                              </button>
                              <button
                                type="button"
                                onClick={() => setGitCommitViewMode("graph")}
                                className={`px-3 py-1.5 text-xs font-medium ${gitCommitViewMode === "graph" ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100" : "bg-transparent text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
                              >
                                Graph
                              </button>
                            </div>
                          </div>
                        </div>
                        {gitCommits.length === 0 ? (
                          <p className="text-sm text-zinc-500">No commits</p>
                        ) : gitCommitViewMode === "graph" ? (
                          <div className="max-h-96 overflow-y-auto">
                            <div className="flex items-center gap-2 mb-2 text-sm text-zinc-500 dark:text-zinc-400">
                              <span className="font-medium text-zinc-700 dark:text-zinc-300">// {gitBranchSelect || "main"}</span>
                            </div>
                            <div className="flex gap-0 min-w-full">
                              <div className="shrink-0 pt-1.5">
                                <svg
                                  width={Math.max(24, (Math.max(0, ...Array.from(gitCommitLanes.values())) + 1) * 24)}
                                  height={gitCommits.length * 32}
                                >
                                  {gitCommits.map((c, i) => {
                                    const lane = gitCommitLanes.get(c.sha) ?? 0;
                                    const color = getLaneColor(lane);
                                    const x = lane * 24 + 12;
                                    const y = i * 32 + 16;
                                    const parents = c.parents ?? [];
                                    return (
                                      <g key={c.sha}>
                                        {parents.map((pSha) => {
                                          const parentIdx = gitCommits.findIndex((co) => co.sha === pSha);
                                          if (parentIdx === -1 || parentIdx <= i) return null;
                                          const pLane = gitCommitLanes.get(pSha) ?? 0;
                                          const pColor = getLaneColor(pLane);
                                          const px = pLane * 24 + 12;
                                          const py = parentIdx * 32 + 16;
                                          const midY = (y + py) / 2;
                                          return (
                                            <path
                                              key={pSha}
                                              d={`M ${x} ${y} C ${x} ${midY}, ${px} ${midY}, ${px} ${py}`}
                                              fill="none"
                                              stroke={pColor}
                                              strokeWidth="2"
                                              opacity="0.7"
                                            />
                                          );
                                        })}
                                        <circle cx={x} cy={y} r="5" fill={color} stroke={color} strokeWidth="1" />
                                      </g>
                                    );
                                  })}
                                </svg>
                              </div>
                              <ul className="flex-1 min-w-0 space-y-0 border-l border-zinc-200 dark:border-zinc-700 pl-3">
                                {gitCommits.map((c, i) => {
                                  const lane = gitCommitLanes.get(c.sha) ?? 0;
                                  const laneColor = getLaneColor(lane);
                                  return (
                                  <li
                                    key={c.sha}
                                    style={{ minHeight: 32, borderLeftColor: laneColor }}
                                    className="flex items-center gap-2 text-sm cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded pr-2 -mr-2 transition-colors border-l-2 hover:opacity-90"
                                    onClick={async () => {
                                      setCommitDetailLoading(true);
                                      setCommitDetail(null);
                                      try {
                                        const res = await api.getSpaceGitCommitDetail(workspaceId, c.sha);
                                        if (res.success && res.data) setCommitDetail(res.data);
                                      } catch {
                                        setCommitDetail(null);
                                      } finally {
                                        setCommitDetailLoading(false);
                                      }
                                    }}
                                  >
                                    <span className="text-indigo-600 dark:text-indigo-400 font-mono text-xs shrink-0 w-16" title={c.sha}>
                                      {c.sha.slice(0, 7)}
                                    </span>
                                    <span className="flex-1 truncate text-zinc-800 dark:text-zinc-200" title={c.message}>
                                      {c.message.split("\n")[0]}
                                    </span>
                                    <span className="text-zinc-400 text-xs shrink-0">
                                      {formatRelativeTime(c.authorDate || "")}
                                    </span>
                                  </li>
                                  );
                                })}
                              </ul>
                            </div>
                          </div>
                        ) : (
                          <ul className="space-y-2 max-h-64 overflow-y-auto">
                            {gitCommits.map((c) => (
                              <li
                                key={c.sha}
                                className="flex items-start gap-2 text-sm border-b border-zinc-100 dark:border-zinc-800 pb-2 last:border-0 last:pb-0 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg px-2 -mx-2 transition-colors"
                                onClick={async () => {
                                  setCommitDetailLoading(true);
                                  setCommitDetail(null);
                                  try {
                                    const res = await api.getSpaceGitCommitDetail(workspaceId, c.sha);
                                    if (res.success && res.data) setCommitDetail(res.data);
                                  } catch {
                                    setCommitDetail(null);
                                  } finally {
                                    setCommitDetailLoading(false);
                                  }
                                }}
                              >
                                <span className="text-indigo-600 dark:text-indigo-400 font-mono truncate max-w-24 shrink-0" title={c.sha}>
                                  {c.sha.slice(0, 7)}
                                </span>
                                <span className="flex-1 truncate text-zinc-800 dark:text-zinc-200" title={c.message}>
                                  {c.message.split("\n")[0]}
                                </span>
                                <span className="text-zinc-400 shrink-0">
                                  {c.authorName} · {c.authorDate ? new Date(c.authorDate).toLocaleDateString() : ""}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Workflow Tab */}
              {activeTab === "workflow" && currentUser && (
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 min-h-[600px]">
                  <DocumentWorkflowView
                    spaceId={workspaceId}
                    currentUserId={currentUser.id}
                    currentUserName={currentUser.name}
                    members={members.map((m) => ({
                      id: m.user?.id || m.userId,
                      name: m.user?.name || "Unknown",
                      email: m.user?.email,
                    }))}
                    isOwner={workspace?.ownerId === currentUser.id}
                  />
                </div>
              )}

              {/* Documents Tab */}
              {activeTab === "documents" && currentUser && (
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 min-h-[600px]">
                  <DocumentExplorer
                    spaceId={workspaceId}
                    currentUserId={currentUser.id}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Chatbot Widget */}
        {currentUser &&
          workspace &&
          (() => {
            console.log("Passing to ChatWidget - currentUser:", currentUser);
            console.log(
              "Passing to ChatWidget - currentUser.id:",
              currentUser.id
            );
            return (
              <ChatWidget
                workspaceId={workspaceId}
                userId={currentUser.id || currentUser.email || "unknown"}
                workspaceName={workspace.name}
                spaceId={workspaceId}
              />
            );
          })()}
      </main>
    </div>
  );
};


export default WorkspaceDetailView;
