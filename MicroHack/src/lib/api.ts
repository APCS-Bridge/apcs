/**
 * API service layer for connecting to the APCS backend
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface User {
  id: string;
  email: string;
  name: string;
  role: "SUPERADMIN" | "ADMIN" | "USER";
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt?: string;
}

interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

interface CreateUserData {
  email: string;
  password: string;
  name: string;
  role: "ADMIN" | "USER";
}

interface Space {
  id: string;
  name: string;
  methodology: "KANBAN" | "SCRUM";
  ownerId: string;
  gitRepoUrl?: string | null;
  owner?: User;
  createdAt: string;
  members?: SpaceMember[];
  _count?: {
    members: number;
  };
}

// Git (GitHub) integration types
export interface GitInfo {
  gitRepoUrl: string | null;
  owner: string | null;
  repo: string | null;
  /** false when GitHub returns 404/403 (repo not found or private without token) */
  repoAccessible?: boolean;
}

export interface GitBranch {
  name: string;
  commitSha: string;
  protected?: boolean;
}

export interface GitCommit {
  sha: string;
  message: string;
  authorName: string;
  authorDate: string;
  htmlUrl: string;
  /** Parent commit SHAs for graph layout */
  parents: string[];
}

export interface GitPull {
  number: number;
  title: string;
  state: string;
  userLogin: string;
  htmlUrl: string;
}

export interface GitCommitFile {
  filename: string;
  patch: string | null;
  status: string;
  additions: number;
  deletions: number;
  changes?: number;
}

export interface GitCommitDetail {
  sha: string;
  message: string;
  authorName: string;
  authorDate: string;
  htmlUrl: string;
  files: GitCommitFile[];
  stats?: { additions: number; deletions: number; total: number };
}

interface CreateSpaceData {
  name: string;
  methodology: "KANBAN" | "SCRUM";
  ownerId?: string;
}

interface SpaceMember {
  id: string;
  spaceId: string;
  userId: string;
  scrumRole?: "PRODUCT_OWNER" | "SCRUM_MASTER" | "DEVELOPER" | null;
  joinedAt: string;
  user?: User;
}

interface Invitation {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  status: "PENDING" | "ACCEPTED" | "DENIED";
  senderId: string;
  senderName?: string;
  senderEmail?: string;
  receiverId?: string;
  createdAt: string;
  respondedAt?: string;
  sender?: User;
  receiver?: User;
}

interface Sprint {
  id: string;
  spaceId: string;
  name: string;
  goal?: string;
  status: "PLANNING" | "ACTIVE" | "COMPLETED";
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

type MeetingType =
  | "DAILY_STANDUP"
  | "SPRINT_PLANNING"
  | "SPRINT_REVIEW"
  | "SPRINT_RETROSPECTIVE"
  | "BACKLOG_REFINEMENT"
  | "CUSTOM";

interface Meeting {
  id: string;
  spaceId: string;
  sprintId?: string;
  title: string;
  description?: string;
  type: MeetingType;
  scheduledAt: string;
  duration: number;
  createdById: string;
  createdBy?: User;
  createdAt: string;
  updatedAt: string;
}

interface CreateMeetingData {
  title: string;
  description?: string;
  type: MeetingType;
  scheduledAt: string;
  duration: number;
  sprintId?: string;
}

// ═══════════════════════════════════════════════════════════
// Notification types
// ═══════════════════════════════════════════════════════════

export type NotificationType =
  | "SPACE_INVITATION_RECEIVED"
  | "INVITATION_ACCEPTED"
  | "INVITATION_DENIED"
  | "BACKLOG_ITEM_CREATED"
  | "BACKLOG_ITEM_ASSIGNED"
  | "BACKLOG_ITEM_UPDATED"
  | "SPRINT_CREATED"
  | "SPRINT_STARTED"
  | "SPRINT_COMPLETED"
  | "SPRINT_UPDATED"
  | "SPRINT_BACKLOG_ITEM_CREATED"
  | "SPRINT_BACKLOG_ITEM_ASSIGNED"
  | "SPRINT_BACKLOG_ITEM_UPDATED"
  | "TASK_ASSIGNED"
  | "TASK_UPDATED"
  | "TASK_COMPLETED"
  | "TASK_COMMENT_ADDED"
  | "MEETING_SCHEDULED"
  | "MEETING_REMINDER"
  | "MEETING_UPDATED"
  | "MEETING_CANCELLED"
  | "DAILY_STANDUP_REMINDER"
  | "SPRINT_DEADLINE_REMINDER"
  | "MESSAGE_RECEIVED"
  | "MENTION_RECEIVED";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  createdAt: string;
  readAt: string | null;
}

