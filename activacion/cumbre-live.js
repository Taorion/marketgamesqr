(function (root) {
  'use strict';
  function connect(access, onPose) {
    let socket, retry, stopped = false, ready = false, attempts = 0;
    function open() {
      if (stopped || !root.WebSocket || Date.now() >= Date.parse(access.expires_at)) return;
      try {
        const url = new URL(access.path, root.location.href);
        if (url.origin !== root.location.origin) return;
        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        socket = new root.WebSocket(url.href);
        socket.onopen = () => socket.send(JSON.stringify({ type: 'auth', token: access.token }));
        socket.onmessage = event => {
          if (stopped) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'ready') { ready = true; attempts = 0; }
            if (data.type === 'pose' && ready) onPose(data.id, data.pose);
          } catch (_) {}
        };
        socket.onerror = () => {}; // HTTP snapshots continue throughout reconnects.
        socket.onclose = () => {
          ready = false;
          if (!stopped) retry = setTimeout(open, Math.min(5000, 500 * 2 ** attempts++));
        };
      } catch (_) { ready = false; }
    }
    open();
    return {
      send(pose) {
        if (ready && socket?.readyState === 1 && socket.bufferedAmount < 4096) socket.send(JSON.stringify({ type: 'pose', pose }));
      },
      destroy() { stopped = true; clearTimeout(retry); ready = false; socket?.close(); },
    };
  }
  root.QoriSummitLive = { connect };
})(globalThis);
