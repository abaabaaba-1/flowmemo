"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { HomeGrainientBackground } from "./home-grainient-background";

interface CoverScreenProps {
  onStart: () => void;
}

export function CoverScreen({ onStart }: CoverScreenProps) {
  return (
    <main className="relative min-h-svh overflow-hidden bg-[#F8FCFF] text-[#43556B]">
      <HomeGrainientBackground />

      <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-[450px] flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.24),rgba(255,255,255,0.08))] px-4 pb-[max(env(safe-area-inset-bottom),18px)] pt-[max(env(safe-area-inset-top),18px)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-xl lg:my-3 lg:min-h-[calc(100svh-24px)] lg:max-w-[420px] lg:rounded-[34px] lg:shadow-[0_36px_90px_rgba(29,39,53,0.14)]">
        <header className="flex items-center justify-between px-1 pb-3 pt-1 text-[15px] font-semibold text-black/80">
          <span>13:13</span>
          <span className="inline-flex items-center gap-1.5" aria-hidden="true">
            <span className="h-3 w-3 rounded-full bg-black/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-black/65" />
            <span className="h-2 w-2 rounded-full bg-black/50" />
            <span className="relative h-[13px] w-[26px] rounded-[3px] border-2 border-black/30 after:absolute after:-right-1 after:top-[3px] after:h-[5px] after:w-0.5 after:rounded-full after:bg-black/30" />
          </span>
        </header>

        <section className="flex flex-1 flex-col">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-[72px] flex flex-col items-center gap-2.5 text-center sm:mt-[82px]"
          >
            <h1
              className="m-0 text-[clamp(3.25rem,15vw,4.15rem)] font-bold leading-[0.95] tracking-normal text-[#43556B]"
              style={{ fontFamily: '"Oleo Script", cursive' }}
            >
              Conch
            </h1>
            <p className="m-0 text-[0.94rem] font-medium tracking-[0.23em] text-[#43556B]/80">
              把回忆放到耳边，听见旅途回响
            </p>
          </motion.div>

          <div className="flex min-h-0 flex-1 -translate-y-2 items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, rotate: -4 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.72, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="relative grid aspect-square w-[min(72vw,288px)] place-items-center"
            >
              <span className="absolute inset-5 rounded-full bg-[radial-gradient(circle,rgba(255,243,184,0.54),rgba(255,243,184,0))] blur-[18px]" />
              <span className="absolute inset-x-0 bottom-0 top-[30px] translate-x-6 rounded-full bg-[radial-gradient(circle,rgba(200,226,247,0.44),rgba(200,226,247,0))] blur-[20px]" />
              <Image
                src="/conch-hero.png"
                alt=""
                width={300}
                height={300}
                priority
                className="relative h-auto w-full max-w-[286px] drop-shadow-[0_18px_26px_rgba(124,96,58,0.12)]"
              />
            </motion.div>
          </div>

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18 }}
            className="flex flex-col items-center gap-[22px] pb-3"
            aria-label="开启旅行"
          >
            <button
              type="button"
              onClick={onStart}
              className="min-h-[58px] w-[min(100%,320px)] rounded-full border border-white/50 bg-white/90 text-base font-semibold text-[#43556B] shadow-[0_18px_44px_rgba(32,44,58,0.12)] backdrop-blur transition hover:-translate-y-0.5 hover:shadow-[0_20px_52px_rgba(32,44,58,0.14)] active:translate-y-0 active:scale-[0.99]"
            >
              开启旅程
            </button>
            <div className="h-1.5 w-32 rounded-full bg-black/10" aria-hidden="true" />
          </motion.section>
        </section>

        <div className="absolute bottom-[74px] right-2 text-[1.7rem] text-white/90 opacity-60 drop-shadow-[0_4px_14px_rgba(32,44,58,0.15)]" aria-hidden="true">
          ✦
        </div>
      </div>
    </main>
  );
}
