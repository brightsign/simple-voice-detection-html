# Example: Voice Detection BrightSign Model Package (BSMP) Demo using an HTML5 Application

This demo HTML/JS application showcases the tech behind the NPU that is enabled in Brightsign players.  This demo highlights:

- Full motion video
- Detects a person close enough to be heard by using a video model to "see" a person
- Listens for key words and triggers different videos

## Key Words

* Chocolate
* Pizza
* Drinks
* Shampoo

## Just Use It!

1. ensure you have all the pre-requisites per the [BSMP](https://github.com/brightsign/brightsign-npu-voice-extension)
2. copy the contents of the 'sd' folder to an SD card
3. copy the [BSMP](https://github.com/brightsign/brightsign-npu-voice-extension/releases/download/v0.1.0-alpha/cobra-standalone-npu_voice-0.1.0.bsfw) onto the SD card
4. place the SD card into the player and boot

## Prerequisites

This project assumes you are working in Linux.  On MacOS we get an error in the dependencies:

```
npm error Error: Cannot find module 'node-bin-darwin-arm64/package.json'
```

You can also just use a Linux container to do the build steps.  The container we often use is

* [brightsign-dev-container](https://github.com/brightsign/brightsign-dev-container)

## Building the App

First, clone the repository. Then, from the home directory of this repo:

```
make prep
make build
```

## Deploying the Application

The easiest way to build the file folder you need is to:

```
make publish
```

This should place all the files you need into the "sd" folder.  It should look like this:

```sh
sd
├── autorun.brs
└── dist
    ├── bundle.js
    ├── chacolate.mp4
    ├── drinks.mp4
    ├── index.html
    ├── meet-brightsign.mp4
    ├── pizza.mp4
    └── shampoo.mp4
```

## Ensure the BSMP is Installed

The makefile automatically downloads and copies the BSMP to the sd folder.  However, if you want to manually do this step:

* download the [gaze detection bsfw installation package](https://firmware.bsn.cloud/cobra-standalone-npu_gaze-0.1.3-alpha.bsfw)
* copy the file to the root of the SD card
* it will be automatically installed on the next boot

## Licensing

This project is released under the terms of the [Apache 2.0 License](./LICENSE.txt).
