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

export type Target = string;
export type Pattern = string;
export type Selector = string | string[];
export type FrameSelector = number[];

export interface NavigationEvent {
  type: 'navigation';
  url?: Pattern;
  title?: Pattern;
}

export type AssertedEvent = NavigationEvent;

export interface BaseStep {
  type: string;
  timeout?: number;
  assertedEvents?: AssertedEvent[];
}

export interface StepWithTarget extends BaseStep {
  /**
   * Defaults to main
   */
  target?: Target;
}

export interface StepWithFrame extends StepWithTarget {
  /**
   * Defaults to main frame
   */
  frame?: FrameSelector;
}

export interface StepWithSelectors extends StepWithFrame {
  /**
   * A list of alternative selectors that lead to selection of a single element to perform the step on.
   * Currently, we support CSS selectors and ARIA selectors (start with 'aria/'). Each selector
   * could be a string or an array of strings. If it's a string, it means that the selector points directly to the target
   * element. If it's an array, the last element is the selector for the target element and the preceeding selectors
   * point to the ancestor elements. If the parent element is a shadow root host, the subsequent
   * selector is evaluated only against the shadow DOM of the host (i.e., `parent.shadowRoot.querySelector`). If the parent
   * element is not a shadow root host, the subsequent selector is evaluated in the regular DOM (i.e., `parent.querySelector`).
   *
   * During the execution, it's recommended that the implementation tries out all of the alternative selectors to improve
   * reliability of the replay as some selectors might get outdated over time.
   */
  selectors: Selector[];
}

export type PointerDeviceType = 'mouse' | 'pen' | 'touch';
export type PointerButtonType =
  | 'primary'
  | 'auxiliary'
  | 'secondary'
  | 'back'
  | 'forward';

export interface ClickAttributes {
  /**
   * Pointer type for the event. Defaults to 'mouse'.
   */
  deviceType?: PointerDeviceType;
  /**
   * Defaults to 'primary' if the device type is a mouse.
   */
  button?: PointerButtonType;
  /**
   * in px, relative to the top-left corner of the element content box. Defaults
   * to the center of the element
   */
  offsetX: number;
  /**
   * in px, relative to the top-left corner of the element content box. Defaults
   * to the center of the element
   */
  offsetY: number;
}

export interface DoubleClickStep extends ClickAttributes, StepWithSelectors {
  type: 'doubleClick';
}

export interface ClickStep extends ClickAttributes, StepWithSelectors {
  type: 'click';
  /**
   * Delay (in ms) between the mouse up and mouse down of the click. Defaults to
   * 50ms.
   */
  duration?: number;
}

export interface HoverStep extends StepWithSelectors {
  type: 'hover';
}

export interface ChangeStep extends StepWithSelectors {
  type: 'change';
  value: string;
}

export interface EmulateNetworkConditionsStep extends StepWithTarget {
  type: 'emulateNetworkConditions';
  download: number;
  upload: number;
  latency: number;
}

export interface KeyDownStep extends StepWithTarget {
  type: 'keyDown';
  key: Key;
}

export interface KeyUpStep extends StepWithTarget {
  type: 'keyUp';
  key: Key;
}

export interface CloseStep extends StepWithTarget {
  type: 'close';
}

export interface SetViewportStep extends StepWithTarget {
  type: 'setViewport';
  width: number;
  height: number;
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
  isLandscape: boolean;
}

export interface ScrollPageStep extends StepWithFrame {
  type: 'scroll';
  /**
   * Absolute scroll x position in px. Defaults to 0
   */
  x?: number;
  /**
   * Absolute scroll y position in px. Defaults to 0
   */
  y?: number;
}

export type ScrollElementStep = ScrollPageStep & StepWithSelectors;

export type ScrollStep = ScrollPageStep | ScrollElementStep;

export interface NavigateStep extends StepWithTarget {
  type: 'navigate';
  url: string;
}

export interface CustomStepParams {
  type: 'customStep';
  name: string;
  parameters: unknown;
}

export type CustomStep =
  | (CustomStepParams & StepWithTarget)
  | (CustomStepParams & StepWithFrame);

export type UserStep =
  | ChangeStep
  | ClickStep
  | HoverStep
  | CloseStep
  | CustomStep
  | DoubleClickStep
  | EmulateNetworkConditionsStep
  | KeyDownStep
  | KeyUpStep
  | NavigateStep
  | ScrollStep
  | SetViewportStep;

/**
 * `waitForElement` allows waiting for the presence (or absence) of the number
 * of elements identified by the selector.
 *
 * For example, the following step would wait for less than three elements
 * to be on the page that match the selector `.my-class`.
 *
 * ```
 * {
 *   "type": "waitForElement",
 *   "selectors": [".my-class"],
 *   "operator": "<=",
 *   "count": 2,
 * }
 * ```
 */
export interface WaitForElementStep extends StepWithSelectors {
  type: 'waitForElement';
  /**
   * Defaults to '=='
   */
  operator?: '>=' | '==' | '<=';
  /**
   * Defaults to 1
   */
  count?: number;
}

/**
 * `waitForExpression` allows for a JavaScript expression to resolve to truthy
 * value.
 *
 * For example, the following step pauses for two seconds and then resolves to
 * true allowing the replay to continue.
 *
 * ```
 * {
 *   "type": "waitForExpression",
 *   "expression": "new Promise(resolve => setTimeout(() => resolve(true),
 * 2000))",
 * }
 * ```
 */
export interface WaitForExpressionStep extends StepWithFrame {
  type: 'waitForExpression';
  expression: string;
}

export type AssertionStep = WaitForElementStep | WaitForExpressionStep;

export type Step = UserStep | AssertionStep;

