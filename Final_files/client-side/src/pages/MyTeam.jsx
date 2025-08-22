import React, { useEffect } from 'react'
import Section_a from './MyTeam/Section_a'

const MyTeam = () => {
  useEffect(() => {
    const evt = new CustomEvent('notifications:categoryRead', { detail: { category: 'team' } })
    window.dispatchEvent(evt)
  }, [])
  return (
    <div>
        <Section_a/>
    </div>
  )
}

export default MyTeam