import React, { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import Section_a from './TeamMember/Section_a'

const TeamMember = () => {
  useEffect(() => {
    const evt = new CustomEvent('notifications:categoryRead', { detail: { category: 'teamMembers' } })
    window.dispatchEvent(evt)
  }, [])
  // Client-side guard in page as well (defense in depth)
  try {
    const userStr = localStorage.getItem('user')
    const role = userStr ? (JSON.parse(userStr).role || '').toLowerCase() : ''
    const allowed = ['owner','admin','manager']
    if (!allowed.includes(role)) {
      return <Navigate to="/DashBoard" replace />
    }
  } catch (_) {
    return <Navigate to="/DashBoard" replace />
  }

  return (
    <>
    <Section_a/>
    </>
  )
}

export default TeamMember