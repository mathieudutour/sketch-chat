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
    onStartup().show();
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
      `onOpenDocument("${doc.sketchObject.cloudShare().shortID()}")`
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
    width: 240,
    height: 180,
    minimizable: false,
    maximizable: false,
    hidesOnDeactivate: false,
    acceptFirstMouse: true,
    remembersWindowFrame: true,
    show: false
  };

  const browserWindow = new BrowserWindow(options);

  browserWindow.setAlwaysOnTop(true, "modal-panel");

  browserWindow.on("close", event => {
    event.preventDefault();
    browserWindow.hide();
  });

  const threadDic = NSThread.mainThread().threadDictionary();

  browserWindow.webContents.executeJavaScript(
    `document.body.classList.add("__skpm-${
      typeof MSTheme !== "undefined" && MSTheme.sharedTheme().isDark()
        ? "dark"
        : "light"
    }")`
  );

  const observer = new MochaJSDelegate({
    "observeValueForKeyPath:ofObject:change:context:": () => {
      browserWindow.webContents.executeJavaScript(
        `document.body.classList.remove("__skpm-${
          typeof MSTheme !== "undefined" && MSTheme.sharedTheme().isDark()
            ? "light"
            : "dark"
        }"); document.body.classList.add("__skpm-${
          typeof MSTheme !== "undefined" && MSTheme.sharedTheme().isDark()
            ? "dark"
            : "light"
        }")`
      );
    }
  }).getClassInstance();

  NSApplication.sharedApplication().addObserver_forKeyPath_options_context(
    observer,
    "effectiveAppearance",
    NSKeyValueChangeNewKey,
    null
  );

  threadDic["sketch-chat.onThemeChanged"] = observer;

  const user = cloudUser();
  browserWindow.webContents.insertJS(
    `window.CLOUD_USER = ${JSON.stringify(user)}`
  );

  const delegate = new MochaJSDelegate({
    "onCloudUserChanged:": () => {
      const user = cloudUser();
      browserWindow.webContents.insertJS(
        `window.CLOUD_USER = ${JSON.stringify(user)}`
      );
      browserWindow.webContents.executeJavaScript(
        `onCloudUserChanged(${JSON.stringify(user)})`
      );
    }
  }).getClassInstance();

  const sel = NSSelectorFromString("onCloudUserChanged:");

  NSNotificationCenter.defaultCenter().addObserver_selector_name_object(
    delegate,
    sel,
    SCKUserController.userDidChangeNotification(),
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
      `onOpenDocument("${doc.sketchObject.cloudShare().shortID()}")`
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

  const observer = threadDic["sketch-chat.onThemeChanged"];
  if (observer) {
    NSApplication.sharedApplication().removeObserver_forKeyPath(
      observer,
      "effectiveAppearance"
    );
    threadDic.removeObjectForKey("sketch-chat.onThemeChanged");
  }
}
