// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    // Ensure the inputs are within the correct ranges
    h = h % 360;
    s = Math.max(0, Math.min(1, s/100));
    l = Math.max(0, Math.min(1, l/100));

    if (s === 0) {
        // Achromatic (gray)
        const gray = Math.round(l * 255);
        return { r: gray, g: gray, b: gray };
    }

    const c = (1 - Math.abs(2 * l - 1)) * s; // Chroma
    const x = c * (1 - Math.abs((h / 60) % 2 - 1)); // Secondary color component
    const m = l - c / 2;

    let r = 0, g = 0, b = 0;

    if (h >= 0 && h < 60) {
        [r, g, b] = [c, x, 0];
    } else if (h >= 60 && h < 120) {
        [r, g, b] = [x, c, 0];
    } else if (h >= 120 && h < 180) {
        [r, g, b] = [0, c, x];
    } else if (h >= 180 && h < 240) {
        [r, g, b] = [0, x, c];
    } else if (h >= 240 && h < 300) {
        [r, g, b] = [x, 0, c];
    } else if (h >= 300 && h < 360) {
        [r, g, b] = [c, 0, x];
    }

    // Convert to 0-255 range and round
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return { r, g, b };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    // Normalize RGB values to the range [0, 1]
    r /= 255;
    g /= 255;
    b /= 255;

    // Calculate the minimum and maximum of the normalized RGB values
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    // Calculate lightness
    let l = (max + min) / 2;

    // Calculate hue
    let h = 0;
    if (delta !== 0) {
        if (max === r) {
            h = ((g - b) / delta) % 6;
        } else if (max === g) {
            h = (b - r) / delta + 2;
        } else if (max === b) {
            h = (r - g) / delta + 4;
        }
        h *= 60;
        if (h < 0) {
			h += 360;
		}
    }

    // Calculate saturation
    let s = 0;
    if (delta !== 0) {
        s = delta / (1 - Math.abs(2 * l - 1));
    }

    return { h, s, l };
}

export function activate(context: vscode.ExtensionContext) {

	const cssSelector = { language: 'css', scheme: 'file' };
	const provider = vscode.languages.registerColorProvider(cssSelector, {
		provideDocumentColors(document: vscode.TextDocument): vscode.ColorInformation[] {
			const colorInformations: vscode.ColorInformation[] = [];
			const text = document.getText();
            //        matches: `--var-name:  130.2        50.3%      10.4%`
			const colorRegex = /--[\w-]+:\s+\d+.?\d*?\s+\d+.?\d*?%\s+\d+.?\d*%/g;
			let match;
			while ((match = colorRegex.exec(text))) {
				let [varName, hueRaw, saturationRaw, lightnessRaw] = match[0].split(/\s+/);
				const hue = parseFloat(hueRaw);
				const saturation = parseFloat(saturationRaw.replace(/%$/, ""));
				const lightness = parseFloat(lightnessRaw.replace(/%$/, ""));
				const startPos = document.positionAt(match.index + varName.length + 1); // plus one for the space after the `:`
				const endPos = document.positionAt(match.index + match[0].length);
				const range = new vscode.Range(startPos, endPos);
				

				const { r, g, b } = hslToRgb(hue, saturation, lightness);
				const colorValue = new vscode.Color(r / 255, g / 255, b / 255, 1);
				colorInformations.push(new vscode.ColorInformation(range, colorValue));
			}
			return colorInformations;
		},
		provideColorPresentations(color: vscode.Color, context: { document: vscode.TextDocument, range: vscode.Range }): vscode.ColorPresentation[] {
			const { red, green, blue } = color;
			const { h, s, l } = rgbToHsl(red * 255, green * 255, blue * 255);
			const hslString = `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
			const colorPresentation = new vscode.ColorPresentation(hslString);
			colorPresentation.textEdit = new vscode.TextEdit(context.range, hslString);
			return [colorPresentation];
		}
	});
	context.subscriptions.push(provider);
}

// This method is called when your extension is deactivated
export function deactivate() {}
