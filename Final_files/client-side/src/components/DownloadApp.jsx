import React from 'react'
import { Apple, Monitor, Download } from 'lucide-react'

const DownloadApp = () => {
  return (
    <section className="w-full flex flex-col items-center justify-center px-4 py-10 bg-[#dbeafe]">
      <div className="w-full max-w-[1100px]">
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Download Desktop App
          </h2>
          <p className="mt-2 text-gray-600">Choose your platform to get started.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Mac Card */}
          <div className="bg-white border border-blue-100 rounded-2xl shadow p-6 flex flex-col items-center text-center hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-blue-50 border border-blue-100">
              <Apple className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-gray-800">Download for macOS</h3>
            <p className="mt-2 text-gray-500">Universal build for Apple silicon and Intel.</p>
            <a
              href="/downloads/ProjectFlow-0.1.0-arm64.dmg"
              download
              className="mt-5 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold shadow-md transition"
            >
              <Download className="h-5 w-5" />
              Download
            </a>
          </div>

          {/* Windows Card */}
          <div className="bg-white border border-blue-100 rounded-2xl shadow p-6 flex flex-col items-center text-center hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-blue-50 border border-blue-100">
              <Monitor className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="mt-4 text-xl font-bold text-gray-800">Download for Windows</h3>
            <p className="mt-2 text-gray-500">Compatible with Windows 10 and later.</p>
            <a
              href="/downloads/ProjectFlow-Setup-0.1.0.exe"
              download
              className="mt-5 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold shadow-md transition"
            >
              <Download className="h-5 w-5" />
              Download
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

export default DownloadApp
