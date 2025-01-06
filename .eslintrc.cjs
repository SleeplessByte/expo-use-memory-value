module.exports = {
  root: true,
  extends: ['universe/native', 'universe/web'],
  rules: {
    'react/jsx-fragments': [1, 'element'],
    '@typescript-eslint/no-redeclare': 0,
    'prettier/prettier': 0,
  },
  overrides: [
    {
      files: ['index.ts', '*.ts'],
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  ],
};
