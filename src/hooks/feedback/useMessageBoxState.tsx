import { useReducer, useCallback } from "react";

interface MessageBoxState {
  inputMessage: string;
  currentPendingId: string | null;
  isRegistering: boolean;
}

type MessageBoxAction =
  | { type: 'SET_INPUT'; payload: string }
  | { type: 'SET_PENDING_ID'; payload: string | null }
  | { type: 'SET_REGISTERING'; payload: boolean }
  | { type: 'CLEAR_INPUT' }
  | { type: 'RESET' };

const initialState: MessageBoxState = {
  inputMessage: "",
  currentPendingId: null,
  isRegistering: false,
};

function messageBoxReducer(
  state: MessageBoxState,
  action: MessageBoxAction
): MessageBoxState {
  switch (action.type) {
    case 'SET_INPUT':
      return { ...state, inputMessage: action.payload };
    case 'SET_PENDING_ID':
      return { ...state, currentPendingId: action.payload };
    case 'SET_REGISTERING':
      return { ...state, isRegistering: action.payload };
    case 'CLEAR_INPUT':
      return { ...state, inputMessage: "" };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function useMessageBoxState() {
  const [state, dispatch] = useReducer(messageBoxReducer, initialState);

  const setInputMessage = useCallback((message: string) => {
    dispatch({ type: 'SET_INPUT', payload: message });
  }, []);

  const setPendingId = useCallback((id: string | null) => {
    dispatch({ type: 'SET_PENDING_ID', payload: id });
  }, []);

  const setRegistering = useCallback((registering: boolean) => {
    dispatch({ type: 'SET_REGISTERING', payload: registering });
  }, []);

  const clearInput = useCallback(() => {
    dispatch({ type: 'CLEAR_INPUT' });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return {
    ...state,
    setInputMessage,
    setPendingId,
    setRegistering,
    clearInput,
    reset,
  };
}