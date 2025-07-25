import React, { useEffect, useState, useMemo } from "react";
import { Users, Briefcase, CheckCircle, Clock } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";
import dayjs from "dayjs";
// Colors and math constants
const colors = ["#4285F4", "#34A853", "#FBBC05", "#EA4335", "#9C27B0"];
const RADIAN = Math.PI / 180;
// Pie chart data
const projectStatusData = [
  { name: "Active", value: 30 },
  { name: "Completed", value: 25 },
  { name: "On Hold", value: 15 },
  { name: "Cancelled", value: 25 },
];
const teamPerformanceData = [
  { name: "Frontend", value: 35 },
  { name: "Backend", value: 30 },
  { name: "Shopify", value: 10 },
  { name: "WordPress", value: 15 },
  { name: "BD", value: 10 },
];
// :brain: Local quote generator (employee motivation & focus)
const motivationalQuotes = [
  "Your dedication today builds our success tomorrow.",
  "Teamwork divides the task and multiplies the success.",
  "Stay focused, stay positive, and keep moving forward.",
  "Every small effort counts towards big achievements.",
  "Your work makes a difference—keep it up!",
  "Collaboration is the key to innovation.",
  "Growth happens when we step out of our comfort zone.",
  "Success is the sum of small efforts repeated daily.",
  "Motivation gets you started, habit keeps you going.",
  "Together, we achieve more than we ever could alone.",
  "Your focus determines your reality.",
  "Great things never come from comfort zones.",
  "Believe in yourself and all that you are capable of.",
  "Progress, not perfection.",
  "Your energy is contagious—spread positivity!",
];
const generateQuote = () => {
  return motivationalQuotes[
    Math.floor(Math.random() * motivationalQuotes.length)
  ];
};

// Quick Tips for productivity/teamwork
const quickTips = [
  "Take short breaks to boost productivity.",
  "Communicate openly with your team.",
  "Set daily goals and prioritize tasks.",
  "Celebrate small wins together.",
  "Share feedback constructively.",
  "Stay organized with to-do lists.",
  "Support your teammates when needed.",
  "Keep learning and improving your skills.",
  "Ask questions—curiosity drives growth.",
  "Balance work and rest for long-term success.",
];

