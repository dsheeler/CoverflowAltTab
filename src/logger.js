import GObject from 'gi://GObject';
import Gio from 'gi://Gio';

export const CoverflowLogger = new GObject.registerClass({
    GTypeName: "CoverflowLogger",
    Properties: {
        'verbose_logging': GObject.ParamSpec.boolean(
            `verbose_logging`,
            `Verbose`,
            `Verbose Log messages.`,
            GObject.ParamFlags.READWRITE,
            false,
        ),
    }
}, class CoverflowLogger extends GObject.Object {
    constructor(settings) {
        super();
        this.settings = settings;
        this.settings.bind('verbose-logging', this, 'verbose_logging', Gio.SettingsBindFlags.DEFAULT);
        this.indent = "  ";
        this.depth = 0;
    }

    increaseIndent() {
        this.depth += 1;
    }

    decreaseIndent() {
        this.depth = Math.max(0, this.depth - 1);
    }

    log(msg) {
        if (this.verbose_logging)
            console.log(`${this.prepareMessage('[LOG  ] ' + this.indent.repeat(this.depth) + msg)}`);
    }

    error(msg) {
        console.log(`${this.prepareMessage('[ERROR] ' + this.indent.repeat(this.depth) + msg)}`)
    }

    debug(msg) {
        if (this.verbose_logging) {
            console.log(`${this.prepareMessage('[DEBUG] ' + this.indent.repeat(this.depth) + msg)}`);
        }
    }

    prepareMessage(msg) {
        return `[CoverflowAltTab@palatis.blogspot.com]${msg}`;
    }
});
