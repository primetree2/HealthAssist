import React from 'react'
import { motion } from 'framer-motion'

export default function LoadingBar({ progress }){
  return (
    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
      <motion.div
        className="h-2 bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ ease: "linear", duration: 0.5 }}
      />
    </div>
  )
}