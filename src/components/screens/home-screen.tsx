"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CoverScreen } from "./cover-screen";
import { DepartureScreen } from "./DepartureScreen";

interface HomeScreenProps {
  skipCover?: boolean;
}

export function HomeScreen({ skipCover = false }: HomeScreenProps) {
  const [showCover, setShowCover] = useState(!skipCover);

  return (
    <AnimatePresence mode="wait">
      {showCover ? (
        <motion.div
          key="cover"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28 }}
        >
          <CoverScreen onStart={() => setShowCover(false)} />
        </motion.div>
      ) : (
        <motion.div
          key="departure"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <DepartureScreen />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
