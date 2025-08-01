export const BASE_URL = "http://localhost:8000/api";
export const image_url = "http://localhost:8000";
export const api_url = {
  BASE_URL: BASE_URL,
  login: BASE_URL + "/login",
  register: BASE_URL + "/register",
  createProject: BASE_URL + "/projects/add",
  addEmployee: BASE_URL + "/employees/addEmployee",
  employeeFirstLogin: BASE_URL + "/employees/employeeFirstLogin",
  getAllEmployees: BASE_URL + "/employees/all",
  getAllProjects: BASE_URL + "/projects",
  deleteEmployee: BASE_URL + "/employees/deleteEmployee/:teamMemberId",
  updateTeamMember: BASE_URL + "/employees/editEmployee/:teamMemberId",
  getRecentActivity: BASE_URL + "/activity/recent",
  getAllTeamLeads: BASE_URL + "/teams/team-leads",
  getAllTeamMembers: BASE_URL + "/teams/team-members",
  getAllTeams: BASE_URL + "/teams/all-teams",
  createTeam: BASE_URL + "/teams/createTeam",
  deleteTeam: BASE_URL + "/teams/deleteTeam",
  deleteProject: BASE_URL + "/projects/:projectId",
  updateProject: BASE_URL + "/projects/:projectId",
  updateTeam: BASE_URL + "/teams/updateTeam",
  getTeamMember: BASE_URL + "/employees/team-members",
  createTask: BASE_URL + "/tasks/createTask",
  getAllTasks: BASE_URL + "/tasks/all",
  getOngoingTasks: BASE_URL + "/tasks/ongoing",
  getTaskHistory: BASE_URL + "/tasks/history/", // append memberId
  updateTask: BASE_URL + "/tasks/update/", // append taskId or memberId
  deleteTask: BASE_URL + "/tasks/delete/", // append taskId or memberId
  updateTaskById: BASE_URL + "/tasks/updateTask/", // append taskId
  deleteTaskById: BASE_URL + "/tasks/deleteTask/", // append taskId
  addTask: BASE_URL + "/tasks/createTask",
  getProjectsByTeamMember: BASE_URL + "/projects/team-member/", // append teamMemberId/projects
  getTasksByMemberInProject: BASE_URL + "/tasks/", // append teamMemberId/project/projectId
  // Settings endpoints
  changePassword: BASE_URL + "/profile/change-password",
  updateNotificationSettings: BASE_URL + "/settings/notifications",
  updateAppearanceSettings: BASE_URL + "/settings/appearance",
  updateSecuritySettings: BASE_URL + "/settings/security",
  updatePrivacySettings: BASE_URL + "/settings/privacy",
  // 2FA endpoints
  generateTwoFactorSetup: BASE_URL + "/2fa/setup",
  enableTwoFactor: BASE_URL + "/2fa/enable",
  disableTwoFactor: BASE_URL + "/2fa/disable",
  verifyTwoFactorToken: BASE_URL + "/2fa/verify",
  getTrustedDevices: BASE_URL + "/2fa/trusted-devices",
  removeTrustedDevice: BASE_URL + "/2fa/trusted-devices/", // append deviceId
  getBackupCodes: BASE_URL + "/2fa/backup-codes",
  regenerateBackupCodes: BASE_URL + "/2fa/regenerate-backup-codes",
  validateDeviceToken: BASE_URL + "/2fa/validate-device",
};

export const Methods = {
  Post: "post",
  Get: "get",
  Put: "put",
  Delete: "delete",
};
