import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Briefcase,
  CheckCircle,
  Clock,
  Award,
  TrendingUp,
  Target,
  CalendarDays,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  AreaChart,
  Area,
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
          {data[index] && data[index].count != null
            ? `${data[index].name}: ${data[index].count} (${data[index].value}%)`
            : `${data[index].name}: ${data[index].value}%`}
        </text>
      );
    };
  }, [data]);
  const hasValue = useMemo(() => {
    try {
      if (!Array.isArray(data)) return false;
      return data.some((d) => (d?.value || 0) > 0);
    } catch {
      return false;
    }
  }, [data]);
  return (
    <div className="w-[100%] md:w-[48%] border border-gray-300 rounded bg-white px-3 shadow-sm transition hover:shadow-md hover:border-gray-200">
      <div className="py-3">
        <h2 className="dash-section-title">{title}</h2>
      </div>
      <div className="h-[300px]">
        {hasValue ? (
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
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500 font-medium">
            No completed projects yet.
          </div>
        )}
      </div>
    </div>
  );
});

// Simple Bar chart block
const BarBlock = React.memo(({ title, data, color = "#4285F4" }) => {
  return (
    <div className="w-[100%] md:w-[48%] border border-gray-300 rounded bg-white px-3 shadow-sm transition hover:shadow-md hover:border-gray-200">
      <div className="py-3">
        <h2 className="dash-section-title">{title}</h2>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
              interval={0}
              angle={-15}
              textAnchor="end"
              height={40}
            />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

// Professional Team Sizes (horizontal) with value labels
const TeamSizesBarBlock = React.memo(({ title, data }) => {
  const sorted = useMemo(() => {
    return Array.isArray(data)
      ? [...data].sort((a, b) => (b.value || 0) - (a.value || 0))
      : [];
  }, [data]);
  const palette = ["#6FA8F9", "#8B5CF6", "#38BDF8", "#60A5FA", "#93C5FD", "#A78BFA"];
  return (
    <div className="w-[100%] md:w-[48%] border border-gray-300 rounded bg-white px-3 shadow-sm transition hover:shadow-md hover:border-gray-200">
      <div className="py-3">
        <h2 className="dash-section-title">{title}</h2>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sorted}
            margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
            layout="vertical"
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} hide />
            <YAxis
              type="category"
              dataKey="name"
              width={140}
              tick={{ fontSize: 12, fontFamily: 'Plus Jakarta Sans, Inter, ui-sans-serif, system-ui', fontWeight: 600, fill: '#334155' }}
            />
            <Tooltip cursor={{ fill: "#f1f5f9" }} wrapperStyle={{ fontFamily: 'Plus Jakarta Sans, Inter, ui-sans-serif, system-ui', fontSize: 12 }} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {sorted.map((_, i) => (
                <Cell key={i} fill={palette[i % palette.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {sorted && sorted.length > 0 && (
        <div className="px-1 pb-3 text-xs text-slate-600 font-medium">Team member counts by team</div>
      )}
    </div>
  );
});

// Comparative bar for Completed vs Pending by project (grouped, pro palette)
const StackedBarBlock = React.memo(
  ({ title, data, completedColor = "#3b82f6", pendingColor = "#8b5cf6" }) => {
    return (
      <div className="w-[100%] border border-gray-300 rounded bg-white px-3 shadow-sm transition hover:shadow-md hover:border-gray-200">
        <div className="py-3">
          <h2 className="dash-section-title">{title}</h2>
        </div>
        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }} barCategoryGap="22%" barGap={6}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 12, fontFamily: 'Plus Jakarta Sans, Inter, ui-sans-serif, system-ui', fontWeight: 600, fill: '#334155' }} />
              <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }} formatter={(val, name) => [val, name]} />
              <Legend iconType="circle" />
              <Bar dataKey="Completed" name="Completed" fill={completedColor} radius={[0, 6, 6, 0]} fillOpacity={0.9} activeBar={{ fillOpacity: 1, stroke: '#0f766e', strokeWidth: 1 }} />
              <Bar dataKey="Pending" name="Pending" fill={pendingColor} radius={[0, 6, 6, 0]} fillOpacity={0.9} activeBar={{ fillOpacity: 1, stroke: '#7c3aed', strokeWidth: 1 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {Array.isArray(data) && data.length > 0 && (
          <div className="px-1 pb-3 text-xs text-slate-600 font-medium">Subtasks status by project</div>
        )}
      </div>
    );
  }
);

// Simple Line chart block
const LineBlock = React.memo(({ title, data, color = "#EA4335" }) => {
  return (
    <div className="w-[100%] md:w-[48%] border border-gray-300 rounded bg-white px-3 shadow-sm transition hover:shadow-md hover:border-gray-200">
      <div className="py-3">
        <h2 className="dash-section-title">{title}</h2>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

// Sleek Area chart with gradient
const AreaBlock = React.memo(
  ({ title, data, color = "#34A853", gradientId = "gradArea" }) => {
    return (
      <div className="w-[100%] md:w-[48%] border border-gray-300 rounded bg-white px-3 shadow-sm transition hover:shadow-md hover:border-gray-200">
        <div className="py-3">
          <h2 className="dash-section-title">{title}</h2>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.6} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                fill={`url(#${gradientId})`}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }
);

// Donut pie with center label
const DonutBlock = React.memo(
  ({ title, data, colors = ["#34A853", "#FBBC05"], centerText = "" }) => {
    const total = (data || []).reduce((a, b) => a + (b.value || 0), 0);
    return (
      <div className="w-[100%] md:w-[48%] border border-gray-300 rounded bg-white px-3 relative shadow-sm transition hover:shadow-md hover:border-gray-200">
        <div className="py-3">
          <h2 className="dash-section-title">{title}</h2>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                innerRadius={70}
                outerRadius={110}
                dataKey="value"
                paddingAngle={3}
                startAngle={90}
                endAngle={-270}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(val, name) => [val, name]} />
              <Legend verticalAlign="bottom" iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="text-3xl font-extrabold text-gray-800">{total}</div>
            <div className="text-xs text-gray-500">{centerText || "Total"}</div>
          </div>
        </div>
      </div>
    );
  }
);
function Section_a() {
  const navigate = useNavigate();
  const [quote, setQuote] = useState(generateQuote());
  const [fade, setFade] = useState(true);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tip, setTip] = useState(
    quickTips[Math.floor(Math.random() * quickTips.length)]
  );
  const [userName, setUserName] = useState("there");
  const [userRole, setUserRole] = useState("");
  const [userType, setUserType] = useState("");

  // Recent Activity State
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState("");
  const [activityFilter, setActivityFilter] = useState("All");
  const [activitySearch, setActivitySearch] = useState("");

  // Fetch user name and role from localStorage
  useEffect(() => {
    // Try to get the full user object
    const storedUser = localStorage.getItem("user");
    const storedEmployee = localStorage.getItem("employee");
    const userType = localStorage.getItem("userType");

    setUserType(userType || "");

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
        setUserRole(user.role || "owner");
      } catch {
        setUserName("Owner");
        setUserRole("owner");
      }
    } else if (storedEmployee) {
      try {
        const employee = JSON.parse(storedEmployee);
        setUserName(employee.name || employee.email || "Employee");
        setUserRole(employee.role || "teamMember");
      } catch {
        setUserName("Employee");
        setUserRole("teamMember");
      }
    } else {
      setUserName("Owner");
      setUserRole("owner");
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
        console.error("Dashboard: Error fetching projects:", err);
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
      // Hide/skip for team lead and team member
      if (userRole === "teamLead" || userRole === "teamMember") {
        setActivity([]);
        setActivityLoading(false);
        return;
      }
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("No token found, skipping activity fetch");
        return;
      }

      setActivityLoading(true);
      setActivityError("");
      try {
        console.log("Fetching recent activity...");
        const res = await apiHandler.GetApi(api_url.getRecentActivity, token);
        console.log("Activity response:", res);
        let activities = Array.isArray(res.activities) ? res.activities : [];
        console.log("Activities found:", activities.length);

        // Filter activities based on user role
        if (userRole === "teamLead" || userRole === "teamMember") {
          const stored =
            localStorage.getItem("employee") || localStorage.getItem("user");
          if (stored) {
            try {
              const employee = JSON.parse(stored);
              const employeeName = employee.name || employee.email || "";
              const teamMemberId = employee.teamMemberId || "";
              // Build keywords to match mentions and assignments
              const keywords = [employeeName, teamMemberId]
                .filter(Boolean)
                .map((k) => k.toString().toLowerCase());

              activities = activities.filter((a) => {
                // 1) Self performed
                if (
                  a.performedBy &&
                  employeeName &&
                  a.performedBy === employeeName
                )
                  return true;

                // 2) Mentions in name/description
                const hay = `${a.name || ""} ${
                  a.description || ""
                }`.toLowerCase();
                if (keywords.some((k) => k && hay.includes(k))) return true;

                // 3) Task/Project/Employee actions implicitly involving member/team
                // Heuristic: if action text includes assigned/added/updated + member name/id
                const implicit = [
                  "assign",
                  "add",
                  "update",
                  "edit",
                  "create",
                  "status",
                  "phase",
                ].some((k) => hay.includes(k));
                if (implicit && keywords.some((k) => k && hay.includes(k)))
                  return true;

                return false;
              });
            } catch (error) {
              console.error("Error parsing employee data:", error);
            }
          }
        }

        setActivity(activities);
      } catch (err) {
        console.error("Activity fetch error:", err);
        setActivityError("Failed to fetch recent activity");
      } finally {
        setActivityLoading(false);
      }
    };

    // Add delay to ensure token is available
    setTimeout(() => {
      fetchActivity();
    }, 300);
  }, [userRole]);

  // Derive Subtask activities from current projects → phases → subtasks
  const subtaskActivities = useMemo(() => {
    try {
      // Build scopedProjects without referencing variables declared later
      let scopedProjects = projects || [];
      if (userRole === "teamLead" || userRole === "teamMember") {
        try {
          const stored = localStorage.getItem("employee") || localStorage.getItem("user");
          if (stored) {
            const emp = JSON.parse(stored);
            const tmId = emp?.teamMemberId;
            if (tmId) {
              scopedProjects = scopedProjects.filter(
                (p) => p.project_lead === tmId || (Array.isArray(p.team_members) && p.team_members.includes(tmId))
              );
            } else {
              scopedProjects = [];
            }
          }
        } catch {}
      }

      const items = [];
      (scopedProjects || []).forEach((p) => {
        (p.phases || []).forEach((ph) => {
          (ph.subtasks || []).forEach((st) => {
            const assigned = st.assigned_member || st.assignedTo || "";
            const createdAt = st.createdAt ? new Date(st.createdAt) : null;
            const updatedAt = st.updatedAt ? new Date(st.updatedAt) : null;
            const when = updatedAt || createdAt || new Date();
            const raw = String(st.status || "").toLowerCase();
            let action = "UPDATED";
            if (createdAt && (!updatedAt || Math.abs(updatedAt - createdAt) < 2000)) action = "ADDED";
            else if (raw.includes("complete")) action = "COMPLETED";
            else if (raw.includes("progress")) action = "IN PROGRESS";
            else if (raw.includes("pending")) action = "PENDING";
            items.push({
              type: "Subtask",
              name: st.subtask_title || st.title || "Subtask",
              action,
              description: `${p.project_name || "Project"} • ${ph.title || "Phase"}`,
              performedBy: typeof assigned === "object" ? (assigned.name || assigned.teamMemberId || "") : assigned,
              timestamp: when,
            });
          });
        });
      });
      // newest first
      items.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
      return items;
    } catch {
      return [];
    }
  }, [projects, userRole]);

  const filteredActivities = useMemo(() => {
    try {
      // Use derived subtask activities when Subtasks filter is active
      let list = activityFilter === "Subtasks" ? subtaskActivities.slice() : (Array.isArray(activity) ? activity.slice() : []);
      if (activityFilter !== "All") {
        const filterMap = {
          Projects: "Project",
          Subtasks: "Subtask",
          Employees: "Employee",
        };
        const target = filterMap[activityFilter] || activityFilter;
        list = list.filter((it) => String(it.type || "") === target);
      }
      if (activitySearch && activitySearch.trim()) {
        const q = activitySearch.toLowerCase();
        list = list.filter((it) =>
          `${it.type || ""} ${it.name || ""} ${it.action || ""} ${
            it.description || ""
          } ${it.performedBy || ""}`
            .toLowerCase()
            .includes(q)
        );
      }
      return list;
    } catch {
      return Array.isArray(activity) ? activity : [];
    }
  }, [activity, subtaskActivities, activityFilter, activitySearch]);

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
  const [employeesList, setEmployeesList] = useState([]);

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
          setEmployeesList(employeesRes);
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
        // Use different API based on user role
        const apiEndpoint =
          userRole === "teamLead" || userRole === "teamMember"
            ? api_url.getMyTasks
            : api_url.getAllTasks;

        const res = await apiHandler.GetApi(apiEndpoint, token);
        if (Array.isArray(res)) {
          setTasks(res);
          setTotalTasks(res.length);
          setCompletedTasks(res.filter((t) => t.status === "completed").length);
          setPendingTasks(res.filter((t) => t.status !== "completed").length);
        }
      } catch {}
    };
    fetchTasks();
  }, [userRole]);

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

  // Utility: convert count map to percentage array summing to 100
  const toPercentageArray = (nameToCountMap) => {
    const entries = Object.entries(nameToCountMap || {});
    const total = entries.reduce((sum, [, c]) => sum + (c || 0), 0);
    if (!total) return [];
    const percentValues = entries.map(([name, c]) => ({ name, count: c || 0, value: Math.round(((c || 0) / total) * 100) }));
    // Adjust rounding drift so sum == 100
    const sumPct = percentValues.reduce((s, it) => s + it.value, 0);
    const diff = 100 - sumPct;
    if (diff !== 0) {
      // Add diff to the item with max count to keep order sensible
      let maxIdx = 0;
      for (let i = 1; i < percentValues.length; i++) {
        if (percentValues[i].count > percentValues[maxIdx].count) maxIdx = i;
      }
      percentValues[maxIdx].value = Math.max(0, percentValues[maxIdx].value + diff);
    }
    return percentValues.map(({ name, value }) => ({ name, value }));
  };

  // Dynamic Employee Distribution as percentages from employees list
  const employeeDistributionPercentData = useMemo(() => {
    return toPercentageArray(employeeRoles);
  }, [employeeRoles]);

  

  // Map a teamMemberId (or already-name) to display name
  const resolveMemberName = (idOrName) => {
    if (!idOrName) return "Unassigned";
    if (typeof idOrName === "string") {
      const match = employeesList.find(
        (e) => String(e.teamMemberId) === idOrName || String(e._id) === idOrName
      );
      return match?.name || idOrName;
    }
    if (typeof idOrName === "object") {
      return (
        idOrName.name ||
        resolveMemberName(idOrName.teamMemberId || idOrName._id || "")
      );
    }
    return String(idOrName);
  };

  // Derived Subtask statistics from projects/phases/subtasks
  const {
    totalSubtasks,
    completedSubtasks,
    pendingSubtasks,
    inProgressSubtasks,
  } = useMemo(() => {
    try {
      // Determine scope based on role
      let scopedProjects = projects || [];
      let teamMemberId = null;
      if (userRole === "teamLead" || userRole === "teamMember") {
        try {
          const storedEmployee =
            localStorage.getItem("employee") || localStorage.getItem("user");
          if (storedEmployee) {
            const employee = JSON.parse(storedEmployee);
            teamMemberId = employee?.teamMemberId || null;
          }
        } catch {}
        if (teamMemberId) {
          scopedProjects = scopedProjects.filter(
            (p) =>
              p.project_lead === teamMemberId ||
              (Array.isArray(p.team_members) &&
                p.team_members.includes(teamMemberId))
          );
        } else {
          scopedProjects = [];
        }
      }

      // Exclude completed projects from subtask overview for every role
      scopedProjects = scopedProjects.filter(
        (p) => String(p.project_status || "").toLowerCase() !== "completed"
      );

      // Flatten subtasks
      const allSubtasks = [];
      scopedProjects.forEach((project) => {
        (project.phases || []).forEach((phase) => {
          (phase.subtasks || []).forEach((subtask) => {
            // Role-based subtask inclusion
            if (userRole === "teamMember") {
              // Only subtasks assigned to this team member
              const rawAssignee =
                subtask.assigned_member ?? subtask.assignedTo ?? "";
              const assignee = (
                typeof rawAssignee === "object"
                  ? rawAssignee.teamMemberId || rawAssignee.name || ""
                  : rawAssignee
              ).toString();
              const isAssigned =
                (teamMemberId && assignee === teamMemberId) ||
                (teamMemberId && assignee === teamMemberId.toString()) ||
                (userName && assignee === userName) ||
                (userName &&
                  assignee.toLowerCase &&
                  assignee.toLowerCase() === userName.toLowerCase()) ||
                (userName &&
                  assignee.toLowerCase &&
                  assignee.toLowerCase().includes(userName.toLowerCase()));
              if (isAssigned) allSubtasks.push(subtask);
            } else if (userRole === "teamLead") {
              // Count all subtasks from projects the lead is part of (their teams)
              allSubtasks.push(subtask);
            } else {
              // owner/admin/manager → total subtasks
              allSubtasks.push(subtask);
            }
          });
        });
      });

      const total = allSubtasks.length;
      const completed = allSubtasks.filter((st) =>
        String(st.status || "")
          .toLowerCase()
          .includes("complete")
      ).length;
      const inProgress = allSubtasks.filter((st) =>
        String(st.status || "")
          .toLowerCase()
          .includes("progress")
      ).length;
      const pending = Math.max(total - completed - inProgress, 0);

      // Debug logging for subtask counting
      if (userRole === "teamLead" || userRole === "teamMember") {
        console.log("Subtask Debug Info:", {
          userName,
          teamMemberId,
          scopedProjectsCount: scopedProjects.length,
          totalSubtasks: total,
          completedSubtasks: completed,
          pendingSubtasks: pending,
          allSubtasks: allSubtasks.map((st) => ({
            title: st.subtask_title,
            assigned_member: st.assigned_member,
            status: st.status,
          })),
        });

        // Additional debug: Log all subtasks from all projects to see what's available
        console.log(
          "All Available Subtasks:",
          scopedProjects.map((project) => ({
            projectName: project.project_name,
            phases:
              project.phases?.map((phase) => ({
                phaseTitle: phase.title,
                subtasks:
                  phase.subtasks?.map((st) => ({
                    title: st.subtask_title,
                    assigned_member: st.assigned_member,
                    status: st.status,
                  })) || [],
              })) || [],
          }))
        );
      }

      return {
        totalSubtasks: total,
        completedSubtasks: completed,
        pendingSubtasks: pending,
        inProgressSubtasks: inProgress,
      };
    } catch {
      return {
        totalSubtasks: 0,
        completedSubtasks: 0,
        pendingSubtasks: 0,
        inProgressSubtasks: 0,
      };
    }
  }, [projects, userRole]);

  // Employee charts datasets
  const mySubtaskStatusData = useMemo(
    () => [
      { name: "Completed", value: completedSubtasks, color: "#22c55e" },
      { name: "In Progress", value: inProgressSubtasks, color: "#f59e0b" },
      { name: "Pending", value: pendingSubtasks, color: "#3b82f6" },
    ],
    [completedSubtasks, inProgressSubtasks, pendingSubtasks]
  );

  const scopedEmployeeProjects = useMemo(() => {
    try {
      let scoped = projects || [];
      if (userRole === "teamLead" || userRole === "teamMember") {
        const stored =
          localStorage.getItem("employee") || localStorage.getItem("user");
        if (stored) {
          const employee = JSON.parse(stored);
          const tmId = employee?.teamMemberId;
          if (tmId) {
            scoped = scoped.filter(
              (p) =>
                p.project_lead === tmId ||
                (Array.isArray(p.team_members) && p.team_members.includes(tmId))
            );
          } else {
            scoped = [];
          }
        }
      }
      return scoped;
    } catch {
      return [];
    }
  }, [projects, userRole]);

  const subtasksPerProjectData = useMemo(() => {
    const data = [];
    try {
      const stored =
        localStorage.getItem("employee") || localStorage.getItem("user");
      const employee = stored ? JSON.parse(stored) : {};
      const tmId = employee?.teamMemberId;
      const myName = employee?.name || employee?.email || "";

      scopedEmployeeProjects
        .filter((p) => String(p.project_status || "").toLowerCase() !== "completed")
        .forEach((p) => {
        let count = 0;
        (p.phases || []).forEach((ph) => {
          (ph.subtasks || []).forEach((st) => {
            if (userRole === "teamMember") {
              const raw = st.assigned_member ?? st.assignedTo ?? "";
              const assignee = (
                typeof raw === "object"
                  ? raw.teamMemberId || raw.name || ""
                  : raw
              ).toString();
              const mine =
                (tmId && (assignee === tmId || assignee === String(tmId))) ||
                (myName &&
                  assignee.toLowerCase &&
                  assignee.toLowerCase().includes(myName.toLowerCase()));
              if (mine) count += 1;
            } else {
              count += 1;
            }
          });
        });
        data.push({ name: p.project_name || "Project", value: count });
      });
    } catch {}
    return data;
  }, [scopedEmployeeProjects, userRole]);

  const teamLeadMemberDistribution = useMemo(() => {
    if (userRole !== "teamLead") return [];
    const map = {};
    scopedEmployeeProjects.forEach((p) => {
      (p.phases || []).forEach((ph) => {
        (ph.subtasks || []).forEach((st) => {
          const keyRaw = st.assigned_member ?? st.assignedTo ?? "Unassigned";
          const idOrName =
            typeof keyRaw === "object"
              ? keyRaw.name || keyRaw.teamMemberId || "Unassigned"
              : keyRaw;
          const k = resolveMemberName((idOrName || "Unassigned").toString());
          map[k] = (map[k] || 0) + 1;
        });
      });
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [scopedEmployeeProjects, userRole]);

  // Per-project completed vs pending (stacked)
  const perProjectStatusData = useMemo(() => {
    return scopedEmployeeProjects
      .filter((p) => String(p.project_status || "").toLowerCase() !== "completed")
      .map((p) => {
      let completed = 0,
        pending = 0;
      (p.phases || []).forEach((ph) => {
        (ph.subtasks || []).forEach((st) => {
          const isDone = (st.status || "").toLowerCase().includes("complete");
          if (userRole === "teamMember") {
            const raw = st.assigned_member ?? st.assignedTo ?? "";
            const assignee = (
              typeof raw === "object" ? raw.teamMemberId || raw.name || "" : raw
            ).toString();
            const stored =
              localStorage.getItem("employee") || localStorage.getItem("user");
            const emp = stored ? JSON.parse(stored) : {};
            const tmId = emp?.teamMemberId;
            const myName = emp?.name || emp?.email || "";
            const mine =
              (tmId && (assignee === tmId || assignee === String(tmId))) ||
              (myName &&
                assignee.toLowerCase &&
                assignee.toLowerCase().includes(myName.toLowerCase()));
            if (!mine) return;
          }
          if (isDone) completed += 1;
          else pending += 1;
        });
      });
      return {
        name: p.project_name || "Project",
        Completed: completed,
        Pending: pending,
      };
    });
  }, [scopedEmployeeProjects, userRole]);

  // Build richer employee insights
  const employeeInsights = useMemo(() => {
    try {
      const stored =
        localStorage.getItem("employee") || localStorage.getItem("user");
      const employee = stored ? JSON.parse(stored) : {};
      const tmId = employee?.teamMemberId;
      const myName = employee?.name || employee?.email || "";

      const mySubtasks = [];
      const dueSoonList = [];
      const now = dayjs();
      const soonLimit = now.add(14, "day");
      const overdueList = [];

      scopedEmployeeProjects.forEach((p) => {
        (p.phases || []).forEach((ph) => {
          (ph.subtasks || []).forEach((st) => {
            // Determine assignee
            const raw = st.assigned_member ?? st.assignedTo ?? "";
            const assignee = (
              typeof raw === "object" ? raw.teamMemberId || raw.name || "" : raw
            ).toString();
            const mine =
              userRole === "teamMember"
                ? (tmId && (assignee === tmId || assignee === String(tmId))) ||
                  (myName &&
                    assignee.toLowerCase &&
                    assignee.toLowerCase().includes(myName.toLowerCase()))
                : true; // teamLead sees all in scoped projects

            if (!mine) return;
            mySubtasks.push({
              ...st,
              project_name: p.project_name,
              phase_title: ph.title,
            });
            const dueRaw =
              st.due_date || st.dueDate || st.deadline || st.end_date || null;
            if (dueRaw) {
              const due = dayjs(dueRaw);
              if (due.isAfter(now) && due.isBefore(soonLimit)) {
                dueSoonList.push({
                  title: st.subtask_title || st.title,
                  due: due.toDate(),
                  project: p.project_name,
                });
              } else if (
                due.isBefore(now) &&
                (st.status || "").toLowerCase() !== "completed"
              ) {
                overdueList.push({
                  title: st.subtask_title || st.title,
                  due: due.toDate(),
                  project: p.project_name,
                });
              }
            }
          });
        });
      });

      // Productivity trend (last 6 weeks, completed subtasks)
      const weeks = [];
      for (let i = 5; i >= 0; i--) {
        const start = now.subtract(i, "week").startOf("week");
        const end = start.endOf("week");
        const label = start.format("MMM D");
        const count = mySubtasks.filter((st) => {
          const done = (st.status || "").toLowerCase().includes("complete");
          const ts = dayjs(
            st.updatedAt || st.completedAt || st.createdAt || new Date()
          );
          return done && ts.isAfter(start) && ts.isBefore(end);
        }).length;
        weeks.push({ name: label, value: count });
      }

      // Project progress
      const projectProgress = scopedEmployeeProjects.map((p) => {
        let total = 0;
        let done = 0;
        (p.phases || []).forEach((ph) => {
          (ph.subtasks || []).forEach((st) => {
            total += 1;
            if ((st.status || "").toLowerCase().includes("complete")) done += 1;
          });
        });
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        return { name: p.project_name || "Project", total, done, pct };
      });

      // Sort lists
      dueSoonList.sort((a, b) => a.due - b.due);
      overdueList.sort((a, b) => b.due - a.due);

      return { mySubtasks, dueSoonList, overdueList, weeks, projectProgress };
    } catch {
      return {
        mySubtasks: [],
        dueSoonList: [],
        overdueList: [],
        weeks: [],
        projectProgress: [],
      };
    }
  }, [scopedEmployeeProjects, userRole]);

  // 5. Add an 'Upcoming Project Deadlines' section
  const upcomingProjects = useMemo(() => {
    let filteredProjects = projects.filter(
      (p) => p.end_date && dayjs(p.end_date).isAfter(dayjs())
    );

    // For team leads and members, only show projects they are part of
    if (userRole === "teamLead" || userRole === "teamMember") {
      const storedEmployee = localStorage.getItem("employee");
      if (storedEmployee) {
        try {
          const employee = JSON.parse(storedEmployee);
          const teamMemberId = employee.teamMemberId;
          filteredProjects = filteredProjects.filter(
            (project) =>
              project.project_lead === teamMemberId ||
              (project.team_members &&
                project.team_members.includes(teamMemberId))
          );
        } catch (error) {
          console.error("Error parsing employee data:", error);
        }
      }
    }

    return filteredProjects
      .sort((a, b) => dayjs(a.end_date).diff(dayjs(b.end_date)))
      .slice(0, 5);
  }, [projects, userRole]);

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
    return top
      ? { memberId: top[0], name: resolveMemberName(top[0]), count: top[1] }
      : null;
  }, [tasks, employeesList]);

  const getStatusColor = (status) => {
    switch (status) {
      case "ongoing":
        return "bg-emerald-100 text-emerald-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "on hold":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "Low":
        return "bg-green-100 text-green-800";
      case "High":
        return "bg-yellow-100 text-yellow-800";
      case "Critical":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="max-w-[1440px] bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 m-auto p-6 min-h-screen">
      {/* Greeting */}
      <div className="relative">
        <div className="backdrop-blur-md bg-white/40 border border-white/60 shadow-sm rounded-xl px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
            <h2 className="text-3xl md:text-4xl text-gray-800 drop-shadow-sm font-display">
            Welcome back, <span className="text-blue-700">{userName}</span>!
          </h2>
            <p className="text-base text-gray-700/80 mt-1">
            {userRole === "teamLead" || userRole === "teamMember"
              ? "Here's an overview of your performance."
              : "Here's an overview of your company's performance."}
          </p>
        </div>
        {/* Motivational Quote Card */}
        <div
          className={`transition-opacity duration-500 ease-in-out ${
            fade ? "opacity-100" : "opacity-0"
          }`}
        >
            <div className="backdrop-blur bg-white/50 shadow rounded-lg px-6 py-4 mt-4 md:mt-0 border border-white/60 max-w-md mx-auto">
              <span className="block text-gray-700 font-semibold mb-2">
              For You & Your Team
            </span>
            <p className="text-gray-800 italic font-medium text-lg">
              "{quote}"
            </p>
          </div>
        </div>
        </div>
        <div className="h-px mt-3 bg-gradient-to-r from-transparent via-indigo-300/50 to-transparent"></div>
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
        {/* Show different cards based on user role */}
        {userRole === "teamLead" || userRole === "teamMember" ? (
          // Employee view - only show relevant cards
          <>
            {/* Removed KPI cards as requested */}
            <div className="flex border rounded bg-gradient-to-br from-green-50 to-green-100 py-3 px-3 w-full sm:w-[48%] md:w-[31%] xl:w-[18%] shadow-sm hover:shadow-lg transition">
              <div className="w-full">
                <p className="font-semibold text-gray-700">My Projects</p>
                <p className="font-bold text-2xl text-gray-800">
                  {totalProjects}
                </p>
                <p className="text-gray-400">Projects I'm part of</p>
              </div>
              <Briefcase className="h-6 w-6 text-green-400" />
            </div>
            <div className="flex border rounded bg-gradient-to-br from-yellow-50 to-yellow-100 py-3 px-3 w-full sm:w-[48%] md:w-[31%] xl:w-[18%] shadow-sm hover:shadow-lg transition">
              <div className="w-full">
                <p className="font-semibold text-gray-700">Active Projects</p>
                <p className="font-bold text-2xl text-gray-800">
                  {activeProjects}
                </p>
                <p className="text-gray-400">Currently being worked on</p>
              </div>
              <Clock className="h-6 w-6 text-yellow-400" />
            </div>
            <div className="flex border rounded bg-gradient-to-br from-purple-50 to-purple-100 py-3 px-3 w-full sm:w-[48%] md:w-[31%] xl:w-[18%] shadow-sm hover:shadow-lg transition">
              <div className="w-full">
                <p className="font-semibold text-gray-700">
                  Completed Projects
                </p>
                <p className="font-bold text-2xl text-gray-800">
                  {completedProjects}
                </p>
                <p className="text-gray-400">Finished Projects</p>
              </div>
              <CheckCircle className="h-6 w-6 text-purple-400" />
            </div>
            <div className="flex border rounded bg-gradient-to-br from-pink-50 to-pink-100 py-3 px-3 w-full sm:w-[48%] md:w-[31%] xl:w-[18%] shadow-sm hover:shadow-lg transition">
              <div className="w-full">
                <p className="font-semibold text-gray-700">Subtasks Overview</p>
                <p className="font-bold text-2xl text-gray-800">
                  {totalSubtasks}
                </p>
                <p className="text-gray-400">
                  {completedSubtasks} completed, {pendingSubtasks} pending
                </p>
              </div>
              <CheckCircle className="h-6 w-6 text-pink-400" />
            </div>
            {/* Upcoming Project Deadlines after KPI cards */}
            <div className="mt-4 w-full">
              <div className="bg-white border rounded shadow px-6 py-4">
                <h3 className="dash-section-title mb-2">Upcoming Project Deadlines</h3>
                {upcomingProjects.length === 0 ? (
                  <div className="text-slate-500">No upcoming deadlines.</div>
                ) : (
                  <ul className="text-slate-700 text-sm space-y-2">
                    {upcomingProjects.map((p, idx) => {
                      const daysLeft = Math.max(dayjs(p.end_date).startOf('day').diff(dayjs().startOf('day'), 'day'), 0);
                      return (
                        <li
                          key={idx}
                          className="flex items-center justify-between gap-3 px-4 py-3 border rounded-lg bg-white/60 hover:bg-white transition cursor-pointer"
                          onClick={() => {
                            const id = p.project_id || p.projectId || p._id;
                            if (id) {
                              navigate("/ProjectDetails", { state: { project_id: id } });
                            } else {
                              navigate("/ProjectDetails");
                            }
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Target className="h-4 w-4 text-blue-500" />
                            <span className="font-semibold text-blue-700 truncate">
                              {p.project_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs text-slate-500 hidden sm:inline">{daysLeft} {daysLeft === 1 ? 'day' : 'days'} left</span>
                            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-slate-100 ring-1 ring-slate-200 text-slate-700">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {dayjs(p.end_date).format("MMM D, YYYY")}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
            {/* Employee charts */}
            <div className="flex justify-between my-6 flex-wrap gap-4 w-full">
              <DonutBlock
                title="My Subtasks Status"
                data={mySubtaskStatusData}
                colors={mySubtaskStatusData.map((d) => d.color)}
                centerText="Subtasks"
              />
              <BarBlock
                title="Subtasks per Project"
                data={subtasksPerProjectData}
                color="#34A853"
              />
              {userRole === "teamLead" && (
                <BarBlock
                  title="Team Subtasks by Member"
                  data={teamLeadMemberDistribution}
                  color="#9C27B0"
                />
              )}
              <AreaBlock
                title="Weekly Productivity (6w)"
                data={employeeInsights.weeks}
                color="#4285F4"
                gradientId="prodGrad"
              />
            </div>

            {/* Project Progress */}
            <div className="bg-white border rounded shadow px-6 py-4 w-full">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Project Progress
              </h3>
              {employeeInsights.projectProgress.length === 0 ? (
                <div className="text-gray-500">No projects in scope.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {employeeInsights.projectProgress.map((p, idx) => (
                    <div
                      key={idx}
                      className="border rounded p-4 bg-gradient-to-br from-gray-50 to-white"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-800 truncate pr-2">
                          {p.name}
                        </span>
                        <span className="text-sm text-gray-600">{p.pct}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded h-2">
                        <div
                          className="h-2 rounded bg-blue-500"
                          style={{ width: `${p.pct}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        {p.done} of {p.total} subtasks completed
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming & Recent for me */}
            <div className="flex flex-col lg:flex-row gap-4 w-full mt-6">
              <div className="flex-1 bg-white border rounded shadow px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Upcoming (14 days)
                </h3>
                {employeeInsights.dueSoonList.length === 0 ? (
                  <div className="text-gray-500">Nothing due soon.</div>
                ) : (
                  <ul className="text-sm text-gray-700 space-y-2">
                    {employeeInsights.dueSoonList.slice(0, 6).map((t, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between border-b last:border-b-0 py-2"
                      >
                        <span className="truncate pr-2">
                          {t.title}{" "}
                          <span className="text-xs text-gray-400">
                            ({t.project})
                          </span>
                        </span>
                        <span className="text-xs text-gray-500">
                          {dayjs(t.due).format("MMM D")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex-1 bg-white border rounded shadow px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Recently Assigned / Updated
                </h3>
                {employeeInsights.mySubtasks.length === 0 ? (
                  <div className="text-gray-500">No recent items.</div>
                ) : (
                  <ul className="text-sm text-gray-700 space-y-2">
                    {employeeInsights.mySubtasks
                      .slice()
                      .sort(
                        (a, b) =>
                          new Date(b.updatedAt || b.createdAt || 0) -
                          new Date(a.updatedAt || a.createdAt || 0)
                      )
                      .slice(0, 6)
                      .map((st, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 border-b last:border-b-0 py-2 hover:bg-gray-50 transition-colors duration-200"
                        >
                          {/* Compact Status Icon */}
                          <div className="flex-shrink-0">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              String(st.status || "").toLowerCase().includes("complete")
                                ? "bg-emerald-100" 
                                : "bg-amber-100"
                            }`}>
                              {String(st.status || "").toLowerCase().includes("complete") ? (
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Clock className="w-3 h-3 text-amber-600" />
                              )}
                            </div>
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-xs font-medium text-gray-900 truncate">
                                {st.subtask_title || st.title}
                          </span>
                            <span
                                className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                  st.priority === "Critical" 
                                    ? "bg-red-100 text-red-700" 
                                    : st.priority === "High"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}
                            >
                              {st.priority || "Low"}
                            </span>
                          </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">
                                {st.project_name}
                              </span>
                          <span
                                className={`text-xs px-1.5 py-0.5 rounded-full ${
                                  String(st.status || "").toLowerCase().includes("complete")
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {st.status || "Pending"}
                          </span>
                            </div>
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        ) : (
          // Admin/Manager/Owner view - show all cards
          <>
            <div className="group flex border rounded bg-gradient-to-br from-blue-50 to-blue-100 py-3 px-3 w-full sm:w-[48%] md:w-[31%] xl:w-[18%] shadow-sm hover:shadow-lg transition">
              <div className="w-full">
                <p className="font-semibold text-gray-700">Total Team</p>
                <p className="font-bold text-2xl text-gray-800">{totalTeams}</p>
                <p className="text-gray-400">{totalEmployees} employees</p>
              </div>
              <Users className="h-6 w-6 text-blue-400 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3" />
            </div>
            <div className="group flex border rounded bg-gradient-to-br from-green-50 to-green-100 py-3 px-3 w-full sm:w-[48%] md:w-[31%] xl:w-[18%] shadow-sm hover:shadow-lg transition">
              <div className="w-full">
                <p className="font-semibold text-gray-700">Total Projects</p>
                <p className="font-bold text-2xl text-gray-800">
                  {totalProjects}
                </p>
                <p className="text-gray-400">
                  All Projects (including completed)
                </p>
              </div>
              <Briefcase className="h-6 w-6 text-green-400 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3" />
            </div>
            <div className="group flex border rounded bg-gradient-to-br from-yellow-50 to-yellow-100 py-3 px-3 w-full sm:w-[48%] md:w-[31%] xl:w-[18%] shadow-sm hover:shadow-lg transition">
              <div className="w-full">
                <p className="font-semibold text-gray-700">Active Projects</p>
                <p className="font-bold text-2xl text-gray-800">
                  {activeProjects}
                </p>
                <p className="text-gray-400">Currently being worked on</p>
              </div>
              <Clock className="h-6 w-6 text-yellow-400 transition-transform duration-200 group-hover:scale-110" />
            </div>
            <div className="group flex border rounded bg-gradient-to-br from-purple-50 to-purple-100 py-3 px-3 w-full sm:w-[48%] md:w-[31%] xl:w-[18%] shadow-sm hover:shadow-lg transition">
              <div className="w-full">
                <p className="font-semibold text-gray-700">
                  Completed Projects
                </p>
                <p className="font-bold text-2xl text-gray-800">
                  {completedProjects}
                </p>
                <p className="text-gray-400">Finished Projects</p>
              </div>
              <CheckCircle className="h-6 w-6 text-purple-400 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-6" />
            </div>
            <div className="group flex border rounded bg-gradient-to-br from-pink-50 to-pink-100 py-3 px-3 w-full sm:w-[48%] md:w-[31%] xl:w-[18%] shadow-sm hover:shadow-lg transition">
              <div className="w-full">
                <p className="font-semibold text-gray-700">Subtasks Overview</p>
                <p className="font-bold text-2xl text-gray-800">
                  {totalSubtasks}
                </p>
                <p className="text-gray-400">
                  {completedSubtasks} completed, {pendingSubtasks} pending
                </p>
              </div>
              <CheckCircle className="h-6 w-6 text-pink-400 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6" />
            </div>
            {topPerformer && (
              <div className="flex border rounded bg-gradient-to-br from-indigo-50 to-indigo-100 py-3 px-3 w-full sm:w-[48%] md:w-[31%] xl:w-[18%] shadow-sm hover:shadow-lg transition">
                <div className="w-full">
                  <p className="font-semibold text-gray-700">Top Performer</p>
                  <p className="font-bold text-2xl text-gray-800">
                    {topPerformer.name || topPerformer.memberId}
                  </p>
                  <p className="text-gray-400">
                    {topPerformer.count} tasks completed
                  </p>
                </div>
                <Users className="h-6 w-6 text-indigo-400" />
              </div>
            )}
          </>
        )}
      </div>
      

      {/* Recent Activity Section (Owners/Admins/Managers only) */}
      {(userRole === "owner" ||
        userRole === "admin" ||
        userRole === "manager") && (
        <div className="mt-6">
          <div className="bg-gradient-to-br from-white/80 to-slate-50/80 backdrop-blur-md border border-slate-200/60 rounded-xl shadow-md px-6 py-5 overflow-y-auto max-h-[420px]">
            <div className="mb-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="dash-section-title">Recent Activity</h3>
                  <p className="text-xs text-slate-500">Latest changes across projects, tasks, and team</p>
                </div>
                <div className="flex items-center gap-2">
                  {[
                    { label: "All" },
                    { label: "Projects" },
                    { label: "Subtasks" },
                    { label: "Employees" },
                  ].map((f) => (
                    <button
                      key={f.label}
                      onClick={() => setActivityFilter(f.label)}
                      className={`text-xs px-3 py-1 rounded-full ring-1 transition ${
                        activityFilter === f.label
                          ? "bg-slate-900 text-white ring-slate-900"
                          : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                  <div className="relative ml-2">
                    <input
                      value={activitySearch}
                      onChange={(e) => setActivitySearch(e.target.value)}
                      placeholder="Search..."
                      className="text-xs pl-8 pr-3 py-1.5 rounded-full bg-white ring-1 ring-slate-200 focus:ring-slate-400 outline-none placeholder:text-slate-400"
                    />
                    <svg className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            {activityLoading ? (
              <div className="text-slate-500">Loading activity...</div>
            ) : activityError ? (
              <div className="text-rose-600">{activityError}</div>
            ) : filteredActivities.length === 0 ? (
              <div className="text-slate-500">No recent activity found.</div>
            ) : (
              <ul className="text-slate-800 text-sm space-y-2">
                {filteredActivities.map((item, idx) => {
                  const type = String(item.type || "");
                  const action = String(item.action || "").toLowerCase();
                  // Type meta
                  const typeMeta =
                    type === "Project"
                      ? { icon: Briefcase, bg: "bg-blue-50", text: "text-blue-600", accent: "border-l-blue-600", ring: "ring-blue-200", grad: "from-blue-50 to-indigo-50" }
                      : type === "Task"
                      ? { icon: CheckCircle, bg: "bg-emerald-50", text: "text-emerald-600", accent: "border-l-emerald-600", ring: "ring-emerald-200", grad: "from-emerald-50 to-teal-50" }
                      : type === "Employee"
                      ? { icon: Users, bg: "bg-purple-50", text: "text-purple-600", accent: "border-l-purple-600", ring: "ring-purple-200", grad: "from-purple-50 to-fuchsia-50" }
                      : { icon: Award, bg: "bg-pink-50", text: "text-pink-600", accent: "border-l-pink-600", ring: "ring-pink-200", grad: "from-pink-50 to-rose-50" };
                  const Icon = typeMeta.icon;
                  // Action badge color
                  const badge = action.includes("delete") || action.includes("remove") || action.includes("cancel")
                    ? { bg: "bg-rose-100", text: "text-rose-700", ring: "ring-rose-200" }
                    : action.includes("create") || action.includes("add")
                    ? { bg: "bg-sky-100", text: "text-sky-700", ring: "ring-sky-200" }
                    : action.includes("completed")
                    ? { bg: "bg-teal-100", text: "text-teal-700", ring: "ring-teal-200" }
                    : action.includes("pending")
                    ? { bg: "bg-violet-100", text: "text-violet-700", ring: "ring-violet-200" }
                    : action.includes("progress") || action.includes("update") || action.includes("edit") || action.includes("status")
                    ? { bg: "bg-indigo-100", text: "text-indigo-700", ring: "ring-indigo-200" }
                    : { bg: "bg-gray-100", text: "text-gray-700", ring: "ring-gray-200" };
                  const rowBg = idx % 2 === 0 ? "bg-white/90" : "bg-white/70";
                  return (
                    <li key={idx} className={`group flex items-start gap-3 p-4 border border-slate-200/70 rounded-xl shadow-sm hover:shadow-md transition ${rowBg} hover:bg-white ${typeMeta.accent} border-l-4`}>
                      <div className={`mt-0.5 h-10 w-10 rounded-full flex items-center justify-center ${typeMeta.text} shrink-0 bg-gradient-to-br ${typeMeta.grad} ring-1 ${typeMeta.ring}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 min-w-0">
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 ring-1 ring-slate-200">{type}</span>
                          <span className="font-semibold text-slate-900 truncate pr-2">
                        {item.name}
                      </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${badge.bg} ${badge.text} ring-1 ${badge.ring} uppercase tracking-wide`}>{item.action}</span>
                        </div>
                        {item.description && (
                          <div className="text-[13px] text-slate-600 mt-1 line-clamp-2">
                        {item.description}
                      </div>
                        )}
                        <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-3">
                          <span>By: {item.performedBy || "Unknown"}</span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-50 ring-1 ring-slate-200">
                            <CalendarDays className="h-3 w-3" />
                            {item.timestamp ? dayjs(item.timestamp).format("MMM D, YYYY h:mm A") : ""}
                          </span>
                      </div>
                    </div>
                  </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
      {/* Charts Section - Only show for Admin/Manager/Owner */}
      {(userRole === "owner" ||
        userRole === "admin" ||
        userRole === "manager") && (
        <>
        <div className="flex justify-between my-6 flex-wrap gap-4">
            {/* Keep a mix: Donut + Pie + Bar replacements for variety */}
            <DonutBlock
              title="Project Status"
            data={projectStatusData}
            colors={["#3b82f6", "#22c55e", "#f59e0b", "#ef4444"]}
            centerText="Projects"
            />
            <ChartBlock title="Team Performance" data={(() => {
              try {
                // Compute team performance based on each team's own totals
                // For each team: total projects, completed projects, pending(=non-completed)
                const teamIdToName = new Map((teams || []).map((t) => [String(t._id || t.team_id || t.id || ''), t.teamName || 'Team']));
                const stats = {};
                (projects || []).forEach((p) => {
                  const teamKey = String(p.team_id || '');
                  const teamName = teamIdToName.get(teamKey) || (p.assigned_team || 'Unassigned');
                  if (!stats[teamName]) stats[teamName] = { total: 0, completed: 0, pending: 0 };
                  stats[teamName].total += 1;
                  if (String(p.project_status || '').toLowerCase() === 'completed') stats[teamName].completed += 1;
                  else stats[teamName].pending += 1;
                });

                const rows = Object.entries(stats).map(([name, s]) => {
                  const pct = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
                  // value drives slice size (completion rate), count shows completed projects in label
                  return { name, count: s.completed, value: pct };
                });
                // Keep a stable order (descending by completion rate then by completed count)
                rows.sort((a, b) => (b.value - a.value) || (b.count - a.count));
                return rows;
              } catch {
                return [];
              }
            })()} />
            <TeamSizesBarBlock title="Team Sizes" data={teamSizeData} />
            <DonutBlock
              title="Employee Distribution"
              data={employeeRoleData}
              colors={["#0ea5e9", "#22c55e", "#a855f7", "#f59e0b", "#ef4444", "#14b8a6"]}
              centerText="Employees"
            />
          </div>
          {/* Add stacked bar for deeper insight */}
          {perProjectStatusData && perProjectStatusData.length > 0 && (
            <div className="my-6">
              <StackedBarBlock
                title="Per-Project Subtasks: Completed vs Pending"
                data={perProjectStatusData}
                completedColor="#0ea5e9"
                pendingColor="#8b5cf6"
              />
        </div>
      )}
        </>
      )}
      {/* Upcoming Project Deadlines moved above; duplicate bottom card removed as requested */}
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
