import React, { useEffect } from 'react'
import Section_a from './AllProject/Section_a'

const AllProject = () => {
  useEffect(() => {
    const evt = new CustomEvent('notifications:categoryRead', { detail: { category: 'projects' } })
    window.dispatchEvent(evt)
  }, [])
  return (
    <>
    <Section_a/>
    </>
  )
}

export default AllProject