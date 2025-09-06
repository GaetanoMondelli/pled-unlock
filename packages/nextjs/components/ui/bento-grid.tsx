"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "grid md:auto-rows-[22rem] grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto",
        className,
      )}
    >
      {children}
    </div>
  );
};

const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
}) => {
  return (
    <motion.div
      className={cn(
        "row-span-1 rounded-xl group/bento hover:shadow-xl transition duration-200 shadow-input dark:shadow-none p-4 dark:bg-black dark:border-white/[0.2] bg-white border border-transparent justify-between flex flex-col space-y-4",
        className,
      )}
      whileHover={{
        scale: 1.02,
        transition: { duration: 0.2 },
      }}
    >
      {header}
      <div className="group-hover/bento:translate-x-2 transition duration-200 text-center">
        {icon}
        <div className="font-sans font-bold text-neutral-900 dark:text-neutral-100 mb-6 mt-4 text-xl tracking-tight">
          {title}
        </div>
        <div className="font-sans font-normal text-neutral-600 text-sm dark:text-neutral-300">
          {description}
        </div>
      </div>
    </motion.div>
  );
};

export { BentoGrid, BentoGridItem };