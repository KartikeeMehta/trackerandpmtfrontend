const { contextBridge, ipcRenderer } = require('electron')

let authToken = null
let baseUrl = 'http://localhost:8000/api/employee-tracker'

async function apiRequest(path, options = {}) {
	const headers = Object.assign(
		{ 'Content-Type': 'application/json' },
		options.headers || {}
	)
	if (authToken) headers['Authorization'] = `Bearer ${authToken}`
	const res = await fetch(`${baseUrl}${path}`, { credentials: 'include', ...options, headers })
	let data
	try { data = await res.json() } catch (_) { data = null }
	if (!res.ok) {
		const message = (data && (data.message || data.error)) || `HTTP ${res.status}`
		throw new Error(message)
	}
	return data
}

contextBridge.exposeInMainWorld('trackerAPI', {
	setUserEmail: (email) => ipcRenderer.send('set-user-email', email),
	onStart: (cb) => ipcRenderer.on('tracker:start', cb),
	onStop: (cb) => ipcRenderer.on('tracker:stop', cb),

	// Employee-tracker integration
	setAuthToken: (token) => { authToken = token || null },
	setBaseUrl: (url) => { if (url && typeof url === 'string') baseUrl = url },

	punchIn: () => apiRequest('/punch-in', { method: 'POST', body: JSON.stringify({}) }),
	punchOut: () => apiRequest('/punch-out', { method: 'POST', body: JSON.stringify({}) }),
	startBreak: () => apiRequest('/break/start', { method: 'POST', body: JSON.stringify({}) }),
	endBreak: () => apiRequest('/break/end', { method: 'POST', body: JSON.stringify({}) }),
	getStatus: () => apiRequest('/status', { method: 'GET' }),
	getSettings: () => apiRequest('/settings', { method: 'GET' }),
	updateSettings: (settings) => apiRequest('/settings', { method: 'PUT', body: JSON.stringify(settings || {}) })
})

