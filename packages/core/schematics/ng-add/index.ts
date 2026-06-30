import { chain, Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { init } from '../init/index';

export function ngAdd(options: any): Rule {
  return chain([
    (tree: Tree, context: SchematicContext) => {
      context.addTask(new NodePackageInstallTask());
      return tree;
    },
    init(options),
  ]);
}

