/**
    Copyright 2022 Google LLC

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
 */

import { parse, createRunner } from '../lib/main.js';
import { readFileSync, readdirSync, lstatSync } from 'fs';
import { join, isAbsolute, extname, relative } from 'path';
import { pathToFileURL } from 'url';
import { cwd } from 'process';
import { PuppeteerRunnerOwningBrowserExtension } from '../lib/main.js';
import { Browser } from 'puppeteer';
import Table from 'cli-table3';
import colors from 'colors';
import { createLogUpdate } from 'log-update';

type Result = {
  startedAt: Date;
  file: string;
  finishedAt: Date;
  success: boolean | undefined | null;
  title: string;
};

class StatusReport {
  errors: { error: any; file: string }[] = [];
  #resultTextColor = colors.white;
  #table: Table.Table;
  #results: Result[] | undefined;
  #errorString = '';
  #logUpdate = createLogUpdate(process.stdout, { showCursor: true });
  log: boolean;

  constructor(files: string[], log = false) {
    this.log = log;
    this.#table = new Table({
      head: ['Title', 'Status', 'File', 'Duration'],
      chars: {
        top: '═',
        'top-mid': '╤',
        'top-left': '╔',
        'top-right': '╗',
        bottom: '═',
        'bottom-mid': '╧',
        'bottom-left': '╚',
        'bottom-right': '╝',
        left: '║',
        'left-mid': '╟',
        mid: '─',
        'mid-mid': '┼',
        right: '║',
        'right-mid': '╢',
        middle: '│',
      },
      style: {
        head: ['bold'],
      },
    });

    this.results = files.map((file) => ({
      title: '',
      startedAt: new Date(),
      finishedAt: new Date(),
      file,
      success: null,
    }));
  }

  set results(results: Result[]) {
    this.#results = results;
    for (const [index, result] of results.entries()) {
      const row: string[] = [];

      const duration =
        result.finishedAt?.getTime() - result.startedAt.getTime() || 0;
      let status;
      if (typeof result.success !== 'boolean') {
        const statusString = result.success === null ? 'Pending' : 'Running';
        status = this.#resultTextColor.bgYellow(` ${statusString} `);
      } else {
        status = result.success
          ? this.#resultTextColor.bgGreen(' Success ')
          : this.#resultTextColor.bgRed(' Failure ');
      }

      row.push(result.title);
      row.push(status);
      row.push(relative(process.cwd(), result.file));
      row.push(`${duration >= 0 ? duration : 0}ms`);

      this.#table[index] = row;
    }
  }

  get results() {
    return this.#results || [];
  }

  #drawTable() {
    if (this.errors.length) {
      const errorObjects = [...this.errors];
      this.errors = [];

      for (const { file, error } of errorObjects) {
        this.#errorString += `${colors.bgRed.white(
          'Error running file:'
        )} ${file}\n${error.stack}\n\n`;
      }
    }

    this.#logUpdate(this.#table.toString());

    if (this.results.every((result) => typeof result.success == 'boolean')) {
      process.stdout.write(this.#errorString);
    }
  }

  async update({
    index,
    key,
    value,
  }: {
    index: number;
    key: keyof Result;
    value: any;
  }) {
    const result = this.results[index] as Result;
    const modifiedResult = {
      ...result,
      [key]: value,
      ...(key == 'file' && { startedAt: new Date(), success: undefined }),
      finishedAt: new Date(),
    };

    this.results = this.results.map((result, i) => {
      if (index != i) return result;

      return modifiedResult;
    });

    if (this.log) this.#drawTable();
  }
}

export function getJSONFilesFromFolder(path: string): string[] {
  return readdirSync(path)
    .filter((file) => extname(file) === '.json')
    .map((file) => join(path, file));
}

export function getRecordingPaths(
  paths: string[],
  log: boolean = true
): string[] {
  const recordingPaths: string[] = [];

  for (const path of paths) {
    let isDirectory;
    try {
      isDirectory = lstatSync(path).isDirectory();
    } catch (err) {
      log && console.error(`Couldn't find file/folder: ${path}`, err);

      continue;
    }

    if (isDirectory) {
      const filesInFolder = getJSONFilesFromFolder(path);

      if (!filesInFolder.length)
        log && console.error(`There is no recordings in: ${path}`);

      recordingPaths.push(...filesInFolder);
    } else recordingPaths.push(path);
  }

  return recordingPaths;
}

