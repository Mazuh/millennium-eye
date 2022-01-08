import 'webrtc-adapter';
import { useContext, useEffect, useState } from 'react';
import './App.css';
import Janus from './libs/janus';
import GlobalProvider, { GlobalContext, STATE_CONNECTED, STATE_CONNECTING } from './contexts';

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

  const { setDevices, setUsername, setOpponent, setCallState, setJanus } =
    useContext(GlobalContext);
  const handleSubmit = (event) => {
    event.preventDefault();

    const username = event.target.username.value.trim();
    setUsername(username);

    const opponent = event.target.opponent.value.trim();
    setOpponent(opponent);

    const devices = {
      audio: microphones.find((m) => m.deviceId === event.target.microphone.value) || null,
      camera: cameras.find((c) => c.deviceId === event.target.camera.value) || null,
    };
    setDevices(devices);

    setCallState(STATE_CONNECTING);
    const janusInstance = new Janus({
      server: 'http://localhost:8088/janus',
      success: () => {
        setCallState(STATE_CONNECTED);
      },
    });
    setJanus(janusInstance);
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
      <form onSubmit={handleSubmit}>
        <label>
          My username:
          <input name="username" autoComplete="off" required />
        </label>
        <br />
        <label>
          Another player's username:
          <input name="opponent" autoComplete="off" required />
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
        <button>Duel!</button>
      </form>
    </main>
  );
}
