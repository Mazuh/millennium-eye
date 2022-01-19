import get from 'lodash.get';
import { createContext, useEffect, useRef, useState } from 'react';
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
  const videoCallHandlerRef = useRef(null);
  const setVideoCallHandler = (handler) => (videoCallHandlerRef.current = handler);
  const sessionDescriptorRef = useRef(null);
  const setSessionDescriptor = (s) => (sessionDescriptorRef.current = s);

  const registerUsername = (username) => {
    setCallState(STATE_REGISTERING);
    videoCallHandlerRef.current.send({ message: { request: 'register', username } });
  };

  const tryCall = (opponent) => {
    setCallState(STATE_CALLING);

    videoCallHandlerRef.current.createOffer({
      media: {},
      success: (offerDescriptor) => {
        videoCallHandlerRef.current.send({
          message: { request: 'call', username: opponent },
          jsep: offerDescriptor,
        });
      },
      error: (error) => {
        console.error('Create offer error', error);
        setCallState(STATE_CALL_FAILED);
      },
    });
  };

  const acceptIncomingCall = () => {
    setCallState(STATE_ANSWERING);

    videoCallHandlerRef.current.createAnswer({
      jsep: sessionDescriptorRef.current,
      media: {},
      success: (answerDescriptor) => {
        videoCallHandlerRef.current.send({
          message: { request: 'accept' },
          jsep: answerDescriptor,
        });
      },
      error: (error) => {
        console.error('Create answer error', error);
        setCallState(STATE_CALL_FAILED);
      },
    });
  };

  const hangup = () => {
    videoCallHandlerRef.current.send({ message: { request: 'hangup' } });
    videoCallHandlerRef.current.hangup();
  };

  const handleJanusMessage = (message, incomingSessionDescriptor) => {
    if (incomingSessionDescriptor) {
      setSessionDescriptor(incomingSessionDescriptor);
    }

    const event = get(message, 'result.event');
    const errorCode = get(message, 'error_code');

    if (event === 'registered') {
      setCallState(STATE_REGISTERED);
    } else if (errorCode === JANUS_VIDEOCALL_ERROR_NO_SUCH_USERNAME) {
      setCallState(STATE_CALL_FAILED);
    } else if (event === 'incomingcall') {
      setCallState(STATE_RINGING);
    } else if (errorCode === JANUS_VIDEOCALL_ERROR_USERNAME_TAKEN) {
      setCallState(STATE_REGISTER_FAILED);
    } else if (event === 'accepted') {
      videoCallHandlerRef.current.handleRemoteJsep({ jsep: sessionDescriptorRef.current });
    } else {
      console.warn('NOT IMPLEMENTED: onmessage', message, incomingSessionDescriptor);
    }
  };

  useEffect(() => {
    Janus.init({
      debug: true,
      callback: () => {
        setCallState(STATE_CONNECTING);

        const janusInstance = new Janus({
          server: 'http://localhost:8088/janus',
          iceServers: [
            {
              urls: 'stun:stun.l.google.com:19302',
            },
          ],
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
              onlocalstream: (stream) => {
                const video = document.querySelector('#local-video');
                Janus.attachMediaStream(video, stream);
                video.muted = 'muted';
              },
              onremotestream: (stream) => {
                const video = document.querySelector('#remote-video');
                Janus.attachMediaStream(video, stream);
                video.muted = 'muted';
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
    acceptIncomingCall,
    hangup,
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
export const STATE_ANSWERING = 'ANSWERING';
export const STATE_IN_CALL = 'IN_CALL';
export const STATE_CALL_FAILED = 'CALL_FAILED';
export const STATE_CALL_HUNGUP = 'CALL_HUNGUP';
export const STATE_DISCONNECTED = 'DISCONNECTED';
