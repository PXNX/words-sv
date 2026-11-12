// Cuts a corpus source file down to one language level at build time. The story and reading
// corpora are plain TypeScript arrays (`export const stories: Story[] = [{ level: 'a1', … }, …]`);
// importing such a file as `./stories.ts?level=a1` yields the same module with every entry of
// another level left out, so each level becomes its own chunk without the texts being moved into
// separate files. Entries without a literal `level` (spreads, helpers) stay, and imports of other
// corpus files are passed the same level.
import ts from 'typescript';
import type { Plugin } from 'vite';

type Edit = { start: number; end: number; text: string };

/** The entries of every top-level array, as `[kept, dropped]` counts, and the rewritten source. */
export function sliceByLevel(source: string, level: string, follow: (specifier: string) => boolean = () => false): { code: string; kept: number; dropped: number } {
  const file = ts.createSourceFile('corpus.ts', source, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const edits: Edit[] = [];
  let kept = 0;
  let dropped = 0;

  const levelOf = (element: ts.Expression): string | null => {
    if (!ts.isObjectLiteralExpression(element)) return null;
    for (const property of element.properties) {
      if (ts.isPropertyAssignment(property) && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) && property.name.text === 'level' && ts.isStringLiteralLike(property.initializer)) return property.initializer.text;
    }
    return null;
  };
  const arrayOf = (expression: ts.Expression | undefined): ts.ArrayLiteralExpression | null => {
    let current = expression;
    while (current && (ts.isAsExpression(current) || ts.isSatisfiesExpression(current) || ts.isParenthesizedExpression(current))) current = current.expression;
    return current && ts.isArrayLiteralExpression(current) ? current : null;
  };

  for (const statement of file.statements) {
    if ((ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
      const specifier = statement.moduleSpecifier;
      if (!(ts.isImportDeclaration(statement) && statement.importClause?.isTypeOnly) && follow(specifier.text)) {
        edits.push({ start: specifier.getStart(file), end: specifier.end, text: JSON.stringify(`${specifier.text}?level=${level}`) });
      }
      continue;
    }
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      const array = arrayOf(declaration.initializer);
      if (!array) continue;
      const levels = array.elements.map(levelOf);
      if (levels.every((entry) => entry === null)) continue;
      const stay = array.elements.filter((_, index) => levels[index] === null || levels[index] === level);
      kept += stay.filter((element) => levelOf(element) !== null).length;
      dropped += array.elements.length - stay.length;
      edits.push({ start: array.elements.pos, end: array.elements.end, text: `\n${stay.map((element) => source.slice(element.getStart(file), element.end)).join(',\n')}\n` });
    }
  }

  let code = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) code = code.slice(0, edit.start) + edit.text + code.slice(edit.end);
  return { code, kept, dropped };
}

const baseName = (path: string) => path.slice(path.lastIndexOf('/') + 1).replace(/\.[cm]?[jt]s$/u, '');

/** Vite plugin: `<corpus file>?level=<level>` loads that file with only the level's entries. */
export function levelSlicePlugin(files: readonly string[]): Plugin {
  const names = new Set(files.map(baseName));
  return {
    name: 'corpus-level-slice',
    enforce: 'pre',
    transform(code, id) {
      const [path = '', query = ''] = id.split('?');
      const level = new URLSearchParams(query).get('level');
      if (!level || !files.some((file) => path.endsWith(file))) return null;
      const sliced = sliceByLevel(code, level, (specifier) => specifier.startsWith('.') && names.has(baseName(specifier)));
      // A corpus file whose entries no longer carry a literal level would silently ship whole.
      if (sliced.kept + sliced.dropped === 0) this.error(`${path}: no entries with a literal \`level\` found to slice`);
      return { code: sliced.code, map: null };
    }
  };
}
