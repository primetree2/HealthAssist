import React from 'react';
import { motion } from 'framer-motion';

export default function Typewriter({ text, className }) {
    const letters = Array.from(text);

    const container = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.02, // Adjust the speed of typing here
            },
        },
    };

    const child = {
        hidden: { opacity: 0, y: '5px' },
        visible: { opacity: 1, y: '0px' },
    };

    return (
        <motion.p
            className={className}
            style={{ display: 'flex', flexWrap: 'wrap' }} // Ensures words wrap correctly
            variants={container}
            initial="hidden"
            animate="visible"
        >
            {letters.map((letter, index) => (
                <motion.span variants={child} key={index}>
                    {/* Use a non-breaking space to prevent spaces from collapsing */}
                    {letter === ' ' ? '\u00A0' : letter}
                </motion.span>
            ))}
        </motion.p>
    );
}