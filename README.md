# Endstep Light Theme

An accessible, light theme for [endstep.cc](https://endstep.cc)

## Release Flow

To release:

1. Bump the version in `package.json` in a pull request, using `npm version <patch|minor|major> --no-git-tag-version`
2. Merge the pull request
3. Tag the merge commit with `vX.Y.Z` on `main`
4. Push the tag to the remote repository

The release is then automated through GitHub Actions. When a tag matching `v*` is pushed, the workflow:

- Builds the extension for Chrome and Firefox
- Creates a GitHub Release with the generated zips
- Optionally uploads them to the respective stores if the necessary secrets are available.

The release notes are automatically generated.