export interface RegisterTokenData {
  fcmToken: string;
  platform?: string;
}

interface CreateSprintData {
  name: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
}

// Product Backlog (from API)
export interface ApiBacklogItem {
  id: string;
  spaceId: string;
  title: string;
  description: string | null;
  sequenceNumber: number;
  position: number;
  assigneeId: string | null;
  assigneeName: string | null;
  createdById: string;
  createdByName: string;
  createdAt: string;
}

export interface CreateBacklogItemData {
  title: string;
  description?: string | null;
  assigneeId?: string | null;
}

// Board (Kanban / Scrum)
export interface ApiBoardCard {
  id: string;
  title: string;
  description: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  sequenceNumber: number;
  position: number;
  createdAt: string;
}

export interface ApiBoardColumn {
  id: string;
  name: string;
  wipLimit: number | null;
  position: number;
  cards: ApiBoardCard[];
}

export interface ApiBoardResponse {
  columns: ApiBoardColumn[];
  nextSequence: number;
}

export interface CreateBoardCardData {
  columnId: string;
  title: string;
  description?: string | null;
  assigneeId?: string | null;
  sprintId?: string | null;
}

// ═══════════════════════════════════════════════════════════════
// Folder & Document types (workspace-scoped; backend to implement)
// Every document lives inside a folder inside a workspace.
// ═══════════════════════════════════════════════════════════════

export interface Folder {
  id: string;
  spaceId: string;
  name: string;
  parentId?: string | null;
  createdAt: string;
}

export interface Document {
  id: string;
  folderId: string | null; // null = root-level document
  name: string;
  mimeType?: string | null;
  size?: number | null;
  url?: string | null;
  createdAt: string;
}

export interface CreateFolderData {
  name: string;
  parentId?: string | null;
  visibility?: DocumentVisibility;
}

/** Workspace folder/root documents (.doc, Google Doc link) */
export interface CreateWorkspaceDocumentData {
  name: string;
  /** For .doc creation: optional initial content (plain text or base64) */
  content?: string | null;
  /** Optional external URL (e.g. Google Doc link); when set, document is a link to this URL */
  url?: string | null;
}

// Google Docs integration helpers
const GOOGLE_DOC_REGEX =
  /^https:\/\/(?:www\.)?docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/;

export function isGoogleDocUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  return GOOGLE_DOC_REGEX.test(url.trim());
}

/** Get embeddable preview URL for a Google Doc (for iframe). */
export function getGoogleDocEmbedUrl(url: string): string {
  const m = url.trim().match(GOOGLE_DOC_REGEX);
  if (!m) return url;
  return `https://docs.google.com/document/d/${m[1]}/preview`;
}

// ═══════════════════════════════════════════════════════════════
// API Service Class
// ═══════════════════════════════════════════════════════════════

