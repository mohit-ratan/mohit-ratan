import { createContext, useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import TaskCelebration from '../components/TaskCelebration';
const CelebrationContext = createContext(() => {});
export function CelebrationProvider({ children }) {
  const [celebration, setCelebration] = useState(null);
  return <CelebrationContext.Provider value={setCelebration}>{children}{celebration && createPortal(<TaskCelebration key={celebration.postId} celebration={celebration} onClose={() => setCelebration(null)} />, document.body)}</CelebrationContext.Provider>;
}
export const useCelebration = () => useContext(CelebrationContext);
