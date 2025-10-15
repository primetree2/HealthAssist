import React, { useState } from 'react'

export default function DemographicsForm({ onNext }) {
  const [age, setAge] = useState(25)
  const [sex, setSex] = useState('Male')

  const inputClass =
    "mt-2 w-full border border-gray-700 bg-gray-800 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-sky-400 focus:border-transparent outline-none transition-all duration-200"

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">Tell us about you</h2>
        <p className="text-gray-300 mt-1">We’ll use this to personalize your analysis.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="text-sm font-medium text-gray-300">Age</label>
          <select value={age} onChange={(e) => setAge(Number(e.target.value))} className={inputClass}>
            {Array.from({ length: 90 }, (_, i) => i + 10).map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-300">Sex</label>
          <select value={sex} onChange={(e) => setSex(e.target.value)} className={inputClass}>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => onNext({ age, sex })}
          className="px-6 py-2.5 bg-sky-600 text-white rounded-xl font-semibold hover:bg-sky-700 active:scale-95 transition-transform shadow-sm"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}
