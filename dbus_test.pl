#!/usr/bin/perl
use Time::HiRes qw(usleep nanosleep);

sleep 5;
system('gnome-extensions enable CoverflowAltTab@palatis.blogspot.com');
usleep 500000;
system('gdbus call --session --dest org.gnome.Shell.Extensions.Coverflowalttab --object-path /org/gnome/Shell/Extensions/Coverflowalttab --method org.gnome.Shell.Extensions.Coverflowalttab.launch "applications"');
sleep 1;

system('gdbus call --session --dest org.gnome.Shell.Extensions.Coverflowalttab --object-path /org/gnome/Shell/Extensions/Coverflowalttab --method org.gnome.Shell.Extensions.Coverflowalttab.next');
sleep 1;
system('gdbus call --session --dest org.gnome.Shell.Extensions.Coverflowalttab --object-path /org/gnome/Shell/Extensions/Coverflowalttab --method org.gnome.Shell.Extensions.Coverflowalttab.next');
usleep 100000;
system('gnome-extensions disable CoverflowAltTab@palatis.blogspot.com');

