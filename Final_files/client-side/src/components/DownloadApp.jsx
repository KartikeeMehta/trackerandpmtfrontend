import React from "react";
import { Apple, Monitor, Download, CheckCircle } from "lucide-react";
const DownloadApp = () => {
  return (
    <section className="w-full flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="w-full max-w-[1200px]">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-3">
            Download ProjectFlow Desktop
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Experience seamless project management with our powerful desktop
            application. Stay connected, track progress, and manage your team
            from anywhere.
          </p>
        </div>
        {/* Download Cards Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Mac Card */}
          <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-3xl shadow-xl p-6 flex flex-col items-center text-center hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 mb-4">
              <Apple className="h-8 w-8 text-gray-700" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">
              Download for macOS
            </h3>
            <p className="text-gray-600 mb-4 text-sm">
              Universal build for Apple Silicon and Intel processors
            </p>
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>macOS 10.15+ compatible</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Universal binary</span>
              </div>
            </div>
            <a
              href="/downloads/ProjectFlow-0.1.0-arm64.dmg"
              download
              className="inline-flex items-center gap-2 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 hover:shadow-xl transform hover:-translate-y-1"
            >
              <Download className="h-4 w-4" />
              Download for macOS
            </a>
          </div>
          {/* Windows Card */}
          <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-3xl shadow-xl p-6 flex flex-col items-center text-center hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-300 mb-4">
              <Monitor className="h-8 w-8 text-blue-700" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">
              Download for Windows
            </h3>
            <p className="text-gray-600 mb-4 text-sm">
              Optimized for Windows 10/11 with modern UI elements
            </p>
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Windows 10/11 (64-bit)</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Windows notifications</span>
              </div>
            </div>
            <a
              href="./ProjectFlow Setup 0.1.0.exe"
              download
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 hover:shadow-xl transform hover:-translate-y-1"
            >
              <Download className="h-4 w-4" />
              Download for Windows
            </a>
          </div>
        </div>
        {/* Features Grid */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-6 mb-8 border border-white/20">
          <h3 className="text-xl font-bold text-center text-gray-900 mb-6">
            What You Get with Our Desktop App
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 mb-1 text-sm">
                Real-time Sync
              </h4>
              <p className="text-xs text-gray-600">
                Instant updates across devices
              </p>
            </div>
            <div className="text-center p-3">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 mb-1 text-sm">
                Project Management
              </h4>
              <p className="text-xs text-gray-600">
                Full project lifecycle control
              </p>
            </div>
            <div className="text-center p-3">
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 mb-1 text-sm">
                Team Collaboration
              </h4>
              <p className="text-xs text-gray-600">Work together seamlessly</p>
            </div>
            <div className="text-center p-3">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 mb-1 text-sm">
                Analytics & Reports
              </h4>
              <p className="text-xs text-gray-600">Performance insights</p>
            </div>
          </div>
        </div>
        {/* Installation Guide */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-center text-gray-900 mb-6">
            Quick Installation Guide
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold text-blue-600">
                1
              </div>
              <h4 className="font-semibold text-gray-900 mb-2 text-sm">
                Download
              </h4>
              <p className="text-gray-600 text-xs">
                Click download for your OS above
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold text-green-600">
                2
              </div>
              <h4 className="font-semibold text-gray-900 mb-2 text-sm">
                Install
              </h4>
              <p className="text-gray-600 text-xs">
                Run installer and follow setup
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold text-purple-600">
                3
              </div>
              <h4 className="font-semibold text-gray-900 mb-2 text-sm">
                Connect
              </h4>
              <p className="text-gray-600 text-xs">
                Sign in and start managing projects
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
export default DownloadApp;