import React, { useState } from 'react'
import DemographicsForm from './components/DemographicsForm'
import SymptomForm from './components/SymptomForm'
import ResultCard from './components/ResultCard'
import History from './pages/History'
import { motion, AnimatePresence } from 'framer-motion'
import AuroraTitle from './components/AuroraTitle'
import AuroraBackground from './components/AuroraBackground'



export default function App() {
  const [step, setStep] = useState(1)
  const [payload, setPayload] = useState(null)
  const [result, setResult] = useState(null)
  const [historyRefreshFlag, setHistoryRefreshFlag] = useState(false)

  const motionVariants = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -30 },
    transition: { duration: 0.4, ease: 'easeInOut' }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black flex flex-col items-center justify-center p-6 font-sans text-white">

      <AuroraBackground>
  <div className="w-full max-w-2xl bg-black/40 backdrop-blur-md border border-gray-700 rounded-3xl shadow-lg p-22 transition-all duration-300">

    <div className="text-center mb-8">
  <AuroraTitle text="HealthAssist" />
  <p className="text-white mt-2">Your AI-powered health companion</p>
</div>


    <AnimatePresence mode="wait">
      {step === 1 && (
        <motion.div key="step1" {...motionVariants}>
          <DemographicsForm onNext={(data) => { setPayload({ ...data }); setStep(2); }} />
        </motion.div>
      )}
      {step === 2 && (
        <motion.div key="step2" {...motionVariants}>
          <SymptomForm
            demographics={payload}
            onResult={(res) => {
              setResult(res)
              setHistoryRefreshFlag((prev) => !prev)
              setStep(3)
            }}
            onBack={() => setStep(1)}
          />
        </motion.div>
      )}
      {step === 3 && result && (
        <motion.div key="step3" {...motionVariants}>
          <ResultCard data={result} onBack={() => setStep(2)} />
        </motion.div>
      )}
    </AnimatePresence>

    <div className="mt-8 border-t border-slate-200 pt-6">
      <History refreshFlag={historyRefreshFlag} />
    </div>
  </div>
</AuroraBackground>

    </div>
  )
}
