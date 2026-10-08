import { motion } from 'motion/react';
import { ChevronLeft, RotateCcw } from 'lucide-react';

export default function RefundPolicy({ onBack }: { onBack: () => void; key?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      className="min-h-[100dvh] bg-[#F5F3FF] dark:bg-[#0B0C10] flex flex-col font-sans"
    >
      <div className="bg-white dark:bg-[#1C1E24] shadow-sm sticky top-0 z-10 p-4 flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-600 dark:text-slate-300 active:bg-slate-100 dark:active:bg-slate-800 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold text-slate-800 dark:text-white absolute left-1/2 -translate-x-1/2">
          Refund Policy
        </h1>
        <div className="w-10"></div>
      </div>

      <div className="p-6 flex-1 overflow-y-auto pb-12">
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mb-4">
            <RotateCcw className="w-8 h-8 text-rose-500" />
          </div>
          <h2 className="text-xl font-black italic text-slate-800 dark:text-white text-center">
            Refunds & Returns
          </h2>
        </div>

        <div className="bg-white dark:bg-[#1C1E24] p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 text-sm font-medium text-slate-600 dark:text-slate-400 space-y-4">
          <p>
            [Please insert your official Refund Policy here. It is recommended to have legal counsel review refund parameters and conditions for digital transactions.]
          </p>
          <p>
            Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. 
          </p>
          <h3 className="text-base font-bold text-slate-800 dark:text-white pt-2">Eligibility</h3>
          <p>
            Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
          </p>
          <h3 className="text-base font-bold text-slate-800 dark:text-white pt-2">Process</h3>
          <p>
            Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
