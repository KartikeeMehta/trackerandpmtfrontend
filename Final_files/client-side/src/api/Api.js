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
  getAllRoles: BASE_URL + "/employees/roles",
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
  permanentlyDeleteProject: BASE_URL + "/projects/:projectId/permanent",
  updateProject: BASE_URL + "/projects/:projectId",
  updateTeam: BASE_URL + "/teams/updateTeam",
  getTeamMember: BASE_URL + "/employees/team-members",
  getProjectsByTeamMember: BASE_URL + "/projects/team-member/", // append teamMemberId/projects
  forget_pass: BASE_URL + "/otp/forgot-password",
  verify_Otp: BASE_URL + "/otp/verify-otp",
  reset_Password: BASE_URL + "/otp/reset-password",
  // --- Added for Phases & Subtasks ---
  addPhase: BASE_URL + "/projects/add-phase", // POST
  updatePhaseStatus: BASE_URL + "/projects/update-phase-status", // POST
  editPhase: BASE_URL + "/projects/edit-phase", // POST
  deletePhase: BASE_URL + "/projects/delete-phase", // POST (not DELETE)
  getPhases: BASE_URL + "/projects/phases/", // append :projectId (GET)
  getSubtasks: BASE_URL + "/projects/subtasks/", // append :project_id (GET)
  addSubtask: BASE_URL + "/projects/subtask/add", // POST
  updateSubtaskStatus: BASE_URL + "/projects/subtask/update-status", // POST
  editSubtask: BASE_URL + "/projects/subtask/edit", // POST
  deleteSubtask: BASE_URL + "/projects/subtask/delete", // POST
  getSubtaskActivity: BASE_URL + "/projects/subtask/activity",
  // --- Project Summary ---
  projects: BASE_URL + "/projects",
  projectSummaryActivity: BASE_URL + "/projects/summary/activity/", // append :projectId
  // --- Added for Phase Comments ---
  addPhaseComment: BASE_URL + "/projects/", // append :projectId/phases/:phaseId/comments (POST)
  getPhaseComments: BASE_URL + "/projects/", // append :projectId/phases/:phaseId/comments (GET)
  // --- Added for Chat ---
  sendMessage: BASE_URL + "/chat/send",
  getMessages: BASE_URL + "/chat",
  change_Password: BASE_URL + "/change-password",
  // --- Notifications ---
  getMyNotifications: BASE_URL + "/notifications/mine",
  getUnreadCount: BASE_URL + "/notifications/unread-count",
  markNotifRead: BASE_URL + "/notifications/", // append :id/read
  markAllNotifRead: BASE_URL + "/notifications/read-all",
  clearAllNotif: BASE_URL + "/notifications/clear-all",
  deleteNotification: BASE_URL + "/notifications/", // append :id
  cleanupReadNotifications: BASE_URL + "/notifications/cleanup-read",
  getMyNotifPrefs: BASE_URL + "/notifications/preferences/mine",
  updateMyNotifPrefs: BASE_URL + "/notifications/preferences/mine",
  // --- Tracker Pairing ---
  pairing_generate: BASE_URL + "/pairing/generate",
  pairing_verify: BASE_URL + "/pairing/verify",
  checkPairingStatus: BASE_URL + "/pairing/status",
  disconnectTracker: BASE_URL + "/pairing/disconnect",
  // --- Employee Tracker ---
  employeeTrackerStatus: BASE_URL + "/employee-tracker/status",
  employeeTrackerDailySummary: BASE_URL + "/employee-tracker/summary/daily",
  employeeTrackerMonthlySummary: BASE_URL + "/employee-tracker/summary/monthly",
  employeeTrackerLeaderboard:
    BASE_URL + "/employee-tracker/leaderboard/monthly",
  employeeTrackerBreaks: BASE_URL + "/employee-tracker/breaks",
  // --- HR Attendance ---
  hrAttendance: BASE_URL + "/employee-tracker/attendance",
  // --- HR Settings ---
  hrSettings: BASE_URL + "/hr-settings",
};

export const Methods = {
  Post: "post",
  Get: "get",
  Put: "put",
  Delete: "delete",
};
