const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// react-native-screens 4.x has `"react-native": "src/index"` in package.json.
// Metro prioritises the `react-native` field, so it resolves to TypeScript
// source files containing Fabric codegen specs with "undefined" prop types
// that Metro cannot parse. Override the resolver to force the compiled output.
const screensCommonJS = path.resolve(
  __dirname,
  'node_modules/react-native-screens/lib/commonjs/index.js'
);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-screens') {
    return { filePath: screensCommonJS, type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
