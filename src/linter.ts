import * as cp from 'child_process';
import * as vscode from 'vscode';
import * as util from 'util';
import { OelintError, parseOelintError } from './oelintError';

export interface LinterError {
  proto: OelintError;
  range: vscode.Range;
}

export default class Linter {
  private codeDocument: vscode.TextDocument;

  constructor(document: vscode.TextDocument) {
    this.codeDocument = document;
  }

  public async lint(): Promise<LinterError[]> {
    const errors = await this.runProtoLint();
    if (!errors) {
      return [];
    }

    const lintingErrors: LinterError[] = this.parseErrors(errors);
    return lintingErrors;
  }

  private parseErrors(errorStr: string): LinterError[] {
    let errors = errorStr.split('\n') || [];

    var result = errors.reduce((errors: LinterError[], currentError: string) => {
      const parsedError = parseOelintError(currentError);
      if (!parsedError.reason) {
        return errors;
      }

      const linterError: LinterError = this.createLinterError(parsedError);
      return errors.concat(linterError);
    }, []);

    return result;
  }

  private async runProtoLint(): Promise<string> {
    const currentFile = this.codeDocument.uri.fsPath;
    const exec = util.promisify(cp.exec);

    const cmd = `oelint-adv ${currentFile}`;

    let lintResults: string = "";
    await exec(cmd).catch((error: any) => lintResults = error.stderr);

    return lintResults;
  }

  private createLinterError(error: OelintError): LinterError {
    const linterError: LinterError = {
      proto: error,
      range: this.getErrorRange(error)
    };

    return linterError;
  }

  private getErrorRange(error: OelintError): vscode.Range {
    return this.codeDocument.lineAt(error.line - 1).range;
  }
}
