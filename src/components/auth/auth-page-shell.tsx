import Image from "next/image";
import type { ReactNode } from "react";

export function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-[100dvh] bg-black flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="flex flex-col items-center w-full sm:max-w-[440px]">
        <div className="mb-6 sm:mb-8 flex justify-center w-full">
          <Image src="/images/logo.svg" alt="Trade Mate" height={40} width={213} className="h-8 sm:h-10 w-auto object-contain" />
        </div>
        <div className="w-full gradient-dialog-bg border border-white/20 p-6 shadow-2xl rounded-[20px] text-white">
          {children}
        </div>
      </div>
    </main>
  );
}
