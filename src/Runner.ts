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

import { readFileSync } from 'fs';
import { PuppeteerRunnerOwningBrowserExtension } from './PuppeteerRunnerExtension.js';
import { RunnerExtension } from './RunnerExtension.js';
import { UserFlow, Step } from './Schema.js';

export class Runner {
  #flow: UserFlow;
  #extension: RunnerExtension;
  #aborted: boolean = false;

  /**
   * @internal
   */
  constructor(flow: UserFlow, extension: RunnerExtension) {
    this.#flow = flow;
    this.#extension = extension;
  }

  abort(): void {
    this.#aborted = true;
  }

  /**
   * Run all the steps in the flow
   * @returns whether all the steps are run or the execution is aborted
   */
  async run(): Promise<boolean> {
    this.#aborted = false;
    await this.#extension.beforeAllSteps?.(this.#flow);

    let nextStepIndex = 0;
    while (nextStepIndex < this.#flow.steps.length && !this.#aborted) {
      const nextStep = this.#flow.steps[nextStepIndex]!;
      await this.#extension.beforeEachStep?.(nextStep, this.#flow);
      await this.#extension.runStep(nextStep, this.#flow);
      await this.#extension.afterEachStep?.(nextStep, this.#flow);
      nextStepIndex++;
    }

    await this.#extension.afterAllSteps?.(this.#flow);

    return nextStepIndex >= this.#flow.steps.length;
  }
}

interface AddExternalStepsStep {
  type: 'addExternalSteps';
  from: 'file';
  target: string;
}

interface ExtandableUserFlow {
  /**
   * Human-readable title describing the recorder user flow.
   */
  title: string;
  steps: AddExternalStepsStep[];
}

async function extendRecordingWithExternalSteps(
  givenFlow: ExtandableUserFlow | UserFlow
): Promise<UserFlow> {
  const steps: Step[] = [];
  const givenSteps = givenFlow.steps;

  for (const step of givenSteps) {
    if (step.type != 'addExternalSteps') {
      steps.push(step);

      continue;
    }

    const { from, target } = step as AddExternalStepsStep;
    switch (from) {
      case 'file': {
        try {
          const file = readFileSync(target, 'utf-8');
          const jsonFile = JSON.parse(file);

          if (!('steps' in jsonFile))
            throw new Error(`No steps found in ${from}: ${target}`);

          steps.push(...jsonFile.steps);
        } catch (error) {
          throw new Error(`Couldn't read ${from}: ${target}\n${error}`);
        }

        break;
      }

      default:
        throw new Error(`Extending recording with "${from}" is not supported`);
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

  if (flow.steps.some((step) => step.type === 'addExternalSteps'))
    flow = await extendRecordingWithExternalSteps(flow);

  return new Runner(flow as UserFlow, extension);
}
