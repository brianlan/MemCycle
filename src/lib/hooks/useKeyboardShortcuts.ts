import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  description?: string;
  enabled?: boolean;
  action: (e: KeyboardEvent) => void;
}

function isInputElement(element: EventTarget | null): boolean {
  if (!element || !(element instanceof HTMLElement)) {
    return false;
  }
  const tagName = element.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    element.isContentEditable
  );
}

function matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
  const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase() || 
                   event.code.toLowerCase() === shortcut.key.toLowerCase();
  const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : true;
  const metaMatch = shortcut.meta ? event.metaKey : true;
  const shiftMatch = shortcut.shift ? event.shiftKey : true;
  const altMatch = shortcut.alt ? event.altKey : true;
  
  return keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
  excludeInputs?: boolean;
}

export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
  excludeInputs = true,
}: UseKeyboardShortcutsOptions) {
  // Use refs to store latest values to avoid re-registering listeners
  const shortcutsRef = useRef(shortcuts);
  const enabledRef = useRef(enabled);
  const excludeInputsRef = useRef(excludeInputs);

  // Keep refs in sync with latest values
  shortcutsRef.current = shortcuts;
  enabledRef.current = enabled;
  excludeInputsRef.current = excludeInputs;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabledRef.current) {
      return;
    }

    // Skip input elements
    if (excludeInputsRef.current && isInputElement(document.activeElement)) {
      return;
    }

    for (const shortcut of shortcutsRef.current) {
      if (matchesShortcut(e, shortcut)) {
        e.preventDefault();
        shortcut.action(e);
        return;
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
}

// Pre-built shortcut configurations for common use cases

export const reviewPopupShortcuts = (
  isRevealed: boolean,
  onReveal: () => void,
  onRate: (rating: 1 | 2 | 3 | 4) => void,
  onDismiss: () => void
): KeyboardShortcut[] => [
  {
    key: 'Escape',
    description: 'Dismiss review',
    action: onDismiss,
  },
  {
    key: ' ',
    description: 'Reveal answer',
    action: () => {
      if (!isRevealed) {
        onReveal();
      }
    },
  },
  {
    key: 'Enter',
    description: 'Reveal answer',
    action: () => {
      if (!isRevealed) {
        onReveal();
      }
    },
  },
  {
    key: '1',
    description: 'Rate 1 - Again',
    action: () => {
      if (isRevealed) {
        onRate(1);
      }
    },
  },
  {
    key: '2',
    description: 'Rate 2 - Hard',
    action: () => {
      if (isRevealed) {
        onRate(2);
      }
    },
  },
  {
    key: '3',
    description: 'Rate 3 - Good',
    action: () => {
      if (isRevealed) {
        onRate(3);
      }
    },
  },
  {
    key: '4',
    description: 'Rate 4 - Easy',
    action: () => {
      if (isRevealed) {
        onRate(4);
      }
    },
  },
];

export const cardFormShortcuts = (
  onSave: () => void,
  onCancel: () => void
): KeyboardShortcut[] => [
  {
    key: 'Enter',
    meta: true,
    description: 'Save card',
    action: onSave,
  },
  {
    key: 'Escape',
    description: 'Cancel',
    action: onCancel,
  },
];

export const globalShortcuts = (
  onOpenSettings: () => void,
  onOpenNewCard: () => void
): KeyboardShortcut[] => [
  {
    key: ',',
    meta: true,
    description: 'Open settings',
    action: onOpenSettings,
  },
  {
    key: 'n',
    meta: true,
    description: 'Create new card',
    action: onOpenNewCard,
  },
];
