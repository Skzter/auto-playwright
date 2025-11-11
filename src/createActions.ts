import { Page } from "@playwright/test";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getSanitizeOptions } from "./sanitizeHtml";

// --- ZOD SCHEMAS AND INFERRED TYPES ---

const locatorPressKeySchema = z.object({
  elementId: z.string(),
  key: z.string(),
});
type LocatorPressKeyArgs = z.infer<typeof locatorPressKeySchema>;

const pagePressKeySchema = z.object({
  key: z.string(),
});
type PagePressKeyArgs = z.infer<typeof pagePressKeySchema>;

const locateElementSchema = z.object({
  cssSelector: z.string(),
});
type LocateElementArgs = z.infer<typeof locateElementSchema>;

const locatorEvaluateSchema = z.object({
  elementId: z.string(),
  pageFunction: z.string(),
});
type LocatorEvaluateArgs = z.infer<typeof locatorEvaluateSchema>;

const locatorGetAttributeSchema = z.object({
  attributeName: z.string(),
  elementId: z.string(),
});
type LocatorGetAttributeArgs = z.infer<typeof locatorGetAttributeSchema>;

const locatorElementIdSchema = z.object({
  elementId: z.string(),
});
type LocatorElementIdArgs = z.infer<typeof locatorElementIdSchema>;

const locatorFillSchema = z.object({
  value: z.string(),
  elementId: z.string(),
});
type LocatorFillArgs = z.infer<typeof locatorFillSchema>;

const pageGotoSchema = z.object({
  url: z.string(),
});
type PageGotoArgs = z.infer<typeof pageGotoSchema>;

const locatorSelectOptionSchema = z
  .object({
    elementId: z.string().optional(),
    cssSelector: z.string().optional(),
    value: z.union([z.string(), z.array(z.string())]).optional(),
    label: z.union([z.string(), z.array(z.string())]).optional(),
    index: z.union([z.number(), z.array(z.number())]).optional(),
  })
  .refine(
    (data) => data.elementId !== undefined || data.cssSelector !== undefined,
    {
      message: "Either elementId or cssSelector must be provided.",
    },
  )
  .refine(
    (data) =>
      data.value !== undefined ||
      data.label !== undefined ||
      data.index !== undefined,
    {
      message: "At least one of value, label, or index must be provided.",
    },
  );
type LocatorSelectOptionArgs = z.infer<typeof locatorSelectOptionSchema>;

const expectToBeSchema = z.object({
  actual: z.string(),
  expected: z.string(),
});
type ExpectToBeArgs = z.infer<typeof expectToBeSchema>;

const resultAssertionSchema = z.object({
  assertion: z.boolean(),
});
type ResultAssertionArgs = z.infer<typeof resultAssertionSchema>;

const resultQuerySchema = z.object({
  query: z.string(),
});
type ResultQueryArgs = z.infer<typeof resultQuerySchema>;

const resultErrorSchema = z.object({
  errorMessage: z.string(),
});
type ResultErrorArgs = z.infer<typeof resultErrorSchema>;

const locateElementsByRoleSchema = z.object({
  role: z.string(),
  exact: z.boolean().optional(),
});
type LocateElementsByRoleArgs = z.infer<typeof locateElementsByRoleSchema>;

const locateElementsWithTextSchema = z.object({
  text: z.string(),
  exact: z.boolean().optional(),
});
type LocateElementsWithTextArgs = z.infer<typeof locateElementsWithTextSchema>;

// --- ACTION TOOL INTERFACE ---

export interface ActionTool {
  function: (args: any) => Promise<any> | any;
  name: string;
  description: string;
  parse: (args: string) => any;
  parameters: any;
}

// --- CREATE ACTIONS FUNCTION ---

