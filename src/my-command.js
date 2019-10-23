import BrowserWindow from "sketch-module-web-view";
import { getWebview, sendToWebview } from "sketch-module-web-view/remote";
import { getSelectedDocument } from "sketch/dom";
import MochaJSDelegate from "mocha-js-delegate";

const webviewIdentifier = "sketch-chat.webview";

export default function(context) {
  const existingWebview = getWebview(webviewIdentifier);
  if (existingWebview) {
    if (existingWebview.isVisible()) {
      existingWebview.hide();
    } else {
      existingWebview.show();
    }
  } else {
    const browserWindow = onStartup();
    browserWindow.once("ready-to-show", () => {
      browserWindow.show();
    });
  }
}

export function onOpenDocument() {
  setTimeout(() => {
    const doc = getSelectedDocument();
    if (
      !doc ||
      !doc.sketchObject.cloudShare ||
      !doc.sketchObject.cloudShare() ||
      !doc.sketchObject.cloudShare().shortID()
    ) {
      sendToWebview(webviewIdentifier, `onOpenDocument(undefined)`);
      return;
    }
    sendToWebview(
      webviewIdentifier,
      `onOpenDocument("${String(doc.sketchObject.cloudShare().shortID())}")`
    );
  }, 100);
}

function cloudUser() {
  let user = undefined;
  if (MSCloudAction.userController().user()) {
    user = {
      name: String(
        MSCloudAction.userController()
          .user()
          .name()
      ),
      avatar: String(
        MSCloudAction.userController()
          .user()
          .avatar()
          .largeURL()
      )
    };
  }

  return user;
}

export function onStartup() {
  const options = {
    identifier: webviewIdentifier,
    width: 300,
    height: 500,
    minimizable: false,
    maximizable: false,
    hidesOnDeactivate: false,
    acceptFirstMouse: true,
    remembersWindowFrame: true,
    show: false,
    frame: false
  };

  const browserWindow = new BrowserWindow(options);

  browserWindow.setAlwaysOnTop(true, "modal-panel");

  browserWindow.on("close", event => {
    event.preventDefault();
    browserWindow.hide();
  });

  browserWindow.webContents.on("sign-in-sketch-cloud", () => {
    MSCloudAction.signIn();
  });

  browserWindow.webContents.on("close-window", () => {
    browserWindow.hide();
  });

  const threadDic = NSThread.mainThread().threadDictionary();

  const user = cloudUser();
  browserWindow.webContents.insertJS(
    `window.CLOUD_USER = ${JSON.stringify(user)}`
  );

  const delegate = new MochaJSDelegate({
    "onCurrentDocumentChanged:": () => {
      const doc = getSelectedDocument();
      if (
        doc &&
        doc.sketchObject.cloudShare &&
        doc.sketchObject.cloudShare() &&
        doc.sketchObject.cloudShare().shortID()
      ) {
        browserWindow.webContents.executeJavaScript(
          `onCurrentDocumentChanged && onCurrentDocumentChanged("${String(
            doc.sketchObject.cloudShare().shortID()
          )}")`
        );
      }
    },
    "onCloudUserChanged:": () => {
      const user = cloudUser();
      console.log(user);
      browserWindow.webContents.insertJS(
        `window.CLOUD_USER = ${JSON.stringify(user)}`
      );
      browserWindow.webContents.executeJavaScript(
        `onCloudUserChanged && onCloudUserChanged(${JSON.stringify(user)})`
      );
    }
  }).getClassInstance();

  const onCloudUserChanged = NSSelectorFromString("onCloudUserChanged:");

  NSNotificationCenter.defaultCenter().addObserver_selector_name_object(
    delegate,
    onCloudUserChanged,
    SCKUserController.userDidChangeNotification(),
    null
  );

  const onCurrentDocumentChanged = NSSelectorFromString(
    "onCurrentDocumentChanged:"
  );

  NSNotificationCenter.defaultCenter().addObserver_selector_name_object(
    delegate,
    onCurrentDocumentChanged,
    NSWindowDidBecomeKeyNotification,
    null
  );

  threadDic["sketch-chat.onCloudUserChanged"] = delegate;

  browserWindow.loadURL(require("../resources/webview.html"));

  const doc = getSelectedDocument();
  if (
    doc &&
    doc.sketchObject.cloudShare &&
    doc.sketchObject.cloudShare() &&
    doc.sketchObject.cloudShare().shortID()
  ) {
    browserWindow.webContents.executeJavaScript(
      `onOpenDocument && onOpenDocument("${String(
        doc.sketchObject.cloudShare().shortID()
      )}")`
    );
  }

  return browserWindow;
}

// When the plugin is shutdown by Sketch (for example when the user disable the plugin)
// we need to close the webview if it's open
export function onShutdown() {
  const existingWebview = getWebview(webviewIdentifier);
  if (existingWebview) {
    existingWebview.close();
  }

  const threadDic = NSThread.mainThread().threadDictionary();

  const delegate = threadDic["sketch-chat.onCloudUserChanged"];
  if (delegate) {
    NSNotificationCenter.defaultCenter().removeObserver(delegate);
    threadDic.removeObjectForKey("sketch-chat.onCloudUserChanged");
  }
}
