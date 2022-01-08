import { createContext, useEffect, useState } from 'react';
import Janus from './libs/janus';

export const GlobalContext = createContext();

export default function GlobalProvider({ children }) {
  const [devices, setDevices] = useState({ audio: null, video: null });
  const [username, setUsername] = useState('');
  const [opponent, setOpponent] = useState('');
  const [callState, setCallState] = useState(STATE_OFF);
  const [janus, setJanus] = useState(null);

  useEffect(() => {
    Janus.init({
      debug: true,
      callback: () => {
        setJanus(janus);
        setCallState(STATE_INITIALIZED);
      },
    });
  }, []);

  const value = {
    devices,
    setDevices,
    username,
    setUsername,
    opponent,
    setOpponent,
    callState,
    setCallState,
  };

  return <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>;
}

export const STATE_OFF = 'OFF';
export const STATE_INITIALIZED = 'INITIALIZED';
export const STATE_CONNECTING = 'CONNECTING';
export const STATE_CONNECTED = 'CONNECTED';
export const STATE_CONNECTION_FAILED = 'CONNECTION_FAILED';
export const STATE_REGISTERING = 'REGISTERING';
export const STATE_REGISTERED = 'REGISTERED';
export const STATE_REGISTER_FAILED = 'REGISTER_FAILED';
export const STATE_CALLING = 'CALLING';
export const STATE_IN_CALL = 'IN_CALL';
export const STATE_CALL_FAILED = 'CALL_FAILED';
export const STATE_CALL_HUNGUP = 'CALL_HUNGUP';
