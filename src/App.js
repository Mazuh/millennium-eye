import 'webrtc-adapter';
import { useContext, useEffect, useState } from 'react';
import './App.css';
import GlobalProvider, {
  GlobalContext,
  STATE_CALLING,
  STATE_CALL_FAILED,
  STATE_CONNECTED,
  STATE_IN_CALL,
  STATE_REGISTERED,
  STATE_REGISTER_FAILED,
  STATE_RINGING,
} from './global-state';

export default function App() {
  return (
    <GlobalProvider>
      <div>
        <header>
          <h1>Millennium Eye</h1>
        </header>
        <JoinView />
        <footer>
          <p>
            <small>
              <CallStatusIndicator />
            </small>
          </p>
        </footer>
      </div>
    </GlobalProvider>
  );
}

function CallStatusIndicator() {
  const { callState } = useContext(GlobalContext);
  return (
    <span>
      <strong>Status:</strong> {callState}
    </span>
  );
}

function JoinView() {
  const [microphones, setMicrophones] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [isLoadingDevices, setLoadingDevices] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        stream.getTracks().forEach((t) => t.stop());
        return navigator.mediaDevices.enumerateDevices();
      })
      .then((allDevices) => {
        const newMicrophones = allDevices.filter(
          (d) => d.kind === 'audioinput' && d.deviceId !== 'communications'
        );
        setMicrophones(newMicrophones);

        const newCameras = allDevices.filter(
          (d) => d.kind === 'videoinput' && d.deviceId !== 'communications'
        );
        setCameras(newCameras);
        setLoadingDevices(false);
      })
      .catch(() => {
        setError('You must allow access to your devices and refresh the page.');
      });
  }, []);

  const {
    callState,
    setDevices,
    setUsername,
    setOpponent,
    registerUsername,
    tryCall,
    acceptIncomingCall,
    hangup,
  } = useContext(GlobalContext);

  const handleRegisterSubmit = (event) => {
    event.preventDefault();

    const username = event.target.username.value.trim();
    setUsername(username);

    const devices = {
      audio: microphones.find((m) => m.deviceId === event.target.microphone.value) || null,
      camera: cameras.find((c) => c.deviceId === event.target.camera.value) || null,
    };
    setDevices(devices);

    registerUsername(username);
  };

  const handleCallSubmit = (event) => {
    event.preventDefault();

    const opponent = event.target.opponent.value.trim();
    setOpponent(opponent);

    tryCall(opponent);
  };

  if (error) {
    return (
      <main>
        <p>
          <strong>Error:</strong> {error}
        </p>
      </main>
    );
  }

  if (isLoadingDevices) {
    return (
      <main>
        <p>
          <em>Loading devices...</em>
        </p>
      </main>
    );
  }

  return (
    <main>
      {(callState === STATE_CONNECTED || callState === STATE_REGISTER_FAILED) && (
        <form onSubmit={handleRegisterSubmit}>
          <label>
            My username:
            <input name="username" autoComplete="off" defaultValue="Marcell" required />
          </label>
          <br />
          <label>
            Microphone:
            <select name="microphone" required>
              {microphones.map((mic) => (
                <option key={mic.deviceId} value={mic.deviceId}>
                  {mic.label}
                </option>
              ))}
            </select>
          </label>
          <br />
          <label>
            Camera:
            <select name="camera" required>
              {cameras.map((cam) => (
                <option key={cam.deviceId} value={cam.deviceId}>
                  {cam.label}
                </option>
              ))}
            </select>
          </label>
          <br />
          <button>Register</button>
        </form>
      )}
      {(callState === STATE_REGISTERED || callState === STATE_CALL_FAILED) && (
        <form onSubmit={handleCallSubmit}>
          <label>
            {"Another player's username:"}
            <input name="opponent" autoComplete="off" defaultValue="Rodrigo" required />
          </label>
          <br />
          <button>Duel!</button>
        </form>
      )}
      {callState === STATE_RINGING && (
        <button type="button" onClick={acceptIncomingCall}>
          Accept call
        </button>
      )}
      {(callState === STATE_RINGING ||
        callState === STATE_CALLING ||
        callState === STATE_IN_CALL) && (
        <button type="button" onClick={hangup}>
          Hangup
        </button>
      )}
    </main>
  );
}
