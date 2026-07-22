# Typography

The approved Come le Api typography uses:

- **Cormorant Garamond** for display headings, editorial titles and the Sara signature.
- **Mulish** for body copy, navigation, buttons, prices and interface text.

Both families are served locally to keep rendering consistent and avoid third-party font requests. They are distributed under the SIL Open Font License 1.1; the complete license texts are included in this folder as `OFL-Cormorant-Garamond.txt` and `OFL-Mulish.txt`.

The public build uses Latin WOFF2 variable subsets: one file for Mulish's 300–800 weight range and two files for Cormorant Garamond's normal and italic ranges. Static TTF files remain available only to the local PDF and illustration generation scripts and are excluded from `dist/`.

Official sources:

- https://github.com/google/fonts/tree/main/ofl/cormorantgaramond
- https://github.com/google/fonts/tree/main/ofl/mulish
