# CoverflowAltTab

CoverflowAltTab is an Alt-Tab replacement available as an extension for [Gnome-Shell](https://www.gnome.org/). It lets you Alt-Tab through your windows in a cover-flow manner.

Originally this was a port of the CoverflowAltTab extension for Gnome-Shell by [palatis](http://code.google.com/p/gnome-shell-extensions-coverflowalttab/) and the recent rewrite with lots of improvements was done by [Lusito](https://github.com/Lusito), so a big thanks and all the glory to them!

![Screenshot](img/screenshot.png)

## Installation

#### Gnome-Shell

Easiest way to install the extension is via [extensions.gnome.org](https://extensions.gnome.org/extension/97/coverflow-alt-tab/), the official Gnome extension platform. Head over there and install CoverflowAltTab with one click by toggling the switch on the site.

If you want to install it manually (e.g. to test the latest, probably unstable code), download the zip file by clicking the zip button on the upper part of this page and extract it.

  1. Copy the folder "CoverflowAltTab@dmo60.de" to `~/.local/share/gnome-shell/extensions/`.

  2. Use the Extensions tool or [extensions.gnome.org](https://extensions.gnome.org/local/) to enable the extension.

or execute commands at the terminal:

  - `make all` (With this command, the script installs this extension in the user directory)

  - `make all LOCALINSTALL=true` (With this command, the script installs this extension in the /usr directory)

#### Cinnamon

Not maintained anymore, unfortunately. However, pull requests are always welcomed.

## Usage

This extension uses the following key bindings (you can change or disable them in your system settings):

-   "Switch applications" (usually **Alt+Tab**): Cycle through all windows from the current workspace
-   "Switch windows of an application" (usually **Ctrl+Tab**): Cycle through all windows from the current application from all workspaces
-   "Switch system controls" (usually **Ctrl+Alt+Tab**): Cycle through all windows from all workspaces (who wants to cycle through system controls anyway?)

All of the shortcuts with **Shift** key pressed cycles backward.

-   Hit **Esc** to cancel.
-   Hit **q** to close highlighted window.
-   Hit **d** to hide all windows and show the desktop.

You can also use the **arrow keys** or your **mouse wheel** to cycle through the windows.

## Customization

To change the keybindings, use your system keyboard settings! See above for the used keybindings and change them to your desire.

Recently we have added a second Animation style you can use instead of the Coverflow one. It is called 'Timeline' and was inspired by the Windows 7 Super-Tab switcher. You can activate it in the extension preferences. Check it out!

#### Gnome-Shell

To access preferences you can:

  - Open the Extensions tool. You should find it in your system menu
  - Click the preferences button on [extensions.gnome.org](https://extensions.gnome.org/local/)
  - run `gnome-extensions prefs CoverflowAltTab@dmo60.de` inside a terminal

This will show you a preference dialog where you can change the settings to your needs.

## Troubleshooting

#### I have to manually enable the extension every time I start my computer.

Many GNU/Linux distributions, namely Debian and its derivatives, install some extensions by default. Among those it's very common to find the [AlternateTab](https://extensions.gnome.org/extension/15/alternatetab/) extension; unfortunately, both AlternateTab and CoverflowAltTab are alt-tab replacements, and so they conflict: AlternateTab is usually the winning one, and so CoverflowAltTab appears as enabled but does not work as expected.

All you need to do to be able to enjoy the CoverflowAltTab eyecandy is to disable AlternateTab (or any other alt-tab replacement extension)! To do that, you might use the Extensions tool or visit https://extensions.gnome.org/local/. CoverflowAltTab might need to be disabled and re-enabled after you disable the offending extension(s), but this time it'll continue working even after a reboot.

## License

CoverflowAltTab is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

See the [contributors list](CONTRIBUTORS.markdown) and [a copy of the license](COPYING).
