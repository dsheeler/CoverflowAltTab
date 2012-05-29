CoverflowAltTab
================

CoverflowAltTab is an Alt-Tab replacement available as an extension for [Gnome-Shell](http://www.gnome.org/gnome-3/) and [Cinnamon](http://cinnamon.linuxmint.com/).

It let's you Alt-Tab through your windows in a cover-flow manner.

Originally this was a port of the CoverflowAltTab extension for Gnome-Shell by [palatis](http://code.google.com/p/gnome-shell-extensions-coverflowalttab/), so all credits to him!



![Screenshot](http://www.dmo60.de/CoverflowAltTabScreenshotkleinneu.jpg)




Installation
-------------

#### Gnome-Shell ####

Make sure you are on the appropriate branch for your Gnome-Shell version (3.4 is the default, there is also one for 3.2) and download the extension.

  1. Copy the folder "CoverflowAltTab@dmo60.de" to `~/.local/share/gnome-shell/extensions/`.
		
  2. Use Gnome-Tweak-Tool (aka Advanced Settings) to enable the extension. (Eventually you have to restart Gnome-Shell: Press Alt+F2, type 'r' and enter)
	

#### Cinnamon ####

Switch to branch Cinnamon or head over to [Cinnamon-Spices](http://cinnamon-spices.linuxmint.com/extensions/view/3) to download the extension for Cinnamon. 

  1. Copy the folder "CoverflowAltTab@dmo60.de" to `~/.local/share/cinnamon/extensions/`.
	
  2. Enable the extension in Cinnamon Settings. (Eventually you have to restart Cinnamon: Press Alt+F2, type 'r' and enter)
	 



Usage
------

This extension uses the following key bindings (you can change or disable them in your system settings):

  - "Switch applications" (usually **Alt+Tab**): Cycle through all windows from the current workspace
  - "Switch windows of an application" (usually **Ctrl+Tab**): Cycle through all windows from the current application from all workspaces
  - "Switch system controls" (usually **Ctrl+Alt+Tab**): Cycle through all windows from all workspaces (who wants to cycle through system controls anyway?)
    
All of the shortcuts with **Shift** key pressed cycles backward.

  - Hit **Esc** to cancel.
  - Hit **q** to close highlighted window.
  - Hit **d** to hide all windows and show the desktop.

You can also use the **arrow keys** or your **mouse wheel** to cycle through the windows. 




Customization
--------------

You can change the background color and gradient by adjusting the corresponding values in the `stylesheet.css` file.

For those who want, it's also possible to change the position of the window title box (top or bottom), the icon size and spacing and the vertical offset.
To do so, open the `switcher.js` file within the CoverflowAltTab extensions directory, modify the corresponding lines (they are highlighted) and restart Gnome-Shell/Cinnamon.
