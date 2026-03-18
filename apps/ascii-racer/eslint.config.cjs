const baseConfig = require('../../eslint.config.cjs');
const angular = require('@angular-eslint/eslint-plugin');
const angularTemplate = require('@angular-eslint/eslint-plugin-template');
const angularTemplateParser = require('@angular-eslint/template-parser');
const tsParser = require('@typescript-eslint/parser');

module.exports = [
  ...baseConfig,
  {
    files: ['**/*.ts'],
    plugins: {
      '@angular-eslint': angular,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ['apps/ascii-racer/tsconfig.*?.json'],
      },
    },
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'ascii-racer', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'ascii-racer', style: 'kebab-case' },
      ],
    },
  },
  {
    files: ['**/*.html'],
    plugins: {
      '@angular-eslint/template': angularTemplate,
    },
    languageOptions: {
      parser: angularTemplateParser,
    },
    rules: {},
  },
];
