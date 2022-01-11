import get from 'lodash.get';
import { createContext, useEffect, useState } from 'react';
import Janus from './libs/janus';

export const GlobalContext = createContext();

export default function GlobalProvider({ children }) {
  const [janus, setJanus] = useState(null);
  const [devices, setDevices] = useState({ audio: null, video: null });
  const [username, setUsername] = useState('');
  const [opponent, setOpponent] = useState('');
  const [callState, setCallState] = useState(STATE_OFF);
  const [videoCallHandler, setVideoCallHandler] = useState(null);

  const registerUsername = (username) => {
    setCallState(STATE_REGISTERING);
    videoCallHandler.send({ message: { request: 'register', username } });
  };

  const handleJanusMessage = (message, jsep) => {
    const event = get(message, 'result.event');

    if (event === 'registered') {
      setCallState(STATE_REGISTERED);
    } else {
      console.warn('NOT IMPLEMENTED: onmessage', message, jsep);
    }
  };

  useEffect(() => {
    Janus.init({
      debug: true,
      callback: () => {
        setCallState(STATE_CONNECTING);

        const janusInstance = new Janus({
          server: 'http://localhost:8088/janus',
          success: () => {
            janusInstance.attach({
              plugin: 'janus.plugin.videocall',
              opaqueId: opaqueId,
              success: (videoCallHandler) => {
                setVideoCallHandler(videoCallHandler);
                setCallState(STATE_CONNECTED);
              },
              error: () => {
                setCallState(STATE_CONNECTION_FAILED);
              },
              consentDialog: () => {
                console.warn('NOT IMPLEMENTED: consentDialog');
              },
              webrtcState: (isOn) => {
                console.warn('NOT IMPLEMENTED: webrtcState', isOn);
              },
              onmessage: handleJanusMessage,
              onremotestream: (remote) => {
                console.warn('NOT IMPLEMENTED: onremotestream', remote);
              },
              oncleanup: () => {
                console.warn('NOT IMPLEMENTED: oncleanup');
              },
            });
          },
          error: () => {
            setCallState(STATE_CONNECTION_FAILED);
          },
          destroyed: () => {
            setCallState(STATE_DISCONNECTED);
          },
        });
        setJanus(janusInstance);
      },
    });
  }, []);

  const value = {
    janus,
    setJanus,
    devices,
    setDevices,
    username,
    setUsername,
    opponent,
    setOpponent,
    callState,
    setCallState,
    registerUsername,
  };

  return <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>;
}

const opaqueId = `videocalltest-${Janus.randomString(12)}`;

export const STATE_OFF = 'OFF';
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
export const STATE_DISCONNECTED = 'DISCONNECTED';