export const createActions = (page: Page): Record<string, ActionTool> => {
  const getLocator = (elementId: string) => {
    return page.locator(`[data-element-id="${elementId}"]`);
  };

  return {
    locator_pressKey: {
      function: async (args: LocatorPressKeyArgs) => {
        const { elementId, key } = args;
        await getLocator(elementId).press(key);
        return { success: true };
      },
      name: "locator_pressKey",
      description: "Presses a key while focused on the specified element.",
      parse: (args: string) => locatorPressKeySchema.parse(JSON.parse(args)),
      parameters: {
        type: "object",
        properties: {
          elementId: { type: "string" },
          key: {
            type: "string",
            description:
              "The name of the key to press, e.g., 'Enter', 'ArrowUp', 'a'.",
          },
        },
        required: ["elementId", "key"],
      },
    },
    page_pressKey: {
      function: async (args: PagePressKeyArgs) => {
        const { key } = args;
        await page.keyboard.press(key);
        return { success: true };
      },
      name: "page_pressKey",
      description: "Presses a key globally on the page.",
      parse: (args: string) => pagePressKeySchema.parse(JSON.parse(args)),
      parameters: {
        type: "object",
        properties: {
          key: {
            type: "string",
            description:
              "The name of the key to press, e.g., 'Enter', 'ArrowDown', 'b'.",
          },
        },
        required: ["key"],
      },
    },
    locateElement: {
      function: async (args: LocateElementArgs) => {
        const locator = page.locator(args.cssSelector);
        const elementId = randomUUID();
        await locator
          .first()
          .evaluate(
            (node, id) => node.setAttribute("data-element-id", id),
            elementId,
          );
        return { elementId };
      },
      name: "locateElement",
      description:
        "Locates element using a CSS selector and returns elementId. This element ID can be used with other functions to perform actions on the element.",
      parse: (args: string) => locateElementSchema.parse(JSON.parse(args)),
      parameters: {
        type: "object",
        properties: {
          cssSelector: { type: "string" },
        },
        required: ["cssSelector"],
      },
    },
    locator_evaluate: {
      function: async (args: LocatorEvaluateArgs) => {
        const result = await getLocator(args.elementId).evaluate(
          args.pageFunction,
        );
        return { result };
      },
      name: "locator_evaluate",
      description:
        "Execute JavaScript code in the page, taking the matching element as an argument.",
      parse: (args: string) => locatorEvaluateSchema.parse(JSON.parse(args)),
      parameters: {
        type: "object",
        properties: {
          elementId: { type: "string" },
          pageFunction: {
            type: "string",
            description:
              "Function to be evaluated in the page context, e.g. node => node.innerText",
          },
        },
        required: ["elementId", "pageFunction"],
      },
    },
    locator_getAttribute: {
      function: async (args: LocatorGetAttributeArgs) => {
        const attributeValue = await getLocator(args.elementId).getAttribute(
          args.attributeName,
        );
        return { attributeValue };
      },
      name: "locator_getAttribute",
      description: "Returns the matching element's attribute value.",
      parse: (args: string) =>
        locatorGetAttributeSchema.parse(JSON.parse(args)),
      parameters: {
        type: "object",
        properties: {
          attributeName: { type: "string" },
          elementId: { type: "string" },
        },
        required: ["attributeName", "elementId"],
      },
    },
    locator_innerHTML: {
      function: async (args: LocatorElementIdArgs) => {
        const innerHTML = await getLocator(args.elementId).innerHTML();
        return { innerHTML };
      },
      name: "locator_innerHTML",
      description: "Returns the element.innerHTML.",
      parse: (args: string) => locatorElementIdSchema.parse(JSON.parse(args)),
      parameters: {
        type: "object",
        properties: {
          elementId: { type: "string" },
        },
        required: ["elementId"],
      },
    },
    locator_innerText: {
      function: async (args: LocatorElementIdArgs) => {
        const innerText = await getLocator(args.elementId).innerText();
        return { innerText };
      },
      name: "locator_innerText",
      description: "Returns the element.innerText.",
      parse: (args: string) => locatorElementIdSchema.parse(JSON.parse(args)),
      parameters: {
        type: "object",
        properties: {
          elementId: { type: "string" },
        },
        required: ["elementId"],
      },
    },
    locator_textContent: {
      function: async (args: LocatorElementIdArgs) => {
        const textContent = await getLocator(args.elementId).textContent();
        return { textContent };
      },
      name: "locator_textContent",
      description: "Returns the node.textContent.",
      parse: (args: string) => locatorElementIdSchema.parse(JSON.parse(args)),
      parameters: {
        type: "object",
        properties: {
          elementId: { type: "string" },
        },
        required: ["elementId"],
      },
    },
    locator_inputValue: {
      function: async (args: LocatorElementIdArgs) => {
        const inputValue = await getLocator(args.elementId).inputValue();
        return { inputValue };
      },
      name: "locator_inputValue",
      description:
        "Returns input.value for the selected <input> or <textarea> or <select> element.",
      parse: (args: string) => locatorElementIdSchema.parse(JSON.parse(args)),
      parameters: {
        type: "object",
        properties: {
          elementId: { type: "string" },
        },
        required: ["elementId"],
      },
    },
    locator_blur: {
      function: async (args: LocatorElementIdArgs) => {
        await getLocator(args.elementId).blur();
        return { success: true };
      },
      name: "locator_blur",
      description: "Removes keyboard focus from the current element.",
      parse: (args: string) => locatorElementIdSchema.parse(JSON.parse(args)),
      parameters: {
        type: "object",
        properties: {
          elementId: { type: "string" },
        },
        required: ["elementId"],
      },
    },
    locator_boundingBox: {
      function: async (args: LocatorElementIdArgs) => {
        const boundingBox = await getLocator(args.elementId).boundingBox();
        return boundingBox;
      },
      name: "locator_boundingBox",
      description:
        "This method returns the bounding box of the element matching the locator, or null if the element is not visible. The bounding box is calculated relative to the main frame viewport - which is usually the same as the browser window. The returned object has x, y, width, and height properties.",
      parse: (args: string) => locatorElementIdSchema.parse(JSON.parse(args)),
      parameters: {
        type: "object",
        properties: {
          elementId: { type: "string" },
        },
        required: ["elementId"],
      },
    },
    locator_check: {
      function: async (args: LocatorElementIdArgs) => {
        await getLocator(args.elementId).check();
        return { success: true };
      },
      name: "locator_check",
      description: "Ensure that checkbox or radio element is checked.",
      parse: (args: string) => locatorElementIdSchema.parse(JSON.parse(args)),
      parameters: {
        type: "object",
        properties: {
          elementId: { type: "string" },
        },
        required: ["elementId"],
      },
    },
    locator_uncheck: {
      function: async (args: LocatorElementIdArgs) => {
        await getLocator(args.elementId).uncheck();
        return { success: true };
      },
      name: "locator_uncheck",
      description: "Ensure that checkbox or radio element is unchecked.",
      parse: (args: string) => locatorElementIdSchema.parse(JSON.parse(args)),
      parameters: {
        type: "object",
        properties: {
          elementId: { type: "string" },
        },
        required: ["elementId"],
      },
    },
    locator_isChecked: {
      function: async (args: LocatorElementIdArgs) => {
        const isChecked = await getLocator(args.elementId).isChecked();
        return { isChecked };
      },
      name: "locator_isChecked",
      description: "Returns whether the element is checked.",
      parse: (args: string) => locatorElementIdSchema.parse(JSON.parse(args)),
      parameters: {
        type: "object",
        properties: {
          elementId: { type: "string" },
        },
        required: ["elementId"],
      },
    },
    locator_isEditable: {
      function: async (args: LocatorElementIdArgs) => {
        const isEditable = await getLocator(args.elementId).isEditable();
        return { isEditable };
      },
      name: "locator_isEditable",
      description:
        "Returns whether the element is editable. Element is considered editable when it is enabled and does not have readonly property set.",
      parse: (args: string) => locatorElementIdSchema.parse(JSON.parse(args)),
      parameters: {
        type: "object",
        properties: {
          elementId: { type: "string" },
        },
        required: ["elementId"],
      },
    },
    locator_isEnabled: {
      function: async (args: LocatorElementIdArgs) => {
        const isEnabled = await getLocator(args.elementId).isEnabled();
        return { isEnabled };
      },
      name: "locator_isEnabled",
      description:
        "Returns whether the element is enabled. Element is considered enabled unless it is a <button>, <select>, <input> or <textarea> with a disabled property.",
      parse: (args: string) => locatorElementIdSchema.parse(JSON.parse(args)),
      parameters: {
        type: "object",
        properties: {
          elementId: { type: "string" },
        },
        required: ["elementId"],
      },
    },
    locator_isVisible: {
      function: async (args: LocatorElementIdArgs) => {
        const isVisible = await getLocator(args.elementId).isVisible();
        return { isVisible };
      },
      name: "locator_isVisible",
      description: "Returns whether the element is visible.",
      parse: (args: string) => locatorElementIdSchema.parse(JSON.parse(args)),
      parameters: {
        type: "object",
        properties: {
          elementId: { type: "string" },
        },
        required: ["elementId"],
      },
    },
    locator_clear: {
      function: async (args: LocatorElementIdArgs) => {
        await getLocator(args.elementId).clear();
        return { success: true };
      },
      name: "locator_clear",
      description: "Clear the input field.",
      parse: (args: string) => locatorElementIdSchema.parse(JSON.parse(args)),
      parameters: {
        type: "object",
        properties: {
          elementId: { type: "string" },
        },
        required: ["elementId"],
      },
    },
    locator_click: {
      function: async (args: LocatorElementIdArgs) => {
        await getLocator(args.elementId).click();
        return { success: true };
      },
      name: "locator_click",
      description: "Click an element.",
      parse: (args: string) => locatorElementIdSchema.parse(JSON.parse(args)),
      parameters: {
        type: "object",
        properties: {
          elementId: { type: "string" },
        },
        required: ["elementId"],
      },
    },
    locator_count: {
      function: async (args: LocatorElementIdArgs) => {
        const elementCount = await getLocator(args.elementId).count();
        return { elementCount };
      },
      name: "locator_count",
      description: "Returns the number of elements matching the locator.",
      parse: (args: string) => locatorElementIdSchema.parse(JSON.parse(args)),
      parameters: {
        type: "object",
        properties: {
          elementId: { type: "string" },
        },
        required: ["elementId"],
      },
    },
    locator_fill: {
      function: async (args: LocatorFillArgs) => {
        await getLocator(args.elementId).fill(args.value);
        return { success: true };
      },
      name: "locator_fill",
      description: "Set a value to the input field.",
      parse: (args: string) => locatorFillSchema.parse(JSON.parse(args)),
      parameters: {
        type: "object",
        properties: {
          value: { type: "string" },
          elementId: { type: "string" },
        },
        required: ["value", "elementId"],
      },
    },
    page_goto: {
      function: async (args: PageGotoArgs) => {
        const response = await page.goto(args.url);
        return { url: response?.url() };
      },
      name: "page_goto",
      description: "Navigate to the specified URL.",
      parse: (args: string) => pageGotoSchema.parse(JSON.parse(args)),
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The URL to navigate to",
          },
        },
        required: ["url"],
      },
    },
    locator_selectOption: {
      function: async (args: LocatorSelectOptionArgs) => {
        const { elementId, cssSelector, value, label, index } = args;

        let locator;

        if (elementId) {
          locator = page.locator(`[data-element-id="${elementId}"]`);
        } else if (cssSelector) {
          locator = page.locator(cssSelector);
        } else {
          throw new Error(
            "You must provide either an elementId or a cssSelector.",
          );
        }

        if (value !== undefined) {
          await locator.selectOption(value);
        } else if (label !== undefined) {
          const options = Array.isArray(label)
            ? label.map((l) => ({ label: l }))
            : { label };
          await locator.selectOption(options);
        } else if (index !== undefined) {
          const options = Array.isArray(index)
            ? index.map((i) => ({ index: i }))
            : { index };
          await locator.selectOption(options);
        } else {
          throw new Error(
            "You must provide at least one of the parameters: value, label, or index.",
          );
        }

        return { success: true };
      },
      name: "locator_selectOption",
      description:
        "Selects option(s) in a <select> element. Requires either an elementId (obtained via locateElement) or a direct cssSelector.",
      parse: (args: string) =>
        locatorSelectOptionSchema.parse(JSON.parse(args)),
      parameters: {
        type: "object",
        properties: {
          elementId: {
            type: "string",
            description:
              "The ID of the <select> element, obtained via locateElement.",
          },
          cssSelector: {
            type: "string",
            description:
              "CSS selector to locate the <select> element directly, e.g., '#my-select' or 'form select'.",
          },
          value: {
            type: ["string", "array"],
            description:
              "Select options with matching value attribute. Can be a string or an array for multi-select.",
            items: { type: "string" },
          },
          label: {
            type: ["string", "array"],
            description:
              "Select options with matching visible text. Can be a string or an array for multi-select.",
            items: { type: "string" },
          },
          index: {
            type: ["number", "array"],
            description:
              "Select options by their index (zero-based). Can be a number or an array for multi-select.",
            items: { type: "number" },
          },
        },
      },
    },
    expect_toBe: {
      function: (args: ExpectToBeArgs) => {
        return {
          actual: args.actual,
          expected: args.expected,
          success: args.actual === args.expected,
        };
      },
      name: "expect_toBe",
      description:
        "Asserts that the actual value is equal to the expected value.",
      parse: (args: string) => expectToBeSchema.parse(JSON.parse(args)),
      parameters: {
        type: "object",
        properties: {
          actual: { type: "string" },
          expected: { type: "string" },
        },
        required: ["actual", "expected"],
      },
    },
    expect_notToBe: {
      function: (args: ExpectToBeArgs) => {
        return {
          actual: args.actual,
          expected: args.expected,
          success: args.actual !== args.expected,
        };
      },
      name: "expect_notToBe",
      description:
        "Asserts that the actual value is not equal to the expected value.",
      parse: (args: string) => expectToBeSchema.parse(JSON.parse(args)),
      parameters: {
        type: "object",
        properties: {
          actual: { type: "string" },
          expected: { type: "string" },
        },
        required: ["actual", "expected"],
      },
    },
    resultAssertion: {
      function: (args: ResultAssertionArgs) => {
        return args;
      },
      name: "resultAssertion",
      description:
        "This function is called when the initial instructions asked to assert something; then 'assertion' is either true or false (boolean) depending on whether the assertion succeeded.",
      parse: (args: string) => resultAssertionSchema.parse(JSON.parse(args)),
      parameters: {
        type: "object",
        properties: {
          assertion: { type: "boolean" },
        },
        required: ["assertion"],
      },
    },
    resultQuery: {
      function: (args: ResultQueryArgs) => {
        return args;
      },
      name: "resultQuery",
      description:
        "This function is called at the end when the initial instructions asked to extract data; then 'query' property is set to a text value of the extracted data.",
      parse: (args: string) => resultQuerySchema.parse(JSON.parse(args)),
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
        },
        required: ["query"],
      },
    },
    resultAction: {
      function: () => {
        return { success: true };
      },
      name: "resultAction",
      description:
        "This function is called at the end when the initial instructions asked to perform an action.",
      parse: (args: string) => z.object({}).parse(JSON.parse(args)),
      parameters: {
        type: "object",
        properties: {},
      },
    },
    resultError: {
      function: (args: ResultErrorArgs) => {
        return { errorMessage: args.errorMessage };
      },
      name: "resultError",
      description:
        "If user instructions cannot be completed, then this function is used to produce the final response.",
      parse: (args: string) => resultErrorSchema.parse(JSON.parse(args)),
      parameters: {
        type: "object",
        properties: {
          errorMessage: { type: "string" },
        },
        required: ["errorMessage"],
      },
    },
    getVisibleStructure: {
      function: async () => {
        const sanitizeOptions = getSanitizeOptions();
        const allowedTags = sanitizeOptions.allowedTags || [];
        const allowedAttributes = sanitizeOptions.allowedAttributes;
        const maxDepth = 30;

        const structure = await page.evaluate(
          ({ allowedTags, allowedAttributes, maxDepth }) => {
            const extractVisibleStructure = (
              element: Element,
              depth = 0,
            ): any => {
              if (!element || depth > maxDepth) return null;

              const style = window.getComputedStyle(element);
              if (
                style.display === "none" ||
                style.visibility === "hidden" ||
                style.opacity === "0"
              ) {
                return null;
              }

              const tag = element.tagName.toLowerCase();
              if (!allowedTags.includes(tag)) {
                return null;
              }

              const node: any = {
                tag: tag,
                attributes: {},
                children: [],
              };

              const elementAttributes = element.attributes;
              if (allowedAttributes === false) {
                for (let i = 0; i < elementAttributes.length; i++) {
                  const attr = elementAttributes[i];
                  node.attributes[attr.name] = attr.value;
                }
              } else if (typeof allowedAttributes === "object") {
                const allowedForAll = (allowedAttributes as any)["*"];
                const allowedForTag = (allowedAttributes as any)[tag];

                const allowAllForTag = allowedForTag === true;
                const allowAllGlobal = allowedForAll === true;

                for (let i = 0; i < elementAttributes.length; i++) {
                  const attr = elementAttributes[i];
                  const attrName = attr.name;

                  if (
                    allowAllForTag ||
                    allowAllGlobal ||
                    (Array.isArray(allowedForTag) &&
                      allowedForTag.includes(attrName)) ||
                    (Array.isArray(allowedForAll) &&
                      allowedForAll.includes(attrName))
                  ) {
                    node.attributes[attrName] = attr.value;
                  }
                }
              }

              const id = element.id;
              if (id) {
                node.id = id;
              }

              const role = element.getAttribute("role");
              if (role) {
                node.role = role;
              }

              const ariaLabel = element.getAttribute("aria-label");
              if (ariaLabel) {
                node.ariaLabel = ariaLabel;
              }

              const className = element.className?.toString().trim();
              if (className) {
                node.className = className;
              }

              if (
                element.childNodes.length === 1 &&
                element.childNodes[0].nodeType === 3
              ) {
                const text = element.textContent?.trim() || "";
                if (text) {
                  node.text =
                    text.length > 50 ? text.slice(0, 50) + "..." : text;
                }
              }

              if (depth + 1 < maxDepth) {
                for (let i = 0; i < element.children.length; i++) {
                  const child = extractVisibleStructure(
                    element.children[i],
                    depth + 1,
                  );
                  if (child) {
                    node.children.push(child);
                  }
                }
              }

              return node;
            };

            return extractVisibleStructure(document.body);
          },
          { allowedTags, allowedAttributes, maxDepth },
        );

        return { structure };
      },
      name: "getVisibleStructure",
      description:
        "Returns a simplified hierarchical structure of visible DOM elements, focusing on roles, attributes, and basic content.",
      parse: (args: string) => z.object({}).parse(JSON.parse(args)),
      parameters: {
        type: "object",
        properties: {},
      },
    },
    locateElementsByRole: {
      function: async (args: LocateElementsByRoleArgs) => {
        const locators = await page
          .getByRole(args.role as any, { exact: args.exact ?? false })
          .all();
        const elementIds: string[] = [];

        for (const locator of locators) {
          const elementId = randomUUID();
          await locator.evaluate(
            (node, id) => node.setAttribute("data-element-id", id),
            elementId,
          );
          elementIds.push(elementId);
        }

        return {
          elementIds,
          count: elementIds.length,
        };
      },
      name: "locateElementsByRole",
      description:
        "Finds elements by their ARIA role attribute and returns array of element IDs.",
      parse: (args: string) =>
        locateElementsByRoleSchema.parse(JSON.parse(args)),
      parameters: {
        type: "object",
        properties: {
          role: {
            type: "string",
            description:
              "ARIA role to search for, e.g. 'button', 'grid', 'row', etc.",
          },
          exact: {
            type: "boolean",
            description:
              "Whether to match the role exactly or allow partial matches.",
          },
        },
        required: ["role"],
      },
    },
    locateElementsWithText: {
      function: async (args: LocateElementsWithTextArgs) => {
        const allLocators = await page
          .getByText(args.text, { exact: args.exact ?? false })
          .all();

        const elementIds: string[] = [];

        for (const locator of allLocators) {
          if (await locator.isVisible()) {
            const elementId = randomUUID();
            await locator.evaluate(
              (node, id) => node.setAttribute("data-element-id", id),
              elementId,
            );
            elementIds.push(elementId);
          }
        }

        return {
          elementIds,
          count: elementIds.length,
        };
      },
      name: "locateElementsWithText",
      description:
        "Finds visible elements containing specified text and returns array of element IDs. Hidden elements are excluded.",
      parse: (args: string) =>
        locateElementsWithTextSchema.parse(JSON.parse(args)),
      parameters: {
        type: "object",
        properties: {
          text: { type: "string" },
          exact: { type: "boolean" },
        },
        required: ["text"],
      },
    },
  };
};
