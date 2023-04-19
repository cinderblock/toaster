# Toaster

A simple web dashboard for my SMT reflow oven (T-962 + Raspberry Pi)

## First time setup

1. Install [Raspberry Pi OS](https://www.raspberrypi.com/software/) on your Raspberry Pi
2. Setup [access to your Pi](https://www.raspberrypi.com/documentation/computers/remote-access.html) via SSH with a private key
3. Run `npm i` (`npm install`) locally to install dependencies locally
4. Run `npm run dev` to deploy the app to your Pi

## Develop alongside [RDT](https://github.com/cinderblock/rdt)

1. Run `npm i` in both the `toaster` and `rdt` directories to set them up
   - Run `npm run watch` in `rdt` to build continuously
2. Replace dist pacakge in `node_modules/@cinderblock/rdt` with a symlink to your local `rdt/.dist` directory
   - Linux
   ```
   rm -rf node_modules/@cinderblock/rdt
   ln -s ~/path/to/rdt node_modules/@cinderblock/rdt
   ```
   - Windows _(PowerShell, [ensure "Developer Mode" is enabled](https://learn.microsoft.com/en-us/windows/apps/get-started/enable-your-device-for-development#activate-developer-mode))_
   ```
   rm -r -fo node_modules/@cinderblock/rdt
   $null = New-Item -ItemType Junction -Path node_modules/@cinderblock/rdt -Value ~/path/to/rdt/.dist
   ```
