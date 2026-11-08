// On supported Safari versions, use media playback routing (including Silent Mode).
window.looperAudio = {
  createContext() {
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback';
    } catch { /* Older browsers keep their default audio routing. */ }
    const Context = window.AudioContext || window.webkitAudioContext;
    return new Context();
  }
};
