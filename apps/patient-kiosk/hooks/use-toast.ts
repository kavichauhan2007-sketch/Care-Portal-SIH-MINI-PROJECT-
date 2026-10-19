import { useState, useEffect } from 'react';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'destructive';
}

const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 5000;

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

type ActionType =
  | {
      type: 'ADD_TOAST';
      toast: Toast;
    }
  | {
      type: 'UPDATE_TOAST';
      toast: Partial<Toast>;
    }
  | {
      type: 'DISMISS_TOAST';
      toastId?: string;
    }
  | {
      type: 'REMOVE_TOAST';
      toastId?: string;
    };

interface State {
  toasts: Toast[];
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

export const reducer = (state: State, action: ActionType): State => {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case 'UPDATE_TOAST':
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case 'DISMISS_TOAST': {
      const { toastId } = action;
      if (toastId) {
        const timeout = toastTimeouts.get(toastId);
        if (timeout) clearTimeout(timeout);
      } else {
        toastTimeouts.forEach((timeout) => clearTimeout(timeout));
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                ...action,
              }
            : t
        ),
      };
    }
    case 'REMOVE_TOAST':
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

const listeners: Array<(state: State) => void> = [];

let memoryState: State = { toasts: [] };

function dispatch(action: ActionType) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}


function toast({ ...props }: Omit<Toast, 'id'>) {
  const id = genId();

  const update = (props: Partial<Toast>) =>
    dispatch({
      type: 'UPDATE_TOAST',
      toast: { ...props, id },
    });
  const dismiss = () => dispatch({ type: 'DISMISS_TOAST', toastId: id });

  dispatch({
    type: 'ADD_TOAST',
    toast: {
      ...props,
      id,
    },
  });

  return {
    id,
    dismiss,
    update,
  };
}

function useToast() {
  const [state, setState] = useState<State>(memoryState);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: 'DISMISS_TOAST', toastId }),
  };
}

export { useToast, toast };
