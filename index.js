"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remarkMdxImages = void 0;
const visit = require("unist-util-visit");
const sizeOf = require("image-size");
const path = require("path");
// eslint-disable-next-line unicorn/no-unsafe-regex
const urlPattern = /^(https?:)?\//;
const relativePathPattern = /\.\.?\//;
/**
 * A Remark plugin for converting Markdown images to MDX images using imports for the image source.
 */
const remarkMdxImages =
  ({ resolve = true, dir = "" } = {}) =>
  (ast) => {
    const imports = [];
    const imported = new Map();
    visit(ast, "image", (node, index, parent) => {
      let { alt = null, title, url } = node;
      if (urlPattern.test(url)) {
        return;
      }
      if (!relativePathPattern.test(url) && resolve) {
        url = `./${url}`;
      }
      let name = imported.get(url);
      if (!name) {
        name = `__${imported.size}_${url.replace(/\W/g, "_")}__`;
        imports.push({
          type: "mdxjsEsm",
          data: {
            estree: {
              type: "Program",
              sourceType: "module",
              body: [
                {
                  type: "ImportDeclaration",
                  source: {
                    type: "Literal",
                    value: url,
                    raw: JSON.stringify(url),
                  },
                  specifiers: [
                    {
                      type: "ImportDefaultSpecifier",
                      local: { type: "Identifier", name },
                    },
                  ],
                },
              ],
            },
          },
        });
        imported.set(url, name);
      }
      const textElement = {
        type: "mdxJsxTextElement",
        name: "img",
        children: [],
        attributes: [
          { type: "mdxJsxAttribute", name: "alt", value: alt },
          {
            type: "mdxJsxAttribute",
            name: "src",
            value: {
              type: "mdxJsxAttributeValueExpression",
              value: name,
              data: {
                estree: {
                  type: "Program",
                  sourceType: "module",
                  comments: [],
                  body: [
                    {
                      type: "ExpressionStatement",
                      expression: { type: "Identifier", name },
                    },
                  ],
                },
              },
            },
          },
        ],
      };
      if (title) {
        textElement.attributes.push({
          type: "mdxJsxAttribute",
          name: "title",
          value: title,
        });
      }
      try {
        const dimensions = sizeOf(path.join(dir, url));
        textElement.attributes.push({
          type: "mdxJsxAttribute",
          name: "width",
          value: dimensions.width,
        });
        textElement.attributes.push({
          type: "mdxJsxAttribute",
          name: "height",
          value: dimensions.height,
        });
      } catch (e) {
        console.log(e);
      }
      parent.children.splice(index, 1, textElement);
    });
    ast.children.unshift(...imports);
  };
exports.remarkMdxImages = remarkMdxImages;
