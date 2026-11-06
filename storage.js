// Shared local storage for moving audio between the sampler and synth pages.
window.loopStore = {
  async db() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('looper', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('data');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  async access(mode, key, value) {
    const db = await this.db();
    try {
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction('data', mode);
        const store = transaction.objectStore('data');
        const request = mode === 'readonly' ? store.get(key) : value === undefined ? store.delete(key) : store.put(value, key);
        transaction.oncomplete = () => resolve(request.result);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error || new Error('Storage transaction aborted'));
      });
    } finally { db.close(); }
  },
  get(key) { return this.access('readonly', key); },
  put(key, value) { return this.access('readwrite', key, value); },
  remove(key) { return this.access('readwrite', key); },
  pack(buffer) {
    return { sampleRate: buffer.sampleRate, channels: Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i).slice()) };
  },
  unpack(data, context) {
    const buffer = context.createBuffer(data.channels.length, data.channels[0].length, data.sampleRate);
    data.channels.forEach((channel, i) => buffer.copyToChannel(channel, i));
    return buffer;
  }
};
