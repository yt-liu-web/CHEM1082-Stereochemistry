# CHEM 1082 Stereochemistry Models

The conformation lab homepage (`index.html`) contains navigation links to three interactive models. Each model opens on its own page:

- **CHClBr–CHClBr** (`newman.html`): the molecular model and matching fill-in-the-blank Newman projections.
- **1,2-dibromoethane** (`dibromoethane.html`): 3D viewing and Newman projections from either viewing direction.
- **2-bromobutane** (`bromobutane.html`): free 3D rotation, comparison with the start, C2–C3 rotation, and Br/H removal and insertion.

Each model links back to the conformation lab homepage and to the other models. In the CHClBr–CHClBr model, the initial arrangement matches the supplied drawing: both H atoms up, both Cl atoms toward the viewer, and both Br atoms behind. Rotating the C–C bond preserves the configuration.

## Publish with GitHub Pages

1. Upload all files in this folder to the root of the repository's `main` branch. Keep all four HTML pages and both PDF files together.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select **main** and **/ (root)**, then save.
4. Wait for GitHub to finish deploying. Share the website address shown on the Pages settings screen with students.

This is a static website. It needs no build command, server, API key, or student sign-in once published publicly. Repository visibility and GitHub account plan may affect whether Pages publishing is available.

## Use the CHClBr–CHClBr model

- Drag the molecular model to rotate the whole molecule.
- Move the C–C rotation slider to explore conformations.
- Choose **Side view** or **Front / Newman** to align the molecule.
- Fill the six Newman projection blanks with H, Cl, or Br and check the answers.
- Use the worksheet and answer-key PDF links for printable materials.

Rear bonds start at the rear-carbon circle and are slightly offset in eclipsed projections so the front and rear positions stay readable.

## Included files

- `index.html` — conformation lab navigation
- `newman.html` — CHClBr–CHClBr model
- `bromobutane.html` — interactive 2-bromobutane model
- `dibromoethane.html` — 1,2-dibromoethane Newman projection practice
- `chclbr-newman-worksheet.pdf` — printable student worksheet
- `chclbr-newman-answer-key.pdf` — printable answer key
- `.nojekyll` — serves the files directly through GitHub Pages

