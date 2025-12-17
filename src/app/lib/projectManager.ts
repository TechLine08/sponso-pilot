import type { Project, ProjectData, Company, SendLog } from "@/types";

const PROJECTS_KEY = "sponso_projects";
const CURRENT_PROJECT_KEY = "sponso_current_project";

export function getAllProjects(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(PROJECTS_KEY);
    return saved ? (JSON.parse(saved) as Project[]) : [];
  } catch {
    return [];
  }
}

export function getCurrentProjectId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(CURRENT_PROJECT_KEY);
  } catch {
    return null;
  }
}

export function setCurrentProjectId(projectId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (projectId) {
      localStorage.setItem(CURRENT_PROJECT_KEY, projectId);
    } else {
      localStorage.removeItem(CURRENT_PROJECT_KEY);
    }
  } catch {
    // Ignore errors
  }
}

export function createProject(name: string): Project {
  const project: Project = {
    id: `project_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const projects = getAllProjects();
  projects.push(project);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));

  // Initialize empty project data
  const projectData: ProjectData = {
    companies: [],
    reasoning: {},
    logs: [],
    emailTemplate: {
      from: "no-reply@example.com",
      subject: "",
      body: `Hi [[Company Name]],

I'm reaching out regarding a potential sponsorship opportunity.
We think your work in [[Company Industry]] aligns well with our audience.

Would you be open to a quick chat? Happy to share details.

Best,
Your Name
Your Org`,
    },
  };
  saveProjectData(project.id, projectData);

  return project;
}

export function updateProject(projectId: string, updates: Partial<Project>): void {
  const projects = getAllProjects();
  const index = projects.findIndex((p) => p.id === projectId);
  if (index !== -1) {
    projects[index] = {
      ...projects[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  }
}

export function deleteProject(projectId: string): void {
  const projects = getAllProjects().filter((p) => p.id !== projectId);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));

  // Delete project data
  localStorage.removeItem(`sponso_project_${projectId}`);

  // If deleting current project, clear current project
  if (getCurrentProjectId() === projectId) {
    setCurrentProjectId(null);
  }
}

export function getProjectData(projectId: string): ProjectData {
  if (typeof window === "undefined") {
    return getDefaultProjectData();
  }
  try {
    const saved = localStorage.getItem(`sponso_project_${projectId}`);
    if (saved) {
      const data = JSON.parse(saved) as ProjectData;
      // Merge companies with reasoning
      const companiesWithReasoning = data.companies.map((c) => ({
        ...c,
        reasoning: data.reasoning[c.email] || c.reasoning || "",
      }));
      return {
        ...data,
        companies: companiesWithReasoning,
      };
    }
  } catch {
    // Ignore errors
  }
  return getDefaultProjectData();
}

export function saveProjectData(projectId: string, data: ProjectData): void {
  if (typeof window === "undefined") return;
  try {
    // Extract reasoning from companies
    const reasoning: Record<string, string> = {};
    data.companies.forEach((c) => {
      if (c.reasoning) {
        reasoning[c.email] = c.reasoning;
      }
    });

    // Save with reasoning separated
    const dataToSave: ProjectData = {
      ...data,
      companies: data.companies.map(({ reasoning: _, ...c }) => c),
      reasoning,
    };

    localStorage.setItem(`sponso_project_${projectId}`, JSON.stringify(dataToSave));
  } catch {
    // Ignore errors
  }
}

function getDefaultProjectData(): ProjectData {
  return {
    companies: [],
    reasoning: {},
    logs: [],
    emailTemplate: {
      from: "no-reply@example.com",
      subject: "",
      body: `Hi [[Company Name]],

I'm reaching out regarding a potential sponsorship opportunity.
We think your work in [[Company Industry]] aligns well with our audience.

Would you be open to a quick chat? Happy to share details.

Best,
Your Name
Your Org`,
    },
  };
}

// Migration: Convert old localStorage data to a default project
export function migrateToProjects(): string | null {
  if (typeof window === "undefined") return null;

  const projects = getAllProjects();
  if (projects.length > 0) {
    // Already migrated
    return getCurrentProjectId() || projects[0]?.id || null;
  }

  // Check if old data exists
  const hasOldLogs = localStorage.getItem("sponso_logs");
  const hasOldReasoning = localStorage.getItem("sponso_company_reasoning");

  if (!hasOldLogs && !hasOldReasoning) {
    // No old data, create a default project
    const defaultProject = createProject("My First Project");
    setCurrentProjectId(defaultProject.id);
    return defaultProject.id;
  }

  // Migrate old data to a default project
  const defaultProject = createProject("Migrated Project");
  setCurrentProjectId(defaultProject.id);

  try {
    const oldLogs = hasOldLogs ? (JSON.parse(hasOldLogs) as SendLog[]) : [];
    const oldReasoning = hasOldReasoning
      ? (JSON.parse(hasOldReasoning) as Record<string, string>)
      : {};

    const projectData: ProjectData = {
      companies: [],
      reasoning: oldReasoning,
      logs: oldLogs,
      emailTemplate: {
        from: "no-reply@example.com",
        subject: "",
        body: `Hi [[Company Name]],

I'm reaching out regarding a potential sponsorship opportunity.
We think your work in [[Company Industry]] aligns well with our audience.

Would you be open to a quick chat? Happy to share details.

Best,
Your Name
Your Org`,
      },
    };

    saveProjectData(defaultProject.id, projectData);

    // Clear old data
    localStorage.removeItem("sponso_logs");
    localStorage.removeItem("sponso_company_reasoning");
  } catch {
    // Ignore migration errors
  }

  return defaultProject.id;
}

