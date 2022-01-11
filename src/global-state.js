import get from 'lodash.get';
import { createContext, useEffect, useState } from 'react';
import Janus from './libs/janus';
import {
  JANUS_VIDEOCALL_ERROR_NO_SUCH_USERNAME,
  JANUS_VIDEOCALL_ERROR_USERNAME_TAKEN,
} from './libs/video-call-error-codes';

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

  const tryCall = (opponent) => {
    videoCallHandler.createOffer({
      media: {},
      success: (jsep) => {
        videoCallHandler.send({ message: { request: 'call', username: opponent }, jsep: jsep });
      },
      error: (error) => {
        console.error('Create offer error', error);
        setCallState(STATE_CALL_FAILED);
      },
    });
  };

  const handleJanusMessage = (message, jsep) => {
    const event = get(message, 'result.event');
    const errorCode = get(message, 'error_code');

    if (event === 'registered') {
      setCallState(STATE_REGISTERED);
    } else if (errorCode === JANUS_VIDEOCALL_ERROR_NO_SUCH_USERNAME) {
      setCallState(STATE_CALL_FAILED);
    } else if (event === 'calling') {
      setCallState(STATE_CALLING);
    } else if (event === 'incomingcall') {
      setCallState(STATE_RINGING);
    } else if (errorCode === JANUS_VIDEOCALL_ERROR_USERNAME_TAKEN) {
      setCallState(STATE_REGISTER_FAILED);
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
                setCallState(STATE_REGISTERED);
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
    tryCall,
  };

  return <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>;
}

const opaqueId = `videocallygo-${Janus.randomString(12)}`;

export const STATE_OFF = 'OFF';
export const STATE_CONNECTING = 'CONNECTING';
export const STATE_CONNECTED = 'CONNECTED';
export const STATE_CONNECTION_FAILED = 'CONNECTION_FAILED';
export const STATE_REGISTERING = 'REGISTERING';
export const STATE_REGISTERED = 'REGISTERED';
export const STATE_REGISTER_FAILED = 'REGISTER_FAILED';
export const STATE_CALLING = 'CALLING';
export const STATE_RINGING = 'RINGING';
export const STATE_IN_CALL = 'IN_CALL';
export const STATE_CALL_FAILED = 'CALL_FAILED';
export const STATE_CALL_HUNGUP = 'CALL_HUNGUP';
export const STATE_DISCONNECTED = 'DISCONNECTED';
