"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface WarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message: string;
}

const WarningModal: React.FC<WarningModalProps> = ({
    isOpen,
    onClose,
    title = "Warning",
    message,
}) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999]">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm shadow-2xl"
                    />

                    {/* Modal */}
                    <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl shadow-2xl pointer-events-auto border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col p-6 text-center shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
                        >
                            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-500 mx-auto mb-4">
                                <AlertTriangle size={32} />
                            </div>

                            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                                {title}
                            </h3>

                            <p className="text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
                                {message}
                            </p>

                            <button
                                onClick={onClose}
                                className="w-full py-3.5 rounded-2xl bg-amber-600 text-white font-semibold hover:bg-amber-700 transition-shadow shadow-lg hover:shadow-amber-600/20 active:scale-[0.98]"
                            >
                                Understood
                            </button>
                        </motion.div>
                    </div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default WarningModal;