export interface UserFlow {
  /**
   * Human-readable title describing the recorder user flow.
   */
  title: string;
  /**
   * Timeout in milliseconds.
   */
  timeout?: number;
  /**
   * The name of the attribute to use to generate selectors instead of regular
   * CSS selectors. For example, specifying `data-testid` would generate the
   * selector `[data-testid=value]` for the element `<div data-testid=value>`.
   */
  selectorAttribute?: string;
  steps: Step[];
}

export type Key =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | 'Power'
  | 'Eject'
  | 'Abort'
  | 'Help'
  | 'Backspace'
  | 'Tab'
  | 'Numpad5'
  | 'NumpadEnter'
  | 'Enter'
  | '\r'
  | '\n'
  | 'ShiftLeft'
  | 'ShiftRight'
  | 'ControlLeft'
  | 'ControlRight'
  | 'AltLeft'
  | 'AltRight'
  | 'Pause'
  | 'CapsLock'
  | 'Escape'
  | 'Convert'
  | 'NonConvert'
  | 'Space'
  | 'Numpad9'
  | 'PageUp'
  | 'Numpad3'
  | 'PageDown'
  | 'End'
  | 'Numpad1'
  | 'Home'
  | 'Numpad7'
  | 'ArrowLeft'
  | 'Numpad4'
  | 'Numpad8'
  | 'ArrowUp'
  | 'ArrowRight'
  | 'Numpad6'
  | 'Numpad2'
  | 'ArrowDown'
  | 'Select'
  | 'Open'
  | 'PrintScreen'
  | 'Insert'
  | 'Numpad0'
  | 'Delete'
  | 'NumpadDecimal'
  | 'Digit0'
  | 'Digit1'
  | 'Digit2'
  | 'Digit3'
  | 'Digit4'
  | 'Digit5'
  | 'Digit6'
  | 'Digit7'
  | 'Digit8'
  | 'Digit9'
  | 'KeyA'
  | 'KeyB'
  | 'KeyC'
  | 'KeyD'
  | 'KeyE'
  | 'KeyF'
  | 'KeyG'
  | 'KeyH'
  | 'KeyI'
  | 'KeyJ'
  | 'KeyK'
  | 'KeyL'
  | 'KeyM'
  | 'KeyN'
  | 'KeyO'
  | 'KeyP'
  | 'KeyQ'
  | 'KeyR'
  | 'KeyS'
  | 'KeyT'
  | 'KeyU'
  | 'KeyV'
  | 'KeyW'
  | 'KeyX'
  | 'KeyY'
  | 'KeyZ'
  | 'MetaLeft'
  | 'MetaRight'
  | 'ContextMenu'
  | 'NumpadMultiply'
  | 'NumpadAdd'
  | 'NumpadSubtract'
  | 'NumpadDivide'
  | 'F1'
  | 'F2'
  | 'F3'
  | 'F4'
  | 'F5'
  | 'F6'
  | 'F7'
  | 'F8'
  | 'F9'
  | 'F10'
  | 'F11'
  | 'F12'
  | 'F13'
  | 'F14'
  | 'F15'
  | 'F16'
  | 'F17'
  | 'F18'
  | 'F19'
  | 'F20'
  | 'F21'
  | 'F22'
  | 'F23'
  | 'F24'
  | 'NumLock'
  | 'ScrollLock'
  | 'AudioVolumeMute'
  | 'AudioVolumeDown'
  | 'AudioVolumeUp'
  | 'MediaTrackNext'
  | 'MediaTrackPrevious'
  | 'MediaStop'
  | 'MediaPlayPause'
  | 'Semicolon'
  | 'Equal'
  | 'NumpadEqual'
  | 'Comma'
  | 'Minus'
  | 'Period'
  | 'Slash'
  | 'Backquote'
  | 'BracketLeft'
  | 'Backslash'
  | 'BracketRight'
  | 'Quote'
  | 'AltGraph'
  | 'Props'
  | 'Cancel'
  | 'Clear'
  | 'Shift'
  | 'Control'
  | 'Alt'
  | 'Accept'
  | 'ModeChange'
  | ' '
  | 'Print'
  | 'Execute'
  | '\u0000'
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'f'
  | 'g'
  | 'h'
  | 'i'
  | 'j'
  | 'k'
  | 'l'
  | 'm'
  | 'n'
  | 'o'
  | 'p'
  | 'q'
  | 'r'
  | 's'
  | 't'
  | 'u'
  | 'v'
  | 'w'
  | 'x'
  | 'y'
  | 'z'
  | 'Meta'
  | '*'
  | '+'
  | '-'
  | '/'
  | ';'
  | '='
  | ','
  | '.'
  | '`'
  | '['
  | '\\'
  | ']'
  | "'"
  | 'Attn'
  | 'CrSel'
  | 'ExSel'
  | 'EraseEof'
  | 'Play'
  | 'ZoomOut'
  | ')'
  | '!'
  | '@'
  | '#'
  | '$'
  | '%'
  | '^'
  | '&'
  | '('
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'H'
  | 'I'
  | 'J'
  | 'K'
  | 'L'
  | 'M'
  | 'N'
  | 'O'
  | 'P'
  | 'Q'
  | 'R'
  | 'S'
  | 'T'
  | 'U'
  | 'V'
  | 'W'
  | 'X'
  | 'Y'
  | 'Z'
  | ':'
  | '<'
  | '_'
  | '>'
  | '?'
  | '~'
  | '{'
  | '|'
  | '}'
  | '"'
  | 'SoftLeft'
  | 'SoftRight'
  | 'Camera'
  | 'Call'
  | 'EndCall'
  | 'VolumeDown'
  | 'VolumeUp';
