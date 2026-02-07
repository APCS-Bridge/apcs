/**
 * Git service - GitHub API proxy for workspace-linked repos (read-only)
 */
import { Octokit } from '@octokit/rest';
import * as spaceService from './space.service';

const GITHUB_REPO_URL_REGEX =
  /^https:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\/)?(?:\.git)?$/i;

export function parseGitHubRepoUrl(url: string): { owner: string; repo: string } | null {
  const m = url.trim().match(GITHUB_REPO_URL_REGEX);
  if (!m || !m[1] || !m[2]) return null;
  return { owner: m[1], repo: m[2] };
}

function getOctokit(): Octokit {
  const token = process.env.GITHUB_TOKEN;
  return new Octokit(token ? { auth: token } : {});
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

export interface GitInfo {
  gitRepoUrl: string | null;
  owner: string | null;
  repo: string | null;
  /** false when GitHub returns 404/403 (repo missing or private without token) */
  repoAccessible?: boolean;
}

/**
 * Get Git link info for a space (URL and parsed owner/repo).
 * Probes GitHub to set repoAccessible when a repo is linked.
 */
export async function getGitInfo(spaceId: string): Promise<GitInfo> {
  const space = await spaceService.getSpaceById(spaceId);
  if (!space || !space.gitRepoUrl) {
    return { gitRepoUrl: null, owner: null, repo: null };
  }
  const parsed = parseGitHubRepoUrl(space.gitRepoUrl);
  if (!parsed) {
    return { gitRepoUrl: space.gitRepoUrl, owner: null, repo: null };
  }

  const base: GitInfo = {
    gitRepoUrl: space.gitRepoUrl,
    owner: parsed.owner,
    repo: parsed.repo,
  };

  try {
    const octokit = getOctokit();
    await octokit.repos.get({ owner: parsed.owner, repo: parsed.repo });
    return { ...base, repoAccessible: true };
  } catch (err) {
    if (isGitHubNotFoundOrForbidden(err)) {
      return { ...base, repoAccessible: false };
    }
    return { ...base, repoAccessible: false };
  }
}

function isGitHubNotFoundOrForbidden(err: unknown): boolean {
  const e = err as { status?: number; response?: { status?: number } };
  const status = e?.status ?? e?.response?.status;
  return status === 404 || status === 403;
}

/**
 * Get branches for the workspace's linked GitHub repo.
 * Returns [] if repo is not found, private (no token), or API errors.
 */
export async function getBranches(spaceId: string): Promise<GitBranch[]> {
  const space = await spaceService.getSpaceById(spaceId);
  if (!space || !space.gitRepoUrl) {
    return [];
  }
  const parsed = parseGitHubRepoUrl(space.gitRepoUrl);
  if (!parsed) return [];

  try {
    const octokit = getOctokit();
    const { data } = await octokit.repos.listBranches({
      owner: parsed.owner,
      repo: parsed.repo,
      per_page: 30,
    });
    return data.map((b) => ({
      name: b.name,
      commitSha: b.commit?.sha ?? '',
      protected: b.protected ?? false,
    }));
  } catch (err) {
    if (isGitHubNotFoundOrForbidden(err)) return [];
    throw err;
  }
}

/**
 * Get recent commits for the workspace's linked GitHub repo.
 * Returns [] if repo is not found, private (no token), or API errors.
 */
export async function getCommits(
  spaceId: string,
  branch?: string,
  perPage: number = 20
): Promise<GitCommit[]> {
  const space = await spaceService.getSpaceById(spaceId);
  if (!space || !space.gitRepoUrl) {
    return [];
  }
  const parsed = parseGitHubRepoUrl(space.gitRepoUrl);
  if (!parsed) return [];

  try {
    const octokit = getOctokit();
    const params: { owner: string; repo: string; per_page: number; sha?: string } = {
      owner: parsed.owner,
      repo: parsed.repo,
      per_page: perPage,
    };
    if (branch) params.sha = branch;
    const { data } = await octokit.repos.listCommits(params);
    return data.map((c) => ({
      sha: c.sha,
      message: c.commit?.message ?? '',
      authorName: c.commit?.author?.name ?? c.author?.login ?? 'Unknown',
      authorDate: c.commit?.author?.date ?? '',
      htmlUrl: c.html_url ?? `https://github.com/${parsed.owner}/${parsed.repo}/commit/${c.sha}`,
      parents: ((c as { parents?: { sha?: string }[] }).parents ?? []).map((p: { sha?: string }) => p.sha ?? ''),
    }));
  } catch (err) {
    if (isGitHubNotFoundOrForbidden(err)) return [];
    throw err;
  }
}

/**
 * Get a single commit with file changes (patches) for the workspace's linked repo.
 */
export async function getCommitDetail(spaceId: string, sha: string): Promise<GitCommitDetail | null> {
  const space = await spaceService.getSpaceById(spaceId);
  if (!space || !space.gitRepoUrl) return null;
  const parsed = parseGitHubRepoUrl(space.gitRepoUrl);
  if (!parsed) return null;

  try {
    const octokit = getOctokit();
    const { data } = await octokit.repos.getCommit({
      owner: parsed.owner,
      repo: parsed.repo,
      ref: sha,
    });
    const files: GitCommitFile[] = (data.files ?? []).map((f: { filename?: string; patch?: string | null; status?: string; additions?: number; deletions?: number; changes?: number }) => ({
      filename: f.filename ?? '',
      patch: f.patch ?? null,
      status: f.status ?? 'modified',
      additions: f.additions ?? 0,
      deletions: f.deletions ?? 0,
      changes: f.changes,
    }));
    return {
      sha: data.sha,
      message: data.commit?.message ?? '',
      authorName: data.commit?.author?.name ?? data.author?.login ?? 'Unknown',
      authorDate: data.commit?.author?.date ?? '',
      htmlUrl: data.html_url ?? `https://github.com/${parsed.owner}/${parsed.repo}/commit/${data.sha}`,
      files,
      stats: data.stats ? { additions: data.stats.additions ?? 0, deletions: data.stats.deletions ?? 0, total: data.stats.total ?? 0 } as { additions: number; deletions: number; total: number } : undefined,
    };
  } catch (err) {
    if (isGitHubNotFoundOrForbidden(err)) return null;
    throw err;
  }
}

/**
 * Get open pull requests for the workspace's linked GitHub repo.
 * Returns [] if repo is not found, private (no token), or API errors.
 */
export async function getPulls(spaceId: string): Promise<GitPull[]> {
  const space = await spaceService.getSpaceById(spaceId);
  if (!space || !space.gitRepoUrl) {
    return [];
  }
  const parsed = parseGitHubRepoUrl(space.gitRepoUrl);
  if (!parsed) return [];

  try {
    const octokit = getOctokit();
    const { data } = await octokit.pulls.list({
      owner: parsed.owner,
      repo: parsed.repo,
      state: 'open',
    });
    return data.map((p) => ({
      number: p.number,
      title: p.title ?? '',
      state: p.state ?? 'open',
      userLogin: p.user?.login ?? 'Unknown',
      htmlUrl: p.html_url ?? `https://github.com/${parsed.owner}/${parsed.repo}/pull/${p.number}`,
    }));
  } catch (err) {
    if (isGitHubNotFoundOrForbidden(err)) return [];
    throw err;
  }
}

