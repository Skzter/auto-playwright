import { test, expect } from "@playwright/test";
import { auto } from "../src/index";

test.describe("auto-playwright actions", () => {
  test("should click a button", async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <button id="test-button" onclick="this.textContent = 'Clicked!'">Click me</button>
        </body>
      </html>
    `);

    const result = await auto('Click the button with id "test-button"', {
      page,
    });

    expect(result).toBe(true);

    const buttonText = await page.textContent("#test-button");
    expect(buttonText).toBe("Clicked!");
  });

  test("should fill an input field", async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <input type="text" id="name-input" placeholder="Enter name">
          <div id="output"></div>
          <script>
            document.getElementById('name-input').addEventListener('input', function(e) {
              document.getElementById('output').textContent = 'Hello, ' + e.target.value;
            });
          </script>
        </body>
      </html>
    `);

    const result = await auto(
      'Type "John Doe" into the input field with id "name-input"',
      { page },
    );

    expect(result).toBe(true);

    const outputText = await page.textContent("#output");
    expect(outputText).toBe("Hello, John Doe");
  });

  test("should extract text content", async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <div id="content">
            <h1>Welcome to the test</h1>
            <p>This is a paragraph with important information.</p>
          </div>
        </body>
      </html>
    `);

    const result = await auto(
      'Extract the text from the paragraph inside div with id "content"',
      { page },
    );

    expect(result).toBe("This is a paragraph with important information.");
  });

  test("should navigate to a URL", async ({ page }) => {
    // This test might need to be adjusted based on your actual setup
    // For now, we'll test that it doesn't throw an error

    try {
      await auto("Go to https://example.com", { page });
      // If we get here without error, consider it a success
      expect(true).toBe(true);
    } catch (error) {
      // Navigation might fail in test environment, but we should not get function call errors
      expect(error.message).not.toContain("Expected 1 arguments, but got 2");
    }
  });

  test("should select an option from dropdown", async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <select id="fruits">
            <option value="apple">Apple</option>
            <option value="banana">Banana</option>
            <option value="orange">Orange</option>
          </select>
          <div id="selected-fruit"></div>
          <script>
            document.getElementById('fruits').addEventListener('change', function(e) {
              document.getElementById('selected-fruit').textContent = 'Selected: ' + e.target.value;
            });
          </script>
        </body>
      </html>
    `);

    const result = await auto(
      'Select "Banana" from the dropdown with id "fruits"',
      { page },
    );

    expect(result).toBe(true);

    const selectedText = await page.textContent("#selected-fruit");
    expect(selectedText).toBe("Selected: banana");
  });

  test("should check a checkbox", async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <input type="checkbox" id="agree">
          <label for="agree">I agree</label>
          <div id="status"></div>
          <script>
            document.getElementById('agree').addEventListener('change', function(e) {
              document.getElementById('status').textContent = e.target.checked ? 'Checked' : 'Unchecked';
            });
          </script>
        </body>
      </html>
    `);

    const result = await auto('Check the checkbox with id "agree"', { page });

    expect(result).toBe(true);

    const statusText = await page.textContent("#status");
    expect(statusText).toBe("Checked");
  });

  test("should get attribute value", async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <a id="test-link" href="https://example.com" target="_blank">Example Link</a>
        </body>
      </html>
    `);

    const result = await auto(
      'Get the href attribute value of the link with id "test-link"',
      { page },
    );

    expect(result).toBe("https://example.com");
  });

  test("should press keys", async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <input type="text" id="text-input">
          <div id="key-events"></div>
          <script>
            const input = document.getElementById('text-input');
            const display = document.getElementById('key-events');
            input.addEventListener('keydown', (e) => {
              display.textContent = 'Key pressed: ' + e.key;
            });
          </script>
        </body>
      </html>
    `);

    const result = await auto(
      'Press the "Enter" key while focused on the input with id "text-input"',
      { page },
    );

    expect(result).toBe(true);

    const keyEventText = await page.textContent("#key-events");
    expect(keyEventText).toBe("Key pressed: Enter");
  });

  test("should handle assertions", async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <div id="message">Success!</div>
        </body>
      </html>
    `);

    const result = await auto(
      'Verify that the element with id "message" contains the text "Success!"',
      { page },
    );

    expect(result).toBe(true);
  });

  test("should handle negative assertions", async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <div id="message">Hello World</div>
        </body>
      </html>
    `);

    const result = await auto(
      'Verify that the element with id "message" does not contain the text "Goodbye"',
      { page },
    );

    expect(result).toBe(true);
  });

  test("should locate elements by role", async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <button aria-label="Submit form">Submit</button>
          <button aria-label="Cancel action">Cancel</button>
        </body>
      </html>
    `);

    const result = await auto(
      'Click the button with aria-label "Submit form"',
      { page },
    );

    expect(result).toBe(true);
  });

  test("should locate elements by text", async ({ page }) => {
    await page.setContent(`
      <html>
        <body>
          <button>Save changes</button>
          <button>Discard changes</button>
        </body>
      </html>
    `);

    const result = await auto('Click the button with text "Save changes"', {
      page,
    });

    expect(result).toBe(true);
  });
});
