# 💬 sketch-chat

_A Sketch plugin to chat in Sketch Cloud files._

## Installation

- [Download](../../releases/latest/download/sketch-chat.sketchplugin.zip) the latest release of the plugin
- Un-zip
- Double-click on sketch-chat.sketchplugin

## Development Guide

_This plugin was created using `skpm`. For a detailed explanation on how things work, checkout the [skpm Readme](https://github.com/skpm/skpm/blob/master/README.md)._

### Sketch Plugin

Install the dependencies

```bash
npm install
```

Once the installation is done, you can run some commands inside the project folder:

```bash
npm run build
```

To watch for changes:

```bash
npm run watch
```

### Backend

The backend is a serverless application deployed on AWS.

Install the dependencies

```bash
npm i -g serverless
cd backend && npm install
```

Once the installation is done, you can run some commands inside the project folder:

```bash
npm run deploy:dev
```
