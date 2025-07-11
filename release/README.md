# Release

The files in this directory are auto-generated by running the `generate-release-config.mjs` script.

The `release-please+17.1.0.patch` file is included as we run a modified version of the prerelease strategy where it always just increments the prerelease version.

The following steps were used to create it:

- Install the `release-please` package
- In the following file `build/src/versioning-strategies/prerelease.js` modify the `determineReleaseType` method and replace the whole method with just the following code:

```js
return new PrereleasePatchVersionUpdate(this.prereleaseType);
```

- Then run the following to generate the patch:

```shell
npx patch-package release-please --patch-dir release
```