class ApiService {
  private getToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("accessToken");
    }
    return null;
  }

  private getHeaders(): HeadersInit {
    const token = this.getToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    
    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }
    
    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    try {
      const url = `${API_BASE_URL}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers,
        cache: "no-cache", // Prevent caching issues
      });
      console.debug("API Request:", options.method || "GET", url);
      console.log("response", response);

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response from:", url);
        console.error("Response:", text.substring(0, 200));
        console.error("Status:", response.status);

        // If it's a 404 HTML page, the route might not be registered
        if (text.includes("Cannot GET")) {
          throw new Error(
            `API endpoint not found: ${endpoint}. The backend server may need to restart.`
          );
        }

        throw new Error(
          "Backend server not available. Make sure the server is running on port 3001."
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "An error occurred");
      }

      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error(
          "Cannot connect to backend server. Make sure it is running on http://localhost:3001"
        );
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Network error");
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Auth endpoints
  // ═══════════════════════════════════════════════════════════

  async login(
    email: string,
    password: string
  ): Promise<ApiResponse<LoginResponse>> {
    return this.request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async logout(): Promise<ApiResponse<void>> {
    return this.request<void>("/auth/logout", {
      method: "POST",
    });
  }

  async refreshToken(
    refreshToken: string
  ): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    return this.request("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request<User>("/users/me");
  }

  // ═══════════════════════════════════════════════════════════
  // User management endpoints
  // ═══════════════════════════════════════════════════════════

  async getUsers(
    page = 1,
    limit = 10
  ): Promise<{
    success: boolean;
    data: User[];
    pagination?: { total: number; page: number; totalPages: number };
  }> {
    const response = await this.request<{
      users: User[];
      total: number;
      page: number;
      totalPages: number;
    }>(`/users?page=${page}&limit=${limit}`);
    return {
      success: response.success,
      data: response.data?.users || [],
      pagination: response.data
        ? {
          total: response.data.total,
          page: response.data.page,
          totalPages: response.data.totalPages,
        }
        : undefined,
    };
  }

  async getUserById(id: string): Promise<ApiResponse<User>> {
    return this.request<User>(`/users/${id}`);
  }

  async createUser(userData: CreateUserData): Promise<ApiResponse<User>> {
    return this.request<User>("/users", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async updateUser(
    id: string,
    userData: Partial<{ name: string; email: string }>
  ): Promise<ApiResponse<User>> {
    return this.request<User>(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(userData),
    });
  }

  async updateUserRole(
    id: string,
    role: "ADMIN" | "USER"
  ): Promise<ApiResponse<User>> {
    return this.request<User>(`/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  }

  async deleteUser(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/users/${id}`, {
      method: "DELETE",
    });
  }

  async updateUserProfile(
    id: string,
    userData: Partial<{ name: string; email: string; password: string }>
  ): Promise<ApiResponse<User>> {
    return this.request<User>(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  }

  async uploadAvatar(
    id: string,
    file: File
  ): Promise<ApiResponse<{ avatarUrl: string }>> {
    const token = this.getToken();
    
    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const url = `${API_BASE_URL}/users/${id}/avatar`;
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: formData,
        cache: "no-cache",
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Invalid response from server");
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to upload avatar");
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to upload avatar");
    }
  }

  async deleteAvatar(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/users/${id}/avatar`, {
      method: "DELETE",
    });
  }

  // ═══════════════════════════════════════════════════════════
  // Invitation endpoints
  // ═══════════════════════════════════════════════════════════

  async createInvitation(
    email: string,
    role: "USER" | "ADMIN"
  ): Promise<ApiResponse<Invitation>> {
    return this.request<Invitation>("/invitations", {
      method: "POST",
      body: JSON.stringify({ email, role }),
    });
  }

  async getInvitations(): Promise<ApiResponse<Invitation[]>> {
    return this.request<Invitation[]>("/invitations");
  }

  async checkInvitations(email: string): Promise<ApiResponse<Invitation[]>> {
    return this.request<Invitation[]>(
      `/invitations/check/${encodeURIComponent(email)}`
    );
  }

  async acceptInvitation(
    id: string,
    email: string,
    password: string,
    name: string
  ): Promise<ApiResponse<{ user: User; invitation: Invitation }>> {
    return this.request<{ user: User; invitation: Invitation }>(
      `/invitations/${id}/accept`,
      {
        method: "POST",
        body: JSON.stringify({ email, password, name }),
      }
    );
  }

  async denyInvitation(
    id: string,
    email: string
  ): Promise<ApiResponse<Invitation>> {
    return this.request<Invitation>(`/invitations/${id}/deny`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async cancelInvitation(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/invitations/${id}`, {
      method: "DELETE",
    });
  }

  // ═══════════════════════════════════════════════════════════
  // Space/Workspace endpoints
  // ═══════════════════════════════════════════════════════════

  async createSpace(data: CreateSpaceData): Promise<ApiResponse<Space>> {
    return this.request<Space>("/spaces", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getSpaces(
    page = 1,
    limit = 10
  ): Promise<{
    success: boolean;
    data: Space[];
    pagination?: { total: number; page: number; totalPages: number };
  }> {
    const response = await this.request<{
      spaces: Space[];
      total: number;
      page: number;
      totalPages: number;
    }>(`/spaces?page=${page}&limit=${limit}`);
    return {
      success: response.success,
      data: response.data?.spaces || [],
      pagination: response.data
        ? {
          total: response.data.total,
          page: response.data.page,
          totalPages: response.data.totalPages,
        }
        : undefined,
    };
  }

  async getMySpaces(): Promise<ApiResponse<Space[]>> {
    return this.request<Space[]>("/spaces/my");
  }

  async getSpaceById(id: string): Promise<ApiResponse<Space>> {
    return this.request<Space>(`/spaces/${id}`);
  }

  async updateSpace(
    id: string,
    data: Partial<{ name: string; methodology: "KANBAN" | "SCRUM" }>
  ): Promise<ApiResponse<Space>> {
    return this.request<Space>(`/spaces/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteSpace(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/spaces/${id}`, {
      method: "DELETE",
    });
  }

  // ═══════════════════════════════════════════════════════════
  // Folder endpoints (workspace-scoped; documents live in folders)
  // ═══════════════════════════════════════════════════════════

  async getSpaceFolders(spaceId: string): Promise<ApiResponse<Folder[]>> {
    return this.request<Folder[]>(`/spaces/${spaceId}/folders`);
  }

  async deleteFolder(
    spaceId: string,
    folderId: string
  ): Promise<ApiResponse<void>> {
    return this.request<void>(`/spaces/${spaceId}/folders/${folderId}`, {
      method: "DELETE",
    });
  }

  // ═══════════════════════════════════════════════════════════
  // Document endpoints (folder-scoped; upload or create .doc)
  // ═══════════════════════════════════════════════════════════

  async getFolderDocuments(
    spaceId: string,
    folderId: string
  ): Promise<ApiResponse<Document[]>> {
    return this.request<Document[]>(
      `/spaces/${spaceId}/folders/${folderId}/documents`
    );
  }


  /**
   * Create a new document (e.g. .doc) in a folder with optional initial content.
   */
  async createDocument(
    spaceId: string,
    folderId: string,
    data: CreateWorkspaceDocumentData
  ): Promise<ApiResponse<Document>> {
    return this.request<Document>(
      `/spaces/${spaceId}/folders/${folderId}/documents`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  // ═══════════════════════════════════════════════════════════
  // Root-level documents (no folder selected = root)
  // ═══════════════════════════════════════════════════════════

  async getSpaceRootDocuments(spaceId: string): Promise<ApiResponse<Document[]>> {
    return this.request<Document[]>(`/spaces/${spaceId}/documents`);
  }

  async createDocumentAtRoot(
    spaceId: string,
    data: CreateWorkspaceDocumentData
  ): Promise<ApiResponse<Document>> {
    return this.request<Document>(`/spaces/${spaceId}/documents`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async uploadDocumentAtRoot(
    spaceId: string,
    file: File
  ): Promise<ApiResponse<Document>> {
    const token = this.getToken();
    const formData = new FormData();
    formData.append("file", file);
    const headers: HeadersInit = {};
    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }
    const url = `${API_BASE_URL}/spaces/${spaceId}/documents/upload`;
    const response = await fetch(url, { method: "POST", headers, body: formData });
    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      const text = await response.text();
      throw new Error(text || "Upload failed");
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Upload failed");
    return data;
  }

  async deleteRootDocument(
    spaceId: string,
    documentId: string
  ): Promise<ApiResponse<void>> {
    return this.request<void>(`/spaces/${spaceId}/documents/${documentId}`, {
      method: "DELETE",
    });
  }

  // ═══════════════════════════════════════════════════════════
  // Space member endpoints
  // ═══════════════════════════════════════════════════════════

  async addSpaceMember(
    spaceId: string,
    userId: string,
    scrumRole?: "PRODUCT_OWNER" | "SCRUM_MASTER" | "DEVELOPER"
  ): Promise<ApiResponse<SpaceMember>> {
    return this.request<SpaceMember>(`/spaces/${spaceId}/members`, {
      method: "POST",
      body: JSON.stringify({ userId, scrumRole }),
    });
  }

  async getSpaceMembers(spaceId: string): Promise<ApiResponse<SpaceMember[]>> {
    return this.request<SpaceMember[]>(`/spaces/${spaceId}/members`);
  }

  async updateMemberRole(
    spaceId: string,
    userId: string,
    scrumRole: "PRODUCT_OWNER" | "SCRUM_MASTER" | "DEVELOPER"
  ): Promise<ApiResponse<SpaceMember>> {
    return this.request<SpaceMember>(`/spaces/${spaceId}/members/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ scrumRole }),
    });
  }

  async removeSpaceMember(
    spaceId: string,
    userId: string
  ): Promise<ApiResponse<void>> {
    return this.request<void>(`/spaces/${spaceId}/members/${userId}`, {
      method: "DELETE",
    });
  }

  // ═══════════════════════════════════════════════════════════
  // Product Backlog
  // ═══════════════════════════════════════════════════════════

  async getSpaceBacklog(spaceId: string): Promise<ApiResponse<ApiBacklogItem[]>> {
    return this.request<ApiBacklogItem[]>(`/spaces/${spaceId}/backlog`);
  }

  async createBacklogItem(
    spaceId: string,
    data: CreateBacklogItemData
  ): Promise<ApiResponse<ApiBacklogItem>> {
    return this.request<ApiBacklogItem>(`/spaces/${spaceId}/backlog`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateBacklogItem(
    spaceId: string,
    itemId: string,
    data: Partial<CreateBacklogItemData>
  ): Promise<ApiResponse<ApiBacklogItem>> {
    return this.request<ApiBacklogItem>(`/spaces/${spaceId}/backlog/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteBacklogItem(
    spaceId: string,
    itemId: string
  ): Promise<ApiResponse<void>> {
    return this.request<void>(`/spaces/${spaceId}/backlog/${itemId}`, {
      method: "DELETE",
    });
  }

  async reorderBacklog(
    spaceId: string,
    itemIds: string[]
  ): Promise<ApiResponse<ApiBacklogItem[]>> {
    return this.request<ApiBacklogItem[]>(`/spaces/${spaceId}/backlog/reorder`, {
      method: "PATCH",
      body: JSON.stringify({ itemIds }),
    });
  }

  // ═══════════════════════════════════════════════════════════
  // Board (Kanban / Scrum)
  // ═══════════════════════════════════════════════════════════

  async getBoard(
    spaceId: string,
    sprintId?: string | null
  ): Promise<ApiResponse<ApiBoardResponse>> {
    const qs = sprintId ? `?sprintId=${encodeURIComponent(sprintId)}` : "";
    return this.request<ApiBoardResponse>(`/spaces/${spaceId}/board${qs}`);
  }

  async createBoardCard(
    spaceId: string,
    data: CreateBoardCardData
  ): Promise<ApiResponse<ApiBoardCard>> {
    return this.request<ApiBoardCard>(`/spaces/${spaceId}/board/cards`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateBoardCard(
    spaceId: string,
    taskId: string,
    data: { title?: string; description?: string | null; assigneeId?: string | null }
  ): Promise<ApiResponse<ApiBoardCard>> {
    return this.request<ApiBoardCard>(`/spaces/${spaceId}/board/cards/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async moveBoardCard(
    spaceId: string,
    taskId: string,
    columnId: string,
    position: number
  ): Promise<ApiResponse<void>> {
    return this.request<void>(`/spaces/${spaceId}/board/cards/${taskId}/move`, {
      method: "PATCH",
      body: JSON.stringify({ columnId, position }),
    });
  }

  async deleteBoardCard(
    spaceId: string,
    taskId: string
  ): Promise<ApiResponse<void>> {
    return this.request<void>(`/spaces/${spaceId}/board/cards/${taskId}`, {
      method: "DELETE",
    });
  }

  async addBoardColumn(
    spaceId: string,
    data: { name: string; wipLimit?: number | null; sprintId?: string | null }
  ): Promise<ApiResponse<ApiBoardColumn>> {
    return this.request<ApiBoardColumn>(`/spaces/${spaceId}/board/columns`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async renameBoardColumn(
    spaceId: string,
    columnId: string,
    name: string,
    sprintId?: string | null
  ): Promise<ApiResponse<void>> {
    return this.request<void>(`/spaces/${spaceId}/board/columns/${columnId}`, {
      method: "PATCH",
      body: JSON.stringify({ name, sprintId: sprintId ?? undefined }),
    });
  }

  async removeBoardColumn(
    spaceId: string,
    columnId: string,
    sprintId?: string | null
  ): Promise<ApiResponse<void>> {
    const qs = sprintId ? `?sprintId=${encodeURIComponent(sprintId)}` : "";
    return this.request<void>(`/spaces/${spaceId}/board/columns/${columnId}${qs}`, {
      method: "DELETE",
    });
  }

  // ═══════════════════════════════════════════════════════════
  // Git (GitHub) integration - read-only
  // ═══════════════════════════════════════════════════════════

  async getSpaceGit(spaceId: string): Promise<ApiResponse<GitInfo>> {
    return this.request<GitInfo>(`/spaces/${spaceId}/git`);
  }

  async setSpaceGit(
    spaceId: string,
    data: { gitRepoUrl: string | null }
  ): Promise<ApiResponse<{ gitRepoUrl: string | null; owner: string | null; repo: string | null }>> {
    return this.request(`/spaces/${spaceId}/git`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async getSpaceGitBranches(spaceId: string): Promise<ApiResponse<GitBranch[]>> {
    return this.request<GitBranch[]>(`/spaces/${spaceId}/git/branches`);
  }

  async getSpaceGitCommits(
    spaceId: string,
    params?: { branch?: string; per_page?: number }
  ): Promise<ApiResponse<GitCommit[]>> {
    const searchParams = new URLSearchParams();
    if (params?.branch) searchParams.set("branch", params.branch);
    if (params?.per_page != null) searchParams.set("per_page", String(params.per_page));
    const qs = searchParams.toString();
    return this.request<GitCommit[]>(
      `/spaces/${spaceId}/git/commits${qs ? `?${qs}` : ""}`
    );
  }

  async getSpaceGitCommitDetail(
    spaceId: string,
    sha: string
  ): Promise<ApiResponse<GitCommitDetail>> {
    return this.request<GitCommitDetail>(`/spaces/${spaceId}/git/commits/${encodeURIComponent(sha)}`);
  }

  async getSpaceGitPulls(spaceId: string): Promise<ApiResponse<GitPull[]>> {
    return this.request<GitPull[]>(`/spaces/${spaceId}/git/pulls`);
  }

  // ═══════════════════════════════════════════════════════════
  // Sprint endpoints (SCRUM spaces only)
  // ═══════════════════════════════════════════════════════════

  async createSprint(
    spaceId: string,
    data: CreateSprintData
  ): Promise<ApiResponse<Sprint>> {
    return this.request<Sprint>(`/spaces/${spaceId}/sprints`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getSpaceSprints(spaceId: string): Promise<ApiResponse<Sprint[]>> {
    return this.request<Sprint[]>(`/spaces/${spaceId}/sprints`);
  }

  async getActiveSprint(spaceId: string): Promise<ApiResponse<Sprint>> {
    return this.request<Sprint>(`/spaces/${spaceId}/sprints/active`);
  }

  async getSprintById(id: string): Promise<ApiResponse<Sprint>> {
    return this.request<Sprint>(`/sprints/${id}`);
  }

  async updateSprint(
    id: string,
    data: Partial<CreateSprintData>
  ): Promise<ApiResponse<Sprint>> {
    return this.request<Sprint>(`/sprints/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async updateSprintStatus(
    id: string,
    status: "PLANNING" | "ACTIVE" | "COMPLETED"
  ): Promise<ApiResponse<Sprint>> {
    return this.request<Sprint>(`/sprints/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  async deleteSprint(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/sprints/${id}`, {
      method: "DELETE",
    });
  }

  // ═══════════════════════════════════════════════════════════
  // Meeting endpoints (SCRUM spaces only)
  // ═══════════════════════════════════════════════════════════

  async createMeeting(
    spaceId: string,
    data: CreateMeetingData
  ): Promise<ApiResponse<Meeting>> {
    return this.request<Meeting>(`/spaces/${spaceId}/meetings`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getSpaceMeetings(spaceId: string): Promise<ApiResponse<Meeting[]>> {
    return this.request<Meeting[]>(`/spaces/${spaceId}/meetings`);
  }

  async getMeetingById(id: string): Promise<ApiResponse<Meeting>> {
    return this.request<Meeting>(`/meetings/${id}`);
  }

  async updateMeeting(
    id: string,
    data: Partial<CreateMeetingData>
  ): Promise<ApiResponse<Meeting>> {
    return this.request<Meeting>(`/meetings/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteMeeting(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/meetings/${id}`, {
      method: "DELETE",
    });
  }

  // ═══════════════════════════════════════════════════════════
  // Chat / Agent endpoints
  // ═══════════════════════════════════════════════════════════

  /**
   * Send message to agent with streaming response
   * Returns an async generator that yields response chunks
   */
  async *streamAgentMessage(
    agentId: "workflow_agent" | "scrum_master_agent" | "administration_agent" | "orchestrator",
    message: string,
    sessionId: string,
    context: {
      user_id: string;
      space_id: string;
      sprint_id?: string | null;
    }
  ): AsyncGenerator<string, void, unknown> {
    const AGENT_API_URL =
      process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:8000";

    try {
      const response = await fetch(`${AGENT_API_URL}/v1/agents/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: agentId,
          message,
          session_id: sessionId,
          context,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Agent API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") return;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                yield parsed.content;
              }
            } catch {
              // Skip invalid JSON
              continue;
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to communicate with agent");
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Document Management Methods
  // ═══════════════════════════════════════════════════════════════

  // Create folder
  async createFolder(spaceId: string, data: any): Promise<ApiResponse<Document>> {
    const response = await fetch(`${API_BASE_URL}/spaces/${spaceId}/documents`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ ...data, type: DocumentType.FOLDER })
    });
    return response.json();
  }

  // Upload document with file
  async uploadDocument(spaceId: string, file: File, data: Partial<CreateDocumentData>): Promise<ApiResponse<Document>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', data.name || file.name);
    formData.append('type', 'FILE');
    if (data.parentId) formData.append('parentId', data.parentId);
    if (data.visibility) formData.append('visibility', data.visibility);
    if (data.description) formData.append('description', data.description);

    const headers = this.getHeaders();
    delete (headers as Record<string, string>)['Content-Type']; // Let browser set multipart boundary

    const response = await fetch(`${API_BASE_URL}/spaces/${spaceId}/documents`, {
      method: "POST",
      headers,
      body: formData
    });
    return response.json();
  }

  // List documents in folder/root
  async listDocuments(spaceId: string, parentId?: string): Promise<ApiResponse<Document[]>> {
    const url = new URL(`${API_BASE_URL}/spaces/${spaceId}/documents`);
    if (parentId) url.searchParams.set('parentId', parentId);
    
    const response = await fetch(url.toString(), {
      headers: this.getHeaders()
    });
    return response.json();
  }

  // Get full document tree
  async getDocumentTree(spaceId: string): Promise<ApiResponse<Document[]>> {
    const response = await fetch(`${API_BASE_URL}/spaces/${spaceId}/documents/tree`, {
      headers: this.getHeaders()
    });
    return response.json();
  }

  // Get single document
  async getDocument(documentId: string): Promise<ApiResponse<Document>> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      headers: this.getHeaders()
    });
    return response.json();
  }

  // Update document metadata
  async updateDocument(documentId: string, data: UpdateDocumentData): Promise<ApiResponse<Document>> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return response.json();
  }

  // Move document to different folder
  async moveDocument(documentId: string, parentId: string | null, spaceId?: string): Promise<ApiResponse<Document>> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/move`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ parentId, spaceId })
    });
    return response.json();
  }

  // Delete document
  async deleteDocument(documentId: string): Promise<ApiResponse<void>> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      method: "DELETE",
      headers: this.getHeaders()
    });
    return response.json();
  }

  // Download document
  async downloadDocument(documentId: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/download`, {
      headers: this.getHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to download file');
    }
    
    return response.blob();
  }

  // Get document permissions
  async getDocumentPermissions(documentId: string): Promise<ApiResponse<DocumentPermission[]>> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/permissions`, {
      headers: this.getHeaders()
    });
    return response.json();
  }

  // Add/update permission
  async addDocumentPermission(documentId: string, userId: string, role: DocumentRole): Promise<ApiResponse<DocumentPermission>> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/permissions`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ userId, role })
    });
    return response.json();
  }

  // Remove permission
  async removeDocumentPermission(documentId: string, userId: string): Promise<ApiResponse<void>> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/permissions/${userId}`, {
      method: "DELETE",
      headers: this.getHeaders()
    });
    return response.json();
  }

  // ═══════════════════════════════════════════════════════════
  // Notification endpoints
  // ═══════════════════════════════════════════════════════════

  /**
   * Register FCM token for push notifications
   */
  async registerNotificationToken(
    data: RegisterTokenData
  ): Promise<ApiResponse<{ id: string; platform: string; createdAt: string }>> {
    return this.request("/notifications/register-token", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
  // ═══════════════════════════════════════════════════════════════
  // Document Review Workflow endpoints
  // ═══════════════════════════════════════════════════════════════

  async createWorkflow(data: CreateWorkflowData): Promise<ApiResponse<DocumentReviewWorkflow>> {
    return this.request<DocumentReviewWorkflow>('/workflows', {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getCreatedWorkflows(spaceId?: string): Promise<ApiResponse<DocumentReviewWorkflow[]>> {
    const url = spaceId ? `/workflows/created?spaceId=${spaceId}` : '/workflows/created';
    return this.request<DocumentReviewWorkflow[]>(url);
  }

  async getAssignedWorkflows(): Promise<ApiResponse<DocumentReviewWorkflow[]>> {
    return this.request<DocumentReviewWorkflow[]>('/workflows/assigned');
  }

  async getWorkflowById(id: string): Promise<ApiResponse<DocumentReviewWorkflow>> {
    return this.request<DocumentReviewWorkflow>(`/workflows/${id}`);
  }

  async addReviewers(workflowId: string, reviewerIds: string[]): Promise<ApiResponse<DocumentReviewWorkflow>> {
    return this.request<DocumentReviewWorkflow>(`/workflows/${workflowId}/reviewers`, {
      method: 'POST',
      body: JSON.stringify({ reviewerIds })
    });
  }

  async updateReviewStatus(workflowId: string, reviewerId: string, status: 'APPROVED' | 'REJECTED'): Promise<ApiResponse<DocumentReviewWorkflow>> {
    return this.request<DocumentReviewWorkflow>(`/workflows/${workflowId}/reviewers/${reviewerId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  async addReviewComment(workflowId: string, reviewerId: string, content: string, parentId?: string): Promise<ApiResponse<ReviewComment>> {
    return this.request<ReviewComment>(`/workflows/${workflowId}/reviewers/${reviewerId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, parentId })
    });
  }

  async inviteReviewer(email: string, name: string): Promise<ApiResponse<{ id: string; name: string; email: string; avatarUrl?: string }>> {
    return this.request<{ id: string; name: string; email: string; avatarUrl?: string }>('/workflows/invite-reviewer', {
      method: 'POST',
      body: JSON.stringify({ email, name })
    });
  }

  async deleteWorkflow(workflowId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/workflows/${workflowId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Get all notifications for the authenticated user
   */
  async getNotifications(
    unreadOnly?: boolean
  ): Promise<ApiResponse<Notification[]>> {
    const query = unreadOnly ? "?unread=true" : "";
    return this.request<Notification[]>(`/notifications${query}`);
  }

  /**
   * Mark a notification as read
   */
  async markNotificationAsRead(
    notificationId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/notifications/${notificationId}/read`, {
      method: "PATCH",
    });
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(): Promise<
    ApiResponse<{ message: string }>
  > {
    return this.request("/notifications/read-all", {
      method: "PATCH",
    });
  }

  /**
   * Delete a notification
   */
  async deleteNotification(
    notificationId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.request(`/notifications/${notificationId}`, {
      method: "DELETE",
    });
  }

  /**
   * Delete all notifications
   */
  async deleteAllNotifications(): Promise<
    ApiResponse<{ message: string }>
  > {
    return this.request("/notifications", {
      method: "DELETE",
    });
  }

  /**
   * Send a test notification (for testing)
   */
  async sendTestNotification(
    type?: number
  ): Promise<ApiResponse<{ message: string; jobId: string }>> {
    return this.request("/notifications/test", {
      method: "POST",
      body: JSON.stringify({ type }),
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// Document Management Types
// ═══════════════════════════════════════════════════════════════

export enum DocumentType {
  FOLDER = "FOLDER",
  FILE = "FILE"
}

export enum DocumentRole {
  OWNER = "OWNER",
  EDITOR = "EDITOR",
  VIEWER = "VIEWER"
}

export enum DocumentVisibility {
  PUBLIC = "PUBLIC",
  PRIVATE = "PRIVATE"
}

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  spaceId: string;
  parentId?: string | null;
  path: string;
  visibility: DocumentVisibility;
  createdBy: string;
  description?: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  parent?: {
    id: string;
    name: string;
  } | null;
  permissions?: DocumentPermission[];
  _count?: {
    children: number;
    comments: number;
  };
}

export interface DocumentPermission {
  id: string;
  documentId: string;
  userId: string;
  role: DocumentRole;
  grantedBy: string;
  grantedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

export interface CreateDocumentData {
  name: string;
  type: DocumentType;
  parentId?: string;
  visibility?: DocumentVisibility;
  description?: string;
}

export interface UpdateDocumentData {
  name?: string;
  description?: string;
  visibility?: DocumentVisibility;
}

export const api = new ApiService();

// Workflow Types
export interface DocumentReviewWorkflow {
  id: string;
  title: string;
  description?: string;
  documentUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  spaceId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  status: string; // derived from reviewers
  reviewers?: DocumentReviewer[];
  creator?: User;
}

export interface DocumentReviewer {
  id: string;
  workflowId: string;
  reviewerId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  viewedAt?: string;
  reviewedAt?: string;
  reviewer?: User;
  comments?: ReviewComment[];
}

export interface ReviewComment {
  id: string;
  content: string;
  userId: string;
  authorId?: string;
  parentId?: string;
  createdAt: string;
  author?: User;
  replies?: ReviewComment[];
}

export interface CreateWorkflowData {
  title: string;
  description?: string;
  documentUrl: string; // The URL returned from file upload
  fileName: string;
  fileSize: number;
  mimeType: string;
  spaceId?: string;
  reviewerIds: string[];
}

export type {
  User,
  CreateUserData,
  ApiResponse,
  LoginResponse,
  Space,
  CreateSpaceData,
  SpaceMember,
  Invitation,
  Sprint,
  CreateSprintData,
  Meeting,
  MeetingType,
  CreateMeetingData,
};
