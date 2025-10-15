import React, { useState, useEffect } from 'react'
import axios from 'axios'
import LoadingBar from './LoadingBar'

export default function SymptomForm({ demographics, onResult, onBack }) {
  const [symptoms, setSymptoms] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let timer
    if (loading) {
      timer = setInterval(() => setProgress(p => (p < 95 ? p + 5 : p)), 500)
    }
    return () => clearInterval(timer)
  }, [loading])

  async function handleAnalyze() {
    if (!symptoms) {
      alert('Please enter symptoms')
      return
    }
    setLoading(true)
    setProgress(10)
    try {
      const form = new FormData()
      form.append('age', demographics.age)
      form.append('sex', demographics.sex)
      form.append('symptoms', symptoms)
      if (file) form.append('file', file)

      const res = await axios.post('/api/analyze', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setProgress(100)
      setTimeout(() => onResult(res.data), 500)
    } catch (e) {
      alert('Error: ' + (e.response?.data?.detail || e.message))
      setLoading(false)
      setProgress(0)
    }
  }

  const inputClasses =
    'block w-full bg-gray-800 text-white border border-gray-700 rounded-2xl p-4 shadow-sm focus:border-sky-500 focus:ring focus:ring-sky-400 focus:ring-opacity-30 outline-none transition duration-200 backdrop-blur-sm placeholder-gray-400'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">
          Describe your symptoms
        </h2>
        <p className="text-gray-300 mt-1">
          Provide as much detail as possible. You can also upload a blood
          report (PDF) for better analysis.
        </p>
      </div>

      <textarea
        className={`${inputClasses} min-h-[130px]`}
        value={symptoms}
        onChange={e => setSymptoms(e.target.value)}
        placeholder="e.g. I've had a high fever, persistent cough, and body aches for the last 3 days..."
      />

      <div className="mt-4">
        <label
          htmlFor="file-upload"
          className="cursor-pointer flex items-center justify-center gap-2 px-5 py-3 border border-gray-600 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium shadow-sm transition duration-200"
        >
          <svg
            className="h-5 w-5 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 16v-8m0 0l-3 3m3-3l3 3M4 16v4h16v-4"
            />
          </svg>
          Upload Blood Report (PDF)
        </label>
        <input
          id="file-upload"
          type="file"
          accept="application/pdf"
          onChange={e => setFile(e.target.files[0])}
          className="sr-only"
        />
        {file && (
          <div className="mt-2 text-sm text-green-400 font-medium">
            ✓ {file.name} selected
          </div>
        )}
      </div>

      {loading && (
        <div className="mt-6">
          <p className="text-sm text-center text-gray-300 mb-2">
            Analyzing your symptoms...
          </p>
          <LoadingBar progress={progress} />
        </div>
      )}

      <div className="pt-4 flex justify-between items-center">
        <button
          onClick={onBack}
          disabled={loading}
          className="px-5 py-2.5 text-sm font-medium text-gray-300 rounded-xl hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition disabled:opacity-50"
        >
          ← Back
        </button>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className={`px-8 py-2.5 rounded-xl font-semibold text-white shadow-md transition-all duration-200 ${
            loading
              ? 'bg-sky-300 cursor-not-allowed'
              : 'bg-sky-600 hover:bg-sky-700 focus:ring-2 focus:ring-sky-400'
          }`}
        >
          {loading ? 'Analyzing...' : 'Analyze →'}
        </button>
      </div>
    </div>
  )
}
