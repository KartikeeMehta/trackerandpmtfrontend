import React, { useState } from 'react';
import Front from './pages/Front.jsx';
import Connect from './pages/Connect.jsx';
import Track from './pages/Track.jsx';

export default function App() {
  const [route, setRoute] = useState('front');
  const [employeeInfo, setEmployeeInfo] = useState({ name: '', teamMember_Id: '' });

  return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="w-[920px] rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded bg-sky-600" />
            <div className="font-semibold text-gray-900">ProjectFlow Tracker</div>
            {employeeInfo?.name ? (
              <div className="ml-3 text-xs text-gray-500">{employeeInfo.name} • {employeeInfo.teamMember_Id || '—'}</div>
            ) : null}
          </div>
        </div>
        {route === 'front' && <Front onConnect={() => setRoute('connect')} />}
        {route === 'connect' && (
          <Connect onDone={(_, info) => { setEmployeeInfo(info || employeeInfo); setRoute('track'); }} />
        )}
        {route === 'track' && (
          <Track onStatus={(info) => setEmployeeInfo(info || employeeInfo)} />
        )}
      </div>
    </div>
  );
}





