import nx from '@nx/eslint-plugin';
import baseConfig from '../../../eslint.config.mjs';

export default [
  ...nx.configs['flat/react'],
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      /*
       * shadcn generates components that import their siblings through the
       * public alias (`@helpme/ui/lib/utils`) rather than relative paths.
       * Nx would normally require relative imports within a project.
       *
       * We allow the self-reference instead of rewriting the files, so that
       * `shadcn add` output stays byte-identical to upstream and future
       * component updates diff cleanly. This relaxes only intra-library
       * imports — the cross-project constraints in the root config, which
       * are what CLAUDE.md rule 3 is actually about, still apply.
       */
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [
            '^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$',
            '^@helpme/ui/.*$',
          ],
        },
      ],
    },
  },
];
