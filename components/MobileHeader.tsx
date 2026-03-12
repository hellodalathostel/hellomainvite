
import React from 'react';

const MobileHeader: React.FC = () => {
  return (
    <header className="lg:hidden min-h-[3.5rem] h-auto pt-[env(safe-area-inset-top)] bg-white dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between px-4 shrink-0 z-30 transition-all">
       <div className="flex items-center gap-2 h-14">
         <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold">HD</div>
           <span className="font-bold text-lg text-gray-900 dark:text-white">Hello Dalat</span>
       </div>
       <div />
    </header>
  );
};

export default MobileHeader;
