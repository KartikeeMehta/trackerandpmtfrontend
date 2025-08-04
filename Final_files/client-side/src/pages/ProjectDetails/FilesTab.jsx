import { useState } from "react";
import {
  Upload,
  File,
  Folder,
  MoreVertical,
  Download,
  Trash2,
  Eye,
  Calendar,
} from "lucide-react";

const FilesTab = ({ project }) => {
  const [files, setFiles] = useState([
    {
      id: 1,
      name: "Project Requirements.pdf",
      type: "pdf",
      size: "2.4 MB",
      uploadedBy: "John Doe",
      uploadedAt: "2024-01-15",
      category: "Documents",
    },
    {
      id: 2,
      name: "Design Mockups.zip",
      type: "zip",
      size: "15.7 MB",
      uploadedBy: "Jane Smith",
      uploadedAt: "2024-01-18",
      category: "Design",
    },
    {
      id: 3,
      name: "Wireframes.sketch",
      type: "sketch",
      size: "8.2 MB",
      uploadedBy: "Mike Johnson",
      uploadedAt: "2024-01-20",
      category: "Design",
    },
    {
      id: 4,
      name: "Meeting Notes.docx",
      type: "docx",
      size: "156 KB",
      uploadedBy: "Sarah Wilson",
      uploadedAt: "2024-01-22",
      category: "Documents",
    },
  ]);

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showUploadModal, setShowUploadModal] = useState(false);

  const categories = [
    { id: "all", name: "All Files" },
    { id: "documents", name: "Documents" },
    { id: "design", name: "Design" },
    { id: "code", name: "Code" },
    { id: "other", name: "Other" },
  ];

  const getFileIcon = (type) => {
    switch (type) {
      case "pdf":
        return <File size={20} className="text-red-500" />;
      case "zip":
        return <Folder size={20} className="text-yellow-500" />;
      case "sketch":
        return <File size={20} className="text-orange-500" />;
      case "docx":
        return <File size={20} className="text-blue-500" />;
      default:
        return <File size={20} className="text-gray-500" />;
    }
  };

  const getFileTypeColor = (type) => {
    switch (type) {
      case "pdf":
        return "bg-red-100 text-red-800";
      case "zip":
        return "bg-yellow-100 text-yellow-800";
      case "sketch":
        return "bg-orange-100 text-orange-800";
      case "docx":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredFiles =
    selectedCategory === "all"
      ? files
      : files.filter(
          (file) => file.category.toLowerCase() === selectedCategory
        );

  const handleDeleteFile = (fileId) => {
    if (window.confirm("Are you sure you want to delete this file?")) {
      setFiles((prev) => prev.filter((file) => file.id !== fileId));
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Project Files</h2>
          <p className="text-gray-600">Manage and organize project files</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Upload size={16} />
          Upload Files
        </button>
      </div>

      {/* Category Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Filter by:</span>
          <div className="flex gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Files Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {selectedCategory === "all"
              ? "All Files"
              : `${
                  categories.find((c) => c.id === selectedCategory)?.name
                }`}{" "}
            ({filteredFiles.length})
          </h3>

          {filteredFiles.length === 0 ? (
            <div className="text-center py-12">
              <File size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-2">No files found</p>
              <p className="text-sm text-gray-400">
                Upload files to get started
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getFileIcon(file.type)}
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </h4>
                        <p className="text-xs text-gray-500">{file.size}</p>
                      </div>
                    </div>
                    <div className="relative">
                      <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                        <MoreVertical size={16} className="text-gray-500" />
                      </button>
                      <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                        <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                          <Eye size={14} />
                          View
                        </button>
                        <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                          <Download size={14} />
                          Download
                        </button>
                        <button
                          onClick={() => handleDeleteFile(file.id)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Category</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${getFileTypeColor(
                          file.type
                        )}`}
                      >
                        {file.category}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Uploaded by</span>
                      <span className="text-xs text-gray-700">
                        {file.uploadedBy}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Date</span>
                      <span className="text-xs text-gray-700">
                        {file.uploadedAt}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Upload Files
              </h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-2">Drag and drop files here</p>
                <p className="text-sm text-gray-500 mb-4">or</p>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                  Browse Files
                </button>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilesTab;