// :brain: Memoized chart block
const ChartBlock = React.memo(({ title, data }) => {
  const renderLabel = useMemo(() => {
    return ({ cx, cy, midAngle, innerRadius, outerRadius, index }) => {
      const radius = innerRadius + (outerRadius - innerRadius) * 1.2;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);
      return (
        <text
          x={x}
          y={y}
          fill={colors[index % colors.length]}
          textAnchor={x > cx ? "start" : "end"}
          dominantBaseline="central"
        >
          {`${data[index].name}: ${data[index].value}%`}
        </text>
      );
    };
  }, [data]);
  return (
    <div className="w-[100%] md:w-[48%] border border-gray-300 rounded bg-white px-3">
      <div className="font-bold py-3">
        <h2>{title}</h2>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={100}
              labelLine
              label={renderLabel}
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              formatter={(value, entry, index) => (
                <span style={{ color: colors[index % colors.length] }}>
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});
function Section_a() {
  const [quote, setQuote] = useState(generateQuote());
  const [fade, setFade] = useState(true);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tip, setTip] = useState(
    quickTips[Math.floor(Math.random() * quickTips.length)]
  );
  const [userName, setUserName] = useState("there");

  // Recent Activity State
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState("");

  // Fetch user name from localStorage (customize key as needed)
  useEffect(() => {
    // Try to get the full user object
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.firstName || user.lastName) {
          setUserName(
            `${user.firstName || ""}${
              user.lastName ? " " + user.lastName : ""
            }`.trim()
          );
        } else if (user.name) {
          setUserName(user.name);
        } else if (user.email) {
          setUserName(user.email);
        } else {
          setUserName("Owner");
        }
      } catch {
        setUserName("Owner");
      }
    } else {
      setUserName("Owner");
    }
  }, []);

  // Fetch quote from API, fallback to local
  const fetchQuote = async () => {
    try {
      const res = await fetch(
        "https://api.quotable.io/random?tags=motivational|inspirational"
      );
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      return data.content;
    } catch {
      return generateQuote();
    }
  };

  useEffect(() => {
    let isMounted = true;
    const updateQuoteAndTip = async () => {
      setFade(false);
      setTimeout(async () => {
        const newQuote = await fetchQuote();
        if (isMounted) {
          setQuote(newQuote);
          setTip(quickTips[Math.floor(Math.random() * quickTips.length)]);
          setFade(true);
        }
      }, 300);
    };
    const interval = setInterval(updateQuoteAndTip, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      try {
        const response = await apiHandler.GetApi(api_url.getAllProjects, token);
        if (Array.isArray(response.projects)) {
          setProjects(response.projects);
        } else {
          setError(response?.message || "Failed to fetch projects");
        }
      } catch (err) {
        setError("Failed to fetch projects");
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  // Fetch recent activity from backend
  useEffect(() => {
    const fetchActivity = async () => {
      setActivityLoading(true);
      setActivityError("");
      const token = localStorage.getItem("token");
      try {
        const res = await apiHandler.GetApi(api_url.getRecentActivity, token);
        let activities = Array.isArray(res.activities) ? res.activities : [];
        setActivity(activities);
      } catch (err) {
        setActivityError("Failed to fetch recent activity");
      } finally {
        setActivityLoading(false);
      }
    };
    fetchActivity();
  }, []);

  // Calculate project stats
  const totalProjects = projects.length;
  const activeProjects = projects.filter(
    (p) => p.project_status === "ongoing"
  ).length;
  const completedProjects = projects.filter(
    (p) => p.project_status === "completed"
  ).length;
  // No onHoldProjects
  const projectStatusData = [
    { name: "Ongoing", value: activeProjects },
    { name: "Completed", value: completedProjects },
  ];

  const [teams, setTeams] = useState([]);
  const [totalTeams, setTotalTeams] = useState(0);
  const [totalEmployees, setTotalEmployees] = useState(0);

  useEffect(() => {
    const fetchTeams = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await apiHandler.GetApi(api_url.getAllTeams, token);
        if (Array.isArray(res.teams)) {
          setTeams(res.teams);
          setTotalTeams(res.teams.length);
        }
      } catch (err) {
        // handle error
      }
    };
    fetchTeams();
  }, []);

  useEffect(() => {
    const fetchEmployees = async () => {
      const token = localStorage.getItem("token");
      try {
        const employeesRes = await apiHandler.GetApi(
          api_url.getAllEmployees,
          token
        );
        if (Array.isArray(employeesRes)) {
          setTotalEmployees(employeesRes.length);
        }
      } catch {}
    };
    fetchEmployees();
  }, []);

  // For team size graph
  const teamSizeData = teams.map((team) => ({
    name: team.teamName,
    value: (team.members ? team.members.length : 0) + (team.teamLead ? 1 : 0),
  }));

  // 3. Add a 'Tasks Overview' card
  const [tasks, setTasks] = useState([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [pendingTasks, setPendingTasks] = useState(0);
  useEffect(() => {
    const fetchTasks = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await apiHandler.GetApi(api_url.getAllTasks, token);
        if (Array.isArray(res)) {
          setTasks(res);
          setTotalTasks(res.length);
          setCompletedTasks(res.filter((t) => t.status === "completed").length);
          setPendingTasks(res.filter((t) => t.status !== "completed").length);
        }
      } catch {}
    };
    fetchTasks();
  }, []);

  // 4. Add an 'Employee Distribution' pie chart (by role)
  const [employeeRoles, setEmployeeRoles] = useState({});
  useEffect(() => {
    const fetchEmployees = async () => {
      const token = localStorage.getItem("token");
      try {
        const employeesRes = await apiHandler.GetApi(
          api_url.getAllEmployees,
          token
        );
        if (Array.isArray(employeesRes)) {
          const roles = employeesRes.reduce((acc, emp) => {
            acc[emp.role] = (acc[emp.role] || 0) + 1;
            return acc;
          }, {});
          setEmployeeRoles(roles);
        }
      } catch {}
    };
    fetchEmployees();
  }, []);
  const employeeRoleData = Object.entries(employeeRoles).map(
    ([role, count]) => ({ name: role, value: count })
  );

  // 5. Add an 'Upcoming Project Deadlines' section
  const upcomingProjects = projects
    .filter((p) => p.end_date && dayjs(p.end_date).isAfter(dayjs()))
    .sort((a, b) => dayjs(a.end_date).diff(dayjs(b.end_date)))
    .slice(0, 5);

  // 6. Add a 'Top Performer' card if task data is available
  const topPerformer = useMemo(() => {
    if (!Array.isArray(tasks) || tasks.length === 0) return null;
    const completedBy = {};
    tasks.forEach((t) => {
      if (t.status === "completed") {
        completedBy[t.assignedTo] = (completedBy[t.assignedTo] || 0) + 1;
      }
    });
    const top = Object.entries(completedBy).sort((a, b) => b[1] - a[1])[0];
    return top ? { memberId: top[0], count: top[1] } : null;
  }, [tasks]);

  return (
    <div className="max-w-[1440px] bg-white m-auto p-6 min-h-screen">
      {/* Greeting */}
      <div className="font-bold py-3 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl md:text-4xl text-gray-800 drop-shadow-sm">
            Welcome back, <span className="text-blue-700">{userName}</span>!
          </h2>
          <p className="text-base text-gray-600 mt-1">
            Here’s an overview of your company’s performance.
          </p>
        </div>
        {/* Motivational Quote Card */}
        <div
          className={`transition-opacity duration-500 ease-in-out ${
            fade ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="bg-gray-50 shadow rounded px-6 py-4 mt-4 md:mt-0 border max-w-md mx-auto">
            <span className="block text-gray-500 font-semibold mb-2">
              For You & Your Team
            </span>
            <p className="text-gray-800 italic font-medium text-lg">
              “{quote}”
            </p>
          </div>
        </div>
      </div>
      {/* Quick Tips Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between my-4 gap-4">
        <div className="bg-gray-100 rounded shadow px-5 py-3 flex items-center w-full md:w-auto border">
          <span className="text-gray-700 font-bold mr-3">💡 Quick Tip:</span>
          <span className="text-gray-700 font-medium">{tip}</span>
        </div>
      </div>

      {/* Project Stats Cards */}
      <div className="flex flex-wrap xl:gap-6 gap-6 2xl:justify-between justify-start">
        <div className="flex border rounded bg-gradient-to-br from-blue-50 to-blue-100 py-3 px-3 w-full sm:w-[48%] md:w-[31%] xl:w-[18%] shadow-sm hover:shadow-lg transition">
          <div className="w-full">
            <p className="font-semibold text-gray-700">Total Team</p>
            <p className="font-bold text-2xl text-gray-800">{totalTeams}</p>
            <p className="text-gray-400">{totalEmployees} employees</p>
          </div>
          <Users className="h-6 w-6 text-blue-400" />
        </div>
        <div className="flex border rounded bg-gradient-to-br from-green-50 to-green-100 py-3 px-3 w-full sm:w-[48%] md:w-[31%] xl:w-[18%] shadow-sm hover:shadow-lg transition">
          <div className="w-full">
            <p className="font-semibold text-gray-700">Total Projects</p>
            <p className="font-bold text-2xl text-gray-800">{totalProjects}</p>
            <p className="text-gray-400">All Projects (including completed)</p>
          </div>
          <Briefcase className="h-6 w-6 text-green-400" />
        </div>
        <div className="flex border rounded bg-gradient-to-br from-yellow-50 to-yellow-100 py-3 px-3 w-full sm:w-[48%] md:w-[31%] xl:w-[18%] shadow-sm hover:shadow-lg transition">
          <div className="w-full">
            <p className="font-semibold text-gray-700">Active Projects</p>
            <p className="font-bold text-2xl text-gray-800">{activeProjects}</p>
            <p className="text-gray-400">Currently being worked on</p>
          </div>
          <Clock className="h-6 w-6 text-yellow-400" />
        </div>
        <div className="flex border rounded bg-gradient-to-br from-purple-50 to-purple-100 py-3 px-3 w-full sm:w-[48%] md:w-[31%] xl:w-[18%] shadow-sm hover:shadow-lg transition">
          <div className="w-full">
            <p className="font-semibold text-gray-700">Completed Projects</p>
            <p className="font-bold text-2xl text-gray-800">
              {completedProjects}
            </p>
            <p className="text-gray-400">Finished Projects</p>
          </div>
          <CheckCircle className="h-6 w-6 text-purple-400" />
        </div>
        <div className="flex border rounded bg-gradient-to-br from-pink-50 to-pink-100 py-3 px-3 w-full sm:w-[48%] md:w-[31%] xl:w-[18%] shadow-sm hover:shadow-lg transition">
          <div className="w-full">
            <p className="font-semibold text-gray-700">Tasks Overview</p>
            <p className="font-bold text-2xl text-gray-800">{totalTasks}</p>
            <p className="text-gray-400">
              {completedTasks} completed, {pendingTasks} pending
            </p>
          </div>
          <CheckCircle className="h-6 w-6 text-pink-400" />
        </div>
        {topPerformer && (
          <div className="flex border rounded bg-gradient-to-br from-indigo-50 to-indigo-100 py-3 px-3 w-full sm:w-[48%] md:w-[31%] xl:w-[18%] shadow-sm hover:shadow-lg transition">
            <div className="w-full">
              <p className="font-semibold text-gray-700">Top Performer</p>
              <p className="font-bold text-2xl text-gray-800">
                {topPerformer.memberId}
              </p>
              <p className="text-gray-400">
                {topPerformer.count} tasks completed
              </p>
            </div>
            <Users className="h-6 w-6 text-indigo-400" />
          </div>
        )}
      </div>
      {/* Recent Activity Section */}
      <div className="mt-6">
        <div className="bg-white border rounded shadow px-6 py-4 overflow-y-scroll max-h-[300px]">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Recent Activity
          </h3>
          {activityLoading ? (
            <div className="text-gray-500">Loading activity...</div>
          ) : activityError ? (
            <div className="text-red-600">{activityError}</div>
          ) : activity.length === 0 ? (
            <div className="text-gray-500">No recent activity found.</div>
          ) : (
            <ul className="text-gray-600 text-sm space-y-2">
              {activity.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 border-b last:border-b-0 py-2"
                >
                  <span
                    className={`font-bold ${
                      item.type === "Project"
                        ? "text-blue-600"
                        : item.type === "Task"
                        ? "text-green-600"
                        : item.type === "Employee"
                        ? "text-purple-600"
                        : "text-pink-600"
                    }`}
                  >
                    {item.type}
                  </span>
                  <div className="flex-1">
                    <span className="font-medium text-gray-800">
                      {item.name}
                    </span>
                    <span className="ml-2 text-xs text-gray-400">
                      [{item.action}]
                    </span>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {item.description}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      By: {item.performedBy || "Unknown"}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {item.timestamp
                      ? dayjs(item.timestamp).format("MMM D, YYYY h:mm A")
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {/* Charts Section */}
      <div className="flex justify-between my-6 flex-wrap gap-4">
        <ChartBlock
          title="Project Status Distribution"
          data={projectStatusData}
        />
        <ChartBlock title="Team Performance" data={teamPerformanceData} />
        <ChartBlock title="Team Sizes" data={teamSizeData} />
        <ChartBlock title="Employee Distribution" data={employeeRoleData} />
      </div>
      {/* Upcoming Project Deadlines section */}
      <div className="mt-6">
        <div className="bg-white border rounded shadow px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Upcoming Project Deadlines
          </h3>
          {upcomingProjects.length === 0 ? (
            <div className="text-gray-500">No upcoming deadlines.</div>
          ) : (
            <ul className="text-gray-600 text-sm space-y-2">
              {upcomingProjects.map((p, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-3 border-b last:border-b-0 py-2"
                >
                  <span className="font-bold text-blue-600">
                    {p.project_name}
                  </span>
                  <span className="text-xs text-gray-400">
                    Due: {dayjs(p.end_date).format("MMM D, YYYY")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {/* Error/Loading States */}
      {loading ? (
        <div className="text-center text-gray-500">Loading projects...</div>
      ) : error ? (
        <div className="text-center text-red-600">{error}</div>
      ) : null}
    </div>
  );
}
export default Section_a;
