#!/bin/bash
set -euo pipefail

uuid=CoverflowAltTab@palatis.blogspot.com

if [[ ${1:-} != --session ]]; then
    repo=$(cd -- "$(dirname -- "$0")/.." && pwd)
    root=$(mktemp -d /tmp/coverflow-smoke.XXXXXX)
    extension="$root/data/gnome-shell/extensions/$uuid"
    helper="$root/data/gnome-shell/extensions/coverflow-smoke@local"
    mkdir -p "$extension" "$helper" "$root/config" "$root/cache" "$root/runtime"
    chmod 700 "$root/runtime"
    cp -a "$repo/src/." "$extension/"
    cp -a "$repo/metadata.json" "$repo/schemas" "$repo/ui" "$repo/dbus-interfaces" "$extension/"
    glib-compile-schemas --strict "$extension/schemas"
    cat > "$helper/metadata.json" <<'JSON'
{"uuid":"coverflow-smoke@local","name":"Coverflow smoke helper","description":"Isolated runtime checks","shell-version":["51"]}
JSON
    cat > "$helper/extension.js" <<'JS'
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
export default class {
    enable() {
        global.context.unsafe_mode = true;
        globalThis.coverflowSmoke = {
            Main,
            Clutter,
            get extension() {
                return Main.extensionManager.lookup('CoverflowAltTab@palatis.blogspot.com');
            },
            get manager() {
                return this.extension.stateObj.manager;
            },
        };
    }
    disable() {
        global.context.unsafe_mode = false;
        delete globalThis.coverflowSmoke;
    }
}
JS
    cat > "$root/windows.js" <<'JS'
imports.gi.versions.Gtk = '4.0';
const {Gtk} = imports.gi;
const app = new Gtk.Application({application_id: ARGV[0]});
app.connect('activate', () => {
    for (let index = 0; index < Number(ARGV[1]); index++) {
        const window = new Gtk.ApplicationWindow({
            application: app,
            title: `${ARGV[0]} ${index}`,
            default_width: 480,
            default_height: 320,
        });
        window.set_child(new Gtk.Label({label: window.title}));
        window.present();
    }
});
app.run([]);
JS
    export XDG_DATA_HOME="$root/data" XDG_CONFIG_HOME="$root/config"
    export XDG_CACHE_HOME="$root/cache" XDG_RUNTIME_DIR="$root/runtime"
    export GSETTINGS_BACKEND=keyfile GDK_BACKEND=wayland GTK_A11Y=none
    unset DISPLAY WAYLAND_DISPLAY XDG_SESSION_ID
    status=0
    timeout 90s dbus-run-session -- bash "$repo/tests/gnome-shell-smoke.sh" --session "$root" > "$root/session.log" 2>&1 || status=$?
    if grep -Eq 'JS ERROR|Gtk-CRITICAL' "$root/session.log" ||
        grep -Eq 'JS ERROR|CRITICAL|Cogl-WARNING|Failed to compile.*shader' "$root/active-shell.log" 2>/dev/null; then
        status=1
    fi
    if [[ $status != 0 ]]; then
        tail -80 "$root/session.log"
        tail -80 "$root/shell.log"
        printf 'FAIL: runtime logs retained in %s\n' "$root" >&2
        exit "$status"
    fi
    grep '^PASS:' "$root/session.log"
    rm -rf -- "$root"
    exit 0
fi

root=$2
gsettings set org.gnome.shell enabled-extensions "['$uuid', 'coverflow-smoke@local']"
gsettings set org.gnome.shell welcome-dialog-last-shown-version '51.0'
gnome-shell --headless --virtual-monitor=1280x800 --virtual-monitor=1024x768 --no-x11 > "$root/shell.log" 2>&1 &
shell_pid=$!
trap 'kill "$shell_pid" 2>/dev/null || true; wait "$shell_pid" 2>/dev/null || true' EXIT

shell_eval() {
    gdbus call --session --dest org.gnome.Shell --object-path /org/gnome/Shell --method org.gnome.Shell.Eval "$1"
}

check() {
    local result
    result=$(shell_eval "$1")
    if [[ $result != "(true, 'true')" ]]; then
        printf 'FAIL: %s\n%s\n' "$1" "$result" >&2
        shell_eval '[coverflowSmoke.Main.actionMode, coverflowSmoke.Main.overview.visible, global.display.get_tab_list(0, null).map(window => window.get_title())]' >&2 || true
        return 1
    fi
}

wait_for() {
    local attempt
    for attempt in {1..60}; do
        if [[ $(shell_eval "$1" 2>/dev/null) == "(true, 'true')" ]]; then
            return 0
        fi
        sleep 0.2
    done
    check "$1"
}

control() {
    gdbus call --session --dest org.gnome.Shell.Extensions.Coverflowalttab --object-path /org/gnome/Shell/Extensions/Coverflowalttab --method "org.gnome.Shell.Extensions.Coverflowalttab.$1" "${@:2}" > /dev/null
}

