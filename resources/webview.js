import * as React from "react";
import * as ReactDOM from "react-dom";
import * as randomstring from "randomstring";

const DEFAULT_SERVER_URL = "ws://sketch-chat.herokuapp.com/";

const ConnectionEnum = {
  NONE: "NONE",
  CONNECTED: "CONNECTED",
  ERROR: "ERROR",
  CONNECTING: "CONNECTING"
};

const SelectionStateEnum = {
  READY: "READY",
  NONE: "NONE",
  LOADING: "LOADING"
};

// interface MessageData {
//   message: string;
//   id: string;
//   room: string;
//   user: {
//     name: string;
//     avatar?: string;
//   };
// }

// interface User {
//   name: string;
//   avatar?: string;
// }

function Message({ data, me }) {
  const username = data.user.name || "";
  const isSender = data.user.name === me.name;

  try {
    const message = data.message;

    return (
      <div className={`message ${isSender ? "me" : "blue"}`}>
        {!isSender ? <div className="user">{username}</div> : ""}
        {message.selection ? (
          <span
            onClick={() =>
              // @ts-ignore
              window.postMessage("focus-nodes", {
                ids: message.selection
              })
            }
          >
            {message.text}
            <button className="selection button button--secondary">
              attached elements
            </button>
          </span>
        ) : (
          <span>{message.text}</span>
        )}
      </div>
    );
  } catch (err) {
    console.error(err);
    return null;
  }
}

function Settings(props) {
  const closeSettings = () => props.setSettingsView(false);

  const [url, setUrl] = React.useState(props.url);

  const saveSettings = () => {
    if (url && url !== props.url) {
      window.postMessage("set-server-url", url);
    }

    props.setSettingsView(false);
  };

  return (
    <div className="settings">
      <div className="fields">
        <h4>
          Server URL (requires restart)
          <p onClick={() => setUrl(DEFAULT_SERVER_URL)}>
            default: {DEFAULT_SERVER_URL}
          </p>
        </h4>

        <input
          type="input"
          value={url}
          onChange={e => setUrl(e.target.value.substr(0, 255))}
          className="input"
          placeholder="Server-URL ..."
        />
      </div>

      <div className="footer">
        <button
          type="submit"
          onClick={saveSettings}
          className="button button--primary"
        >
          save
        </button>
        <button
          type="button"
          onClick={closeSettings}
          className="button button--secondary"
        >
          cancel
        </button>
      </div>
    </div>
  );
}

const roomsToConnectTo = [];

window.onOpenDocument = doc => {
  roomsToConnectTo.push(doc);
};

function heartbeat() {
  clearTimeout(this.pingTimeout);

  // Use `WebSocket#terminate()`, which immediately destroys the connection,
  // instead of `WebSocket#close()`, which waits for the close timer.
  // Delay should be equal to the interval at which your server
  // sends out pings plus a conservative assumption of the latency.
  this.pingTimeout = setTimeout(() => {
    this.terminate();
  }, 30000 + 1000);
}

