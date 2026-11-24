"use client";

import dynamic from "next/dynamic";

const RecordScene = dynamic(() => import("./record-scene"), { ssr: false });

export function SceneMount({ sectionIds, archiveCount }: { sectionIds: string[]; archiveCount: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <RecordScene sectionIds={sectionIds} archiveCount={archiveCount} />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-black" />
    </div>
  );
}
