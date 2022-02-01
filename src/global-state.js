import get from 'lodash.get';
import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import Janus from './libs/janus';
import {
  JANUS_VIDEOCALL_ERROR_NO_SUCH_USERNAME,
  JANUS_VIDEOCALL_ERROR_USERNAME_TAKEN,
} from './libs/video-call-error-codes';

export const GlobalContext = createContext();

export default function GlobalProvider({ children }) {
  const [janus, setJanus] = useState(null);
  const [fieldJanus, setFieldJanus] = useState(null);
  const [devices, setDevices] = useState({ microphone: null, camera: null });
  const [fieldDevices, setFieldDevices] = useState({ camera: null });
  const [username, setUsername] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [opponent, setOpponent] = useState('');
  const [callState, setCallState] = useState(STATE_OFF);
  const [callFieldState, setCallFieldState] = useState(STATE_OFF);
  const videoCallHandlerRef = useRef(null);
  const videoCallFieldHandlerRef = useRef(null);
  const setVideoCallHandler = (handler) => (videoCallHandlerRef.current = handler);
  const setVideoCallFieldHandler = (handler) => (videoCallFieldHandlerRef.current = handler);
  const sessionDescriptorRef = useRef(null);
  const setSessionDescriptor = (s) => (sessionDescriptorRef.current = s);
  const fieldSessionDescriptorRef = useRef(null);
  const setFieldSessionDescriptor = (s) => (fieldSessionDescriptorRef.current = s);

  const registerUsername = (username) => {
    setCallState(STATE_REGISTERING);
    videoCallHandlerRef.current.send({ message: { request: 'register', username } });
  };

  const registerFieldName = (fieldName) => {
    setCallFieldState(STATE_REGISTERING);
    videoCallFieldHandlerRef.current.send({
      message: { request: 'register', username: fieldName },
    });
  };

  const mediaConstraints = {
    audio: devices.microphone
      ? {
          deviceId: {
            exact: devices.microphone.deviceId,
          },
          advanced: [
            { googEchoCancellation: { exact: true } },
            { googExperimentalEchoCancellation: { exact: true } },
            { autoGainControl: { exact: true } },
            { noiseSuppression: { exact: true } },
            { googHighpassFilter: { exact: true } },
            { googAudioMirroring: { exact: true } },
          ],
        }
      : false,
    video: devices.camera
      ? {
          deviceId: {
            exact: devices.camera.deviceId,
          },
          advanced: [
            { frameRate: { min: 24 } },
            { height: { min: 360 } },
            { width: { min: 640 } },
            { frameRate: { max: 24 } },
            { width: { max: 640 } },
            { height: { max: 360 } },
            { aspectRatio: { exact: 1.77778 } },
          ],
        }
      : false,
  };

  const fieldMediaConstraints = {
    audio: false,
    video: fieldDevices.camera
      ? {
          deviceId: {
            exact: fieldDevices.camera.deviceId,
          },
          advanced: [
            { frameRate: { min: 24 } },
            { height: { min: 360 } },
            { width: { min: 640 } },
            { frameRate: { max: 24 } },
            { width: { max: 640 } },
            { height: { max: 360 } },
            { aspectRatio: { exact: 1.77778 } },
          ],
        }
      : false,
  };

  const tryCall = (opponent) => {
    setCallState(STATE_CALLING);
    setCallFieldState(STATE_CALLING);

    videoCallHandlerRef.current.createOffer({
      media: mediaConstraints,
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

    videoCallFieldHandlerRef.current.createOffer({
      media: fieldMediaConstraints,
      success: (offerDescriptor) => {
        videoCallFieldHandlerRef.current.send({
          message: { request: 'call', username: `${opponent} - field` },
          jsep: offerDescriptor,
        });
      },
      error: (error) => {
        console.error('Create offer error', error);
        setCallFieldState(STATE_CALL_FAILED);
      },
    });
  };

  const acceptIncomingCall = () => {
    setCallState(STATE_ANSWERING);

    videoCallHandlerRef.current.createAnswer({
      jsep: sessionDescriptorRef.current,
      media: mediaConstraints,
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

    videoCallFieldHandlerRef.current.createAnswer({
      jsep: fieldSessionDescriptorRef.current,
      media: fieldMediaConstraints,
      success: (answerDescriptor) => {
        videoCallFieldHandlerRef.current.send({
          message: { request: 'accept' },
          jsep: answerDescriptor,
        });
      },
      error: (error) => {
        console.error('Create answer error', error);
        setCallFieldState(STATE_CALL_FAILED);
      },
    });
  };

  const hangup = () => {
    videoCallHandlerRef.current.send({ message: { request: 'hangup' } });
    videoCallFieldHandlerRef.current.send({ message: { request: 'hangup' } });
    videoCallHandlerRef.current.hangup();
    videoCallFieldHandlerRef.current.hangup();
    setOpponent('');
  };

  const handleJanusMessage = useCallback((message, incomingSessionDescriptor) => {
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
      setOpponent(get(message, 'result.username', ''));
    } else if (errorCode === JANUS_VIDEOCALL_ERROR_USERNAME_TAKEN) {
      setCallState(STATE_REGISTER_FAILED);
    } else if (event === 'accepted') {
      videoCallHandlerRef.current.handleRemoteJsep({ jsep: sessionDescriptorRef.current });
    } else {
      console.warn('NOT IMPLEMENTED: onmessage', message, incomingSessionDescriptor);
    }
  }, []);

  const handleFieldJanusMessage = useCallback((message, incomingSessionDescriptor) => {
    if (incomingSessionDescriptor) {
      setFieldSessionDescriptor(incomingSessionDescriptor);
    }

    const event = get(message, 'result.event');
    const errorCode = get(message, 'error_code');

    if (event === 'registered') {
      setCallFieldState(STATE_REGISTERED);
    } else if (errorCode === JANUS_VIDEOCALL_ERROR_NO_SUCH_USERNAME) {
      setCallFieldState(STATE_CALL_FAILED);
    } else if (event === 'incomingcall') {
      setCallFieldState(STATE_RINGING);
    } else if (errorCode === JANUS_VIDEOCALL_ERROR_USERNAME_TAKEN) {
      setCallFieldState(STATE_REGISTER_FAILED);
    } else if (event === 'accepted') {
      videoCallFieldHandlerRef.current.handleRemoteJsep({
        jsep: fieldSessionDescriptorRef.current,
      });
    } else {
      console.warn(
        'NOT IMPLEMENTED - Field Connection: onmessage',
        message,
        incomingSessionDescriptor
      );
    }
  }, []);

  useEffect(() => {
    // Janus initialization for face communication
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
                if (isOn) {
                  setCallState(STATE_IN_CALL);
                } else {
                  setCallState(STATE_CALL_HUNGUP);
                }
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

    // Janus initialization for field communication
    Janus.init({
      debug: true,
      callback: () => {
        setCallFieldState(STATE_CONNECTING);

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
                setVideoCallFieldHandler(videoCallHandler);
                setCallFieldState(STATE_CONNECTED);
              },
              error: () => {
                setCallFieldState(STATE_CONNECTION_FAILED);
              },
              consentDialog: () => {
                console.warn('NOT IMPLEMENTED - Field Connection: consentDialog');
              },
              webrtcState: (isOn) => {
                if (isOn) {
                  setCallFieldState(STATE_IN_CALL);
                } else {
                  setCallFieldState(STATE_CALL_HUNGUP);
                }
              },
              onmessage: handleFieldJanusMessage,
              onlocalstream: (stream) => {
                const video = document.querySelector('#local-field-video');
                Janus.attachMediaStream(video, stream);
                video.muted = 'muted';
              },
              onremotestream: (stream) => {
                const video = document.querySelector('#remote-field-video');
                Janus.attachMediaStream(video, stream);
                video.muted = 'muted';
              },
              oncleanup: () => {
                setCallFieldState(STATE_REGISTERED);
              },
            });
          },
          error: () => {
            setCallFieldState(STATE_CONNECTION_FAILED);
          },
          destroyed: () => {
            setCallFieldState(STATE_DISCONNECTED);
          },
        });
        setFieldJanus(janusInstance);
      },
    });
  }, [handleJanusMessage, handleFieldJanusMessage]);

  const value = {
    janus,
    setJanus,
    fieldJanus,
    setFieldJanus,
    devices,
    setDevices,
    fieldDevices,
    setFieldDevices,
    username,
    setUsername,
    fieldName,
    setFieldName,
    callFieldState,
    setCallFieldState,
    opponent,
    setOpponent,
    callState,
    setCallState,
    registerUsername,
    registerFieldName,
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
