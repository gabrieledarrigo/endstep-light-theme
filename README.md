# Endstep Light Theme

> An accessible, light theme for [endstep.cc](https://endstep.cc)

Endstep Light Theme is designed to provide a visually accessible and user-friendly experience for users of [endstep.cc](https://endstep.cc), providing a light and warm color scheme, reminiscent of paper and natural light.

## Screenshots

Some screenshots of the theme in action.

The homepage:

<img width="1024" alt="Homepage" src="https://github.com/user-attachments/assets/ae6b8117-38c6-47ae-8e34-bc62feeacb6d" />

The game board:

<img width="1024" alt="Game board" src="https://github.com/user-attachments/assets/8ce350b0-61ec-44f5-9bb4-256b0d61541a" />

The tournaments page:

<img width="1024" alt="Tournaments" src="https://github.com/user-attachments/assets/f20b7858-4d4c-4989-832d-73fdaa7a5cb0" />

## Supported Browsers

Endstep Light Theme currently supports these browsers:

| Browser | Supported Versions                   |
| ------- | ------------------------------------ |
| Chrome  | Current stable and the one before it |
| Firefox | Current stable and the one before it |
| Edge    | Current stable and the one before it |

## Privacy

Endstep Light Theme privacy policy can be found in the [PRIVACY.md](PRIVACY.md) file.

## Development

To set up the development environment:

1. Clone the repository
2. Install dependencies with `npm install`
3. Build the extension with `npm run build`
4. Load the extension in your browser's developer mode using the generated build files

## Release Flow

To release:

1. Bump the version in `package.json` in a pull request, using `npm version <patch|minor|major> --no-git-tag-version`
2. Merge the pull request
3. Tag the merge commit with `vX.Y.Z` on `main`
4. Push the tag to the remote repository

The release is then automated through GitHub Actions. When a tag matching `v*` is pushed, the workflow:

- Builds the extension for Chrome, Firefox, and Edge
- Creates a GitHub Release with the generated zips
- Uploads them to the respective stores

The release notes are automatically generated.
