import React from 'react'
import Typewriter from './Typewriter'
import { motion } from 'framer-motion'

const Section = ({ title, children, align = 'left' }) => (
  <div className={`py-3 space-y-2 ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'}`}>
    <h3 className="text-lg font-semibold text-white mb-1 neon-title">{title}</h3>
    <div className={`text-gray-300 text-sm neon-glow`}>{children}</div>
  </div>
)

const Divider = () => <hr className="border-gray-700 my-4" />

export default function ResultCard({ data, onBack }) {
  const listContainerVariants = { visible: { transition: { staggerChildren: 0.2 } } }
  const listItemVariants = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }

  return (
    <div className="space-y-6 px-4 sm:px-6 md:px-8 lg:px-0 max-w-3xl mx-auto">
      {/* Header */}
      <h2 className="text-3xl font-bold text-center text-white mb-3 neon-title">Your Analysis</h2>
      <p className="text-center text-gray-300 mb-8 text-sm leading-relaxed">
        Remember: This is not a medical diagnosis. Consult a professional.
      </p>

      {/* Card */}
      <div className="bg-gray-900/80 rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-700 space-y-6 backdrop-blur-sm">
        {/* Possible Conditions */}
        {data.possible_conditions && (
          <>
            <Section title="Possible Conditions" align="left">
              <motion.ul
                className="list-disc space-y-2 pl-4"
                variants={listContainerVariants}
                initial="hidden"
                animate="visible"
              >
                {data.possible_conditions.map((c, i) => (
                  <motion.li key={i} variants={listItemVariants}>
                    <Typewriter text={c} className="neon-glow" />
                  </motion.li>
                ))}
              </motion.ul>
            </Section>
            <Divider />
          </>
        )}

        {/* Meaning Behind Symptoms */}
        <Section title="What do Your Symptoms Mean" align="justify">
          <Typewriter text={data.meaning_behind_symptoms} className="neon-glow" />
        </Section>
        <Divider />

        {/* What to Ask Your Doctor */}
        <Section title="What To Ask Your Doctor" align="left">
          <motion.ul
            className="list-disc space-y-2 pl-4"
            variants={listContainerVariants}
            initial="hidden"
            animate="visible"
          >
            {data.what_to_ask_your_doctor.map((q, i) => (
              <motion.li key={i} variants={listItemVariants}>
                <Typewriter text={q} className="neon-glow" />
              </motion.li>
            ))}
          </motion.ul>
        </Section>
        <Divider />

        {/* When to Take it Seriously */}
        <Section title="When to Take it Seriously" align="justify">
          <Typewriter text={data.when_to_take_it_serious} className="neon-glow" />
        </Section>
        <Divider />

        {/* Precautions & Warnings */}
        <Section title="Precautions & Warnings" align="left">
          <Typewriter text={data.precautions} className="neon-glow" />
          {data.warnings && (
            <p className="mt-3 p-3 bg-red-900/40 border-l-4 border-red-600 text-red-300 rounded-lg text-sm text-center">
              {data.warnings}
            </p>
          )}
        </Section>
      </div>

      {/* Footer */}
      <div className="mt-6 text-left text-sm text-gray-400 space-y-1">
        <p className="italic neon-glow" align="center">Wishing you a speedy recovery 🌿</p>
        <p className="text-xs" align="center">Developed by Harsh Raj — for educational use only.</p>
      </div>

      {/* Back Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={onBack}
          className="px-5 py-2 text-sm font-medium text-gray-300 rounded-lg hover:bg-gray-800 focus:ring-2 focus:ring-gray-500 transition"
        >
          ← Analyze Again
        </button>
      </div>
    </div>
  )
}