export function getHeadlessEnvVar(headless?: string) {
  if (!headless) {
    return true;
  }
  switch (headless.toLowerCase()) {
    case '1':
    case 'true':
      return true;
    case 'chrome':
      return 'chrome';
    case '0':
    case 'false':
      return false;
    default:
      throw new Error('PUPPETEER_HEADLESS: unrecognized value');
  }
}

export function createStatusReport(results: Result[]): Table.Table {
  const table = new Table({
    head: ['Title', 'Status', 'File', 'Duration'],
    chars: {
      top: '═',
      'top-mid': '╤',
      'top-left': '╔',
      'top-right': '╗',
      bottom: '═',
      'bottom-mid': '╧',
      'bottom-left': '╚',
      'bottom-right': '╝',
      left: '║',
      'left-mid': '╟',
      mid: '─',
      'mid-mid': '┼',
      right: '║',
      'right-mid': '╢',
      middle: '│',
    },
    style: {
      head: ['bold'],
    },
  });

  const resultTextColor = colors.white;
  for (const result of results) {
    const row: string[] = [];

    const duration =
      result.finishedAt?.getTime()! - result.startedAt.getTime() || 0;
    const status = result.success
      ? resultTextColor.bgGreen(' Success ')
      : resultTextColor.bgRed(' Failure ');

    row.push(result.title);
    row.push(status);
    row.push(relative(process.cwd(), result.file));
    row.push(`${duration}ms`);

    table.push(row);
  }

  return table;
}

export async function runFiles(
  files: string[],
  opts: { log: boolean; headless: boolean | 'chrome'; extension?: string } = {
    log: false,
    headless: true,
  }
): Promise<void> {
  let Extension = PuppeteerRunnerOwningBrowserExtension;
  let browser: Browser | undefined;
  const statusReport = new StatusReport(files, opts.log);

  if (opts.extension) {
    const module = await import(
      pathToFileURL(
        isAbsolute(opts.extension)
          ? opts.extension
          : join(cwd(), opts.extension)
      ).toString()
    );
    Extension = module.default;
  }

  const results: Result[] = [];
  for (const [index, file] of files.entries()) {
    const result: Result = {
      title: '',
      startedAt: new Date(),
      finishedAt: new Date(),
      file,
      success: true,
    };

    statusReport.update({ index: index, key: 'file', value: file });

    try {
      const content = readFileSync(file, 'utf-8');
      const object = JSON.parse(content);
      const recording = parse(object);
      result.title = recording.title;
      statusReport.update({ index, key: 'title', value: result.title });

      const { default: puppeteer } = await import('puppeteer');
      browser = await puppeteer.launch({
        headless: opts.headless,
      });
      const page = await browser.newPage();
      const extension = new Extension(browser, page);
      const runner = await createRunner(recording, extension);
      await runner.run();
      statusReport.update({ index, key: 'success', value: true });
    } catch (error) {
      result.success = false;
      statusReport.errors.push({ error, file });
      statusReport.update({ index, key: 'success', value: false });
    } finally {
      result.finishedAt = new Date();
      results.push(result);

      await browser?.close();
    }
  }

  if (opts.log) {
    // const statusReport = createStatusReport(results);
    // console.log(statusReport.toString());
  }

  if (results.every((result) => result.success)) return;

  throw new Error('Some recordings have failed to run.');
}
