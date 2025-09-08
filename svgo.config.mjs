/**
 * Ensure there's a `<?xml version="1.0" encoding="UTF-8"?>` instruction at the top
 * of the SVG file, exactly like that.
 *
 * @see https://gitlab.gnome.org/GNOME/adwaita-icon-theme/-/blob/49.rc/Adwaita/scalable/mimetypes/model.svg?plain=1 Example icon
 *
 * @param {import('svgo').XastRoot} root
 */
function standardizeEncoding(root) {
    // Based on https://gitlab.gnome.org/GNOME/adwaita-icon-theme
    const STANDARD_XML_ENCODING = 'version="1.0" encoding="UTF-8"';

    const xmlInstruction = root.children.find(node => node.type === 'instruction' && node.name === 'xml');
    if (xmlInstruction?.type !== 'instruction') {
        throw new Error('missing <?xml?> instruction');
    }

    xmlInstruction.value = STANDARD_XML_ENCODING;
}

/**
 * Either parse `viewBox="X Y W H"` or use `width="W" height="H"`.
*
 * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/viewBox SVG - viewBox
 *
 * @param {import('svgo').XastElement} svgElement
 * @returns {[number, number, number, number]}
 */
function getViewBox(svgElement) {
    const viewBox = svgElement.attributes['viewBox']?.trim().split(/\s+/)
        ?? ['0', '0', svgElement.attributes['width'], svgElement.attributes['height']];

    const [x, y, w, h] = viewBox.map(Number);
    if (viewBox.length !== 4 || ![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) {
        throw new Error(`invalid viewBox: '${viewBox.join(' ')}'`);
    }

    return [x, y, w, h];
}

/**
 * Ensure `viewBox` uses the GNOME standard of 16x16 (or multiples of).
 *
 * @see https://developer.gnome.org/hig/guidelines/ui-icons.html UI Icon Style
 *
 * @param {import('svgo').XastRoot} root
 */
function fixViewBoxForGnome(root) {
    const TARGET_SIZE = 16;
    const TARGET_VIEW_BOX = `0 0 ${TARGET_SIZE} ${TARGET_SIZE}`;

    const svgElement = root.children.find(node => node.type === 'element' && node.name === 'svg');
    if (svgElement?.type !== 'element') {
        throw new Error('missing <svg> element');
    }

    if (svgElement.attributes['viewBox'] !== TARGET_VIEW_BOX) {
        const [x, y, w, h] = getViewBox(svgElement);

        const s = TARGET_SIZE / Math.max(w, h);
        const cx = (TARGET_SIZE - s * w) / 2;
        const cy = (TARGET_SIZE - s * h) / 2;

        /** @type {import('svgo').XastElement} */
        const resizeGroup = {
            type: 'element',
            name: 'g',
            attributes: {
                // move to (0,0) => resize to 16x16 => move the center to (8,8)
                transform: `translate(${cx} ${cy}) scale(${s} ${s}) translate(${-x} ${-y})`,
                // leave to SVGO to optimize these transformations
            },
            children: svgElement.children,
        };

        // this group should be optimized away by SVGO, when possible
        svgElement.children = [resizeGroup];
    }

    svgElement.attributes['viewBox'] = TARGET_VIEW_BOX;
}

/**
 * Config for SVGO v4 (tested with `svgo@4.0.0`).
 *
 * @type {import('svgo').Config}
 */
export default {
    multipass: true,
    js2svg: {
        pretty: true,
        indent: 4,
        commentStart: '<!--\n',
        commentEnd: '\n-->',
    },
    floatPrecision: 3,
    plugins: [
        {
            name: 'preset-default',
            params: {
                /** @type {import('svgo').PresetDefaultOverrides} */
                overrides: {
                    cleanupNumericValues: {
                        leadingZero: false,
                    },
                    convertTransform: {
                        convertToShorts: true,
                        transformPrecision: 6,
                        matrixToTransform: true,
                        shortTranslate: true,
                        shortScale: true,
                        shortRotate: true,
                        removeUseless: true,
                        collapseIntoOne: true,
                    },
                    removeComments: {
                        preservePatterns: [/SPDX/],
                    },
                    removeXMLProcInst: false,
                    sortAttrs: {
                        xmlnsOrder: 'alphabetical',
                    }
                }
            }
        },
        'convertStyleToAttrs',
        'removeDimensions',
        'removeTitle',
        {
            name: 'standardizeEncoding',
            fn: standardizeEncoding,
        },
        {
            name: 'fixViewBoxForGnome',
            fn: fixViewBoxForGnome,
        },
    ],
};