wait_for 'typeof coverflowSmoke !== "undefined"'
check 'coverflowSmoke.extension.state === 1 && coverflowSmoke.extension.error === ""'
wait_for '!coverflowSmoke.Main.layoutManager._startingUp'
check 'coverflowSmoke.Main.overview.hide(); true'
export WAYLAND_DISPLAY=wayland-0
gjs "$root/windows.js" org.example.CoverflowSmoke 2 > "$root/windows.log" 2>&1 &
gjs "$root/windows.js" org.example.CoverflowOther 1 >> "$root/windows.log" 2>&1 &
wait_for 'global.display.get_tab_list(0, null).length === 3 && coverflowSmoke.Main.actionMode === 1'
check 'coverflowSmoke.keyboard = global.stage.context.get_backend().get_default_seat().create_virtual_device(coverflowSmoke.Clutter.InputDeviceType.KEYBOARD_DEVICE); true'

key() {
    check "coverflowSmoke.keyboard.notify_keyval(0, coverflowSmoke.Clutter.KEY_$1, coverflowSmoke.Clutter.KeyState.$2); true"
}

for modifier in forward backward cancel; do
    key Alt_L PRESSED
    if [[ $modifier == backward ]]; then key Shift_L PRESSED; fi
    key Tab PRESSED
    key Tab RELEASED
    wait_for 'coverflowSmoke.manager.switcher?._previews?.length === 2'
    check 'coverflowSmoke.manager.switcher._isAppSwitcher && coverflowSmoke.manager.switcher._subSwitchers.size === 1'
    if [[ $modifier == cancel ]]; then
        key Escape PRESSED
        key Escape RELEASED
    fi
    if [[ $modifier == backward ]]; then key Shift_L RELEASED; fi
    key Alt_L RELEASED
    wait_for 'coverflowSmoke.manager.switcher.isDestroyed() && coverflowSmoke.Main.actionMode === 1'
done
printf 'PASS: Alt+Tab, Alt+Shift+Tab, Escape, and modal cleanup\n'

for style in Coverflow Timeline; do
    check "coverflowSmoke.extension.stateObj.getSettings().set_string('switcher-style', '$style'); coverflowSmoke.extension.stateObj.getSettings().set_boolean('use-glitch-effect', true); coverflowSmoke.extension.stateObj.getSettings().set_double('tint-blend', 0.6); true"
    for type in windows applications; do
        control launch "$type"
        wait_for 'coverflowSmoke.manager.switcher?._previews?.length > 0'
        if [[ $type == applications ]]; then
            check 'coverflowSmoke.manager.switcher._subSwitchers.size === 1'
            check 'Array.from(coverflowSmoke.manager.switcher._subSwitchers.values()).every(switcher => switcher._previews.length === 2)'
            check 'coverflowSmoke.manager.switcher._addBackgroundEffects(); coverflowSmoke.manager.switcher._previews.every(preview => preview.get_effect("glitch-effect") !== null && preview.get_effect("tint-effect") !== null)'
        fi
        control next
        sleep 0.3
        control previous
        sleep 0.3
        control select
        wait_for 'coverflowSmoke.manager.switcher.isDestroyed() && coverflowSmoke.Main.actionMode === 1'
    done
    printf 'PASS: %s windows/applications, grouping, tint, and glitch shaders\n' "$style"
done

check 'global.display.get_tab_list(0, null)[0].move_to_monitor(1); coverflowSmoke.extension.stateObj.getSettings().set_boolean("switch-per-monitor", true); coverflowSmoke.extension.stateObj.getSettings().set_boolean("isolate-current-monitor", true); true'
control launch windows
wait_for 'coverflowSmoke.manager.switcher?._previews?.length > 0'
check 'coverflowSmoke.manager.switcher._windows.every(window => window.get_monitor() === coverflowSmoke.manager.switcher._activeMonitor.index)'
control select
wait_for 'coverflowSmoke.manager.switcher.isDestroyed()'
check 'coverflowSmoke.extension.stateObj.getSettings().set_boolean("switch-per-monitor", false); true'
printf 'PASS: per-monitor window isolation\n'

gnome-extensions prefs "$uuid"
wait_for 'global.display.get_tab_list(0, null).some(window => window.get_title() === "Coverflow Alt-Tab")'
check 'global.display.get_tab_list(0, null).find(window => window.get_title() === "Coverflow Alt-Tab").delete(global.get_current_time()); true'
wait_for 'global.display.get_tab_list(0, null).length === 3'
printf 'PASS: preferences open and close without GTK criticals\n'

control launch applications
wait_for 'coverflowSmoke.manager.switcher?._previews?.length > 0'
gnome-extensions disable "$uuid"
wait_for 'coverflowSmoke.extension.state === 2 && coverflowSmoke.Main.actionMode === 1'
check 'coverflowSmoke.Main.panel.opacity === 255'
gnome-extensions enable "$uuid"
wait_for 'coverflowSmoke.extension.state === 1 && coverflowSmoke.extension.error === ""'
printf 'PASS: disable during switching and re-enable\n'

control launch windows
wait_for 'coverflowSmoke.manager.switcher?._previews?.length === 3'
check 'global.display.get_tab_list(0, null).forEach(window => window.delete(global.get_current_time())); true'
wait_for 'global.display.get_tab_list(0, null).length === 0 && coverflowSmoke.manager.switcher.isDestroyed() && coverflowSmoke.Main.actionMode === 1'
printf 'PASS: closing all windows during switching\n'
cp "$root/shell.log" "$root/active-shell.log"
