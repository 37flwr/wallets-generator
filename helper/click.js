const clickElementWithText = async (page, className, text) => {
  await page.evaluate(
    (className, text) => {
      [...document.querySelectorAll(className)]
        .find((element) => element.textContent === text)
        .click();
    },
    className,
    text
  );
};

module.exports = { clickElementWithText };
