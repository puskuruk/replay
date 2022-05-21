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

import { readFile } from 'fs/promises';
import { PuppeteerRunnerOwningBrowserExtension } from './PuppeteerRunnerExtension.js';
import { RunnerExtension } from './RunnerExtension.js';
import { Step, UserFlow } from './Schema.js';

export class Runner {
  #flow: UserFlow;
  #extension: RunnerExtension;
  #nextStep = 0;

  /**
   * @internal
   */
  constructor(flow: UserFlow, extension: RunnerExtension) {
    this.#flow = flow;
    this.#extension = extension;
  }

  /**
   * @param stepIdx - Run the flow up until the step with the `stepIdx` index.
   */
  async run(stepIdx?: number): Promise<boolean> {
    if (stepIdx === undefined) {
      stepIdx = this.#flow.steps.length;
    }
    if (this.#nextStep === 0) {
      await this.#extension.beforeAllSteps?.(this.#flow);
    }
    while (
      this.#nextStep < stepIdx &&
      this.#nextStep < this.#flow.steps.length
    ) {
      await this.#extension.beforeEachStep?.(
        this.#flow.steps[this.#nextStep],
        this.#flow
      );
      await this.#extension.runStep(
        this.#flow.steps[this.#nextStep],
        this.#flow
      );
      await this.#extension.afterEachStep?.(
        this.#flow.steps[this.#nextStep],
        this.#flow
      );
      this.#nextStep++;
    }
    if (this.#nextStep >= this.#flow.steps.length) {
      await this.#extension.afterAllSteps?.(this.#flow);
      return true;
    }

    return false;
  }
}

interface ImportSteps {
  type: 'import';
  from: 'file' | 'url';
  target: string;
}

interface ExtandableUserFlow {
  /**
   * Human-readable title describing the recorder user flow.
   */
  title: string;
  /**
   * Timeout in milliseconds.
   */
  steps: (ImportSteps | Step)[];
}

async function importSteps(givenFlow: ExtandableUserFlow): Promise<UserFlow> {
  const steps: Step[] = [];

  for (const step of givenFlow.steps) {
    if (step.type != 'import') {
      steps.push(step);

      continue;
    }

    const { from, target } = step;
    switch (from) {
      case 'file': {
        try {
          const file = await readFile(target, 'utf-8');
          const jsonFile = JSON.parse(file);

          if (!('steps' in jsonFile))
            throw new Error(`No steps found in target: ${target}`);

          steps.push(...jsonFile.steps);
        } catch (error) {
          throw new Error(`Error reading file: ${target}\n${error}`);
        }

        break;
      }

      default:
        throw new Error(`Adding steps from "${from}" is not supported`);
    }
  }

  return {
    ...givenFlow,
    steps,
  };
}

export async function createRunner(
  flow: UserFlow | ExtandableUserFlow,
  extension?: RunnerExtension
) {
  if (!extension) {
    const { default: puppeteer } = await import('puppeteer');
    const browser = await puppeteer.launch({
      headless: true,
    });
    const page = await browser.newPage();
    extension = new PuppeteerRunnerOwningBrowserExtension(browser, page);
  }

  if (flow.steps.some((step) => step.type === 'import'))
    flow = await importSteps(flow);

  return new Runner(flow as UserFlow, extension);
}
