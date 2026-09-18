import { useEffect, useRef } from 'react';

const dialogs = [];
let bodyOverflow;

// Stack-aware focus management for dialogs that open another dialog.
export default function useDialog(onClose, busy = false) {
  const ref = useRef(null);
  const options = useRef({ onClose, busy });
  useEffect(() => { options.current = { onClose, busy }; }, [onClose, busy]);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const previous = document.activeElement;
    if (!dialogs.length) { bodyOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    dialogs.push(node);
    const focusable = () => [...node.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')].filter((el) => el.getClientRects().length);
    const frame = requestAnimationFrame(() => (focusable()[0] || node).focus());
    function keydown(event) {
      if (dialogs.at(-1) !== node) return;
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopImmediatePropagation();
        if (!options.current.busy) options.current.onClose();
      }
      if (event.key === 'Tab') {
        const items = focusable();
        const first = items[0] || node;
        const last = items.at(-1) || node;
        if (!items.length || !node.contains(document.activeElement) || (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
          event.preventDefault(); (event.shiftKey ? last : first).focus();
        }
      }
    }
    document.addEventListener('keydown', keydown, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', keydown, true);
      dialogs.splice(dialogs.indexOf(node), 1);
      if (!dialogs.length) document.body.style.overflow = bodyOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return ref;
}
