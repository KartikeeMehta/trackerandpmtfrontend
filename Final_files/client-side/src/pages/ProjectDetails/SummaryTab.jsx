import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity as ActivityIcon,
  Edit3,
  Clock as ClockIcon,
} from "lucide-react";
import { api_url } from "@/api/Api";
import { apiHandler } from "@/api/ApiHandler";

// Lightweight rich text editor using a contenteditable div with basic toolbar
const roleCanEdit = (role) => {
  const r = (role || "").toLowerCase();
  return ["owner", "admin", "manager", "teamlead"].includes(r);
};

const ToolbarButton = ({ onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    className="px-2 py-1 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50"
  >
    {label}
  </button>
);

const SummaryTab = ({ project, projectId }) => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const editorRef = useRef(null);
  const [hydrated, setHydrated] = useState(false);
  const [activities, setActivities] = useState([]);

  const currentRole = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return user.role || "";
    } catch {
      return "";
    }
  }, []);

  const canEdit = roleCanEdit(currentRole);
  const pid = projectId || project?.project_id || project?._id;

  useEffect(() => {
    const fetchSummary = async () => {
      if (!pid) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      try {
        // Reuse project fetch to get summary if stored on project; fallback to empty
        const res = await apiHandler.GetApi(
          `${api_url.getAllProjects}/${pid}`,
          token
        );
        const initial = res?.project?.summary || "";
        setContent(initial);
      } catch (e) {
        setContent("");
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [pid]);

  useEffect(() => {
    const fetchActivity = async () => {
      if (!pid) return;
      try {
        const token = localStorage.getItem("token");
        const res = await apiHandler.GetApi(
          `${api_url.projectSummaryActivity}${pid}`,
          token
        );
        if (res?.success && Array.isArray(res.activities)) {
          setActivities(res.activities);
        } else setActivities([]);
      } catch (_) {
        setActivities([]);
      }
    };
    fetchActivity();
  }, [pid, saving]);

  // After first load, set innerHTML once to avoid caret jump
  useEffect(() => {
    if (!loading && editorRef.current && !hydrated) {
      editorRef.current.innerHTML = content || "";
      setHydrated(true);
    }
  }, [loading, hydrated, content]);

  const focusEditor = () => {
    if (editorRef.current) editorRef.current.focus();
  };

  const exec = (cmd, val) => {
    focusEditor();
    document.execCommand(cmd, false, val);
  };

  const handleSave = async () => {
    if (!pid) return;
    setSaving(true);
    setError("");
    const token = localStorage.getItem("token");
    try {
      await apiHandler.PostApi(
        `${api_url.projects}/summary/update`,
        { projectId: pid, summary: content },
        token
      );
    } catch (e) {
      setError("Failed to save summary");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="font-semibold text-gray-800">Project Summary</div>
          {canEdit && (
            <div className="flex items-center gap-2">
              <ToolbarButton onClick={() => exec("bold")} label="Bold" />
              <ToolbarButton onClick={() => exec("italic")} label="Italic" />
              <ToolbarButton
                onClick={() => exec("underline")}
                label="Underline"
              />
              <ToolbarButton
                onClick={() => exec("insertUnorderedList")}
                label="• List"
              />
              <ToolbarButton
                onClick={() => exec("insertOrderedList")}
                label="1. List"
              />
              <select
                onChange={(e) => exec("fontSize", e.target.value)}
                className="px-2 py-1 text-sm rounded border border-gray-300 bg-white"
                defaultValue="3"
              >
                <option value="1">Small</option>
                <option value="3">Normal</option>
                <option value="5">Large</option>
                <option value="6">X-Large</option>
              </select>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className={`px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 ${
                  saving ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>
        {error && (
          <div className="px-4 py-2 text-sm text-red-600 border-b border-red-100 bg-red-50">
            {error}
          </div>
        )}
        <div className="p-4">
          <div
            ref={editorRef}
            contentEditable={canEdit}
            suppressContentEditableWarning
            onInput={(e) => setContent(e.currentTarget.innerHTML)}
            className={`min-h-[50vh] w-full rounded-lg border p-4 outline-none break-words ${
              canEdit
                ? "bg-white border-gray-200 focus:border-blue-300"
                : "bg-gray-50 border-gray-100"
            }`}
          />
          {/* Last edited moved into activity header below */}
          {!canEdit && (
            <p className="text-xs text-gray-500 mt-2">
              Only team leads and higher can edit this summary.
            </p>
          )}
          {/* Recent activity */}
          <div className="mt-6 rounded-lg border border-gray-200 bg-white">
            <div className="px-4 py-3 border-b border-gray-100 font-medium text-gray-800 flex items-center gap-2">
              <ActivityIcon size={16} className="text-indigo-600" />
              <span>Recent Activity</span>
            </div>
            <div className="p-4 space-y-3">
              {activities.length === 0 ? (
                project?.summaryMeta?.lastEditedAt ? (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <Edit3 size={16} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-gray-800">
                        Edited by{" "}
                        {project.summaryMeta.lastEditedByName || "Unknown"}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <ClockIcon size={12} className="text-gray-400" />
                        {new Date(
                          project.summaryMeta.lastEditedAt
                        ).toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    No recent activity
                  </div>
                )
              ) : (
                activities.map((a) => (
                  <div key={a._id} className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <Edit3 size={16} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-gray-800">
                        {a.description}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <ClockIcon size={12} className="text-gray-400" />
                        {new Date(a.createdAt).toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryTab;
