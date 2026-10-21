# CHEM 1082 Stereochemistry Models

The conformation lab homepage (`index.html`) contains navigation links to five interactive models and a chair drawing exercise. Each opens on its own page:

- **2-bromobutane** (`bromobutane.html`): free 3D rotation, comparison with the start, C2–C3 rotation, and Br/H removal and insertion.
- **CHClBr–CHClBr** (`newman.html`): the molecular model and matching fill-in-the-blank Newman projections.
- **1,2-dibromoethane** (`dibromoethane.html`): 3D viewing and Newman projections from either viewing direction.
- **Butane** (`butane.html`): interactive butane conformation model.
- **Cyclohexane** (`cyclohexane.html`): chair flips, axial/equatorial and up/down labels, and a top/Haworth-style view.
- **Cyclohexane chair drawing practice** (`chair-practice.html`): draw both bonds at C1–C6 in each chair, label axial/equatorial and up/down, and check the drawing and labels independently. Includes cis/trans 1-methyl-2-isopropylcyclohexane stability practice.

The homepage also links to the separate configuration lab (`configuration.html`), which opens **Molecules and mirror images** (`mirror-images.html`). This activity shows the original and mirror-image wedge–dash structures alongside their 3D models. The original model stays fixed while students drag the mirror model to test for overlap. Green highlights matching positions in 3D, and red highlights nonmatching positions. Students can also show a plane of symmetry when one exists.

The configuration lab also includes **2-bromobutane: R or S?** (`bromobutane-rs.html`). Molecules A and B are the R and S enantiomers. Students independently rotate or flip each model, assign priorities 1–3 to Br, ethyl, and methyl (H is fixed at 4), then check their R/S assignments. The Point H away control provides the viewing direction for interpreting 1 → 2 → 3. Show answer explains the carbon tie-break. Rotations preserve configuration; answers and views are saved locally in the browser.

Configuration activities link back to the configuration lab. In the CHClBr–CHClBr model, the initial arrangement matches the supplied drawing: both H atoms up, both Cl atoms toward the viewer, and both Br atoms behind. Rotating the C–C bond preserves the configuration.

**cis/trans: dimethylcyclopentane** (`dimethylcyclopentane.html`) compares trans- and cis-1,2-dimethylcyclopentane side by side, with corresponding wedge–dash line structures. Students can rotate each 3D model and choose a C1–CH₃ or C2–CH₃ bond to rotate. Only the methyl hydrogens turn around that bond axis; the methyl carbon stays on its original ring face, so the configuration is unchanged. The ordered **Break → Switch → Form** controls remove the C2–CH₃ and C2–H bonds, exchange those groups, and restore the bonds to invert one ring stereocenter. The line structures update with the model. This is a conceptual stereochemistry operation, not a reaction mechanism; the ring geometry is an idealized teaching model.

## Publish with GitHub Pages

1. Upload all files in this folder to the root of the repository's `main` branch. Keep the HTML, JavaScript, CSS, and PDF files together.
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
- `configuration.html` — configuration lab navigation
- `mirror-images.html` — interactive molecule and mirror-image comparison, 3D overlap feedback, and optional symmetry planes
- `bromobutane-rs.html`, `bromobutane-rs.css`, `bromobutane-rs.js` — R/S configuration and priority-ranking activity
- `bromobutane-rs-core.js` — tetrahedral R/S geometry and rigid-rotation math
- `dimethylcyclopentane.html`, `dimethylcyclopentane.css`, `dimethylcyclopentane.js` — cis/trans comparison, matching wedge–dash structures, methyl rotation, and break/switch/form activity
- `dimethylcyclopentane-core.js` — molecular geometry, methyl torsion, and ordered configuration-change state
- `newman.html` — CHClBr–CHClBr model
- `bromobutane.html` — interactive 2-bromobutane model
- `dibromoethane.html` — 1,2-dibromoethane Newman projection practice
- `butane.html` — interactive butane conformation model
- `cyclohexane.html` — interactive cyclohexane chair and top-view model
- `chair-practice.html`, `chair-practice.css`, `chair-practice.js` — chair bond drawing and labeling exercise
- `chair-core.js` — shared chair geometry and answer checking
- `practice-question.css`, `practice-question.js` — substituted cyclohexane stability practice
- `chclbr-newman-worksheet.pdf` — printable student worksheet
- `chclbr-newman-answer-key.pdf` — printable answer key
- `.nojekyll` — serves the files directly through GitHub Pages

## Use the chair drawing exercise

Open `chair-practice.html` from the conformation homepage or the cyclohexane explorer. Draw both outgoing bonds at each numbered carbon, select a bond, and assign axial/equatorial and up/down labels. Check either chair or both; the solution overlay leaves student work intact. Draw by dragging from a carbon or selecting a carbon and then an endpoint; Enter or Space selects a focused carbon or bond. Drawings and the additional stability-practice attempts stay in memory only while the page is open. Closing, leaving, or reloading the page starts both exercises fresh; switching browser tabs preserves work. Older saved attempts are removed automatically.

The additional 1-methyl-2-isopropylcyclohexane question includes cis and trans cases because the name alone does not specify their relationship. For cis-1,2, the most stable chair places isopropyl equatorial and methyl axial. For trans-1,2, the most stable chair is diequatorial. See [OpenStax section 4.8](https://openstax.org/books/organic-chemistry/pages/4-8-conformations-of-disubstituted-cyclohexanes).