const init = (SERVER_URL = DEFAULT_SERVER_URL, CLOUD_USER = undefined) => {
  const socket =
    CLOUD_USER &&
    new WebSocket(
      `${SERVER_URL}?name=${encodeURIComponent(
        (CLOUD_USER || {}).name
      )}&avatar=${encodeURIComponent((CLOUD_USER || {}).avatar)}`
    );

  // if (socket) {
  //   socket.
  //   socket.on("open", heartbeat);
  //   socket.on("ping", heartbeat);
  //   socket.on("close", function clear() {
  //     clearTimeout(this.pingTimeout);
  //   });
  // }

  const App = () => {
    if (!CLOUD_USER) {
      return (
        <div className="connection">
          <div>
            Not signed in to Sketch Cloud <br />
            <br />
            <button
              className="button button--secondary"
              onClick={() => window.postMessage("sign-in-sketch-cloud")}
            >
              sign in
            </button>
          </div>
        </div>
      );
    }

    const [isSettingsView, setSettingsView] = React.useState(false);
    const [selectionStatus, setSelectionStatus] = React.useState(
      SelectionStateEnum.NONE
    ); // READY, NONE, LOADING

    const [connection, setConnection] = React.useState(ConnectionEnum.NONE); // CONNECTED, ERROR, CONNECTING
    const [roomName, setRoomName] = React.useState("");
    const [textMessage, setTextMessage] = React.useState("");

    const [messages, setMessages] = React.useState([]);
    const [selection, setSelection] = React.useState([]);

    const messagesEndRef = React.useRef(null);

    const scrollToBottom = () => {
      // scroll to bottom
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollTop =
            messagesEndRef.current.scrollHeight;
        }
      }, 0);
    };

    function sendMessage(e = null) {
      if (e) {
        e.preventDefault();
      }

      if (textMessage || selection) {
        const data = {
          action: "message",
          text: textMessage,
          room: roomName,
          id: randomstring.generate()
        };

        if (selectionStatus === SelectionStateEnum.READY) {
          data.selection = selection;
        } else if (selectionStatus === SelectionStateEnum.NONE) {
          // nothing selected
        }

        const message = JSON.stringify(data);

        socket.send(message);

        appendMessage(
          messages,
          {
            ...data,
            user: CLOUD_USER
          },
          true
        );

        setTextMessage("");
      }
    }

    // @ts-ignore
    window.onOpenDocument = doc => {
      roomsToConnectTo.push(doc);

      if (socket.readyState === socket.OPEN && doc) {
        socket.send(JSON.stringify({ action: "join-room", room: doc }));
      }

      setRoomName(doc);
    };

    window.onCurrentDocumentChanged = doc => {
      setRoomName(doc);
    };

    function appendMessage(messages, messageData, sender = false) {
      // silent on error
      try {
        const newMessage = {
          id: messageData.id,
          user: messageData.user,
          room: messageData.room,
          message: messageData
        };

        setMessages(messages.concat(newMessage));

        if (!sender) {
          window.postMessage(
            "notification",
            messageData.user && messageData.user.name
              ? `New chat message from ${messageData.user.name}`
              : `New chat message`
          );
        }
      } catch (e) {}
    }

    React.useEffect(() => {
      const listener = ({ data }) => {
        console.log(data);
        const parsed = JSON.parse(data);

        if (parsed.action === "message") {
          appendMessage(messages, parsed);
        }
      };
      socket.addEventListener("message", listener);

      // scroll to bottom
      scrollToBottom();

      return () => {
        socket.removeEventListener("message", listener);
      };
    }, [messages]);

    React.useEffect(() => {
      if (roomsToConnectTo.length) {
        setRoomName(roomsToConnectTo[roomsToConnectTo.length - 1]);
      }

      setConnection(ConnectionEnum.CONNECTING);

      // scroll to bottom
      scrollToBottom();

      return () => {
        socket.terminate();
      };
    }, []);

    React.useEffect(() => {
      const openListener = () => {
        roomsToConnectTo
          .filter(x => x)
          .forEach(doc =>
            socket.send(JSON.stringify({ action: "join-room", room: doc }))
          );
        setConnection(ConnectionEnum.CONNECTED);
      };
      socket.addEventListener("open", openListener);
      const errorListener = err => {
        console.error(err);
        setConnection(ConnectionEnum.ERROR);
      };
      socket.addEventListener("error", errorListener);
      socket.addEventListener("close", errorListener);

      return () => {
        socket.removeEventListener("open", openListener);
        socket.removeEventListener("error", errorListener);
        socket.removeEventListener("close", errorListener);
      };
    }, [connection]);

    if (isSettingsView) {
      return <Settings setSettingsView={setSettingsView} url={SERVER_URL} />;
    }

    if (connection === ConnectionEnum.CONNECTING) {
      return (
        <div className="connection">
          <div>
            connecting... <br />
            <br />
            <button
              className="button button--secondary"
              onClick={() => {
                init(SERVER_URL, CLOUD_USER);
              }}
            >
              retry
            </button>
            <button
              className="button button--secondary"
              style={{ marginLeft: 10 }}
              onClick={() => setSettingsView(true)}
            >
              settings
            </button>
          </div>
        </div>
      );
    }

    if (connection === ConnectionEnum.ERROR) {
      return (
        <div className="connection">
          <div>
            connection error :( <br />
            <br />
            <button
              className="button button--secondary"
              onClick={() => init(SERVER_URL, CLOUD_USER)}
            >
              retry
            </button>
            <button
              className="button button--secondary"
              style={{ marginLeft: 10 }}
              onClick={() => setSettingsView(true)}
            >
              settings
            </button>
          </div>
        </div>
      );
    }

    if (!roomName) {
      return (
        <div className="connection">
          <div>
            Select a Cloud Document <br />
            <br />
            <button
              className="button button--secondary"
              style={{ marginLeft: 10 }}
              onClick={() => setSettingsView(true)}
            >
              settings
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="main">
        <div className="chat">
          <div className="header">
            <div className="onboarding-tip">
              <div
                className="onboarding-tip__icon"
                onClick={() => setSettingsView(true)}
              >
                <div className="icon icon--adjust icon--button" />
              </div>
              <div className="onboarding-tip__msg">
                <span
                  style={{
                    marginLeft: 0
                  }}
                >
                  {CLOUD_USER.name && <strong>{CLOUD_USER.name}</strong>}
                </span>
              </div>
            </div>
          </div>
          <div className="messages" ref={messagesEndRef}>
            {messages
              .filter(m => m.room === roomName)
              .map(m => (
                <Message key={m.id} data={m} me={CLOUD_USER} />
              ))}
          </div>
          <form className="footer" onSubmit={e => sendMessage(e)}>
            <input
              type="input"
              className="input"
              value={textMessage}
              onChange={e => setTextMessage(e.target.value.substr(0, 1000))}
              placeholder="Write something..."
            />

            <button type="submit">
              <div className="icon icon--play icon--button" />
            </button>
          </form>
        </div>
      </div>
    );
  };

  ReactDOM.render(<App />, document.getElementById("app"));
};

// @ts-ignore
init(window.SERVER_URL, window.CLOUD_USER);

window.onCloudUserChanged = user => init(window.SERVER_URL, user);
