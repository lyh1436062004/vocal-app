import React, { useState } from 'react'
import PitchTest from './components/PitchTest.jsx'
import ChorusMode from './components/ChorusMode.jsx'

export default function App() {
  const [tab, setTab] = useState('pitch')

  return (
    <div className="app">
      <h1>🎤 声乐练习</h1>
      <div className="tabs">
        <button
          className={tab === 'pitch' ? 'active' : ''}
          onClick={() => setTab('pitch')}
        >
          音高测试
        </button>
        <button
          className={tab === 'chorus' ? 'active' : ''}
          onClick={() => setTab('chorus')}
        >
          合唱跟唱
        </button>
      </div>
      {tab === 'pitch' ? <PitchTest /> : <ChorusMode />}
    </div>
  )
}
